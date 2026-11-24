/* global document, process */
// The cards of the people closest to the player, opened the way a player
// opens them on the first evening: "Who I am", then each name under the
// people they're closest to. Pictures each card and writes down every line
// on it, for a before and after of a person's story (the words bar).
// Usage: node scripts/play-walks/cards.mjs <out-dir> [people]
import { newLife, openWalk } from "./lib.mjs";

const [out = "walk-cards", most = "4"] = process.argv.slice(2);
const walk = await openWalk(out);
const { page } = walk;
await newLife(walk);

/** Opens "Who I am" by its rail tab (a toast can cover the tab, so it is clicked in the page). */
const openWho = async () => {
  await page.evaluate(() =>
    document.querySelector('#rings [data-tab="who"]')?.click(),
  );
  await page.waitForTimeout(1500);
};
const names = ".hispeople .nm.pick";
await openWho();
await walk.snap("who-i-am");
walk.say("== Who I am");
for (const line of (await page.locator("#sheet").innerText()).split("\n"))
  if (line.trim()) walk.say(`  ${line}`);
const people = await page.locator(names).allInnerTexts();
for (const [at, name] of people.slice(0, Number(most)).entries()) {
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
  await page.waitForTimeout(1000);
  await walk.snap(name.replace(/\W+/g, "-"));
  walk.say(`== ${name}`);
  for (const line of (await page.locator("#person").innerText()).split("\n"))
    if (line.trim()) walk.say(`  ${line}`);
  await page.locator("#person-close").click();
  await page.locator("#person").waitFor({ state: "hidden" });
}
await walk.close();
