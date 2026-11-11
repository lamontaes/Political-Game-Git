/* global process, document, URL */
// The Advanced start: a new world, step in as a member of a local body, then
// play days. Writes down every scene, talk, meeting and desk decision that
// reaches the player, and what Your office and the Bills tab say on the way.
// Run on a fresh bench: node scripts/play-walks/official.mjs <out-dir> [days]
import {
  clockOf,
  closeMenu,
  openMenu,
  openWalk,
  playTalk,
  toastsOf,
} from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-official");
const days = Number(process.argv[3] ?? 10);
const { page } = walk;
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shown = (id) =>
  page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);
const words = async (selector, most) =>
  (
    await page
      .locator(selector)
      .innerText()
      .catch(() => "")
  )
    .replace(/\n+/g, " / ")
    .slice(0, most);
// The panels a scene takes the stage with, besides the talk box.
const PANELS = ["meeting", "desk", "election-day", "returns", "ballot"];
try {
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.goto(`${base}/play`);
  await title;
  await page.locator("#new-life").click();
  const built = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-advanced").click();
  await page.locator("#front-advanced:not([hidden])").waitFor();
  await page.locator("#advanced-build").click();
  const seed = new URL((await built).url()).searchParams.get("seed");
  await page.locator("#front-pick:not([hidden])").waitFor();
  const names = await page.locator("#pick-list button").allInnerTexts();
  const at = names.findIndex((name) =>
    /council|alder|select|commission|supervisor|trustee|mayor/i.test(name),
  );
  walk.say(
    `seed ${seed}; ${names.length} to step in as; first: ${names
      .slice(0, 6)
      .map((n) => n.replace(/\n+/g, " "))
      .join(" | ")}`,
  );
  if (at < 0) throw new Error("nobody in a local body to step in as");
  walk.say(`>>> steps in as: ${names[at].replace(/\n+/g, " ")}`);
  await page.locator("#pick-list button").nth(at).click();
  await page.locator("#pick-play").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name")?.textContent.trim(),
  );
  walk.say(`card: ${await words("#card", 200)}`);
  await playTalk(walk, "opening", { picture: false });
  for (let day = 1; day <= days; day += 1) {
    walk.say(`=== Day ${day} pressed at [${await clockOf(page)}]`);
    if (!(await page.locator("#day").isVisible())) {
      // Something covers the clock: write down what is on screen and stop.
      await walk.snap(`day-${day}-covered`);
      const open = await page.evaluate(() =>
        [...document.querySelectorAll("body > *, #stage > *")]
          .filter((node) => node.id && node.offsetParent !== null)
          .map((node) => `${node.id}.${node.className}`.slice(0, 60)),
      );
      walk.say(
        `!!! Day is covered on day ${day}; on screen: ${open.join(" | ")}`,
      );
      walk.say(
        `    words: ${(await page.locator("body").innerText()).replace(/\n+/g, " / ").slice(0, 900)}`,
      );
      break;
    }
    await page.locator("#day").click();
    for (let step = 0; step < 500; step += 1) {
      await page.waitForTimeout(600);
      if (await shown("talk")) {
        await playTalk(walk, "scene");
        continue;
      }
      const panel = (
        await Promise.all(PANELS.map(async (id) => [id, await shown(id)]))
      ).find(([, on]) => on)?.[0];
      if (panel) {
        walk.say(
          `--- [${await clockOf(page)}] ${panel}: ${await words(`#${panel}`, 700)}`,
        );
        await walk.snap(panel);
        const button = page.locator(`#${panel} button:not([disabled])`).first();
        if (await button.count()) {
          walk.say(
            `    presses: ${(await button.innerText()).replace(/\n+/g, " ")}`,
          );
          await button.click().catch(() => {});
        } else break;
        continue;
      }
      if (await shown("continue")) {
        walk.say(`    (a stop at [${await clockOf(page)}]: Continue)`);
        await page.locator("#continue").click();
        continue;
      }
      if (!(await page.locator("#day").isDisabled())) break;
    }
    const toasts = await toastsOf(page);
    if (toasts.journal) walk.say(`    JOURNAL NOTE: ${toasts.journal}`);
    if (toasts.news) walk.say(`    NEWS: ${toasts.news}`);
    if (day === 1 || day === days) {
      await openMenu(page, "politics");
      walk.say(`### politics, day ${day}: ${await words("#sheet", 600)}`);
      await walk.snap(`politics-day-${day}`);
      await closeMenu(page);
      await page.waitForTimeout(400);
    }
  }
} finally {
  await walk.close();
}
