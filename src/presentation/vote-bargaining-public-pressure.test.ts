import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../simulation/dates";
import { memberVoteConsiderations } from "../simulation/legislative-member-decisions";
import { recordConstituentContact } from "../simulation/governing/public-pressure-channels";
import { createPortabilityFixture } from "../simulation/portability-fixture";
import { createLegislativeScenario } from "../simulation/legislation-scenarios";
import { CONSTITUENT_CONTACT_TAGS } from "../simulation/governing/public-pressure-channels";
import type { EntityId, World } from "../simulation/types";

const measureId = "legislative-measure_public_pressure" as EntityId;

function worldWithContacts(directions: readonly ("yea" | "nay")[]): {
  readonly world: World;
  readonly memberId: EntityId;
} {
  const fixture = createPortabilityFixture();
  const [memberId, sponsorId] = fixture.personOrder as EntityId[];
  const events = directions.map((direction, index) => ({
    id: `event_contact_${index}` as EntityId,
    tags: [
      CONSTITUENT_CONTACT_TAGS.event,
      CONSTITUENT_CONTACT_TAGS.forMeasure(measureId),
      direction === "yea"
        ? CONSTITUENT_CONTACT_TAGS.forVote
        : CONSTITUENT_CONTACT_TAGS.againstVote,
    ],
    participants: [
      {
        personId: memberId!,
        role: CONSTITUENT_CONTACT_TAGS.targetRole,
        detail: null,
      },
    ],
  }));
  const world = {
    ...fixture,
    currentDate: makeIsoDate("2026-07-02"),
    history: {
      ...fixture.history,
      legislativeMeasures: [
        {
          id: measureId,
          stableKey: "test:public-pressure-measure",
          sponsorPersonId: sponsorId!,
        },
      ],
      legislativeProvisions: [],
      legislativeCommitments: [],
      legislativeVotes: [],
      events,
      knowledge: events.map((event) => ({
        id: `knowledge_${event.id}` as EntityId,
        personId: memberId!,
        eventId: event.id,
        learnedAt: makeIsoDate("2026-07-02"),
        believedSummary: "A constituent contacted the member.",
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      })),
    },
  } as unknown as World;
  return { world, memberId: memberId! };
}

function contactReason(world: World, memberId: EntityId) {
  return memberVoteConsiderations(world, {
    stableKey: "test:public-pressure-vote",
    personId: memberId,
    question: {
      question: {
        measureId,
        purpose: "floor-stage",
        forumKey: "house",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: "Pass this measure?",
    },
  }).find(
    (row) => row.stableKey === `member:constituent-contacts:${measureId}`,
  );
}

describe("recorded constituent contacts in member vote reasons", () => {
  it("adds no reason when no constituent contacted the member", () => {
    const { world, memberId } = worldWithContacts([]);
    expect(contactReason(world, memberId)).toBeUndefined();
  });

  it("cites the recorded contacts and carries their prevailing direction", () => {
    const { world, memberId } = worldWithContacts(["yea", "yea", "nay"]);
    expect(contactReason(world, memberId)).toMatchObject({
      optionKey: "vote-yea",
      sourceType: "context:constituent-contact",
      sourceRefs: [
        { kind: "historical-event", eventId: "event_contact_0" },
        { kind: "historical-event", eventId: "event_contact_1" },
        { kind: "historical-event", eventId: "event_contact_2" },
      ],
    });
  });

  it("records the direct contact as member knowledge and schedules the existing belief reflection", () => {
    const scenario = createLegislativeScenario("nebraska");
    const [advocateId, memberId] = scenario.world.personOrder as EntityId[];
    const measure = scenario.world.history.legislativeMeasures!.find(
      (record) => record.id === scenario.measureId,
    )!;
    const propositionId = Object.keys(
      scenario.world.policyCatalog.propositions,
    )[0] as EntityId;
    const reached = recordConstituentContact(scenario.world, {
      stableKey: "test:recorded-constituent-contact",
      measureId: scenario.measureId,
      propositionId,
      advocatePersonId: advocateId!,
      memberPersonId: memberId!,
      direction: "yea",
      occurredAt: scenario.world.currentDate,
      jurisdictionId: measure.jurisdictionId,
      measureLabel: "the transit bill",
    });
    const contact = reached.history.events.at(-1)!;
    expect(reached.history.knowledge).toContainEqual(
      expect.objectContaining({ personId: memberId, eventId: contact.id }),
    );
    expect(reached.history.propositionExposures).toContainEqual(
      expect.objectContaining({ personId: memberId, propositionId }),
    );
  });
});
