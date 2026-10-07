import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";
import { facetDevotedEffects } from "./facet-devoted";

describe("the devoted trait reader", () => {
  it("loads its established-commitment lean against the catalog trait", () => {
    const registry = loadTraitPacks(
      [personalityCataloguePack()],
      BUILT_IN_TRAIT_DECISIONS,
    );

    expect(registry.report.rejections).toEqual([]);
    const devotedLeans = leansForDecision(
      registry,
      "people.couple-stage",
    ).filter(({ trait }) => trait === "personality-v1:facet-devoted");
    expect(devotedLeans).toHaveLength(1);
    expect(devotedLeans).toMatchObject([
      {
        option: "stay",
        trait: "personality-v1:facet-devoted",
        pole: "high",
      },
    ]);
    expect(
      facetDevotedEffects
        .flatMap(({ leans }) => leans)
        .every(({ pole }) => pole === "high"),
    ).toBe(true);
  });
});
