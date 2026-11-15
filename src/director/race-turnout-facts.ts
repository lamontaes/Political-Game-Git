/**
 * Who turned out in a counted race, from the voting engine's own records: the
 * winner's share of the ballots cast (`vote-share`), the share of the people
 * eligible who voted (`turnout`), and the place that gave the winner the
 * biggest share of its ballots (`best-place`), each cited to the records it
 * came from. A race the engine kept no count of, or kept without a place
 * breakdown, gives only what it has.
 */
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { P } from "../core2/parameters";
import {
  VOTING_MODULE_ID,
  pollingPlaces,
  placesOf,
  type ResultRow,
} from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

export interface RaceFact {
  text: string;
  sourceRecordIds: string[];
}

/** The precinct where a candidate's share of the town's own votes moved most against their last race, and which way. */
export interface TurnedPrecinct {
  readonly precinct: number;
  /** "for": they did better there than last time; "against": worse. */
  readonly direction: "for" | "against";
  /** The polling place's record. */
  readonly pollingPlaceId: string;
  /** The record ids the answer rests on: this result, the earlier one it was set against and the polling place. */
  readonly sourceRecordIds: readonly string[];
}

/**
 * The precinct where a side's share of the precinct's votes moved most from
 * an earlier count to this one (precincts cut the same way in both); null
 * where it moved nowhere or the earlier side has no votes to set against.
 */
export function precinctShift(
  now: Readonly<Record<string, Readonly<Record<string, number>>>>,
  earlier: Readonly<Record<string, Readonly<Record<string, number>>>>,
  nowIds: readonly string[],
  thenIds: readonly string[],
): { precinct: string; delta: number } | null {
  const share = (
    row: Readonly<Record<string, number>> | undefined,
    ids: readonly string[],
  ) => {
    const cast = Object.values(row ?? {}).reduce((a, b) => a + b, P.zero);
    return cast > P.zero
      ? ids.reduce((a, id) => a + (row?.[id] ?? P.zero), P.zero) / cast
      : null;
  };
  let best: { precinct: string; delta: number } | null = null;
  for (const precinct of Object.keys(now).sort(
    (a, b) => Number(a) - Number(b),
  )) {
    const then = share(earlier[precinct], thenIds);
    const here = share(now[precinct], nowIds);
    if (then === null || here === null || !thenIds.length) continue;
    const delta = here - then;
    if (!best || Math.abs(delta) > Math.abs(best.delta))
      best = { precinct, delta };
  }
  return best && best.delta !== P.zero ? best : null;
}

/**
 * Where the town turned for or against a candidate (their share of a
 * precinct's votes, this race against their last race for the same office,
 * or the last race of their party's candidates when this is their first):
 * the precinct whose share moved most. Read from the `precinctTotals` the
 * count saved, so nothing is scanned or kept here. Null for a one-precinct
 * town, a first race with no party's earlier race to set it against, and an
 * earlier count whose precincts do not match this one's (the precinct
 * numbers are only comparable between counts that cut the town the same way).
 */
export function turnedPrecinct(
  core: Readonly<CoreState>,
  contestId: string,
  candidateId: string,
): TurnedPrecinct | null {
  if (!core.modules.has(VOTING_MODULE_ID)) return null;
  if (!core.modules.has(ELECTIONS_MODULE_ID)) return null;
  const api = coreAPI(core as CoreState);
  const results = api.moduleState(VOTING_MODULE_ID).table("results");
  const now = results.get(`result:${contestId}`) as unknown as
    ResultRow | undefined;
  const nowTotals = now?.precinctTotals;
  if (!now || !nowTotals || Object.keys(nowTotals).length < P.two) return null;
  // Only a candidate in this count has a share to compare.
  if (!Object.values(nowTotals).some((row) => candidateId in row)) return null;
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const contests = elections.table("contests");
  const contest = contests.get(contestId) as unknown as ContestRow | undefined;
  if (!contest) return null;
  const partyOf = (race: string, person: string): string | null =>
    (
      elections
        .table("filings")
        .query("byContest", [race]) as unknown as FilingRow[]
    ).find((f) => f.personId === person)?.party ?? null;
  // The last count for the office before this one, cut into the same precincts.
  const before = (
    contests.query("byOffice", [contest.officeId]) as unknown as ContestRow[]
  )
    .filter((c) => c.id !== contestId && c.electionDate < contest.electionDate)
    .sort((a, b) => b.electionDate.localeCompare(a.electionDate))
    .map(
      (c) => results.get(`result:${c.id}`) as unknown as ResultRow | undefined,
    )
    .find(
      (r) =>
        r?.precinctTotals &&
        Object.keys(r.precinctTotals).length === Object.keys(nowTotals).length,
    );
  const earlier = before?.precinctTotals;
  if (!before || !earlier) return null;
  // Their own earlier share, or their party's candidates' where they did not run.
  const party = partyOf(contestId, candidateId);
  const ranBefore = Object.values(earlier).some((row) => candidateId in row);
  const sideThen = ranBefore
    ? [candidateId]
    : party
      ? Object.keys(Object.assign({}, ...Object.values(earlier))).filter(
          (id) => partyOf(before.contestId, id) === party,
        )
      : [];
  const best = precinctShift(nowTotals, earlier, [candidateId], sideThen);
  if (!best) return null;
  const place = pollingPlaces(api).find(
    (row) => row.precinct === Number(best!.precinct),
  );
  if (!place) return null;
  return {
    precinct: place.precinct,
    direction: best.delta > P.zero ? "for" : "against",
    pollingPlaceId: place.id,
    sourceRecordIds: [now.id, before.id, place.id],
  };
}

/** The facts for the count of a race: `contestId` is the election-result record's. */
export function raceTurnoutFacts(
  core: Readonly<CoreState>,
  contestId: string,
  candidateId?: string,
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
  // The place that gave the winner the biggest share of the ballots cast there.
  const best = places
    .filter((place) => place.cast > P.zero)
    .sort(
      (a, b) =>
        (b.votes[winner] ?? P.zero) / b.cast -
          (a.votes[winner] ?? P.zero) / a.cast ||
        a.placeId.localeCompare(b.placeId),
    )[P.zero];
  if (best && (best.votes[winner] ?? P.zero) > P.zero)
    facts["best-place"] = {
      text: best.name,
      sourceRecordIds: [resultId, `place:${contestId}:${best.placeId}`],
    };
  // The part of town that turned for or against the candidate this fact is
  // about (the player, where they ran), by the precinct split the count saved.
  const turned = candidateId
    ? turnedPrecinct(core, contestId, candidateId)
    : null;
  if (turned) {
    facts["turned-precinct"] = {
      text: String(turned.precinct),
      sourceRecordIds: [...turned.sourceRecordIds],
    };
    facts[`turned-${turned.direction}`] = {
      text: "yes",
      sourceRecordIds: [...turned.sourceRecordIds],
    };
  }
  return facts;
}
