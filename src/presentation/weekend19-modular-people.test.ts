import { describe, expect, it } from "vitest";

import generation1 from "../../art/manifest/character_candidate_visual4_generation1.json";
import {
  CANDIDATE_REVIEW_GENERATION,
  resolveAppearanceCatalogGeneration,
  resolveCharacterRecipe,
} from "./character-components";
import { PEOPLE_VISUAL4_CHARACTER_LIBRARY as LIBRARY } from "./people-visual4-review";
import {
  COHERENT_APPEARANCE_RECIPE_VERSION,
  DEFAULT_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../simulation/person-appearance";

function resolveAt(personId: string, version: string, generation?: number) {
  return resolveCharacterRecipe(
    {
      appearance: derivePersonAppearance(personId, version),
      poseFamily: "standing-neutral",
      unresolvableRequiredSlots: "diagnose",
      ...(generation === undefined ? {} : { catalogGeneration: generation }),
    },
    LIBRARY,
  );
}

describe("WEEKEND19 B: frozen generation 1 and additive candidates", () => {
  it("keeps the donor review membership as generation 1", () => {
    expect(LIBRARY.catalogGeneration).toBeGreaterThanOrEqual(1);
    const frozen = new Set(generation1.component_ids);
    for (const id of generation1.component_ids) {
      const component = LIBRARY.components.get(id);
      if (!component) continue;
      expect(component.definition.catalog_generation).toBe(
        CANDIDATE_REVIEW_GENERATION,
      );
    }
    for (const [id, component] of LIBRARY.components) {
      if (!frozen.has(id))
        expect(component.definition.catalog_generation).toBeGreaterThan(
          CANDIDATE_REVIEW_GENERATION,
        );
    }
  });

  it("replays a v1 person against generation 1 even after the library grows", () => {
    expect(
      resolveAppearanceCatalogGeneration(
        derivePersonAppearance("weekend19-legacy"),
        LIBRARY.catalogGeneration,
      ),
    ).toBe(CANDIDATE_REVIEW_GENERATION);
    const first = resolveAt(
      "weekend19-legacy",
      DEFAULT_APPEARANCE_RECIPE_VERSION,
    );
    const again = resolveAt(
      "weekend19-legacy",
      DEFAULT_APPEARANCE_RECIPE_VERSION,
      CANDIDATE_REVIEW_GENERATION,
    );
    expect(again.identity).toEqual(first.identity);
    expect(again.context.components.map((entry) => entry.assetId)).toEqual(
      first.context.components.map((entry) => entry.assetId),
    );
    for (const component of first.context.components) {
      expect(generation1.component_ids).toContain(component.assetId);
    }
  });

  it("lets a new v2 life use later membership without moving v1", () => {
    const legacy = resolveAt(
      "weekend19-new-life",
      DEFAULT_APPEARANCE_RECIPE_VERSION,
    );
    const next = resolveAt(
      "weekend19-new-life",
      COHERENT_APPEARANCE_RECIPE_VERSION,
    );
    expect(legacy.catalogGeneration).toBe(CANDIDATE_REVIEW_GENERATION);
    expect(next.catalogGeneration).toBe(LIBRARY.catalogGeneration);
    if (LIBRARY.catalogGeneration > CANDIDATE_REVIEW_GENERATION) {
      const newFamilies = [...LIBRARY.components.values()].filter(
        (component) =>
          component.definition.catalog_generation >
            CANDIDATE_REVIEW_GENERATION &&
          (component.definition.kind === "top" ||
            component.definition.kind === "bottom"),
      );
      expect(newFamilies.length).toBeGreaterThan(0);
    }
  });

  it("registers the arm-masked polo as a labelled candidate, not a production overwrite", () => {
    const masked = [...LIBRARY.components.values()].find(
      (component) =>
        component.assetId.includes("burgundy_short_sleeve_polo") &&
        component.assetId.includes("armmasked"),
    );
    const original = [...LIBRARY.components.values()].find(
      (component) =>
        component.assetId.includes("burgundy_short_sleeve_polo") &&
        !component.assetId.includes("armmasked") &&
        !component.assetId.includes("crossbody"),
    );
    if (LIBRARY.catalogGeneration === CANDIDATE_REVIEW_GENERATION) {
      expect(original).toBeUndefined();
      return;
    }
    expect(masked).toBeDefined();
    expect(masked!.definition.kind).toBe("top");
    expect(masked!.released).toBe(true);
    expect(masked!.definition.catalog_generation).toBeGreaterThan(
      CANDIDATE_REVIEW_GENERATION,
    );
    if (original) {
      expect(original.definition.catalog_generation).toBe(
        CANDIDATE_REVIEW_GENERATION,
      );
    }
  });
});
