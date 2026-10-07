import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

export async function launchBrowser() {
  const candidates =
    process.platform === "win32"
      ? [
          join(
            process.env.PROGRAMFILES || "C:/Program Files",
            "Microsoft/Edge/Application/msedge.exe",
          ),
          join(
            process.env["PROGRAMFILES(X86)"] || "C:/Program Files (x86)",
            "Microsoft/Edge/Application/msedge.exe",
          ),
          join(
            process.env.LOCALAPPDATA || "",
            "Google/Chrome/Application/chrome.exe",
          ),
        ]
      : process.platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : [
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/usr/bin/google-chrome",
          ];
  const executablePath =
    process.env.CHROMIUM_PATH ||
    candidates.find(existsSync) ||
    chromium.executablePath();
  if (!existsSync(executablePath))
    throw new Error(
      "No browser found. Run npm run browser:install, or set CHROMIUM_PATH to your Chrome/Edge executable.",
    );
  return chromium.launch({
    executablePath,
    headless: true,
    args: process.platform === "linux" ? ["--no-sandbox"] : [],
  });
}
