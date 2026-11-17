/** The votes each candidate got, highest first, and the seats the race filled. */
function countOf(
  core: Readonly<CoreState>,
  resultId: string,
  /** A count that kept its totals under `votes` (a primary's) reads from there too. */
  orVotes = false,
): { totals: Record<string, number>; votes: number[]; seats: number } {
  let totals: Record<string, number> = {};
  try {
    totals = JSON.parse(
      String(
        core.durableLog.get(resultId)?.facts?.totals ??
          (orVotes ? core.durableLog.get(resultId)?.facts?.votes : undefined) ??
          "{}",
      ),
    ) as Record<string, number>;
  } catch {
    totals = {};
  }
  const votes = Object.values(totals)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  const seats = Math.max(
    P.one,
    Number(core.durableLog.get(resultId)?.facts?.seats ?? P.one) || P.one,
  );
  return { totals, votes, seats };
}

/**
 * The votes a candidate who lost came short by: the gap to the last winning
 * seat (the winner, where one seat was filled). The count the scenes say once
 * and the size words read are this one gap.
 */
export function votesShort(
  core: Readonly<CoreState>,
  resultId: string,
  loserId: string,
): number {
  const { totals, votes, seats } = countOf(core, resultId, true);
  const own = Number(totals[loserId] ?? P.zero);
  const cutoff = votes[Math.min(seats, votes.length) - P.one] ?? own;
  return Math.max(P.zero, cutoff - own);
}

/**
 * The one margin function: how a race was decided, read from its result
 * record. The Journal says one's own race by it ("We won, but it was
 * close."), and a person bringing up a race they read about says only what it
 * allows ("won it fair" is never said of a landslide).
 */
import { P } from "../core2/parameters";
import type { CoreState } from "../core2/types";
import type { RaceMargin } from "../english/journal-words";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";

/**
 * How a race was decided, from its result record's totals: "alone" when one
 * candidate stood, "close" or "wide" by the winner's lead over the runner-up
 * as a share of the votes cast, and "middle" between them or when the totals
 * are not on record, so no line claims a margin the record does not show.
 */
export function raceMargin(
  core: Readonly<CoreState>,
  resultId: string,
): RaceMargin {
  const { votes } = countOf(core, resultId);
  if (votes.length === P.one) return "alone";
  const cast = votes.reduce((sum, count) => sum + count, P.zero);
  if (votes.length < P.two || !(cast > P.zero)) return "middle";
  const lead = (votes[P.zero]! - votes[P.one]!) / cast;
  const { journalRaceCloseMargin, journalRaceWideMargin } =
    DEFAULT_DIRECTOR_DATA.parameters;
  if (lead <= journalRaceCloseMargin!.value) return "close";
  if (lead >= journalRaceWideMargin!.value) return "wide";
  return "middle";
}
