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
const ready = () =>
  page.waitForFunction(
    () =>
      !document.querySelector("#day").disabled ||
      !document.querySelector("#continue").hidden ||
      !document.querySelector("#choices").hidden,
    null,
    { timeout: 300000 },
  );
let n = 0;
const shot = async (name) => {
  await settle();
  const file = `${out}/${String(++n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(file, "|", (await page.textContent("#card-place")) ?? "");
};
for (const seed of seeds.length ? seeds : ["store-a", "store-b", "store-c"]) {
  await page.goto(url);
  await page.fill("#seed", seed);
  await page.click("#new-life");
  await page.waitForSelector("#card:not([hidden])", { timeout: 300000 });
  await shot(`${seed}-home`);
  // Live a little: a week, answering what comes up with the first choice.
  await page.click("#week");
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(600);
    await ready();
    if (!(await page.isHidden("#continue"))) await page.click("#continue");
    else if (!(await page.isHidden("#choices")))
      await page.click("#choice-list button");
    else break;
  }
  await shot(`${seed}-day`);
  const other = await page.$("#people .figure[style*='pointer']");
  if (other) {
    await other.evaluate((e) => e.click());
    await page.waitForSelector("#talk:not([hidden])");
    await shot(`${seed}-talk`);
    await page.click("#talk-leave");
  }
  await page.click("#tabs [data-tab=politics]");
  await page.waitForTimeout(1500);
  await shot(`${seed}-politics`);
  await page.click("#tabs [data-tab=politics]");
}
await browser.close();
