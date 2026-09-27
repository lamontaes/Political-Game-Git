/** A death-sourced, actor-owned NPC entry into the existing Article III path. */

import { currentPresidentOf } from "../crisis/offices";
import { addDays } from "../dates";
import {
  assertNpcAutonomousApplication,
  evaluateDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { scheduleFutureDueItem } from "../future-transitions";
import { personName } from "../people";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { recordFederalJudicialCandidateResponse } from "./candidate-interview";
import { publicSeatedJudges } from "./candidate-discovery";
import { courtById, seatHolderAt } from "./courts";
import {
  judicialSelectionById,
  judicialSelectionStages,
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
  resolveJudicialSelectionPlan,
  screenFederalJudicialNominee,
} from "./selection";

export const JUDICIAL_NPC_NOMINATION_TRANSITION =
  "judiciary:npc-federal-nomination" as const;
export const JUDICIAL_NPC_REVIEW_EVENT = "judicial.npc-roster-review";
export const JUDICIAL_NPC_CANDIDATE_RESPONSE_EVENT =
  "judicial.npc-candidate-response";
// PLACEHOLDER(wave2): bounded daily attempts avoid an endless due-item trail.
export const MAX_NPC_NOMINATION_ATTEMPTS = 7;

function dueKey(seatId: string, deathId: EntityId, attempt: number): string {
  return `${JUDICIAL_NPC_NOMINATION_TRANSITION}:${seatId}:${deathId}:attempt:${attempt}`;
}

function eligibleDeathSeats(
  world: World,
  deathId: EntityId,
  deceasedPersonId: EntityId,
): readonly string[] {
  const death = world.history.personDeaths.find((row) => row.id === deathId);
  if (!death || death.personId !== deceasedPersonId)
    throw new Error(
      "NPC judicial vacancy needs its actual person death record.",
    );
  return (world.judiciary?.seatTenures ?? [])
    .filter(
      (tenure) =>
        tenure.personId === deceasedPersonId &&
        tenure.endedAt === death.diedAt &&
        tenure.endReason === "death",
    )
    .map((tenure) => tenure.seatId)
    .filter((seatId) => {
      const seat = world.judiciary?.seats[seatId];
      const level = seat ? courtById(world, seat.courtId)?.level : null;
      return (
        seat?.retiredAt === null &&
        !seat.linkedOfficeId &&
        !seatHolderAt(world, seatId) &&
        (level === "federal-district" || level === "federal-appellate")
      );
    })
    .sort();
}

/** Called after canonical death and seat vacancy; repeated calls are inert. */
export function scheduleNpcFederalJudicialNominationForDeath(
  world: World,
  deathId: EntityId,
  deceasedPersonId: EntityId,
): World {
  let next = world;
  for (const seatId of eligibleDeathSeats(world, deathId, deceasedPersonId)) {
    const stableKey = dueKey(seatId, deathId, 0);
    if (next.history.futureDueItems.some((due) => due.stableKey === stableKey))
      continue;
    // PLACEHOLDER(wave2): the ordinary NPC President considers a death vacancy
    // on the following calendar day. The due item is not a nomination.
    next = scheduleFutureDueItem(next, {
      stableKey,
      dueAt: addDays(next.currentDate, 1),
      transitionKey: JUDICIAL_NPC_NOMINATION_TRANSITION,
      entityIds: [deathId],
      jurisdictionId: null,
      provenance: { kind: "simulated", sourceEntityIds: [deathId] },
    });
  }
  return next;
}

function retry(
  world: World,
  due: FutureDueItem,
  seatId: string,
  deathId: EntityId,
  reasonKey: `${string}:${string}`,
  context: string,
): FutureTransitionHandlerResult {
  const attempt = Number(
    due.stableKey.slice(due.stableKey.lastIndexOf(":") + 1),
  );
  if (
    !Number.isSafeInteger(attempt) ||
    attempt < 0 ||
    attempt >= MAX_NPC_NOMINATION_ATTEMPTS - 1
  )
    return {
      world,
      status: "blocked",
      reasonKey,
      context,
      outcomeEventId: null,
    };
  const stableKey = dueKey(seatId, deathId, attempt + 1);
  const next = world.history.futureDueItems.some(
    (item) => item.stableKey === stableKey,
  )
    ? world
    : scheduleFutureDueItem(world, {
        stableKey,
        dueAt: addDays(world.currentDate, 1),
        transitionKey: JUDICIAL_NPC_NOMINATION_TRANSITION,
        entityIds: [deathId],
        jurisdictionId: null,
        provenance: { kind: "simulated", sourceEntityIds: [deathId] },
      });
  return {
    world: next,
    status: "blocked",
    reasonKey,
    context,
    outcomeEventId: null,
  };
}

function cancelled(
  world: World,
  context: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "cancelled",
    reasonKey: "judiciary:npc-nomination-unavailable",
    context,
    outcomeEventId: null,
  };
}

/** Resolve one due consideration without taking a controlled President's choice. */
export function npcFederalJudicialNominationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  if (
    due.transitionKey !== JUDICIAL_NPC_NOMINATION_TRANSITION ||
    due.provenance.kind !== "simulated" ||
    due.entityIds.length !== 1 ||
    due.provenance.sourceEntityIds.length !== 1 ||
    due.entityIds[0] !== due.provenance.sourceEntityIds[0]
  )
    return cancelled(world, "The death source is missing from this due item.");
  const deathId = due.entityIds[0]!;
  const death = world.history.personDeaths.find((row) => row.id === deathId);
  if (!death) return cancelled(world, "The recorded death is unavailable.");
  const seatId = eligibleDeathSeats(world, deathId, death.personId).find((id) =>
    due.stableKey.startsWith(
      `${JUDICIAL_NPC_NOMINATION_TRANSITION}:${id}:${deathId}:attempt:`,
    ),
  );
  if (!seatId) return cancelled(world, "The death vacancy is no longer open.");
  const seat = world.judiciary!.seats[seatId]!;
  const court = courtById(world, seat.courtId)!;
  const path = resolveJudicialSelectionPlan(world, seatId, "vacancy");
  if (
    path.state !== "ready" ||
    path.plan.stages[0]?.mechanism !== "EXECUTIVE_NOMINATION" ||
    path.plan.stages[0]?.actor.value !== "President of the United States"
  )
    return cancelled(
      world,
      "The actual seat has no admitted Presidential vacancy path.",
    );
  const review = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_NPC_REVIEW_EVENT &&
      event.tags.includes(`seat:${seatId}`) &&
      event.tags.includes(`death:${deathId}`),
  );
  const selectionId = review?.tags
    .find((tag) => tag.startsWith("selection:"))
    ?.slice(10);
  const selection = selectionId
    ? judicialSelectionById(world, selectionId)
    : null;
  if (review && !selection)
    return cancelled(world, "The recorded NPC review has no saved selection.");
  if (
    selection &&
    judicialSelectionStages(world, selection.recordId).length > 0
  )
    return cancelled(world, "The Presidential nomination already advanced.");
  if (
    world.history.decisionTraces.some((trace) =>
      trace.context.stableKey.endsWith(`:${due.id}:president`),
    )
  )
    return cancelled(
      world,
      "This due consideration already has a saved Presidential choice.",
    );
  if (
    !selection &&
    world.judiciary!.selections.some(
      (item) =>
        item.seatId === seatId &&
        !world.judiciary!.seatTenures.some(
          (tenure) => tenure.selection.selectionRecordId === item.recordId,
        ) &&
        !["rejected", "lapsed"].includes(
          judicialSelectionStages(world, item.recordId).at(-1)?.outcome ??
            "pending",
        ),
    )
  )
    return cancelled(world, "Another selection already owns this vacancy.");
  const president = currentPresidentOf(world);
  if (!president)
    return retry(
      world,
      due,
      seatId,
      deathId,
      "judiciary:npc-president-absent",
      "No sitting President can consider the vacancy today.",
    );
  if (
    world.control.kind === "person" &&
    world.control.personId === president.personId
  )
    return cancelled(
      world,
      "The controlled President retains the explicit nomination route.",
    );
  assertNpcAutonomousApplication(world, president.personId);
  let next = world;
  let pendingSelection = selection;
  if (!pendingSelection) {
    const candidates = [
      ...new Set(publicSeatedJudges(next).map((judge) => judge.personId)),
    ].filter(
      (personId) =>
        personId !== president.personId &&
        !(next.control.kind === "person" && next.control.personId === personId),
    );
    if (candidates.length === 0)
      return retry(
        next,
        due,
        seatId,
        deathId,
        "judiciary:npc-roster-empty",
        "No living seated judge is available for consideration.",
      );
    next = openJudicialSelectionFromProfile(next, {
      seatId,
      kind: "vacancy",
      candidatePersonIds: candidates,
    });
    pendingSelection = next.judiciary!.selections.at(-1)!;
    next = recordWorldEvent(next, {
      stableKey: `${JUDICIAL_NPC_REVIEW_EVENT}:${seatId}:${deathId}`,
      type: JUDICIAL_NPC_REVIEW_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: court.jurisdictionId,
      involvedEntityIds: [president.personId, death.personId],
      participants: [
        {
          personId: president.personId,
          role: "focus:actor",
          detail: "President",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        `seat:${seatId}`,
        `death:${deathId}`,
        `selection:${pendingSelection.recordId}`,
      ],
      summary: `President ${personName(next.people[president.personId]!)} considered the public judicial roster for ${court.name}.`,
      context: {
        location: null,
        socialContext: "Presidential vacancy review",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  const selectionRecordId = pendingSelection.recordId;
  const previouslyAnswered = new Set(
    next.history.events
      .filter(
        (event) =>
          (event.type === "judicial.candidate-interview" ||
            event.type === JUDICIAL_NPC_CANDIDATE_RESPONSE_EVENT) &&
          event.tags.includes(`selection:${selectionRecordId}`),
      )
      .flatMap((event) =>
        event.tags
          .filter((tag) => tag.startsWith("candidate:"))
          .map((tag) => tag.slice(10)),
      ),
  );
  const publicIds = new Set(
    publicSeatedJudges(next).map((judge) => judge.personId),
  );
  const available = pendingSelection.candidatePersonIds
    .filter(
      (id) =>
        publicIds.has(id) &&
        id !== president.personId &&
        !(next.control.kind === "person" && next.control.personId === id) &&
        !previouslyAnswered.has(id) &&
        (screenFederalJudicialNominee(next, id).state === "ready" ||
          !next.judiciary?.philosophies.some(
            (record) => record.personId === id,
          )),
    )
    .sort();
  if (available.length === 0)
    return {
      world: next,
      status: "blocked",
      reasonKey: "judiciary:npc-candidate-unresolved",
      context:
        "No unasked living seated candidate can answer this saved selection.",
      outcomeEventId: null,
    };
  // PLACEHOLDER(wave2): a bounded seeded shortlist keeps this fictional NPC
  // deliberation tractable; every option is an actual public seated judge.
  const shortlist = available.slice(0, 8);
  const presidentChoice = evaluateDecision(next, {
    stableKey: `${JUDICIAL_NPC_NOMINATION_TRANSITION}:${selectionRecordId}:${due.id}:president`,
    decisionType: "judicial.npc-president-candidate-choice",
    actorPersonId: president.personId,
    cutoff: {
      asOfDate: next.currentDate,
      historySequenceExclusive: next.history.nextSequence,
    },
    subject: {
      kind: "context:government",
      key: "federal-judicial-vacancy",
      entityId: null,
    },
    options: [
      ...shortlist.map((id) => ({
        key: id,
        label: personName(next.people[id]!),
        description: "Consider this publicly seated judge for the vacancy.",
      })),
      {
        key: "defer",
        label: "Defer",
        description: "Wait before asking a judicial candidate.",
      },
    ],
    constraints: [],
    considerations: shortlist.map((id) => ({
      stableKey: `${JUDICIAL_NPC_NOMINATION_TRANSITION}:${selectionRecordId}:${due.id}:public-service:${id}`,
      optionKey: id,
      sourceType: "context:judicial-public-roster" as const,
      direction: "supports" as const,
      importance: "slight" as const,
      confidence: "high" as const,
      explanation:
        "The person holds a current judicial seat in the public roster.",
      sourceRefs: [],
    })),
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, presidentChoice);
  const presidentialDecisionId = next.history.decisionTraces.at(-1)!.id;
  const candidateId = presidentChoice.selectedOptionKey;
  if (!candidateId || candidateId === "defer")
    return retry(
      next,
      due,
      seatId,
      deathId,
      "judiciary:npc-president-deferred",
      "The President deferred the candidate approach.",
    );
  if (screenFederalJudicialNominee(next, candidateId).state !== "ready")
    next = recordFederalJudicialCandidateResponse(next, {
      selectionRecordId,
      candidatePersonId: candidateId,
    });
  if (screenFederalJudicialNominee(next, candidateId).state !== "ready")
    return retry(
      next,
      due,
      seatId,
      deathId,
      "judiciary:npc-candidate-unresolved",
      "The candidate did not state a supported judicial view.",
    );
  assertNpcAutonomousApplication(next, candidateId);
  const candidateChoice = evaluateDecision(next, {
    stableKey: `${JUDICIAL_NPC_NOMINATION_TRANSITION}:${selectionRecordId}:${candidateId}:response`,
    decisionType: "judicial.npc-candidate-nomination-response",
    actorPersonId: candidateId,
    cutoff: {
      asOfDate: next.currentDate,
      historySequenceExclusive: next.history.nextSequence,
    },
    subject: {
      kind: "context:government",
      key: "federal-judicial-nomination",
      entityId: null,
    },
    options: [
      {
        key: "accept",
        label: "Accept consideration",
        description:
          "Agree to be nominated for the vacant federal judicial seat.",
      },
      {
        key: "decline",
        label: "Decline consideration",
        description:
          "Do not agree to be nominated for the vacant federal judicial seat.",
      },
    ],
    constraints: [],
    considerations: [],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, candidateChoice);
  const candidateDecisionId = next.history.decisionTraces.at(-1)!.id;
  next = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_NPC_CANDIDATE_RESPONSE_EVENT}:${selectionRecordId}:${candidateId}`,
    type: JUDICIAL_NPC_CANDIDATE_RESPONSE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: court.jurisdictionId,
    involvedEntityIds: [president.personId, candidateId],
    participants: [
      {
        personId: candidateId,
        role: "focus:actor",
        detail: "Judicial candidate",
      },
      {
        personId: president.personId,
        role: "focus:asked-of",
        detail: "President",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `seat:${seatId}`,
      `death:${deathId}`,
      `selection:${selectionRecordId}`,
      `candidate:${candidateId}`,
      `decision:${candidateDecisionId}`,
      `president-decision:${presidentialDecisionId}`,
      `answer:${candidateChoice.selectedOptionKey}`,
    ],
    summary: `${personName(next.people[candidateId]!)} ${candidateChoice.selectedOptionKey === "accept" ? "agreed to" : "declined"} Presidential consideration for ${court.name}.`,
    context: {
      location: null,
      socialContext: "Presidential judicial nomination inquiry",
      pressure: null,
      choice: candidateChoice.selectedOptionKey,
      motivation: null,
      immediateReaction: null,
    },
  });
  if (candidateChoice.selectedOptionKey !== "accept")
    return retry(
      next,
      due,
      seatId,
      deathId,
      "judiciary:npc-candidate-declined",
      "The candidate declined the nomination approach.",
    );
  next = recordFederalJudicialNomination(next, {
    selectionRecordId,
    presidentPersonId: president.personId,
    nomineePersonId: candidateId,
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context:
      "The candidate agreed and the President recorded an Article III nomination.",
    outcomeEventId: next.history.events.find(
      (event) =>
        event.type === "judicial.nomination" &&
        event.tags.includes(`selection:${selectionRecordId}`),
    )!.id,
  };
}
