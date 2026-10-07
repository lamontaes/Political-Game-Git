import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

const TRAIT_ID = "personality-v1:facet-closeness-seeking";

describe("the closeness-seeking trait reader", () => {
  it("weighs a close-bond proposal toward accepting shared time", () => {
    const registry = loadTraitPacks(
      [personalityCataloguePack()],
      BUILT_IN_TRAIT_DECISIONS,
    );

    expect(registry.report.rejections).toEqual([]);
    expect(
      leansForDecision(registry, "people.couple-answer").filter(
        ({ trait }) => trait === TRAIT_ID,
      ),
    ).toMatchObject([{ option: "accept", trait: TRAIT_ID, pole: "high" }]);
  });
});
