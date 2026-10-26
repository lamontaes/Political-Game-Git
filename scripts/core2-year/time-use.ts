/**
 * Time use in a generated town against the American Time Use Survey (M7-03
 * calibration targets). Counts each full person's acts by action and month
 * and reports the share of person-days with each kind of activity.
 * Usage: node --import tsx scripts/core2-year/time-use.ts [seed] [through]
 * (through defaults to ninety days after the world begins)
 */
import { drawPlace } from "./place";
import { parameter } from "../../src/core2/parameters";
import { generatedOpening } from "../../src/core2/tooling/generated-world";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { peopleData, peopleModules } from "../../src/director/play-modules";
import {
  addDays,
  daysBetween,
  makeIsoDate,
} from "../../src/core2/kernel/dates";

const seed = process.argv[2] ?? "time-use-a";
const place = drawPlace(seed, "time-use");
// The people engines a played world installs (health, drives, views, news...).
const core = createLifeCore(generatedOpening(place, { twoLevel: true }), {
  data: peopleData(),
  modules: peopleModules(),
});
const start = makeIsoDate(core.date);
// Ninety days from the world's own first day unless a date is given.
const through = process.argv[3] ?? addDays(start, 90);
const t = performance.now();
advanceCore(core, through);
const days = daysBetween(start, makeIsoDate(through));
const actions = new Map(core.data.actions.map((row) => [row.id, row]));
const adults = [...core.people.values()].filter(
  (row) =>
    row.alive &&
    Number(start.slice(0, 4)) - Number(row.birthDate.slice(0, 4)) >= 15,
);
const ids = new Set(adults.map((row) => row.id));
const byAction = new Map<string, number>();
for (const counter of core.actCounters.values()) {
  if (!ids.has(counter.actorId)) continue;
  byAction.set(
    counter.actionId,
    (byAction.get(counter.actionId) ?? 0) + counter.count,
  );
}
const personDays = adults.length * days;
console.log(
  `${place.name}, ${place.state} (seed ${seed}): ${adults.length} full people 15+, ${days} days, ran ${((performance.now() - t) / 1000).toFixed(1)} s`,
);
console.log("acts per 100 person-days by action (kinds):");
for (const [id, count] of [...byAction].sort((a, b) => b[1] - a[1]))
  console.log(
    `  ${((100 * count) / personDays).toFixed(1).padStart(6)}  ${id}  [${actions.get(id)?.actKinds.join(", ") ?? "?"}]`,
  );
const employed = new Set(
  adults.filter((row) => row.jobId).map((row) => row.id),
);
let worked = 0;
for (const counter of core.actCounters.values())
  if (
    employed.has(counter.actorId) &&
    counter.actionId === "attend-scheduled-work-date-segment"
  )
    worked += counter.count;
const share = (n: number, base = personDays) =>
  `${((100 * n) / base).toFixed(1)}%`;
const matching = (pattern: RegExp) =>
  [...byAction]
    .filter(([key]) => pattern.test(key))
    .reduce((n, [, count]) => n + count, 0);
// ATUS 2025 Table 1 and employed-persons tables
// (docs/research/core-parameter-sources-2026-10-12.md).
const weekly = (5 * 81 + 2 * 30) / 7;
console.log(
  "\nAgainst the American Time Use Survey 2025 (share of person-days):",
);
console.log(
  `  work, employed adults: ${share(worked, employed.size * days)}; ATUS ${weekly.toFixed(1)}% (81% of weekdays, 30% of weekend days)`,
);
console.log(
  `  socializing (contact-known-person): ${share(matching(/^contact-known-person$/))}; ATUS 30.4%`,
);
console.log(
  `  caring for household members: ${share(matching(/care/))}; ATUS 22.0%`,
);
console.log(
  `  civic (join, organize, approach): ${share(matching(/join|organiz|approach|civic/))}; ATUS 13.6% organizational, civic and religious (5.3% volunteering)`,
);
// Rest is the "recover" effect; one rest act takes the leisure total
// (restDayHours, ATUS Table 3 leisure and sports 5.16 h a day) today,
// so this line holds the leisure share still while that length is lowered.
const restHours = parameter("restDayHours");
const restActs = [...byAction]
  .filter(([key]) =>
    core.data.actions.some((row) => row.id === key && row.effect === "recover"),
  )
  .reduce((n, [, count]) => n + count, 0);
console.log(
  `  leisure hours a day (rest acts x ${restHours} h each): ${((restActs * restHours) / personDays).toFixed(2)} h; ATUS 5.16 h (leisure and sports, 15 and over)`,
);
console.log(
  "  Acts per person-day: a person can act more than once a day, so each is an upper bound on the share of days.",
);
