# Clash Display

Obtain the licensed font files from the official [Fontshare Clash Display page](https://www.fontshare.com/fonts/clash-display). Keep the vendor license and follow its terms. The onboarding network policy blocked the vendor during Phase 1; no font binary is installed and the interface uses Arial fallback.

After obtaining an authorized WOFF2 file, place it here, add a matching `@font-face` in `src/styles/site.css` with `font-display: swap`, and rerun asset/browser checks. Only declare the weights supported by the file. Never pull fonts from an unverified mirror. Font binaries are public website assets, not secrets.
