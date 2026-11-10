/**
 * The step that takes the records of people returned to the counts away with
 * their counted household when it moves (pool item
 * core-press-staff-counted-job-not-resident). The moves engine writes it,
 * since it tells the move as a full mover's (moves.ts, `returnedMembersLeave`),
 * and registers it here; the counted moves engine calls it as a household
 * leaves. This file imports nothing, so neither engine imports the other (an
 * import between them left `MOVED_AWAY_EVENT` uninitialized when the parties
 * module loaded).
 */
import type { CoreAPI, PersonState } from "./types";

type Leave = (
  api: CoreAPI,
  people: readonly PersonState[],
  fromPlace: string,
  toUsps: string,
) => void;

let registered: Leave | undefined;

/** The moves engine registers its step as it loads. */
export function registerReturnedMembersLeave(leave: Leave): void {
  registered = leave;
}

/** Counted moves calls this as a household with returned members leaves. */
export function returnedMembersLeave(...args: Parameters<Leave>): void {
  if (!registered)
    throw new Error("The moves engine is not loaded to move returned members.");
  registered(...args);
}
