import { describe, expect, it } from "vitest";

import { createDemoWorld } from "./demo";
import { createFormationContext, recordPrinciple } from "./politics";
import { packPrinciples, unpackPrinciples } from "./principle-packing";
import { CONTENT_PACK_API } from "./runtime-content-packs";
import {
  createWorldSnapshot,
  deserializeWorld,
  PRINCIPLE_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION,
  PRINCIPLE_WORLD_SNAPSHOT_FORMAT_VERSION,
  readWorldSnapshot,
  serializeWorld,
  serializeWorldAs,
  WORLD_SNAPSHOT_FORMAT_VERSION,
} from "./serialization";
import type { World } from "./types";

function worldWithDrawnPrinciple(): World {
  const world = createDemoWorld("compact-before-play-principle");
  const principleId = world.policyCatalog.principleOrder[0]!;
  const definition = world.policyCatalog.principles[principleId]!;
  const personId = world.personOrder.find(
    (id) =>
      !world.history.principles.some(
        (record) =>
          record.personId === id && record.principleId === principleId,
      ),
  )!;
  return recordPrinciple(world, {
    stableKey: `officeholder-principles/v1:${personId}:${definition.stableKey}`,
    personId,
    principleId,
    formedAt: world.currentDate,
    stance: "endorses",
    strength: 0.37,
    conviction: "strong",
    flexibility: "conditional",
    qualification: null,
    formation: createFormationContext("other:drawn-before-play", {
      note: "Drawn before play; see officeholder-principles.ts.",
    }),
    supersedesPrincipleRecordId: null,
  });
}

const world = worldWithDrawnPrinciple();

describe("generated principles in a save", () => {
  it("packs only the exact before-play shape and rebuilds every record in order", () => {
    const packed = packPrinciples(world)!;
    expect(packed).not.toBeNull();
    expect(packed.world.history.principles.some(Array.isArray)).toBe(true);
    expect(
      packed.world.history.principles.some(
        (record) => !Array.isArray(record) && record.qualification !== null,
      ),
    ).toBe(true);
    const restored = unpackPrinciples(packed.world, packed.packing);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(world));
  });

  it("writes format 19, restores exact records, and still reads format 15", () => {
    const stored = serializeWorld(world);
    expect(JSON.parse(stored).formatVersion).toBe(
      PRINCIPLE_WORLD_SNAPSHOT_FORMAT_VERSION,
    );
    const restored = readWorldSnapshot(stored);
    expect(JSON.stringify(restored.world)).toBe(JSON.stringify(world));
    expect(serializeWorldAs(restored.world, restored.formatVersion)).toBe(
      stored,
    );
    expect(deserializeWorld(stored)).toEqual(world);

    const older = JSON.stringify(createWorldSnapshot(world));
    expect(JSON.parse(older).formatVersion).toBe(WORLD_SNAPSHOT_FORMAT_VERSION);
    const reopened = readWorldSnapshot(older);
    expect(JSON.stringify(reopened.world)).toBe(JSON.stringify(world));
    expect(serializeWorldAs(reopened.world, reopened.formatVersion)).toBe(
      older,
    );
  });

  it("keeps a valid content-pack world in its own packed format", () => {
    const withContentPacks: World = {
      ...world,
      contentPacks: { api: CONTENT_PACK_API, installed: [] },
    };
    const stored = serializeWorld(withContentPacks);
    expect(JSON.parse(stored).formatVersion).toBe(
      PRINCIPLE_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION,
    );
    expect(JSON.stringify(readWorldSnapshot(stored).world)).toBe(
      JSON.stringify(withContentPacks),
    );
  });

  it("rejects malformed tables and a packed payload under an older format", () => {
    const stored = JSON.parse(serializeWorld(world));
    for (const strength of [-0.1, 1.1, null, "0.37"]) {
      const invalidStrength = structuredClone(stored);
      const row = invalidStrength.world.history.principles.find(Array.isArray);
      row[5] = strength;
      expect(() =>
        readWorldSnapshot(JSON.stringify(invalidStrength)),
      ).toThrow();
    }
    const missingPerson = structuredClone(stored);
    missingPerson.principlesPacking.persons = [];
    expect(() => readWorldSnapshot(JSON.stringify(missingPerson))).toThrow();
    const extraField = structuredClone(stored);
    extraField.principlesPacking.unrecognized = true;
    expect(() => readWorldSnapshot(JSON.stringify(extraField))).toThrow();
    const wrongVersion = structuredClone(stored);
    wrongVersion.formatVersion = WORLD_SNAPSHOT_FORMAT_VERSION;
    expect(() => readWorldSnapshot(JSON.stringify(wrongVersion))).toThrow();
  });
});
