# Cloudflare deployment guide

No production account, resources, billing plan, domain route, administrator or payment gateway was provisioned by Phase 1. Do not deploy this review foundation as a finished CMS. `npm run build` is a dry-run build; it does not publish.

## Local workflow

Use the existing isolated checkout, not a Git worktree. Run `npm ci`, `npm run db:local`, then `npm run dev` in the repository root. Wrangler uses the local environment with a persistent local D1 database. Ignored `.local/` contains Wrangler configuration/log outputs; `.wrangler/` contains database state. Files persist in the current environment snapshot; processes must restart in later tasks.

## Production prerequisites

1. Supply the actual domain and business/legal/contact details. Review privacy and engagement terms, portfolio claims and font license.
2. Finish CMS/auth, uploads, publishing/caching and operational controls. Confirm Access/IdP eligibility and invite only approved admins. Verify signed JWTs in the Worker even if the Cloudflare routing policy is bypassed.
3. Review merchant accounts and official gateway documentation. Decide PKR wallet/bank invoice verification and the permitted USD flow. No payment credentials are needed or requested for Phase 1.
4. Review and save the added network domains in cloud environment settings, then publish the prepared **development environment**. This is separate from deploying the website to Cloudflare. Saved drafts do not apply network changes automatically.

## Provision when ready

Use Cloudflare's own secure login on your development machine or a narrowly scoped deployment token stored in your CI secret manager. Never paste credentials into chat, source, docs or shell arguments.

```sh
node scripts/wrangler.mjs login
node scripts/wrangler.mjs d1 create controlex
```

Copy the returned database ID into the root `d1_databases` binding in `wrangler.jsonc`, not into the local environment. Set `SITE_URL` to the canonical HTTPS domain and `TURNSTILE_SITE_KEY` to a real widget configured for that hostname. Configure the verification secret securely:

```sh
node scripts/wrangler.mjs secret put TURNSTILE_SECRET_KEY
npm run db:remote
npm run typecheck
npm run lint
npm test
npm run build
```

The secret command asks for the value securely in the CLI. Keep it out of tracked files. Production Turnstile must verify hostname/action and refuse unavailable or failed verification. Do not use Cloudflare test keys in production. The unit suite mocks the official verifier; a live production widget is not verified in Phase 1.

Then, after approving a completed release:

```sh
npm run deploy
```

`deploy` refuses the placeholder database ID, invalid origin and missing site key. It cannot prove merchant/legal review or the existence of a secret: manually verify the release checklist. R2 and Access settings will be documented and validated when implemented; no fake bucket or auth audience is supplied.

## Domain and exposure

Add the actual Cloudflare-managed hostname under the Worker's Settings → Domains & Routes → Custom Domains, or use the official equivalent in Wrangler after selecting the hostname. Confirm canonical redirects and HTTPS. Disable unused `workers.dev`/preview endpoints or enforce the same in-Worker admin verification there. Protect both `/admin*` and `/api/admin/*` in Access. `robots.txt` is crawl guidance, never authorization.

Test public SSR, a real Turnstile inquiry, admin allow/deny and payment webhook scenarios in staging first. Check CPU distributions, request counts, D1 scanned rows and free-tier headroom. Local wall-clock timing is not Cloudflare CPU-time measurement. Current HTML caching is conservative/no-store; add and test versioned public caching/invalidation before a traffic-heavy launch. Static assets bypass the Worker and use separate headers.

## Payment activation (later)

Use an approved hosted checkout to keep card data outside the app. Each provider requires server credentials and possibly a signing secret. Names/destinations depend on the confirmed provider and must be declared when its adapter is built. Register its webhook on the approved HTTPS server endpoint; preserve raw bytes, verify the provider's documented signature/time window, enforce order amount/currency and idempotency, and reconcile delayed/missing notifications. No webhook endpoint exists in Phase 1; do not point providers to a placeholder URL.

## Backup and retention

D1 Free has 7-day Time Travel, which is not an independent long-term backup. Export to a private, access-controlled destination regularly; never commit production leads/payment data.

```sh
node scripts/wrangler.mjs d1 export controlex --remote --output .local/controlex-backup.sql
```

Encrypt/protect backups, test restore into a separate database, define lead retention/deletion and payment-record retention with the business, and check foreign key integrity after recovery. Plan separate R2 object backups/versioned keys once media exists. Payment/audit retention must reflect legal/accounting requirements. Rotate compromised credentials and record administrator actions without logging secret values or full inquiry content.
