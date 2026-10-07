import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the imaginative facet reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("leans toward guidance that explores new possibilities", () => {
    expect(
      leansForDecision(registry, "campaign.organizer-outreach").filter(
        ({ trait }) => trait === "personality-v1:facet-imaginative",
      ),
    ).toMatchObject([{ option: "candidate-guidance", pole: "high" }]);
  });
});
