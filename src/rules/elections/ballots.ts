export type MunicipalRunoffRule =
  | "pure-plurality"
  | "majority-50-plus-1"
  | "top-two-primary-runoff"
  | "ranked-choice-instant-runoff";
const THRESHOLD_RULES: ReadonlySet<MunicipalRunoffRule> = new Set([
  "majority-50-plus-1",
  "top-two-primary-runoff",
]);

export interface BallotGroup {
  readonly ranking: readonly string[];
  readonly count: number;
}

export interface BallotRound {
  readonly tallies: readonly {
    candidateId: string;
    votes: number;
  }[];
  readonly exhausted: number;
  readonly eliminated: readonly string[];
}

export type BallotOutcome =
  | {
      readonly kind: "decided";
      readonly winnerId: string;
      readonly rounds: readonly BallotRound[];
    }
  | {
      readonly kind: "runoff-required";
      readonly finalistIds: readonly [string, string];
      readonly rounds: readonly BallotRound[];
    }
  | {
      readonly kind: "tie";
      readonly tiedIds: readonly string[];
      readonly rounds: readonly BallotRound[];
    };

function countRound(
  candidateIds: readonly string[],
  continuing: ReadonlySet<string>,
  ballots: readonly BallotGroup[],
  firstChoiceOnly: boolean,
): Omit<BallotRound, "eliminated"> {
  const votes = new Map<string, number>(
    candidateIds.filter((id) => continuing.has(id)).map((id) => [id, 0]),
  );
  let exhausted = 0;
  for (const ballot of ballots) {
    const choice = firstChoiceOnly
      ? ballot.ranking.find((id) => candidateIds.includes(id))
      : ballot.ranking.find((id) => continuing.has(id));
    if (choice === undefined || !votes.has(choice)) exhausted += ballot.count;
    else votes.set(choice, votes.get(choice)! + ballot.count);
  }
  return {
    tallies: [...votes.entries()].map(([candidateId, count]) => ({
      candidateId,
      votes: count,
    })),
    exhausted,
  };
}

function ranks(
  tallies: BallotRound["tallies"],
): readonly (readonly string[])[] {
  const byVotes = new Map<number, string[]>();
  for (const tally of tallies) {
    const group = byVotes.get(tally.votes);
    if (group) group.push(tally.candidateId);
    else byVotes.set(tally.votes, [tally.candidateId]);
  }
  return [...byVotes.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, ids]) => ids);
}

export function tabulateBallot(input: {
  readonly rule: MunicipalRunoffRule;
  readonly majorityTriggerPercent: number | null;
  readonly candidateIds: readonly string[];
  readonly ballots: readonly BallotGroup[];
}): BallotOutcome {
  const { rule, candidateIds, ballots } = input;
  if (candidateIds.length === 0) {
    throw new Error("A race needs at least one candidate to count.");
  }
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new Error("A race lists the same candidate twice.");
  }
  for (const ballot of ballots) {
    if (!Number.isInteger(ballot.count) || ballot.count < 0) {
      throw new Error("A ballot group's count must be a whole number.");
    }
  }
  if (rule === "ranked-choice-instant-runoff") {
    return countRankedChoice(candidateIds, ballots);
  }
  const threshold = THRESHOLD_RULES.has(rule);
  const trigger = input.majorityTriggerPercent;
  if (threshold && (trigger === null || !(trigger > 0 && trigger < 100))) {
    throw new Error(
      `A ${rule} race needs a threshold between 0 and 100 percent.`,
    );
  }
  const round = countRound(candidateIds, new Set(candidateIds), ballots, true);
  const order = ranks(round.tallies);
  const leaders = order[0]!;
  const rounds = [{ ...round, eliminated: [] }];
  const counted = round.tallies.reduce((sum, tally) => sum + tally.votes, 0);
  const clears = (id: string) =>
    trigger !== null &&
    round.tallies.find((tally) => tally.candidateId === id)!.votes * 100 >
      trigger * counted;
  if (!threshold || candidateIds.length === 1) {
    return leaders.length > 1
      ? { kind: "tie", tiedIds: leaders, rounds }
      : { kind: "decided", winnerId: leaders[0]!, rounds };
  }
  if (leaders.length === 1 && clears(leaders[0]!)) {
    return { kind: "decided", winnerId: leaders[0]!, rounds };
  }
  if (leaders.length === 2 && candidateIds.length > 2 && !clears(leaders[0]!)) {
    return {
      kind: "runoff-required",
      finalistIds: [leaders[0]!, leaders[1]!],
      rounds,
    };
  }
  if (leaders.length > 1) return { kind: "tie", tiedIds: leaders, rounds };
  const seconds = order[1]!;
  if (seconds.length > 1) {
    return { kind: "tie", tiedIds: seconds, rounds };
  }
  return {
    kind: "runoff-required",
    finalistIds: [leaders[0]!, seconds[0]!],
    rounds,
  };
}

function countRankedChoice(
  candidateIds: readonly string[],
  ballots: readonly BallotGroup[],
): BallotOutcome {
  const continuing = new Set(candidateIds);
  const rounds: BallotRound[] = [];
  for (;;) {
    const round = countRound(candidateIds, continuing, ballots, false);
    const order = ranks(round.tallies);
    const leaders = order[0]!;
    const counted = round.tallies.reduce((sum, tally) => sum + tally.votes, 0);
    const leaderVotes = round.tallies.find(
      (tally) => tally.candidateId === leaders[0],
    )!.votes;
    if (
      continuing.size === 1 ||
      (leaders.length === 1 && leaderVotes * 2 > counted)
    ) {
      rounds.push({ ...round, eliminated: [] });
      return { kind: "decided", winnerId: leaders[0]!, rounds };
    }
    if (order.length === 1) {
      rounds.push({ ...round, eliminated: [] });
      return { kind: "tie", tiedIds: leaders, rounds };
    }
    const last = order[order.length - 1]!;
    if (last.length > 1) {
      const votesOf = (id: string) =>
        round.tallies.find((tally) => tally.candidateId === id)!.votes;
      const combined = last.reduce((sum, id) => sum + votesOf(id), 0);
      const nextUp = votesOf(order[order.length - 2]![0]!);
      if (combined >= nextUp || last.length === continuing.size) {
        rounds.push({ ...round, eliminated: [] });
        return { kind: "tie", tiedIds: last, rounds };
      }
    }
    rounds.push({ ...round, eliminated: last });
    for (const id of last) continuing.delete(id);
  }
}
