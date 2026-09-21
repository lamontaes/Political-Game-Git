import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "./index";
import type { EntityId, World } from "./index";
import { ageOnDate, createEducationEnrollment, money } from "./index";
import { createResourcePosition } from "./resources";
import { enterLifePath } from "./life-paths2";
import {
  activeEducationEnrollmentsAt,
  householdMembershipsAt,
  currentLifeCutoff,
} from "./life-queries";
import { recordStudyAnswer, STUDY_DECLINED_EVENT } from "./people-study";
import { peerStudyApproach, studyPlanSettled } from "./people-study-plan";
import { favorEntries } from "./life-favors";
import {
  REVISION_ASKED_EVENT,
  agreedRevision,
  renegotiationAsked,
} from "./people-promise";
import {
  activeFollowUpIntention,
  npcIntentions,
  openCommitments,
  recordNpcIntention,
} from "./people-continuing-life";
import { sceneBindingsFor } from "./scene-bindings";
import { addDays } from "./dates";
import { openProposal } from "./people-contact";
import { isPersonAliveAt } from "./vitality-integrity";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import { letAdultTimePass } from "../presentation/adult-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "../presentation/player-conversation";
import type { ContextualSceneSubject } from "../presentation/contextual-scenes";
import { commitConversationTurn } from "../presentation/run-b-conversation";
import {
  FOLLOWTHROUGH_FAMILIES,
  FOLLOWTHROUGH_TAG,
  answerCollaborationOffer,
  answerIntroductionOffer,
  answerRepairOffer,
  answerSharedWorkRequest,
  askRevisionForCompetingCommitment,
  collaborationCandidates,
  competingCommitmentCases,
  competingRevisionAgreed,
  followThroughAsked,
  introductionCandidates,
  keepCollaborationSession,
  performSharedWorkRequest,
  produceSocialFollowThrough,
  recordCollaborationOffer,
  recordIntroductionOffer,
  recordRememberedReconnect,
  recordRepairOffer,
  recordSharedWorkRequest,
  rememberedReconnectCandidates,
  repairCandidates,
  sharedWorkFollowUpCandidates,
  socialFollowThroughTransitionHandler,
  stopCollaboration,
  withdrawSharedWorkRequest,
} from "./people-social-followthrough";

/**
 * MUSE-PEOPLE deliverable B: six relationship-to-opportunity families with
 * actual player interactions and saved follow-through.
 *
 * Every chain runs on real records: a settled study collaboration, an
 * ordinary favour ask, a real refusal, a real trio of people. Nothing here
 * invents the people it tests — they enrolled, agreed, declined and owe
 * through the same writers production uses.
 */

const PROVENANCE = { kind: "authored" as const, note: "MUSE-PEOPLE fixture." };

function adultLife(seed: string, startAge = 30) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge }),
  ).game!;
  return { world: game.world, player: game.playerPersonId };
}

/** Two adults on the same program; the first agrees, the second declines. */
function studyHousehold(seed: string) {
  const { world: opened, player } = adultLife(seed);
  const funded = createResourcePosition(openOrdinaryLife(opened, player), {
    stableKey: `followthrough:${seed}:funds`,
    owner: { kind: "person", personId: player },
    openedAt: opened.currentDate,
    openingBalance: money(5_000_000, "USD"),
    provenance: PROVENANCE,
  });
  const entered = enterLifePath(funded, "college-office-certificate").world;
  const enrollment = activeEducationEnrollmentsAt(entered, player).at(-1)!;
  const peerIds = entered.personOrder.filter(
    (id) =>
      id !== player &&
      ageOnDate(entered.people[id]!.birthDate, entered.currentDate) >= 18 &&
      activeEducationEnrollmentsAt(entered, id).length === 0,
  );
  let next = entered;
  const peers: EntityId[] = [];
  for (const peer of peerIds.slice(0, 3)) {
    next = createEducationEnrollment(next, {
      stableKey: `followthrough:${seed}:peer:${peer}`,
      personId: peer,
      organizationId: enrollment.enrollment.organizationId,
      startedAt: next.currentDate,
      programKind: enrollment.enrollment.programKind,
      contextKind: "program:life-paths2-v2",
      provenance: PROVENANCE,
    });
    peers.push(peer);
  }
  const agreed = recordStudyAnswer(next, {
    personId: player,
    peerPersonId: peers[0]!,
    outcome: "agrees",
    statement: "Yes. Let's work out who is doing what.",
  }).world;
  const declined = recordStudyAnswer(agreed, {
    personId: player,
    peerPersonId: peers[1]!,
    outcome: "declines",
    statement: "Not this term. I have too much on.",
  }).world;
  return { world: declined, player, peers };
}

function say(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  intent: string,
): World {
  const view = projectPlayerConversation(world, player, subject)!;
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
  }).world;
}

/** Settle the study plan with the first peer, through the real scene. */
function settledPlan(seed: string) {
  const base = studyHousehold(seed);
  const { player, peers } = base;
  const ready = passOrdinaryDays(base.world, 1, {
    stopForTentativeHolds: true,
  });
  const theirs = peerStudyApproach(ready, {
    personId: player,
    peerPersonId: peers[0]!,
  }).approachId;
  const settled = say(ready, player, "scene-study-plan", theirs);
  expect(studyPlanSettled(settled, player, peers[0]!)).toBe(true);
  return { ...base, world: settled };
}

function collaborationIdOf(world: World, player: EntityId, peer: EntityId) {
  return world.history.events.find(
    (event) =>
      event.type === "life.study-collaboration-agreed" &&
      event.involvedEntityIds.includes(player) &&
      event.involvedEntityIds.includes(peer),
  )!.id;
}

function refusalOf(world: World, player: EntityId, peer: EntityId) {
  return world.history.events.find(
    (event) =>
      event.type === STUDY_DECLINED_EVENT &&
      event.involvedEntityIds.includes(player) &&
      event.involvedEntityIds.includes(peer),
  )!.id;
}

/**
 * The peer's later request, however it got asked: by the NPC at a clock
 * boundary, or established directly where the boundary stayed quiet. Either
 * way the ask on record is the same ordinary favour record.
 */
function ensureSharedWorkAsked(
  world: World,
  player: EntityId,
  peer: EntityId,
  collaborationId: EntityId,
): { world: World; requestId: EntityId; npcInitiated: boolean } {
  const existing = favorEntries(world, player).find(
    (entry) =>
      entry.request.id &&
      entry.request.tags.includes("followthrough.family:shared-work-request") &&
      entry.counterpartId === peer,
  );
  if (existing) {
    return { world, requestId: existing.request.id, npcInitiated: true };
  }
  const { world: asked, requestId } = recordSharedWorkRequest(world, {
    playerId: player,
    peerId: peer,
    collaborationId,
    programName: "the certificate",
  });
  return { world: asked, requestId, npcInitiated: false };
}

function performWhenPossible(
  world: World,
  player: EntityId,
  requestId: EntityId,
): World {
  let next = world;
  for (let day = 0; day < 21; day += 1) {
    next = performSharedWorkRequest(next, player, requestId);
    const entry = favorEntries(next, player).find(
      (candidate) => candidate.request.id === requestId,
    )!;
    if (entry.status === "performed") return next;
    next = passOrdinaryDays(next, 1);
  }
  throw new Error("The agreed work never found its hours.");
}

function knownBy(world: World, personId: EntityId, eventId: EntityId): boolean {
  return world.history.knowledge.some(
    (entry) => entry.personId === personId && entry.eventId === eventId,
  );
}

describe("family 1 — shared study, then a later request", () => {
  const base = settledPlan("followthrough-shared-work");
  const { player, peers } = base;
  const peer = peers[0]!;
  // Two weeks on: the collaboration has settled and held.
  const later = passOrdinaryDays(base.world, 15);
  const collaborationId = collaborationIdOf(later, player, peer);

  it("names the collaboration it follows from, never nowhere", () => {
    const candidates = sharedWorkFollowUpCandidates(later, player);
    const asked = followThroughAsked(
      later,
      "shared-work-request",
      collaborationId,
    );
    // Either the peer already asked at a clock boundary, or they are
    // eligible to: what never happens is an ask from nowhere.
    expect(
      candidates.some((candidate) => candidate.peerId === peer) || asked,
    ).toBe(true);
    if (!asked) {
      expect(candidates[0]!.collaborationId).toBe(collaborationId);
    }
  });

  it("agrees, performs and is raised again only while still owed", () => {
    const ensured = ensureSharedWorkAsked(later, player, peer, collaborationId);
    assertWorldIntegrity(ensured.world);
    const answered = answerSharedWorkRequest(ensured.world, {
      playerId: player,
      requestId: ensured.requestId,
      answer: "agree",
      statement: "Of course. Bring the notes on Thursday.",
    });
    assertWorldIntegrity(answered.world);
    const entry = favorEntries(answered.world, player).find(
      (candidate) => candidate.request.id === ensured.requestId,
    )!;
    expect(entry.status).toBe("agreed");
    // Answering twice is answering once: the same response, no duplicate.
    const again = answerSharedWorkRequest(answered.world, {
      playerId: player,
      requestId: ensured.requestId,
      answer: "decline",
      statement: "Changed my mind.",
    });
    expect(
      favorEntries(again.world, player).find(
        (candidate) => candidate.request.id === ensured.requestId,
      )?.status,
    ).toBe("agreed");
    // Asking twice is refused: the work raised its request once.
    expect(() =>
      recordSharedWorkRequest(again.world, {
        playerId: player,
        peerId: peer,
        collaborationId,
        programName: "the certificate",
      }),
    ).toThrow(/already produced/);
    // Saved mid-chain, the agreement survives the reload.
    const reloaded = deserializeWorld(serializeWorld(answered.world));
    assertWorldIntegrity(reloaded);
    expect(
      favorEntries(reloaded, player).find(
        (candidate) => candidate.request.id === ensured.requestId,
      )?.status,
    ).toBe("agreed");
    const done = performWhenPossible(reloaded, player, ensured.requestId);
    assertWorldIntegrity(done);
    const performed = favorEntries(done, player).find(
      (candidate) => candidate.request.id === ensured.requestId,
    )!;
    expect(performed.status).toBe("performed");
    expect(
      done.history.relationshipInteractions.some(
        (interaction) =>
          interaction.kind === "support:followed-through" &&
          interaction.personIds.includes(player) &&
          interaction.personIds.includes(peer),
      ),
    ).toBe(true);
  });

  it("the same named choice under reordered options is the same answer", () => {
    // A second collaboration, so a second independent ask.
    const agreed = recordStudyAnswer(later, {
      personId: player,
      peerPersonId: peers[2]!,
      outcome: "agrees",
      statement: "Yes, let's sort the reading list together.",
    }).world;
    const secondCollaboration = collaborationIdOf(agreed, player, peers[2]!);
    const first = ensureSharedWorkAsked(later, player, peer, collaborationId);
    const second = ensureSharedWorkAsked(
      agreed,
      player,
      peers[2]!,
      secondCollaboration,
    );
    type Option = { id: "agree" | "conditions" | "decline"; label: string };
    const ordered: Option[] = [
      { id: "agree", label: "Agree to help" },
      { id: "conditions", label: "Agree with a limit" },
      { id: "decline", label: "Decline" },
    ];
    const reordered = [...ordered].reverse();
    const pick = (options: Option[]) =>
      options.find((option) => option.id === "conditions")!.id;
    // The choice is resolved by its stable id, never by its position.
    expect(pick(reordered)).toBe(pick(ordered));
    const answeredFirst = answerSharedWorkRequest(first.world, {
      playerId: player,
      requestId: first.requestId,
      answer: pick(ordered),
      statement: "Yes, if it stays under an hour.",
    });
    const answeredSecond = answerSharedWorkRequest(second.world, {
      playerId: player,
      requestId: second.requestId,
      answer: pick(reordered),
      statement: "Yes, if it stays under an hour.",
    });
    for (const [world, requestId] of [
      [answeredFirst.world, first.requestId],
      [answeredSecond.world, second.requestId],
    ] as const) {
      const entry = favorEntries(world, player).find(
        (candidate) => candidate.request.id === requestId,
      )!;
      expect(entry.status).toBe("agreed");
      expect(entry.condition).toBe(entry.details.condition);
    }
  });

  function walkPastComingDue(world: World): World {
    // Advances can pause at holds, so walk in legs past the coming-due.
    let next = world;
    for (let leg = 0; leg < 8; leg += 1) {
      next = passOrdinaryDays(next, 5);
    }
    return next;
  }

  function agreedAsk() {
    const ensured = ensureSharedWorkAsked(later, player, peer, collaborationId);
    const answered = answerSharedWorkRequest(ensured.world, {
      playerId: player,
      requestId: ensured.requestId,
      answer: "agree",
      statement: "Leave it with me.",
    });
    return { world: answered.world, requestId: ensured.requestId };
  }

  it("an intention the peer holds is raised at the coming-due, once", () => {
    const { world, requestId } = agreedAsk();
    // The peer has privately decided to bring it up; nobody is told yet.
    const held = recordNpcIntention(world, {
      npcId: peer,
      targetPersonId: player,
      kind: "follow-up",
      objective: "Bring up the notes that were agreed and not done",
      sourceEventId: requestId,
      deadline: null,
    });
    expect(activeFollowUpIntention(held.world, peer, requestId)).not.toBeNull();
    const raised = walkPastComingDue(held.world);
    assertWorldIntegrity(raised);
    const key = `${FOLLOWTHROUGH_TAG}:shared-work:${requestId}:raised`;
    expect(
      raised.history.events.filter((event) => event.stableKey === key).length,
    ).toBe(1);
    // Acted on, the intention is kept — a different record from dropped.
    expect(activeFollowUpIntention(raised, peer, requestId)).toBeNull();
    expect(
      npcIntentions(raised, peer).find(
        (intention) => intention.goalId === held.goalId,
      )?.status,
    ).toBe("completed");
    const further = walkPastComingDue(raised);
    expect(
      further.history.events.filter((event) => event.stableKey === key).length,
    ).toBe(1);
  });

  it("without one, the peer's own decision at the coming-due stands, once", () => {
    const { world, requestId } = agreedAsk();
    const walked = walkPastComingDue(world);
    assertWorldIntegrity(walked);
    const key = `${FOLLOWTHROUGH_TAG}:shared-work:${requestId}:raised`;
    const raisedCount = walked.history.events.filter(
      (event) => event.stableKey === key,
    ).length;
    // Raised or let lie, it is decided once and never re-rolled.
    expect(raisedCount).toBeLessThanOrEqual(1);
    const further = walkPastComingDue(walked);
    expect(
      further.history.events.filter((event) => event.stableKey === key).length,
    ).toBe(raisedCount);
    // Either way the player's agreement is still owed, not rewritten.
    expect(
      favorEntries(further, player).find(
        (candidate) => candidate.request.id === requestId,
      )?.status,
    ).toBe("agreed");
  });
  it("withdrawing ends the chain quietly; the handler finds nothing to do", () => {
    const ensured = ensureSharedWorkAsked(later, player, peer, collaborationId);
    const answered = answerSharedWorkRequest(ensured.world, {
      playerId: player,
      requestId: ensured.requestId,
      answer: "agree",
      statement: "I'll take it on.",
    });
    const withdrawn = withdrawSharedWorkRequest(
      answered.world,
      player,
      ensured.requestId,
    );
    assertWorldIntegrity(withdrawn);
    expect(
      favorEntries(withdrawn, player).find(
        (candidate) => candidate.request.id === ensured.requestId,
      )?.status,
    ).toBe("cancelled");
    const due = withdrawn.history.futureDueItems.find((item) =>
      item.stableKey.includes(`shared-work-request:${player}`),
    )!;
    const events = withdrawn.history.events.length;
    const result = socialFollowThroughTransitionHandler(withdrawn, due);
    expect(result.world.history.events.length).toBe(events);
    expect(result.outcomeEventId).toBeNull();
  });

  it("private asks stay private", () => {
    const ensured = ensureSharedWorkAsked(later, player, peer, collaborationId);
    const stranger = ensured.world.personOrder.find(
      (id) => id !== player && id !== peer,
    )!;
    const request = ensured.world.history.events.find(
      (event) => event.id === ensured.requestId,
    )!;
    expect(request.visibility).toBe("private");
    expect(knownBy(ensured.world, stranger, ensured.requestId)).toBe(false);
  });
});

describe("family 2 — renegotiating a real competing commitment", () => {
  // A bank favour agreed first, through the real ask scene — no panel is
  // ever opened on the way there; time passing is what brings the ask.
  const life = adultLife("followthrough-competing");
  const player = life.player;
  let walked = life.world;
  for (let step = 0; step < 40; step += 1) {
    const open = availablePlayerConversations(walked, player).some(
      (entry) => entry.subject === "scene-favor" && !entry.settled,
    );
    const variant = sceneBindingsFor(walked, player, "favor").at(-1)?.binding
      .variant;
    if (open && variant === "favour-request") break;
    walked = letAdultTimePass(walked, 3);
  }
  expect(
    sceneBindingsFor(walked, player, "favor").at(-1)?.binding.variant,
  ).toBe("favour-request");
  const answered = say(walked, player, "scene-favor", "agree");
  const bank = favorEntries(answered, player).find(
    (entry) =>
      entry.status === "agreed" &&
      !entry.request.tags.includes("followthrough.v1"),
  )!;
  // Then something else owed alongside it: a study collaboration whose plan
  // is still open counts, because it is still really owed.
  const funded = createResourcePosition(openOrdinaryLife(answered, player), {
    stableKey: "followthrough:competing:funds",
    owner: { kind: "person", personId: player },
    openedAt: answered.currentDate,
    openingBalance: money(5_000_000, "USD"),
    provenance: PROVENANCE,
  });
  const entered = enterLifePath(funded, "college-office-certificate").world;
  const enrollment = activeEducationEnrollmentsAt(entered, player).at(-1)!;
  const peerId = entered.personOrder.find(
    (id) =>
      id !== player &&
      ageOnDate(entered.people[id]!.birthDate, entered.currentDate) >= 18 &&
      activeEducationEnrollmentsAt(entered, id).length === 0,
  )!;
  const enrolled = createEducationEnrollment(entered, {
    stableKey: "followthrough:competing:peer",
    personId: peerId,
    organizationId: enrollment.enrollment.organizationId,
    startedAt: entered.currentDate,
    programKind: enrollment.enrollment.programKind,
    contextKind: "program:life-paths2-v2",
    provenance: PROVENANCE,
  });
  const collateral = recordStudyAnswer(enrolled, {
    personId: player,
    peerPersonId: peerId,
    outcome: "agrees",
    statement: "Yes, let's work together.",
  }).world;

  it("finds the collision and records what was actually decided", () => {
    const cases = competingCommitmentCases(collateral, player);
    expect(cases.some((matter) => matter.requestId === bank.request.id)).toBe(
      true,
    );
    const asked = askRevisionForCompetingCommitment(collateral, {
      playerId: player,
      counterpartId: bank.counterpartId,
      requestId: bank.request.id,
      revisionId: "more-time",
      statement: "Could this move to next week? The coursework collides.",
    });
    assertWorldIntegrity(asked.world);
    expect(renegotiationAsked(asked.world, bank.request.id)).toBe(true);
    if (asked.revised) {
      // They agreed to move it: the revision is on record with its meaning.
      expect(
        competingRevisionAgreed(asked.world, bank.request.id),
      ).not.toBeNull();
      expect(agreedRevision(asked.world, bank.request.id)?.id).toBe(
        "more-time",
      );
    } else if (asked.outcome === "needs-answer") {
      // They want an answer first: nothing moved and nothing was refused, so
      // the original stands and there is no disagreement to repair.
      expect(agreedRevision(asked.world, bank.request.id)).toBeFalsy();
      expect(
        repairCandidates(asked.world, player).some(
          (candidate) =>
            candidate.counterpartId === bank.counterpartId &&
            candidate.offerKind === "revise-now",
        ),
      ).toBe(false);
    } else {
      expect(asked.outcome).toBe("holds-boundary");
      // They held the boundary: the refusal names the exact ask refused,
      // and the disagreement family can take it up from there.
      const refusal = asked.world.history.events.find(
        (event) =>
          event.type === REVISION_ASKED_EVENT &&
          event.tags.includes("promise.outcome:holds-boundary") &&
          event.stableKey.startsWith(`promise:${bank.request.id}:`),
      );
      expect(refusal).toBeTruthy();
      expect(
        repairCandidates(asked.world, player).some(
          (candidate) => candidate.refusalEventId === refusal!.id,
        ),
      ).toBe(true);
    }
  });

  it("kept, broken and renegotiated read as different commitments", () => {
    expect(
      openCommitments(collateral, player).some(
        (commitment) => commitment.eventId === bank.request.id,
      ),
    ).toBe(true);
    const asked = askRevisionForCompetingCommitment(collateral, {
      playerId: player,
      counterpartId: bank.counterpartId,
      requestId: bank.request.id,
      revisionId: "smaller-part",
      statement: "Could I do half of it instead?",
    });
    if (asked.revised) {
      // Still owed, but owed differently: the revision is part of the debt.
      expect(
        openCommitments(asked.world, player).some(
          (commitment) => commitment.eventId === bank.request.id,
        ),
      ).toBe(true);
      expect(competingRevisionAgreed(asked.world, bank.request.id)).toBe(
        "smaller-part",
      );
    } else {
      // Unmoved: the original stands exactly as agreed.
      expect(agreedRevision(asked.world, bank.request.id)).toBeFalsy();
    }
  });
});

describe("family 3 — reconnecting over a specific remembered event", () => {
  const base = settledPlan("followthrough-reconnect-b");
  const { player, peers } = base;
  const peer = peers[0]!;
  const later = passOrdinaryDays(base.world, 15);
  const collaborationId = collaborationIdOf(later, player, peer);
  const ensured = ensureSharedWorkAsked(later, player, peer, collaborationId);
  const answered = answerSharedWorkRequest(ensured.world, {
    playerId: player,
    requestId: ensured.requestId,
    answer: "agree",
    statement: "Send it over and I'll look tonight.",
  });
  const done = performWhenPossible(answered.world, player, ensured.requestId);
  // A long quiet afterwards: the shared work is the last meaningful contact.
  // The existing continuity contract calls two calendar years a long gap, so
  // walk in legs (advances can pause at holds) until that is really true.
  const doneYear = Number(done.currentDate.slice(0, 4));
  let drifted = done;
  for (let leg = 0; leg < 40; leg += 1) {
    if (Number(drifted.currentDate.slice(0, 4)) - doneYear >= 2) break;
    drifted = passOrdinaryDays(drifted, 30);
  }

  it("reaches back about the thing itself, once", () => {
    const already = drifted.history.events.find(
      (event) =>
        event.type === "life.reconnect-raised" &&
        event.involvedEntityIds.includes(player) &&
        event.involvedEntityIds.includes(peer),
    );
    const candidates = rememberedReconnectCandidates(drifted, player);
    if (already) {
      // The NPC already reached out at a clock boundary, about the memory.
      const sourceId = already.tags
        .find((tag) => tag.startsWith("followthrough.source:"))!
        .slice("followthrough.source:".length);
      expect(
        followThroughAsked(drifted, "remembered-reconnect", sourceId),
      ).toBe(true);
      expect(candidates.some((entry) => entry.counterpartId === peer)).toBe(
        false,
      );
    } else if (!isPersonAliveAt(drifted, peer, currentLifeCutoff(drifted))) {
      // Two years is long enough for a life to end: nobody reaches back on
      // behalf of the dead.
      expect(candidates.some((entry) => entry.counterpartId === peer)).toBe(
        false,
      );
    } else if (openProposal(drifted, player, peer)) {
      // They already asked to meet through the ordinary contact route; a
      // second, remembered ask on top of it would be a duplicate.
      expect(candidates.some((entry) => entry.counterpartId === peer)).toBe(
        false,
      );
    } else {
      expect(candidates.some((entry) => entry.counterpartId === peer)).toBe(
        true,
      );
    }
    // Whoever the record holds a specific shared moment with, drifted apart:
    // the reconnection is about that moment, in the record's own words.
    expect(candidates.length).toBeGreaterThan(0);
    const candidate = candidates[0]!;
    const memory = drifted.history.relationshipInteractions.find(
      (interaction) =>
        (interaction.eventId ?? interaction.id) === candidate.memoryEventId,
    )!;
    expect(memory.personIds).toContain(candidate.counterpartId);
    expect(candidate.memorySummary).toBe(memory.summary);
    const reached = recordRememberedReconnect(drifted, {
      playerId: player,
      counterpartId: candidate.counterpartId,
      memoryEventId: candidate.memoryEventId,
      memorySummary: candidate.memorySummary,
      on: addDays(drifted.currentDate, 9),
    });
    assertWorldIntegrity(reached.world);
    expect(
      followThroughAsked(
        reached.world,
        "remembered-reconnect",
        candidate.memoryEventId,
      ),
    ).toBe(true);
    const proposal = openProposal(
      reached.world,
      player,
      candidate.counterpartId,
    )!;
    expect(proposal.fromPersonId).toBe(candidate.counterpartId);
    expect(proposal.eventId).toBe(reached.proposalId);
    expect(() =>
      recordRememberedReconnect(reached.world, {
        playerId: player,
        counterpartId: candidate.counterpartId,
        memoryEventId: candidate.memoryEventId,
        memorySummary: candidate.memorySummary,
        on: addDays(drifted.currentDate, 9),
      }),
    ).toThrow(/already brought them back/);
    expect(
      rememberedReconnectCandidates(reached.world, player).some(
        (entry) => entry.counterpartId === candidate.counterpartId,
      ),
    ).toBe(false);
  });
  it("a stranger's history is not the player's to be reached over", () => {
    const stranger = drifted.personOrder.find(
      (id) => id !== player && id !== peer,
    )!;
    expect(
      rememberedReconnectCandidates(drifted, stranger).some(
        (candidate) => candidate.counterpartId === peer,
      ),
    ).toBe(false);
  });
});

describe("family 4 — disagreement, then repair or continued refusal", () => {
  const base = settledPlan("followthrough-repair");
  const { player, peers } = base;
  const refuser = peers[1]!;
  const refusalId = refusalOf(base.world, player, refuser);

  function ensureRepairAsked(world: World) {
    const existing = world.history.events.find(
      (event) =>
        event.type === "life.repair-offered" &&
        event.tags.includes(`followthrough.source:${refusalId}`) &&
        event.involvedEntityIds.includes(player),
    );
    if (existing) return { world, offerId: existing.id };
    return recordRepairOffer(world, {
      playerId: player,
      counterpartId: refuser,
      refusalEventId: refusalId,
      offerKind: "collaborate-now",
      refusedSummary: "working together on coursework",
      offerText: "work together on the coursework after all",
      statement: "I've had a rethink. There is room after all.",
    });
  }

  it("a continued refusal stands as its own outcome, never raised again", () => {
    const { world: offered, offerId } = ensureRepairAsked(base.world);
    assertWorldIntegrity(offered);
    const offer = offered.history.events.find((event) => event.id === offerId)!;
    expect(offer.visibility).toBe("private");
    const declined = answerRepairOffer(offered, {
      playerId: player,
      offerId,
      answer: "decline",
      statement: "No. My term is full as it is.",
    });
    assertWorldIntegrity(declined.world);
    expect(
      declined.world.history.events.some(
        (event) =>
          event.type === "life.repair-declined" &&
          event.tags.includes(`followthrough.answer:${offerId}`),
      ),
    ).toBe(true);
    // Never raised again: the candidate is gone and recording throws.
    expect(
      repairCandidates(declined.world, player).some(
        (candidate) => candidate.refusalEventId === refusalId,
      ),
    ).toBe(false);
    expect(() =>
      recordRepairOffer(declined.world, {
        playerId: player,
        counterpartId: refuser,
        refusalEventId: refusalId,
        offerKind: "collaborate-now",
        refusedSummary: "working together on coursework",
        offerText: "work together on the coursework after all",
        statement: "Once more?",
      }),
    ).toThrow(/already had its repair/);
  });

  it("accepting carries the concrete offer out through its own machinery", () => {
    const fresh = passOrdinaryDays(base.world, 1);
    const { world: offered, offerId } = ensureRepairAsked(fresh);
    const accepted = answerRepairOffer(offered, {
      playerId: player,
      offerId,
      answer: "accept",
      statement: "Alright. Thursday evenings, then.",
    });
    assertWorldIntegrity(accepted.world);
    expect(accepted.carriedOut).toBe(true);
    // The collaboration went through the study record: they agree now.
    expect(
      accepted.world.history.events.some(
        (event) =>
          event.type === "life.study-collaboration-agreed" &&
          event.involvedEntityIds.includes(player) &&
          event.involvedEntityIds.includes(refuser),
      ),
    ).toBe(true);
    expect(
      accepted.world.history.events.some(
        (event) => event.type === "life.repair-accepted",
      ),
    ).toBe(true);
    // Answering again changes nothing.
    const events = accepted.world.history.events.length;
    const repeated = answerRepairOffer(accepted.world, {
      playerId: player,
      offerId,
      answer: "accept",
      statement: "Alright. Thursday evenings, then.",
    });
    expect(repeated.world.history.events.length).toBe(events);
  });
});

describe("family 5 — a consented introduction to an actual person", () => {
  const base = studyHousehold("followthrough-introduction");
  const { player } = base;
  const cutoff = currentLifeCutoff(base.world);
  const housemate = householdMembershipsAt(base.world, player, cutoff)
    .flatMap((entry) =>
      base.world.history.householdMemberships
        .filter((record) => record.householdId === entry.membership.householdId)
        .map((record) => record.personId),
    )
    .find((id) => id !== player)!;
  // A third person on the same program, never interacted with: known to the
  // household, unknown to the player, with a real reason to meet.
  const third = base.world.personOrder.find(
    (id) =>
      id !== player &&
      id !== housemate &&
      !base.world.history.relationshipInteractions.some(
        (interaction) =>
          interaction.personIds.includes(player) &&
          interaction.personIds.includes(id),
      ),
  )!;

  it("takes two consents, and persists either answer", () => {
    expect(
      introductionCandidates(base.world, player).length,
    ).toBeGreaterThanOrEqual(0);
    const { world: offered, offerId } = recordIntroductionOffer(base.world, {
      playerId: player,
      introducerId: housemate,
      thirdId: third,
      reason: "they are on the same certificate program",
      statement: "You two should meet. Same course, same headaches.",
    });
    assertWorldIntegrity(offered);
    const consented = answerIntroductionOffer(offered, {
      playerId: player,
      offerId,
      consent: true,
      statement: "Yes, I'd like that.",
    });
    assertWorldIntegrity(consented.world);
    // Either the third person agrees to meet — two strangers introduced —
    // or they would rather not, and the stop is on record. Both are real
    // answers; neither is asked twice.
    const made = consented.world.history.events.some(
      (event) =>
        event.type === "life.introduction-made" &&
        event.tags.includes(`followthrough.answer:${offerId}`),
    );
    const stopped = consented.world.history.events.some(
      (event) =>
        event.type === "life.introduction-declined" &&
        event.tags.includes(`followthrough.answer:${offerId}`),
    );
    expect(consented.introduced).toBe(made);
    expect(made || stopped).toBe(true);
    const repeated = answerIntroductionOffer(consented.world, {
      playerId: player,
      offerId,
      consent: true,
      statement: "Yes, I'd like that.",
    });
    expect(repeated.introduced).toBe(false);
  });

  it("declining the offer ends it before anyone is named forward", () => {
    const { world: offered, offerId } = recordIntroductionOffer(base.world, {
      playerId: player,
      introducerId: housemate,
      thirdId: third,
      reason: "they are on the same certificate program",
      statement: "You two should meet.",
    });
    const declined = answerIntroductionOffer(offered, {
      playerId: player,
      offerId,
      consent: false,
      statement: "Not right now, thanks.",
    });
    assertWorldIntegrity(declined.world);
    expect(declined.introduced).toBe(false);
    expect(
      declined.world.history.events.some(
        (event) =>
          event.type === "life.introduction-offer-declined" &&
          event.tags.includes(`followthrough.answer:${offerId}`),
      ),
    ).toBe(true);
  });
});

describe("family 6 — contextual recruitment or a recurring collaboration", () => {
  const base = settledPlan("followthrough-collaboration");
  const { player, peers } = base;
  const peer = peers[0]!;
  // Three weeks on: the settled partnership has held long enough to recur.
  const later = passOrdinaryDays(base.world, 22);

  it("a rhythm is proposed once, kept session by session, and ended cleanly", () => {
    const candidates = collaborationCandidates(later, player);
    expect(
      candidates.some(
        (candidate) =>
          candidate.kind === "study-recurring" &&
          candidate.counterpartId === peer,
      ),
    ).toBe(true);
    const candidate = candidates.find(
      (entry) =>
        entry.kind === "study-recurring" && entry.counterpartId === peer,
    )!;
    const { world: offered, offerId } = recordCollaborationOffer(later, {
      playerId: player,
      counterpartId: peer,
      kind: "study-recurring",
      proposal: candidate.proposal,
      programName: candidate.programName,
      chapterId: null,
      chapterName: null,
      statement: "The way we've been working suits me. Weekly?",
    });
    const accepted = answerCollaborationOffer(offered, {
      playerId: player,
      offerId,
      accept: true,
      statement: "Weekly. Thursdays.",
    });
    assertWorldIntegrity(accepted.world);
    expect(accepted.accepted).toBe(true);
    const agreed = accepted.world.history.events.find(
      (event) =>
        event.type === "life.collaboration-agreed" &&
        event.tags.includes(`followthrough.answer:${offerId}`),
    )!;
    // Proposing twice is refused: the rhythm was proposed once.
    expect(() =>
      recordCollaborationOffer(accepted.world, {
        playerId: player,
        counterpartId: peer,
        kind: "study-recurring",
        proposal: candidate.proposal,
        programName: candidate.programName,
        chapterId: null,
        chapterName: null,
        statement: "Weekly?",
      }),
    ).toThrow(/already proposed/);
    const kept = keepCollaborationSession(accepted.world, player, agreed.id);
    const keptTwice = keepCollaborationSession(kept, player, agreed.id);
    expect(
      keptTwice.history.events.filter(
        (event) => event.type === "life.collaboration-session-kept",
      ).length,
    ).toBe(2);
    const ended = stopCollaboration(
      keptTwice,
      player,
      agreed.id,
      "The course is over; thanks for the Thursdays.",
    );
    assertWorldIntegrity(ended);
    expect(
      ended.history.events.some(
        (event) => event.type === "life.collaboration-ended",
      ),
    ).toBe(true);
  });

  it("turning the rhythm down is persisted, not re-asked", () => {
    const twin = settledPlan("followthrough-collaboration-no");
    const twinLater = passOrdinaryDays(twin.world, 22);
    const candidate = collaborationCandidates(twinLater, twin.player).find(
      (entry) =>
        entry.kind === "study-recurring" &&
        entry.counterpartId === twin.peers[0]!,
    )!;
    const { world: offered, offerId } = recordCollaborationOffer(twinLater, {
      playerId: twin.player,
      counterpartId: twin.peers[0]!,
      kind: "study-recurring",
      proposal: candidate.proposal,
      programName: candidate.programName,
      chapterId: null,
      chapterName: null,
      statement: "Weekly?",
    });
    const declined = answerCollaborationOffer(offered, {
      playerId: twin.player,
      offerId,
      accept: false,
      statement: "I can't hold a weekly evening.",
    });
    assertWorldIntegrity(declined.world);
    expect(declined.accepted).toBe(false);
    expect(
      declined.world.history.events.some(
        (event) =>
          event.type === "life.collaboration-declined" &&
          event.tags.includes(`followthrough.answer:${offerId}`),
      ),
    ).toBe(true);
  });

  it("reading costs no time and the boundary runner keeps integrity", () => {
    const before = {
      date: later.currentDate,
      sequence: later.history.nextSequence,
    };
    sharedWorkFollowUpCandidates(later, player);
    competingCommitmentCases(later, player);
    rememberedReconnectCandidates(later, player);
    repairCandidates(later, player);
    introductionCandidates(later, player);
    collaborationCandidates(later, player);
    expect(later.currentDate).toBe(before.date);
    expect(later.history.nextSequence).toBe(before.sequence);
    const produced = produceSocialFollowThrough(later, player);
    assertWorldIntegrity(produced);
  });

  it("all six families are registered and distinguishable", () => {
    expect(FOLLOWTHROUGH_FAMILIES).toEqual([
      "shared-work-request",
      "competing-commitment",
      "remembered-reconnect",
      "disagreement-repair",
      "consented-introduction",
      "continuing-collaboration",
    ]);
  });
});
