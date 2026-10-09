import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import { createDemoWorld } from "../scenarios/demo";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import {
  civicMessagesForPropositions,
  recordCivicMessage,
} from "./living-world/civic-actions";
import { memberVoteConsiderations } from "./legislative-member-decisions";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createPortabilityFixture } from "../scenarios/portability";
import { STATES } from "./state-reference";
import type { EntityId, PrivateBeliefRecord, World } from "./types";

const memberId = "person_member" as EntityId;
const measureId = "measure_formed_view" as EntityId;
const propositionId = "proposition_explicit_answer" as EntityId;

function belief(
  position: PrivateBeliefRecord["position"],
  sequence: number,
  formedAt = "2026-01-04",
): PrivateBeliefRecord {
  return {
    id: `belief_${sequence}` as EntityId,
    stableKey: `test:belief:${sequence}`,
    sequence,
    personId: memberId,
    propositionId,
    formedAt: makeIsoDate(formedAt),
    position,
    conviction: "strong",
    salience: "high",
    flexibility: "negotiable",
    rationale: null,
    formation: {
      reason: "experience:test",
      relevantEventIds: [],
      sourceFactIds: [],
      propositionExposureIds: [],
      memoryIds: [],
      eventKnowledgeIds: [],
      claimIds: [],
      relationshipInteractionIds: [],
      subjectKnowledgeIds: [],
      decisionTraceIds: [],
      cue: null,
      evidenceReference: null,
      note: null,
    },
    supersedesBeliefId: null,
  };
}

function worldWith(
  answer: "yes" | "no" | null,
  beliefs: readonly PrivateBeliefRecord[],
): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        [propositionId]: { question: "Should the state fund rural transit?" },
      },
    },
    history: {
      legislativeMeasures: [
        {
          id: measureId,
          stableKey: "test:measure",
          sponsorPersonId: null,
          propositionAnswers:
            answer === null ? [] : [{ propositionId, answer }],
        },
      ],
      legislativeProvisions: [],
      legislativeCommitments: [],
      privateBeliefs: beliefs,
      relationshipInteractions: [],
      events: [],
    },
  } as unknown as World;
}

function considerations(
  world: World,
  purpose: "floor-stage" | "amendment" = "floor-stage",
) {
  return memberVoteConsiderations(world, {
    stableKey: "test:vote",
    personId: memberId,
    question: {
      question: {
        measureId,
        purpose,
        forumKey: "house",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: "Pass this measure?",
    },
  }).filter((row) => row.sourceType === "belief:formed-position");
}

describe("member votes from formed views on an explicit bill answer", () => {
  it("cites the latest private belief and opposes a conflicting answer", () => {
    const rows = considerations(
      worldWith("no", [belief("oppose", 1), belief("support", 2)]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      optionKey: "vote-nay",
      importance: "strong",
      confidence: "high",
      sourceRefs: [{ kind: "private-belief", beliefId: "belief_2" }],
    });
    expect(
      considerations(worldWith("no", [belief("oppose", 1)]))[0],
    ).toMatchObject({ optionKey: "vote-yea" });
  });

  it("does not infer an answer from a named question or an unsettled view", () => {
    expect(considerations(worldWith(null, [belief("support", 1)]))).toEqual([]);
    expect(considerations(worldWith("yes", [belief("uncertain", 1)]))).toEqual(
      [],
    );
    expect(
      considerations(worldWith("yes", [belief("support", 1, "2026-01-06")])),
    ).toEqual([]);
  });

  it("does not project the current measure's answer onto an amendment", () => {
    expect(
      considerations(worldWith("yes", [belief("support", 1)]), "amendment"),
    ).toEqual([]);
  });
});

describe("member votes read what constituents made of an existing law", () => {
  const federal = NATIONAL_ELECTION_JURISDICTION.id;
  const lawId = "measure_existing_law" as EntityId;

  function withLaw(
    billAnswer: "yes" | "no",
    points: readonly number[],
    groupMembers = 0,
    jurisdictionId: EntityId = federal,
  ) {
    return {
      currentDate: makeIsoDate("2026-06-01"),
      policyCatalog: {
        propositions: {
          [propositionId]: { question: "Should the state fund rural transit?" },
        },
      },
      history: {
        legislativeMeasures: [
          {
            id: lawId,
            stableKey: "test:law",
            jurisdictionId,
            sponsorPersonId: null,
            propositionIds: [propositionId],
            propositionAnswers: [{ propositionId, answer: "yes" }],
          },
          {
            id: measureId,
            stableKey: "test:measure",
            jurisdictionId,
            sponsorPersonId: null,
            propositionIds: [propositionId],
            propositionAnswers: [{ propositionId, answer: billAnswer }],
          },
        ],
        legislativeEnactments: [
          {
            measureId: lawId,
            outcome: "enacted",
            sequence: 1,
            resolvedAt: makeIsoDate("2026-01-01"),
            effectiveAt: makeIsoDate("2026-01-01"),
          },
        ],
        officialViews: points.map((value, index) => ({
          officialId: memberId,
          measureId: lawId,
          points: value,
          personId: `person_${index}`,
        })),
        legislativeProvisions: [],
        legislativeCommitments: [],
        privateBeliefs: [],
        relationshipInteractions: [],
        events: [],
        organizations: groupMembers
          ? [{ id: "org_group", stableKey: `law-interest:town_x:${lawId}` }]
          : [],
        organizationParticipations: Array.from(
          { length: groupMembers },
          (_, index) => ({
            organizationId: "org_group",
            personId: `person_member_${index}`,
          }),
        ),
      },
    } as unknown as World;
  }

  function constituents(
    world: World,
    sourceType = "context:constituents-view",
  ) {
    return memberVoteConsiderations(world, {
      stableKey: "test:vote",
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
    }).filter((row) => row.sourceType === sourceType);
  }

  it("a member blamed for a law leans toward the bill that changes it, and away from one that keeps it", () => {
    expect(constituents(withLaw("no", [-20, -15]))).toMatchObject([
      { optionKey: "vote-yea", importance: "moderate" },
    ]);
    expect(constituents(withLaw("yes", [-20, -15]))).toMatchObject([
      { optionKey: "vote-nay" },
    ]);
  });

  it("credit argues for keeping the law, and a wash or no views adds nothing", () => {
    expect(constituents(withLaw("no", [10]))).toMatchObject([
      { optionKey: "vote-nay", importance: "slight" },
    ]);
    expect(constituents(withLaw("no", [10, -10]))).toEqual([]);
    expect(constituents(withLaw("no", []))).toEqual([]);
  });

  it("groups of people a law cost lobby every member to change it", () => {
    const lobby = (world: World) =>
      constituents(world, "context:organized-interest");
    expect(lobby(withLaw("no", [], 12))).toMatchObject([
      { optionKey: "vote-yea", importance: "moderate" },
    ]);
    expect(lobby(withLaw("yes", [], 3))).toMatchObject([
      { optionKey: "vote-nay", importance: "slight" },
    ]);
    expect(lobby(withLaw("no", [], 0))).toEqual([]);
  });

  it("routes real town messages to the state member across all 56 places", () => {
    const demo = createDemoWorld("b08-town-message-to-state-member");
    const [senderId, otherOfficialId] = demo.personOrder;
    const sender = demo.people[senderId!]!;
    const townId = sender.homeJurisdictionId;
    const proposition = Object.values(demo.policyCatalog.propositions)[0]!;
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const state = stateJurisdictionForKey(place.jurisdictionKey)!;
      const fixture = withLaw("yes", [], 0, state.id);
      let world: World = {
        ...demo,
        currentDate: fixture.currentDate,
        currentMoment: { ...demo.currentMoment, date: fixture.currentDate },
        jurisdictions: {
          ...demo.jurisdictions,
          [state.id]: state,
          [townId]: { ...demo.jurisdictions[townId]!, parentName: state.name },
        },
        jurisdictionOrder: [...demo.jurisdictionOrder, state.id],
        people: {
          ...demo.people,
          [memberId]: { ...demo.people[otherOfficialId!]!, id: memberId },
        },
        personOrder: [...demo.personOrder, memberId],
        policyCatalog: {
          ...demo.policyCatalog,
          propositions: {
            ...demo.policyCatalog.propositions,
            [propositionId]: {
              ...proposition,
              id: propositionId,
              stableKey: "test:civic-message-state-bill",
            },
          },
          propositionOrder: [
            ...demo.policyCatalog.propositionOrder,
            propositionId,
          ],
        },
        history: { ...demo.history, ...fixture.history },
      };
      const message = (
        stableKey: string,
        officialId: EntityId,
        stance: "yes" | "no",
      ) => {
        world = recordCivicMessage(world, {
          stableKey,
          jurisdictionId: townId,
          senderId: senderId!,
          officialId,
          propositionId,
          stance,
          channel: "call",
        });
        return world.history.events.at(-1)!;
      };
      message("test:earlier-message", memberId, "no");
      const current = message("test:current-message", memberId, "yes");
      message("test:other-recipient", otherOfficialId!, "no");
      expect(townId).not.toBe(state.id);
      expect(current.jurisdictionId).toBe(townId);
      expect(
        civicMessagesForPropositions(world, townId, [propositionId]).get(
          propositionId,
        ),
      ).toHaveLength(3);
      expect(
        civicMessagesForPropositions(world, state.id, [propositionId]).size,
      ).toBe(0);
      const reasons = constituents(world, "context:constituents");
      expect(reasons, place.jurisdictionKey).toHaveLength(1);
      expect(reasons[0], place.jurisdictionKey).toMatchObject({
        optionKey: "vote-yea",
        explanation: current.context.choice,
        sourceRefs: [{ kind: "historical-event", eventId: current.id }],
      });
      expect(reasons[0]!.explanation).not.toContain("constituents-calling");
    }
  });

  it("reads only recorded constituent messages sent to this member", () => {
    const withCalls = (
      billAnswer: "yes" | "no",
      messages: readonly {
        readonly id: string;
        readonly sender: string;
        readonly official: string;
        readonly stance: "yes" | "no";
        readonly salience: "low" | "moderate" | "high" | "central";
      }[],
      jurisdictionId: EntityId = federal,
    ) => {
      const base = withLaw(billAnswer, [], 0, jurisdictionId);
      const events = messages.map((message, index) => ({
        id: message.id,
        sequence: index + 1,
        type: "life.contacted-official",
        summary: "Recorded fixture constituent message.",
        occurredAt: makeIsoDate("2026-05-01"),
        jurisdictionId,
        participants: [
          { personId: message.sender as EntityId, role: "focus:subject" },
          { personId: message.official as EntityId, role: "focus:object" },
        ],
        tags: [
          "civic-message:v1",
          `message-proposition-id:${propositionId}`,
          `message-stance:${message.stance}`,
          "message-channel:call",
          `message-salience:${message.salience}`,
        ],
      }));
      return {
        ...base,
        history: { ...base.history, events },
      } as unknown as World;
    };
    const message = (
      id: string,
      sender: string,
      official: string,
      stance: "yes" | "no",
      salience: "low" | "moderate" | "high" | "central",
    ) => ({ id, sender, official, stance, salience });
    const calls = (world: World) =>
      memberVoteConsiderations(world, {
        stableKey: "test:vote",
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
      }).filter((row) =>
        row.stableKey.startsWith("member:constituents-calling:"),
      );

    expect(calls(withCalls("yes", []))).toEqual([]);
    expect(
      calls(
        withCalls("yes", [
          message(
            "message_other_member",
            "person_sender",
            "person_other",
            "yes",
            "central",
          ),
        ]),
      ),
    ).toEqual([]);
    expect(
      calls(
        withCalls("yes", [
          message("message_for", "person_supporter", memberId, "yes", "high"),
          message("message_against", "person_opponent", memberId, "no", "low"),
        ]),
      ),
    ).toMatchObject([
      {
        stableKey: "member:constituents-calling:for",
        optionKey: "vote-yea",
        sourceType: "context:constituents",
        importance: "moderate",
        sourceRefs: [
          { kind: "historical-event", eventId: "message_for" },
          { kind: "historical-event", eventId: "message_against" },
        ],
      },
    ]);
    expect(
      calls(
        withCalls("no", [
          message("message_for", "person_supporter", memberId, "yes", "high"),
        ]),
      ),
    ).toMatchObject([{ optionKey: "vote-nay" }]);
    const places = Object.keys(STATES);
    expect(places).toHaveLength(56);
    for (const usps of places) {
      const place = `jurisdiction:${usps}` as EntityId;
      expect(
        calls(
          withCalls(
            "yes",
            [
              message(
                `message_${usps}`,
                `supporter_${usps}`,
                memberId,
                "yes",
                "moderate",
              ),
            ],
            place,
          ),
        ),
      ).toMatchObject([
        {
          stableKey: "member:constituents-calling:for",
          sourceRefs: [
            { kind: "historical-event", eventId: `message_${usps}` },
          ],
        },
      ]);
    }
  });
});

describe("member votes read what the member owes the bill's sponsor", () => {
  const eventId = "event_appointed" as EntityId;

  /** A made-up town's people, one of them carrying a bill the other votes on. */
  function owingWorld(owes: boolean) {
    const fixture = createPortabilityFixture();
    const [member, sponsor] = fixture.personOrder as EntityId[];
    const base = worldWith(null, []) as unknown as {
      history: Record<string, unknown>;
    } & World;
    const measures = base.history.legislativeMeasures as readonly object[];
    const world = {
      ...fixture,
      currentDate: base.currentDate,
      policyCatalog: base.policyCatalog,
      history: {
        ...fixture.history,
        ...base.history,
        legislativeMeasures: [{ ...measures[0], sponsorPersonId: sponsor }],
        favors: owes
          ? [
              {
                id: "favor_appointed" as EntityId,
                stableKey: "test:favor",
                sequence: 1,
                giverPersonId: sponsor,
                receiverPersonId: member,
                kind: "public:appointment",
                description: "named them to the seat",
                givenAt: makeIsoDate("2025-12-01"),
                eventId,
                subject: { kind: "none" },
                motive: "trade",
                weight: "life-changing",
                audience: "public",
                witnessPersonIds: [],
                inReturnForFavorId: null,
                undertakingId: null,
              },
            ]
          : [],
      },
    } as unknown as World;
    return { world, member: member! };
  }

  function owed(owes: boolean) {
    const { world, member } = owingWorld(owes);
    return memberVoteConsiderations(world, {
      stableKey: "test:vote",
      personId: member,
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
    }).filter((row) => row.stableKey === "member:owes-sponsor");
  }

  it("a member the sponsor appointed leans toward the sponsor's bill, citing the appointment", () => {
    const [row] = owed(true);
    expect(row).toMatchObject({
      optionKey: "vote-yea",
      direction: "supports",
      importance: "strong",
      sourceRefs: [{ kind: "historical-event", eventId }],
    });
  });

  it("owes nothing to a sponsor who never helped them", () => {
    expect(owed(false)).toEqual([]);
  });
});
