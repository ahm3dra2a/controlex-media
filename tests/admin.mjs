import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { SignJWT } from "jose";
import { launchBrowser } from "../scripts/browser.mjs";

const base = process.env.TEST_BASE_URL || "http://localhost:8787";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
assert.equal(
  (await (await fetch(`${base}/api/health`)).json()).environment,
  "local",
);
const fixture = JSON.parse(
  await readFile(
    process.env.ADMIN_TEST_FIXTURE || ".local/admin-test.json",
    "utf8",
  ),
);
const stamp = Date.now().toString(16);
const browser = await launchBrowser();
const db = (sql) =>
  JSON.parse(
    execFileSync(
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
        sql,
        "--json",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  )[0].results;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin`);
  assert(page.url().endsWith("/admin/login"));
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${base}/admin`);
  assert(
    await page.getByRole("heading", { name: "Studio overview" }).isVisible(),
  );
  const api = page.context().request;
  const csrf = async () => {
    await page.goto(`${base}/admin/settings`);
    return page.locator('[name="_csrf"]').last().inputValue();
  };
  const token = await csrf();
  const post = (path, form, origin = base) =>
    api.post(`${base}${path}`, {
      form,
      headers: { Origin: origin },
      maxRedirects: 0,
    });
  assert.equal(
    (
      await post(
        "/admin/users",
        { _csrf: token, email: `attack-${stamp}@example.test`, role: "owner" },
        "https://attacker.example",
      )
    ).status(),
    403,
  );
  assert.equal(
    (
      await post("/admin/users", {
        email: `attack-${stamp}@example.test`,
        role: "owner",
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await api.get(`${base}/admin/content/constructor`, { maxRedirects: 0 })
    ).status(),
    404,
  );
  // Capture actual revised settings/UI, then test logo upload and restore the original selection.
  await page.screenshot({
    path: "test-results/admin-settings.png",
    fullPage: true,
  });
  const originalLogo = await page
    .locator('[name="logo_media_id"]')
    .inputValue();
  const originalSettings = await page
    .locator("form.admin-form")
    .evaluate((form) => Object.fromEntries(new FormData(form)));
  const badUpload = await api.post(`${base}/admin/media`, {
    headers: { Origin: base },
    multipart: {
      _csrf: token,
      alt_text: "Unsafe SVG",
      image: {
        name: "unsafe.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        ),
      },
    },
    maxRedirects: 0,
  });
  assert.equal(badUpload.status(), 400);
  const image = await readFile("public/og.png");
  const uploaded = await api.post(`${base}/admin/media`, {
    headers: { Origin: base },
    multipart: {
      _csrf: token,
      alt_text: `Logo test ${stamp}`,
      image: { name: "logo.png", mimeType: "image/png", buffer: image },
    },
    maxRedirects: 0,
  });
  assert.equal(uploaded.status(), 303, await uploaded.text());
  const mediaId = db(
    `SELECT id FROM media WHERE alt_text='Logo test ${stamp}'`,
  )[0].id;
  assert.equal(
    (await api.get(`${base}/media/${mediaId}`)).headers()["content-type"],
    "image/png",
  );
  assert.equal(
    (
      await post("/admin/settings", {
        ...originalSettings,
        logo_media_id: mediaId,
      })
    ).status(),
    303,
  );
  await page.goto(base);
  assert.equal(
    await page.locator(".header .brand-logo").getAttribute("src"),
    `/media/${mediaId}`,
  );
  const sizes = await page.locator(".header .brand-wordmark").evaluate((el) =>
    Array.from(el.children).map((span) => ({
      size: getComputedStyle(span).fontSize,
      weight: getComputedStyle(span).fontWeight,
      text: span.textContent,
    })),
  );
  assert.equal(sizes[0].size, sizes[1].size);
  assert.equal(sizes[0].text, "controlex");
  assert.equal(sizes[1].text, "media");
  assert(Number(sizes[0].weight) >= 700);
  assert.equal(
    (await post(`/admin/media/${mediaId}/archive`, { _csrf: token })).status(),
    409,
  );
  assert.equal(
    (
      await post("/admin/settings", {
        ...originalSettings,
        logo_media_id: originalLogo,
      })
    ).status(),
    303,
  );
  assert.equal(
    (await post(`/admin/media/${mediaId}/archive`, { _csrf: token })).status(),
    303,
  );
  // Native editor: create draft, preview privately, publish, detect stale writes and archive.
  await page.goto(`${base}/admin/content/projects/new`);
  await page.getByLabel(/^Title/).fill(`CMS project ${stamp}`);
  await page.getByLabel(/^URL slug/).fill(`cms-project-${stamp}`);
  await page.getByLabel(/^Category/).fill("Website / CMS verification");
  await page
    .getByLabel(/^Summary/)
    .fill(
      "A synthetic project for checking the complete CMS publishing workflow.",
    );
  for (const name of ["Problem", "Solution", "Results / honest outcome"])
    await page
      .getByLabel(new RegExp(`^${name}`))
      .fill("Synthetic test content, not a client claim.");
  await page.getByLabel("Show in these service showcases").count();
  await page.locator('[name="service_svc-web"]').check();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.waitForURL(/\/admin\/content\/projects\/[a-f0-9-]+$/);
  const projectPath = new URL(page.url()).pathname;
  const id = projectPath.split("/").at(-1);
  assert.equal(
    (await api.get(`${base}/work/cms-project-${stamp}`)).status(),
    404,
  );
  const privatePreview = await api.get(`${base}${projectPath}/preview`);
  assert.equal(privatePreview.status(), 200);
  assert((await privatePreview.text()).includes("noindex,nofollow"));
  const stale = await page
    .locator("form.admin-form")
    .evaluate((form) => Object.fromEntries(new FormData(form)));
  await page.getByLabel(/^Publication/).selectOption("published");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.waitForLoadState("networkidle");
  assert.equal(
    (await api.get(`${base}/work/cms-project-${stamp}`)).status(),
    200,
  );
  assert(
    (
      await (
        await api.get(`${base}/services/websites-development/showcase`)
      ).text()
    ).includes(`CMS project ${stamp}`),
  );
  assert.equal((await post(projectPath, stale)).status(), 409);
  assert.equal(
    db(`SELECT service_id FROM project_services WHERE project_id='${id}'`)[0]
      .service_id,
    "svc-web",
  );
  const revision = await page
    .locator('[name="_revision"]')
    .first()
    .inputValue();
  assert.equal(
    (
      await post(`${projectPath}/archive`, {
        _csrf: token,
        _revision: revision,
      })
    ).status(),
    303,
  );
  assert.equal(
    (await api.get(`${base}/work/cms-project-${stamp}`)).status(),
    404,
  );
  // Active social profiles are driven by CMS, including publication order and icon choice.
  const social = await post("/admin/content/social_links/new", {
    _csrf: token,
    _revision: "0",
    platform: "LinkedIn",
    handle: "Synthetic test",
    url: "https://www.linkedin.com/company/example/",
    icon: "linkedin",
    enabled: "1",
    sort_order: "7",
  });
  assert.equal(social.status(), 303);
  const socialPath = social.headers().location;
  assert(
    (await (await api.get(base)).text()).includes(
      "https://www.linkedin.com/company/example/",
    ),
  );
  assert.equal(
    (
      await post(`${socialPath}/archive`, { _csrf: token, _revision: "0" })
    ).status(),
    303,
  );
  // Invoice creates a frozen quote; customer claims never mark paid; owner verification is deduplicated.
  const invoiceEmail = `invoice-${stamp}@example.test`;
  assert.equal(
    (
      await post("/admin/orders", {
        _csrf: token,
        package_id: "pkg-launch",
        amount_minor: "12500.00",
        currency: "PKR",
        customer_email: invoiceEmail,
        note: "Synthetic invoice verification",
      })
    ).status(),
    303,
  );
  const order = db(
    `SELECT id,invoice_token,status FROM orders WHERE customer_email='${invoiceEmail}'`,
  )[0];
  assert.equal(
    (await api.get(`${base}/invoice/${order.invoice_token}`)).status(),
    200,
  );
  assert.equal(
    (
      await post(`/invoice/${order.invoice_token}`, {
        provider: "bank",
        reference: `claim-${stamp}`,
      })
    ).status(),
    303,
  );
  assert.equal(
    db(`SELECT status FROM orders WHERE id='${order.id}'`)[0].status,
    "awaiting_verification",
  );
  assert.equal(
    (
      await post(`/admin/orders/${order.id}/verify`, {
        _csrf: token,
        provider: "bank",
        reference: `verified-${stamp}`,
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await post(`/admin/orders/${order.id}/verify`, {
        _csrf: token,
        provider: "bank",
        reference: `verified-${stamp}`,
        statement_verified: "yes",
      })
    ).status(),
    303,
  );
  assert.equal(
    db(`SELECT status FROM orders WHERE id='${order.id}'`)[0].status,
    "paid",
  );
  assert.equal(
    (
      await post(`/admin/orders/${order.id}/verify`, {
        _csrf: token,
        provider: "bank",
        reference: `verified-${stamp}`,
        statement_verified: "yes",
      })
    ).status(),
    409,
  );
  assert.equal(
    db(
      `SELECT count(*) AS n FROM payment_events WHERE order_id='${order.id}'`,
    )[0].n,
    1,
  );
  assert.equal(
    (await post(`/admin/orders/${order.id}/cancel`, { _csrf: token })).status(),
    409,
  );
  assert.equal(
    (
      await post(`/admin/orders/${order.id}/refund`, {
        _csrf: token,
        reference: `refund-${stamp}`,
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await post(`/admin/orders/${order.id}/refund`, {
        _csrf: token,
        reference: `refund-${stamp}`,
        statement_verified: "yes",
      })
    ).status(),
    303,
  );
  assert.equal(
    db(`SELECT status FROM orders WHERE id='${order.id}'`)[0].status,
    "refunded",
  );
  assert.equal(
    (
      await post(`/admin/orders/${order.id}/refund`, {
        _csrf: token,
        reference: `refund-${stamp}`,
        statement_verified: "yes",
      })
    ).status(),
    409,
  );
  // Invitation without registration; role from D1 is enforced even for valid local sessions.
  const editorEmail = `editor-${stamp}@example.test`;
  assert.equal(
    (
      await post("/admin/users", {
        _csrf: token,
        email: editorEmail,
        role: "editor",
      })
    ).status(),
    303,
  );
  const vars = await readFile(".dev.vars.local", "utf8");
  const secret = JSON.parse(vars.match(/^LOCAL_SESSION_SECRET=(.+)$/m)[1]);
  const editorToken = await new SignJWT({ email: editorEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("controlex-local")
    .setAudience("controlex-admin")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
  const editorContext = await browser.newContext();
  await editorContext.addCookies([
    { name: "cm_session", value: editorToken, url: base },
  ]);
  assert.equal(
    (
      await editorContext.request.get(`${base}/admin/content/projects`)
    ).status(),
    200,
  );
  for (const path of [
    "/admin/settings",
    "/admin/users",
    "/admin/orders",
    "/admin/audit",
  ])
    assert.equal(
      (await editorContext.request.get(`${base}${path}`)).status(),
      403,
      path,
    );
  const editorId = db(`SELECT id FROM users WHERE email='${editorEmail}'`)[0]
    .id;
  assert.equal(
    (
      await post(`/admin/users/${editorId}`, {
        _csrf: token,
        role: "editor",
        status: "disabled",
      })
    ).status(),
    303,
  );
  assert.equal(
    (
      await editorContext.request.post(`${base}/admin/content/projects/new`, {
        form: { _csrf: token },
        headers: { Origin: base },
        maxRedirects: 0,
      })
    ).status(),
    401,
  );
  assert.equal((await api.get(`${base}/admin/audit`)).status(), 200);
  assert.equal((await api.get(`${base}/admin/leads`)).status(), 200);
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/admin`);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Admin overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/admin-dashboard.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.equal((await post("/admin/logout", { _csrf: token })).status(), 303);
  assert.equal(
    (
      await api.post(`${base}/admin/settings`, {
        form: { _csrf: token },
        headers: { Origin: base },
        maxRedirects: 0,
      })
    ).status(),
    401,
  );
  console.log(
    "Admin integration passed: login/logout, CSRF, resource whitelist, upload validation/R2/logo, equal wordmark, draft/preview/publish/revisions/archive, service showcase, socials, invoices/payment verification/refunds/replay, invitation/editor/disabled access, audit and responsive dashboard.",
  );
} finally {
  await browser.close();
}
