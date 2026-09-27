/** An active Presidential contact that records one candidate's own stated method. */

import { currentPresidentOf } from "../crisis/offices";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { personName } from "../people";
import { latestPersonalValue } from "../queries";
import { recordEventKnowledge } from "../records";
import { advanceWorldMinutes } from "../time-work";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { courtById, seatHolderAt } from "./courts";
import { recordJudicialPhilosophy } from "./philosophy";
import {
  judicialSelectionById,
  judicialSelectionProgress,
  resolveJudicialSelectionPlan,
  screenFederalJudicialNominee,
} from "./selection";

export const JUDICIAL_CANDIDATE_INTERVIEW_EVENT =
  "judicial.candidate-interview";

function assertContactAvailable(
  world: World,
  selectionRecordId: string,
  candidatePersonId: EntityId,
): { courtName: string; jurisdictionId: EntityId | null } {
  if (!currentPresidentOf(world))
    throw new Error("A sitting President is required for this interview.");
  const selection = judicialSelectionById(world, selectionRecordId);
  if (!selection || !selection.candidatePersonIds.includes(candidatePersonId))
    throw new Error("Candidate is outside the pending judicial selection.");
  const seat = world.judiciary?.seats[selection.seatId];
  const court = seat && courtById(world, seat.courtId);
  if (!court?.level.startsWith("federal-"))
    throw new Error("Candidate interview requires a federal judicial seat.");
  if (seatHolderAt(world, selection.seatId))
    throw new Error("The judicial seat is already filled.");
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === candidatePersonId &&
        death.diedAt <= world.currentDate,
    )
  )
    throw new Error("A deceased candidate cannot be interviewed.");
  const resolved = resolveJudicialSelectionPlan(
    world,
    selection.seatId,
    selection.kind,
  );
  if (resolved.state !== "ready") throw new Error(resolved.reason);
  const progress = judicialSelectionProgress(
    world,
    selectionRecordId,
    resolved.plan,
  );
  const stage =
    progress.status === "pending"
      ? resolved.plan.stages[progress.nextOrder - 1]
      : null;
  if (
    stage?.mechanism !== "EXECUTIVE_NOMINATION" ||
    stage.actor.value !== "President of the United States"
  )
    throw new Error(
      "This judicial selection is not awaiting a Presidential nomination.",
    );
  if (screenFederalJudicialNominee(world, candidatePersonId).state === "ready")
    throw new Error("Candidate already has a supported judicial philosophy.");
  if (
    world.judiciary?.philosophies.some(
      (row) => row.personId === candidatePersonId,
    )
  )
    throw new Error("Candidate philosophy requires a later dated review.");
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_CANDIDATE_INTERVIEW_EVENT &&
        event.tags.includes(`selection:${selectionRecordId}`) &&
        event.tags.includes(`candidate:${candidatePersonId}`),
    )
  )
    throw new Error("This candidate has already answered for this selection.");
  return { courtName: court.name, jurisdictionId: court.jurisdictionId };
}

/**
 * The explicit contact spends time. Only relevant recorded values can support
 * a candidate's answer. Other philosophy axes stay unknown.
 */
export function interviewFederalJudicialCandidate(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly candidatePersonId: EntityId;
  },
): World {
  const president = currentPresidentOf(world);
  if (
    !president ||
    world.control.kind !== "person" ||
    world.control.personId !== president.personId
  )
    throw new Error(
      "Only the player serving as President can interview a nominee.",
    );
  assertContactAvailable(
    world,
    input.selectionRecordId,
    input.candidatePersonId,
  );
  // The state executive work pack does not represent the Presidency.
  // Ordinary controlled time still checks scheduled commitments.
  const next = advanceWorldMinutes(world, 30);
  if (next === world)
    throw new Error("A scheduled commitment prevents this interview.");
  return recordFederalJudicialCandidateResponse(next, input);
}

/** Records an authorized President's contact after the calling action spends time. */
export function recordFederalJudicialCandidateResponse(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly candidatePersonId: EntityId;
  },
): World {
  const court = assertContactAvailable(
    world,
    input.selectionRecordId,
    input.candidatePersonId,
  );
  const presidentPersonId = currentPresidentOf(world)!.personId;
  let next = world;
  const stableKey = `judicial-interview:${input.selectionRecordId}:${input.candidatePersonId}`;
  const privacy = latestPersonalValue(
    next,
    input.candidatePersonId,
    LIFE_MIND_IDS.privacy,
  );
  const groundedValue = privacy?.orientation === "embraces" ? privacy : null;
  const candidate = next.people[input.candidatePersonId]!;
  if (!groundedValue) {
    next = recordWorldEvent(next, {
      stableKey,
      type: JUDICIAL_CANDIDATE_INTERVIEW_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: court.jurisdictionId,
      involvedEntityIds: [presidentPersonId, candidate.id],
      participants: [
        {
          personId: presidentPersonId,
          role: "focus:asked-of",
          detail: "President",
        },
        {
          personId: candidate.id,
          role: "focus:actor",
          detail: "Judicial candidate",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        `selection:${input.selectionRecordId}`,
        `candidate:${candidate.id}`,
        "answer:unresolved",
      ],
      // COPY-PENDING: editorial review before player presentation.
      summary: `${personName(candidate)} did not state how a court should weigh personal privacy when government requests information.`,
      context: {
        location: null,
        socialContext: "A Presidential interview about a judicial nomination",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = next.history.events.at(-1)!;
    return recordEventKnowledge(next, {
      stableKey: `${stableKey}:president-learns`,
      personId: presidentPersonId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  const evaluation = evaluateDecision(next, {
    stableKey: `${stableKey}:privacy-answer`,
    decisionType: "judicial.candidate-privacy-answer",
    actorPersonId: input.candidatePersonId,
    cutoff: {
      asOfDate: next.currentDate,
      historySequenceExclusive: next.history.nextSequence,
    },
    subject: {
      kind: "context:government",
      key: "judicial-privacy",
      entityId: null,
    },
    options: [
      {
        key: "protect-privacy",
        label: "Protect personal privacy",
        description:
          "Give a person's privacy more weight when government requests information.",
      },
      {
        key: "allow-request",
        label: "Allow the government request",
        description:
          "Give government more room to request personal information.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `${stableKey}:value:${groundedValue.id}`,
        optionKey: "protect-privacy",
        sourceType: "mind:personal-value" as const,
        direction: "supports" as const,
        importance: "strong" as const,
        confidence: "medium" as const,
        explanation:
          "The candidate's recorded privacy value informs this answer.",
        sourceRefs: [
          { kind: "personal-value" as const, valueRecordId: groundedValue.id },
        ],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, evaluation);
  const traceId = next.history.decisionTraces.at(-1)!.id;
  const answer = evaluation.selectedOptionKey;
  if (answer !== "protect-privacy" && answer !== "allow-request")
    throw new Error("Candidate did not answer the judicial privacy question.");
  const response =
    answer === "protect-privacy"
      ? "I would give a person's privacy more weight when government requests information."
      : "I would give government more room to request personal information.";
  // COPY-PENDING: owner editorial review of the saved in-world response.
  next = recordWorldEvent(next, {
    stableKey,
    type: JUDICIAL_CANDIDATE_INTERVIEW_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: court.jurisdictionId,
    involvedEntityIds: [presidentPersonId, candidate.id],
    participants: [
      {
        personId: presidentPersonId,
        role: "focus:asked-of",
        detail: "President",
      },
      {
        personId: candidate.id,
        role: "focus:actor",
        detail: "Judicial candidate",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `selection:${input.selectionRecordId}`,
      `candidate:${candidate.id}`,
      `court:${court.courtName}`,
      `decision:${traceId}`,
    ],
    summary: `${personName(candidate)} answered how a court should weigh privacy in a government information request: ${response}`,
    context: {
      location: null,
      socialContext: "A Presidential interview about a judicial nomination",
      pressure: null,
      choice: response,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:president-learns`,
    personId: presidentPersonId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  return recordJudicialPhilosophy(next, {
    stableKey: `${stableKey}:philosophy`,
    personId: candidate.id,
    formedAt: next.currentDate,
    dimensions: {
      rights: {
        strength: answer === "protect-privacy" ? 1 : -1,
        evidence: [
          { kind: "personal-value", id: groundedValue.id },
          { kind: "decision-trace", id: traceId },
          { kind: "historical-event", id: event.id },
        ],
        reason: `The candidate answered: ${response}`,
      },
    },
    reason:
      "The candidate stated a limited view on personal privacy in the recorded interview.",
  });
}
