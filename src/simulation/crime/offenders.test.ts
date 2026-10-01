import { describe, expect, it } from "vitest";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import {
  createEducationEnrollment,
  recordEducationEnrollmentState,
} from "../life";
import { educationEnrollmentStateAt } from "../life-queries";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { SeededRng } from "../rng";
import { TERRITORY_PLACE_ROWS } from "../territory-places";
import type { EntityId, IsoDate, World } from "../types";
import {
  DIPLOMA_OFFENDING_ESTIMATE,
  diplomaWeight,
  offenderForVictims,
  offenderWeight,
  recordedDiplomas,
  type RecordedDiploma,
} from "./offenders";

const LONG = 60_000;

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function allPlaces(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

const PLACE_SEED = "fable-wj37-diploma-offender-weight";
const PLACES = allPlaces();
const PLACE = PLACES[new SeededRng(PLACE_SEED).integer(0, PLACES.length)]!;
const PROVENANCE = { kind: "authored" as const, note: "Fable W-J37 test" };

/** The same day `years` after `date`. */
function yearsAfter(date: IsoDate, years: number): IsoDate {
  return makeIsoDate(
    `${Number(date.slice(0, 4)) + years}${date.slice(4).replace("02-29", "02-28")}`,
  );
}

/**
 * Three residents of the same town, born the same day, out of work, with no
 * record, no ties and no temperament on file. They differ only in what their
 * schooling record says: a finished high school, a high school left without
 * a diploma, or no schooling on record at all.
 */
function threeAlike() {
  const opened = openObserverWorld(observerSetup(PLACE_SEED, PLACE));
  const town = opened.world.people[opened.anchorPersonId]!.homeJurisdictionId;
  const born = makeIsoDate(addDays(opened.world.currentDate, -24 * 365 - 30));
  const keys = {
    graduated: "wj37:graduated",
    leftWithout: "wj37:left-without",
    unrecorded: "wj37:unrecorded",
  } as const;
  let world = createCharacterHistoryContextPeople(
    opened.world,
    Object.values(keys).map((stableKey, index) => ({
      stableKey,
      givenName: ["Avery", "Jordan", "Casey"][index]!,
      familyName: "Lane",
      birthDate: born,
      homeJurisdictionId: town,
    })),
  );
  const id = (key: string) => characterHistoryContextPersonId(world, key);
  const started = yearsAfter(born, 14);
  // A school the world already has, standing by the day they started.
  const secondary = new Set(
    world.history.educationEnrollments
      .filter((row) => row.programKind === "schooling:secondary")
      .map((row) => row.organizationId),
  );
  const school = world.history.organizations.find(
    (row) => secondary.has(row.id) && row.formedAt <= started,
  )!;
  expect(school, "a high school formed before they started").toBeDefined();
  const schooled: readonly [EntityId, "completed" | "withdrawn", IsoDate][] = [
    [id(keys.graduated), "completed", yearsAfter(born, 18)],
    [id(keys.leftWithout), "withdrawn", yearsAfter(born, 16)],
  ];
  for (const [personId, status, endedAt] of schooled) {
    const stableKey = `wj37:school:${personId}`;
    world = createEducationEnrollment(world, {
      stableKey,
      personId,
      organizationId: school.id,
      startedAt: started,
      programKind: "schooling:secondary",
      contextKind: "stage:school",
      provenance: PROVENANCE,
    });
    const enrollment = world.history.educationEnrollments.find(
      (row) => row.stableKey === stableKey,
    )!;
    world = recordEducationEnrollmentState(world, {
      stableKey: `${stableKey}:${status}`,
      enrollmentId: enrollment.id,
      effectiveAt: endedAt,
      status,
      contextKind: "stage:school",
      reason:
        status === "completed"
          ? "Graduated."
          : "Left school without a diploma.",
      provenance: PROVENANCE,
      supersedesStateId: educationEnrollmentStateAt(world, enrollment.id)!.id,
    });
  }
  return {
    world,
    town,
    anchor: opened.anchorPersonId,
    graduated: id(keys.graduated),
    leftWithout: id(keys.leftWithout),
    unrecorded: id(keys.unrecorded),
  };
}

function weigh(
  world: World,
  personId: EntityId,
  diploma: RecordedDiploma,
): ReturnType<typeof offenderWeight> {
  return offenderWeight(world, personId, "burglary", {
    age: ageOnDate(world.people[personId]!.birthDate, world.currentDate),
    priorRecord: false,
    knowsVictim: false,
    diploma,
  });
}

describe(`a resident's recorded diploma in the offender weight (${PLACE}, seed ${PLACE_SEED})`, () => {
  it("is labeled an estimate from the study's average, with its source and no race term", () => {
    expect(DIPLOMA_OFFENDING_ESTIMATE.provenance).toBe(
      "estimated-from-average",
    );
    expect(DIPLOMA_OFFENDING_ESTIMATE.source).toMatch(
      /Lochner and Moretti 2004/,
    );
    expect(Object.keys(DIPLOMA_OFFENDING_ESTIMATE).join(" ")).not.toMatch(
      /race|black|white/i,
    );
    // Split evenly either side of the resident whose schooling is unknown.
    expect(diplomaWeight("left-without") - diplomaWeight("graduated")).toBe(
      DIPLOMA_OFFENDING_ESTIMATE.gap,
    );
    expect(diplomaWeight("left-without")).toBe(-diplomaWeight("graduated"));
    expect(diplomaWeight("not-on-record")).toBe(0);
  });

  it(
    "two otherwise identical residents differ only by the recorded diploma",
    () => {
      const t0 = Date.now();
      const s = threeAlike();
      const diplomas = recordedDiplomas(s.world);
      expect(diplomas.get(s.graduated)).toBe("graduated");
      expect(diplomas.get(s.leftWithout)).toBe("left-without");
      // No schooling on record: no change, not a guess.
      expect(diplomas.has(s.unrecorded)).toBe(false);

      const read = (personId: EntityId) =>
        weigh(s.world, personId, diplomas.get(personId) ?? "not-on-record");
      const graduated = read(s.graduated);
      const leftWithout = read(s.leftWithout);
      const unrecorded = read(s.unrecorded);
      // Young (2), out of work (2), and a burglary takes money (1).
      expect(unrecorded.score).toBe(5);
      expect(graduated.score - unrecorded.score).toBeCloseTo(
        diplomaWeight("graduated"),
        12,
      );
      expect(leftWithout.score - graduated.score).toBeCloseTo(
        DIPLOMA_OFFENDING_ESTIMATE.gap,
        12,
      );
      expect(graduated.reasons).toEqual(unrecorded.reasons);
      expect(leftWithout.reasons).toEqual([
        ...unrecorded.reasons,
        "left school without a diploma",
      ]);
      // The same resident read with no diploma is the unrecorded one exactly.
      expect(weigh(s.world, s.graduated, "not-on-record")).toEqual(unrecorded);

      // In the town's own reckoning the dropout's weight leads the other two,
      // and the graduate falls short of being named on these circumstances
      // alone.
      const named = offenderForVictims(
        s.world,
        {
          jurisdictionId: s.town,
          occurredAt: s.world.currentDate,
          victimPersonIds: [s.anchor],
        },
        "burglary",
      );
      expect(named).not.toBeNull();
      expect(named!.personId).not.toBe(s.graduated);
      expect(named!.score).toBeGreaterThanOrEqual(leftWithout.score);
      console.log(
        `W-J37 ${PLACE} seed ${PLACE_SEED}: graduate ${graduated.score.toFixed(2)}, ` +
          `left without ${leftWithout.score.toFixed(2)}, unrecorded ${unrecorded.score.toFixed(2)}; ` +
          `named ${named!.personId === s.leftWithout ? "the dropout" : "another resident"} ` +
          `(${named!.reasons.join(", ")}) in ${Date.now() - t0} ms`,
      );
    },
    LONG,
  );
});
