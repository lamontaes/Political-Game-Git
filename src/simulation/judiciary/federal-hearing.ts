/** A candidate's recorded public answer and the Senators who actually heard it. */

import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { addDays } from "../dates";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { personName } from "../people";
import { recordEventKnowledge } from "../records";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { senateJudiciaryAppointment } from "./committee-organization";
import { JUDICIAL_CANDIDATE_INTERVIEW_EVENT } from "./candidate-interview";
import { publishJudiciaryMilestone } from "./news";
import {
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  pendingFederalJudicialNomination,
} from "./federal-confirmation";

/**
 * A hearing is a new candidate statement, not publication of the private
 * Presidential interview. Only Senators named as present gain direct knowledge.
 */
export function recordFederalJudicialHearing(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly attendeeSenatorPersonIds: readonly EntityId[];
    readonly noticeEventId: EntityId;
    readonly attendanceEventId: EntityId;
  },
): World {
  const pending = pendingFederalJudicialNomination(
    world,
    input.selectionRecordId,
  );
  const senate = seatedCongressChamber(world, "senate");
  if (!senate) throw new Error("The Senate has no saved seating.");
  const attendees = [...new Set(input.attendeeSenatorPersonIds)];
  if (
    attendees.length === 0 ||
    attendees.length !== input.attendeeSenatorPersonIds.length
  )
    throw new Error("A hearing needs distinct attending Senators.");
  const seated = new Set(senate.body.members.map((member) => member.personId));
  if (attendees.some((personId) => !seated.has(personId)))
    throw new Error("A hearing attendee must be a seated Senator.");
  const appointment = senateJudiciaryAppointment(world);
  const notice = world.history.events.find(
    (event) => event.id === input.noticeEventId,
  );
  const attendance = world.history.events.find(
    (event) => event.id === input.attendanceEventId,
  );
  if (
    !appointment ||
    notice?.type !== "judicial.public-hearing-notice" ||
    !notice.tags.includes(`selection:${input.selectionRecordId}`) ||
    !notice.tags.includes(`appointment:${appointment.eventId}`) ||
    addDays(notice.occurredAt, 7) > world.currentDate
  )
    throw new Error(
      "A hearing needs an appointed chair and seven days' public notice.",
    );
  if (
    attendance?.type !== "judicial.public-hearing-attendance" ||
    attendance.occurredAt !== world.currentDate ||
    !attendance.tags.includes(`selection:${input.selectionRecordId}`) ||
    !attendance.tags.includes(`notice:${notice.id}`) ||
    !attendance.participants.some(
      (participant) =>
        participant.personId === pending.nomineeId &&
        participant.role === "focus:actor",
    ) ||
    attendees.some(
      (personId) =>
        !appointment.memberPersonIds.includes(personId) ||
        !attendance.participants.some(
          (participant) =>
            participant.personId === personId &&
            participant.role === "presence:participant",
        ),
    ) ||
    attendance.participants.filter(
      (participant) => participant.role === "presence:participant",
    ).length !== attendees.length
  )
    throw new Error(
      "A hearing needs the nominee and exactly its recorded Judiciary attendees.",
    );
  if (
    world.control.kind === "person" &&
    world.control.personId === pending.nomineeId
  )
    throw new Error(
      "The controlled nominee must choose their own hearing answer.",
    );
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
        event.tags.includes(`selection:${input.selectionRecordId}`),
    )
  )
    throw new Error("This nomination already has a recorded hearing.");

  const interview = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_CANDIDATE_INTERVIEW_EVENT &&
      event.tags.includes(`selection:${input.selectionRecordId}`) &&
      event.tags.includes(`candidate:${pending.nomineeId}`) &&
      event.context.choice !== null,
  );
  const priorTraceId = interview?.tags
    .find((tag) => tag.startsWith("decision:"))
    ?.slice("decision:".length);
  const priorTrace = world.history.decisionTraces.find(
    (trace) => trace.id === priorTraceId,
  );
  if (
    !interview?.context.choice ||
    !priorTrace ||
    priorTrace.context.actorPersonId !== pending.nomineeId
  )
    throw new Error(
      "The candidate has no own recorded answer to offer at a hearing.",
    );

  const stableKey = `judicial-hearing:${input.selectionRecordId}`;
  const evaluation = evaluateDecision(world, {
    stableKey: `${stableKey}:candidate-answer`,
    decisionType: "judicial.hearing-answer",
    actorPersonId: pending.nomineeId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:government",
      key: "judicial-confirmation-hearing",
      entityId: null,
    },
    options: [
      {
        key: "state",
        label: "State the position",
        description: "State the previously recorded view publicly.",
      },
      {
        key: "decline",
        label: "Decline to state it",
        description: "Give no position at this hearing.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `${stableKey}:prior-answer`,
        optionKey: "state",
        sourceType: "mind:own-prior-answer",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation:
          "The candidate may choose to repeat a position stated in a prior contact.",
        sourceRefs: [
          { kind: "decision-trace", decisionTraceId: priorTrace.id },
        ],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const answer =
    evaluation.selectedOptionKey === "state" ? interview.context.choice : null;
  const candidate = next.people[pending.nomineeId]!;
  // COPY-PENDING: candidate public-hearing line needs editorial grounding.
  next = recordWorldEvent(next, {
    stableKey,
    type: JUDICIAL_CONFIRMATION_HEARING_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [pending.nomineeId, ...attendees],
    participants: [
      {
        personId: pending.nomineeId,
        role: "focus:actor",
        detail: "Judicial nominee",
      },
      ...attendees.map((personId) => ({
        personId,
        role: "presence:participant" as const,
        detail: "Senator at the hearing",
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${input.selectionRecordId}`,
      `candidate:${pending.nomineeId}`,
      `decision:${next.history.decisionTraces.at(-1)!.id}`,
      `notice:${notice.id}`,
      `attendance:${attendance.id}`,
      `answer:${answer === null ? "unresolved" : "stated"}`,
    ],
    summary: answer
      ? `${personName(candidate)} stated at the Senate hearing: ${answer}`
      : `${personName(candidate)} did not state a position at the Senate hearing.`,
    context: {
      location: null,
      socialContext: "Senate hearing on a federal judicial nomination",
      pressure: null,
      choice: answer,
      motivation: null,
      immediateReaction: null,
    },
  });
  const hearing = next.history.events.at(-1)!;
  for (const senatorPersonId of attendees) {
    next = recordEventKnowledge(next, {
      stableKey: `${stableKey}:heard:${senatorPersonId}`,
      personId: senatorPersonId,
      eventId: hearing.id,
      learnedAt: next.currentDate,
      believedSummary: hearing.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  return publishJudiciaryMilestone(next, hearing.id);
}
