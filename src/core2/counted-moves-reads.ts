/**
 * The counted moves' id and record: every counted move the engine has kept. src/core2/modules/counted-moves.ts re-exports them.
 */
import type { MoveRecord } from "./modules/counted-moves";
import type { CoreAPI } from "./types";

export const COUNTED_MOVES_MODULE_ID = "core2-counted-moves-v1";

export const TABLE = "moves";

/** The moves recorded so far, oldest first. */
export function countedMoves(api: CoreAPI): readonly MoveRecord[] {
  return (
    api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table(TABLE)
      .rows() as unknown as MoveRecord[]
  )
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1,
    );
}
