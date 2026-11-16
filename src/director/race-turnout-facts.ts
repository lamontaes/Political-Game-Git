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
  recountOf,
  type ResultRow,
} from "../core2/modules/voting";
import { CAMPAIGNS_MODULE_ID, type PollRow } from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
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
  return facts;
}

/**
 * The one read of how a race went (Account lead, Nov 16: "close" means inside
 * the state's recount rule and nothing else; no share is chosen). Every reader
 * of a race's margin (the concession call, the Journal, a person bringing a
 * race up) reads it here, by record:
 *
 * - `recount-automatic`, `recount-offered` or `recount-none`: whether the
 *   count's margin fell inside the state's recount rule (the voting engine's
 *   recount row): counted again by law, inside the margin the one behind may
 *   ask in, or neither. For a candidate the recount does not name (it is
 *   between the leader and the one just behind), `recount-between-others`:
 *   their own race was not close, and no line says it was.
 * - For a candidate whose own campaign bought a poll before the vote:
 *   `poll-closer`, `poll-as-polled` or `poll-wider`, the gap between the
 *   candidate and their nearest rival in the count (the winner, or for the
 *   winner the runner-up) against the same gap in that campaign's last poll.
 *   Inside the poll's own margin of error (kept on the poll record) it went
 *   as polled; otherwise the race was closer or wider than polled. With it,
 *   `poll-ahead` when that poll had the candidate ahead of the rival. A
 *   campaign that bought no poll expected nothing on the record, and none is
 *   given.
 */
export function raceReadFacts(
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
  const recount = recountOf(api, contestId);
  // A recount is between the two it names: to any other candidate in the
  // count it says nothing about how close their own race was.
  const others =
    !!recount &&
    !!candidateId &&
    candidateId !== recount.leaderId &&
    candidateId !== recount.trailingId;
  const recountKey = !recount
    ? "recount-none"
    : others
      ? "recount-between-others"
      : recount.kind === "automatic"
        ? "recount-automatic"
        : "recount-offered";
  facts[recountKey] = {
    text: "yes",
    sourceRecordIds: recount ? [resultId, recount.id] : [resultId],
  };
  // Only a candidate in the count has a poll of their own to set it against.
  if (!candidateId || !(candidateId in result.totals)) return facts;
  const rival =
    candidateId === result.winnerCandidateId
      ? Object.entries(result.totals)
          .filter(([id]) => id !== candidateId)
          .sort(
            ([idA, votesA], [idB, votesB]) =>
              votesB - votesA || idA.localeCompare(idB),
          )[P.zero]?.[P.zero]
      : result.winnerCandidateId;
  const cast = Object.values(result.totals).reduce((a, b) => a + b, P.zero);
  if (!rival || cast <= P.zero || !core.modules.has(CAMPAIGNS_MODULE_ID))
    return facts;
  const filingIds = new Set(
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byPerson", [candidateId]) as unknown as FilingRow[]
    )
      .filter((filing) => filing.contestId === contestId)
      .map((filing) => filing.id),
  );
  const poll = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("polls")
      .query("byContest", [contestId]) as unknown as PollRow[]
  )
    .filter(
      (row) =>
        filingIds.has(row.campaignId) &&
        row.contacted > P.zero &&
        row.marginOfError !== null &&
        row.date < result.date,
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[
    P.zero
  ];
  if (!poll) return facts;
  // The candidate's lead over the rival (behind is below zero), counted and polled.
  const counted =
    ((result.totals[candidateId] ?? P.zero) -
      (result.totals[rival] ?? P.zero)) /
    cast;
  const polled =
    ((poll.answers[candidateId] ?? P.zero) - (poll.answers[rival] ?? P.zero)) /
    poll.contacted;
  const key =
    Math.abs(counted - polled) <= poll.marginOfError!
      ? "poll-as-polled"
      : Math.abs(counted) < Math.abs(polled)
        ? "poll-closer"
        : "poll-wider";
  const ids = [resultId, poll.id];
  facts[key] = { text: "yes", sourceRecordIds: ids };
  if (polled > P.zero)
    facts["poll-ahead"] = { text: "yes", sourceRecordIds: ids };
  return facts;
}
