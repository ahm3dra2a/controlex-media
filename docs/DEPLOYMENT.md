# Cloudflare deployment

No production resources or paid plans have been activated. The local application and dry-run build are tested; live deployment waits for owner approval. The configured canonical/custom domain is `controlexmedia.com`, and the first owner to invite is `vinc3nt.0liv3r@gmail.com`.

## Local development

Use Node 24.5+ and the existing checkout. `npm ci`, `npm run fonts`, `npm run db:local`, then `npm run admin:setup -- --email YOUR_EMAIL` and `npm run dev`. Admin setup prompts for your local password; no default credential exists. Local D1/R2 state lives in ignored `.wrangler/`, credentials in `.dev.vars.local`, logs/config in `.local/`. Migrations preserve existing content. Processes must restart after environment restoration.

## Production preparation, after approval

Authenticate through Wrangler's secure browser flow or a scoped deployment token in a secure CI secret store. Never paste tokens/passwords into chat, Git or shell arguments.

```sh
node scripts/wrangler.mjs login
node scripts/wrangler.mjs d1 create controlex
```

Copy the actual D1 database ID into the root `d1_databases` entry, preserving the separate local binding. The zero UUID in the repository is deliberately not a production database. Review R2 eligibility/billing before creating storage; free allowances do not prevent overage charges or imply that billing activation is unnecessary.

```sh
node scripts/wrangler.mjs r2 bucket create controlex-media-assets
```

The root `MEDIA` binding targets that bucket. It is a planned name, not an already provisioned bucket. Do not create it or activate billing until approved.

Create a real Turnstile widget for `controlexmedia.com`, put its public site key in root `vars.TURNSTILE_SITE_KEY`, and enter its secret with the secure prompt:

```sh
node scripts/wrangler.mjs secret put TURNSTILE_SECRET_KEY --env=""
npm run db:remote
npm run admin:setup -- --remote --email vinc3nt.0liv3r@gmail.com
```

The remote admin command creates an **invited** D1 owner. It does not send email or invent a password. It requires the provisioned D1 binding and Cloudflare authentication. Do not use local password variables in production.

## Cloudflare Access

Confirm your account's current free seat eligibility before adding users. Create a self-hosted Access application for `controlexmedia.com/admin*` and, for consistency, `/api/admin/*`. Configure a real identity provider or email authentication, session lifetime, and MFA as available. Set the root `ACCESS_TEAM_DOMAIN` (for example `your-team.cloudflareaccess.com`) and exact application `ACCESS_AUD` copied from Access. These are identifiers, not passwords.

Choose a login policy that permits the intended identities. Every request is also checked in the Worker against signed JWT claims, invited D1 status, subject binding and role. Arbitrary user-email headers, public registration, disabled identities and forged assertions cannot grant access. Do not add an Access bypass policy. The initial Gmail owner must be permitted by the Access login policy.

Invite more editors/owners from **Administrators** in the studio manager. If the new identity is outside the existing Access policy, update that policy as well. To replace the owner email: invite the new owner, sign in successfully as that owner, then disable the former account. The CMS prevents changing your own access while signed in. Production authentication credentials and MFA remain with the identity provider.

## Content and legal review

Upload the actual logo and rights-cleared client images, set contact details, review package scopes/prices and enter approved account instructions. Publish reviewed pages with slugs `privacy` and `terms` to replace development notices. Define legal identity, privacy contact, jurisdiction, inquiry retention and payment/refund policies before launch. The six sample showcases are clearly labelled concepts and may be edited/archived through the CMS. Do not present them as commissioned client outcomes.

Run `npm run fonts` on the build machine. The vendor's WOFF2 binary is ignored by Git and must be downloaded directly, as its license restricts redistribution. `npm run build` includes it in this website's static assets.

## Validate and deploy

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm audit
# Local server only, in another terminal:
npm run test:smoke
npm run test:browser
```

Before live deployment, verify Access, Turnstile secret, D1 migrations, actual R2 bucket, legal copy and approved invoice instructions. `deploy` rejects a placeholder database ID, missing site key/Access identifiers/R2 binding or invalid HTTPS origin. The check cannot prove the existence/accuracy of external credentials, merchant permissions or legal review.

```sh
npm run deploy
```

The configured custom domain binds `controlexmedia.com`. `workers.dev` and preview URLs are disabled in the root configuration. Check HTTPS, canonical domain handling, DNS, Access allow/deny behavior and public routes after deployment. Do not direct browser tests or synthetic invoicing tests at production; they intentionally mutate local test data.

The daily cron at 03:17 UTC removes abuse counters older than one day. It preserves content, inquiries, orders and audit records. Confirm the schedule and CPU/D1 usage in Cloudflare after provisioning. Local wall-clock timing does not measure Workers CPU, free-tier headroom or Core Web Vitals under real traffic. Inspect request metrics and sampled logs without collecting lead bodies or secret values.

## Payments

Current supported workflow: owner agrees scope → creates PKR/USD invoice → shares private token link → customer transfers through the business's approved bank/Easypaisa/JazzCash/Payoneer arrangement → submits a reference → owner independently checks the exact amount/currency in the account statement → records verification. A customer reference or redirect never marks paid. References are deduplicated, prices are frozen and only owners can settle/refund/cancel invoices.

The site records transfers; it does not initiate them, convert PKR/USD, hold funds or collect card details. Verify wallet limits, USD/Payoneer eligibility and provider permissions for your specific business account. Refund controls record an independently completed full refund; they do not send money. Partial refunds are not implemented.

Automated checkout remains separate work after merchant approval and current official API documentation. No webhook URL is implemented or advertised. A future adapter must verify raw signed events/timestamps, order amount/currency and idempotency, with retry/reconciliation tests. Never enable checkout by trusting a client confirmation or using guessed credentials.

## Backups and operation

D1 Free's 7-day Time Travel is not an independent backup. Export periodically to a private protected destination and exercise restore into a separate database before launch:

```sh
node scripts/wrangler.mjs d1 export controlex --remote --output .local/controlex-backup.sql
```

Encrypt/control access to exports; never commit production leads or invoices. Back up R2 objects separately and preserve metadata/object-key consistency. Define retention and privacy deletion procedures with the business. Archive preserves records and is not a GDPR-style hard deletion. Record an operational owner and reconcile transfers regularly. Gateway fees, domain renewal, paid upgrades and R2 overages can incur costs; no $0 guarantee is implied.
