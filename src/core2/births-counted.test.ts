import { countedMoves } from "./modules/counted-moves";
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { advanceCore } from "./life";
import { createRenewalCore } from "./births-setup";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import {
  countedHouseholdsByPlace,
  residentCounts,
  residentPerson,
} from "./modules/residents";
import { countedNewborn } from "./births-counted";
import { coreAPI, personOrFillIn } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { pairKey } from "./kernel/ids";
import { currentCloseness } from "./closeness";
import {
  inheritedPartOf,
  inheritedTemperament,
  type KeptParent,
} from "./opening-personality";
import type { CoreInput, CoreState, PersonInput } from "./types";

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
  let untied: string[];
  let counted: number;
  beforeAll(() => {
    input = generatedOpening(place, { twoLevel: true });
    core = createRenewalCore(input);
    // Each full person's relatives in the counts, and whether the opening
    // gave the tie a closeness record a death notice can be grieved from.
    untied = [];
    counted = 0;
    for (const person of core.people.values())
      for (const id of person.familyIds) {
        if (!core.husks.has(id)) continue;
        counted += 1;
        const tie = core.relationships.get(pairKey(person.id, id));
        if (!tie || !(currentCloseness(core, tie) > 0))
          untied.push(`${person.id}:${id}`);
      }
    start = residentCounts(core).reduce((n, row) => n + row.people, 0);
    opening = cash(core);
    // Through two firsts of the month.
    advanceCore(core, addDays(makeIsoDate(core.date), 62));
    rows = coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as CountsRow[];
  }, 600_000);

  it("opens every tie between a full person and a counted relative with recorded closeness", () => {
    expect(counted, "full people with counted relatives").toBeGreaterThan(0);
    expect(untied, `${place.name}: ties without closeness`).toEqual([]);
  });

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

  it("gives each counted baby the temperament its counted parents' kept traits pass on", () => {
    const kept = (row: PersonInput): KeptParent => ({
      id: row.id,
      birthDate: row.birthDate,
      ...(row.looks?.gender ? { gender: row.looks.gender } : {}),
      traits: row.traits,
    });
    // What a baby's parents' records pass on, by the family rule.
    const passedOn = (baby: PersonInput, parents: readonly PersonInput[]) =>
      inheritedTemperament(
        parents.map(kept),
        {
          id: baby.id,
          birthDate: baby.birthDate,
          ...(baby.looks?.gender ? { gender: baby.looks.gender } : {}),
        },
        { seed: core.seed, startedAt: baby.birthDate },
      );
    const center = (baby: PersonInput, parents: readonly PersonInput[]) => {
      const parts = parents.map((parent) =>
        inheritedPartOf(kept(parent), {
          seed: core.seed,
          date: baby.birthDate,
        }),
      );
      // The parents' mean inherited part; an unseen parent's is zero on average.
      return parts[0]!.map(
        (_, index) => parts.reduce((sum, part) => sum + part[index]!, 0) / 2,
      );
    };
    const expectPassedOn = (
      baby: PersonInput,
      parents: readonly PersonInput[],
    ) => {
      const passed = passedOn(baby, parents);
      expect(
        Object.fromEntries(
          Object.keys(passed).map((key) => [key, baby.traits[key]]),
        ),
        `${place.name}: ${baby.id} from ${parents.map((row) => row.id).join(" and ")}`,
      ).toEqual(passed);
    };
    // Every baby the counts recorded in the run, while it and its parents
    // are still counted (a death or a move ends a record).
    for (const baby of rows
      .flatMap((row) => row.births)
      .flatMap((id) => residentPerson(core, id) ?? [])) {
      const parents = baby.familyIds.flatMap(
        (id) => residentPerson(core, id) ?? [],
      );
      if (parents.length === baby.familyIds.length)
        expectPassedOn(baby, parents);
    }
    // Two counted mothers of different households, each with a baby from
    // the counted birth itself, start their babies from different centers.
    const date = makeIsoDate(core.date);
    const mothers = [...countedHouseholdsByPlace(core).values()]
      .flat()
      .flatMap((record) =>
        record.people
          .filter(
            (row) =>
              row.looks?.gender === "female" &&
              row.birthDate <= addDays(date, -20 * 365) &&
              row.birthDate >= addDays(date, -40 * 365),
          )
          .slice(0, 1)
          .map((woman) => ({ record, woman })),
      )
      .slice(0, 2);
    expect(mothers, `${place.name}: counted mothers`).toHaveLength(2);
    const [first, second] = mothers.map(({ record, woman }) => {
      const baby = countedNewborn(coreAPI(core), record, woman, date);
      const parents = baby.familyIds.map((id) =>
        record.people.find((row) => row.id === id)!,
      );
      expectPassedOn(baby, parents);
      return center(baby, parents);
    });
    expect(first).not.toEqual(second);
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
