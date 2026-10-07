import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import type { Bindings } from "../types";
import { consumeLimit, hashSubject, isSameOrigin } from "./inquiry";

export type AdminUser = {
  id: string;
  email: string;
  role: "owner" | "editor";
  access_subject: string | null;
  status: string;
};
export type AdminEnv = {
  Bindings: Bindings;
  Variables: { user: AdminUser; csrf: string };
};
const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function localAdminAllowed(env: Bindings, request: Request) {
  return (
    env.ENVIRONMENT === "local" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  );
}
export function cookieName(request: Request, name: string) {
  return `${new URL(request.url).protocol === "https:" ? "__Host-" : ""}cm_${name}`;
}
export function setAdminCookie(
  c: Context<AdminEnv>,
  name: string,
  value: string,
) {
  setCookie(c, cookieName(c.req.raw, name), value, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Strict",
    path: "/",
    maxAge: 7200,
  });
}

export async function verifyLocalPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected || password.length > 200) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const result = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  const actual = btoa(String.fromCharCode(...new Uint8Array(result)));
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++)
    difference |= actual.charCodeAt(i) ^ (expected.charCodeAt(i) || 0);
  return difference === 0;
}

export async function authenticate(
  env: Bindings,
  request: Request,
): Promise<AdminUser | null> {
  let email: string | undefined;
  let subject: string | undefined;
  if (localAdminAllowed(env, request)) {
    if (!env.LOCAL_SESSION_SECRET) return null;
    const cookies = request.headers.get("cookie") || "";
    const session = cookies
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${cookieName(request, "session")}=`))
      ?.split("=")[1];
    if (!session) return null;
    try {
      const verified = await jwtVerify(
        session,
        new TextEncoder().encode(env.LOCAL_SESSION_SECRET),
        {
          algorithms: ["HS256"],
          issuer: "controlex-local",
          audience: "controlex-admin",
          requiredClaims: ["exp", "email"],
        },
      );
      email =
        typeof verified.payload.email === "string"
          ? verified.payload.email
          : undefined;
    } catch {
      return null;
    }
  } else {
    if (
      !env.ACCESS_TEAM_DOMAIN ||
      !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN) ||
      !env.ACCESS_AUD
    )
      return null;
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) return null;
    try {
      const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
      let keys = jwks.get(issuer);
      if (!keys) {
        keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
        jwks.set(issuer, keys);
      }
      const verified = await jwtVerify(token, keys, {
        algorithms: ["RS256"],
        issuer,
        audience: env.ACCESS_AUD,
        requiredClaims: ["exp", "sub", "email"],
      });
      email =
        typeof verified.payload.email === "string"
          ? verified.payload.email
          : undefined;
      subject = verified.payload.sub;
      if (!subject) return null;
    } catch {
      return null;
    }
  }
  if (!email) return null;
  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ? AND status IN ('active','invited')",
  )
    .bind(email.toLowerCase())
    .first<AdminUser>();
  if (
    !user ||
    (subject && user.access_subject && user.access_subject !== subject)
  )
    return null;
  if (subject && !user.access_subject)
    await env.DB.prepare(
      "UPDATE users SET access_subject=?, status='active', updated_at=CURRENT_TIMESTAMP WHERE id=? AND access_subject IS NULL",
    )
      .bind(subject, user.id)
      .run();
  return user;
}

export const requireAdmin: MiddlewareHandler<AdminEnv> = async (c, next) => {
  const user = await authenticate(c.env, c.req.raw);
  if (!user) {
    if (localAdminAllowed(c.env, c.req.raw) && c.req.method === "GET")
      return c.redirect("/admin/login");
    return c.text(
      "Administrator access denied. Configure an invited identity and Cloudflare Access.",
      401,
    );
  }
  c.set("user", user);
  let token = getCookie(c, cookieName(c.req.raw, "csrf"));
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    setAdminCookie(c, "csrf", token);
  }
  c.set("csrf", token);
  await next();
};

export function validCsrf(
  c: Context<AdminEnv>,
  data: Record<string, unknown>,
): boolean {
  return (
    isSameOrigin(c.req.raw) &&
    typeof data._csrf === "string" &&
    data._csrf === c.get("csrf") &&
    data._csrf === getCookie(c, cookieName(c.req.raw, "csrf"))
  );
}

export async function login(
  c: Context<AdminEnv>,
  email: string,
  password: string,
) {
  if (
    !localAdminAllowed(c.env, c.req.raw) ||
    !c.env.LOCAL_ADMIN_EMAIL ||
    !c.env.LOCAL_ADMIN_PASSWORD_HASH ||
    !c.env.LOCAL_SESSION_SECRET
  )
    return false;
  const allowed = await consumeLimit(
    c.env.DB,
    await hashSubject(
      `${c.req.header("CF-Connecting-IP") || "local"}:admin-login`,
    ),
  );
  if (
    !allowed ||
    email.toLowerCase() !== c.env.LOCAL_ADMIN_EMAIL.toLowerCase() ||
    !(await verifyLocalPassword(password, c.env.LOCAL_ADMIN_PASSWORD_HASH))
  )
    return false;
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email=? AND role='owner' AND status='active'",
  )
    .bind(email.toLowerCase())
    .first();
  if (!user) return false;
  const session = await new SignJWT({ email: email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("controlex-local")
    .setAudience("controlex-admin")
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(new TextEncoder().encode(c.env.LOCAL_SESSION_SECRET));
  setAdminCookie(c, "session", session);
  return true;
}

export function logout(c: Context<AdminEnv>) {
  deleteCookie(c, cookieName(c.req.raw, "session"), { path: "/" });
  deleteCookie(c, cookieName(c.req.raw, "csrf"), { path: "/" });
}
