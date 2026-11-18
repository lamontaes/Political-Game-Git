/* global process, console, document */
// A speech heard on television gets a television graphic (owner, Nov 17: "A
// broadcast speech gets a TV graphic"): the speaker's bust on a set, Live over it
// and the station under their name. Plays a new life in a drawn place with Dev
// mode on, asks the Scenes panel for an address, then plays days until a mayor's
// or governor's address is heard on a station and the set is on screen.
// Run against a fresh bench: node src/bench/scene-frame-tv.browser.mjs [shot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(900000);
  const life = await startLife(page, { fresh: true });
  console.log(`Seed ${life.seed}, ${life.placeName}`);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  await page.locator("#sheet-close").click();
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".dev-scene").waitFor();
  await page.locator('.dev-scene [data-scene="address"]').click();
  await page.locator('[data-testid="dev-scene"]').click();
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="dev-scene"]').disabled,
  );
  await page.locator("#sheet-close").click();
  let seen = false;
  for (let step = 0; step < 60 && !seen; step += 1) {
    if (await page.locator("#talk").isVisible()) {
      if (await page.locator("#tv").isVisible()) {
        seen = true;
        break;
      }
      const next = page.locator("#talk-next:visible");
      if (await next.count()) await next.click();
      else await page.locator("#talk-leave:visible").click();
      await page.waitForTimeout(800);
    } else {
      await page.locator("#day").click();
      await page.waitForTimeout(1500);
    }
  }
  assert.ok(seen, "no speech was heard on television in sixty steps");
  const set = await page.locator("#tv").innerText();
  console.log(`Set: ${set.replace(/\n+/g, " / ")}`);
  assert.match(set, /LIVE/i, "the set does not say Live");
  assert.ok(
    await page.locator("#tv .bust-stack").count(),
    "the set shows no speaker",
  );
  if (shots) await page.screenshot({ path: `${shots}/scene-frame-tv.png` });
  console.log("scene-frame-tv: ok");
} finally {
  await browser.close();
}
