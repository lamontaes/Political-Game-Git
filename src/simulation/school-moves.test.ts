import { describe, expect, it } from "vitest";

// World first: on main, entering the module graph at new-game reaches the
// school stage handlers before their key is set (the lazy registries fix is
// pending); loading world first is the order the game itself uses.
import { assertWorldIntegrity } from "./world";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { childhoodRecordEntries } from "./childhood-record";
import { stableHash } from "./ids";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { educationEnrollmentStateAt } from "./life-queries";
import {
  decideToLeave,
  deadPeople,
  moveTieReader,
  planMove,
  playerHouseholdPeople,
  relocateHousehold,
  schoolYearDepth,
  SCHOOL_YEAR_HOLD_AT_MID_TERM,
  type LeaveCause,
} from "./migration";
import {
  SCHOOL_STAGE_PROGRAM,
  schoolGradeOn,
  schoolStageForGrade,
} from "./school-calendar";
import { attendingSchool, startSchoolAfterMove } from "./school-moves";
import type { EntityId, World } from "./types";

/** The place of all 56 this seed draws, with a locality to start in. */
function drawPlace(): { seed: string; usps: string; placeKey: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `step1c-school-move-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps, placeKey: locality.key };
  }
  throw new Error("No place with a locality was drawn.");
}

const { seed, usps, placeKey } = drawPlace();
const label = `${usps} (${placeKey}), seed ${seed}`;

function opened(): { world: World; playerId: EntityId } {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 30,
      placeKey,
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

/** Another state's own jurisdiction: the World records no school there. */
function elsewhere(world: World, from: EntityId): EntityId {
  for (const key of ["US-OR", "US-VT", "US-NM"]) {
    const id = stateJurisdictionForKey(key)!.id;
    if (id !== from && world.jurisdictions[id]) return id;
  }
  throw new Error("No destination.");
}

function movablePupil(world: World): EntityId | null {
  const context = {
    ties: moveTieReader(world),
    playerHousehold: playerHouseholdPeople(world),
    dead: deadPeople(world),
  };
  const pupils = [
    ...new Set(world.history.educationEnrollments.map((row) => row.personId)),
  ].sort();
  for (const personId of pupils) {
    if (!attendingSchool(world, personId)) continue;
    const from = world.people[personId]!.homeJurisdictionId;
    const plan = planMove(
      world,
      {
        stableKey: "probe",
        personId,
        toJurisdictionId: elsewhere(world, from),
        reason: "life-course:unrecorded",
        waveKey: null,
        endsHousing: true,
      },
      context,
    );
    if (plan.kind === "planned") return personId;
  }
  return null;
}

describe(`LIVES step 1c: a moved child starts school in the new place, in ${label}`, () => {
  const start = opened();
  const town = start.world.people[start.playerId]!.homeJurisdictionId;
  const pupil = movablePupil(start.world);
  const moved = pupil
    ? relocateHousehold(start.world, {
        stableKey: "step1c-move",
        personId: pupil,
        toJurisdictionId: elsewhere(start.world, town),
        reason: "life-course:unrecorded",
        waveKey: null,
        endsHousing: true,
      })
    : null;

  it("a move to a place with no school on record says so and enrolls nobody", () => {
    expect(pupil, `a movable pupil in ${label}`).not.toBeNull();
    assertWorldIntegrity(moved!);
    const entries = childhoodRecordEntries(moved!).filter(
      (entry) => entry.personId === pupil,
    );
    expect(entries.map((entry) => entry.kind)).toContain("no-school-on-record");
    expect(attendingSchool(moved!, pupil!)).toBe(false);
    const unplaced = entries.find(
      (entry) => entry.kind === "no-school-on-record",
    )!;
    expect(
      moved!.history.events.find(
        (event) => event.id === unplaced.sourceRecordId,
      )?.type,
    ).toBe("migration.moved");
  });

  it("a move to a place with recorded schools starts the pupil there, in the same grade", () => {
    // The town the pupil left holds schools; arriving there is the case of a
    // destination with a school on record.
    const eventId = moved!.history.events
      .filter((event) => event.type === "migration.moved")
      .at(-1)!.id;
    const grade = schoolGradeOn(moved!, pupil!, moved!.currentDate)!;
    const started = startSchoolAfterMove(
      moved!,
      pupil!,
      eventId,
      town,
      moved!.currentDate,
    );
    assertWorldIntegrity(started);
    const enrollment = started.history.educationEnrollments.at(-1)!;
    expect(enrollment).toMatchObject({
      personId: pupil,
      startedAt: moved!.currentDate,
      provenance: { kind: "simulated-event", eventId },
    });
    expect([
      SCHOOL_STAGE_PROGRAM[schoolStageForGrade(grade)],
      "schooling:general",
    ]).toContain(enrollment.programKind);
    expect(educationEnrollmentStateAt(started, enrollment.id)?.status).toBe(
      "active",
    );
    expect(schoolGradeOn(started, pupil!, started.currentDate)).toBe(grade);
  });

  it("the school year weighs against leaving on a sliding scale, nothing at a break", () => {
    const cause: LeaveCause = {
      kind: "rent-burden",
      reason: "cost:rent-burden",
      strength: 0.6,
      causeId: null,
      placeId: null,
      explanation: "the rent takes too much of the pay",
    };
    const weight = (depth: number) =>
      decideToLeave(
        start.world,
        start.playerId,
        `step1c:${depth}`,
        [cause],
        {
          ageMoverRate: 0.1,
          ownsHome: false,
          childrenAtHome: 1,
          townPush: 1,
          schoolYearDepth: depth,
        },
        { placeId: town, label: "test" },
      ).evaluation.context.considerations.find((row) =>
        row.stableKey.endsWith(":bar:school-year"),
      )?.importance ?? null;
    expect(SCHOOL_YEAR_HOLD_AT_MID_TERM).toBe(0.5);
    expect(weight(0)).toBeNull();
    expect(weight(0.2)).toBe("slight");
    expect(weight(0.5)).toBe("moderate");
    expect(weight(1)).toBe("strong");
  });

  it("how deep into the year is read from the household's own pupils", () => {
    const parent = start.world.history.householdMemberships.find(
      (row) =>
        row.personId !== pupil &&
        start.world.history.householdMemberships.some(
          (other) =>
            other.personId === pupil && other.householdId === row.householdId,
        ),
    )?.personId;
    expect(parent).toBeDefined();
    const depth = schoolYearDepth(start.world, parent!);
    // The opening day is in session (2026-01-05 here): deep in the term.
    expect(depth).toBeGreaterThan(0);
    expect(depth).toBeLessThanOrEqual(1);
    expect(schoolYearDepth(start.world, start.playerId)).toBe(0);
  });
});
