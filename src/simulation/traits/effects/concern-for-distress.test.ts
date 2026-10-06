import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the concern-for-distress trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("pulls the two poles toward different options", () => {
    const leans = leansForDecision(registry, "clemency.petition").filter(
      ({ trait }) => trait === "personality-v1:concern-for-distress",
    );
    expect(leans).toMatchObject([
      { option: "petition", pole: "high" },
      { option: "wait", pole: "low" },
    ]);
  });
});
