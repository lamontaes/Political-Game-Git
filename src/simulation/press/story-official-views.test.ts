import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { appendEventKnowledgeRecord } from "../history";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { projectCongress } from "../living-world/congress";
import { lifePlaceStateIdentities } from "../life-places";
import { viewOfOfficial } from "../official-view-reads";
import {
  createFormationContext,
  recordPrivateBelief,
  recordPublicPosition,
} from "../politics";
import { publishPublicEvent } from "../public-information";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
  PRESS_STORY_OUTLET_TAG,
} from "../public-information-integrity";
import { recordEventKnowledge } from "../records";
import type { KnowledgeConfidence } from "../types";
import { recordWorldEvent } from "../world";
import {
  ensurePressLocalCoverage,
  mediaOutlets,
  recordStoryLead,
} from "./index";
import { formOfficialViewsFromStory } from "./story-official-views";

function publishedQuote(
  place: string,
  confidence: KnowledgeConfidence = "high",
  stance: "support" | "oppose" = "support",
  deferred = false,
  office: "governor" | "congress" = "governor",
) {
  const small = smallWorld({
    place,
    seed: `story-official-view:${place}`,
    offices: [office],
  });
  let world = small.world;
  const member =
    office === "congress"
      ? projectCongress(world)!.house.seats.find(
          (seat) => seat.occupant.kind === "member",
        )!.occupant
      : null;
  const officialId =
    member?.kind === "member"
      ? member.member.personId
      : governorOfficeForJurisdiction(world, small.place.stateJurisdictionKey!)!
          .holderPersonId;
  const readerId = world.personOrder.find(
    (id) => id !== small.personId && id !== officialId,
  )!;
  const nonreaderId = world.personOrder.find(
    (id) => id !== small.personId && id !== officialId && id !== readerId,
  )!;
  const propositionId = world.policyCatalog.propositionOrder[0]!;
  const proposition = world.policyCatalog.propositions[propositionId]!;
  for (const personId of [readerId, nonreaderId])
    world = recordPrivateBelief(world, {
      stableKey: `story-view:held:${personId}`,
      personId,
      propositionId,
      formedAt: world.currentDate,
      position: "support",
      conviction: "settled",
      salience: "central",
      flexibility: "firm",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
  world = recordWorldEvent(world, {
    stableKey: "story-view:official-statement",
    type: "test.official-statement",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: small.stateJurisdictionId,
    involvedEntityIds: [officialId],
    participants: [
      { personId: officialId, role: "agency:speaker", detail: null },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: proposition.question,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const basis = world.history.events.at(-1)!;
  world = recordPublicPosition(world, {
    stableKey: "story-view:position",
    personId: officialId,
    propositionId,
    statedAt: world.currentDate,
    stance,
    statement: proposition.question,
    audience: "public",
    venue: null,
    sourceEventId: basis.id,
    supersedesPublicPositionId: null,
  });
  world = ensurePressLocalCoverage(world, small.personId);
  const outlet = mediaOutlets(world).find((row) => row.scope === "local")!;
  const led = recordStoryLead(world, {
    stableKey: "story-view:lead",
    outletId: outlet.id,
    family: "press-request",
    route: "press-release",
    basisEventIds: [basis.id],
    subjectPersonIds: [officialId],
    jurisdictionId: small.stateJurisdictionId,
    matterId: null,
    followsPublicationId: null,
  });
  world = recordWorldEvent(led.world, {
    stableKey: "story-view:published-story",
    type: PRESS_STORY_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: small.stateJurisdictionId,
    involvedEntityIds: [officialId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `${PRESS_STORY_LEAD_TAG}${led.lead.id}`,
      `${PRESS_STORY_OUTLET_TAG}${outlet.id}`,
    ],
    summary: basis.summary,
    context: {
      location: null,
      socialContext: basis.summary,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const story = world.history.events.at(-1)!;
  world = publishPublicEvent(world, {
    stableKey: "story-view:publication",
    sourceEventId: story.id,
    outletId: outlet.id,
  });
  const publication = world.history.publications!.at(-1)!;
  const knowledgeInput = {
    stableKey: "story-view:reader",
    personId: readerId,
    eventId: story.id,
    learnedAt: world.currentDate,
    believedSummary: publication.body,
    accuracy: "accurate" as const,
    confidence,
    source: {
      kind: "media" as const,
      outlet: publication.outletName,
      reference: publication.id,
    },
  };
  // A deferred fixture represents an old save with knowledge but no reflection.
  world = deferred
    ? {
        ...world,
        history: appendEventKnowledgeRecord(
          world.history,
          world.id,
          knowledgeInput,
        ),
      }
    : recordEventKnowledge(world, knowledgeInput);
  return {
    world,
    knowledge: world.history.knowledge.find(
      (row) => row.stableKey === knowledgeInput.stableKey,
    )!,
    readerId,
    nonreaderId,
    officialId,
    propositionId,
  };
}

describe("published official acts inform their actual readers", () => {
  it("reads a legislator's recorded public position through the same knowledge writer", () => {
    const setup = publishedQuote(
      lifePlaceStateIdentities()[0]!.jurisdictionKey,
      "high",
      "support",
      false,
      "congress",
    );
    expect(
      viewOfOfficial(setup.world, setup.readerId, setup.officialId).belief
        ?.position,
    ).toBe("support");
    expect(
      viewOfOfficial(setup.world, setup.nonreaderId, setup.officialId).belief,
    ).toBeNull();
  });
  it("uses the same knowledge-to-view path in all 56 jurisdictions and leaves nonreaders alone", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const setup = publishedQuote(place.jurisdictionKey);
      const next = setup.world;
      expect(
        viewOfOfficial(next, setup.readerId, setup.officialId).belief?.position,
        place.jurisdictionKey,
      ).toBe("support");
      expect(
        viewOfOfficial(next, setup.nonreaderId, setup.officialId).belief,
      ).toBeNull();
      const trace = next.history.decisionTraces.find((row) =>
        row.stableKey.startsWith(`official-view:story:${setup.knowledge.id}:`),
      )!;
      expect(trace).toBeDefined();
      expect(formOfficialViewsFromStory(next, setup.knowledge.id)).toBe(next);
    }
  }, 30000);

  it("carries recorded knowledge confidence into the shared decision rather than inventing outlet trust", () => {
    const place = lifePlaceStateIdentities()[0]!.jurisdictionKey;
    for (const confidence of ["low", "medium", "high"] as const) {
      const setup = publishedQuote(place, confidence);
      const next = formOfficialViewsFromStory(setup.world, setup.knowledge.id);
      const trace = next.history.decisionTraces.find((row) =>
        row.stableKey.startsWith(`official-view:story:${setup.knowledge.id}:`),
      )!;
      const reasons = trace.context.considerations.filter(
        (row) => row.sourceType === "information:published-official-act",
      );
      expect(reasons.length).toBeGreaterThan(0);
      for (const reason of reasons) {
        expect(reason.confidence).toBe(confidence);
        expect(reason.sourceRefs).toContainEqual({
          kind: "event-knowledge",
          knowledgeId: setup.knowledge.id,
        });
      }
    }
  });

  it("forms opposition from a reported act against the reader's held view", () => {
    const setup = publishedQuote(
      lifePlaceStateIdentities()[0]!.jurisdictionKey,
      "high",
      "oppose",
    );
    const next = formOfficialViewsFromStory(setup.world, setup.knowledge.id);
    expect(
      viewOfOfficial(next, setup.readerId, setup.officialId).belief?.position,
    ).toBe("oppose");
  });

  it("uses the view held when the story was learned rather than a later same-day belief", () => {
    const setup = publishedQuote(
      lifePlaceStateIdentities()[0]!.jurisdictionKey,
      "high",
      "support",
      true,
    );
    const held = setup.world.history.privateBeliefs.find(
      (row) =>
        row.personId === setup.readerId &&
        row.propositionId === setup.propositionId,
    )!;
    const later = recordPrivateBelief(setup.world, {
      stableKey: "story-view:later-belief",
      personId: setup.readerId,
      propositionId: setup.propositionId,
      formedAt: setup.world.currentDate,
      position: "oppose",
      conviction: "settled",
      salience: "central",
      flexibility: "firm",
      rationale: null,
      formation: createFormationContext("reflection:later"),
      supersedesBeliefId: held.id,
    });
    const next = formOfficialViewsFromStory(later, setup.knowledge.id);
    expect(
      viewOfOfficial(next, setup.readerId, setup.officialId).belief?.position,
    ).toBe("support");
  });

  it("requires the publication's actual story knowledge and preserves player opinion choice", () => {
    const setup = publishedQuote(
      lifePlaceStateIdentities()[0]!.jurisdictionKey,
      "high",
      "support",
      true,
    );
    const controlled = {
      ...setup.world,
      control: { kind: "person" as const, personId: setup.readerId },
    };
    expect(formOfficialViewsFromStory(controlled, setup.knowledge.id)).toBe(
      controlled,
    );
    const noReference = {
      ...setup.world,
      history: {
        ...setup.world.history,
        knowledge: setup.world.history.knowledge.map((row) =>
          row.id === setup.knowledge.id
            ? {
                ...row,
                source: {
                  kind: "media" as const,
                  outlet: row.source.kind === "media" ? row.source.outlet : "",
                  reference: null,
                },
              }
            : row,
        ),
      },
    };
    expect(formOfficialViewsFromStory(noReference, setup.knowledge.id)).toBe(
      noReference,
    );
  });
});
