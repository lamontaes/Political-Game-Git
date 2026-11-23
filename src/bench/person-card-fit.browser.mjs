/* global console, document, process */
// Every card of the people closest to the player fits its panel at 1440 by
// 900, the longest life story included (owner's menu rule; CTO, Nov 18: "Her
// story" ran off the bottom of the card). Plays a new life, opens "Who I am",
// opens each close person's card and asserts no section ends below the panel.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
/** The card's sections whose bottom is past its panel's (none when it fits). */
const overPanel = () =>
  page.evaluate(() => {
    const bottom = document
      .querySelector("#person")
      .getBoundingClientRect().bottom;
    return [...document.querySelectorAll("#person .sec")]
      .filter((sec) => sec.getBoundingClientRect().bottom > bottom)
      .map((sec) => sec.textContent.slice(0, 30));
  });
const openWho = () =>
  page.evaluate(() =>
    document.querySelector('#rings [data-tab="who"]')?.click(),
  );
try {
  await startLife(page, { url: process.env.BENCH_URL });
  console.log("Player:", await page.locator("#card-place").innerText());
  const names = ".hispeople .nm.pick";
  await openWho();
  await page.locator(names).first().waitFor();
  const count = Math.min(await page.locator(names).count(), 4);
  for (let at = 0; at < count; at += 1) {
    if (
      !(await page
        .locator(names)
        .first()
        .isVisible()
        .catch(() => false))
    )
      await openWho();
    await page.locator(names).nth(at).click();
    await page.locator("#person:not([hidden])").waitFor();
    await page.waitForTimeout(800);
    const over = await overPanel();
    console.log(
      `Person ${at + 1} of ${count}: ${over.length ? "RUNS PAST" : "fits"}`,
    );
    assert.deepEqual(over, [], "a close person's card runs past its panel");
    await page.keyboard.press("Escape");
    await page.locator("#person").waitFor({ state: "hidden" });
  }
  assert.deepEqual(errors, []);
  console.log("PASS every close person's card fits its panel");
} finally {
  await browser.close();
}
