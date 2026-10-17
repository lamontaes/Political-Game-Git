import { countedMoves } from "./modules/counted-moves";
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { advanceCore } from "./life";
import { createRenewalCore } from "./births-setup";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { residentCounts, residentPerson } from "./modules/residents";
import { coreAPI, personOrFillIn } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CoreInput, CoreState } from "./types";

// One random place from all 56, named with its seed in the test title.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "pw8-counted-flows");

interface CountsRow {
  placeId: string;
  month: string;
  startPeople: number;
  endPeople: number;
  births: string[];
  deaths: string[];
}

const cash = (core: CoreState) => {
  let total = 0;
  for (const row of core.people.values()) total += row.liquidMinor;
  for (const row of core.organizations.values()) total += row.liquidMinor;
  return total;
};

describe(`counted population drift in ${place.name} (seed ${seed})`, () => {
  let input: CoreInput;
  let core: CoreState;
  let start: number;
  let rows: CountsRow[];
  let opening: number;
  beforeAll(() => {
    input = generatedOpening(place, { twoLevel: true });
    core = createRenewalCore(input);
    start = residentCounts(core).reduce((n, row) => n + row.people, 0);
    opening = cash(core);
    // Through two firsts of the month.
    advanceCore(core, addDays(makeIsoDate(core.date), 62));
    rows = coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as CountsRow[];
  }, 600_000);

  it("records each month's flows, and the counts equal the start plus them", () => {
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows)
      expect(row.endPeople).toBe(
        row.startPeople + row.births.length - row.deaths.length,
      );
    const moved = rows.reduce(
      (n, row) => n + row.births.length - row.deaths.length,
      0,
    );
    const end = residentCounts(core).reduce((n, row) => n + row.people, 0);
    expect(rows.some((row) => row.endPeople !== row.startPeople)).toBe(true);
    // People also move from causes on the counted-moves engine; fill-in
    // during the run (none here) is the only other way out of the counts.
    const moves = countedMoves(coreAPI(core)).reduce(
      (n, row) => n + (row.direction === "in" ? row.people : -row.people),
      0,
    );
    expect(end).toBe(start + moved + moves);
  });

  it("records each counted baby in the town's births, marked as counted", () => {
    const counted = coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("births")
      .rows()
      .filter((row) => row.counted === true);
    expect(counted.map((row) => row.childId).sort()).toEqual(
      rows.flatMap((row) => row.births).sort(),
    );
  });

  it("keeps every dollar: movers carry their cash to the outside account", () => {
    let outside = 0;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(cash(core)).toBe(opening - outside);
  });

  it("fills in a counted newborn as the counts recorded them", () => {
    const babyId = rows.flatMap((row) => row.births)[0];
    if (!babyId) return expect(rows.length).toBeGreaterThan(0);
    const recorded = residentPerson(core, babyId)!;
    expect(recorded.birthDate <= core.date).toBe(true);
    const mother = residentPerson(core, recorded.familyIds[0]!);
    expect(mother?.householdId).toBe(recorded.householdId);
    const filled = personOrFillIn(core, babyId)!;
    expect(filled.birthDate).toBe(recorded.birthDate);
    expect(filled.householdId).toBe(recorded.householdId);
    expect(core.people.get(recorded.familyIds[0]!)?.familyIds.has(babyId)).toBe(
      true,
    );
  });
});
