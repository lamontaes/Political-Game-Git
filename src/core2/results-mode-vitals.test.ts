/**
 * The fast clock, part 2: people are born, fall ill and die in skipped time at
 * the pace they do day by day. The same drawn world runs one year day by day
 * and, built again, one year in results mode; the printed line gives deaths,
 * births and people at year end for both, and the skipped year's figures must
 * be within a fifth of the day-by-day year's. A third build skips the year
 * with the oldest member of the player's household seriously ill from the
 * first skipped month (the engine's own `beginSeriousIllness`), and their
 * death must leave a record with a cause and a date inside the year.
 *
 * People are counted as the counted households' weighted members plus the
 * full people alive outside the inactive tier; deaths and births as the full
 * people's (the health engine's deaths, the renewal engine's births table)
 * plus the counted population's (the renewal engine's carry rows).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { isDemoted } from "./counted-groups";
import { DEATH_CAUSE_FACT_KEY } from "./death-cause";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  beginSeriousIllness,
  DEFAULT_HEALTH_DATA,
  healthReport,
} from "./modules/health";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState, PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "results-mode-vitals");
const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
const YEAR_DAYS = 365;
/** How far the skipped year's figures may stand from the day-by-day year's. */
const WITHIN = 0.2;
const INACTIVE_TIER = "husk";

const build = () => {
  setBookkeeping(false);
  return buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
};

function vitals(core: CoreState) {
  const store = coreAPI(core).moduleState(RENEWAL_MODULE_ID);
  const carry = store.table("countedCarry").rows() as unknown as {
    born?: number;
    died?: number;
  }[];
  const countedBorn = carry.reduce((n, row) => n + (row.born ?? 0), 0);
  const countedDied = carry.reduce((n, row) => n + (row.died ?? 0), 0);
  const fullBorn = store.table("births").rows().length;
  const fullDied = healthReport(core).deaths ?? 0;
  let counted = 0;
  const counts = residentsRuntime(core)?.store;
  if (counts)
    for (const household of counts.liveHouseholds())
      counted += counts.weightedCount(household);
  let full = 0;
  for (const person of core.people.values())
    if (person.alive && person.tier !== INACTIVE_TIER && !isDemoted(person))
      full += 1;
  return {
    deaths: fullDied + countedDied,
    births: fullBorn + countedBorn,
    people: counted + full,
    fullDied,
    countedDied,
    fullBorn,
    countedBorn,
  };
}

const shown = (v: ReturnType<typeof vitals>) =>
  `deaths ${v.deaths.toFixed(1)} (full ${v.fullDied}, counted ${v.countedDied.toFixed(1)}), births ${v.births.toFixed(1)} (full ${v.fullBorn}, counted ${v.countedBorn.toFixed(1)}), people at year end ${v.people.toFixed(0)}`;

it(`a skipped year is born, falls ill and dies at the day-by-day pace, in ${where}`, () => {
  const daily = build().core;
  const start = makeIsoDate(daily.date);
  const yearEnd = addDays(start, YEAR_DAYS);
  advanceCore(daily, yearEnd);
  const byDay = vitals(daily);

  const skipped = build().core;
  advanceCore(skipped, yearEnd, { results: true });
  const bySkip = vitals(skipped);

  // Every death in the skipped year is the health engine's record: a death
  // event, a cause and a date inside the year.
  const deaths = healthReport(skipped).cases.filter((row) => row.deathEventId);
  const undated = deaths.filter(
    (row) =>
      !row.deathDate ||
      row.deathDate <= start ||
      row.deathDate > yearEnd ||
      !healthReport(skipped).causeOfDeath.get(row.personId),
  );

  // The player's household: its oldest member falls seriously ill in the
  // first skipped month, and the skip runs on to the year's end.
  const staged = build();
  let firstMonth = addDays(start, 1);
  while (!firstMonth.endsWith("-01")) firstMonth = addDays(firstMonth, 1);
  advanceCore(staged.core, firstMonth, { results: true });
  const player = staged.core.people.get(staged.playerId as PersonId);
  const household = player
    ? staged.core.households.get(player.householdId)
    : undefined;
  const oldest = [...(household?.memberIds ?? [])]
    .map((id) => staged.core.people.get(id))
    .filter((person) => person?.alive)
    .sort((a, b) => a!.birthDate.localeCompare(b!.birthDate))[0];
  const fell = oldest
    ? beginSeriousIllness(coreAPI(staged.core), oldest.id)
    : false;
  advanceCore(staged.core, yearEnd, { results: true });
  const record = oldest
    ? [...staged.core.durableLog.values()].find(
        (row) =>
          row.kind === DEFAULT_HEALTH_DATA.deathEventKind &&
          row.personIds.includes(oldest.id),
      )
    : undefined;
  const cause = record?.facts?.[`event:${record.id}:${DEATH_CAUSE_FACT_KEY}`];

  process.stdout.write(
    `vitals in ${where}: one year day by day: ${shown(byDay)}; the same year skipped: ${shown(bySkip)}; ${deaths.length} full deaths recorded in the skipped year, ${undated.length} without a cause or a date inside it; the player's household's ${oldest?.id ?? "nobody"} fell ill ${fell ? firstMonth : "never"} and died ${record ? `${record.date} of ${String(cause)} (${record.id})` : "with no record"}\n`,
  );

  for (const key of ["deaths", "births", "people"] as const)
    expect(
      Math.abs(bySkip[key] - byDay[key]),
      `the skipped year's ${key} (${bySkip[key].toFixed(1)}) stand within a fifth of the day-by-day year's (${byDay[key].toFixed(1)}), in ${where}`,
    ).toBeLessThanOrEqual(byDay[key] * WITHIN);
  expect(
    deaths.length,
    `the skipped year's full deaths are the engine's records, in ${where}`,
  ).toBe(bySkip.fullDied);
  expect(
    undated.map((row) => row.personId),
    `every death in the skipped year has a cause and a date inside it, in ${where}`,
  ).toEqual([]);
  expect(oldest, `the player has a household, in ${where}`).toBeDefined();
  expect(fell, `the player's household member fell ill, in ${where}`).toBe(
    true,
  );
  expect(
    staged.core.people.get(oldest!.id)?.alive,
    `${oldest!.id} of the player's household died in the skipped year, in ${where}`,
  ).toBe(false);
  expect(
    record,
    `${oldest!.id}'s death left a record, in ${where}`,
  ).toBeDefined();
  expect(
    record!.date > start && record!.date <= yearEnd,
    `${oldest!.id}'s death record (${record!.date}) is dated inside the year, in ${where}`,
  ).toBe(true);
  expect(
    typeof cause === "string" && cause.length > 0,
    `${oldest!.id}'s death record names a cause, in ${where}`,
  ).toBe(true);
}, 3_000_000);
