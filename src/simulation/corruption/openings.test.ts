import { describe, expect, it } from "vitest";
import type { PersonnelClassContext } from "../civil-personnel-contract";
import { createPortabilityFixture } from "../portability-fixture";
import type { DecisionConsideration } from "../types";
import {
  contractSteeringActInput,
  contractPurchaseCanOpenMisconduct,
  evaluateCorruptionOpening,
  protectedPatronageIsEligible,
  undisclosedConflictIsEligible,
} from "./openings";

const considerations: readonly DecisionConsideration[] = [
  {
    stableKey: "test:chosen-tie",
    optionKey: "person:chosen",
    sourceType: "social:relationship",
    direction: "supports",
    importance: "moderate",
    confidence: "high",
    explanation: "The appointer knows the chosen person.",
    sourceRefs: [],
  },
  {
    stableKey: "test:merit-rival",
    optionKey: "person:rival",
    sourceType: "context:public-record",
    direction: "supports",
    importance: "strong",
    confidence: "high",
    explanation: "The rival has the stronger recorded merits.",
    sourceRefs: [],
  },
];

const mnClassifiedPost: PersonnelClassContext = {
  jurisdictionKey: "US-FEDERAL",
  employerLevel: "federal",
  civilClass: "competitive",
  tenure: "permanent",
  bargainingCoverage: "excluded",
  collectiveAgreement: "not-covered",
};

describe("corruption opening seams", () => {
  it("accepts only completed named purchases with an actual resource flow", () => {
    expect(contractPurchaseCanOpenMisconduct(null)).toBe(false);
    expect(
      contractPurchaseCanOpenMisconduct({
        status: "completed",
        resourceFlowId: "flow:one" as never,
        programKey: "road-repair",
        businessId: "business:one" as never,
        awardingOfficialIds: ["person:official" as never],
        handledByPersonIds: ["person:clerk" as never],
        vendorParticipantPersonIds: ["person:vendor" as never],
        jurisdictionId: "jurisdiction:mn" as never,
        occurredAt: "2025-01-01",
      }),
    ).toBe(true);
    expect(
      contractPurchaseCanOpenMisconduct({
        status: "completed",
        resourceFlowId: null as never,
        programKey: "road-repair",
        businessId: "business:one" as never,
        awardingOfficialIds: ["person:official" as never],
        handledByPersonIds: [],
        vendorParticipantPersonIds: ["person:vendor" as never],
        jurisdictionId: "jurisdiction:mn" as never,
        occurredAt: "2025-01-01",
      }),
    ).toBe(false);
  });

  it("requires sourced appointment protection and a personal choice over merit", () => {
    expect(
      protectedPatronageIsEligible({
        context: mnClassifiedPost,
        asOfDate: "2026-10-01",
        considerations,
        chosenOptionKey: "person:chosen",
      }),
    ).toBe(true);
    expect(
      protectedPatronageIsEligible({
        context: {
          ...mnClassifiedPost,
          jurisdictionKey: "US-MN",
          employerLevel: "local",
        },
        asOfDate: "2026-10-01",
        considerations,
        chosenOptionKey: "person:chosen",
      }),
    ).toBe(false);
    expect(
      protectedPatronageIsEligible({
        context: mnClassifiedPost,
        asOfDate: "2026-10-01",
        considerations: [],
        chosenOptionKey: "person:chosen",
      }),
    ).toBe(false);
  });

  it("requires a recorded matching interest and no disclosure filing", () => {
    const interest = {
      interestRecordId: "ownership:one" as never,
      interestEntityId: "business:road-builder" as never,
      measureInterestEntityId: "business:road-builder" as never,
      disclosureArtifactId: null,
    };
    expect(undisclosedConflictIsEligible(interest)).toBe(true);
    expect(
      undisclosedConflictIsEligible({
        ...interest,
        measureInterestEntityId: "business:other" as never,
      }),
    ).toBe(false);
    expect(
      undisclosedConflictIsEligible({
        ...interest,
        disclosureArtifactId: "artifact:disclosure" as never,
      }),
    ).toBe(false);
  });

  it("evaluates an NPC opening deterministically without close-choice noise", () => {
    const world = createPortabilityFixture();
    const actorPersonId = world.personOrder[0]!;
    const input = {
      stableKey: "test:opening",
      actorPersonId,
      subjectKey: "state-contract-authority",
      options: [
        { key: "decline", label: "Decline", description: "Decline." },
        { key: "steer", label: "Steer", description: "Steer." },
      ],
      considerations: [],
    };
    const first = evaluateCorruptionOpening(world, input);
    const replay = evaluateCorruptionOpening(world, input);
    expect(first).toEqual(replay);
    expect(first.context.randomness).toBe("none");
  });

  it("turns a selected steering choice and completed purchase into shared-writer input", () => {
    const world = createPortabilityFixture();
    const officialId = world.personOrder[0]!;
    const purchase = {
      status: "completed" as const,
      resourceFlowId: "flow:purchase" as never,
      programKey: "road-repair",
      businessId: "business:one" as never,
      awardingOfficialIds: [officialId],
      handledByPersonIds: [world.personOrder[1]!],
      vendorParticipantPersonIds: [world.personOrder[2]!],
      jurisdictionId: "jurisdiction:mn" as never,
      occurredAt: "2026-10-01",
    };
    const decision = {
      ...evaluateCorruptionOpening(world, {
        stableKey: "test:recordable-opening",
        actorPersonId: officialId,
        subjectKey: "state-contract-authority",
        options: [
          { key: "decline", label: "Decline", description: "Decline." },
          { key: "steer", label: "Steer", description: "Steer." },
        ],
        considerations: [],
      }),
      selectedOptionKey: "steer",
      outcomeKind: "selected" as const,
    };
    const input = contractSteeringActInput({
      stableKey: "test:steered-award",
      purchase,
      decision,
      steeringOptionKey: "steer",
    });
    expect(input?.family).toBe("M8");
    expect(input?.relatedEntityIds).toContain(purchase.resourceFlowId);
    expect(input?.participantPersonIds).toHaveLength(3);
    expect(input?.artifacts[0]?.evidenceKind).toBe("record:contract-award");
    expect(
      contractSteeringActInput({
        stableKey: "test:no-selected-steering",
        purchase,
        decision: { ...decision, selectedOptionKey: "decline" },
        steeringOptionKey: "steer",
      }),
    ).toBeNull();
  });
});
