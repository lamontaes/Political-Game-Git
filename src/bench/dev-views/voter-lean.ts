/**
 * Dev mode's "why they lean": for one person, the lean every race reads and
 * where it comes from, read from the engines that hold it, never worked out
 * here. The views engine's row (lean, label, how closely they follow politics,
 * the survey cell it formed from, faith and degree against their age band,
 * what their own past moved and by which record), their party tie, their
 * stances with the records that moved them, and, for each race on the next
 * election day, each candidate's appeal to them by the ballot's own rule
 * (`doorAppealOf`) and whom it puts first. Shown on a person's card in dev
 * mode (slot "person"); every id opens in Trace.
 */
import type { DevView } from "../dev-views";
import { coreAPI, personOrFillIn } from "../../core2/state";
import { VIEWS_MODULE_ID, stancesOf, viewOf } from "../../core2/modules/views";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  contestsOnDate,
  type ContestRow,
} from "../../core2/modules/elections";
import { doorAppealOf, voterLean } from "../../core2/modules/voting";
import { countedChoice } from "../../core2/electorate";
import { PARTIES_MODULE_ID, partyTie } from "../../core2/modules/parties";
import type { CoreState, PersonId } from "../../core2/types";

/** The races on the first election day from today on, as the elections engine lists them. */
function nextElectionDay(core: CoreState): readonly ContestRow[] {
  if (!core.modules.has(ELECTIONS_MODULE_ID)) return [];
  const api = coreAPI(core);
  let next: string | undefined;
  for (const row of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[])
    if (row.electionDate >= core.date && (!next || row.electionDate < next))
      next = row.electionDate;
  return next ? contestsOnDate(api, next) : [];
}

/** Why one person leans as they do, from the records that hold it. */
export function voterLeanWhy(core: CoreState, personId: string) {
  const person = personOrFillIn(core, personId);
  if (!person) throw new Error("No such person.");
  const api = coreAPI(core);
  const view = core.modules.has(VIEWS_MODULE_ID)
    ? viewOf(api, person.id)
    : null;
  const races = [];
  for (const contest of nextElectionDay(core)) {
    // Null until someone is on the ballot, and for someone under voting age.
    const appeal = doorAppealOf(api, person.id, contest.id) ?? null;
    races.push({
      contestId: contest.id,
      title: contest.title,
      electionDate: contest.electionDate,
      onTheBallot: ballot(api, contest.id).map((f) => f.personId),
      firstChoice: appeal ? countedChoice(appeal) : null,
      appeal: appeal
        ? Object.fromEntries(
            Object.entries(appeal).map(([candidateId, parts]) => [
              candidateId,
              {
                name: core.people.get(candidateId as PersonId)?.name,
                ...parts,
              },
            ]),
          )
        : null,
    });
  }
  return {
    personId: person.id,
    date: core.date,
    birthDate: person.birthDate,
    votingAge: api.parameter("votingAge"),
    // What every race reads: the views engine's lean scaled to -1..1 where it
    // holds a view, else their rank in town against the area's 2024 vote.
    leanRacesRead: voterLean(api, person),
    leanFrom: view ? "views.people" : "campaign-views.personLean",
    view,
    partyTie: core.modules.has(PARTIES_MODULE_ID)
      ? partyTie(api, person.id)
      : null,
    stances: view ? stancesOf(api, person.id as PersonId) : [],
    nextElection: races,
  };
}

const view: DevView = {
  name: "voter-lean",
  client: "voter-lean.mjs",
  labels: { title: "Why they lean", trace: "Trace" },
  routes: {
    "GET voter-lean": ({ mode, q }) => voterLeanWhy(mode.core, q("id")),
  },
};
export default view;
