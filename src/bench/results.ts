import { coreAPI } from "../core2/state";
import {
  ballotOf,
  candidateIdentity,
  placesOf,
  racesOf,
  raceVotes,
  resultOf,
  worldRacesOpen,
} from "../core2/modules/voting";
import type { ContestRow, FilingRow } from "../core2/modules/elections";
import type { CoreAPI, CoreState } from "../core2/types";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { backdropFor, stagePeople } from "./scene";
import { hasBackdrop } from "./backdrop-places";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const ELECTIONS = "core2-elections-v1";

/** A candidate's name from the records: a resident, an official's term, or a drawn challenger. */
function candidateName(api: CoreAPI, id: string): string {
  const who = candidateIdentity(api, id);
  return who ? `${who.givenName} ${who.familyName}` : id;
}

/**
 * Election night: every race held so far, newest night first and, within a
 * night, the player's own race first, then the races on their ballot, and
 * whether they won it.
 */
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
    const ran = playerId in result.totals;
    out.push({
      contestId: contest.id,
      title: contest.district
        ? `${contest.title} (${contest.district})`
        : contest.title,
      date: contest.electionDate,
      /** The player ran in it, and whether they won. */
      mine: ran ? { won: result.winnerId === playerId } : null,
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
      /** Every ballot cast in the race: the town's and the rest of its electorate's. */
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
  // Within a night: the player's race, then their ballot's, then the rest,
  // each in the records' order (the sort is stable).
  const rank = (race: { mine: unknown; ballot: unknown }) =>
    race.mine ? 0 : race.ballot ? 1 : 2;
  return out.sort((a, b) => b.date.localeCompare(a.date) || rank(a) - rank(b));
}

/**
 * The newest race the person ran in that has a result: its seat, whether they
 * won, each side's votes and the public result record every screen cites.
 */
export function ownRace(core: CoreState, personId: string) {
  const api = coreAPI(core);
  if (!core.modules.has(ELECTIONS)) return null;
  const elections = api.moduleState(ELECTIONS);
  let newest:
    | { contest: ContestRow; result: NonNullable<ReturnType<typeof resultOf>> }
    | undefined;
  for (const filing of elections
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[]) {
    const contest = elections
      .table("contests")
      .get(filing.contestId) as unknown as ContestRow | undefined;
    const result = contest && resultOf(api, contest.id);
    if (!contest || !result || !(personId in result.totals)) continue;
    if (!newest || contest.electionDate > newest.contest.electionDate)
      newest = { contest, result };
  }
  if (!newest) return null;
  const { contest, result } = newest;
  const won = result.winnerId === personId;
  // Who they ran against: the winner when they lost, the runner-up when they won.
  const rival = Object.entries(result.totals)
    .filter(([id]) => id !== personId)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return {
    contestId: contest.id,
    seatId: contest.seatId,
    level: contest.level,
    title: contest.title,
    date: contest.electionDate,
    won,
    votes: result.totals[personId]!,
    rival: rival
      ? { id: rival[0], name: candidateName(api, rival[0]), votes: rival[1] }
      : null,
    recordId: `election-result:${contest.id}`,
  };
}

/**
 * The governor races the world held on the newest election night so far,
 * every state's by its race record and its count's result: the party that
 * won, each party's votes and the margin. Empty before any governor race has been counted.
 */
export function governorRacesTonight(core: CoreState) {
  const api = coreAPI(core);
  if (!worldRacesOpen(api)) return [];
  const held = racesOf(api).filter(
    (race) =>
      race.office === "governor" &&
      race.date <= core.date &&
      resultOf(api, race.id) !== null,
  );
  const night = held.reduce(
    (last, race) => (race.date > last ? race.date : last),
    "",
  );
  const names = new Map(
    corePlaceStateIdentities().map((row) => [row.jurisdictionKey, row.name]),
  );
  return held
    .filter((race) => race.date === night)
    .map((race) => {
      const stateKey = race.seatId.split(":")[1] ?? "";
      const { republican, democratic } = raceVotes(api, race);
      const cast = republican + democratic;
      return {
        id: race.id,
        stateKey,
        state: names.get(stateKey) ?? stateKey,
        date: race.date,
        winnerParty: race.winnerParty,
        republican,
        democratic,
        marginPoints: cast
          ? (100 * Math.abs(republican - democratic)) / cast
          : 0,
      };
    })
    .sort((a, b) => a.state.localeCompare(b.state));
}

/**
 * Election night's picture: the returns party if you ran in the newest
 * election, with your household, or the polling place if you voted in it.
 */
export function resultsScene(core: CoreState, playerId: string) {
  const races = electionResults(core, playerId);
  const newest = races.filter((race) => race.date === races[0]?.date);
  const ran = newest.some((race) => race.mine);
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
    return {
      id,
      name: `${row.givenName} ${row.familyName}`,
      reason: id === playerId ? ("you" as const) : ("household" as const),
    };
  });
  const backdrop = backdropFor(core, place, ran ? 22 * 60 : 18 * 60);
  return {
    place,
    backdrop,
    people: stagePeople(core, backdrop.file, cast).people,
  };
}
