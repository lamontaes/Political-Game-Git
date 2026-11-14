/* global process, document, fetch, URL */
// A life played the way a player plays it, for about six months, then its
// whole Journal: a 30-year-old in a drawn place, the opening, three weeks of
// days with a talk with someone at home three days a week, dev mode's run to
// the day a seat opens, a filing, ten days of doors, days pressed through
// election day, and the Journal read from the screen and from /api/journal.
//   node scripts/play-walks/journal-six-months.mjs <out-dir>
import {
  closeMenu,
  newLife,
  openMenu,
  openWalk,
  pressDay,
  playTalk,
  clockOf,
} from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-six-months");
const { page } = walk;
const age = Number(process.env.BENCH_AGE ?? 30);
await page.route("**/api/newlife*", async (route) => {
  const url = new URL(route.request().url());
  if (process.env.BENCH_SEED)
    url.searchParams.set("seed", process.env.BENCH_SEED);
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
  const life = await newLife(walk);
  walk.say(`start date ${await today()}`);
  // Three weeks of ordinary days: a talk three days a week.
  for (let day = 0; day < 21; day += 1) {
    if (day % 7 < 3) await talkHere();
    await pressDay(walk);
  }
  walk.say(`after three weeks: ${await today()}`);
  const meeting = await api("GET", "/api/meeting");
  walk.say(`meeting view: ${JSON.stringify(meeting.body)?.slice(0, 300)}`);
  const run = await api("POST", "/api/dev/run-until", {
    event: "may-file",
    cap: 1500,
  });
  const open = run.body?.records ?? [];
  walk.say(`open to file: ${open.join(", ")} (date ${await today()})`);
  const local = open.filter(
    (id) => !/:(?:us-senate|us-house|governor|lower|upper):/.test(id),
  );
  const state = open.filter((id) => /:(?:lower|upper):/.test(id));
  let filing = null,
    contest = null;
  for (const id of [...local, ...state]) {
    const reply = await api(
      "POST",
      `/api/file?contestId=${encodeURIComponent(id)}`,
    );
    if (reply.status === 200) {
      filing = reply.body?.filing;
      contest = id;
      break;
    }
  }
  walk.say(
    `filed: ${contest ?? "none"} status ${filing?.status} id ${filing?.id}`,
  );
  const calendar = (await api("GET", "/api/calendar")).body;
  const electionDate = String(contest ?? "")
    .split(":")
    .pop();
  walk.say(`election date from the record id: ${electionDate}`);
  // Ten days of doors.
  for (let day = 0; day < 10 && filing?.id; day += 1) {
    const door = await api(
      "POST",
      `/api/campaign/day?filingId=${encodeURIComponent(filing.id)}&kind=canvass`,
    );
    walk.say(
      `doors day ${day + 1} [${await clockOf(page)}]: ${JSON.stringify(door.body)?.slice(0, 220)}`,
    );
    await pressDay(walk);
  }
  // Press days until the day after the election, or 200 days.
  for (let day = 0; day < 200; day += 1) {
    const now = await today();
    if (electionDate && now > electionDate) break;
    if (day % 4 === 0) await talkHere();
    await pressDay(walk);
  }
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
