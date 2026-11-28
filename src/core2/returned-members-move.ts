/**
 * The step that takes the records of people returned to the counts away with
 * their counted household when it moves (pool item
 * core-press-staff-counted-job-not-resident). The moves engine writes it,
 * since it tells the move as a full mover's (moves.ts, `returnedMembersLeave`),
 * and carries it as a module field; the counted moves engine calls it as a
 * household leaves, through this file, so neither engine imports the other (an
 * import between them left `MOVED_AWAY_EVENT` uninitialized when the parties
 * module loaded).
 */
import { fieldsOf } from "./module-fields";
import type { CoreModule } from "./types";

type Leave = NonNullable<CoreModule["returnedMembersLeave"]>;

/** Counted moves calls this as a household with returned members leaves. */
export function returnedMembersLeave(...args: Parameters<Leave>): void {
  const [leave] = fieldsOf(args[0].state, "returnedMembersLeave");
  if (!leave)
    throw new Error("The moves engine is not loaded to move returned members.");
  leave(...args);
}
