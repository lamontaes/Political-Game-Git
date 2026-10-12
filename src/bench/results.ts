import { coreAPI } from "../core2/state";
import { ballotOf, resultOf } from "../core2/modules/voting";
import { drawOfficialIdentity } from "../core2/officials-identity";
import type { ContestRow, FilingRow } from "../core2/modules/elections";
import type { CoreAPI, CoreState } from "../core2/types";

const ELECTIONS = "core2-elections-v1";
const OFFICES = "core2-offices-v1";

/** A candidate's name from the records: a resident, an official's term, or a drawn challenger. */
function candidateName(api: CoreAPI, id: string): string {
  const person = api.state.people.get(id);
  if (person) return `${person.givenName} ${person.familyName}`;
  if (id.startsWith("official:term:")) {
    const term = api
      .moduleState(OFFICES)
      .table("terms")
      .get(id.slice("official:".length)) as
      { identity?: { givenName: string; familyName: string } } | undefined;
    if (term?.identity)
      return `${term.identity.givenName} ${term.identity.familyName}`;
  }
  if (id.startsWith("official:challenger:")) {
    // Stopgap SG-PLAY-challenger-name: the voting module draws a challenger's
    // identity privately; the bench draws it the same way until it exports a
    // name reader.
    const loaded = api
      .moduleState(OFFICES)
      .table("loaded")
      .get("town") as unknown as { worldSeed: string };
    const town = api
      .moduleState(ELECTIONS)
      .table("town")
      .get("town") as unknown as {
      stateKey: string;
    };
    const drawn = drawOfficialIdentity({
      worldSeed: loaded.worldSeed,
      seatKey: id,
      stateUsps: town.stateKey.slice(3),
      role: "state-executive-challenger",
      referenceDate: api.state.date,
    });
    return `${drawn.givenName} ${drawn.familyName}`;
  }
  return id;
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
      winner: result.winnerId ? name(result.winnerId) : null,
      takesOffice: result.takesOffice,
      namedTurnout: result.namedTurnout,
      namedEligible: result.namedEligible,
      electorate: result.electorate,
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
