import { describe, expect, it } from "vitest";

import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";
import { makeIsoDate } from "./dates";
import { createGeneratedWorld } from "./demo";
import { createLightweightPerson } from "./people";
import { derivePersonAppearance } from "./person-appearance";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { Person } from "./types";
import { assertWorldIntegrity, createWorldId } from "./world";

const DATE = makeIsoDate("2026-01-05");

describe("Person appearance catalog pin", () => {
  it("is recorded at creation when supplied and absent otherwise", () => {
    const worldId = createWorldId("pin-seed");
    const base = {
      worldId,
      worldSeed: "pin-seed",
      index: 0,
      currentDate: DATE,
      homeJurisdictionId: "jurisdiction_pin" as Person["homeJurisdictionId"],
    };
    const pinned = createLightweightPerson({
      ...base,
      appearanceCatalogGeneration: 3,
    });
    const unpinned = createLightweightPerson(base);
    expect(pinned.appearance?.catalogGeneration).toBe(3);
    expect(unpinned.appearance?.catalogGeneration).toBeUndefined();
    // The pin never changes the seed or identity derivation.
    expect(pinned.appearance?.seed).toBe(unpinned.appearance?.seed);
    expect(pinned.id).toBe(unpinned.id);
    expect(derivePersonAppearance(pinned.id, undefined, 3)).toEqual(
      pinned.appearance,
    );
  });

  it("rejects an invalid pin at derivation and at world validation", () => {
    expect(() => derivePersonAppearance("person_x", undefined, 0)).toThrow(
      "positive integer",
    );
    expect(() => derivePersonAppearance("person_x", undefined, 1.5)).toThrow(
      "positive integer",
    );
    const world = createGeneratedWorld("pin-validate", {
      appearanceCatalogGeneration: 1,
    });
    const personId = world.personOrder[0]!;
    const person = world.people[personId]!;
    const corrupted = {
      ...world,
      people: {
        ...world.people,
        [personId]: {
          ...person,
          appearance: { ...person.appearance!, catalogGeneration: -1 },
        },
      },
    };
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      "catalog generation must be a positive integer",
    );
  });

  it("survives the JSON snapshot codec and the SQLite repository", () => {
    const world = createGeneratedWorld("pin-persist", {
      appearanceCatalogGeneration: 2,
    });
    for (const personId of world.personOrder) {
      expect(world.people[personId]!.appearance?.catalogGeneration).toBe(2);
    }
    expect(deserializeWorld(serializeWorld(world))).toEqual(world);

    const repository = new SqliteWorldRepository(":memory:");
    repository.save(world);
    const loaded = repository.load(world.id);
    repository.close();
    expect(loaded).toEqual(world);
    for (const personId of world.personOrder) {
      expect(loaded?.people[personId]?.appearance).toEqual(
        world.people[personId]?.appearance,
      );
    }
  });

  it("replays identically from the same seed and options", () => {
    const a = createGeneratedWorld("pin-replay", {
      appearanceCatalogGeneration: 1,
    });
    const b = createGeneratedWorld("pin-replay", {
      appearanceCatalogGeneration: 1,
    });
    expect(b).toEqual(a);
  });
});
