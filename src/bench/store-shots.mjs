/* global process, console, document */
// Real gameplay screenshots for the store page, from the /play screen of a
// running bench (npm run bench). Usage:
//   node src/bench/store-shots.mjs <out-dir> [seed ...]
// Every shot is a played moment in a generated town: nothing is staged.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const [out = "store-shots", ...seeds] = process.argv.slice(2);
const url = process.env.BENCH_URL ?? "http://localhost:3000/play";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BENCH_BROWSER ??
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const settle = async () => {
  await page.waitForFunction(
    () => [...document.querySelectorAll("img")].every((i) => i.complete),
    null,
    { timeout: 180000 },
  );
  await page.waitForTimeout(400);
};
let n = 0;
const shot = async (name) => {
  await settle();
  const file = `${out}/${String(++n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(file, "|", (await page.textContent("#card-place")) ?? "");
};
const sheet = async (tab, name, from = "#tabs") => {
  await page.click(`${from} [data-tab=${tab}]`);
  await page.waitForTimeout(2500);
  await shot(name);
  await page.click("#sheet-close");
};
const button = async (label) => {
  const b = await page.$(`#sheet-body button:text-is("${label}")`);
  if (b) await b.click();
  return Boolean(b);
};

for (const seed of seeds.length ? seeds : ["store-a", "store-b"]) {
  await page.goto(url);
  await page.waitForTimeout(1500);
  if (n === 0) await shot("title");
  await page.click("#new-life");
  await page.click("#new-advanced");
  await page.fill("#seed", seed);
  await page.click("#advanced-back");
  await page.click("#new-start");
  // The creator: a drawn name and birthday, the first state and town.
  await page.waitForSelector("#cr-character:not([hidden])");
  await page.click("[data-gender=male]");
  await page.click("#cr-random-name");
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.click("#cr-character-next");
  await page.click("#cr-states button");
  await page.click("#cr-towns button");
  await page.waitForSelector("#cr-look:not([hidden])");
  await page.click("#cr-begin");
  // The opening: the President, then the Senate.
  await page.waitForSelector("#caption:not([hidden])", { timeout: 300000 });
  await page.waitForTimeout(1500);
  await shot(`${seed}-opening-president`);
  await page.waitForTimeout(4500);
  await shot(`${seed}-opening-congress`);
  // Escape opens options; skip the rest of the opening from there.
  await page.keyboard.press("Escape");
  await page.click('#sheet-body button:text-is("Skip opening")');
  await page.waitForSelector("#card:not([hidden])", { timeout: 60000 });
  await page.waitForTimeout(2500);
  await shot(`${seed}-home`);
  const other = await page.$("#people .figure[style*='pointer']");
  if (other) {
    await other.evaluate((e) => e.click());
    // The talk first; their name in it opens their card.
    await page.waitForSelector("#talk:not([hidden])");
    await settle();
    await shot(`${seed}-talk`);
    await page.click("#talk-name");
    await page.waitForSelector("#person:not([hidden])");
    await shot(`${seed}-person`);
    await page.keyboard.press("Escape");
    await page.click("#talk-leave");
  }
  await page.click("#stack [data-tab=people]");
  await page.waitForTimeout(1500);
  if (await button("Family")) {
    await page.waitForTimeout(2500);
    await shot(`${seed}-family`);
  }
  await page.click("#sheet-close");
  await page.click("#tabs [data-tab=politics]");
  await page.waitForTimeout(2000);
  if (await button("Map")) {
    await page.waitForTimeout(2000);
    await shot(`${seed}-map`);
  }
  await page.click("#sheet-close");
  await sheet("calendar", `${seed}-calendar`);
  // Until needed, to election night.
  for (let i = 0; i < 60; i++) {
    // Election night is its own pop-up: the returns for the player's race.
    if (!(await page.isHidden("#returns"))) break;
    if (!(await page.isHidden("#continue"))) await page.click("#continue");
    else if (
      !(await page.isDisabled("#skip")) &&
      !(await page.$eval("#skip", (b) => b.classList.contains("active")))
    )
      await page.click("#skip");
    await page.waitForTimeout(1500);
  }
  if (!(await page.isHidden("#returns"))) await shot(`${seed}-election-night`);
}
await browser.close();
