import {
  electionContestResult,
  type EntityId,
  type IsoDate,
  type ThreadAnchor,
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

/** One of this person's races, decided, as a line and the record behind it. */
export interface OwnElectionResultLine {
  readonly contestId: EntityId;
  readonly resultId: EntityId;
  readonly resolvedAt: IsoDate;
  readonly sequence: number;
  /** "You lost the race for Mayor, 45.6% to 54.4%." */
  readonly sentence: string;
  /** The recorded outcome event the sentence is read from. */
  readonly anchor: ThreadAnchor;
}

/**
 * This person's races decided after `after` (exclusive; null for all) and on
 * or before `through`, oldest first. Read from the recorded results only; a
 * race without a result, or one decided past `through`, contributes nothing.
 */
export function ownElectionResultsDecided(
  world: World,
  personId: EntityId,
  after: IsoDate | null,
  through: IsoDate,
): readonly OwnElectionResultLine[] {
  const events = new Map(
    world.history.events.map((event) => [event.id, event]),
  );
  const lines: OwnElectionResultLine[] = [];
  for (const contest of world.history.electionContests ?? []) {
    if (!contest.candidatePersonIds.includes(personId)) continue;
    const result = electionContestResult(world, contest.id);
    if (!result || result.resolvedAt > through) continue;
    if (after !== null && result.resolvedAt <= after) continue;
    const sentence = ownElectionResultSentence(world, contest.id, personId);
    const event = events.get(result.outcomeEventId);
    if (!sentence || !event) continue;
    lines.push({
      contestId: contest.id,
      resultId: result.id,
      resolvedAt: result.resolvedAt,
      sequence: result.sequence,
      sentence,
      anchor: {
        store: "events",
        recordId: event.id,
        stableKey: event.stableKey,
        at: event.occurredAt,
        sequence: event.sequence,
        role: "resolution",
        note: "The recorded result of a race this person stood in.",
      },
    });
  }
  return lines.sort(
    (left, right) =>
      left.resolvedAt.localeCompare(right.resolvedAt) ||
      left.sequence - right.sequence,
  );
}
