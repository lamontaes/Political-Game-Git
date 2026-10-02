import { describe, expect, it } from "vitest";

// World first: on main, entering the module graph at new-game reaches the
// school stage handlers before their key is set (the lazy registries fix is
// pending), and loading world first is the order the game itself uses.
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { childhoodRecordEntries } from "./childhood-record";
import { childhoodRecord } from "./childhood-record-queries";
import { makeIsoDate } from "./dates";
import { stableHash } from "./ids";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { educationEnrollmentStateAt } from "./life-queries";
import {
  deadPeople,
  moveTieReader,
  planMove,
  playerHouseholdPeople,
  relocateHousehold,
} from "./migration";
import { recordFamilyAddition } from "./people-family";
import { currentSchooling, schoolTermOn } from "./school-stages";
import { leaveSchoolOnMove } from "./school-moves";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";

/** The place of all 56 this seed draws, with a locality to start in. */
function drawPlace(): { seed: string; usps: string; placeKey: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `gap5-childhood-${n}`;
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

/** Elsewhere: another state's jurisdiction, not the town's own. */
function destination(world: World, from: EntityId): EntityId {
  for (const key of ["US-OR", "US-VT", "US-NM"]) {
    const id = stateJurisdictionForKey(key)!.id;
    if (id !== from && world.jurisdictions[id]) return id;
  }
  throw new Error("No destination.");
}

/**
 * A pupil in an active school enrollment whose household can move today,
 * outside the player's household.
 */
function movablePupil(world: World): EntityId | null {
  const ties = moveTieReader(world);
  const context = {
    ties,
    playerHousehold: playerHouseholdPeople(world),
    dead: deadPeople(world),
  };
  const pupils = [
    ...new Set(world.history.educationEnrollments.map((e) => e.personId)),
  ].sort();
  for (const personId of pupils) {
    if (currentSchooling(world, personId)?.status !== "active") continue;
    const from = world.people[personId]!.homeJurisdictionId;
    const plan = planMove(
      world,
      {
        stableKey: "probe",
        personId,
        toJurisdictionId: destination(world, from),
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

describe(`Fable gap 5: the childhood record, in ${label}`, () => {
  const start = opened();
  const term = schoolTermOn(start.world.currentDate);

  it("a move in the middle of a school year is written to the child's record, and the school marks it", () => {
    const pupil = movablePupil(start.world);
    expect(pupil, `a movable pupil in ${label}`).not.toBeNull();
    // On the opening's own day; both branches are checked.
    const from = start.world.people[pupil!]!.homeJurisdictionId;
    const moved = relocateHousehold(start.world, {
      stableKey: "gap5-move",
      personId: pupil!,
      toJurisdictionId: destination(start.world, from),
      reason: "life-course:unrecorded",
      waveKey: null,
      endsHousing: true,
    });
    assertWorldIntegrity(moved);
    // The destination (another state's own record) holds no school, which
    // step 1c's own entry records; this case reads the move entry only.
    const entries = childhoodRecordEntries(moved).filter(
      (entry) =>
        entry.personId === pupil && entry.kind !== "no-school-on-record",
    );
    const left = moved.history.educationEnrollments
      .filter(
        (enrollment) =>
          enrollment.personId === pupil &&
          enrollment.programKind.startsWith("schooling:"),
      )
      .map((enrollment) => educationEnrollmentStateAt(moved, enrollment.id)!);
    expect(left.some((state) => state.status === "transferred")).toBe(true);
    expect(currentSchooling(moved, pupil!)).toBeNull();
    if (term) {
      expect(entries).toEqual([
        expect.objectContaining({
          kind: "school-year-move",
          fromJurisdictionId: from,
          schoolYear: term.schoolYear,
        }),
      ]);
      const event = moved.history.events.find(
        (candidate) => candidate.id === entries[0]!.sourceRecordId,
      );
      expect(event?.type).toBe("migration.moved");
      expect(
        left.find((state) => state.status === "transferred")!.reason,
      ).toMatch(/^Moved away in the middle of the \d{4}-\d{4} school year/);
    } else {
      expect(entries).toEqual([]);
    }
  });

  it("the shared calendar says when school is in session", () => {
    // 2026-08-24 is a Monday, so it is the first day; the fortieth week's
    // Friday is 2027-05-28.
    expect(schoolTermOn(makeIsoDate("2026-08-23"))).toBeNull();
    expect(schoolTermOn(makeIsoDate("2026-08-24"))).toMatchObject({
      schoolYear: 2026,
      startsAt: "2026-08-24",
      endsAt: "2027-05-28",
    });
    expect(schoolTermOn(makeIsoDate("2027-05-28"))?.schoolYear).toBe(2026);
    expect(schoolTermOn(makeIsoDate("2027-05-29"))).toBeNull();
    expect(schoolTermOn(makeIsoDate("2027-07-15"))).toBeNull();
  });

  it("with no school-year entry for the move, the school reads a change between years", () => {
    const pupil = movablePupil(start.world)!;
    const world = recordWorldEvent(start.world, {
      stableKey: "gap5-summer-move",
      type: "migration.moved",
      occurredAt: start.world.currentDate,
      recordedAt: start.world.currentDate,
      jurisdictionId: start.world.people[pupil]!.homeJurisdictionId,
      involvedEntityIds: [pupil],
      participants: [{ personId: pupil, role: "agency:mover", detail: null }],
      personFactConstraints: [],
      visibility: "limited",
      tags: [],
      summary: "A test move with no school-year entry.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = world.history.events.at(-1)!.id;
    const left = leaveSchoolOnMove(world, pupil, eventId, world.currentDate);
    expect(childhoodRecordEntries(left)).toEqual([]);
    expect(left.history.educationEnrollmentStates.at(-1)).toMatchObject({
      status: "transferred",
      reason: "Moved away between school years.",
      provenance: { kind: "simulated-event", eventId },
    });
  });

  it("a birth writes the first entry: where and when", () => {
    const born = recordFamilyAddition(start.world, {
      kind: "birth",
      stableKey: "gap5-birth",
      occurredAt: start.world.currentDate,
      parentPersonIds: [start.playerId],
    });
    assertWorldIntegrity(born.world);
    const child = born.world.people[born.childPersonId]!;
    const record = childhoodRecord(born.world, child.id)!;
    expect(record.entries).toEqual([
      expect.objectContaining({
        kind: "birth",
        birthDate: child.birthDate,
        jurisdictionId: start.world.people[start.playerId]!.homeJurisdictionId,
      }),
    ]);
    expect(record.yearsWitnessed).toBe(0);
    // Medicaid expansion models adults 19 to 64; no child row exists.
    expect(record.daysEligibleForCoverage).toBe(0);

    // Saved and loaded, the record is the same.
    const reloaded = deserializeWorld(serializeWorld(born.world));
    expect(childhoodRecordEntries(reloaded)).toEqual(
      childhoodRecordEntries(born.world),
    );
    assertWorldIntegrity(reloaded);
  });

  it("an old save with no childhood records loads with an empty record", () => {
    const history = { ...start.world.history };
    delete (history as { childhoodRecords?: unknown }).childhoodRecords;
    const old = { ...start.world, history } as World;
    assertWorldIntegrity(old);
    expect(childhoodRecordEntries(old)).toEqual([]);
    expect(childhoodRecord(old, start.playerId)!.entries).toEqual([]);
  });
});
