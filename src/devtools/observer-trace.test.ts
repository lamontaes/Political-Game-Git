import { describe, expect, it } from "vitest";

import { projectConversationObserverTrace } from "./observer-trace";
import type { ConversationObserverTrace } from "./observer-trace";
import { buildTraceIndex } from "./trace-index";
import { createCausalTraceFixture } from "./trace-fixture";
import type { CausalTraceFixture } from "./trace-fixture";
import { walkTrace } from "./trace-walk";

function traceTurn(
  fixture: CausalTraceFixture,
  turnIndex: number,
): ConversationObserverTrace {
  const turn = fixture.turns[turnIndex];
  if (!turn) throw new Error(`The fixture ran no turn ${turnIndex + 1}.`);
  return projectConversationObserverTrace(fixture.world, {
    eventId: turn.eventId,
    declaredPresence: {
      basis: "the scene's recorded physical presence set",
      personIds: fixture.room.physicallyPresentPersonIds,
      note: "Supplied by the conversation room context, not by the event record.",
    },
    historySpan: turn.historySpan,
  });
}

const normal = createCausalTraceFixture("normal");
const quiet = createCausalTraceFixture("quiet");

describe("who actually heard it", () => {
  const normalFirst = traceTurn(normal, 0);
  const quietFirst = traceTurn(quiet, 0);

  it("records a claim in both runs, so the difference is not that nobody spoke", () => {
    expect(normalFirst.claims).toHaveLength(1);
    expect(quietFirst.claims).toHaveLength(1);
  });

  it("resolves a different listener set under quiet than under normal", () => {
    const normalListeners = normal.turns[0]?.semantic.actualListenerPersonIds;
    const quietListeners = quiet.turns[0]?.semantic.actualListenerPersonIds;
    expect(normalListeners).toContain(normal.briefingLeadPersonId);
    expect(quietListeners).not.toContain(quiet.briefingLeadPersonId);
    expect(quietListeners).toContain(quiet.referralVerifierPersonId);
  });

  it("writes the briefing lead a knowledge record under normal and none under quiet", () => {
    expect(
      normalFirst.claimRecipientPersonIds,
      "the briefing lead received the claim when it was audible",
    ).toContain(normal.briefingLeadPersonId);
    expect(
      quietFirst.claimRecipientPersonIds,
      "the briefing lead received nothing when it was not",
    ).not.toContain(quiet.briefingLeadPersonId);
  });

  it("names the claim and the knowledge record each acquisition came from", () => {
    const claimId = normalFirst.claims[0]?.claimId;
    expect(claimId).toBeDefined();
    for (const acquisition of normalFirst.claimKnowledge) {
      expect(acquisition.sourceKind).toBe("told-by");
      expect(acquisition.sourceClaimId).toBe(claimId);
      expect(acquisition.sourcePersonId).toBe(
        normalFirst.claims[0]?.speakerPersonId,
      );
    }
  });

  it("shows a perception forming only through a recorded heard-claim link", () => {
    const claimId = normalFirst.claims[0]?.claimId;
    const leadPerception = normalFirst.perceptions.find(
      (perception) => perception.personId === normal.briefingLeadPersonId,
    );
    expect(leadPerception).toBeDefined();
    expect(leadPerception?.viaClaimId).toBe(claimId);
    expect(
      normalFirst.claimKnowledge.some(
        (acquisition) =>
          acquisition.knowledgeId === leadPerception?.viaKnowledgeId,
      ),
    ).toBe(true);

    expect(
      quietFirst.perceptions.some(
        (perception) => perception.personId === quiet.briefingLeadPersonId,
      ),
    ).toBe(false);
  });

  it("keeps canonical truth, the spoken claim, and each listener's belief distinct", () => {
    const claim = normalFirst.claims[0];
    expect(claim).toBeDefined();
    if (!claim) return;
    // The event summary is the world's account. The claim is what somebody
    // said. The perception is what a listener concluded from hearing it. None
    // of the three is a copy of another.
    expect(claim.statement).not.toBe(normalFirst.eventSummary);
    for (const perception of normalFirst.perceptions) {
      expect(perception.assertion).not.toBe(claim.statement);
    }
    for (const acquisition of normalFirst.claimKnowledge) {
      expect(acquisition.accuracy).toBe("unknown");
    }
    for (const acquisition of normalFirst.directKnowledge) {
      expect(acquisition.accuracy).toBe("accurate");
    }
  });

  it("says who did not learn it, and on what basis", () => {
    expect(normalFirst.absences).toEqual([]);

    const absence = quietFirst.absences.find(
      (entry) => entry.personId === quiet.briefingLeadPersonId,
    );
    expect(absence).toBeDefined();
    expect(absence?.basis).toBe(
      "declared-present-but-not-an-event-participant",
    );
    expect(absence?.note).toContain(
      "the canonical event record does not list this person as a participant",
    );
  });

  it("states its own reasoning boundary when no presence set was supplied", () => {
    const turn = quiet.turns[0];
    if (!turn) throw new Error("The fixture ran no turn.");
    const withoutPresence = projectConversationObserverTrace(quiet.world, {
      eventId: turn.eventId,
    });
    expect(withoutPresence.absences).toEqual([]);
    expect(withoutPresence.boundaryNotes.join(" ")).toContain(
      "can only speak about recorded participants",
    );
  });
});

describe("durable decisions and their consequences", () => {
  it("links a durable NPC decision to its trace and to the history it was decided against", () => {
    const first = traceTurn(normal, 0);
    expect(first.decisionTraces).toHaveLength(1);
    const decision = first.decisionTraces[0];
    expect(decision).toBeDefined();
    if (!decision) return;

    expect(decision.actorPersonId).toBe(normal.referralVerifierPersonId);
    expect(decision.decisionType).toBe("conversation.commitment-response");
    expect(decision.outcomeKind).toBe("selected");
    expect(decision.selectedOptionKey).not.toBeNull();
    // The decision was evaluated at exactly the frontier it was written to, and
    // the event that carries the response is the very next record. That is
    // recorded ordering, and it is what makes the trace's claim about "the
    // history this decision produced" checkable rather than rhetorical.
    expect(decision.immediatelyPrecedesEvent).toBe(true);
    expect(decision.cutoffFrontier).toBe(decision.appendedSequence);
  });

  it("traces a later decision back through several explicit recorded links", () => {
    const index = buildTraceIndex(normal.world);
    const decision = normal.world.history.decisionTraces.at(-1);
    if (!decision) throw new Error("The fixture recorded no decision trace.");

    const walk = walkTrace(index, {
      rootId: decision.id,
      direction: "upstream",
      maxDepth: 8,
    });
    const byId = new Map(walk.nodes.map((node) => [node.id, node]));
    const chain = walk.steps.map((step) => ({
      role: step.viaRole,
      recordClass: byId.get(step.nodeId)?.recordClass ?? "unknown",
      depth: step.depth,
    }));

    // decision trace -> perception -> claim and knowledge -> the event.
    expect(
      chain.some(
        (step) => step.depth === 1 && step.recordClass === "perception",
      ),
    ).toBe(true);
    expect(
      chain.some(
        (step) => step.depth === 2 && step.recordClass === "spoken-claim",
      ),
    ).toBe(true);
    expect(
      chain.some(
        (step) => step.depth === 2 && step.recordClass === "knowledge-received",
      ),
    ).toBe(true);
    expect(
      chain.some(
        (step) => step.depth === 3 && step.recordClass === "canonical-event",
      ),
    ).toBe(true);

    // The first turn's event is genuinely upstream of the second turn's
    // decision, through nothing but fields the records carry.
    const firstTurnEventId = normal.turns[0]?.eventId;
    expect(firstTurnEventId).toBeDefined();
    expect(walk.nodes.map((node) => node.id)).toContain(firstTurnEventId);
  });

  it("shows the same later decision resting on a different chain when the first turn was quiet", () => {
    const index = buildTraceIndex(quiet.world);
    const decision = quiet.world.history.decisionTraces.at(-1);
    if (!decision) throw new Error("The fixture recorded no decision trace.");
    const walk = walkTrace(index, {
      rootId: decision.id,
      direction: "upstream",
      maxDepth: 8,
    });

    // The briefing lead never heard the first turn, so the perception their
    // decision consults is an older one that leads somewhere else entirely.
    const firstTurnEventId = quiet.turns[0]?.eventId;
    expect(walk.nodes.map((node) => node.id)).not.toContain(firstTurnEventId);
    expect(walk.nodes.some((node) => node.recordClass === "spoken-claim")).toBe(
      false,
    );
  });
});

describe("private audibility", () => {
  const privateRun = createCausalTraceFixture("private");
  const privateFirst = traceTurn(privateRun, 0);
  const normalFirst = traceTurn(normal, 0);

  it("uses the room the accepted fixture makes private possible in", () => {
    // The shared office refuses a private exchange outright while somebody else
    // is within earshot, and says so. Forcing it there would test an error
    // message rather than an audience.
    expect(privateRun.room.privateAvailable).toBe(true);
    expect(normal.room.privateAvailable).toBe(false);
    expect(normal.room.privateUnavailableReason).not.toBeNull();
  });

  it("records a private audience and a private event, not merely a smaller room", () => {
    expect(privateFirst.visibility).toBe("private");
    expect(privateFirst.claims[0]?.audience).toBe("private");
    expect(privateFirst.tags).toContain("conversation.audibility.private");

    // The same intent at ordinary volume is recorded as limited, so the
    // difference is a field the claim and the event carry rather than a
    // difference in who happened to be standing there.
    expect(normalFirst.visibility).toBe("limited");
    expect(normalFirst.claims[0]?.audience).toBe("limited");
    expect(normalFirst.tags).toContain("conversation.audibility.normal");
  });

  it("still writes a durable decision and a traceable claim chain", () => {
    expect(privateFirst.decisionTraces).toHaveLength(1);
    expect(privateFirst.claimRecipientPersonIds).toHaveLength(1);
    const perception = privateFirst.perceptions[0];
    expect(perception).toBeDefined();
    expect(perception?.viaClaimId).toBe(privateFirst.claims[0]?.claimId);
  });
});
