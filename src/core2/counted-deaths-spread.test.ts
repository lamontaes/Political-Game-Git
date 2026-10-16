import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { createRenewalCore } from "./births-setup";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

// Counted deaths follow each cohort's hazard, not only the oldest first, and
// the year's total matches what the life tables expect. A random place from
// all 56, named with its seed on a failure.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "counted-deaths-spread");

describe(`counted deaths in ${place.name} (seed ${seed})`, () => {
  it("fall across ages in proportion to hazard, and total what the tables expect", () => {
    const core = createRenewalCore(generatedOpening(place, { twoLevel: true }));
    const born = new Map<string, string>();
    for (const household of residentsRuntime(core)!.households.values())
      for (const person of household.people)
        born.set(person.id, person.birthDate);
    const start = core.date;
    advanceCore(core, addDays(makeIsoDate(start), 365));
    const rows = coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as {
      deaths: string[];
      expected: { deaths: number };
    }[];
    const deaths = rows.flatMap((row) => row.deaths);
    const expected = rows.reduce((n, row) => n + row.expected.deaths, 0);
    const ages = deaths
      .map((id) => born.get(id))
      .filter((birth): birth is string => !!birth)
      .map((birth) => ageOnDate(makeIsoDate(birth), makeIsoDate(start)))
      .sort((a, b) => a - b);
    const where = `${place.name}, seed ${seed}`;
    // The year's total is what the life tables expect, within a death.
    expect(Math.abs(deaths.length - expected), where).toBeLessThanOrEqual(2);
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
