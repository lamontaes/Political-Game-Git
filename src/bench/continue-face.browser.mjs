/* global process, console, document, URL */
// The title's Continue shows the face the creator saved: after making a
// character and starting the life, the title's Continue holds that life's
// bust, the same head and hair the game draws for it, as a round headshot.
// Run against the bench:
//   BENCH_PORT=3000 node src/bench/continue-face.browser.mjs [shot.png]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shot] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
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
    // A look offers only the rows its person has; a row it lacks is left alone.
    if (!(await line.count())) return false;
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
  if (await choose("skin", "ebony")) await choose("shirt-color", "red");
  await page.waitForTimeout(500);
  const born = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#cr-begin").click();
  const made = await born;
  const { placeName, sceneMomentId } = await made.json();
  console.log(
    "Seed:",
    new URL(made.url()).searchParams.get("seed"),
    "Place:",
    placeName,
  );
  // A new life opens on the President's address; play it as a player does.
  await playOpening(page, sceneMomentId ?? null);
  await page.locator("#card:not([hidden])").waitFor({ timeout: 300000 });
  await page.goto(`${base}/play`);
  await page.waitForFunction(
    () => !document.getElementById("front-continue").disabled,
  );
  await page.waitForTimeout(1500);
  if (shot) await page.screenshot({ path: shot });
  const pieces = () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "#front-continue-bust .headshot .bust-stack img",
        ),
      ].map((img) => new URL(img.src).pathname),
    );
  const face = await pieces();
  console.log("continue face:", face.join(" "));
  assert.ok(face.length >= 3, "Continue shows no bust");
  // The same head and hair the game draws for this life (the top follows
  // where the person is, so it is left out of the comparison).
  const { life } = await (await page.request.get(`${base}/api/title`)).json();
  const card = await (
    await page.request.get(`${base}/api/card?id=${life.personId}`)
  ).json();
  const worn = (layers) => layers.filter((url) => !/\/top-/.test(url));
  assert.deepEqual(
    worn(face),
    worn(card.face.bust.layers),
    "the Continue face is not the bust the game draws for this life",
  );
  console.log("PASS Continue shows the face the creator saved");
} finally {
  await browser.close();
}
