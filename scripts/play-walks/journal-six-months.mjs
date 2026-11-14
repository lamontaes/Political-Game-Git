/* global process, fetch, URL */
// A life played the way a player plays it for six months, day by day, then
// its whole Journal: a 30-year-old in a drawn place (BENCH_SEED and
// BENCH_PLACE_KEY replay one), a talk with someone at home three days a week,
// the filing for the first local race at the clerk's counter on day three, ten
// days of doors, a meeting whenever the player holds one, Day pressed through
// election day to 181 days, and the Journal read from the screen and from
// /api/journal. No dev-mode skips.
//   node scripts/play-walks/journal-six-months.mjs <out-dir>
import {
  closeMenu,
  newLife,
  openMenu,
  openWalk,
  pressDay,
  playTalk,
} from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-six-months");
const { page } = walk;
const age = Number(process.env.BENCH_AGE ?? 30);
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
const talkHere = async () => {
  const who = page.locator("#here .busts-person.talkable").first();
  if (!(await who.count())) return walk.say("(nobody here to talk to)");
  walk.say(`>>> clicks ${(await who.getAttribute("aria-label")) ?? ""}`);
  await who.click();
  await page.waitForTimeout(800);
  await playTalk(walk, "talk", { picture: false });
};
const today = async () => (await api("GET", "/api/dev/state")).body?.date;
try {
  await newLife(walk);
  walk.say(`start date ${await today()}`);
  const start = await today();
  const stop = new Date(Date.parse(start) + 181 * 86400000)
    .toISOString()
    .slice(0, 10);
  walk.say(`start ${start}; stops at ${stop} (six months)`);
  // Day one to three: ordinary days, then the filing at the clerk's counter.
  let filing = null;
  let contestId = null;
  let doors = 0;
  let meetings = 0;
  for (let day = 0; day < 181; day += 1) {
    const now = await today();
    if (now >= stop) break;
    if (day % 7 < 3) await talkHere();
    if (day === 3 && !contestId) {
      const gov = (await api("GET", "/api/government")).body;
      const contests = (gov?.contests ?? [])
        .map((row) => row.contest)
        .filter(
          (c) => !/:(?:us-senate|us-house|governor|lower|upper):/.test(c.id),
        )
        .sort((a, b) => a.electionDate.localeCompare(b.electionDate));
      for (const contest of contests) {
        const reply = await api(
          "POST",
          `/api/file?contestId=${encodeURIComponent(contest.id)}`,
        );
        if (reply.status === 200 && reply.body?.filing) {
          filing = reply.body.filing;
          contestId = contest.id;
          walk.say(
            `filed ${contest.id} (election ${contest.electionDate}) status ${filing.status}`,
          );
          break;
        }
      }
      if (!contestId) walk.say("no local race could be filed for");
    }
    // Ten days of doors once filed.
    if (filing?.id && doors < 10) {
      const door = await api(
        "POST",
        `/api/campaign/day?filingId=${encodeURIComponent(filing.id)}&kind=canvass`,
      );
      doors += 1;
      walk.say(
        `doors ${doors} on ${now}: ${JSON.stringify(door.body)?.slice(0, 160)}`,
      );
    }
    // A meeting, if the player holds a seat that has one today.
    const meeting = await api("GET", "/api/meeting");
    if (meeting.body) {
      meetings += 1;
      walk.say(
        `MEETING on ${now}: ${JSON.stringify(meeting.body).slice(0, 300)}`,
      );
    }
    await pressDay(walk);
  }
  walk.say(`doors ${doors}, meetings seen ${meetings}`);
  walk.say(`ended on ${await today()}`);
  const progress = await api("GET", "/api/results");
  walk.say(`results: ${JSON.stringify(progress.body)?.slice(0, 400)}`);
  const id = (await api("GET", "/api/dev/state")).body?.playerId;
  const chapters = (await api("GET", `/api/journal?id=${id}`)).body ?? [];
  walk.say("### JOURNAL (API)");
  for (const c of chapters) {
    walk.say(`** ${c.title}`);
    for (const l of c.lines) walk.say(`[${l.date}] ${l.text}`);
  }
  await openMenu(page, "journal");
  walk.say(
    `### JOURNAL (screen): ${(
      await page
        .locator("#sheet")
        .innerText()
        .catch(() => "")
    ).replace(/\n+/g, " / ")}`,
  );
  await walk.snap("journal");
  await closeMenu(page);
} finally {
  await walk.close();
}
