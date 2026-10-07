import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the facet-sassy trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("adds a reason to dispute a press account", () => {
    expect(
      leansForDecision(registry, "press.subject-response").filter(
        ({ trait }) => trait === "personality-v1:facet-sassy",
      ),
    ).toMatchObject([{ option: "dispute", pole: "high" }]);
  });
});
