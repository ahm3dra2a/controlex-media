import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
const url = new URL(config.vars.SITE_URL);
if (
  url.protocol !== "https:" ||
  url.hostname.endsWith(".invalid") ||
  url.hostname === "localhost"
)
  throw new Error(
    "Set the real HTTPS SITE_URL in wrangler.jsonc before deployment.",
  );
if (config.d1_databases.some((db) => db.database_id.startsWith("00000000")))
  throw new Error("Create D1 and set its database_id before deployment.");
if (!config.vars.TURNSTILE_SITE_KEY)
  throw new Error(
    "Set a production Turnstile site key and provision TURNSTILE_SECRET_KEY with Wrangler before deployment.",
  );
if (!config.vars.ACCESS_TEAM_DOMAIN || !config.vars.ACCESS_AUD)
  throw new Error(
    "Configure the Cloudflare Access team domain and application audience before deployment.",
  );
if (!config.r2_buckets?.some((bucket) => bucket.binding === "MEDIA"))
  throw new Error("Configure a provisioned R2 MEDIA bucket before deployment.");
console.log(
  "Configuration checks passed. Confirm Turnstile secret, migrations, legal copy, and the production launch checklist in docs/DEPLOYMENT.md.",
);
