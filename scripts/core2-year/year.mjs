/* global process, console */
// One measured game year in a randomly drawn place: one run, one number.
// Usage: node --import tsx scripts/core2-year/year.mjs [--days 365] [--seed S] [--no-economy] [--full-population] [--profile-day N --profile-span K]
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const moduleAt = (path) =>
  import(pathToFileURL(resolve(process.cwd(), path)).href);

const seed = value("--seed", randomBytes(20).toString("hex"));
const days = Number(value("--days", "365"));
const { drawPlace } = await moduleAt("scripts/core2-year/place.ts");
const place = drawPlace(seed, "core2-year");
const [{ createLifeCore, advanceCore }, { addDays, makeIsoDate }] =
  await Promise.all([
    moduleAt("src/core2/life.ts"),
    moduleAt("src/core2/kernel/dates.ts"),
  ]);
console.error(JSON.stringify({ drawn: place }));
const prepStarted = performance.now();
const { generatedOpening } = await moduleAt(
  "src/core2/tooling/generated-world.ts",
);
// The opening the game uses: economy with outside buyers, two-level by default.
const input = generatedOpening(place, {
  economy: !flag("--no-economy"),
  twoLevel: !flag("--full-population"),
});
const placeFacts = { name: place.name };
const prepMilliseconds = performance.now() - prepStarted;
const initStarted = performance.now();
const core = createLifeCore(input);
const initMilliseconds = performance.now() - initStarted;
let openingCash = 0;
for (const row of core.people.values()) openingCash += row.liquidMinor;
for (const row of core.organizations.values()) openingCash += row.liquidMinor;
const businesses = core.organizations?.size;
console.error(
  JSON.stringify({
    place: placeFacts.name,
    key: place.key,
    seed,
    people: input.people.length,
    countedPeople: input.residents?.households.reduce(
      (n, h) => n + h.people.length,
      0,
    ),
    flows: input.residents?.flows.length,
    contracts: input.finance?.contracts.length,
    jobs: input.jobs.length,
    organizations: businesses,
    economy: !flag("--no-economy"),
    prepSeconds: prepMilliseconds / 1000,
    initSeconds: initMilliseconds / 1000,
  }),
);
const profileDay = Number(value("--profile-day", "0"));
let session;
const start = makeIsoDate(input.startedAt);
const months = [];
let monthStarted = performance.now(),
  dayIndex = 0;
const started = performance.now();
let cursor = start;
while (dayIndex < days) {
  const next = addDays(cursor, 1);
  if (profileDay && dayIndex + 1 === profileDay) {
    const inspector = await import("node:inspector");
    session = new inspector.Session();
    session.connect();
    await new Promise((r) => session.post("Profiler.enable", r));
    await new Promise((r) => session.post("Profiler.start", r));
  }
  const dayStarted = performance.now();
  advanceCore(core, next);
  const dayMs = performance.now() - dayStarted;
  if (
    session &&
    dayIndex + 1 >= profileDay + Number(value("--profile-span", "1")) - 1
  ) {
    const profile = await new Promise((r) =>
      session.post("Profiler.stop", (e, p) => r(p.profile)),
    );
    const out = value("--profile-out", "/tmp/core2-day.cpuprofile");
    writeFileSync(out, JSON.stringify(profile));
    console.error(
      `profiled day ${profileDay} (${dayMs.toFixed(0)} ms) -> ${out}`,
    );
    session.disconnect();
    session = undefined;
  }
  dayIndex++;
  if (dayMs > 5000)
    console.error(`slow day ${next}: ${(dayMs / 1000).toFixed(1)} s`);
  if (next.slice(5, 7) !== cursor.slice(5, 7) || dayIndex === days) {
    const ms = performance.now() - monthStarted;
    months.push({ through: cursor, seconds: +(ms / 1000).toFixed(2) });
    console.error(
      `${cursor} ${(ms / 1000).toFixed(1)} s, last day ${dayMs.toFixed(0)} ms, heap ${(process.memoryUsage().heapUsed / 1e6).toFixed(0)} MB`,
    );
    monthStarted = performance.now();
  }
  cursor = next;
}
const seconds = (performance.now() - started) / 1000;
const cashNow = () => {
  let total = 0;
  for (const row of core.people.values()) total += row.liquidMinor;
  for (const row of core.organizations.values()) total += row.liquidMinor;
  return total;
};
let outsideNet = 0;
for (const row of core.cashJournal.externalFlowsByOwner.values())
  outsideNet += row.netMinor;
const books = [...core.finance.businesses.values()];
const money = {
  openingCashMinor: openingCash,
  closingCashMinor: cashNow(),
  outsideNetMinor: outsideNet,
  balances: openingCash - outsideNet === cashNow(),
  journalEntries: core.cashJournal.nextSequence,
  businesses: books.length,
  closed: books.filter((b) => b.closedAt).length,
  salesMinor: books.reduce((n, b) => n + b.salesReceivedMinor, 0),
  wagesPaidMinor: books.reduce((n, b) => n + b.wagesPaidMinor, 0),
  wagesUnpaidMinor: books.reduce((n, b) => n + b.wagesUnpaidMinor, 0),
};
console.error(JSON.stringify(money));
const closed = [...(core.organizations?.values() ?? [])].filter(
  (o) => o.closedAt || o.status === "closed",
).length;
console.log(
  JSON.stringify({
    place: placeFacts.name,
    key: place.key,
    seed,
    days,
    seconds: +seconds.toFixed(1),
    daysPerMinute: +((days / seconds) * 60).toFixed(2),
    closedOrganizations: closed,
    months,
  }),
);
