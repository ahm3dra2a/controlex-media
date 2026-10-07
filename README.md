# Controlex Media

A Cloudflare-native agency website with a protected studio CMS, persistent inquiries, R2 image uploads and PKR/USD invoice management. Public pages render on the server with a small amount of browser JavaScript. npm installs and runs the development tools; production runs on Cloudflare Workers, without a Node server or VPS.

## Update and run on Windows

Use Node **24.5 or later**; your Node 24.19 meets this requirement. Run these commands inside the repository, not `C:\Users\raza`:

```bat
cd /d C:\Users\raza\Videos\controlex-media
git pull --ff-only
npm ci
npm run fonts
npm run format
npm run db:local
npm run admin:setup -- --email vinc3nt.0liv3r@gmail.com
npm run dev
```

The setup command prompts for your own local password and stores only its salted hash and a random session secret in ignored `.dev.vars.local`. Restart the development server after changing local credentials. Open the development site on port 8787 on your machine and visit `/admin`. No Cloudflare account is needed locally. Additional production administrators are invited under **Administrators**; invite the replacement owner, verify their access, then disable the old email.

`npm run format` normalizes existing Windows CRLF files. `.gitattributes` preserves LF on future checkouts. To see all lint diagnostics, pass options through npm with **two dashes**:

```bat
npm run lint -- --max-diagnostics=100
```

For Linux/macOS, use `cd` with your checkout's path and the same npm commands. No Python installation is required.

## Manage the website

- **Branding & settings:** upload your own PNG/JPEG/WebP logo in Media, then select it here. Set both bold wordmark lines, gradient, homepage copy/sections, process, navigation, footer, contact information, SEO and invoice instructions.
- **Services / Showcase:** create, edit, order, preview, publish, disable or archive content. Assign projects to services; `/work` and `/services/:slug/showcase` update automatically. Choose cover/gallery images visually.
- **Packages, pages, insights, FAQs, testimonials and social profiles:** edit through native forms. Drafts remain private. Published consent-backed testimonials appear automatically; active social profiles use their selected icons and display order. Pages with slugs `privacy` or `terms` replace the development legal notices.
- **Project inquiries:** review briefs and update follow-up status.
- **Orders & invoices:** create an agreed PKR/USD quote, share its private invoice link, review a customer reference and independently verify receipt. Only an owner can record payment or a verified full refund. Unpaid invoices can be cancelled.
- **Administrators / activity history:** invite owner/editor emails, disable access and review audited actions. Editors cannot change branding, identities or financial records. There is no public admin registration.

No client work, testimonials, results, handles, prices or production credentials are fabricated. The six starter projects are labelled studio concepts. Until you upload a logo, the site uses the two-line text wordmark.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm audit
# Requires npm run dev in another terminal:
npm run test:smoke
npm run test:browser
```

Browser tests detect Chrome/Edge on Windows and Chromium/Chrome on Linux/macOS. If none is installed, run `npm run browser:install`, or set `CHROMIUM_PATH` to your browser executable. These tests create synthetic leads only against a local loopback server. `test:db` uses Node's built-in SQLite.

`npm run test:admin` additionally needs an ignored JSON fixture containing your test owner's `email` and `password`; set `ADMIN_TEST_FIXTURE` to its path. Use a separate local test account/database. The integration test creates synthetic invoices and content, restores branding changes, archives test media/content and checks access boundaries. Never use production credentials or point these tests at production.

GitHub Actions also runs dependency install, lint, types, unit/SQLite tests, build and audit on Linux and Windows. Its first remote run must be checked after pushing; local passing tests are not a claim that CI has already passed. Browser/admin integration is currently validated locally.

## Dependencies and fonts

Versions and install scripts are pinned. The Wrangler/Miniflare image dependency is constrained to patched `sharp@0.35.5`; `npm audit` reported **0 known vulnerabilities** on 7 October 2026. This does not mean future vulnerabilities are impossible. Use reviewed upgrades and the lockfile; do not run `npm audit fix --force` blindly.

Clash Display is downloaded directly from Fontshare with `npm run fonts` and self-hosted for this website. The vendor license permits self-hosting and restricts redistribution, so the font binary is excluded from Git. Run the font command in build/CI as well. See [font source and license](public/fonts/README.md).

## Deployment

The canonical domain is configured as **controlexmedia.com**. This repository has **not** provisioned or deployed production resources. Deploy only after approval and configuration of D1, R2, Turnstile and Cloudflare Access. `npm run build` is a dry run; `npm run deploy` checks required configuration before publishing.

Manual invoices are implemented. Automated Easypaisa/JazzCash/Payoneer checkout and signed provider webhooks require approved merchant accounts and provider-specific credentials/contracts; those integrations are not active. No card information is collected.

See [deployment instructions](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), [current validation evidence](docs/VALIDATION.md) and [official platform research](docs/RESEARCH.md).
