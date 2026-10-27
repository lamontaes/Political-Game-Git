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
await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 120000 });
let last = "";
for (let i = 0; i < 40; i++) {
  const speech = await page.locator("#opening-speech").innerText().catch(() => "");
  const name = await page.locator("#opening-name").innerText().catch(() => "");
  const src = await page.locator("#backdrop").getAttribute("src");
  const key = src + "|" + speech.slice(0, 20);
  if (key !== last) {
    last = key;
    await page.screenshot({ path: `${out}-${String(i).padStart(2, "0")}.png` });
    console.log(i, src.split("/").pop(), "|", name, "|", speech.slice(0, 90));
  }
  if (!(await page.locator("#opening-box:not([hidden])").count())) break;
  await page.waitForTimeout(1500);
  await page.locator("#opening-box").click().catch(()=>{});
}
await browser.close();
