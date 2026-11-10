/* global process, console, document, getComputedStyle, fetch, location */
// The title's Continue shows the face the creator saved: after making a
// character and starting the life, the title's Continue holds the player's one
// face (their pack figure, the same one You and the player card show), byte for
// byte the creator's portrait, drawn as its round headshot. Run against the bench:
//   BENCH_PORT=3000 node src/bench/continue-face.browser.mjs [shot.png]
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shot] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const hash = (url) =>
  page.evaluate(async (u) => {
    const bytes = new Uint8Array(await (await fetch(u)).arrayBuffer());
    return bytes.reduce((h, x) => (h * 31 + x) >>> 0, 7);
  }, url);
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("[data-gender=male]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.locator("#cr-states button").first().click();
  await page.locator("#cr-towns button").first().click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  // A color steps with arrows: press the next arrow until the row names the color.
  const choose = async (row, name) => {
    const line = page.locator(`[data-testid=engine-appearance-${row}]`);
    for (let i = 0; i < 16; i += 1) {
      if (
        (await line.locator(".look-value").innerText())
          .toLowerCase()
          .includes(name)
      )
        return true;
      await line.getByRole("button").last().click();
      await page.waitForTimeout(250);
    }
    return false;
  };
  // Another build (another pack person, so another skin), then a red top.
  await page
    .locator("[data-testid=engine-appearance-build]")
    .getByRole("button")
    .last()
    .click();
  await page.waitForTimeout(250);
  await choose("top", "red");
  await page.waitForTimeout(500);
  const made = await page.evaluate(() =>
    document.getElementById("cr-portrait").src.replace(location.origin, ""),
  );
  await page.locator("#cr-begin").click();
  await page.locator("#card:not([hidden])").waitFor({ timeout: 300000 });
  await page.goto(`${base}/play`);
  await page.waitForFunction(
    () => !document.getElementById("front-continue").disabled,
  );
  await page.waitForTimeout(1500);
  if (shot) await page.screenshot({ path: shot });
  const face = await page.evaluate(
    () =>
      getComputedStyle(document.querySelector("#front-continue-bust .headshot"))
        .backgroundImage,
  );
  console.log("continue face:", face);
  assert.match(face, /\/art\/people\//, "Continue shows no face");
  const url = /url\("(.*)"\)/.exec(face)[1];
  assert.equal(
    await hash(url),
    await hash(made),
    "the Continue face is not the creator's portrait",
  );
  // The same face You shows (play-one-person-shows-two-faces): one picture source.
  await page.locator("#front-continue").click();
  await page.locator('#rings [data-tab="who"]').click();
  const you = await page
    .locator("#sheet-body .mxbust img")
    .first()
    .getAttribute("src");
  assert.equal(you, url, "You shows a different face from Continue");
  console.log("PASS Continue shows the face the creator saved");
} finally {
  await browser.close();
}
