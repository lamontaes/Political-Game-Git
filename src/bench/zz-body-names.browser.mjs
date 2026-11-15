/* global process, console, document */
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";
import fs from "node:fs";
const keys = process.env.KEYS.split(",");
const out = process.env.OUT;
const browser = await chromium.launch({ executablePath: process.env.BENCH_BROWSER });
for (const key of keys) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(300000);
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", key);
    return route.continue({ url: url.toString() });
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/newlife", { timeout: 600000 });
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  await playOpening(page, (await (await response).json()).sceneMomentId ?? null);
  await page.waitForFunction(() => document.getElementById("card-name").textContent.trim());
  console.log("PLACE", key, await page.locator("#card-place").innerText());
  for (const tab of ["politics", "calendar"]) {
    await page.locator(`[data-tab="${tab}"]`).first().evaluate((e) => e.click());
    await page.waitForTimeout(1500);
    const text = await page.locator("#sheet-body").innerText();
    fs.writeFileSync(`${out}/${key}-${tab}.txt`, text);
    await page.screenshot({ path: `${out}/${key}-${tab}.png` });
  }
  await page.close();
}
await browser.close();
