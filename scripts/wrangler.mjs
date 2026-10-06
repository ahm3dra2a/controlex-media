import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const config = resolve(".local/config");
mkdirSync(config, { recursive: true });
const child = spawn(
  process.execPath,
  ["node_modules/wrangler/bin/wrangler.js", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: config,
      WRANGLER_LOG_PATH: resolve(".local/wrangler.log"),
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
