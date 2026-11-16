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
 * How a lost count stood against what the campaign expected and against the
 * state's recount rule, for the one who lost it (the concession call's
 * "How close was it?"). Nothing is said as a figure and no share is chosen:
 *
 * - `poll-closer`, `poll-as-polled` or `poll-wider`: the gap between the
 *   loser and the winner in the count, against the same gap in the last poll
 *   the loser's own campaign bought before the vote. Inside the poll's own
 *   margin of error (kept on the poll record) it went as polled. A campaign
 *   that bought no poll expected nothing on the record, and none is given.
 * - `recount-automatic`, `recount-offered` or `recount-none`: whether the
 *   margin fell inside the state's recount rule (the voting engine's recount
 *   row): counted again by law, the loser's to ask for, or neither.
 */
export function lossExpectationFacts(
  core: Readonly<CoreState>,
  contestId: string,
  loserId: string,
): Record<string, RaceFact> {
  const facts: Record<string, RaceFact> = {};
  if (!core.modules.has(VOTING_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const resultId = `result:${contestId}`;
  const result = api
    .moduleState(VOTING_MODULE_ID)
    .table("results")
    .get(resultId) as unknown as ResultRow | undefined;
  const winner = result?.winnerCandidateId;
  // Only a candidate in the count lost it.
  if (!result || !winner || winner === loserId || !(loserId in result.totals))
    return facts;
  const recount = recountOf(api, contestId);
  // Inside the margin a candidate may ask in, the one behind could ask,
  // whether or not they have yet.
  const recountKey = !recount
    ? "recount-none"
    : recount.kind === "automatic"
      ? "recount-automatic"
      : "recount-offered";
  facts[recountKey] = {
    text: "yes",
    sourceRecordIds: recount ? [resultId, recount.id] : [resultId],
  };
  const cast = Object.values(result.totals).reduce((a, b) => a + b, P.zero);
  if (!core.modules.has(CAMPAIGNS_MODULE_ID) || cast <= P.zero) return facts;
  const filingIds = new Set(
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byPerson", [loserId]) as unknown as FilingRow[]
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
  const counted =
    ((result.totals[winner] ?? P.zero) - (result.totals[loserId] ?? P.zero)) /
    cast;
  const polled =
    ((poll.answers[winner] ?? P.zero) - (poll.answers[loserId] ?? P.zero)) /
    poll.contacted;
  const key =
    Math.abs(counted - polled) <= poll.marginOfError!
      ? "poll-as-polled"
      : counted < polled
        ? "poll-closer"
        : "poll-wider";
  facts[key] = { text: "yes", sourceRecordIds: [resultId, poll.id] };
  return facts;
}
