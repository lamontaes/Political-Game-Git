import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the patience trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("makes patient and impatient workers lean opposite ways on quitting", () => {
    const leans = leansForDecision(registry, "labor.worker-quit").filter(
      ({ trait }) => trait === "personality-v1:patience",
    );
    expect(leans).toMatchObject([
      { option: "continue-work", pole: "high" },
      { option: "quit", pole: "low" },
    ]);
  });
});
