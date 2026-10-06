import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  createCharacterHistoryContextPerson,
} from "./character-history";
import { addDays } from "./dates";
import { recordHouseholdLocation } from "./life";
import { deserializeWorld, serializeWorld } from "./serialization";
import { crimeCutoff, crimeResidenceAt } from "./crime/dated-inputs";
import { householdMembershipsAt } from "./life-queries";
import type { World, EntityId, IsoDate, HistoricalCutoff } from "./types";
const cutoffAt = (world: World, asOfDate: IsoDate): HistoricalCutoff => ({
  asOfDate,
  historySequenceExclusive: world.history.nextSequence,
});
const residenceAt = (
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
) =>
  householdMembershipsAt(world, personId, cutoff)[0]?.location
    ?.jurisdictionId ?? null;
const seed = "session6-context-residence";
const place = drawRandomPlace(seed);
function fixture() {
  const f = smallWorld({ place: place.key, household: true, seed });
  const householdId = f.world.history.households.at(-1)!.id;
  const world = recordHouseholdLocation(f.world, {
    stableKey: "context:existing-home",
    householdId,
    effectiveAt: f.world.currentDate,
    jurisdictionId: f.jurisdictionId,
    kind: "residence:home",
    label: place.displayName,
    provenance: { kind: "authored", note: "Existing dated household fixture" },
    supersedesLocationId: null,
  });
  const source = world.people[f.personId]!;
  const input = {
    stableKey: "context:resident",
    givenName: source.givenName,
    familyName: source.familyName,
    birthDate: source.birthDate,
    homeJurisdictionId: f.jurisdictionId,
  };
  return { ...f, world, householdId, input };
}

describe(`context residence (${place.displayName}, ${seed})`, () => {
  it("does not infer household membership or dated crime residence from a current home field", () => {
    const f = fixture();
    const world = createCharacterHistoryContextPerson(f.world, f.input);
    const id = characterHistoryContextPersonId(world, f.input.stableKey);
    expect(
      residenceAt(world, id, cutoffAt(world, world.currentDate)),
    ).toBeNull();
    expect(
      crimeResidenceAt(world, id, crimeCutoff(world, world.currentDate)),
    ).toBeNull();
  });

  it("admits supplied existing household evidence, preserves sequence and save identity", () => {
    const f = fixture();
    const input = {
      ...f.input,
      residence: {
        householdId: f.householdId,
        establishedAt: f.world.currentDate,
      },
    };
    const before = cutoffAt(f.world, f.world.currentDate);
    const crimeBefore = crimeCutoff(f.world, f.world.currentDate);
    const world = createCharacterHistoryContextPeople(f.world, [input]);
    const id = characterHistoryContextPersonId(world, input.stableKey);
    expect(residenceAt(world, id, before)).toBeNull();
    expect(crimeResidenceAt(world, id, crimeBefore)).toBeNull();
    expect(() =>
      residenceAt(world, id, cutoffAt(world, addDays(input.birthDate, -1))),
    ).toThrow("Historical cutoff predates the person's birth.");
    expect(
      crimeResidenceAt(
        world,
        id,
        crimeCutoff(world, addDays(input.birthDate, -1)),
      ),
    ).toBeNull();
    expect(
      residenceAt(
        world,
        id,
        cutoffAt(world, addDays(input.residence.establishedAt, -1)),
      ),
    ).toBeNull();
    expect(residenceAt(world, id, cutoffAt(world, world.currentDate))).toBe(
      f.jurisdictionId,
    );
    expect(
      crimeResidenceAt(
        world,
        id,
        crimeCutoff(world, addDays(input.residence.establishedAt, -1)),
      ),
    ).toBeNull();
    expect(
      crimeResidenceAt(world, id, crimeCutoff(world, world.currentDate)),
    ).toBe(f.jurisdictionId);
    expect(createCharacterHistoryContextPeople(world, [input])).toBe(world);
    const restored = deserializeWorld(serializeWorld(world));
    expect(restored.id).toBe(f.world.id);
    expect(restored.currentMoment).toEqual(f.world.currentMoment);
    expect(
      residenceAt(restored, id, cutoffAt(restored, restored.currentDate)),
    ).toBe(f.jurisdictionId);
    expect(
      crimeResidenceAt(
        restored,
        id,
        crimeCutoff(restored, restored.currentDate),
      ),
    ).toBe(f.jurisdictionId);
  });

  it("can explicitly admit evidence for an existing context person without replacing their identity", () => {
    const f = fixture();
    const initial = createCharacterHistoryContextPerson(f.world, f.input);
    const id = characterHistoryContextPersonId(initial, f.input.stableKey);
    const admitted = createCharacterHistoryContextPerson(initial, {
      ...f.input,
      residence: {
        householdId: f.householdId,
        establishedAt: initial.currentDate,
      },
    });
    expect(admitted.people[id]).toBe(initial.people[id]);
    expect(
      residenceAt(admitted, id, cutoffAt(admitted, admitted.currentDate)),
    ).toBe(f.jurisdictionId);
    expect(
      crimeResidenceAt(
        admitted,
        id,
        crimeCutoff(admitted, admitted.currentDate),
      ),
    ).toBe(f.jurisdictionId);
  });

  it("rejects future, prebirth and unrecorded household dates", () => {
    const f = fixture();
    for (const date of [
      addDays(f.world.currentDate, 1),
      addDays(f.input.birthDate, -1),
      addDays(f.world.currentDate, -1),
    ]) {
      expect(() =>
        createCharacterHistoryContextPerson(f.world, {
          ...f.input,
          residence: { householdId: f.householdId, establishedAt: date },
        }),
      ).toThrow();
    }
  });
});
