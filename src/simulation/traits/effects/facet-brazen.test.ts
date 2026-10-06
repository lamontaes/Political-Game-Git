import { describe, expect, it } from "vitest";

import { CATALOGUE_SCALES } from "../../personality-catalogue.generated";
import { personalityCataloguePack } from "../../personality-catalogue";
import { loadTraitPacks, type DecisionDeclaration } from "../../trait-packs";
import { ANOTHER_TERM_DECISION } from "../../careers/another-term-decision";
import { facetBrazenEffects } from "./facet-brazen";
import { personalityTraitEffects } from ".";

const MOGUL_APPROACH: DecisionDeclaration = {
  id: "mogul.approach",
  scope: "governing:conversation",
  options: ["donate", "deal", "wait"],
};

describe("the brazen trait reader", () => {
  it("loads its argument through the shared effect loader", () => {
    expect(personalityTraitEffects()).toContainEqual(facetBrazenEffects[0]);

    const registry = loadTraitPacks(
      [personalityCataloguePack()],
      [ANOTHER_TERM_DECISION, MOGUL_APPROACH],
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
