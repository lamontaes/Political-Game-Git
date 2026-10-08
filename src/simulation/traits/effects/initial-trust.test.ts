import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the initial trust trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("makes trusting and suspicious people answer a contact differently", () => {
    const leans = leansForDecision(registry, "contact.answer").filter(
      ({ trait }) => trait === "personality-v1:initial-trust",
    );
    expect(leans).toMatchObject([
      { option: "accept", pole: "high" },
      { option: "counter", pole: "low" },
    ]);
  });
});
