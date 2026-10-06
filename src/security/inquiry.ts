import { z } from "zod";
import type { Bindings } from "../types";

export const inquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  company: z.string().trim().max(160).default(""),
  service: z.string().min(1).max(80),
  budget: z.enum([
    "Not sure yet",
    "Under PKR 100,000",
    "PKR 100,000–300,000",
    "PKR 300,000+",
    "USD project",
  ]),
  message: z.string().trim().min(30).max(4000),
  consent: z.literal("yes"),
  website: z.string().max(200).default(""),
  "cf-turnstile-response": z.string().max(2048).optional(),
});

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function canSkipTurnstile(env: Bindings, request: Request): boolean {
  const host = new URL(request.url).hostname;
  return (
    env.ENVIRONMENT === "local" &&
    env.ALLOW_LOCAL_INQUIRIES === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host)
  );
}

export async function verifyTurnstile(
  token: string,
  env: Bindings,
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) return false;
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) return false;
  const data = (await response.json()) as {
    success?: boolean;
    hostname?: string;
    action?: string;
  };
  return (
    data.success === true &&
    data.hostname === new URL(env.SITE_URL).hostname &&
    data.action === "inquiry"
  );
}

export async function hashSubject(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function consumeLimit(
  db: D1Database,
  subject: string,
): Promise<boolean> {
  const window = Math.floor(Date.now() / 600000);
  const row = await db
    .prepare(`INSERT INTO rate_limits(subject, window, attempts) VALUES (?, ?, 1)
    ON CONFLICT(subject, window) DO UPDATE SET attempts = attempts + 1
    WHERE attempts < 5 RETURNING attempts`)
    .bind(subject, window)
    .first();
  return row !== null;
}
