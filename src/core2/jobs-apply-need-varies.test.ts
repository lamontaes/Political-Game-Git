/**
 * Applying for work reads the household's runway (pool item
 * world-apply-and-buy-reasons-vary), by one rule for a full person and a
 * counted one: among the people actually looking for work in a played world,
 * the one whose household's money covers fewer days needs work more, in each
 * tier, and a counted seeker filled in keeps the need it had. A place is drawn
 * from all 56 on a seed nobody chose (APPLY_NEED_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID, unemployedNeed } from "./modules/jobs";
import {
  countedHouseholdOf,
  householdCash,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const seed = process.env.APPLY_NEED_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 12;
// The seekers' runways must differ by at least a month for the need to show it.
const SPREAD_DAYS = 30;

interface SeekerRow {
  id: string;
  personId: string;
  employed: boolean;
}

/** Days a person's household's money covers its costs: full members' records, or the counted household's columns and its share of its group's money. */
function runwayDays(core: CoreState, personId: string): number {
  let liquid = 0,
    cost = 0;
  const person = core.people.get(personId);
  if (person) {
    for (const id of core.households.get(person.householdId)?.memberIds ?? [
      personId,
    ]) {
      const member = core.people.get(id);
      if (!member?.alive) continue;
      liquid += member.liquidMinor;
      cost += member.livingCostDailyMinor;
    }
  } else {
    const household = countedHouseholdOf(core, personId);
    const rt = residentsRuntime(core);
    if (household && rt) {
      // Its money is its share of its group's account, which a fill-in hands
      // its members; a world whose groups hold no money keeps it in the
      // members' columns.
      for (const member of rt.store.factsOfHousehold(household)) {
        if (!rt.funded) liquid += member.liquidMinor;
        cost += member.livingCostDailyMinor;
      }
      if (rt.funded) liquid += householdCash(rt, household);
    }
  }
  return cost > 0 ? liquid / cost : Number.POSITIVE_INFINITY;
}

it("job seekers in a played world, full and counted alike, need work more as their runway is shorter, and keep that need when filled in", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "apply-need");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // A week of play, so the jobs engine has opened its seekers and run its
    // first weekly round of applications.
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const jobs = api.moduleState(JOBS_MODULE_ID);
    // The people the weekly apply step weighs: unemployed seeker rows, full
    // and counted (each is of working age by the engine's own rule).
    const witnesses = (table: "seekers" | "countedSeekers", full: boolean) =>
      (jobs.table(table).rows() as unknown as SeekerRow[])
        .filter(
          (row) => !row.employed && core.people.has(row.personId) === full,
        )
        .map((row) => ({
          row: row.id,
          id: row.personId,
          days: runwayDays(core, row.personId),
          need: unemployedNeed(api, row.personId),
        }))
        .filter((r) => Number.isFinite(r.days))
        .sort((a, b) => a.days - b.days);
    const fullRows = witnesses("seekers", true);
    const countedRows = witnesses("countedSeekers", false);
    const spread = (rows: typeof fullRows) =>
      rows.length >= 2 && rows.at(-1)!.days - rows[0]!.days >= SPREAD_DAYS;
    if (!spread(fullRows) || !spread(countedRows)) {
      tried.push(
        `${where}: ${fullRows.length} full and ${countedRows.length} counted unemployed seekers with a finite runway`,
      );
      continue;
    }
    for (const [tier, rows] of [
      ["full", fullRows],
      ["counted", countedRows],
    ] as const) {
      const low = rows[0]!,
        high = rows.at(-1)!;
      process.stdout.write(
        `apply need, ${tier}: ${where}; seeker ${low.row} (${low.id}, ${low.days.toFixed(0)} days) need ${low.need.toFixed(3)}; seeker ${high.row} (${high.id}, ${high.days.toFixed(0)} days) need ${high.need.toFixed(3)}\n`,
      );
      expect(
        low.need,
        `${where}: ${tier} ${low.id} (${low.days.toFixed(0)} days) vs ${high.id} (${high.days.toFixed(0)} days)`,
      ).toBeGreaterThan(high.need);
    }
    // Filling a counted seeker in leaves the need the apply step reads as it was.
    const counted = countedRows[0]!;
    fillInPerson(core, counted.id);
    expect(
      core.people.has(counted.id),
      `${where}: ${counted.id} filled in`,
    ).toBe(true);
    const after = unemployedNeed(api, counted.id);
    process.stdout.write(
      `apply need across fill-in: ${where}; ${counted.id} need ${counted.need.toFixed(6)} counted, ${after.toFixed(6)} filled in\n`,
    );
    expect(after, `${where}: ${counted.id}'s need across fill-in`).toBeCloseTo(
      counted.need,
      9,
    );
    return;
  }
  throw new Error(
    `no drawn place had a spread of runways among full and counted seekers in ${DRAWS} draws: ${tried.join("; ")}`,
  );
}, 1_800_000);
