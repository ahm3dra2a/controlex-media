import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { imageType } from "../src/admin/media";
import { parseRecord, resources } from "../src/admin/resources";
import {
  authenticate,
  localAdminAllowed,
  verifyLocalPassword,
} from "../src/security/admin";
import type { Bindings } from "../src/types";

afterEach(() => vi.unstubAllGlobals());
describe("administrator security", () => {
  it("local password auth cannot run on production or a public hostname", () => {
    expect(
      localAdminAllowed(
        { ENVIRONMENT: "production" } as Bindings,
        new Request("https://controlexmedia.com/admin"),
      ),
    ).toBe(false);
    expect(
      localAdminAllowed(
        { ENVIRONMENT: "local" } as Bindings,
        new Request("https://preview.example/admin"),
      ),
    ).toBe(false);
    expect(
      localAdminAllowed(
        { ENVIRONMENT: "local" } as Bindings,
        new Request("http://localhost/admin"),
      ),
    ).toBe(true);
  });
  it("password comparison rejects wrong passwords", async () => {
    const salt = new Uint8Array(16).fill(42),
      password = "Synthetic password for a unit check";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
      key,
      256,
    );
    const encoded = `${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...new Uint8Array(derived)))}`;
    expect(await verifyLocalPassword(password, encoded)).toBe(true);
    expect(await verifyLocalPassword("wrong password", encoded)).toBe(false);
  });
  it("validates Access signatures, issuer, audience, expiry, allowlist and identity subject", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "unit-key";
    jwk.alg = "RS256";
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => Response.json({ keys: [jwk] }));
    vi.stubGlobal("fetch", fetchMock);
    const row = {
      id: "unit-owner",
      email: "owner@example.test",
      role: "owner",
      status: "active",
      access_subject: "expected-subject",
    };
    const first = vi.fn().mockResolvedValue(row);
    const prepare = vi
      .fn()
      .mockReturnValue({ bind: () => ({ first, run: vi.fn() }) });
    const env = {
      ENVIRONMENT: "production",
      ACCESS_TEAM_DOMAIN: `unit-${Date.now()}.cloudflareaccess.com`,
      ACCESS_AUD: "expected-audience",
      DB: { prepare },
    } as unknown as Bindings;
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    const token = async (
      changes: {
        issuer?: string;
        audience?: string;
        subject?: string;
        expires?: string;
        email?: string;
      } = {},
    ) =>
      new SignJWT({ email: changes.email || row.email })
        .setProtectedHeader({ alg: "RS256", kid: "unit-key" })
        .setSubject(changes.subject || "expected-subject")
        .setIssuer(changes.issuer || issuer)
        .setAudience(changes.audience || "expected-audience")
        .setIssuedAt()
        .setExpirationTime(changes.expires || "5m")
        .sign(privateKey);
    const request = (jwt: string) =>
      new Request("https://controlexmedia.com/admin", {
        headers: { "Cf-Access-Jwt-Assertion": jwt },
      });
    expect(await authenticate(env, request(await token()))).toEqual(row);
    for (const change of [
      { issuer: "https://foreign.example" },
      { audience: "another-app" },
      { expires: "-1s" },
      { subject: "another-subject" },
    ])
      expect(await authenticate(env, request(await token(change)))).toBeNull();
    first.mockResolvedValueOnce(null);
    expect(
      await authenticate(
        env,
        request(await token({ email: "uninvited@example.test" })),
      ),
    ).toBeNull();
    const altered = (await token()).split(".");
    altered[2] = "A".repeat(altered[2].length);
    expect(await authenticate(env, request(altered.join(".")))).toBeNull();
    const noExpiry = await new SignJWT({
      email: row.email,
      sub: "expected-subject",
    })
      .setProtectedHeader({ alg: "RS256", kid: "unit-key" })
      .setIssuer(issuer)
      .setAudience("expected-audience")
      .sign(privateKey);
    expect(await authenticate(env, request(noExpiry))).toBeNull();
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      `${issuer}/cdn-cgi/access/certs`,
    );
  });
});
describe("CMS validation", () => {
  it("rejects executable URLs, unexpected enum values and over-precise money", () => {
    const social = {
      platform: "Profile",
      url: "https://example.com",
      icon: "link",
      enabled: "1",
      sort_order: "0",
    };
    expect(() =>
      parseRecord(resources.social_links, {
        ...social,
        url: "javascript:alert(1)",
      }),
    ).toThrow();
    expect(() =>
      parseRecord(resources.social_links, { ...social, icon: "<script>" }),
    ).toThrow();
    const pkg = {
      title: "Package",
      description: "An agreed scope",
      currency: "PKR",
      features_json: "One feature",
      recommended: "0",
      payment_mode: "invoice",
      cta_label: "Discuss",
      status: "draft",
      sort_order: "0",
    };
    expect(() =>
      parseRecord(resources.packages, { ...pkg, price_minor: "12.555" }),
    ).toThrow();
    expect(
      parseRecord(resources.packages, { ...pkg, price_minor: "100.00" })
        .price_minor,
    ).toBe(10000);
  });
  it("rejects SVG/HTML uploads and identifies allowed image formats by bytes", () => {
    expect(
      imageType(
        new TextEncoder().encode("<svg><script>alert(1)</script></svg>"),
      ),
    ).toBeNull();
    expect(
      imageType(new TextEncoder().encode("<!doctype html><h1>untrusted</h1>")),
    ).toBeNull();
    const png = new Uint8Array(16);
    png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(imageType(png)).toBe("image/png");
  });
});
