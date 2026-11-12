/* global process, document, fetch, URL */
// The Journal as a player sees it: a new life as a 36-year-old in a seed's
// place (BENCH_SEED, BENCH_PLACE_KEY, BENCH_AGE), the opening played, dev
// mode's run-until to the day a seat the player may run for opens, a filing
// for a town or county seat (else a state legislature seat) through the
// bench's own route, ten days pressed, then the Journal opened and pictured
// at 1440x900, each screenful as it scrolls. Run on a fresh bench:
//   BENCH_SEED=<seed> BENCH_PLACE_KEY=<key> node scripts/play-walks/journal.mjs <out-dir>
import { closeMenu, newLife, openMenu, openWalk, pressDay } from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-journal");
const { page } = walk;
const age = Number(process.env.BENCH_AGE ?? 36);
await page.route("**/api/newlife*", async (route) => {
  const url = new URL(route.request().url());
  if (process.env.BENCH_SEED)
    url.searchParams.set("seed", process.env.BENCH_SEED);
  if (process.env.BENCH_PLACE_KEY)
    url.searchParams.set("placeKey", process.env.BENCH_PLACE_KEY);
  const start = await (await fetch(new URL("/api/seed", url))).json();
  const [year, month] = String(start.date).split("-").map(Number);
  url.searchParams.set(
    "person",
    JSON.stringify({
      givenName: "Jordan",
      familyName: "Avery",
      gender: "female",
      birthYear: year - age,
      birthMonth: month === 1 ? 6 : 1,
      birthDay: 15,
    }),
  );
  return route.continue({ url: url.toString() });
});
const api = (method, path, body) =>
  page.evaluate(
    async ([m, p, b]) => {
      const reply = await fetch(p, {
        method: m,
        headers: { "content-type": "application/json" },
        body: b ? JSON.stringify(b) : undefined,
      });
      return {
        status: reply.status,
        body: await reply.json().catch(() => null),
      };
    },
    [method, path, body],
  );
try {
  await newLife(walk);
  const run = await api("POST", "/api/dev/run-until", {
    event: "may-file",
    cap: 1500,
  });
  const open = run.body?.records ?? [];
  const local = open.filter(
    (id) => !/:(?:us-senate|us-house|governor|lower|upper):/.test(id),
  );
  const state = open.filter((id) => /:(?:lower|upper):/.test(id));
  let filed = null;
  for (const id of [...local, ...state]) {
    const reply = await api(
      "POST",
      `/api/file?contestId=${encodeURIComponent(id)}`,
    );
    if (reply.status === 200) {
      filed = id;
      break;
    }
  }
  walk.say(`filed: ${filed ?? "none"} (open: ${open.join(", ")})`);
  // The page reads the world again on a new day.
  for (let day = 0; day < 10; day += 1) await pressDay(walk);
  await openMenu(page, "journal");
  walk.say(
    `### journal: ${(
      await page
        .locator("#sheet")
        .innerText()
        .catch(() => "")
    ).replace(/\n+/g, " / ")}`,
  );
  await walk.snap("journal");
  // Each further screenful of the Journal, as a player scrolls it.
  for (let shot = 1; shot < 4; shot += 1) {
    const moved = await page.evaluate(() => {
      const sheet = document.querySelector("#sheet .sheet-body, #sheet");
      if (!sheet) return false;
      const before = sheet.scrollTop;
      sheet.scrollTop += sheet.clientHeight * 0.9;
      return sheet.scrollTop > before;
    });
    if (!moved) break;
    await page.waitForTimeout(400);
    await walk.snap(`journal-${shot}`);
  }
  await closeMenu(page);
} finally {
  await walk.close();
}
