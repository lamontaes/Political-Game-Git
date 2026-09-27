/** A nomination report needs a distinct noticed business sitting and actor ballots. */

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
import { recordWorldEvent } from "../world";
import { senateJudiciaryAppointment } from "./committee-organization";
import {
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  pendingFederalJudicialNomination,
} from "./federal-confirmation";
import { judicialNominationRecommendation } from "./nomination-reasoning";

export const JUDICIAL_REPORT_NOTICE_EVENT = "judicial.report-business-notice";
export const JUDICIAL_REPORT_SITTING_EVENT = "judicial.report-business-sitting";
export const JUDICIAL_REPORT_BALLOT_EVENT = "judicial.report-business-ballot";
export const JUDICIAL_REPORT_PLAYER_CHOICE_EVENT =
  "judicial.report-business-player-choice";
export const JUDICIAL_REPORT_RESULT_EVENT = "judicial.committee-report-result";
export const JUDICIAL_EXEC_CALENDAR_EVENT =
  "judicial.executive-calendar-admission";
export const JUDICIAL_REPORT_TRANSITION =
  "judiciary:nomination-report-business" as const;
export const JUDICIAL_FLOOR_TRANSITION = "judiciary:nomination-floor" as const;

export type ReportBallot =
  | "report-favorably"
  | "report-unfavorably"
  | "report-without-recommendation"
  | "oppose-report"
  | "present";
export interface ReportBusinessChoice {
  readonly attendance: "attend" | "absent";
  readonly ballot: ReportBallot | null;
}

const selectionTag = (selectionRecordId: string) =>
  `selection:${selectionRecordId}`;
const reportResult = (world: World, selectionRecordId: string) =>
  world.history.events.find(
    (event) =>
      event.type === JUDICIAL_REPORT_RESULT_EVENT &&
      event.tags.includes(selectionTag(selectionRecordId)),
  );
const reportNotice = (world: World, selectionRecordId: string) =>
  world.history.events.find(
    (event) =>
      event.type === JUDICIAL_REPORT_NOTICE_EVENT &&
      event.tags.includes(selectionTag(selectionRecordId)),
  );
const hearingFor = (world: World, selectionRecordId: string) =>
  world.history.events.find(
    (event) =>
      event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
      event.tags.includes(selectionTag(selectionRecordId)),
  );
const reportDue = (world: World, selectionRecordId: string) =>
  world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === JUDICIAL_REPORT_TRANSITION &&
      item.stableKey.endsWith(`:${selectionRecordId}`),
  );

/** The chair's report-business notice is distinct from hearing notice. */
export function scheduleJudicialReportBusiness(
  world: World,
  selectionRecordId: string,
  playerChoice?: "schedule",
): World {
  const pending = pendingFederalJudicialNomination(world, selectionRecordId);
  const hearing = hearingFor(world, selectionRecordId);
  const referral = world.history.events.find(
    (event) =>
      event.type === "judicial.senate-referral" &&
      event.tags.includes(selectionTag(selectionRecordId)),
  );
  const appointment = senateJudiciaryAppointment(world);
  if (!hearing || !referral || !appointment)
    throw new Error(
      "A report sitting needs the actual hearing, referral, and appointed Judiciary chair.",
    );
  if (reportNotice(world, selectionRecordId)) return world;
  const controlledChair =
    world.control.kind === "person" &&
    world.control.personId === appointment.chairPersonId;
  if (controlledChair && !playerChoice) return world;
  if (!controlledChair && playerChoice)
    throw new Error(
      "Only the controlled appointed chair can choose this notice.",
    );
  let next = world;
  if (!controlledChair) {
    const decision = evaluateDecision(world, {
      stableKey: `judicial-report:${selectionRecordId}:chair-notice`,
      decisionType: "judiciary.chair-report-business-notice",
      actorPersonId: appointment.chairPersonId,
      cutoff: currentHistoricalCutoff(world),
      subject: {
        kind: "context:government",
        key: `judicial-report:${selectionRecordId}`,
        entityId: null,
      },
      options: [
        {
          key: "schedule",
          label: "Schedule business",
          description:
            "Give three calendar days' notice for committee report business.",
        },
        {
          key: "defer",
          label: "Defer",
          description: "Leave the nomination before Judiciary.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: `judicial-report:${selectionRecordId}:heard`,
          optionKey: "schedule",
          sourceType: "context:government",
          direction: "supports",
          importance: "moderate",
          confidence: "medium",
          explanation:
            "The referred nominee gave a recorded public hearing answer.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(world, decision);
    if (decision.selectedOptionKey !== "schedule") return next;
  }
  const dueAt = nextCongressSitting(addDays(next.currentDate, 3));
  next = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_REPORT_NOTICE_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_REPORT_NOTICE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [appointment.chairPersonId, pending.nomineeId],
    participants: [
      {
        personId: appointment.chairPersonId,
        role: "focus:actor",
        detail: "Appointed Judiciary chair",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      selectionTag(selectionRecordId),
      `appointment:${appointment.eventId}`,
      `hearing:${hearing.id}`,
      `chair:${appointment.chairPersonId}`,
      `business-date:${dueAt}`,
      "notice:three-calendar-days",
    ],
    summary: `${personName(next.people[appointment.chairPersonId]!)} gave notice of a Judiciary business sitting on the pending judicial nomination for ${dueAt}.`,
    context: {
      location: null,
      socialContext: "Judiciary nomination report business notice",
      pressure: null,
      choice: "schedule",
      motivation: null,
      immediateReaction: null,
    },
  });
  const noticeId = next.history.events.at(-1)!.id;
  const savedNotice = next.history.events.at(-1)!;
  for (const memberId of appointment.memberPersonIds) {
    next = recordEventKnowledge(next, {
      stableKey: `judicial-report:${selectionRecordId}:notice:${memberId}`,
      personId: memberId,
      eventId: noticeId,
      learnedAt: next.currentDate,
      believedSummary: savedNotice.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: noticeId },
    });
  }
  return scheduleFutureDueItem(next, {
    stableKey: `${JUDICIAL_REPORT_TRANSITION}:${selectionRecordId}`,
    dueAt,
    transitionKey: JUDICIAL_REPORT_TRANSITION,
    entityIds: [pending.nomineeId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [noticeId] },
  });
}

export function recordControlledJudiciaryReportNotice(
  world: World,
  selectionRecordId: string,
): World {
  const appointment = senateJudiciaryAppointment(world);
  if (
    world.control.kind !== "person" ||
    !appointment ||
    world.control.personId !== appointment.chairPersonId
  )
    throw new Error(
      "Only the controlled Judiciary chair can give this business notice.",
    );
  const spent = advanceWorldMinutes(world, 15);
  if (spent === world)
    throw new Error("A saved commitment blocks this chair action.");
  return scheduleJudicialReportBusiness(spent, selectionRecordId, "schedule");
}

function businessMoment(world: World, minuteOfDay: number) {
  return simulationMomentAtLocalTime({
    date: world.currentDate,
    minuteOfDay,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

/** All report-session attendance and ballots are new occurrences. */
export function conductJudicialReportBusiness(
  world: World,
  selectionRecordId: string,
  controlled:
    | (ReportBusinessChoice & { readonly completionEventId: EntityId | null })
    | null = null,
): World {
  const pending = pendingFederalJudicialNomination(world, selectionRecordId);
  const appointment = senateJudiciaryAppointment(world);
  const notice = reportNotice(world, selectionRecordId);
  const due = reportDue(world, selectionRecordId);
  if (
    !appointment ||
    !notice ||
    !due ||
    world.currentDate !== due.dueAt ||
    !notice.tags.includes(`appointment:${appointment.eventId}`) ||
    !notice.tags.includes(`business-date:${world.currentDate}`) ||
    addDays(notice.occurredAt, 3) > world.currentDate
  )
    throw new Error(
      "A report sitting needs the current appointment and three days' notice on this date.",
    );
  if (reportResult(world, selectionRecordId)) return world;
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_REPORT_SITTING_EVENT &&
        event.tags.includes(selectionTag(selectionRecordId)),
    )
  )
    return world;
  const hearing = hearingFor(world, selectionRecordId);
  if (!hearing || !notice.tags.includes(`hearing:${hearing.id}`))
    throw new Error("The report sitting has no recorded hearing basis.");
  const controlledId =
    world.control.kind === "person" ? world.control.personId : null;
  const playerIsMember =
    controlledId !== null && appointment.memberPersonIds.includes(controlledId);
  if (playerIsMember && !controlled)
    throw new Error(
      "The controlled Judiciary member must choose this business attendance and ballot.",
    );
  if (!playerIsMember && controlled)
    throw new Error(
      "Only a controlled appointed member can supply a business choice.",
    );
  if (
    controlled &&
    ((controlled.attendance === "attend" && !controlled.ballot) ||
      (controlled.attendance === "absent" &&
        (controlled.ballot || controlled.completionEventId)))
  )
    throw new Error("A report ballot requires actual business attendance.");
  if (
    controlled?.ballot &&
    ![
      "report-favorably",
      "report-unfavorably",
      "report-without-recommendation",
      "oppose-report",
      "present",
    ].includes(controlled.ballot)
  )
    throw new Error("Unknown Judiciary report ballot.");
  if (controlled?.attendance === "attend") {
    const completion = world.history.events.find(
      (event) => event.id === controlled.completionEventId,
    );
    const activity = world.history.scheduledActivities.find(
      (item) =>
        completion?.involvedEntityIds.includes(item.id) &&
        item.sourceEntityIds.includes(notice.id),
    );
    if (
      completion?.type !== "schedule.activity-completed" ||
      completion.occurredAt !== world.currentDate ||
      !completion.participants.some(
        (participant) =>
          participant.personId === controlledId &&
          participant.role === "presence:participant",
      ) ||
      !activity?.participantPersonIds.includes(controlledId!)
    )
      throw new Error(
        "The controlled member has no performed business attendance basis.",
      );
  }
  const senate = seatedCongressChamber(world, "senate");
  const seated = new Set(
    senate?.body.members.map((member) => member.personId) ?? [],
  );
  const start = businessMoment(world, 10 * 60);
  const end = businessMoment(world, 11 * 60);
  let next = world;
  let playerChoiceEventId: EntityId | null = null;
  if (controlled && controlledId) {
    next = recordWorldEvent(next, {
      stableKey: `${JUDICIAL_REPORT_PLAYER_CHOICE_EVENT}:${selectionRecordId}`,
      type: JUDICIAL_REPORT_PLAYER_CHOICE_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: pending.court.jurisdictionId,
      involvedEntityIds: [controlledId, pending.nomineeId],
      participants: [
        {
          personId: controlledId,
          role: "focus:actor",
          detail: "Controlled Judiciary member",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        selectionTag(selectionRecordId),
        `notice:${notice.id}`,
        `attendance:${controlled.attendance}`,
        `ballot:${controlled.ballot ?? "none"}`,
        ...(controlled.completionEventId
          ? [`completion:${controlled.completionEventId}`]
          : []),
      ],
      summary: `${personName(next.people[controlledId]!)} chose ${controlled.attendance === "attend" ? `to attend and vote ${controlled.ballot}` : "not to attend"} the distinct Judiciary report business sitting.`,
      context: {
        location: null,
        socialContext: "Controlled Judiciary report business choice",
        pressure: null,
        choice: controlled.ballot,
        motivation: null,
        immediateReaction: controlled.attendance,
      },
    });
    playerChoiceEventId = next.history.events.at(-1)!.id;
  }
  const present: EntityId[] = [];
  for (const memberId of appointment.memberPersonIds) {
    if (!seated.has(memberId)) continue;
    if (memberId === controlledId) {
      if (controlled?.attendance === "attend") present.push(memberId);
      continue;
    }
    const conflict = scheduledConflictExists(next, [memberId], start, end);
    const decision = evaluateDecision(next, {
      stableKey: `judicial-report:${selectionRecordId}:attendance:${memberId}`,
      decisionType: "judiciary.report-business-attendance",
      actorPersonId: memberId,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "context:government",
        key: `judicial-report:${selectionRecordId}`,
        entityId: null,
      },
      options: [
        {
          key: "attend",
          label: "Attend",
          description: "Take part in the noticed business sitting.",
        },
        {
          key: "absent",
          label: "Absent",
          description: "Do not attend the business sitting.",
        },
      ],
      constraints: conflict
        ? [
            {
              stableKey: `judicial-report:${selectionRecordId}:conflict:${memberId}`,
              optionKey: "attend",
              kind: "calendar-conflict",
              explanation: "A saved activity overlaps this sitting.",
              sourceRefs: [],
            },
          ]
        : [],
      considerations: [
        {
          stableKey: `judicial-report:${selectionRecordId}:noticed-duty:${memberId}`,
          optionKey: "attend",
          sourceType: "context:government",
          direction: "supports",
          importance: "moderate",
          confidence: "medium",
          explanation:
            "PLACEHOLDER: an appointed member received notice of report business.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, decision);
    if (decision.selectedOptionKey === "attend") present.push(memberId);
  }
  next = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_REPORT_SITTING_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_REPORT_SITTING_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [pending.nomineeId, ...present],
    participants: present.map((personId) => ({
      personId,
      role: "presence:participant" as const,
      detail: "Judiciary member at report business",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      selectionTag(selectionRecordId),
      `notice:${notice.id}`,
      `appointment:${appointment.eventId}`,
      ...present.map((id) => `attendee:${id}`),
      ...(controlled?.completionEventId
        ? [`player-completion:${controlled.completionEventId}`]
        : []),
      ...(playerChoiceEventId ? [`player-choice:${playerChoiceEventId}`] : []),
    ],
    summary: `${present.length} appointed Judiciary members attended the distinct nomination report business sitting.`,
    context: {
      location: null,
      socialContext: "Judiciary nomination report business",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const sittingId = next.history.events.at(-1)!.id;
  const minorityPresent = present.filter((id) =>
    appointment.minorityMemberPersonIds.includes(id),
  ).length;
  const requiredPresent = Math.max(
    9,
    Math.floor(appointment.memberPersonIds.length / 2) + 1,
  );
  if (
    !appointment.minorityPartyKey ||
    appointment.minorityMemberPersonIds.length < 2 ||
    present.length < requiredPresent ||
    minorityPresent < 2
  )
    return next;

  // Circulate the public hearing record to the members who came to decide.
  for (const memberId of present) {
    if (
      next.history.knowledge.some(
        (row) => row.personId === memberId && row.eventId === hearing.id,
      )
    )
      continue;
    next = recordEventKnowledge(next, {
      stableKey: `judicial-report:${selectionRecordId}:hearing-record:${memberId}`,
      personId: memberId,
      eventId: hearing.id,
      learnedAt: next.currentDate,
      believedSummary: hearing.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: hearing.id },
    });
  }
  const ballots: { personId: EntityId; ballot: ReportBallot }[] = [];
  for (const memberId of present) {
    let ballot: ReportBallot;
    let reason: string;
    if (memberId === controlledId && controlled) {
      ballot = controlled.ballot!;
      reason = "The controlled Senator chose this committee report ballot.";
    } else {
      const recommendation = judicialNominationRecommendation(
        next,
        selectionRecordId,
        memberId,
      );
      const favored =
        recommendation.state === "ready"
          ? recommendation.ballot
          : "present-not-voting";
      const decision = evaluateDecision(next, {
        stableKey: `judicial-report:${selectionRecordId}:ballot:${memberId}`,
        decisionType: "judiciary.nomination-report-ballot",
        actorPersonId: memberId,
        cutoff: currentHistoricalCutoff(next),
        subject: {
          kind: "context:government",
          key: `judicial-report:${selectionRecordId}`,
          entityId: null,
        },
        options: [
          {
            key: "report-favorably",
            label: "Report favorably",
            description: "Send the nomination to the Senate with support.",
          },
          {
            key: "report-unfavorably",
            label: "Report unfavorably",
            description: "Send the nomination without support.",
          },
          {
            key: "report-without-recommendation",
            label: "Report without recommendation",
            description: "Send the nomination without a committee opinion.",
          },
          {
            key: "oppose-report",
            label: "Oppose report",
            description: "Keep the nomination in committee.",
          },
          {
            key: "present",
            label: "Present",
            description: "Attend without a report vote.",
          },
        ],
        constraints: [],
        considerations:
          favored === "yea" || favored === "nay"
            ? [
                {
                  stableKey: `judicial-report:${selectionRecordId}:known-case:${memberId}`,
                  optionKey:
                    favored === "yea"
                      ? "report-favorably"
                      : "report-unfavorably",
                  sourceType: "context:government",
                  direction: "supports",
                  importance: "moderate",
                  confidence: "medium",
                  explanation:
                    "This member's known nomination factors informed their own committee choice.",
                  sourceRefs: [],
                },
              ]
            : [],
        perceptionIds: [],
        randomness: "close-choices",
        retention: "durable",
      });
      next = recordDurableDecisionTrace(next, decision);
      ballot = decision.selectedOptionKey as ReportBallot;
      reason = recommendation.reason;
    }
    ballots.push({ personId: memberId, ballot });
    next = recordWorldEvent(next, {
      stableKey: `${JUDICIAL_REPORT_BALLOT_EVENT}:${selectionRecordId}:${memberId}`,
      type: JUDICIAL_REPORT_BALLOT_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: pending.court.jurisdictionId,
      involvedEntityIds: [memberId, pending.nomineeId],
      participants: [
        {
          personId: memberId,
          role: "focus:actor",
          detail: "Appointed Judiciary member",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        selectionTag(selectionRecordId),
        `sitting:${sittingId}`,
        `member:${memberId}`,
        `ballot:${ballot}`,
      ],
      summary: `${personName(next.people[memberId]!)} chose ${ballot.replaceAll("-", " ")} in committee report business.`,
      context: {
        location: null,
        socialContext: "Judiciary nomination report ballot",
        pressure: null,
        choice: ballot,
        motivation: reason,
        immediateReaction: ballot,
      },
    });
  }
  const support = ballots.filter(({ ballot }) =>
    ballot.startsWith("report-"),
  ).length;
  const carried = support > present.length / 2;
  const recommendations = [
    "report-favorably",
    "report-unfavorably",
    "report-without-recommendation",
  ] as const;
  const choice =
    recommendations.find(
      (key) => ballots.filter((row) => row.ballot === key).length > support / 2,
    ) ?? "none";
  next = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_REPORT_RESULT_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_REPORT_RESULT_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [pending.nomineeId, ...present],
    participants: present.map((personId) => ({
      personId,
      role: "presence:participant" as const,
      detail: "Judiciary member at report vote",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      selectionTag(selectionRecordId),
      `sitting:${sittingId}`,
      `appointment:${appointment.eventId}`,
      `hearing:${hearing.id}`,
      `result:${carried ? "reported" : "not-reported"}`,
      `support:${support}`,
      `present:${present.length}`,
      `minority-present:${minorityPresent}`,
      `recommendation:${carried ? choice : "none"}`,
    ],
    summary: carried
      ? `Judiciary voted ${support} of ${present.length} present members to report the judicial nomination; its recorded recommendation was ${choice}.`
      : `Judiciary did not report the judicial nomination; ${support} of ${present.length} present members supported the report motion.`,
    context: {
      location: null,
      socialContext: "Judiciary nomination report result",
      pressure: null,
      choice: carried ? "reported" : "not-reported",
      motivation: null,
      immediateReaction: carried ? "reported" : "not-reported",
    },
  });
  if (!carried) return next;
  const reportId = next.history.events.at(-1)!.id;
  next = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_EXEC_CALENDAR_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_EXEC_CALENDAR_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [pending.nomineeId],
    participants: [
      {
        personId: pending.nomineeId,
        role: "focus:subject",
        detail: "Reported judicial nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      selectionTag(selectionRecordId),
      `report:${reportId}`,
      `hearing:${hearing.id}`,
    ],
    summary:
      "The reported judicial nomination was placed on the Senate Executive Calendar; final confirmation is still pending.",
    context: {
      location: null,
      socialContext: "Senate Executive Calendar admission",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const calendarId = next.history.events.at(-1)!.id;
  // PLACEHOLDER(overnight): scheduling an ordinary later sitting is not a
  // claim of leadership consent or a final Senate vote.
  return scheduleFutureDueItem(next, {
    stableKey: `${JUDICIAL_FLOOR_TRANSITION}:${selectionRecordId}`,
    dueAt: nextCongressSitting(addDays(next.currentDate, 3)),
    transitionKey: JUDICIAL_FLOOR_TRANSITION,
    entityIds: [pending.nomineeId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [calendarId] },
  });
}

export function recordControlledJudiciaryReportChoice(
  world: World,
  selectionRecordId: string,
  choice: ReportBusinessChoice,
): World {
  const appointment = senateJudiciaryAppointment(world);
  const notice = reportNotice(world, selectionRecordId);
  const due = reportDue(world, selectionRecordId);
  const controlledId =
    world.control.kind === "person" ? world.control.personId : null;
  if (
    !controlledId ||
    !appointment?.memberPersonIds.includes(controlledId) ||
    !notice ||
    !due ||
    world.currentDate !== due.dueAt
  )
    throw new Error(
      "Only a controlled appointed Judiciary member can choose on the business date.",
    );
  if (
    (choice.attendance === "attend" && !choice.ballot) ||
    (choice.attendance === "absent" && choice.ballot)
  )
    throw new Error("A report ballot requires actual attendance.");
  let next = world;
  let completionEventId: EntityId | null = null;
  if (choice.attendance === "attend") {
    if (world.currentMoment.minuteOfDay > 10 * 60)
      throw new Error("The noticed business sitting has passed.");
    const start = businessMoment(world, 10 * 60);
    const end = businessMoment(world, 11 * 60);
    if (scheduledConflictExists(world, [controlledId], start, end))
      throw new Error("A saved activity prevents business attendance.");
    next = createScheduledActivity(world, {
      stableKey: `judicial-report:${selectionRecordId}:controlled-attendance`,
      title: "Senate Judiciary nomination business",
      summary: "Attend the noticed committee report sitting.",
      kind: "confirmed",
      start,
      end,
      participantPersonIds: [controlledId],
      responsiblePersonId: controlledId,
      location: {
        locationKey: "senate-judiciary-room",
        label: "Senate Judiciary room",
        jurisdictionId: null,
      },
      sourceEntityIds: [notice.id],
      flexibility: { kind: "fixed" },
      access: { kind: "office" },
    });
    const activityId = next.history.scheduledActivities.at(-1)!.id;
    next = performScheduledActivity(next, activityId);
    completionEventId =
      [...next.history.events]
        .reverse()
        .find(
          (event) =>
            event.type === "schedule.activity-completed" &&
            event.involvedEntityIds.includes(activityId) &&
            event.participants.some(
              (participant) =>
                participant.personId === controlledId &&
                participant.role === "presence:participant",
            ),
        )?.id ?? null;
    if (!completionEventId)
      throw new Error(
        "The controlled member has no completed business attendance.",
      );
  } else {
    next = advanceWorldMinutes(world, 5);
    if (next === world)
      throw new Error("A saved commitment blocks this business choice.");
  }
  return conductJudicialReportBusiness(next, selectionRecordId, {
    ...choice,
    completionEventId,
  });
}

export function judicialReportBusinessHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const notice = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_REPORT_NOTICE_EVENT &&
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
      reasonKey: "judiciary:report-notice-unavailable",
      context: "No saved report-business notice supports this date.",
      outcomeEventId: null,
    };
  const appointment = senateJudiciaryAppointment(world);
  if (
    world.control.kind === "person" &&
    appointment?.memberPersonIds.includes(world.control.personId)
  )
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:player-report-choice-needed",
      context:
        "The controlled Judiciary member must choose their own business attendance and report ballot.",
      outcomeEventId: null,
    };
  try {
    const next = conductJudicialReportBusiness(world, selectionRecordId);
    const result = reportResult(next, selectionRecordId);
    const sitting = next.history.events.find(
      (event) =>
        event.type === JUDICIAL_REPORT_SITTING_EVENT &&
        event.tags.includes(selectionTag(selectionRecordId)),
    );
    return {
      world: next,
      status: result ? "resolved" : "blocked",
      reasonKey: result ? null : "judiciary:report-quorum-unavailable",
      context: result
        ? "Committee report business and its separate motion outcome were recorded."
        : "Actual report-session attendance did not meet the appointed committee's quorum and minority-presence requirements.",
      outcomeEventId: result?.id ?? sitting?.id ?? null,
    };
  } catch (error) {
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:report-business-cannot-proceed",
      context:
        error instanceof Error
          ? error.message
          : "Report business could not proceed.",
      outcomeEventId: null,
    };
  }
}

/** Calendar admission alone never casts a Senator's floor ballot. */
export function judicialNominationFloorHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const calendar = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_EXEC_CALENDAR_EVENT &&
      due.provenance.kind === "simulated" &&
      due.provenance.sourceEntityIds.includes(event.id),
  );
  return {
    world,
    status: "blocked",
    reasonKey: calendar
      ? "judiciary:floor-consideration-choice-needed"
      : "judiciary:calendar-admission-unavailable",
    context: calendar
      ? "The nomination is on the Executive Calendar; a separate Senate floor sitting and actor ballots are still required."
      : "No committee report admitted this nomination to the Executive Calendar.",
    outcomeEventId: null,
  };
}
