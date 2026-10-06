import { describe, expect, it } from "vitest";

import { personalityCataloguePack } from "../../personality-catalogue";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";
import { facetEnviousEffects } from "./facet-envious";
import { personalityTraitEffects } from ".";

describe("the envious trait reader", () => {
  it("is included by the shared personality-effect loader", () => {
    expect(personalityTraitEffects()).toContainEqual(facetEnviousEffects[0]);
  });

  it("registers a reason to accept contact", () => {
    const registry = loadTraitPacks(
      [personalityCataloguePack()],
      BUILT_IN_TRAIT_DECISIONS,
    );

    expect(registry.report.rejections).toEqual([]);
    expect(
      leansForDecision(registry, CONTACT_ANSWER_DECISION.id).filter(
        (lean) => lean.trait === "personality-v1:facet-envious",
      ),
    ).toEqual([
      expect.objectContaining({
        option: "accept",
        pole: "high",
        explanation:
          "They want to see where they stand beside the person asking.",
      }),
    ]);
  });
});
