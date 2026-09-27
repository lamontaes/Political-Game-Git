/** A saved Senate referral, followed by an explicit committee authority stop. */

import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { addDays } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import {
  nextCongressSitting,
  seatedCongressChamber,
} from "../governing/congress-chambers";
import { scheduleFutureDueItem } from "../future-transitions";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import type {
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  announcePublicJudicialHearing,
  JUDICIAL_PUBLIC_HEARING_TRANSITION,
  judicialPublicHearingHandler,
} from "./senate-hearing-process";
import {
  organizeSenateJudiciary,
  senateJudiciaryAppointment,
} from "./committee-organization";
import {
  JUDICIAL_FLOOR_TRANSITION,
  JUDICIAL_REPORT_TRANSITION,
  judicialNominationFloorHandler,
  judicialReportBusinessHandler,
} from "./senate-committee-report";
import { seatHolderAt } from "./courts";
import { pendingFederalJudicialNomination } from "./federal-confirmation";
import {
  JUDICIAL_SENATE_REFERRAL_TRANSITION,
  judicialSelectionById,
  judicialSelectionStages,
} from "./selection";

export const JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION =
  "judiciary:committee-consideration" as const;
export const JUDICIAL_SENATE_REFERRAL_EVENT = "judicial.senate-referral";
export const JUDICIAL_COMMITTEE_NOTICE_EVENT =
  "judicial.committee-consideration-notice";
export const JUDICIAL_COMMITTEE_SESSION_TRANSITION =
  "judiciary:committee-consideration-session" as const;

function selectionFromDueSource(
  world: World,
  due: FutureDueItem,
  eventType: string,
): string | null {
  if (due.provenance.kind !== "simulated") return null;
  const source = world.history.events.find(
    (event) =>
      event.type === eventType &&
      due.provenance.kind === "simulated" &&
      due.provenance.sourceEntityIds.includes(event.id) &&
      due.entityIds.every((id) => event.involvedEntityIds.includes(id)),
  );
  return (
    source?.tags
      .find((tag) => tag.startsWith("selection:"))
      ?.slice("selection:".length) ?? null
  );
}

function cancelled(
  world: World,
  reason: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "cancelled",
    reasonKey: "judiciary:nomination-no-longer-pending",
    context: reason,
    outcomeEventId: null,
  };
}

/** The Senate, as an institution, refers a still-pending Article III nominee. */
export function judicialSenateReferralHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const selectionRecordId = selectionFromDueSource(
    world,
    due,
    "judicial.nomination",
  );
  const selection = selectionRecordId
    ? judicialSelectionById(world, selectionRecordId)
    : null;
  const nomination = selection
    ? judicialSelectionStages(world, selection.recordId).at(-1)
    : null;
  if (
    !selection ||
    nomination?.mechanism !== "EXECUTIVE_NOMINATION" ||
    !nomination.candidatePersonId
  )
    return cancelled(world, "The pending Presidential nomination is gone.");
  if (
    seatHolderAt(world, selection.seatId) ||
    world.history.personDeaths.some(
      (death) =>
        death.personId === nomination.candidatePersonId &&
        death.diedAt <= world.currentDate,
    )
  )
    return cancelled(
      world,
      "The nominated seat or candidate is no longer available.",
    );
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_SENATE_REFERRAL_EVENT &&
        event.tags.includes(`selection:${selection.recordId}`),
    )
  )
    return cancelled(world, "The Senate already referred this nomination.");
  const senate = seatedCongressChamber(world, "senate");
  const judiciaryCommittee = US_CONGRESS_RULE_PACK.chambers
    .find((chamber) => chamber.chamberKey === "senate")
    ?.committees.find((committee) => committee.committeeKey === "judiciary");
  if (!senate?.body.members.length || !judiciaryCommittee)
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:senate-referral-authority-unavailable",
      context:
        "The Senate or its Judiciary Committee is not established in this World.",
      outcomeEventId: null,
    };
  let pending: ReturnType<typeof pendingFederalJudicialNomination>;
  try {
    pending = pendingFederalJudicialNomination(world, selection.recordId);
  } catch (error) {
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:senate-referral-path-unavailable",
      context:
        error instanceof Error
          ? error.message
          : "The judicial confirmation path is unavailable.",
      outcomeEventId: null,
    };
  }
  const nominee = world.people[pending.nomineeId]!;
  const next = recordWorldEvent(world, {
    stableKey: `${JUDICIAL_SENATE_REFERRAL_EVENT}:${selection.recordId}`,
    type: JUDICIAL_SENATE_REFERRAL_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [pending.nomineeId],
    participants: [
      {
        personId: pending.nomineeId,
        role: "focus:subject",
        detail: "Judicial nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${selection.recordId}`,
      `candidate:${pending.nomineeId}`,
      "committee:senate-judiciary",
      "game-calendar:next-congress-sitting",
    ],
    summary: `The Senate received ${personName(nominee)}'s judicial nomination and referred it to the Committee on the Judiciary. Committee consideration remains pending.`,
    context: {
      location: null,
      socialContext: "Senate referral of a federal judicial nomination",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  const scheduled = scheduleFutureDueItem(next, {
    stableKey: `${JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION}:${selection.recordId}`,
    dueAt: nextCongressSitting(next.currentDate),
    transitionKey: JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
    entityIds: [pending.nomineeId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [eventId] },
  });
  return {
    world: scheduled,
    status: "resolved",
    reasonKey: null,
    context:
      "The Senate referred the pending judicial nomination to its Judiciary Committee.",
    outcomeEventId: eventId,
  };
}

/** Do not create hearing attendance, a report, or ballots without their actors. */
export function judicialCommitteeConsiderationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const selectionRecordId = selectionFromDueSource(
    world,
    due,
    JUDICIAL_SENATE_REFERRAL_EVENT,
  );
  if (!selectionRecordId)
    return cancelled(world, "The committee item has no judicial selection.");
  const selection = judicialSelectionById(world, selectionRecordId);
  if (
    !selection ||
    judicialSelectionStages(world, selectionRecordId).at(-1)?.mechanism !==
      "EXECUTIVE_NOMINATION"
  )
    return cancelled(world, "The judicial nomination is no longer pending.");
  const nomineeId = judicialSelectionStages(world, selectionRecordId).at(
    -1,
  )?.candidatePersonId;
  if (
    seatHolderAt(world, selection.seatId) ||
    (nomineeId &&
      world.history.personDeaths.some(
        (death) =>
          death.personId === nomineeId && death.diedAt <= world.currentDate,
      ))
  )
    return cancelled(
      world,
      "The nominated seat or candidate is no longer available.",
    );
  const referral = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_SENATE_REFERRAL_EVENT &&
      event.tags.includes(`selection:${selectionRecordId}`),
  );
  if (!referral)
    return cancelled(
      world,
      "No Senate Judiciary Committee referral was recorded.",
    );
  let organized = world;
  try {
    organized = organizeSenateJudiciary(world);
  } catch (error) {
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:committee-convener-unrecorded",
      context:
        error instanceof Error
          ? error.message
          : "The Senate has not appointed a Judiciary chair.",
      outcomeEventId: null,
    };
  }
  const appointment = senateJudiciaryAppointment(organized);
  if (!appointment)
    return {
      world: organized,
      status: "blocked",
      reasonKey: "judiciary:committee-convener-unrecorded",
      context: "The Senate did not appoint an authorized Judiciary chair.",
      outcomeEventId: null,
    };
  const chairId = appointment.chairPersonId;
  if (
    organized.control.kind === "person" &&
    organized.control.personId === chairId
  )
    return {
      world: organized,
      status: "blocked",
      reasonKey: "judiciary:player-chair-scheduling-choice-needed",
      context:
        "The controlled Judiciary chair must choose whether to schedule consideration.",
      outcomeEventId: null,
    };
  const evaluation = evaluateDecision(organized, {
    stableKey: `judicial-committee-consideration:${selectionRecordId}:chair:${chairId}`,
    decisionType: "judiciary.committee-chair-scheduling",
    actorPersonId: chairId,
    cutoff: currentHistoricalCutoff(organized),
    subject: {
      kind: "context:government",
      key: `judicial-committee-consideration:${selectionRecordId}`,
      entityId: null,
    },
    options: [
      {
        key: "schedule",
        label: "Schedule consideration",
        description: "Give notice of a Judiciary business meeting.",
      },
      {
        key: "defer",
        label: "Defer consideration",
        description: "Leave the nomination pending without a meeting notice.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `judicial-committee-consideration:${selectionRecordId}:pending-referral`,
        optionKey: "schedule",
        sourceType: "context:government",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation:
          "PLACEHOLDER: an appointed chair has a referred nomination to consider.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  const decided = recordDurableDecisionTrace(organized, evaluation);
  if (evaluation.selectedOptionKey !== "schedule")
    return {
      world: decided,
      status: "blocked",
      reasonKey: "judiciary:committee-chair-deferred",
      context:
        "The appointed chair deferred committee consideration; no meeting was scheduled.",
      outcomeEventId: null,
    };
  const chair = decided.people[chairId]!;
  const noticed = recordWorldEvent(decided, {
    stableKey: `${JUDICIAL_COMMITTEE_NOTICE_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_COMMITTEE_NOTICE_EVENT,
    occurredAt: decided.currentDate,
    recordedAt: decided.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [chairId, ...(nomineeId ? [nomineeId] : [])],
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
      `appointment:${appointment.eventId}`,
      `chair:${chairId}`,
      `decision:${decided.history.decisionTraces.at(-1)!.id}`,
      "notice:three-calendar-days",
    ],
    summary: `${personName(chair)} gave notice of Senate Judiciary consideration of the pending judicial nomination. This notice does not record a hearing or attendance.`,
    context: {
      location: null,
      socialContext: "Senate Judiciary consideration notice",
      pressure: null,
      choice: "schedule",
      motivation: null,
      immediateReaction: null,
    },
  });
  const noticeId = noticed.history.events.at(-1)!.id;
  const scheduled = scheduleFutureDueItem(noticed, {
    stableKey: `${JUDICIAL_COMMITTEE_SESSION_TRANSITION}:${selectionRecordId}`,
    dueAt: nextCongressSitting(addDays(noticed.currentDate, 2)),
    transitionKey: JUDICIAL_COMMITTEE_SESSION_TRANSITION,
    entityIds: nomineeId ? [nomineeId] : [chairId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [noticeId] },
  });
  return {
    world: scheduled,
    status: "resolved",
    reasonKey: null,
    context:
      "An appointed Judiciary chair gave three calendar days' notice of consideration.",
    outcomeEventId: noticeId,
  };
}

/** The meeting still needs real participation; a notice is not attendance. */
export function judicialCommitteeSessionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const selectionRecordId = selectionFromDueSource(
    world,
    due,
    JUDICIAL_COMMITTEE_NOTICE_EVENT,
  );
  if (!selectionRecordId)
    return cancelled(world, "The committee notice has no judicial selection.");
  try {
    pendingFederalJudicialNomination(world, selectionRecordId);
  } catch (error) {
    return cancelled(
      world,
      error instanceof Error
        ? error.message
        : "The judicial nomination is no longer pending.",
    );
  }
  const notice = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_COMMITTEE_NOTICE_EVENT &&
      event.tags.includes(`selection:${selectionRecordId}`),
  );
  const appointment = senateJudiciaryAppointment(world);
  if (
    !selectionRecordId ||
    !notice ||
    !appointment ||
    !notice.tags.includes(`appointment:${appointment.eventId}`) ||
    addDays(notice.occurredAt, 3) > world.currentDate
  )
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:committee-session-authority-unavailable",
      context:
        "The committee lacks a current appointment or three days' notice.",
      outcomeEventId: null,
    };
  try {
    const announced = announcePublicJudicialHearing(world, selectionRecordId);
    const hearingNotice = [...announced.history.events]
      .reverse()
      .find(
        (event) =>
          event.type === "judicial.public-hearing-notice" &&
          event.tags.includes(`selection:${selectionRecordId}`),
      );
    return {
      world: announced,
      status: hearingNotice ? "resolved" : "blocked",
      reasonKey: hearingNotice ? null : "judiciary:chair-hearing-deferred",
      context: hearingNotice
        ? "The chair separately announced a later public hearing; the business notice proves no meeting attendance."
        : "The chair did not announce a public hearing; no business attendance is implied.",
      outcomeEventId: hearingNotice?.id ?? null,
    };
  } catch (error) {
    return {
      world,
      status: "blocked",
      reasonKey: "judiciary:public-hearing-notice-unavailable",
      context:
        error instanceof Error
          ? error.message
          : "No public hearing notice was recorded.",
      outcomeEventId: null,
    };
  }
}

export const JUDICIAL_SENATE_HANDLERS = [
  [JUDICIAL_SENATE_REFERRAL_TRANSITION, judicialSenateReferralHandler],
  [
    JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
    judicialCommitteeConsiderationHandler,
  ],
  [JUDICIAL_COMMITTEE_SESSION_TRANSITION, judicialCommitteeSessionHandler],
  [JUDICIAL_PUBLIC_HEARING_TRANSITION, judicialPublicHearingHandler],
  [JUDICIAL_REPORT_TRANSITION, judicialReportBusinessHandler],
  [JUDICIAL_FLOOR_TRANSITION, judicialNominationFloorHandler],
] as const;
