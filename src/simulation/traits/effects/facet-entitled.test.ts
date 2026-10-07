import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the entitled facet reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("leans toward individualized candidate guidance during outreach", () => {
    expect(
      leansForDecision(registry, "campaign.organizer-outreach").filter(
        ({ trait }) => trait === "personality-v1:facet-entitled",
      ),
    ).toMatchObject([{ option: "candidate-guidance", pole: "high" }]);
  });
});
