import {
  electionContestById,
  electionContestResult,
} from "../simulation/election-contests";
import type { CandidateTally, EntityId, World } from "../simulation/types";

/** Presentation pacing only. Counts and winner always come from the saved result. */
export const electionNightBeatCount = 6;

/** Fewest counted ballots first, with stable ties. No second count or forecast. */
export function electionNightReports(
  world: World,
  contestId: EntityId,
  beatCount = electionNightBeatCount,
) {
  if (!Number.isSafeInteger(beatCount) || beatCount < 1 || beatCount > 6)
    throw new Error("Election night uses one to six reporting beats.");
  const contest = electionContestById(world, contestId);
  const result = electionContestResult(world, contestId);
  if (
    !contest ||
    !result ||
    !result.precinctTallies?.length ||
    contest.scheduledAt > world.currentDate ||
    result.resolvedAt > world.currentDate ||
    contest.sequence >= world.history.nextSequence ||
    result.sequence >= world.history.nextSequence
  )
    return null;
  const rows = [...result.precinctTallies].sort(
    (a, b) =>
      a.ballotsCast - b.ballotsCast ||
      a.townId.localeCompare(b.townId) ||
      a.precinctKey.localeCompare(b.precinctKey) ||
      a.mapId.localeCompare(b.mapId),
  );
  const count = Math.min(rows.length, beatCount);
  const running = new Map(
    result.tallies.map((row) => [row.candidatePersonId, 0]),
  );
  let runningBallotsCast = 0;
  const talliesOf = (
    votes: ReadonlyMap<EntityId, number>,
    ballots: number,
  ): readonly CandidateTally[] =>
    result.tallies.map((row) => ({
      candidatePersonId: row.candidatePersonId,
      votes: votes.get(row.candidatePersonId)!,
      voteShare: ballots ? votes.get(row.candidatePersonId)! / ballots : 0,
    }));
  const beats = Array.from({ length: count }, (_, index) => {
    const end = Math.floor(((index + 1) * rows.length) / count);
    const batch = rows.slice(Math.floor((index * rows.length) / count), end);
    const votes = new Map(
      result.tallies.map((row) => [row.candidatePersonId, 0]),
    );
    const ballotsCast = batch.reduce((sum, row) => sum + row.ballotsCast, 0);
    for (const row of batch)
      for (const tally of row.tallies) {
        votes.set(
          tally.candidatePersonId,
          votes.get(tally.candidatePersonId)! + tally.votes,
        );
        running.set(
          tally.candidatePersonId,
          running.get(tally.candidatePersonId)! + tally.votes,
        );
      }
    runningBallotsCast += ballotsCast;
    return {
      index,
      precincts: batch,
      ballotsCast,
      tallies: talliesOf(votes, ballotsCast),
      runningBallotsCast,
      runningTallies: talliesOf(running, runningBallotsCast),
      reportedPrecincts: end,
      totalPrecincts: rows.length,
      final: index === count - 1,
      winnerPersonId: index === count - 1 ? result.winnerPersonId : null,
      sourceRecordIds: [
        result.id,
        result.outcomeEventId,
        ...new Set(batch.map((row) => row.mapId)),
      ],
    };
  });
  return {
    contestId,
    resultId: result.id,
    outcomeEventId: result.outcomeEventId,
    beats,
    finalBeatIndex: beats.length - 1,
    // No saved ballot-method evidence exists in this count. Never manufacture
    // a mail batch from a state's permission to count it early.
    earlyMailBatch: null,
    presenceEventId: null,
  };
}
