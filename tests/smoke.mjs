import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = process.env.TEST_BASE_URL || "http://localhost:8787";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Only a loopback development server may be tested.",
);
const health = await (await fetch(`${base}/api/health`)).json();
assert.equal(
  health.environment,
  "local",
  "Refusing to create a lead outside the local environment.",
);
assert.equal(health.database, "reachable");
for (const path of [
  "/",
  "/contact",
  "/work",
  "/services/digital-growth/showcase",
  "/theme.css",
  "/admin.css",
  "/admin.js",
  "/services/brand-strategy",
  "/work/a-clearer-storefront",
  "/privacy",
  "/terms",
  "/sitemap.xml",
  "/robots.txt",
  "/site.css",
  "/site.js",
  "/favicon.svg",
  "/og.png",
]) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  if (path === "/") {
    const html = await response.text();
    assert(
      html.includes("Make your") &&
        html.includes("Studio concept") &&
        html.includes("Brand strategy &amp; identity"),
      "D1 content must render in HTML.",
    );
    assert(
      response.headers
        .get("Content-Security-Policy")
        .includes("object-src 'none'"),
    );
  }
}
assert.equal((await fetch(`${base}/missing`)).status, 404);
assert.equal(
  (await fetch(`${base}/admin`, { redirect: "manual" })).status,
  302,
);
assert.equal(
  (
    await fetch(`${base}/api/inquiries`, {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "name=spoof",
    })
  ).status,
  403,
);
const stamp = Date.now().toString(16).slice(-8);
const testIp = (suffix) =>
  `2001:db8:${stamp.slice(0, 4)}:${stamp.slice(4)}::${suffix}`;
const post = (values, ip = testIp(1)) =>
  fetch(`${base}/api/inquiries`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: base,
      "Content-Type": "application/x-www-form-urlencoded",
      "CF-Connecting-IP": ip,
    },
    body: new URLSearchParams(values),
  });
assert.equal((await post({ message: "x".repeat(64001) })).status, 413);
assert.equal((await post({ name: "bad" })).status, 400);
const email = `smoke-${Date.now()}@example.test`;
const valid = {
  name: "Sample Owner",
  email,
  company: "Smoke Test",
  service: "svc-web",
  budget: "USD project",
  message: "We need a focused website for our growing business.",
  consent: "yes",
  website: "",
};
assert.equal((await post({ ...valid, website: "spam.example" })).status, 400);
assert.equal((await post({ ...valid, service: "unavailable" })).status, 400);
const accepted = await post(valid, testIp(2));
assert.equal(accepted.status, 303);
assert.equal(accepted.headers.get("Location"), "/thank-you");
const result = execFileSync(
  process.execPath,
  [
    "scripts/wrangler.mjs",
    "d1",
    "execute",
    "controlex-local",
    "--local",
    "--env",
    "local",
    "--command",
    `SELECT name, email, service_id FROM leads WHERE email = '${email}'`,
    "--json",
  ],
  { encoding: "utf8" },
);
const rows = JSON.parse(result)[0].results;
assert.equal(
  rows.length,
  1,
  "Exactly one lead should persist in the real local D1 database.",
);
assert.equal(rows[0].service_id, "svc-web");
for (let attempt = 0; attempt < 5; attempt++)
  assert.equal((await post({ name: "invalid" }, testIp(3))).status, 400);
assert.equal((await post({ name: "invalid" }, testIp(3))).status, 429);
console.log(
  "Runtime smoke checks passed: SSR routes/assets, security headers, missing/admin routes, CSRF, size/validation/honeypot, persistent lead, and rate limiting.",
);
