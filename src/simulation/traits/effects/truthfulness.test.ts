import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the truthfulness trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("weighs truthful restraint and unsupported denial differently", () => {
    const leans = leansForDecision(registry, "press.subject-response").filter(
      ({ trait }) => trait === "personality-v1:truthfulness",
    );
    expect(leans).toMatchObject([
      { option: "decline", pole: "high" },
      { option: "dispute", pole: "low" },
    ]);
  });
});
