import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#141412;color:#fff;font-family:Arial,sans-serif;padding:58px;height:630px}
    .brand{font-size:24px;font-weight:bold;letter-spacing:-1px}.brand span{color:#ff5e34}.label{font-size:13px;margin-top:45px;letter-spacing:2px;color:#b6b6ad}
    h1{font-size:105px;line-height:.94;letter-spacing:-7px;margin:26px 0;width:650px}h1 span{color:#ff5e34}.bottom{font-size:16px;color:#b6b6ad;margin-top:35px}
    .art{position:absolute;right:58px;top:58px;width:340px;height:510px;border-radius:170px 170px 4px 4px;background:linear-gradient(#ff451d,#ff5e00);overflow:hidden}
    .ring{position:absolute;top:135px;left:28px;width:284px;height:284px;border:30px solid #171714;border-right-color:transparent;border-radius:50%;transform:rotate(-35deg)}
    .inner{width:180px;height:180px;border-width:24px;left:80px;top:187px;border-right-color:#171714;border-bottom-color:transparent}.dot{position:absolute;left:144px;top:251px;width:52px;height:52px;border-radius:50%;background:#f4f2ed}
    .art p{position:absolute;bottom:25px;left:25px;color:#261209;font-size:13px}
  </style></head><body><div class="brand">controlex <span>media</span></div><p class="label">STRATEGY × CREATIVITY × TECHNOLOGY</p><h1>Make your<br>next move<br><span>matter.</span></h1><p class="bottom">Brands, websites & digital growth.</p><div class="art"><div class="ring"></div><div class="ring inner"></div><div class="dot"></div><p>Pakistan → Everywhere</p></div></body></html>`);
  await page.screenshot({ path: "public/og.png" });
} finally {
  await browser.close();
}
