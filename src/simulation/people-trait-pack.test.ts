import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json";
import { peopleTraitPack } from "./people-trait-pack";
import {
  PEOPLE_TRAITS,
  peopleTraitDefinition,
} from "./people-trait-definitions";
import { loadTraitPacks, traitDefinitionFromPack } from "./trait-packs";

/**
 * The migration story, asserted rather than claimed.
 *
 * Every personality record any save holds was written against a definition
 * built by `peopleTraitDefinition`. If the pack produced a definition that
 * differed by so much as a description, those records would stop resolving and
 * every existing world would need converting. It does not, and this is what
 * says so.
 */
describe("the pack is the five traits, to the byte", () => {
  const registry = loadTraitPacks([peopleTraitPack()], []);

  it("produces the definition each trait already had", () => {
    expect(registry.report.rejections).toEqual([]);
    for (const trait of PEOPLE_TRAITS) {
      const registered = registry.traits.get(`people-mind-v1:${trait}`)!;
      expect(registered).toBeDefined();
      expect(canonicalJson(traitDefinitionFromPack(registered))).toBe(
        canonicalJson(peopleTraitDefinition(trait)),
      );
    }
  });

  it("keeps the identity the store derives from the stable key", () => {
    for (const trait of PEOPLE_TRAITS) {
      const registered = registry.traits.get(`people-mind-v1:${trait}`)!;
      const built = traitDefinitionFromPack(registered);
      // The id is derived from the stable key, so an unchanged key is an
      // unchanged id, which is what every record points at.
      expect(built.stableKey).toBe(`people-mind-v1:${trait}`);
      expect(built.id).toBe(peopleTraitDefinition(trait).id);
    }
  });

  it("declares all five as ordinary life, seeded, and read by nothing yet", () => {
    for (const trait of PEOPLE_TRAITS) {
      const registered = registry.traits.get(`people-mind-v1:${trait}`)!;
      expect(registered.scopes).toEqual(["life:ordinary"]);
      expect(registered.conferredBy).toBe("seeded");
      expect(registered.seed?.spread).toEqual([
        -2, -1, -1, 0, 0, 0, 0, 1, 1, 2,
      ]);
    }
  });
});
