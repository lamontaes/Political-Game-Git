/* global process, fetch, URL */
// A new life, then the work a player meets: the Jobs and study screen, the
// People screen, and each person at home with their job and employer as
// their card says it, and the workplaces Travel lists. For reading what kinds of work a town shows.
// Run on a fresh bench: node scripts/play-walks/jobs.mjs <out-dir>
import { closeMenu, newLife, openMenu, openWalk } from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-jobs");
const { page } = walk;
// The player is the person the page first asks the card of.
let playerId = "";
page.on("request", (request) => {
  const url = new URL(request.url());
  if (!playerId && url.pathname === "/api/card")
    playerId = url.searchParams.get("id") ?? "";
});
try {
  await newLife(walk);
  const cards = await page
    .evaluate(async (playerId) => {
      const card = (id) =>
        fetch(`/api/card?id=${encodeURIComponent(id)}`).then((r) => r.json());
      const me = await card(playerId);
      const ids = [
        me.personId ?? me.id,
        ...(me.home?.members ?? []).map((m) => m.personId),
        ...(me.ties ?? []).map((t) => t.personId),
      ].filter((id, at, all) => id && all.indexOf(id) === at);
      const out = [];
      for (const id of ids) {
        const c = await card(id);
        const work = c.job ?? c.work;
        out.push(
          `${c.name}: ${work ? `${work.title}${work.employer ? ` at ${work.employer}` : ""}` : "no job"}`,
        );
      }
      return out;
    }, playerId)
    .catch((error) => [`cards unavailable: ${error.message}`]);
  for (const line of cards) walk.say(`WORK ${line}`);
  // Jobs and study is the second tab of the player's own sheet.
  await openMenu(page, "who");
  await page.locator("#sheet-tabs button").nth(1).click();
  await page.waitForTimeout(1200);
  await walk.snap("jobs-and-study");
  await closeMenu(page);
  // Travel lists the town's workplaces by name.
  await openMenu(page, "travel");
  walk.say(
    `TRAVEL ${(
      await page
        .locator("#sheet")
        .innerText()
        .catch(() => "")
    ).replace(/\n+/g, " / ")}`,
  );
  await walk.snap("travel");
  await closeMenu(page);
  await openMenu(page, "people");
  await walk.snap("people");
  await closeMenu(page);
} finally {
  await walk.close();
}
