/* global process, document */
// A new life, the first morning, the office that takes filings (what the
// counter says and offers), then every menu on the rail: the first screenful
// of words on each, and a picture. For reading what the screens say.
// Run on a fresh bench: node scripts/play-walks/menus.mjs <out-dir>
import {
  clockOf,
  newLife,
  closeMenu,
  openMenu,
  openWalk,
  playTalk,
  pressDay,
} from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-menus");
const { page } = walk;
const words = async (selector, most) =>
  (
    await page
      .locator(selector)
      .innerText()
      .catch(() => "")
  )
    .replace(/\n+/g, " / ")
    .slice(0, most);
try {
  await newLife(walk);
  await pressDay(walk);
  await openMenu(page, "travel");
  const office = page.locator(".travel-tile[data-filing]").first();
  if (await office.count()) {
    await office.click();
    await page.waitForTimeout(900);
    walk.say(`>>> filing office: ${await words(".travel-detail", 500)}`);
    await walk.snap("office");
    await page.locator(".travel-go").first().click();
    await page.waitForTimeout(3000);
    await playTalk(walk, "counter");
    walk.say(`=== after the counter: ${await clockOf(page)}`);
  } else {
    walk.say("Travel lists no office that takes filings");
    await closeMenu(page);
  }
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll("[data-tab]")]
      .filter((button) => button.checkVisibility())
      .map((button) => button.dataset.tab),
  );
  for (const tab of tabs) {
    await openMenu(page, tab);
    walk.say(`### ${tab}: ${await words("#sheet", 900)}`);
    await walk.snap(`menu-${tab}`);
    await closeMenu(page);
    await page.waitForTimeout(400);
  }
} finally {
  await walk.close();
}
