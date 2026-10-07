import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the facet-smug trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("adds a reason to accept a reporter's request", () => {
    expect(
      leansForDecision(registry, "press.reporter-request-response").filter(
        ({ trait }) => trait === "personality-v1:facet-smug",
      ),
    ).toMatchObject([{ option: "accept", pole: "high" }]);
  });
});
