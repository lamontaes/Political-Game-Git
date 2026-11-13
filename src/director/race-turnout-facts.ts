/**
 * Who turned out in a counted race, from the voting engine's own records: the
 * winner's share of the ballots cast (`vote-share`), the share of the people
 * eligible who voted (`turnout`), and the place that gave the winner the
 * biggest share of its ballots (`best-place`), each cited to the records it
 * came from. A race the engine kept no count of, or kept without a place
 * breakdown, gives only what it has.
 */
import { P } from "../core2/parameters";
import {
  VOTING_MODULE_ID,
  placesOf,
  type ResultRow,
} from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

export interface RaceFact {
  text: string;
  sourceRecordIds: string[];
}

/** The facts for the count of a race: `contestId` is the election-result record's. */
export function raceTurnoutFacts(
  core: Readonly<CoreState>,
  contestId: string,
): Record<string, RaceFact> {
  const facts: Record<string, RaceFact> = {};
  if (!core.modules.has(VOTING_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const resultId = `result:${contestId}`;
  const result = api
    .moduleState(VOTING_MODULE_ID)
    .table("results")
    .get(resultId) as unknown as ResultRow | undefined;
  if (!result?.winnerCandidateId) return facts;
  const winner = result.winnerCandidateId;
  const cast = Object.values(result.totals).reduce((a, b) => a + b, P.zero);
  if (cast > P.zero)
    facts["vote-share"] = {
      text: String(
        Math.round((P.percent * (result.totals[winner] ?? P.zero)) / cast),
      ),
      sourceRecordIds: [resultId],
    };
  const places = placesOf(api, contestId);
  const eligible =
    result.namedEligible +
    result.countedEligible +
    places.reduce((sum, place) => sum + place.eligible, P.zero);
  if (eligible > P.zero && result.electorate > P.zero)
    facts.turnout = {
      text: String(Math.round((P.percent * result.electorate) / eligible)),
      sourceRecordIds: [resultId],
    };
  // The place that gave the winner the biggest share of the ballots cast there,
  // said only when the race was counted over more than one place: a race
  // counted over its one district has no place to single out, and that
  // place's name is the district's record key (P3, North Hyde Park, Vermont,
  // Nov 13: "seat:US-VT:lower:L-2:0 gave Carlos Gibson the most").
  const counted = places.filter((place) => place.cast > P.zero);
  const best = (counted.length > P.one ? counted : [])
    .slice()
    .sort(
      (a, b) =>
        (b.votes[winner] ?? P.zero) / b.cast -
          (a.votes[winner] ?? P.zero) / a.cast ||
        a.placeId.localeCompare(b.placeId),
    )[P.zero];
  const said = best && placeIsSaid(best.name);
  if (best && said && (best.votes[winner] ?? P.zero) > P.zero)
    facts["best-place"] = {
      text: best.name,
      sourceRecordIds: [resultId, `place:${contestId}:${best.placeId}`],
    };
  return facts;
}

/**
 * A place named by a record key (a seat's "seat:US-VT:lower:L-2:0", a House
 * district's "VT-02") has no name a person says.
 */
export function placeIsSaid(name: string): boolean {
  return !/:|^[A-Z]{2}-[0-9A-Z]+$/.test(name);
}
