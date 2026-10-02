import { chromium } from "playwright";
import fs from "fs";
const b = await chromium.launch();
fs.mkdirSync("steam-c", { recursive: true });
for (const f of fs.readdirSync(".").filter(f => f.startsWith("c-") && f.endsWith(".html"))) {
  const m = f.match(/(\d+)x(\d+)/); const w = +m[1], h = +m[2];
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("file://" + process.cwd() + "/" + f, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const transparent = f.includes("library-logo");
  await p.screenshot({ path: "steam-c/" + f.slice(2).replace(".html", ".png"), omitBackground: transparent });
  await p.close(); console.log(f);
}
await b.close();
