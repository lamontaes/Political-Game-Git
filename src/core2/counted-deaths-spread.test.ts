import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { createRenewalCore } from "./births-setup";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { cohortDeathChance } from "./births-counted";
import { corePlaceByKey } from "./place-lookup";
import stateMortality from "./data/state-mortality.json" with { type: "json" };
import { generatedOpening } from "./tooling/generated-world";

// Counted deaths follow each cohort's hazard, not only the oldest first, and
// the year's total matches what the life tables expect. A random place from
// all 56, named with its seed on a failure.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
// A place whose state's death rate sits well off the nation's (a third of the
// 56 do), so the scaling is something the check can see.
const ratioOf = (key: string) =>
  (stateMortality.ratioByState as Record<string, number>)[
    corePlaceByKey(key)?.stateJurisdictionKey ?? ""
  ] ?? 1;
let place = drawPlace(seed, "counted-deaths-spread");
for (let i = 1; i < 40 && Math.abs(ratioOf(place.key) - 1) < 0.1; i += 1)
  place = drawPlace(`${seed}:${i}`, "counted-deaths-spread");

describe(`counted deaths in ${place.name} (seed ${seed})`, () => {
  it("fall across ages in proportion to hazard, and total what the tables expect", () => {
    const core = createRenewalCore(generatedOpening(place, { twoLevel: true }));
    const born = new Map<string, string>();
    const starters: { birth: string; gender: string | undefined }[] = [];
    for (const household of residentsRuntime(core)!.households.values())
      for (const person of household.people) {
        born.set(person.id, person.birthDate);
        starters.push({
          birth: person.birthDate,
          gender: person.looks?.gender,
        });
      }
    const start = core.date;
    advanceCore(core, addDays(makeIsoDate(start), 365));
    const rows = coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as {
      deaths: string[];
      fellIll: string[];
      openingIll: string[];
      expected: { deaths: number };
    }[];
    const deaths = rows.flatMap((row) => row.deaths);
    const expected = rows.reduce((n, row) => n + row.expected.deaths, 0);
    const ages = deaths
      .map((id) => born.get(id))
      .filter((birth): birth is string => !!birth)
      .map((birth) => ageOnDate(makeIsoDate(birth), makeIsoDate(start)))
      .sort((a, b) => a - b);
    const carryRows = coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("countedCarry")
      .rows() as unknown as { deaths: Record<string, number> }[];
    const carriedDeaths = carryRows.reduce(
      (sum, row) =>
        sum + Object.values(row.deaths ?? {}).reduce((a, b) => a + b, 0),
      0,
    );
    const where = `${place.name}, seed ${seed}`;
    // Every death follows a serious illness: someone who fell ill this year or
    // was already ill at the opening, the same as a full person's death.
    const ill = new Set(
      rows.flatMap((row) => [...row.fellIll, ...row.openingIll]),
    );
    for (const id of deaths) expect(ill.has(id), `${where}: ${id}`).toBe(true);
    // The year's illnesses plus carried fractions match what the life tables
    // expect to within rounding: each illness is a death owed.
    const fell = rows.reduce((n, row) => n + row.fellIll.length, 0);
    expect(
      Math.abs(fell + carriedDeaths - expected),
      where,
    ).toBeLessThanOrEqual(1e-6);
    // The state's age-adjusted death rate against the nation's scales the life
    // table for everyone in the town, so the year's expected deaths are the
    // table's for the people at the start times that ratio (within the aging
    // of a year and the people who leave or arrive).
    const ratio = ratioOf(place.key);
    expect(Math.abs(ratio - 1), where).toBeGreaterThanOrEqual(0.1);
    const unscaled = starters.reduce(
      (n, who) =>
        n +
        cohortDeathChance(
          who.gender,
          Number(who.birth.slice(0, 4)),
          ageOnDate(makeIsoDate(who.birth), makeIsoDate(start)),
        ),
      0,
    );
    expect(expected / (unscaled * ratio), where).toBeGreaterThan(0.85);
    expect(expected / (unscaled * ratio), where).toBeLessThan(1.2);
    // Not the oldest first: taking the oldest N people would give the dead no
    // one younger than the Nth oldest at the start.
    const startAges = [...born.values()]
      .map((birth) => ageOnDate(makeIsoDate(birth), makeIsoDate(start)))
      .sort((a, b) => b - a);
    if (deaths.length >= 20) {
      expect(ages[0]!, where).toBeLessThan(startAges[deaths.length - 1]!);
      expect(new Set(ages).size, where).toBeGreaterThanOrEqual(10);
    }
  }, 900_000);
});
