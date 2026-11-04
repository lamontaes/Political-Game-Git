// Opens the saved life (Continue) right after its New Game and reads, as a player,
// each relative's card from People > List > View person, and the player's own card.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire("/home/user/Political-Game-Git/package.json");
const { chromium } = require("playwright");
const [outDir, tag] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000/play");
await page.locator("#front-continue").click();
await page.waitForFunction(() => document.getElementById("card-name")?.textContent.trim());
await page.waitForTimeout(2000);
const clock = await page.locator("#card-clock").innerText();
const out = { tag, clock, cards: [] };
// Own card: the first rail button.
const rail = page.locator("nav button, #rail button, .rail button");
await page.locator('[data-tab="people"]').first().evaluate((e) => e.click());
await page.waitForTimeout(1500);
await page.getByRole("button",{name:"List",exact:true}).click();
await page.waitForTimeout(1000);
const rows = await page.locator("#sheet .people-row, #sheet [class*=row]").count();
const names = await page.evaluate(() => [...document.querySelectorAll("#sheet button, #sheet [role=button], #sheet .item")].map(b=>b.innerText.trim()).filter(t=>/\n/.test(t)));
out.list = names;
let i = 0;
for (const label of names.slice(0, 12)) {
  const name = label.split("\n")[0];
  await page.locator("#sheet").getByText(name, { exact: true }).first().click();
  await page.getByRole("button",{name:"View person",exact:true}).click();
  await page.locator("#person:not([hidden])").waitFor();
  await page.waitForTimeout(800);
  const text = await page.locator("#person").innerText();
  out.cards.push({ label, text });
  await page.screenshot({ path: `${outDir}/${tag}-card-${i++}.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  if (!(await page.locator("#sheet").isVisible())) {
    await page.locator('[data-tab="people"]').first().evaluate((e) => e.click());
    await page.waitForTimeout(1000);
    if (await page.getByRole("button",{name:"List",exact:true}).count()) await page.getByRole("button",{name:"List",exact:true}).click();
  }
}
await page.keyboard.press("Escape");
out.errors = errors;
writeFileSync(`${outDir}/${tag}-cards.json`, JSON.stringify(out, null, 2));
for (const c of out.cards) console.log("##", c.label.replace("\n"," / "), "\n", c.text.slice(0, 700));
console.log("errors", errors, "clock", clock);
await browser.close();
