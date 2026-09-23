import {
  electionContestResult,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";

/**
 * The player's own election, as the clock sees it.
 *
 * A day or week skip, and the longer "let the weeks run on" stretch, used to
 * run straight through the player's election: a Nevada Assembly win arrived
 * with nothing said. The skip now stops the morning after the player's own
 * election day, and the time report says how it came out.
 */

/** The earliest undecided contest this person stands in, on or after today. */
export function nextOwnElection(
  world: World,
  personId: EntityId,
): { readonly title: string; readonly electionDate: IsoDate } | null {
  let best: { title: string; electionDate: IsoDate } | null = null;
  for (const contest of world.history.electionContests ?? []) {
    if (!contest.candidatePersonIds.includes(personId)) continue;
    if (contest.electionDate < world.currentDate) continue;
    if (electionContestResult(world, contest.id)) continue;
    if (!best || contest.electionDate < best.electionDate)
      best = {
        title: contest.office.title,
        electionDate: contest.electionDate,
      };
  }
  return best;
}

function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/**
 * How this person's race came out, from its recorded result: "You won the race
 * for Governor of Oregon, 52.3% to 47.7%." Null while it is undecided.
 */
export function ownElectionResultSentence(
  world: World,
  contestId: EntityId,
  personId: EntityId,
): string | null {
  const contest = (world.history.electionContests ?? []).find(
    (candidate) => candidate.id === contestId,
  );
  const result = electionContestResult(world, contestId);
  if (!contest || !result) return null;
  const own = result.tallies.find(
    (tally) => tally.candidatePersonId === personId,
  );
  const best = [...result.tallies]
    .filter((tally) => tally.candidatePersonId !== personId)
    .sort((left, right) => right.voteShare - left.voteShare)[0];
  const score =
    own && best
      ? `, ${percent(own.voteShare)} to ${percent(best.voteShare)}`
      : "";
  return `You ${result.winnerPersonId === personId ? "won" : "lost"} the race for ${contest.office.title}${score}.`;
}

/** One sentence per contest of this person's decided between the two Worlds. */
export function ownElectionResultsBetween(
  before: World,
  after: World,
  personId: EntityId,
): readonly string[] {
  const lines: string[] = [];
  for (const contest of after.history.electionContests ?? []) {
    if (!contest.candidatePersonIds.includes(personId)) continue;
    if (electionContestResult(before, contest.id)) continue;
    const sentence = ownElectionResultSentence(after, contest.id, personId);
    if (sentence) lines.push(`Election results are in. ${sentence}`);
  }
  return lines;
}
