import type { CoreState } from "../core2/types";
import { P } from "../core2/parameters";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";

const zero = P.zero;
const one = P.one;

/** The steps a race's margin is said in, as the result record's totals show it. */
export const RACE_MARGINS = [
  "handful",
  "close",
  "wide",
  "landslide",
  "middle",
  "alone",
] as const;

/** One of the five steps a race's margin is said in, plus a race with one candidate and one with no totals. */
export type RaceMargin = (typeof RACE_MARGINS)[number];

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
  if (votes.length === one) return "alone";
  const cast = votes.reduce((sum, count) => sum + count, zero);
  if (votes.length < P.two || !(cast > zero)) return "middle";
  const lead = (votes[zero]! - votes[one]!) / cast;
  const {
    journalRaceHandfulMargin,
    journalRaceCloseMargin,
    journalRaceWideMargin,
    journalRaceLandslideMargin,
  } = DEFAULT_DIRECTOR_DATA.parameters;
  if (lead <= journalRaceHandfulMargin!.value) return "handful";
  if (lead <= journalRaceCloseMargin!.value) return "close";
  if (lead >= journalRaceLandslideMargin!.value) return "landslide";
  if (lead >= journalRaceWideMargin!.value) return "wide";
  return "middle";
}
