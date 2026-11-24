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
  let votes: number[] = [];
  try {
    votes = Object.values(
      JSON.parse(String(core.durableLog.get(resultId)?.facts?.totals ?? "{}")),
    )
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => b - a);
  } catch {
    votes = [];
  }
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
