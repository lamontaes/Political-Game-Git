import { describe, expect, it } from "vitest";

import { personalityCataloguePack } from "../../personality-catalogue";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("facet-blunt decision effects", () => {
  it("gives a blunt person a direct reason to counter a contact", () => {
    const registry = loadTraitPacks(
      [personalityCataloguePack()],
      BUILT_IN_TRAIT_DECISIONS,
    );

    expect(registry.report.rejections).toEqual([]);
    expect(
      leansForDecision(registry, CONTACT_ANSWER_DECISION.id),
    ).toContainEqual({
      option: "counter",
      trait: "personality-v1:facet-blunt",
      pole: "high",
      explanation: "They say plainly what would need to change.",
    });
  });
});
