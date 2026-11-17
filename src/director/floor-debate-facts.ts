/**
 * The reasons a member may say aloud for a stand on a bill: their own view,
 * the people they speak for, or that the bill is their own (vote-stand-facts.ts
 * reads them). A deal or a lobby's pressing is never said as the reason
 * (Words lead, rule 103 and ruling Nov 14); that cause stays on the record for
 * the player to find another way.
 */
import { P } from "../core2/parameters";

type Reason = "own-view" | "people" | "own-bill";

/** The parts of a member's position that can be said aloud. */
export interface SaidPosition {
  readonly views: number;
  readonly constituents: number;
  readonly sponsor: number;
}

/**
 * Every part said aloud that leans the way the member speaks or voted,
 * largest first: their own view, the people they speak for, or that the bill
 * is their own. Ties keep that order. A deal, a lobby or their traits are
 * never among them.
 */
export function publicReasons(
  position: SaidPosition,
  speaksFor: boolean,
  wroteIt: boolean,
): Reason[] {
  const sign = speaksFor ? P.one : -P.one;
  const parts: readonly (readonly [Reason, number])[] = [
    ["own-view", position.views * sign],
    ["people", position.constituents * sign],
    // Only the bill's own sponsor says it is theirs.
    ["own-bill", wroteIt ? position.sponsor * sign : P.zero],
  ];
  return parts
    .filter(([, size]) => size > P.zero)
    .map(([reason, size], at) => ({ reason, size, at }))
    .sort((a, b) => b.size - a.size || a.at - b.at)
    .map((row) => row.reason);
}
