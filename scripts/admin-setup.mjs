import { spawnSync } from "node:child_process";
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}
async function password() {
  if (process.argv.includes("--password-stdin")) {
    let value = "";
    for await (const chunk of process.stdin) value += chunk;
    return value.trim();
  }
  if (!process.stdin.isTTY)
    throw new Error(
      "Run interactively, or provide a password on standard input with --password-stdin.",
    );
  process.stdout.write("Local admin password (at least 12 characters): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const handle = (chunk) => {
      const text = chunk.toString();
      for (const char of text) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        } else if (char >= " ") {
          value += char;
          process.stdout.write("*");
        }
      }
    };
    const cleanup = () => {
      process.stdin.removeListener("data", handle);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    process.stdin.on("data", handle);
  });
}
let email = option("--email");
if (!email) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  email = await rl.question("Admin email: ");
  rl.close();
}
email = email.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error("A valid email is required.");
const remote = process.argv.includes("--remote");
if (!remote) {
  const value = await password();
  if (value.length < 12 || value.length > 200)
    throw new Error("Use a password between 12 and 200 characters.");
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(value, salt, 100000, 32, "sha256").toString("base64");
  let existing = "";
  try {
    existing = await readFile(".dev.vars.local", "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const retained = existing
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.startsWith("LOCAL_ADMIN_") &&
        !line.startsWith("LOCAL_SESSION_SECRET="),
    )
    .join("\n")
    .trim();
  await writeFile(
    ".dev.vars.local",
    `${retained}${retained ? "\n" : ""}LOCAL_ADMIN_EMAIL=${JSON.stringify(email)}\nLOCAL_ADMIN_PASSWORD_HASH=${JSON.stringify(`${salt.toString("base64")}:${hash}`)}\nLOCAL_SESSION_SECRET=${JSON.stringify(randomBytes(32).toString("hex"))}\n`,
    { mode: 0o600 },
  );
}
const role = option("--role") || "owner";
if (!["owner", "editor"].includes(role))
  throw new Error("Role must be owner or editor.");
const escaped = email.replaceAll("'", "''");
const sql = `INSERT INTO users(id,email,role,status) VALUES('${randomUUID()}','${escaped}','${role}','${remote ? "invited" : "active"}') ON CONFLICT(email) DO UPDATE SET role=excluded.role,status=excluded.status,updated_at=CURRENT_TIMESTAMP`;
const result = spawnSync(
  process.execPath,
  [
    "scripts/wrangler.mjs",
    "d1",
    "execute",
    remote ? "controlex" : "controlex-local",
    remote ? "--remote" : "--local",
    "--env",
    remote ? "" : "local",
    "--command",
    sql,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
console.log(
  remote
    ? "Identity invited. Configure Cloudflare Access issuer/audience and the email allow policy before login."
    : "Local admin configured. Restart npm run dev, then sign in at /admin with your email and chosen password. Production uses Cloudflare Access; this local password cannot grant production access.",
);
