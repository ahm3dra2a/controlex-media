import { mkdir, writeFile } from "node:fs/promises";

// Obtain an unmodified official webfont directly; do not redistribute it in Git.
const response = await fetch(
  "https://api.fontshare.com/v2/css?f[]=clash-display@variable&display=swap",
);
if (!response.ok)
  throw new Error(
    `Fontshare returned ${response.status}. Download Clash Display from fontshare.com/fonts/clash-display and place its official variable WOFF2 in public/fonts/.`,
  );
const css = await response.text();
const block = css.match(
  /@font-face\s*\{[^}]*font-weight:\s*200\s+700[^}]*\}/,
)?.[0];
const match = block?.match(
  /url\(['"]?((?:https:)?\/\/[^)'"\s]+\.woff2)['"]?\)/,
);
if (!match)
  throw new Error(
    "Fontshare's response did not contain the variable WOFF2 font. Use the official download.",
  );
const url = new URL(match[1].startsWith("//") ? `https:${match[1]}` : match[1]);
if (url.hostname !== "cdn.fontshare.com")
  throw new Error("Unexpected font source.");
const font = await fetch(url);
if (!font.ok) throw new Error(`Font download failed: ${font.status}`);
const bytes = new Uint8Array(await font.arrayBuffer());
if (
  new TextDecoder().decode(bytes.slice(0, 4)) !== "wOF2" ||
  bytes.length > 200000
)
  throw new Error("Unexpected font file.");
await mkdir("public/fonts", { recursive: true });
await writeFile("public/fonts/ClashDisplay-Variable.woff2", bytes);
console.log(
  "Official Clash Display installed for this checkout. Review public/fonts/LICENSE.txt; the binary is excluded from Git.",
);
