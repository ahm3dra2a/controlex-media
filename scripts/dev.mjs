import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { context } from "esbuild";

await mkdir("dist/assets", { recursive: true });
await cp("public", "dist/assets", {
  recursive: true,
  filter: (path) => !path.endsWith(".md"),
});
const contexts = await Promise.all([
  context({
    entryPoints: ["src/admin/client.ts"],
    outfile: "dist/assets/admin.js",
    bundle: true,
    minify: true,
    target: "es2022",
  }),
  context({
    entryPoints: ["src/styles/admin.css"],
    outfile: "dist/assets/admin.css",
    minify: true,
  }),
  context({
    entryPoints: ["src/styles/site.css"],
    outfile: "dist/assets/site.css",
    minify: true,
  }),
  context({
    entryPoints: ["src/client.ts"],
    outfile: "dist/assets/site.js",
    bundle: true,
    minify: true,
    target: "es2022",
  }),
]);
await Promise.all(contexts.map((compiler) => compiler.rebuild()));
await Promise.all(contexts.map((compiler) => compiler.watch()));
const publicWatcher = watch(
  "public",
  { recursive: true },
  async (_event, name) => {
    if (!name || name.endsWith(".md")) return;
    try {
      await cp(join("public", name), join("dist/assets", name), {
        recursive: true,
      });
    } catch (error) {
      if (error.code === "ENOENT")
        await rm(join("dist/assets", name), { recursive: true, force: true });
      else console.error("Asset update failed", error.message);
    }
  },
);
const worker = spawn(
  process.execPath,
  [
    "scripts/wrangler.mjs",
    "dev",
    "--env",
    "local",
    "--ip",
    "0.0.0.0",
    "--port",
    "8787",
  ],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => worker.kill(signal));
worker.on("exit", async (code) => {
  publicWatcher.close();
  await Promise.all(contexts.map((compiler) => compiler.dispose()));
  process.exit(code ?? 1);
});
