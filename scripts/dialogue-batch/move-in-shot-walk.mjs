import { chromium } from "playwright";
import { startLife } from "../../src/bench/start-life.mjs";
const base = `http://localhost:4711`;
const [shot] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(120000);
const j = async (path, init) => (await fetch(base + path, init)).json();
try {
  const life = await startLife(page, { url: `${base}/play`, fresh: true });
  console.log("life", JSON.stringify(life));
  let staged = await (await fetch("http://localhost:4712/stage", { method: "POST" })).text();
  if (JSON.parse(staged).adultOn) {
    const d0 = new Date(JSON.parse(staged).adultOn + "T00:00:00Z"); d0.setUTCDate(d0.getUTCDate() + 2);
    console.log("to adult", JSON.stringify(await j("/api/dev/advance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "date", to: d0.toISOString().slice(0, 10) }) })));
    staged = await (await fetch("http://localhost:4712/stage", { method: "POST" })).text();
  }
  console.log("staged", staged);
  const d = new Date(JSON.parse(staged).date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 33);
  const to = d.toISOString().slice(0, 10);
  console.log("advance", JSON.stringify(await j("/api/dev/advance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "date", to }) })));
  console.log("state", JSON.stringify(await j("/api/dev/state")).slice(0, 300));
  await page.goto(`${base}/play`);
  await page.waitForFunction(() => !document.getElementById("front-continue").disabled);
  await page.locator("#front-continue").click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: shot.replace(".png", "-0.png") });
  console.log("text", (await page.locator("body").innerText()).slice(0, 1500));
} finally {
  await browser.close();
}
