import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { confidantsOf } from "./confidants";
import {
  createHousehold,
  recordKinship,
  startHouseholdMembership,
} from "./life";
import { lifePlaceStateIdentities } from "./life-places";
import { createStableId } from "./ids";
import { recordRelationshipInteraction } from "./records";
import { readRelationshipStanding } from "./relationship-standing";
import { pickDistinct, SeededRng } from "./rng";
import type { EntityId, World } from "./types";
import { recordPersonDeath } from "./vitality";

const seed = "confidants-indexed-read-20261002";
const places = pickDistinct(new SeededRng(seed), lifePlaceStateIdentities(), 5);
const provenance = {
  kind: "authored" as const,
  note: "Explicit confidant-reader fixture records.",
};

function join(world: World, personId: EntityId, householdId: EntityId): World {
  return startHouseholdMembership(world, {
    stableKey: `confidants:home:${personId}`,
    personId,
    householdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
}

function interact(
  world: World,
  first: EntityId,
  second: EntityId,
  count: number,
  change: "strengthened" | "strained" = "strengthened",
): World {
  for (let index = 0; index < count; index += 1) {
    world = recordRelationshipInteraction(world, {
      stableKey: `confidants:interaction:${world.history.nextSequence}`,
      personIds: [first, second],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "experience:shared",
      change,
      significance: "major",
      summary: "Two residents shared a consequential experience.",
      tags: [],
    });
  }
  return world;
}

function fixture(place: string) {
  const small = smallWorld({ place, seed, people: 9 });
  const [
    teller,
    kin,
    housemate,
    frequent,
    firstTie,
    secondTie,
    adverse,
    stranger,
    unrelated,
  ] = small.world.personOrder;
  if (
    !teller ||
    !kin ||
    !housemate ||
    !frequent ||
    !firstTie ||
    !secondTie ||
    !adverse ||
    !stranger ||
    !unrelated
  ) {
    throw new Error("Confidant fixture requires nine residents.");
  }
  let world = createHousehold(small.world, {
    stableKey: "confidants:household",
    formedAt: small.world.currentDate,
    label: "Shared residence",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = join(world, teller, householdId);
  world = join(world, housemate, householdId);
  world = recordKinship(world, {
    stableKey: "confidants:kin",
    personIds: [teller, kin],
    establishedAt: world.currentDate,
    kind: "collateral:sibling",
    provenance,
  });
  // Record low-count ties first and alternate the teller's side of the pair.
  world = interact(world, firstTie, teller, 2);
  world = interact(world, teller, secondTie, 2);
  world = interact(world, frequent, teller, 4);
  world = interact(world, teller, adverse, 3, "strained");
  world = interact(world, stranger, unrelated, 5);
  world = interact(world, kin, teller, 5);
  return {
    world,
    teller,
    kin,
    housemate,
    frequent,
    firstTie,
    secondTie,
    adverse,
    stranger,
    unrelated,
    householdId,
  };
}

describe.each(places.map((place) => [place.jurisdictionKey]))(
  `confidants in %s (sample seed ${seed})`,
  (place) => {
    it("puts recorded family and housemates first, then warm direct ties by dealings", () => {
      const f = fixture(place);
      for (const id of [f.frequent, f.firstTie, f.secondTie]) {
        expect(
          readRelationshipStanding(f.world, f.teller, id).readings.warmth,
        ).toMatchObject({ band: "strong", adverse: false });
      }
      expect(
        readRelationshipStanding(f.world, f.teller, f.adverse).readings.warmth
          .adverse,
      ).toBe(true);
      const history = f.world.history;
      const expected = [
        ...[f.kin, f.housemate].sort(),
        f.frequent,
        ...[f.firstTie, f.secondTie].sort(),
      ];
      expect(confidantsOf(f.world, f.teller)).toEqual(expected);
      expect(confidantsOf(f.world, f.teller)).toEqual(expected);
      expect(
        confidantsOf(f.world, createStableId("person", "confidants:missing")),
      ).toEqual([]);
      expect(f.world.history).toBe(history);
    });

    it("refreshes prior reads after membership and interaction appends and array replacement", () => {
      const f = fixture(place);
      const initial = confidantsOf(f.world, f.teller);
      const housed = join(f.world, f.stranger, f.householdId);
      expect(confidantsOf(housed, f.teller)).toEqual([
        ...[f.kin, f.housemate, f.stranger].sort(),
        f.frequent,
        ...[f.firstTie, f.secondTie].sort(),
      ]);
      const warmed = interact(housed, f.teller, f.unrelated, 6);
      const expected = [
        ...[f.kin, f.housemate, f.stranger].sort(),
        f.unrelated,
        f.frequent,
        ...[f.firstTie, f.secondTie].sort(),
      ];
      expect(confidantsOf(warmed, f.teller)).toEqual(expected);
      const replaced: World = {
        ...warmed,
        history: {
          ...warmed.history,
          householdMemberships: [...warmed.history.householdMemberships],
          relationshipInteractions: [
            ...warmed.history.relationshipInteractions,
          ],
          personDeaths: [...warmed.history.personDeaths],
        },
      };
      expect(confidantsOf(replaced, f.teller)).toEqual(expected);
      expect(confidantsOf(f.world, f.teller)).toEqual(initial);
      expect(replaced.history.relationshipInteractions).toEqual(
        warmed.history.relationshipInteractions,
      );
    });

    it("refreshes a cached read when family and a warm tie die on the current date", () => {
      const f = fixture(place);
      const initial = confidantsOf(f.world, f.teller);
      let deceased = f.world;
      for (const personId of [f.kin, f.frequent]) {
        deceased = recordPersonDeath(deceased, {
          stableKey: `confidants:death:${personId}`,
          personId,
          diedAt: deceased.currentDate,
          causeKey: "cause:external-fixture",
          sourceEntityIds: [deceased.id],
          summary: "A resident died in this explicit reader fixture.",
          provenance,
        });
      }
      const surviving = [f.housemate, ...[f.firstTie, f.secondTie].sort()];
      expect(confidantsOf(deceased, f.teller)).toEqual(surviving);
      const replaced: World = {
        ...deceased,
        history: {
          ...deceased.history,
          personDeaths: [...deceased.history.personDeaths],
        },
      };
      expect(confidantsOf(replaced, f.teller)).toEqual(surviving);
      expect(confidantsOf(f.world, f.teller)).toEqual(initial);
    });
  },
);
