import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the tactful facet reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("leans toward a private phone shift during outreach", () => {
    expect(
      leansForDecision(registry, "campaign.organizer-outreach").filter(
        ({ trait }) => trait === "personality-v1:facet-tactful",
      ),
    ).toMatchObject([{ option: "phone-shift", pole: "high" }]);
  });
});
