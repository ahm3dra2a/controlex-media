# Controlex Media

An original creative technology studio for growing businesses. Built in stages for Cloudflare Workers Free, without a VPS.

**Phase 1 is a working foundation, not a completed production CMS or payment application.** It includes server-rendered public pages, a responsive design system, a real local D1 inquiry flow, schema migrations, SEO endpoints, and critical-flow tests. Admin endpoints fail closed. Checkout is not exposed.

## Run Phase 1

Requirements: Node 22.12+ (Node 24 tested), npm, and Python 3 for schema checks. Browser checks additionally use Chromium; set `CHROMIUM_PATH` when it is not `/usr/bin/chromium`.

```sh
cd /workspace/controlex-media
npm ci
npm run db:local
npm run dev
```

The development server listens on port 8787. On your own machine use the checkout's actual path instead of `/workspace/controlex-media`. No Cloudflare account or payment credentials are needed for local development. Local inquiry spam verification is bypassed **only** with the local environment flags and a loopback request hostname. Accessing the form through a different hostname requires real Turnstile configuration; the server does not accept a spoofed bypass field.

In another terminal:

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
# Requires the development server and a freshly migrated local database:
npm run test:smoke
npm run test:browser
```

Smoke and browser checks deliberately create a local test lead. Never point these checks at production; they require the local health marker and a loopback origin. Local D1 state stays in `.wrangler/`; stop/start preserves it. Applying migrations again does not duplicate or overwrite content. Browser screenshots are written to ignored `test-results/`.

The orange/white brand foundations and layout are implemented. Clash Display is declared as the primary display font, but its licensed font files have **not** been acquired: the font vendor is blocked by the current environment egress policy. The tested interface currently uses the explicit Arial fallback. See `public/fonts/README.md` before claiming typography complete.

## Project notes

- [Research and verified platform limits](docs/RESEARCH.md)
- [Architecture, positioning, site map, payment approach and phase boundaries](docs/ARCHITECTURE.md)
- [Design system and accessibility decisions](docs/DESIGN.md)
- [Cloudflare deployment and launch prerequisites](docs/DEPLOYMENT.md)
- [Validation results and review checklist](docs/PHASE-1.md)
- [Pre-push test verification](docs/VALIDATION.md)

Portfolio examples are clearly labelled studio concepts, not client engagements. No fake testimonials, revenue lifts, social handles, fixed prices or administrator credentials are seeded. Social links render from active database records. Content editing interfaces arrive in the CMS stage.
