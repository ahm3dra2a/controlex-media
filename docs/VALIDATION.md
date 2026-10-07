# Current validation — 7 October 2026

Verified in the cloud Linux environment using Node 24.19.0. This supersedes the historical Phase 1 validation for current code; it does not establish a live Cloudflare deployment or actual Windows execution.

## Dependency and Windows diagnosis

- The user's full 22 Biome diagnostics were CRLF formatting differences. `.gitattributes` pins LF, Biome states LF explicitly, and `npm run format` normalizes an existing Windows checkout. npm options must be forwarded with `npm run lint -- --max-diagnostics=100`.
- npm 12.2.0 clean `ci` completed; `install-scripts ls` reported no unreviewed scripts. Reviewed esbuild/workerd versions have explicit allow entries. Install/cache locations are checkout-relative.
- Wrangler 4.148.0 and `sharp@0.35.5` override resolve the vulnerable Wrangler/Miniflare/sharp chain. `npm audit --json` reported zero findings including development dependencies. No forced blind major upgrade was used.
- Database checks use Node's built-in SQLite, removing Python as a prerequisite. Browser launch detects platform Chrome/Edge paths or installed Playwright Chromium, with a clear installation fallback. The actual user's Windows machine has not been rerun by this agent.

## Implemented checks

- TypeScript and Biome: pass.
- GitHub CI is configured for Linux and Windows with pinned checkout/setup-node commits. Its remote result is separate from these local results.
- Vitest: 13 checks pass, including exact inquiry origin, production Turnstile hostname/action/failure, missing/admin forged identity, Access RS256 signature/issuer/audience/expiry/subject/allowlist, development-only auth, password verification, URL/money validation and upload signatures.
- SQLite: 4 checks pass across all migrations, schema/foreign key integrity, honest seed data, atomic rate limits and unique/constrained payment records.
- Runtime smoke: SSR/public/service/case/showcase routes, sitemap/robots/assets, CSP/security headers, 404/admin behavior, inquiry body cap, same-origin/honeypot/validation, persistence in real local D1 and rate limiting pass.
- Browser: five viewport widths (360, 390, 768, 1440, 1920), mobile navigation, inquiry submission, no JS errors and native FAQ/content without JS pass. Screenshots are current generated files under ignored `test-results/`.
- Admin integration (including verified full-refund transition/replay and rejection of paid-invoice cancellation): real login/logout; CSRF and resource whitelist; executable-upload rejection and R2 image delivery; uploaded logo/settings propagation and protected references; equal bold wordmark; native draft creation/private preview/publishing/service links; stale update rejection; archive; active social profiles; frozen invoices/customer claims; owner-only independent verification/payment replay; invitation/editor/disabled access; audit/inquiries; responsive dashboard pass. Synthetic test records remain only in ignored local state. Branding changes are restored and test media/content archived.
- Font installer: official Fontshare download/source/WOFF2 validation passes. Font is locally self-hosted with supplied license and excluded from Git redistribution.
- Production bundle: dry-run passes, around 1.1 MiB uncompressed. Dry-run does not contact/provision production D1/R2 or publish a Worker.

## Limits of the evidence

No real Turnstile widget, Access application, production credentials, merchant API, provider transfer, custom domain serving, Cloudflare CPU distribution, production backup restore, or field Core Web Vitals has been verified. JWT tests use generated keys/mock JWKS; invoice tests use synthetic local records. Automated payment checkout/webhooks are not implemented. Full refunds are recorded manually; partial refunds are not implemented. Lists are bounded to 200 items. Legal copy, actual brand/client assets, merchant permissions and operational retention/restore remain launch prerequisites.

Deployment preflight was also exercised and correctly rejected the unprovisioned D1 UUID. This is an expected guard result, not a failed build. Local routes and cron configuration are isolated from the production custom domain.
