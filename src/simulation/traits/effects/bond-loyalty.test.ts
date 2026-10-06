import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("the bond loyalty trait reader", () => {
  const registry = loadTraitPacks(
    [personalityCataloguePack()],
    BUILT_IN_TRAIT_DECISIONS,
  );

  it("loads without rejections", () => {
    expect(registry.report.rejections).toEqual([]);
  });

  it("makes loyal and disloyal people lean opposite ways in the couple's choice", () => {
    const leans = leansForDecision(registry, "people.couple-stage").filter(
      ({ trait }) => trait === "personality-v1:bond-loyalty",
    );
    expect(leans).toMatchObject([
      { option: "stay", pole: "high" },
      { option: "break-up", pole: "low" },
    ]);
  });
});
