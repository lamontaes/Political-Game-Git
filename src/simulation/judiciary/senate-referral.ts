/** A saved Senate referral, followed by an explicit committee authority stop. */

import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import {
  nextCongressSitting,
  seatedCongressChamber,
} from "../governing/congress-chambers";
import { scheduleFutureDueItem } from "../future-transitions";
import { personName } from "../people";
import type {
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
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
  return {
    world,
    status: "blocked",
    reasonKey: "judiciary:committee-convener-unrecorded",
    context:
      "The nomination is referred, but no authorized committee convener, actual attendees, or report is recorded. Senate confirmation remains pending.",
    outcomeEventId: null,
  };
}

export const JUDICIAL_SENATE_HANDLERS = [
  [JUDICIAL_SENATE_REFERRAL_TRANSITION, judicialSenateReferralHandler],
  [
    JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
    judicialCommitteeConsiderationHandler,
  ],
] as const;
