import { coreAPI } from "../core2/state";
import {
  ballotOf,
  candidateIdentity,
  placesOf,
  resultOf,
} from "../core2/modules/voting";
import type { ContestRow, FilingRow } from "../core2/modules/elections";
import type { CoreAPI, CoreState } from "../core2/types";
import { backdropFile, hasBackdrop, stagePeople } from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const ELECTIONS = "core2-elections-v1";

/** A candidate's name from the records: a resident, an official's term, or a drawn challenger. */
function candidateName(api: CoreAPI, id: string): string {
  const who = candidateIdentity(api, id);
  return who ? `${who.givenName} ${who.familyName}` : id;
}

/** Election night: every race held so far, newest first, and the player's ballot. */
export function electionResults(core: CoreState, playerId: string) {
  const api = coreAPI(core);
  if (!core.modules.has(ELECTIONS)) return [];
  const contests = (
    api
      .moduleState(ELECTIONS)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((row) => row.electionDate <= core.date)
    .sort((a, b) => b.electionDate.localeCompare(a.electionDate));
  const out = [];
  for (const contest of contests) {
    const result = resultOf(api, contest.id);
    if (!result) continue;
    const filings = api
      .moduleState(ELECTIONS)
      .table("filings")
      .query("byContest", [contest.id]) as unknown as (FilingRow & {
      party?: string | null;
    })[];
    const party = new Map(
      filings.map((row) => [row.personId, row.party ?? null]),
    );
    const name = (id: string) => candidateName(api, id);
    const ballot = ballotOf(api, contest.id, playerId);
    out.push({
      contestId: contest.id,
      title: contest.district
        ? `${contest.title} (${contest.district})`
        : contest.title,
      date: contest.electionDate,
      candidates: Object.entries(result.totals)
        .map(([id, votes]) => ({
          id,
          name: name(id),
          party: party.get(id) ?? null,
          votes,
          named: result.namedVotes[id] ?? 0,
        }))
        .sort((a, b) => b.votes - a.votes),
      /** One name on the ballot: nobody ran against them. */
      unopposed: Object.keys(result.totals).length === 1,
      winner: result.winnerId ? name(result.winnerId) : null,
      takesOffice: result.takesOffice,
      namedTurnout: result.namedTurnout,
      namedEligible: result.namedEligible,
      electorate: result.electorate,
      /** Where the race was won: each place's leader, with the votes cast there. */
      places: placesOf(api, contest.id)
        .map((place) => {
          const leader = Object.entries(place.votes).sort(
            (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
          )[0];
          return {
            id: place.placeId,
            name: place.name,
            cast: place.cast,
            leader: leader && leader[1] > 0 ? name(leader[0]) : null,
          };
        })
        .sort((a, b) => b.cast - a.cast || a.id.localeCompare(b.id)),
      exitPoll: Object.fromEntries(
        Object.entries(result.exitPoll).map(([id, n]) => [
          id.startsWith("official:") || core.people.has(id) ? name(id) : id,
          n,
        ]),
      ),
      ballot: ballot && {
        voted: ballot.voted,
        choice: ballot.choice ? name(ballot.choice) : null,
        turnoutReasons: ballot.turnoutReasons,
      },
    });
  }
  return out;
}

/**
 * Election night's picture: the returns party if you ran in the newest
 * election, with your household, or the polling place if you voted in it.
 */
export function resultsScene(core: CoreState, playerId: string) {
  const races = electionResults(core, playerId);
  const newest = races.filter((race) => race.date === races[0]?.date);
  const ran = newest.some((race) =>
    race.candidates.some((c) => c.id === playerId),
  );
  const voted = newest.some((race) => race.ballot?.voted);
  if (!ran && !voted) return null;
  const place = ran
    ? scenePlaces.electionNight.ran
    : scenePlaces.electionNight.voted;
  if (!hasBackdrop(place)) return null;
  const player = core.people.get(playerId)!;
  const ids = ran
    ? [
        playerId,
        ...(core.households.get(player.householdId)?.memberIds ?? []).filter(
          (id) => id !== playerId && core.people.get(id)?.alive,
        ),
      ]
    : [playerId];
  const cast = ids.map((id) => {
    const row = core.people.get(id)!;
    return { id, name: `${row.givenName} ${row.familyName}` };
  });
  return {
    place,
    backdrop: backdropFile(place, ran ? 22 * 60 : 18 * 60),
    people: stagePeople(core, place, cast).people,
  };
}
