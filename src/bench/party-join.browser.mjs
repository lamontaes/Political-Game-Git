/* global process, console */
// Joining a party (play-join-a-party-has-no-scene-and-no-headquarters), on the
// bench (npm run bench): a new life in a drawn place; Politics, Parties shows
// Join buttons and no registration (the opening leaves the party to the
// player); Join; Parties then shows the membership with its day; Travel lists
// the party's office, and its detail says why ("Your party's office"). Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/party-join.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : null;
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  const openParties = async () => {
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Parties", exact: true })
      .click();
  };
  await openParties();
  const join = page.getByRole("button", { name: /^Join / }).first();
  await join.waitFor();
  assert.equal(
    await page.locator("[data-tie-id]").count(),
    0,
    "not registered by the opening",
  );
  await shot("parties-before");
  const party = (await join.innerText()).replace(/^Join /, "").trim();
  await join.click();
  await page.locator("[data-tie-id]").waitFor();
  const registered = await page.locator("[data-tie-id]").innerText();
  console.log("Parties after joining:", registered.replace(/\s+/g, " "));
  await shot("parties-after");
  await page.keyboard.press("Escape");
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  const tile = page.locator(".travel-tile", { hasText: party });
  await tile.first().waitFor();
  await tile.first().click();
  await page.getByText("Your party's office").first().waitFor();
  await shot("travel-office");
  console.log(`Travel lists ${party}'s office as your party's office`);
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS joining a party");
} finally {
  await browser.close();
}
