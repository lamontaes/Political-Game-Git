import type { EntityId } from "../types";
import { MISCONDUCT_FAMILY_LABELS, type MisconductFamily } from "./records";

/** Structured handoff for a future situation-row consumer; creates no scene. */
export interface PlayerMisconductActOffer {
  readonly stableKey: string;
  readonly family: MisconductFamily;
  readonly label: string;
  readonly summary: string;
  readonly actorPersonIds: readonly EntityId[];
  /** People who know this act, as recorded by recordMisconductAct. */
  readonly participantPersonIds: readonly EntityId[];
  readonly choice: string;
}

/** Carry the recorded act and its knowers through the typed situation seam. */
export function offerToPlayer(
  act: Omit<PlayerMisconductActOffer, "label">,
): PlayerMisconductActOffer {
  if (!act.stableKey.trim() || !act.summary.trim() || !act.choice.trim()) {
    throw new Error(
      "Invalid misconduct offer: key, summary, and choice required.",
    );
  }
  if (act.actorPersonIds.length === 0) {
    throw new Error("Invalid misconduct offer: an actor is required.");
  }
  if (act.actorPersonIds.some((id) => !act.participantPersonIds.includes(id))) {
    throw new Error("Invalid misconduct offer: every actor must be a knower.");
  }
  return { ...act, label: MISCONDUCT_FAMILY_LABELS[act.family] };
}
