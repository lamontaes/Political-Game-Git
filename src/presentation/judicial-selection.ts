/** Read-only account of a saved judicial selection attempt. */

import { currentPresidentOf } from "../simulation/crisis/offices";
import { courtById, seatHolderAt } from "../simulation/judiciary/courts";
import { JUDICIAL_ROSTER_REVIEW_EVENT } from "../simulation/judiciary/candidate-discovery";
import {
  judicialSelectionProgress,
  resolveJudicialSelectionPlan,
} from "../simulation/judiciary/selection";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation/types";

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
    };
  const resolved = resolveJudicialSelectionPlan(world, seatId, selection.kind);
  if (resolved.state !== "ready")
    return {
      ...base,
      status: "unresolved",
      reason: "This court's selection route is unavailable.",
      nextStage: null,
      playerMayNominate: false,
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
  };
}
