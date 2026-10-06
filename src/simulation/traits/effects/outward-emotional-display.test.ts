import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the outward-emotional-display trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("pulls the two poles toward different options", () => {
    const leans = leansForDecision(
      registry,
      "press.reporter-request-response",
    ).filter(
      ({ trait }) => trait === "personality-v1:outward-emotional-display",
    );
    expect(leans).toMatchObject([
      { option: "accept", pole: "high" },
      { option: "decline", pole: "low" },
    ]);
  });
});
