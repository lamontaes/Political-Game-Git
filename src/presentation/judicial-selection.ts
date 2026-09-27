/** Read-only account of a saved judicial selection attempt. */

import { currentPresidentOf } from "../simulation/crisis/offices";
import { courtById, seatHolderAt } from "../simulation/judiciary/courts";
import { JUDICIAL_ROSTER_REVIEW_EVENT } from "../simulation/judiciary/candidate-discovery";
import {
  SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT,
  senateJudiciaryAppointment,
} from "../simulation/judiciary/committee-organization";
import {
  JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
  JUDICIAL_COMMITTEE_NOTICE_EVENT,
  JUDICIAL_COMMITTEE_SESSION_TRANSITION,
  JUDICIAL_SENATE_REFERRAL_EVENT,
} from "../simulation/judiciary/senate-referral";
import {
  JUDICIAL_SENATE_REFERRAL_TRANSITION,
  judicialSelectionProgress,
  resolveJudicialSelectionPlan,
} from "../simulation/judiciary/selection";
import { personName } from "../simulation/people";
import { proseDate } from "./prose-dates";
import type {
  EntityId,
  FutureDueItemStateRecord,
  World,
} from "../simulation/types";

export interface JudicialSelectionView {
  readonly seatId: string;
  readonly courtName: string;
  readonly holderName: string | null;
  readonly selectionRecordId: string | null;
  readonly status:
    | "no-attempt"
    | "unresolved"
    | "pending"
    | "stages-completed"
    | "rejected"
    | "lapsed";
  readonly reason: string | null;
  readonly nextStage: {
    readonly order: number;
    readonly mechanism: string;
    readonly actor: string | null;
  } | null;
  readonly candidates: readonly {
    readonly personId: EntityId;
    readonly name: string;
  }[];
  readonly playerMayNominate: boolean;
  readonly senateStatus: string | null;
}

export function projectJudicialSelection(
  world: World,
  seatId: string,
): JudicialSelectionView | null {
  const seat = world.judiciary?.seats[seatId];
  if (!seat) return null;
  const court = courtById(world, seat.courtId);
  if (!court) return null;
  const holder = seatHolderAt(world, seatId);
  const selection = [...(world.judiciary?.selections ?? [])]
    .reverse()
    .find((row) => row.seatId === seatId);
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  const controlledPresident =
    controlledPersonId !== null &&
    currentPresidentOf(world)?.personId === controlledPersonId;
  const learnedReview =
    controlledPresident &&
    selection &&
    world.history.knowledge.some((knowledge) => {
      if (
        knowledge.personId !== controlledPersonId ||
        knowledge.accuracy !== "accurate" ||
        knowledge.learnedAt > world.currentDate
      )
        return false;
      const event = world.history.events.find(
        (candidate) => candidate.id === knowledge.eventId,
      );
      return (
        event?.type === JUDICIAL_ROSTER_REVIEW_EVENT &&
        event.tags.includes(`selection:${selection.recordId}`)
      );
    });
  const base = {
    seatId,
    courtName: court.name,
    holderName: holder ? personName(world.people[holder.personId]!) : null,
    selectionRecordId: selection?.recordId ?? null,
    candidates: (learnedReview
      ? (selection?.candidatePersonIds ?? [])
      : []
    ).flatMap((personId) => {
      const person = world.people[personId];
      return person ? [{ personId, name: personName(person) }] : [];
    }),
  } as const;
  if (!selection)
    return {
      ...base,
      status: "no-attempt",
      reason: null,
      nextStage: null,
      playerMayNominate: false,
      senateStatus: null,
    };
  const resolved = resolveJudicialSelectionPlan(world, seatId, selection.kind);
  if (resolved.state !== "ready")
    return {
      ...base,
      status: "unresolved",
      reason: "This court's selection route is unavailable.",
      nextStage: null,
      playerMayNominate: false,
      senateStatus: null,
    };
  const progress = judicialSelectionProgress(
    world,
    selection.recordId,
    resolved.plan,
  );
  const stage =
    progress.status === "pending"
      ? resolved.plan.stages[progress.nextOrder - 1]!
      : null;
  const playerMayNominate =
    stage?.mechanism === "EXECUTIVE_NOMINATION" &&
    stage.actor.value === "President of the United States" &&
    controlledPresident;
  const senateStatus = (() => {
    if (
      stage?.mechanism !== "LEGISLATIVE_CONFIRMATION" ||
      stage.actor.value !== "United States Senate"
    )
      return null;
    const referral = world.history.events.find(
      (event) =>
        event.type === JUDICIAL_SENATE_REFERRAL_EVENT &&
        event.tags.includes(`selection:${selection.recordId}`),
    );
    const dueFor = (transitionKey: string) =>
      world.history.futureDueItems.find(
        (item) =>
          item.stableKey.endsWith(`:${selection.recordId}`) &&
          item.transitionKey === transitionKey,
      );
    const stateFor = (dueItemId: EntityId): FutureDueItemStateRecord | null =>
      [...world.history.futureDueItemStates]
        .reverse()
        .find((row) => row.dueItemId === dueItemId) ?? null;
    if (!referral) {
      const due = dueFor(JUDICIAL_SENATE_REFERRAL_TRANSITION);
      return due
        ? `Senate referral is scheduled for ${proseDate(due.dueAt)}.`
        : "The Senate referral has not been scheduled.";
    }
    const notice = world.history.events.find(
      (event) =>
        event.type === JUDICIAL_COMMITTEE_NOTICE_EVENT &&
        event.tags.includes(`selection:${selection.recordId}`),
    );
    if (notice) {
      const sessionDue = dueFor(JUDICIAL_COMMITTEE_SESSION_TRANSITION);
      const sessionState = sessionDue ? stateFor(sessionDue.id) : null;
      if (sessionState?.status === "blocked")
        return "The appointed Judiciary chair gave notice, but committee attendance and a nomination report are not recorded.";
      return sessionDue
        ? `The appointed Judiciary chair gave notice. Consideration is scheduled for ${proseDate(sessionDue.dueAt)}; attendance is not yet recorded.`
        : "The appointed Judiciary chair gave notice, but no consideration date is recorded.";
    }
    const committeeDue = dueFor(JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION);
    const committeeState = committeeDue ? stateFor(committeeDue.id) : null;
    if (committeeState?.status === "blocked") {
      const organizationRejected = world.history.events.some(
        (event) =>
          event.type === SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT &&
          event.occurredAt >= referral.occurredAt &&
          event.tags.includes("result:rejected"),
      );
      return organizationRejected
        ? "The Senate did not appoint the Judiciary slate; no chair can schedule consideration."
        : "The nomination is referred. Committee consideration is waiting for an appointed chair.";
    }
    if (senateJudiciaryAppointment(world))
      return "The nomination is referred to an appointed Judiciary Committee; no consideration notice is recorded.";
    return committeeDue
      ? `The nomination is referred. Senate committee organization review is due ${proseDate(committeeDue.dueAt)}.`
      : "The nomination is before the Senate Judiciary Committee.";
  })();
  return {
    ...base,
    status: progress.status,
    reason:
      stage && (stage.actor.state !== "KNOWN" || !stage.actor.value)
        ? "Who acts next has not been established."
        : null,
    nextStage: stage
      ? {
          order: stage.order,
          mechanism: stage.mechanism,
          actor: stage.actor.value ?? null,
        }
      : null,
    playerMayNominate,
    senateStatus,
  };
}
