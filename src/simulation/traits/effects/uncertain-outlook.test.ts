import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the uncertain-outlook trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("pulls the two poles toward different options", () => {
    const leans = leansForDecision(
      registry,
      "career.consider-another-term",
    ).filter(({ trait }) => trait === "personality-v1:uncertain-outlook");
    expect(leans).toMatchObject([
      { option: "seek", pole: "high" },
      { option: "step-down", pole: "low" },
    ]);
  });
});
