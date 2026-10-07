import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the playful manner trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("pulls the two poles toward different live outreach options", () => {
    const leans = leansForDecision(
      registry,
      "campaign.organizer-outreach",
    ).filter(({ trait }) => trait === "personality-v1:playful-manner");
    expect(leans).toMatchObject([
      { option: "town-hall", pole: "high" },
      { option: "phone-shift", pole: "low" },
    ]);
  });
});
