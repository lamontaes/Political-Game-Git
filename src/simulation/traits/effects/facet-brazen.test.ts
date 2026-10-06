import { describe, expect, it } from "vitest";

import { CATALOGUE_SCALES } from "../../personality-catalogue.generated";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { loadTraitPacks } from "../../trait-packs";
import { facetBrazenEffects } from "./facet-brazen";
import { personalityTraitEffects } from ".";

describe("the brazen trait reader", () => {
  it("loads its argument through the shared effect loader", () => {
    expect(personalityTraitEffects()).toContainEqual(facetBrazenEffects[0]);

    const registry = loadTraitPacks(
      [personalityCataloguePack()],
      BUILT_IN_TRAIT_DECISIONS,
    );
    expect(registry.report.rejections).toEqual([]);
    expect(registry.leans.get("mogul.approach")).toContainEqual({
      option: "deal",
      trait: "personality-v1:facet-brazen",
      pole: "high",
      explanation:
        "They are not easily checked by the embarrassment of making an audacious offer.",
    });
  });

  it("keeps the catalog meaning and the decision argument aligned", () => {
    const brazen = CATALOGUE_SCALES.find(({ key }) => key === "facet-brazen");
    expect(brazen?.meaning).toContain("social audacity or embarrassment");
    expect(facetBrazenEffects[0]?.leans).toHaveLength(1);
  });
});
