import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.TEST_BASE_URL || "http://localhost:8787";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
assert.equal(
  (await (await fetch(`${base}/api/health`)).json()).environment,
  "local",
);
await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [360, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    assert(await page.getByRole("heading", { level: 1 }).isVisible());
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `Home overflows at ${width}px`,
    );
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
    await page.goto(`${base}/contact`);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `Contact overflows at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByText("Menu", { exact: false }).first().click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Let’s talk" })
    .click();
  await page.waitForURL(`${base}/contact`);
  await page.getByLabel("Your name").fill("Browser Test Owner");
  await page
    .getByLabel("Email address")
    .fill(`browser-${Date.now()}@example.test`);
  await page.getByLabel("What can we help with?").selectOption("svc-web");
  await page
    .getByLabel("A little about your project")
    .fill("A real browser check for the new Controlex Media inquiry workflow.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send your project inquiry" }).click();
  await page.waitForURL(`${base}/thank-you`);
  assert(
    await page
      .getByText("Your inquiry has been saved", { exact: false })
      .isVisible(),
  );
  assert.deepEqual(errors, []);
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const native = await noJs.newPage();
  await native.goto(base);
  assert(await native.getByRole("heading", { level: 1 }).isVisible());
  const faq = native.locator(".faq").first();
  await faq.locator("summary").click();
  assert(await faq.locator("p").isVisible());
  await noJs.close();
  console.log(
    "Browser checks passed: 5 viewport widths, mobile navigation, native form submission, no JS errors, and no-JS content/FAQ.",
  );
} finally {
  await browser.close();
}
