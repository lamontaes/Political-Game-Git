import { describe, expect, it } from "vitest";
import { createRunBFixture } from "./run-b-fixture";
import { createCharacterProofWorld } from "./character-proof";
import { PRODUCTION_CHARACTER_LIBRARY } from "./visual-integration";
import { resolvePersonPortrait } from "./person-visual";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";

describe("integrated PEOPLE portrait boundary", () => {
  it("keeps exact authored identity after World serialization", () => {
    const fixture = createRunBFixture();
    const saved = deserializeWorld(serializeWorld(fixture.world));
    for (const { personId } of fixture.scenePeople) {
      const before = resolvePersonPortrait(fixture.world.people[personId]!);
      expect(before.kind).toBe("authored");
      expect(resolvePersonPortrait(saved.people[personId]!)).toEqual(before);
    }
  });
  it("withholds DEV fixture likenesses and unsupported future catalogs", () => {
    const world = createCharacterProofWorld(PRODUCTION_CHARACTER_LIBRARY);
    for (const person of Object.values(world.people)) {
      expect(resolvePersonPortrait(person).kind).toBe("placeholder");
      expect(
        resolvePersonPortrait({
          ...person,
          appearance: {
            ...person.appearance!,
            catalogGeneration:
              PRODUCTION_CHARACTER_LIBRARY.catalogGeneration + 1,
          },
        }),
      ).toEqual({
        kind: "placeholder",
        reason: "catalog-generation-unavailable",
      });
    }
  });
});
