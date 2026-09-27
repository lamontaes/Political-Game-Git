/** Public notice, actual participation, and the bounded Senate hearing. */

import { addDays, simulationMomentAtLocalTime } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  nextCongressSitting,
  seatedCongressChamber,
} from "../governing/congress-chambers";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import { recordEventKnowledge } from "../records";
import {
  advanceWorldMinutes,
  createScheduledActivity,
  performScheduledActivity,
  scheduledConflictExists,
} from "../time-work";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import {
  advanceWithWorldIntegrityAtEnd,
  assertWorldIntegrity,
  recordWorldEvent,
} from "../world";
import {
  recordControlledSenateJudiciaryOrganizationChoice,
  senateJudiciaryAppointment,
  type SenateOrganizationPlayerChoice,
} from "./committee-organization";
import {
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  pendingFederalJudicialNomination,
} from "./federal-confirmation";
import { recordFederalJudicialHearing } from "./federal-hearing";
import { scheduleJudicialReportBusiness } from "./senate-committee-report";

export const JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT =
  "judicial.public-hearing-notice";
export const JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT =
  "judicial.public-hearing-attendance";
export const JUDICIAL_PUBLIC_HEARING_PLAYER_CHOICE_EVENT =
  "judicial.public-hearing-player-choice";
export const JUDICIAL_PUBLIC_HEARING_TRANSITION =
  "judiciary:public-confirmation-hearing" as const;

function noticeFor(world: World, selectionRecordId: string) {
  return world.history.events.find(
    (event) =>
      event.type === JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT &&
      event.tags.includes(`selection:${selectionRecordId}`),
  );
}

function hearingDue(world: World, selectionRecordId: string) {
  return world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === JUDICIAL_PUBLIC_HEARING_TRANSITION &&
      item.stableKey.endsWith(`:${selectionRecordId}`),
  );
}

function hearingMoment(world: World, minuteOfDay: number) {
  return simulationMomentAtLocalTime({
    date: world.currentDate,
    minuteOfDay,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

/** A chair's new choice, distinct from the earlier business meeting notice. */
export function announcePublicJudicialHearing(
  world: World,
  selectionRecordId: string,
  playerChoice?: "announce",
): World {
  const pending = pendingFederalJudicialNomination(world, selectionRecordId);
  const appointment = senateJudiciaryAppointment(world);
  if (!appointment)
    throw new Error("The Senate has no appointed Judiciary chair.");
  if (
    !world.history.events.some(
      (event) =>
        event.type === "judicial.senate-referral" &&
        event.tags.includes(`selection:${selectionRecordId}`),
    )
  )
    throw new Error("The Senate has not referred this nomination.");
  if (noticeFor(world, selectionRecordId)) return world;
  const chairId = appointment.chairPersonId;
  const controlledChair =
    world.control.kind === "person" && world.control.personId === chairId;
  if (controlledChair && !playerChoice)
    throw new Error(
      "The controlled Judiciary chair must choose whether to announce a hearing.",
    );
  if (!controlledChair && playerChoice)
    throw new Error(
      "Only the controlled Judiciary chair can supply this hearing choice.",
    );
  let next = world;
  let choice: "announce" | "defer" | undefined = playerChoice;
  let decisionId: EntityId | null = null;
  if (!controlledChair) {
    const evaluation = evaluateDecision(world, {
      stableKey: `judicial-public-hearing:${selectionRecordId}:chair:${chairId}`,
      decisionType: "judiciary.chair-public-hearing-notice",
      actorPersonId: chairId,
      cutoff: currentHistoricalCutoff(world),
      subject: {
        kind: "context:government",
        key: `judicial-public-hearing:${selectionRecordId}`,
        entityId: null,
      },
      options: [
        {
          key: "announce",
          label: "Announce hearing",
          description: "Give seven calendar days' public notice.",
        },
        {
          key: "defer",
          label: "Defer",
          description: "Leave the referred nomination pending.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: `judicial-public-hearing:${selectionRecordId}:referral`,
          optionKey: "announce",
          sourceType: "context:government",
          direction: "supports",
          importance: "moderate",
          confidence: "medium",
          explanation:
            "PLACEHOLDER: the appointed chair has a pending referral to hear.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(world, evaluation);
    choice = evaluation.selectedOptionKey === "announce" ? "announce" : "defer";
    decisionId = next.history.decisionTraces.at(-1)!.id;
  }
  if (choice !== "announce") return next;
  const dueAt = nextCongressSitting(addDays(next.currentDate, 6));
  const notice = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [chairId, pending.nomineeId],
    participants: [
      {
        personId: chairId,
        role: "focus:actor",
        detail: "Appointed Judiciary chair",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${selectionRecordId}`,
      `candidate:${pending.nomineeId}`,
      `appointment:${appointment.eventId}`,
      `chair:${chairId}`,
      `hearing-date:${dueAt}`,
      "hearing-minute:600",
      "hearing-place:senate-judiciary-room",
      "notice:seven-calendar-days",
      ...(decisionId
        ? [`decision:${decisionId}`]
        : ["choice:controlled-chair"]),
    ],
    summary: `${personName(next.people[chairId]!)} publicly announced a Judiciary hearing on the pending judicial nomination for ${dueAt} at 10 a.m. in the Senate Judiciary hearing room.`,
    context: {
      location: null,
      socialContext: "Public Senate Judiciary hearing notice",
      pressure: null,
      choice: "announce",
      motivation: null,
      immediateReaction: null,
    },
  });
  const noticeId = notice.history.events.at(-1)!.id;
  let informed = notice;
  for (const personId of new Set([
    ...appointment.memberPersonIds,
    pending.nomineeId,
  ])) {
    informed = recordEventKnowledge(informed, {
      stableKey: `judicial-hearing-notice:${selectionRecordId}:delivered:${personId}`,
      personId,
      eventId: noticeId,
      learnedAt: informed.currentDate,
      believedSummary: notice.history.events.at(-1)!.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: noticeId },
    });
  }
  return scheduleFutureDueItem(informed, {
    stableKey: `${JUDICIAL_PUBLIC_HEARING_TRANSITION}:${selectionRecordId}`,
    dueAt,
    transitionKey: JUDICIAL_PUBLIC_HEARING_TRANSITION,
    entityIds: [pending.nomineeId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [noticeId] },
  });
}

/** Player chair action uses the ordinary clock before announcing. */
export function recordControlledJudiciaryChairHearingChoice(
  world: World,
  selectionRecordId: string,
  choice: "announce",
): World {
  const appointment = senateJudiciaryAppointment(world);
  if (
    !appointment ||
    world.control.kind !== "person" ||
    world.control.personId !== appointment.chairPersonId
  )
    throw new Error(
      "Only the controlled appointed chair can make this hearing choice.",
    );
  const spent = advanceWorldMinutes(world, 15);
  if (spent === world)
    throw new Error("A saved commitment blocks this chair action.");
  return announcePublicJudicialHearing(spent, selectionRecordId, choice);
}

/** Continue after the controlled Senator supplies the missing organization ballot. */
export function recordControlledOrganizationAndHearingNotice(
  world: World,
  selectionRecordId: string,
  choice: SenateOrganizationPlayerChoice,
): World {
  const organizationDue = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === "judiciary:committee-consideration" &&
      item.stableKey.endsWith(`:${selectionRecordId}`),
  );
  if (!organizationDue || organizationDue.dueAt > world.currentDate)
    throw new Error("The Senate Judiciary organization sitting is not due.");
  const organized = recordControlledSenateJudiciaryOrganizationChoice(
    world,
    choice,
    organizationDue.id,
  );
  const appointment = senateJudiciaryAppointment(organized);
  if (!appointment) return organized;
  if (
    organized.control.kind === "person" &&
    organized.control.personId === appointment.chairPersonId
  )
    return organized;
  return announcePublicJudicialHearing(organized, selectionRecordId);
}

function recordHearingAttendance(
  world: World,
  selectionRecordId: string,
  controlled: {
    readonly attended: boolean;
    readonly completionEventId: EntityId | null;
  } | null,
): World {
  const pending = pendingFederalJudicialNomination(world, selectionRecordId);
  const appointment = senateJudiciaryAppointment(world);
  const notice = noticeFor(world, selectionRecordId);
  if (!appointment || !notice)
    throw new Error("The hearing has no appointed chair and public notice.");
  if (addDays(notice.occurredAt, 7) > world.currentDate)
    throw new Error(
      "Seven calendar days' public hearing notice has not elapsed.",
    );
  if (
    !notice.tags.includes(`appointment:${appointment.eventId}`) ||
    !notice.tags.includes(`hearing-date:${world.currentDate}`)
  )
    throw new Error("The hearing notice does not authorize this date.");
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT &&
        event.tags.includes(`selection:${selectionRecordId}`),
    )
  )
    throw new Error("Hearing attendance is already recorded.");
  if (
    world.control.kind === "person" &&
    world.control.personId === pending.nomineeId
  )
    throw new Error(
      "The controlled nominee must supply their own hearing response; this route is unavailable.",
    );

  const start = hearingMoment(world, 10 * 60);
  const end = hearingMoment(world, 11 * 60);
  const controlledId =
    world.control.kind === "person" ? world.control.personId : null;
  const currentCommittee = new Set(appointment.memberPersonIds);
  if (controlled) {
    const completion = world.history.events.find(
      (event) => event.id === controlled.completionEventId,
    );
    const activity = world.history.scheduledActivities.find(
      (candidate) =>
        completion?.involvedEntityIds.includes(candidate.id) &&
        candidate.sourceEntityIds.includes(notice.id),
    );
    if (
      !controlledId ||
      !currentCommittee.has(controlledId) ||
      (controlled.attended &&
        (!completion ||
          completion.type !== "schedule.activity-completed" ||
          completion.occurredAt !== world.currentDate ||
          !completion.participants.some(
            (participant) =>
              participant.personId === controlledId &&
              participant.role === "presence:participant",
          ) ||
          !activity ||
          !activity.participantPersonIds.includes(controlledId))) ||
      (!controlled.attended && controlled.completionEventId !== null)
    )
      throw new Error(
        "The controlled Senator has no performed hearing attendance basis.",
      );
  }
  const seated = new Set(
    seatedCongressChamber(world, "senate")?.body.members.map(
      (member) => member.personId,
    ) ?? [],
  );
  let next = world;
  const attendeeIds: EntityId[] = [];
  for (const personId of appointment.memberPersonIds) {
    if (!seated.has(personId)) continue;
    if (personId === controlledId) {
      if (!controlled)
        throw new Error(
          "The controlled Senator must choose hearing attendance.",
        );
      if (controlled.attended) attendeeIds.push(personId);
      continue;
    }
    const conflict = scheduledConflictExists(next, [personId], start, end);
    const decision = evaluateDecision(next, {
      stableKey: `judicial-hearing:${selectionRecordId}:attendance:${personId}`,
      decisionType: "judiciary.confirmation-hearing-attendance",
      actorPersonId: personId,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "context:government",
        key: `judicial-hearing:${selectionRecordId}`,
        entityId: null,
      },
      options: [
        {
          key: "attend",
          label: "Attend",
          description: "Attend the announced hearing.",
        },
        {
          key: "absent",
          label: "Absent",
          description: "Do not attend the announced hearing.",
        },
      ],
      constraints: conflict
        ? [
            {
              stableKey: `judicial-hearing:${selectionRecordId}:conflict:${personId}`,
              optionKey: "attend",
              kind: "calendar-conflict",
              explanation: "A saved activity overlaps this hearing.",
              sourceRefs: [],
            },
          ]
        : [],
      considerations: [
        {
          stableKey: `judicial-hearing:${selectionRecordId}:invitation:${personId}`,
          optionKey: "attend",
          sourceType: "context:government",
          direction: "supports",
          importance: "slight",
          confidence: "low",
          explanation:
            "PLACEHOLDER: the member received this committee hearing invitation.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, decision);
    if (decision.selectedOptionKey === "attend") attendeeIds.push(personId);
  }
  if (attendeeIds.some((id) => !currentCommittee.has(id)))
    throw new Error("A hearing attendee is not appointed to Judiciary.");

  const nomineeConflict = scheduledConflictExists(
    next,
    [pending.nomineeId],
    start,
    end,
  );
  const nomineeDecision = evaluateDecision(next, {
    stableKey: `judicial-hearing:${selectionRecordId}:nominee-attendance`,
    decisionType: "judiciary.nominee-hearing-attendance",
    actorPersonId: pending.nomineeId,
    cutoff: currentHistoricalCutoff(next),
    subject: {
      kind: "context:government",
      key: `judicial-hearing:${selectionRecordId}`,
      entityId: null,
    },
    options: [
      {
        key: "attend",
        label: "Attend",
        description: "Appear for the announced hearing.",
      },
      {
        key: "decline",
        label: "Decline",
        description: "Do not appear at the hearing.",
      },
    ],
    constraints: nomineeConflict
      ? [
          {
            stableKey: `judicial-hearing:${selectionRecordId}:nominee-conflict`,
            optionKey: "attend",
            kind: "calendar-conflict",
            explanation: "A saved activity overlaps the nominee's hearing.",
            sourceRefs: [],
          },
        ]
      : [],
    considerations: [
      {
        stableKey: `judicial-hearing:${selectionRecordId}:nominee-invitation`,
        optionKey: "attend",
        sourceType: "context:government",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation:
          "PLACEHOLDER: the nominee has been invited to answer the committee.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, nomineeDecision);
  const nomineeAttended = nomineeDecision.selectedOptionKey === "attend";
  const participants = [
    ...(nomineeAttended
      ? [
          {
            personId: pending.nomineeId,
            role: "focus:actor" as const,
            detail: "Judicial nominee at hearing",
          },
        ]
      : []),
    ...attendeeIds.map((personId) => ({
      personId,
      role: "presence:participant" as const,
      detail: "Judiciary Senator at hearing",
    })),
  ];
  return recordWorldEvent(next, {
    stableKey: `${JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [pending.nomineeId, ...attendeeIds],
    participants,
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${selectionRecordId}`,
      `notice:${notice.id}`,
      `appointment:${appointment.eventId}`,
      `nominee:${nomineeAttended ? "present" : "absent"}`,
      ...attendeeIds.map((id) => `attendee:${id}`),
      ...(controlled?.completionEventId
        ? [`player-completion:${controlled.completionEventId}`]
        : []),
    ],
    summary: nomineeAttended
      ? `The judicial nominee and ${attendeeIds.length} Judiciary Senators were present for the announced hearing.`
      : `The judicial nominee did not appear for the announced hearing; ${attendeeIds.length} Judiciary Senators were present.`,
    context: {
      location: null,
      socialContext: "Actual Senate Judiciary hearing participation",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** The hearing is recorded only after a distinct attendance occurrence. */
export function conductPublicJudicialHearing(
  world: World,
  selectionRecordId: string,
  controlled: {
    readonly attended: boolean;
    readonly completionEventId: EntityId | null;
  } | null = null,
): World {
  assertWorldIntegrity(world);
  return advanceWithWorldIntegrityAtEnd(() =>
    conductPublicJudicialHearingUnchecked(world, selectionRecordId, controlled),
  );
}

function conductPublicJudicialHearingUnchecked(
  world: World,
  selectionRecordId: string,
  controlled: {
    readonly attended: boolean;
    readonly completionEventId: EntityId | null;
  } | null,
): World {
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
        event.tags.includes(`selection:${selectionRecordId}`),
    )
  )
    return world;
  const withAttendance = recordHearingAttendance(
    world,
    selectionRecordId,
    controlled,
  );
  const attendance = withAttendance.history.events.at(-1)!;
  const notice = noticeFor(withAttendance, selectionRecordId)!;
  const nomineePresent = attendance.tags.includes("nominee:present");
  const attendeeIds = attendance.tags
    .filter((tag) => tag.startsWith("attendee:"))
    .map((tag) => tag.slice("attendee:".length) as EntityId);
  if (!nomineePresent || attendeeIds.length === 0) return withAttendance;
  const heard = recordFederalJudicialHearing(withAttendance, {
    selectionRecordId,
    attendeeSenatorPersonIds: attendeeIds,
    noticeEventId: notice.id,
    attendanceEventId: attendance.id,
  });
  return scheduleJudicialReportBusiness(heard, selectionRecordId);
}

/** At midnight, a controlled committee member's choice remains theirs. */
export function judicialPublicHearingHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const notice = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT &&
      due.provenance.kind === "simulated" &&
      due.provenance.sourceEntityIds.includes(event.id),
  );
  const selectionRecordId = notice?.tags
    .find((tag) => tag.startsWith("selection:"))
    ?.slice("selection:".length);
  if (!selectionRecordId)
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:hearing-notice-unavailable",
      context: "No recorded public hearing notice supports this due item.",
      outcomeEventId: null,
    };
  const appointment = senateJudiciaryAppointment(world);
  if (!appointment)
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:hearing-chair-unavailable",
      context: "The Judiciary chair's appointment is no longer valid.",
      outcomeEventId: null,
    };
  if (
    world.control.kind === "person" &&
    appointment.memberPersonIds.includes(world.control.personId)
  )
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:player-hearing-choice-needed",
      context:
        "The controlled Judiciary Senator must choose whether to attend this hearing.",
      outcomeEventId: null,
    };
  try {
    const heard = conductPublicJudicialHearing(world, selectionRecordId);
    const hearing = [...heard.history.events]
      .reverse()
      .find(
        (event) =>
          event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
          event.tags.includes(`selection:${selectionRecordId}`),
      );
    return {
      world: heard,
      status: hearing ? "resolved" : "blocked",
      reasonKey: hearing ? null : "judiciary:hearing-participation-unavailable",
      context: hearing
        ? "Actual participation and the nominee's public response were recorded."
        : "The nominee or Judiciary members did not attend; no answer was recorded.",
      outcomeEventId: hearing?.id ?? null,
    };
  } catch (error) {
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:hearing-cannot-proceed",
      context:
        error instanceof Error ? error.message : "The hearing cannot proceed.",
      outcomeEventId: null,
    };
  }
}

/** Explicit player participation uses a one-person scheduled activity. */
export function recordControlledJudicialHearingParticipation(
  world: World,
  selectionRecordId: string,
  choice: "attend" | "decline",
): World {
  assertWorldIntegrity(world);
  return advanceWithWorldIntegrityAtEnd(() =>
    recordControlledJudicialHearingParticipationUnchecked(
      world,
      selectionRecordId,
      choice,
    ),
  );
}

function recordControlledJudicialHearingParticipationUnchecked(
  world: World,
  selectionRecordId: string,
  choice: "attend" | "decline",
): World {
  const appointment = senateJudiciaryAppointment(world);
  const notice = noticeFor(world, selectionRecordId);
  const due = hearingDue(world, selectionRecordId);
  if (
    world.control.kind !== "person" ||
    !appointment?.memberPersonIds.includes(world.control.personId) ||
    !notice ||
    !due ||
    world.currentDate !== due.dueAt
  )
    throw new Error(
      "Only an invited controlled Judiciary Senator can choose on the hearing day.",
    );
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_PUBLIC_HEARING_PLAYER_CHOICE_EVENT &&
        event.tags.includes(`selection:${selectionRecordId}`),
    )
  )
    throw new Error("This Senator already chose hearing participation.");
  const senatorId = world.control.personId;
  let next = world;
  let completionEventId: EntityId | null = null;
  if (choice === "attend") {
    const start = hearingMoment(world, 10 * 60);
    const end = hearingMoment(world, 11 * 60);
    if (world.currentMoment.minuteOfDay > 10 * 60)
      throw new Error("The announced hearing start has passed.");
    if (scheduledConflictExists(world, [senatorId], start, end))
      throw new Error("A saved activity prevents hearing attendance.");
    next = createScheduledActivity(world, {
      stableKey: `judicial-hearing:${selectionRecordId}:controlled-attendance`,
      title: "Senate Judiciary nomination hearing",
      summary: "Attend the announced judicial confirmation hearing.",
      kind: "confirmed",
      start,
      end,
      participantPersonIds: [senatorId],
      responsiblePersonId: senatorId,
      location: {
        locationKey: "senate-judiciary-room",
        label: "Senate Judiciary hearing room",
        jurisdictionId: null,
      },
      sourceEntityIds: [notice.id],
      flexibility: { kind: "fixed" },
      access: { kind: "office" },
    });
    const activityId = next.history.scheduledActivities.at(-1)!.id;
    next = performScheduledActivity(next, activityId);
    const completion = [...next.history.events]
      .reverse()
      .find(
        (event) =>
          event.type === "schedule.activity-completed" &&
          event.involvedEntityIds.includes(activityId) &&
          event.participants.some(
            (participant) =>
              participant.personId === senatorId &&
              participant.role === "presence:participant",
          ),
      );
    if (!completion)
      throw new Error(
        "The controlled Senator has no actual attendance record.",
      );
    completionEventId = completion.id;
  } else {
    next = advanceWorldMinutes(world, 5);
    if (next === world)
      throw new Error("A saved commitment prevents this hearing choice.");
  }
  next = recordWorldEvent(next, {
    stableKey: `judicial-hearing:${selectionRecordId}:player-choice`,
    type: JUDICIAL_PUBLIC_HEARING_PLAYER_CHOICE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [senatorId],
    participants: [
      {
        personId: senatorId,
        role: "focus:actor",
        detail: "Controlled Judiciary Senator",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${selectionRecordId}`,
      `notice:${notice.id}`,
      `choice:${choice}`,
      ...(completionEventId ? [`completion:${completionEventId}`] : []),
    ],
    summary: `${personName(next.people[senatorId]!)} ${choice === "attend" ? "attended" : "declined to attend"} the announced Judiciary hearing.`,
    context: {
      location: null,
      socialContext: "Controlled Senator's hearing participation",
      pressure: null,
      choice,
      motivation: null,
      immediateReaction: null,
    },
  });
  return conductPublicJudicialHearing(next, selectionRecordId, {
    attended: choice === "attend",
    completionEventId,
  });
}
