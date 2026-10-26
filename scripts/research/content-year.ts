/**
 * The content engine's sourced and estimated rows against a played year
 * (pool item research-content-sourced-parameters).
 *
 * First it checks that lookupHours is the ATUS 2025 Table A-1 Government
 * services duration for the people who did it, with the spread of every
 * published year, as recorded in the research file; it stops with exit code 1
 * when they differ. Then it plays one year in a place drawn from all 56 and
 * reports, for each tier that acts, the acts per 100 person-days of people 15
 * and over beside the ATUS share of people doing that activity on a day. A
 * person may act more than once on a day and a weekly or monthly tier acts
 * once per activation, so a count is a bound, not a measured share.
 *
 * Usage: node --import tsx scripts/research/content-year.ts [seed] [--check]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import {
  addDays,
  daysBetween,
  makeIsoDate,
} from "../../src/core2/kernel/dates";

type Cell = number | "approximately zero" | "suppressed";
interface Row {
  id: string;
  activity: string;
  years: Record<
    string,
    { percentEngaged: Cell; hoursPerDayEngaged: Cell; hoursPerDay: Cell }
  >;
}
const research = JSON.parse(
  readFileSync("data/research/core/bls-atus-table-a1-2025.json", "utf8"),
) as { rows: Row[] };
const parameters = JSON.parse(
  readFileSync("src/core2/data/parameters.json", "utf8"),
) as Record<
  string,
  { value: number; tag: string; spread?: { low?: number; high?: number } }
>;
const row = (id: string) => {
  const found = research.rows.find((r) => r.id === id);
  if (!found) throw new Error(`research row ${id} is missing`);
  return found;
};
const numbers = (r: Row, field: "percentEngaged" | "hoursPerDayEngaged") =>
  Object.values(r.years)
    .map((cell) => cell[field])
    .filter((cell): cell is number => typeof cell === "number");
const band = (r: Row, field: "percentEngaged" | "hoursPerDayEngaged") => {
  const values = numbers(r, field);
  return { low: Math.min(...values), high: Math.max(...values) };
};

// The parameter row must be what the research file says.
const government = row("government-services");
const lookup = parameters.lookupHours;
const expected = government.years["2025"].hoursPerDayEngaged;
const spread = band(government, "hoursPerDayEngaged");
const problems: string[] = [];
if (lookup.value !== expected)
  problems.push(`lookupHours ${lookup.value}, research ${String(expected)}`);
if (lookup.spread?.low !== spread.low || lookup.spread?.high !== spread.high)
  problems.push(
    `lookupHours spread ${lookup.spread?.low} to ${lookup.spread?.high}, research ${spread.low} to ${spread.high}`,
  );
if (problems.length) {
  console.error(
    `Parameter rows differ from the research file:\n${problems.join("\n")}`,
  );
  process.exit(1);
}
console.log(
  `lookupHours ${lookup.value} (${lookup.tag}) matches ATUS 2025 Government services; spread ${spread.low} to ${spread.high} h.`,
);
if (process.argv.includes("--check")) process.exit(0);

setBookkeeping(false);
const seed =
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const start = makeIsoDate(core.date);
const childYears = parameters.householdChildAgeYears.value;
const ageOn = (birthDate: string) =>
  daysBetween(makeIsoDate(birthDate), start) / parameters.daysPerMeanYear.value;
// Everyone 15 and over on day one who acts (not an inactive husk), by tier.
const adults = [...core.people.values()].filter(
  (p) => p.alive && p.tier !== "husk" && ageOn(p.birthDate) >= 15,
);
const tierOf = new Map(adults.map((p) => [p.id, p.tier]));
// A care act is for someone at home, so count, per household, the full people
// living there on day one and whether one is a child under ATUS's
// household-child age. A care act by someone who lives with another full
// person and no child can only be for a grown relative. (In a two-level world
// a filled-in person's household is mostly counted, so they are left out.)
const members = new Map<string, number>();
const childHouseholds = new Set<string>();
for (const p of core.people.values()) {
  if (!p.alive) continue;
  members.set(p.householdId, (members.get(p.householdId) ?? 0) + 1);
  if (ageOn(p.birthDate) < childYears) childHouseholds.add(p.householdId);
}
const noChild = new Set(
  adults
    .filter(
      (p) =>
        (members.get(p.householdId) ?? 0) > 1 &&
        !childHouseholds.has(p.householdId),
    )
    .map((p) => p.id),
);
console.log(
  `${world.place.displayName}, seed ${seed}: ${adults.length} people 15 and over who can act (${noChild.size} living with another full person and no child), from ${start}`,
);

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(start, 365);
const t = performance.now();
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));
const days = daysBetween(start, makeIsoDate(core.date));
console.log(
  `Played ${days} days in ${((performance.now() - t) / 1000).toFixed(0)} s.`,
);

interface Tally {
  count: number;
  keys: string[];
}
const tallies = new Map<string, Tally>();
const add = (name: string, key: string, count: number) => {
  const tally = tallies.get(name) ?? { count: 0, keys: [] };
  tally.count += count;
  if (tally.keys.length < 3) tally.keys.push(key);
  tallies.set(name, tally);
};
const civic = new Set([
  "join-association",
  "organize-meeting",
  "approach-office",
]);
for (const [key, counter] of core.actCounters) {
  const tier = tierOf.get(counter.actorId);
  if (!tier) continue;
  if (counter.actionId === "care-for-relative") {
    add(`care:${tier}`, key, counter.count);
    if (noChild.has(counter.actorId))
      add(`care-adult:${tier}`, key, counter.count);
  }
  if (counter.actionId === "look-up-local-institution")
    add(`lookup:${tier}`, key, counter.count);
  if (civic.has(counter.actionId)) add(`civic:${tier}`, key, counter.count);
}

const tiers = [...new Set(tierOf.values())].sort();
// Day-one tiers: the core updates a person's record in place over the year.
const people = (tier: string, only?: Set<string>) =>
  [...tierOf].filter(([id, at]) => at === tier && (!only || only.has(id)))
    .length;
const lines: [string, string, Row, Set<string> | undefined][] = [
  ["care", "care-for-relative acts", row("care-household-members"), undefined],
  [
    "care-adult",
    "care-for-relative acts by people living with another adult and no child",
    row("care-household-adults"),
    noChild,
  ],
  ["lookup", "look-up-local-institution acts", government, undefined],
  ["civic", "join, organize and approach acts", row("volunteering"), undefined],
];
for (const [name, label, source, only] of lines) {
  const atus = band(source, "percentEngaged");
  console.log(
    `\n${label}: ATUS ${source.activity}, ${atus.low} to ${atus.high} percent of people a day (2018 to 2025)`,
  );
  for (const tier of tiers) {
    const base = people(tier, only) * days;
    const tally = tallies.get(`${name}:${tier}`);
    // The calendar tier acts only on the core's calendar dates and the
    // monthly tier once a month; a tier with no act of a kind is named once.
    if (!tally) {
      console.log(`  ${tier}: none (${base} person-days)`);
      continue;
    }
    const rate = base ? (100 * tally.count) / base : 0;
    console.log(
      `  ${tier}: ${tally.count} acts over ${base} person-days = ${rate.toFixed(2)} per 100 person-days${tally.keys.length ? `; records ${tally.keys.join(", ")}` : ""}`,
    );
  }
}
const lookups = tiers.reduce(
  (n, tier) => n + (tallies.get(`lookup:${tier}`)?.count ?? 0),
  0,
);
console.log(
  `\nLook-up time: ${lookups} acts x ${lookup.value} h = ${(lookups * lookup.value).toFixed(1)} h in the year.`,
);
