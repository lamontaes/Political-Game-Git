import { describe, expect, it } from "vitest";

import { ANOTHER_TERM_DECISION } from "../../careers/another-term-decision";
import { personalityCataloguePack } from "../../personality-catalogue";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";

describe("facet-blunt decision effects", () => {
  it("gives a blunt person a direct reason to counter a contact", () => {
    const registry = loadTraitPacks(
      [personalityCataloguePack()],
      [CONTACT_ANSWER_DECISION, ANOTHER_TERM_DECISION],
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
