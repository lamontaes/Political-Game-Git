/** Read-only account of a saved judicial selection attempt. */

import { currentPresidentOf } from "../simulation/crisis/offices";
import { courtById, seatHolderAt } from "../simulation/judiciary/courts";
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
  readonly sourceNote: string;
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
  const base = {
    seatId,
    courtName: court.name,
    holderName: holder ? personName(world.people[holder.personId]!) : null,
    selectionRecordId: selection?.recordId ?? null,
    candidates: (selection?.candidatePersonIds ?? []).flatMap((personId) => {
      const person = world.people[personId];
      return person ? [{ personId, name: personName(person) }] : [];
    }),
    sourceNote: court.sourceRecordId
      ? "Selection paths come from the 92L research synthesis. Its cited primary authorities have not been retrieved here."
      : "No judicial selection source profile is linked to this court.",
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
      reason: resolved.reason,
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
    world.control.kind === "person" &&
    currentPresidentOf(world)?.personId === world.control.personId;
  return {
    ...base,
    status: progress.status,
    reason:
      stage && (stage.actor.state !== "KNOWN" || !stage.actor.value)
        ? "The next selection actor is not established by the reported path."
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
