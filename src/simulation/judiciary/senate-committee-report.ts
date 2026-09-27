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
import { publishJudiciaryMilestone } from "./news";
import {
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  JUDICIAL_SENATE_RESULT_EVENT,
  federalJudicialSenateVoteStatus,
  pendingFederalJudicialNomination,
  recordFederalJudicialSenateBallot,
  resolveFederalJudicialSenateVote,
} from "./federal-confirmation";
import {
  judicialNominationRecommendation,
  recordNpcFederalJudicialSenateBallot,
} from "./nomination-reasoning";

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
export const JUDICIAL_FLOOR_SITTING_EVENT = "judicial.senate-floor-sitting";
export const JUDICIAL_FLOOR_PLAYER_CHOICE_EVENT =
  "judicial.senate-floor-player-choice";

export interface JudicialFloorChoice {
  readonly attendance: "attend" | "absent";
  readonly ballot: "yea" | "nay" | "present-not-voting" | null;
  readonly reason: string;
}

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
const floorDue = (world: World, selectionRecordId: string) =>
  world.history.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === JUDICIAL_FLOOR_TRANSITION &&
        (item.stableKey ===
          `${JUDICIAL_FLOOR_TRANSITION}:${selectionRecordId}` ||
          item.stableKey.startsWith(
            `${JUDICIAL_FLOOR_TRANSITION}:${selectionRecordId}:retry:`,
          )),
    )
    .at(-1);
const floorSitting = (world: World, selectionRecordId: string) =>
  world.history.events
    .filter(
      (event) =>
        event.type === JUDICIAL_FLOOR_SITTING_EVENT &&
        event.tags.includes(selectionTag(selectionRecordId)),
    )
    .at(-1);

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
  const recommendationText = {
    "report-favorably": "recorded a favorable recommendation",
    "report-unfavorably": "recorded an unfavorable recommendation",
    "report-without-recommendation": "offered no recommendation",
    none: "recorded no majority recommendation",
  }[choice];
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
      ? `Judiciary voted ${support} of ${present.length} present members to report the judicial nomination and ${recommendationText}.`
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
  const reportId = next.history.events.at(-1)!.id;
  next = publishJudiciaryMilestone(next, reportId);
  if (!carried) return next;
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

/** Conduct a distinct Senate sitting, then save each seated Senator's own ballot. */
export function conductJudicialNominationFloor(
  world: World,
  selectionRecordId: string,
  controlled:
    | (JudicialFloorChoice & { readonly completionEventId: EntityId | null })
    | null = null,
): World {
  const pending = pendingFederalJudicialNomination(world, selectionRecordId);
  const due = floorDue(world, selectionRecordId);
  if (
    due &&
    floorSitting(world, selectionRecordId)?.tags.includes(`due:${due.id}`)
  )
    return world;
  const calendar = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_EXEC_CALENDAR_EVENT &&
      event.tags.includes(selectionTag(selectionRecordId)) &&
      due?.provenance.kind === "simulated" &&
      due.provenance.sourceEntityIds.includes(event.id),
  );
  const report = calendar ? reportResult(world, selectionRecordId) : null;
  const hearing = hearingFor(world, selectionRecordId);
  if (
    !due ||
    world.currentDate !== due.dueAt ||
    !calendar ||
    !report?.tags.includes("result:reported") ||
    !calendar.tags.includes(`report:${report.id}`) ||
    !hearing ||
    !calendar.tags.includes(`hearing:${hearing.id}`) ||
    calendar.occurredAt > world.currentDate
  )
    throw new Error(
      "The Senate floor needs this date's saved report and Executive Calendar admission.",
    );
  const senate = seatedCongressChamber(world, "senate");
  if (!senate) throw new Error("The Senate has no saved seating.");
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  const controlledId =
    controlledPersonId &&
    senate.body.members.some((member) => member.personId === controlledPersonId)
      ? controlledPersonId
      : null;
  if (controlledId && !controlled)
    throw new Error(
      "The controlled Senator must choose their own floor action.",
    );
  if (!controlledId && controlled)
    throw new Error(
      "Only a controlled seated Senator can choose a floor action.",
    );
  if (
    controlled &&
    (!controlled.reason.trim() ||
      (controlled.attendance === "attend" &&
        !["yea", "nay", "present-not-voting"].includes(
          controlled.ballot ?? "",
        )) ||
      (controlled.attendance !== "attend" && controlled.ballot !== null) ||
      !["attend", "absent"].includes(controlled.attendance))
  )
    throw new Error(
      "The Senator must state a valid attendance, ballot, and reason.",
    );
  if (controlled?.attendance === "attend") {
    const completion = world.history.events.find(
      (event) => event.id === controlled.completionEventId,
    );
    const activity = world.history.scheduledActivities.find(
      (item) =>
        completion?.involvedEntityIds.includes(item.id) &&
        item.sourceEntityIds.includes(calendar.id),
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
        "The controlled Senator has no performed floor attendance.",
      );
  }

  const start = businessMoment(world, 13 * 60);
  const end = businessMoment(world, 14 * 60);
  let next = world;
  let choiceEventId: EntityId | null = null;
  if (controlled && controlledId) {
    next = recordWorldEvent(next, {
      stableKey: `${JUDICIAL_FLOOR_PLAYER_CHOICE_EVENT}:${selectionRecordId}:${due.id}`,
      type: JUDICIAL_FLOOR_PLAYER_CHOICE_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: pending.court.jurisdictionId,
      involvedEntityIds: [controlledId, pending.nomineeId],
      participants: [
        {
          personId: controlledId,
          role: "focus:actor",
          detail: "Controlled Senator",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        selectionTag(selectionRecordId),
        `due:${due.id}`,
        `calendar:${calendar.id}`,
        `attendance:${controlled.attendance}`,
        `ballot:${controlled.ballot ?? controlled.attendance}`,
        ...(controlled.completionEventId
          ? [`completion:${controlled.completionEventId}`]
          : []),
      ],
      summary: `${personName(next.people[controlledId]!)} chose ${controlled.ballot ?? controlled.attendance} for Senate floor consideration of the judicial nomination.`,
      context: {
        location: null,
        socialContext: "Senate judicial nomination floor choice",
        pressure: null,
        choice: controlled.ballot ?? controlled.attendance,
        motivation: controlled.reason.trim(),
        immediateReaction: controlled.attendance,
      },
    });
    choiceEventId = next.history.events.at(-1)!.id;
  }
  const present: EntityId[] = [];
  const absent = new Map<EntityId, { disposition: "absent"; reason: string }>();
  for (const member of senate.body.members) {
    const memberId = member.personId;
    if (!memberId) continue;
    if (memberId === controlledId && controlled) {
      if (controlled.attendance === "attend") present.push(memberId);
      else
        absent.set(memberId, {
          disposition: controlled.attendance,
          reason: controlled.reason.trim(),
        });
      continue;
    }
    const conflict = scheduledConflictExists(next, [memberId], start, end);
    const decision = evaluateDecision(next, {
      stableKey: `judicial-floor:${selectionRecordId}:${due.id}:attendance:${memberId}`,
      decisionType: "judiciary.nomination-floor-attendance",
      actorPersonId: memberId,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "context:government",
        key: `judicial-floor:${selectionRecordId}`,
        entityId: null,
      },
      options: [
        {
          key: "attend",
          label: "Attend",
          description: "Attend the Senate floor sitting.",
        },
        {
          key: "absent",
          label: "Absent",
          description: "Miss this floor sitting.",
        },
      ],
      constraints: conflict
        ? [
            {
              stableKey: `judicial-floor:${selectionRecordId}:${due.id}:conflict:${memberId}`,
              optionKey: "attend",
              kind: "calendar-conflict",
              explanation: "A saved activity overlaps the Senate sitting.",
              sourceRefs: [],
            },
          ]
        : [],
      considerations: [
        {
          stableKey: `judicial-floor:${selectionRecordId}:${due.id}:calendar:${memberId}`,
          optionKey: "attend",
          sourceType: "context:government",
          direction: "supports",
          importance: "moderate",
          confidence: "medium",
          explanation:
            "The reported nomination has a saved Executive Calendar place.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, decision);
    if (decision.selectedOptionKey === "attend") present.push(memberId);
    else
      absent.set(memberId, {
        disposition: "absent",
        reason: conflict
          ? "A saved activity conflicted with the floor sitting."
          : "The Senator chose not to attend the floor sitting.",
      });
  }
  next = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_FLOOR_SITTING_EVENT}:${selectionRecordId}:${due.id}`,
    type: JUDICIAL_FLOOR_SITTING_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [pending.nomineeId, ...present],
    participants: present.map((personId) => ({
      personId,
      role: "presence:participant" as const,
      detail: "Senator at nomination floor sitting",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      selectionTag(selectionRecordId),
      `due:${due.id}`,
      `calendar:${calendar.id}`,
      `report:${report.id}`,
      `hearing:${hearing.id}`,
      ...senate.body.members.flatMap((member) =>
        member.personId ? [`roster:${member.personId}`] : [],
      ),
      ...present.map((id) => `attendee:${id}`),
      ...[...absent.keys()].map((id) => `absent:${id}`),
      ...(controlled?.completionEventId
        ? [`player-completion:${controlled.completionEventId}`]
        : []),
      ...(choiceEventId ? [`player-choice:${choiceEventId}`] : []),
    ],
    summary: `${present.length} seated Senators attended the judicial nomination's Senate floor sitting.`,
    context: {
      location: null,
      socialContext: "Senate judicial nomination floor sitting",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const sittingId = next.history.events.at(-1)!.id;
  // A public hearing transcript becomes knowledge only for actual attendees.
  for (const memberId of present) {
    if (
      next.history.knowledge.some(
        (row) =>
          row.personId === memberId &&
          row.eventId === hearing.id &&
          row.accuracy === "accurate" &&
          row.learnedAt <= next.currentDate,
      )
    )
      continue;
    next = recordEventKnowledge(next, {
      stableKey: `judicial-floor:${selectionRecordId}:hearing-record:${memberId}`,
      personId: memberId,
      eventId: hearing.id,
      learnedAt: next.currentDate,
      believedSummary: hearing.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: hearing.id },
    });
  }
  for (const member of senate.body.members) {
    const memberId = member.personId;
    if (!memberId) continue;
    if (memberId === controlledId && controlled) {
      next = recordFederalJudicialSenateBallot(next, {
        selectionRecordId,
        senatorPersonId: memberId,
        ballot:
          controlled.attendance === "attend"
            ? controlled.ballot!
            : controlled.attendance,
        reason: controlled.reason,
        expectedSittingId: sittingId,
      });
    } else if (absent.has(memberId)) {
      const disposition = absent.get(memberId)!;
      next = recordFederalJudicialSenateBallot(next, {
        selectionRecordId,
        senatorPersonId: memberId,
        ballot: disposition.disposition,
        reason: disposition.reason,
        expectedSittingId: sittingId,
      });
    } else {
      next = recordNpcFederalJudicialSenateBallot(
        next,
        selectionRecordId,
        memberId,
      );
    }
  }
  const status = federalJudicialSenateVoteStatus(next, selectionRecordId);
  if (status.state !== "ready") {
    // PLACEHOLDER(wave2): a nomination left unresolved at an actual sitting
    // returns on the game's next Congress date. The earlier roll call remains.
    return scheduleFutureDueItem(next, {
      stableKey: `${JUDICIAL_FLOOR_TRANSITION}:${selectionRecordId}:retry:${sittingId}`,
      dueAt: nextCongressSitting(next.currentDate),
      transitionKey: JUDICIAL_FLOOR_TRANSITION,
      entityIds: [pending.nomineeId],
      jurisdictionId: null,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [calendar.id, sittingId],
      },
    });
  }
  // PLACEHOLDER(wave2): the ordinary Senate majority rule is used by the
  // existing confirmation writer until a nomination-specific rule is saved.
  return resolveFederalJudicialSenateVote(next, selectionRecordId);
}

/** The controlled Senator spends a real sitting before their ballot is saved. */
export function recordControlledJudicialNominationFloorChoice(
  world: World,
  selectionRecordId: string,
  choice: JudicialFloorChoice,
): World {
  const senate = seatedCongressChamber(world, "senate");
  const controlledId =
    world.control.kind === "person" ? world.control.personId : null;
  const due = floorDue(world, selectionRecordId);
  const calendar = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_EXEC_CALENDAR_EVENT &&
      event.tags.includes(selectionTag(selectionRecordId)) &&
      due?.provenance.kind === "simulated" &&
      due.provenance.sourceEntityIds.includes(event.id),
  );
  if (
    !controlledId ||
    !senate?.body.members.some((member) => member.personId === controlledId) ||
    !due ||
    world.currentDate !== due.dueAt ||
    !calendar
  )
    throw new Error(
      "Only a controlled seated Senator can act on this floor date.",
    );
  if (floorSitting(world, selectionRecordId)?.tags.includes(`due:${due.id}`))
    return world;
  if (
    !choice.reason.trim() ||
    !["attend", "absent"].includes(choice.attendance) ||
    (choice.attendance === "attend" &&
      !["yea", "nay", "present-not-voting"].includes(choice.ballot ?? "")) ||
    (choice.attendance !== "attend" && choice.ballot !== null)
  )
    throw new Error(
      "The Senator must state a valid attendance, ballot, and reason.",
    );
  let next = world;
  let completionEventId: EntityId | null = null;
  if (choice.attendance === "attend") {
    if (world.currentMoment.minuteOfDay > 13 * 60)
      throw new Error("The Senate floor sitting has passed.");
    const start = businessMoment(world, 13 * 60);
    const end = businessMoment(world, 14 * 60);
    if (scheduledConflictExists(world, [controlledId], start, end))
      throw new Error("A saved activity prevents Senate floor attendance.");
    next = createScheduledActivity(world, {
      stableKey: `judicial-floor:${selectionRecordId}:${due.id}:controlled-attendance`,
      title: "Senate judicial nomination floor sitting",
      summary: "Attend the Senate floor sitting for the reported nomination.",
      kind: "confirmed",
      start,
      end,
      participantPersonIds: [controlledId],
      responsiblePersonId: controlledId,
      location: {
        locationKey: "us-senate-chamber",
        label: "United States Senate chamber",
        jurisdictionId: null,
      },
      sourceEntityIds: [calendar.id],
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
        "The controlled Senator has no completed floor attendance.",
      );
  } else {
    next = advanceWorldMinutes(world, 5);
    if (next === world)
      throw new Error("A saved commitment blocks this Senate action.");
  }
  return conductJudicialNominationFloor(next, selectionRecordId, {
    ...choice,
    completionEventId,
  });
}

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
  const selectionRecordId = calendar?.tags
    .find((tag) => tag.startsWith("selection:"))
    ?.slice("selection:".length);
  if (!selectionRecordId)
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:calendar-admission-unavailable",
      context:
        "No committee report admitted this nomination to the Executive Calendar.",
      outcomeEventId: null,
    };
  const senate = seatedCongressChamber(world, "senate");
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  if (
    controlledPersonId &&
    senate?.body.members.some(
      (member) => member.personId === controlledPersonId,
    )
  )
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:floor-consideration-choice-needed",
      context:
        "The controlled Senator must choose their own floor attendance and ballot.",
      outcomeEventId: null,
    };
  try {
    const next = conductJudicialNominationFloor(world, selectionRecordId);
    const result = next.history.events.find(
      (event) =>
        event.type === JUDICIAL_SENATE_RESULT_EVENT &&
        event.tags.includes(selectionTag(selectionRecordId)),
    );
    const sitting = floorSitting(next, selectionRecordId);
    const vote = result
      ? null
      : federalJudicialSenateVoteStatus(next, selectionRecordId);
    return {
      world: next,
      status: result ? "resolved" : "blocked",
      reasonKey: result ? null : "judiciary:floor-vote-unresolved",
      context: result
        ? "The Senate sitting, actor ballots, and judicial nomination result were recorded."
        : vote?.state === "unresolved"
          ? vote.reason
          : "The Senate sitting did not resolve the nomination.",
      outcomeEventId: result?.id ?? sitting?.id ?? null,
    };
  } catch (error) {
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:floor-cannot-proceed",
      context:
        error instanceof Error
          ? error.message
          : "Senate floor business could not proceed.",
      outcomeEventId: null,
    };
  }
}
