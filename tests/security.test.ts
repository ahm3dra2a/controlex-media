import { afterEach, describe, expect, it, vi } from "vitest";
import { safeExternalUrl } from "../src/data/content";
import app from "../src/index";
import {
  canSkipTurnstile,
  inquirySchema,
  isSameOrigin,
  verifyTurnstile,
} from "../src/security/inquiry";
import type { Bindings } from "../src/types";

const local = {
  ENVIRONMENT: "local",
  ALLOW_LOCAL_INQUIRIES: "true",
  SITE_URL: "http://localhost:8787",
} as Bindings;
const production = {
  ENVIRONMENT: "production",
  SITE_URL: "https://studio.example",
  TURNSTILE_SITE_KEY: "test-site",
  TURNSTILE_SECRET_KEY: "test-secret",
} as Bindings;
afterEach(() => vi.unstubAllGlobals());

describe("inquiry security boundary", () => {
  it("rejects absent, sibling-domain and foreign origins", () => {
    for (const origin of [
      undefined,
      "https://attacker.example",
      "https://other.studio.example",
    ]) {
      const req = new Request("https://studio.example/api/inquiries", {
        method: "POST",
        headers: origin ? { Origin: origin } : {},
      });
      expect(isSameOrigin(req)).toBe(false);
    }
    expect(
      isSameOrigin(
        new Request("https://studio.example/api/inquiries", {
          headers: { Origin: "https://studio.example" },
        }),
      ),
    ).toBe(true);
  });
  it("does not allow local Turnstile flags to bypass production or a public hostname", () => {
    expect(
      canSkipTurnstile(
        local,
        new Request("http://localhost:8787/api/inquiries"),
      ),
    ).toBe(true);
    expect(
      canSkipTurnstile(
        local,
        new Request("https://studio.example/api/inquiries"),
      ),
    ).toBe(false);
    expect(
      canSkipTurnstile(
        { ...production, ALLOW_LOCAL_INQUIRIES: "true" },
        new Request("http://localhost/api/inquiries"),
      ),
    ).toBe(false);
  });
  it("requires consent and meaningful content and rejects unsupported budgets", () => {
    const valid = {
      name: "Sample Owner",
      email: "owner@example.test",
      service: "svc-web",
      budget: "USD project",
      message: "We need a focused website for our growing business.",
      consent: "yes",
    };
    expect(inquirySchema.safeParse(valid).success).toBe(true);
    for (const change of [
      { consent: "no" },
      { message: "short" },
      { email: "bad" },
      { budget: "anything" },
      { name: "x" },
    ])
      expect(inquirySchema.safeParse({ ...valid, ...change }).success).toBe(
        false,
      );
  });
  it("requires successful verification with exact hostname and action", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const payload of [
      { success: false },
      { success: true, hostname: "attacker.example", action: "inquiry" },
      { success: true, hostname: "studio.example", action: "login" },
    ]) {
      fetchMock.mockResolvedValueOnce(Response.json(payload));
      expect(await verifyTurnstile("token", production)).toBe(false);
    }
    fetchMock.mockResolvedValueOnce(
      Response.json({
        success: true,
        hostname: "studio.example",
        action: "inquiry",
      }),
    );
    expect(await verifyTurnstile("token", production)).toBe(true);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(options.method).toBe("POST");
    expect(options.body.get("secret")).toBe("test-secret");
  });
  it("fails verification without configuration or on upstream error", async () => {
    expect(
      await verifyTurnstile("token", {
        ...production,
        TURNSTILE_SECRET_KEY: undefined,
      }),
    ).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("error", { status: 500 })),
    );
    expect(await verifyTurnstile("token", production)).toBe(false);
  });
  it("admin routes cannot be opened by forged identity headers", async () => {
    for (const path of ["/admin", "/admin/settings", "/api/admin/services"]) {
      const response = await app.request(
        path,
        {
          headers: {
            "Cf-Access-Authenticated-User-Email": "owner@example.test",
            "Cf-Access-Jwt-Assertion": "fake",
          },
        },
        production,
      );
      expect(response.status).toBe(503);
      expect(response.headers.get("Content-Security-Policy")).toContain(
        "frame-ancestors 'none'",
      );
    }
  });
  it("rejects a cross-origin inquiry before database or verification calls", async () => {
    const response = await app.request(
      "/api/inquiries",
      {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "name=test",
      },
      production,
    );
    expect(response.status).toBe(403);
  });
});

describe("untrusted social profile URLs", () => {
  it("accepts HTTPS only and rejects executable URLs", () => {
    expect(
      safeExternalUrl("https://www.linkedin.com/company/example"),
    ).toContain("https://");
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,bad",
      "http://insecure.example",
      "not a url",
    ])
      expect(safeExternalUrl(value)).toBeNull();
  });
});
