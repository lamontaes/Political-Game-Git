import { describe, expect, it } from "vitest";

import { smallWorld } from "./fixtures/small-world";
import { composeWorldTimeHandlers } from "../src/simulation/campaigns";
import { appendChildhoodEntry } from "../src/simulation/childhood-record";
import { childhoodRecord } from "../src/simulation/childhood-record-queries";
import { addDays, dateAtAge } from "../src/simulation/dates";
import { resolveFutureDueItemsThrough } from "../src/simulation/future-transitions";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import { recordFamilyAddition } from "../src/simulation/people-family";
import {
  upbringingFor,
  upbringingTraitTendencies,
} from "../src/simulation/people-upbringing";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import type { EntityId, World } from "../src/simulation/types";
import {
  assertWorldIntegrity,
  recordWorldEvent,
} from "../src/simulation/world";

/**
 * LIVES step 1d: for anyone born in play, upbringing is read from the
 * childhood record, never generated separately. A small world in one place
 * drawn from all 56 by the seed; a child is born, grows up through due items
 * only, and the upbringing read matches the record.
 */
const SEED = "lives-upbringing-record-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const PLACE = state!.jurisdictionKey;

/** One recorded move of a child's household, and its line in the record. */
function moveOf(world: World, childId: EntityId, n: number): World {
  const from = world.people[childId]!.homeJurisdictionId;
  const withEvent = recordWorldEvent(world, {
    stableKey: `upbringing-move-${n}`,
    type: "migration.moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: from,
    involvedEntityIds: [childId],
    participants: [{ personId: childId, role: "agency:mover", detail: null }],
    personFactConstraints: [],
    visibility: "limited",
    tags: [],
    summary: "A household move during a school year.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return appendChildhoodEntry(withEvent, {
    kind: "school-year-move",
    stableKey: `upbringing-move-${n}:childhood`,
    personId: childId,
    effectiveAt: world.currentDate,
    sourceRecordId: withEvent.history.events.at(-1)!.id,
    fromJurisdictionId: from,
    toJurisdictionId: from,
    schoolYear: 2026 + n,
    grade: 3,
  });
}

describe(`upbringing read from the childhood record in ${PLACE} (seed ${SEED})`, () => {
  const small = smallWorld({ place: PLACE, seed: SEED, people: 4 });
  const parentId = small.personId;
  const born = recordFamilyAddition(small.world, {
    kind: "birth",
    stableKey: "upbringing-birth",
    occurredAt: small.world.currentDate,
    parentPersonIds: [parentId],
  });
  const childId = born.childPersonId;

  it("a child born in play reads from the record, with nothing drawn", () => {
    const upbringing = upbringingFor(born.world, childId);
    expect(upbringing.basis).toBe("childhood-record");
    // Nothing records how caregivers treated the child, so no climate is
    // invented and no trait tendency is read from it.
    expect(upbringing.caregiving).toBe("not-recorded");
    expect(upbringing.schooling).toEqual([]);
    expect(upbringing.homeStability).toBe("stable");
    expect(upbringing.money.every((row) => row.source.note !== "")).toBe(true);
    // The same on any seed: no draw decides it.
    const other = smallWorld({
      place: PLACE,
      seed: `${SEED}-other`,
      people: 4,
    });
    const otherBorn = recordFamilyAddition(other.world, {
      kind: "birth",
      stableKey: "upbringing-birth",
      occurredAt: other.world.currentDate,
      parentPersonIds: [other.personId],
    });
    const shape = (u: typeof upbringing) => ({
      ...u,
      personId: null,
      money: null,
    });
    expect(
      shape(upbringingFor(otherBorn.world, otherBorn.childPersonId)),
    ).toEqual(shape(upbringing));
  });

  it("an opening-world person keeps the game profile, since no childhood was recorded", () => {
    expect(childhoodRecord(small.world, parentId)!.entries).toEqual([]);
    expect(upbringingFor(small.world, parentId).basis).toBe("game-profile");
  });

  it("grows up on due items only and the upbringing matches the record's moves", () => {
    let world = born.world;
    const disruptions: number[] = [];
    const guarded: number[] = [];
    for (const [moves, expected] of [
      [0, "stable"],
      [1, "some-moves"],
      [3, "disrupted"],
    ] as const) {
      let next = world;
      for (let n = 0; n < moves; n++) next = moveOf(next, childId, n);
      const record = childhoodRecord(next, childId)!;
      expect(
        record.entries.filter((e) => e.kind === "school-year-move"),
      ).toHaveLength(moves);
      const read = upbringingFor(next, childId);
      expect(read.homeStability).toBe(expected);
      // Smooth in the move count: moves / (moves + K), K = 2 PLACEHOLDER.
      expect(read.disruption).toBeCloseTo(moves / (moves + 2), 10);
      disruptions.push(read.disruption);
      // The trait readers weigh by the same number.
      guarded.push(
        upbringingTraitTendencies(read)
          .filter((row) => row.trait === "personality-v1:facet-guarded")
          .reduce((sum, row) => sum + row.weight, 0),
      );
    }
    // Every extra move weighs a little more, with no step anywhere.
    expect(disruptions).toEqual([...disruptions].sort((a, b) => a - b));
    expect(new Set(disruptions).size).toBe(3);
    expect(guarded[0]).toBe(0);
    expect(guarded[1]!).toBeGreaterThan(0);
    expect(guarded[2]!).toBeGreaterThan(guarded[1]!);
    world = moveOf(world, childId, 0);
    const grown = resolveFutureDueItemsThrough(
      world,
      addDays(dateAtAge(world.people[childId]!.birthDate, 14), 1),
      composeWorldTimeHandlers(),
    );
    assertWorldIntegrity(grown);
    const record = childhoodRecord(grown, childId)!;
    expect(record.entries[0]).toMatchObject({ kind: "birth" });
    const upbringing = upbringingFor(grown, childId);
    expect(upbringing.basis).toBe("childhood-record");
    expect(upbringing.homeStability).toBe("some-moves");
    expect(upbringing.firstJob).toBe("none");
    // Reading writes nothing and repeats.
    expect(upbringingFor(grown, childId)).toEqual(upbringing);
  });
});
