import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the self-serving facet reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("leans toward leaving an optional outreach activity for later", () => {
    expect(
      leansForDecision(registry, "campaign.organizer-outreach").filter(
        ({ trait }) => trait === "personality-v1:facet-self-serving",
      ),
    ).toMatchObject([{ option: "not-now", pole: "high" }]);
  });
});
