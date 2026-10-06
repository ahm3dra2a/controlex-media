import { cp, mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("dist/assets", { recursive: true });
await cp("public", "dist/assets", {
  recursive: true,
  filter: (path) => !path.endsWith(".md"),
});
await build({
  entryPoints: ["src/styles/site.css"],
  outfile: "dist/assets/site.css",
  minify: true,
});
await build({
  entryPoints: ["src/client.ts"],
  outfile: "dist/assets/site.js",
  bundle: true,
  minify: true,
  target: "es2022",
});
