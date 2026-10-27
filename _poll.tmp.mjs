import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.BENCH_BROWSER });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
await page.goto("http://localhost:3000/play");
await page.waitForResponse((r) => new URL(r.url()).pathname === "/api/title").catch(()=>{});
const life = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/newlife", { timeout: 300000 });
await page.locator("#new-life").click();
await page.locator("#new-world").click();
await life;
const t0 = Date.now();
let last = "";
for (let i = 0; i < 200; i++) {
  const st = await page.evaluate(() => ({
    box: !document.getElementById("opening-box").hidden,
    speech: document.getElementById("opening-speech")?.textContent.slice(0, 50),
    name: document.getElementById("opening-name")?.textContent,
    bd: document.getElementById("backdrop")?.src.split("/").pop(),
  }));
  const k = JSON.stringify(st);
  if (k !== last) { last = k; console.log(((Date.now() - t0) / 1000).toFixed(1), k); }
  await page.waitForTimeout(300);
}
await browser.close();
