import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.BENCH_BROWSER });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
await page.goto("http://localhost:3000/play");
await page.waitForResponse((r) => new URL(r.url()).pathname === "/api/title").catch(()=>{});
const life = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/newlife", { timeout: 300000 });
await page.locator("#new-life").click();
await page.locator("#new-world").click();
const r = await life;
console.log("seed", new URL(r.url()).searchParams.get("seed"));
let n = 0, seen = new Set(), lastBd = "";
for (let i = 0; i < 1000; i++) {
  const st = await page.evaluate(() => ({
    box: !document.getElementById("opening-box").hidden,
    speech: document.getElementById("opening-speech")?.textContent.slice(0, 60),
    bd: document.getElementById("backdrop")?.src.split("/").pop(),
  }));
  if (st.box && st.bd !== lastBd) {
    lastBd = st.bd;
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${out}-${String(n++).padStart(2, "0")}.png` });
    console.log(n - 1, st.bd, "|", st.speech);
  }
  if (!st.box && n > 3) break;
  await page.waitForTimeout(250);
}
await page.waitForFunction(() => document.getElementById("card-place")?.textContent.trim(), null, { timeout: 60000 }).catch(()=>{});
console.log("card place:", await page.locator("#card-place").innerText().catch(() => "n/a"));
await browser.close();
