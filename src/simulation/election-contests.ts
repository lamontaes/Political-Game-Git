import { makeIsoDate } from "./dates";
import {
  cancelFutureDueItem,
  scheduleFutureDueItem,
} from "./future-transitions";
import { createStableId } from "./ids";
import { personName } from "./people";
import { SeededRng } from "./rng";
import type {
  CandidateTally,
  CancelElectionContestInput,
  ElectionContestProvenance,
  ElectionContestRecord,
  ElectionContestResultRecord,
  ElectionContestStatus,
  ElectiveOfficeRef,
  EntityId,
  EventParticipant,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  ResolveElectionContestInput,
  ScheduleElectionContestInput,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";

export const ELECTION_CONTEST_TRANSITION_KEY =
  "election:contest-resolution" as const;

export function scheduleElectionContest(
  world: World,
  input: ScheduleElectionContestInput,
): World {
  assertStableKey(input.stableKey, "Election contest stable key");
  assertUniqueStableKey(
    world.history.electionContests ?? [],
    input.stableKey,
    "election contest",
  );

  const jurisdiction = world.jurisdictions[input.jurisdictionId];
  if (!jurisdiction) {
    throw new Error(
      `Election contest references a missing jurisdiction: ${input.jurisdictionId}`,
    );
  }

  validateOfficeRef(input.office);
  const electionDate = makeIsoDate(input.electionDate);
  if (electionDate <= world.currentDate) {
    throw new Error(
      "An election contest must be scheduled for a future date after the current world date.",
    );
  }

  const candidatePersonIds = canonicalCandidateIds(
    input.candidatePersonIds,
    "Election contest candidates",
  );

  for (const personId of candidatePersonIds) {
    const person = world.people[personId];
    if (!person) {
      throw new Error(
        `Election contest references a missing candidate person: ${personId}`,
      );
    }
    if (
      !isPersonAliveAt(world, personId, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })
    ) {
      throw new Error(
        `Election contest candidate is deceased at scheduling date: ${personId}`,
      );
    }
  }

  validateElectionContestProvenance(
    world,
    input.provenance,
    world.currentDate,
    world.history.nextSequence,
    "Election contest",
  );

  const contestRecord: ElectionContestRecord = {
    id: createStableId(
      "election-contest",
      `${world.id}:${input.jurisdictionId}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    jurisdictionId: input.jurisdictionId,
    office: {
      officeKey: input.office.officeKey,
      title: input.office.title,
      seatKey: input.office.seatKey ?? null,
      occupationClassification: input.office.occupationClassification ?? null,
    },
    electionDate,
    candidatePersonIds,
    scheduledAt: world.currentDate,
    provenance: cloneElectionContestProvenance(input.provenance),
  };

  const worldWithContest: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      electionContests: [
        ...(world.history.electionContests ?? []),
        contestRecord,
      ],
    },
  };

  return scheduleFutureDueItem(worldWithContest, {
    stableKey: `${input.stableKey}:due`,
    dueAt: electionDate,
    transitionKey: ELECTION_CONTEST_TRANSITION_KEY,
    entityIds: [contestRecord.id],
    jurisdictionId: input.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [contestRecord.id] },
  });
}

/**
 * Explicit deterministic placeholder outcome evaluator for the election contest substrate.
 * Generates candidate tallies and determines a winner using a seeded RNG forked from the world seed,
 * contest stable identity, and candidate list. This provides reproducible results without masquerading
 * as a complete voter behavior model.
 */
export function evaluateDeterministicContestOutcome(
  world: World,
  contest: ElectionContestRecord,
): {
  readonly winnerPersonId: EntityId;
  readonly tallies: readonly CandidateTally[];
} {
  if (contest.candidatePersonIds.length === 0) {
    throw new Error(
      `Cannot evaluate contest with no candidates: ${contest.id}`,
    );
  }

  if (contest.candidatePersonIds.length === 1) {
    const winnerPersonId = contest.candidatePersonIds[0]!;
    return {
      winnerPersonId,
      tallies: [
        {
          candidatePersonId: winnerPersonId,
          votes: 1000,
          voteShare: 1.0,
        },
      ],
    };
  }

  const rng = new SeededRng(world.seed).fork(
    `election-contest:${contest.id}:${contest.stableKey}:${contest.electionDate}`,
  );

  const rawVotes: { candidatePersonId: EntityId; votes: number }[] = [];
  let totalVotes = 0;

  for (const candidatePersonId of contest.candidatePersonIds) {
    const votes = rng.integer(1000, 10000);
    rawVotes.push({ candidatePersonId, votes });
    totalVotes += votes;
  }

  rawVotes.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.candidatePersonId.localeCompare(b.candidatePersonId);
  });

  const tallies: CandidateTally[] = rawVotes.map((entry) => ({
    candidatePersonId: entry.candidatePersonId,
    votes: entry.votes,
    voteShare: Number((entry.votes / totalVotes).toFixed(4)),
  }));

  const winnerPersonId = tallies[0]!.candidatePersonId;
  return {
    winnerPersonId,
    tallies,
  };
}

export function resolveElectionContest(
  world: World,
  input: ResolveElectionContestInput,
): World {
  const contest = requireElectionContest(world, input.contestId);
  if (isElectionContestResolved(world, contest.id)) {
    throw new Error(`Election contest is already resolved: ${contest.id}`);
  }

  const resolvedAt = makeIsoDate(input.resolvedAt ?? world.currentDate);
  if (resolvedAt < contest.electionDate) {
    throw new Error(
      `An election contest cannot be resolved before its election date: ${contest.electionDate}`,
    );
  }
  if (resolvedAt > world.currentDate) {
    throw new Error(
      "An election contest cannot be resolved after the current world date.",
    );
  }

  const hasWinner = input.winnerPersonId !== undefined;
  const hasTallies = input.tallies !== undefined;
  if (hasWinner !== hasTallies) {
    throw new Error(
      "Manual election contest resolution requires both winnerPersonId and tallies when either is provided.",
    );
  }

  const stableKey =
    input.stableKey ?? `${contest.stableKey}:result:${resolvedAt}`;
  assertStableKey(stableKey, "Election contest result stable key");
  assertUniqueStableKey(
    world.history.electionContestResults ?? [],
    stableKey,
    "election contest result",
  );

  let winnerPersonId: EntityId;
  let tallies: readonly CandidateTally[];

  if (hasWinner && hasTallies) {
    if (!contest.candidatePersonIds.includes(input.winnerPersonId!)) {
      throw new Error(
        `Specified winner ${input.winnerPersonId} is not a candidate in contest ${contest.id}`,
      );
    }
    validateTallies(input.tallies!, contest.candidatePersonIds);
    const maxVotes = Math.max(...input.tallies!.map((t) => t.votes));
    const winnerTally = input.tallies!.find(
      (t) => t.candidatePersonId === input.winnerPersonId,
    );
    if (!winnerTally || winnerTally.votes !== maxVotes) {
      throw new Error(
        `Specified winner ${input.winnerPersonId} does not match highest vote tally.`,
      );
    }
    winnerPersonId = input.winnerPersonId!;
    tallies = input.tallies!;
  } else {
    const outcome = evaluateDeterministicContestOutcome(world, contest);
    winnerPersonId = outcome.winnerPersonId;
    tallies = outcome.tallies;
  }

  const winner = world.people[winnerPersonId];
  const jurisdiction = world.jurisdictions[contest.jurisdictionId];
  const eventStableKey = `event:${stableKey}:outcome`;

  const worldWithEvent = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: "election.contest-resolved",
    occurredAt: resolvedAt,
    recordedAt: world.currentDate,
    jurisdictionId: contest.jurisdictionId,
    involvedEntityIds: [
      contest.id,
      contest.jurisdictionId,
      ...contest.candidatePersonIds,
    ],
    participants: contest.candidatePersonIds.map((personId) => ({
      personId,
      role: (personId === winnerPersonId
        ? "focus:winner"
        : "presence:candidate") as EventParticipant["role"],
      detail:
        personId === winnerPersonId
          ? `Elected to ${contest.office.title}`
          : `Candidate for ${contest.office.title}`,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: ["election", "election.result", `office:${contest.office.officeKey}`],
    summary: `${contest.office.title} election resolved in ${jurisdiction?.name ?? "jurisdiction"}. Winner: ${winner ? personName(winner) : winnerPersonId}.`,
    context: {
      location: {
        jurisdictionId: contest.jurisdictionId,
        label: jurisdiction?.name ?? "jurisdiction",
        setting: null,
      },
      socialContext: "Election contest resolved via official vote tally.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });

  const outcomeEvent = worldWithEvent.history.events.find(
    (event) => event.stableKey === eventStableKey,
  );
  if (!outcomeEvent) {
    throw new Error("Failed to retrieve recorded election resolution event.");
  }

  const provenance: ElectionContestProvenance = input.provenance ?? {
    method: "simulated",
    sourceEntityIds: [contest.id, outcomeEvent.id],
    note: "Resolved via deterministic contest substrate.",
  };

  validateElectionContestProvenance(
    worldWithEvent,
    provenance,
    resolvedAt,
    worldWithEvent.history.nextSequence,
    "Election contest result",
  );

  const resultRecord: ElectionContestResultRecord = {
    id: createStableId("election-contest-result", `${contest.id}:${stableKey}`),
    stableKey,
    sequence: worldWithEvent.history.nextSequence,
    contestId: contest.id,
    resolvedAt,
    winnerPersonId,
    tallies,
    outcomeEventId: outcomeEvent.id,
    provenance: cloneElectionContestProvenance(provenance),
  };

  return {
    ...worldWithEvent,
    history: {
      ...worldWithEvent.history,
      nextSequence: worldWithEvent.history.nextSequence + 1,
      electionContestResults: [
        ...(worldWithEvent.history.electionContestResults ?? []),
        resultRecord,
      ],
    },
  };
}

export function cancelElectionContest(
  world: World,
  input: CancelElectionContestInput,
): World {
  const contest = requireElectionContest(world, input.contestId);
  if (isElectionContestResolved(world, contest.id)) {
    throw new Error(
      `Cannot cancel an already resolved election contest: ${contest.id}`,
    );
  }

  const dueItem = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === ELECTION_CONTEST_TRANSITION_KEY &&
      item.entityIds.length === 1 &&
      item.entityIds[0] === contest.id,
  );
  if (!dueItem) {
    throw new Error(
      `Missing scheduled future due item for contest: ${contest.id}`,
    );
  }

  return cancelFutureDueItem(world, {
    stableKey: `${input.stableKey}:due-cancel`,
    dueItemId: dueItem.id,
    effectiveAt: input.effectiveAt,
    reasonKey: "policy:superseded-estimate",
    context: input.reason,
  });
}

export function electionContestTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== ELECTION_CONTEST_TRANSITION_KEY) {
    throw new Error(
      "Election contest handler received an unexpected transition.",
    );
  }

  const contestId = dueItem.entityIds[0];
  if (!contestId) {
    throw new Error(
      "Election contest due item lacks a contest entity reference.",
    );
  }

  const contest = requireElectionContest(world, contestId);
  const existingResult = electionContestResult(world, contest.id);
  if (existingResult) {
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "Election contest was already resolved.",
      outcomeEventId: existingResult.outcomeEventId,
    };
  }

  const resolvedWorld = resolveElectionContest(world, {
    stableKey: `${dueItem.stableKey}:result`,
    contestId: contest.id,
    resolvedAt: dueItem.dueAt,
    provenance: {
      method: "simulated",
      sourceEntityIds: [dueItem.id, contest.id],
      note: "Scheduled election day transition.",
    },
  });

  const result = electionContestResult(resolvedWorld, contest.id);
  if (!result) {
    throw new Error(
      "Election contest transition failed to produce a result record.",
    );
  }

  return {
    world: resolvedWorld,
    status: "resolved",
    reasonKey: null,
    context: `Election contest for ${contest.office.title} resolved on election day.`,
    outcomeEventId: result.outcomeEventId,
  };
}

export function electionContestById(
  world: World,
  contestId: EntityId,
): ElectionContestRecord | null {
  return (
    (world.history.electionContests ?? []).find(
      (record) => record.id === contestId,
    ) ?? null
  );
}

export function requireElectionContest(
  world: World,
  contestId: EntityId,
): ElectionContestRecord {
  const contest = electionContestById(world, contestId);
  if (!contest) {
    throw new Error(`Election contest not found: ${contestId}`);
  }
  return contest;
}

export function electionContestResult(
  world: World,
  contestId: EntityId,
): ElectionContestResultRecord | null {
  return (
    (world.history.electionContestResults ?? []).find(
      (record) => record.contestId === contestId,
    ) ?? null
  );
}

export function electionContestStatus(
  world: World,
  contestId: EntityId,
): ElectionContestStatus {
  const contest = requireElectionContest(world, contestId);
  if (electionContestResult(world, contest.id)) {
    return "resolved";
  }

  const dueItem = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === ELECTION_CONTEST_TRANSITION_KEY &&
      item.entityIds.length === 1 &&
      item.entityIds[0] === contest.id,
  );
  if (dueItem) {
    const states = world.history.futureDueItemStates.filter(
      (state) => state.dueItemId === dueItem.id,
    );
    const latestState = states.sort((a, b) => a.sequence - b.sequence).at(-1);
    if (latestState?.status === "cancelled") {
      return "cancelled";
    }
  }

  return "pending";
}

export function isElectionContestPending(
  world: World,
  contestId: EntityId,
): boolean {
  return electionContestStatus(world, contestId) === "pending";
}

export function isElectionContestResolved(
  world: World,
  contestId: EntityId,
): boolean {
  return electionContestStatus(world, contestId) === "resolved";
}

export function electionContestsForJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): readonly ElectionContestRecord[] {
  return (world.history.electionContests ?? []).filter(
    (record) => record.jurisdictionId === jurisdictionId,
  );
}

export function electionContestsForCandidate(
  world: World,
  candidatePersonId: EntityId,
): readonly ElectionContestRecord[] {
  return (world.history.electionContests ?? []).filter((record) =>
    record.candidatePersonIds.includes(candidatePersonId),
  );
}

export function pendingElectionContests(
  world: World,
): readonly ElectionContestRecord[] {
  return (world.history.electionContests ?? []).filter((record) =>
    isElectionContestPending(world, record.id),
  );
}

export function resolvedElectionContests(
  world: World,
): readonly ElectionContestRecord[] {
  return (world.history.electionContests ?? []).filter((record) =>
    isElectionContestResolved(world, record.id),
  );
}

export function electionContestHistoryRecords(
  world: World,
): readonly (ElectionContestRecord | ElectionContestResultRecord)[] {
  return [
    ...(world.history.electionContests ?? []),
    ...(world.history.electionContestResults ?? []),
  ];
}

export function electionContestEntityExists(
  world: World,
  id: EntityId,
): boolean {
  return electionContestHistoryRecords(world).some(
    (record) => record.id === id,
  );
}

export function electionContestEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = electionContestHistoryRecords(world).find(
    (candidate) => candidate.id === id,
  );
  if (!record || record.sequence >= sequenceExclusive) return false;
  const date =
    "electionDate" in record ? record.scheduledAt : record.resolvedAt;
  return date <= asOfDate;
}

export function assertElectionContestIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const contests = world.history.electionContests ?? [];
  const results = world.history.electionContestResults ?? [];

  assertSequenceOrdered(contests, "election contest");
  assertSequenceOrdered(results, "election contest result");
  assertUniqueStableKeys(contests, "election contest");
  assertUniqueStableKeys(results, "election contest result");

  const contestById = new Map<EntityId, ElectionContestRecord>();
  for (const contest of contests) {
    assertHistoryIdentity(ids, contest, "election-contest");
    if (contestById.has(contest.id)) {
      throw new Error(`Duplicate election contest identity: ${contest.id}`);
    }
    contestById.set(contest.id, contest);

    if (!world.jurisdictions[contest.jurisdictionId]) {
      throw new Error(
        `Election contest references missing jurisdiction: ${contest.id}`,
      );
    }
    validateOfficeRef(contest.office);
    makeIsoDate(contest.electionDate);
    makeIsoDate(contest.scheduledAt);
    if (contest.electionDate < contest.scheduledAt) {
      throw new Error(
        `Election contest scheduled date exceeds election date: ${contest.id}`,
      );
    }

    canonicalCandidateIds(
      contest.candidatePersonIds,
      `Election contest candidates for ${contest.id}`,
    );

    for (const candidateId of contest.candidatePersonIds) {
      if (!world.people[candidateId]) {
        throw new Error(
          `Election contest references missing candidate: ${candidateId}`,
        );
      }
    }

    validateElectionContestProvenance(
      world,
      contest.provenance,
      contest.scheduledAt,
      contest.sequence,
      "Election contest",
    );
  }

  const resultByContest = new Set<EntityId>();
  for (const result of results) {
    assertHistoryIdentity(ids, result, "election-contest-result");
    if (resultByContest.has(result.contestId)) {
      throw new Error(
        `Multiple election contest results for contest: ${result.contestId}`,
      );
    }
    resultByContest.add(result.contestId);

    const contest = contestById.get(result.contestId);
    if (!contest) {
      throw new Error(
        `Election contest result references missing contest: ${result.contestId}`,
      );
    }
    if (result.sequence <= contest.sequence) {
      throw new Error(
        `Election contest result sequence does not follow contest: ${result.id}`,
      );
    }

    makeIsoDate(result.resolvedAt);
    if (result.resolvedAt < contest.electionDate) {
      throw new Error(
        `Election contest result resolved before election date: ${result.id}`,
      );
    }

    if (!contest.candidatePersonIds.includes(result.winnerPersonId)) {
      throw new Error(
        `Election contest result winner is not a candidate: ${result.winnerPersonId}`,
      );
    }

    validateTallies(result.tallies, contest.candidatePersonIds);
    const maxVotes = Math.max(...result.tallies.map((t) => t.votes));
    const winnerTally = result.tallies.find(
      (t) => t.candidatePersonId === result.winnerPersonId,
    );
    if (!winnerTally || winnerTally.votes !== maxVotes) {
      throw new Error(
        `Election contest result winner does not match top tally candidate: ${result.id}`,
      );
    }

    const outcomeEvent = world.history.events.find(
      (event) => event.id === result.outcomeEventId,
    );
    if (!outcomeEvent) {
      throw new Error(
        `Election contest result references missing outcome event: ${result.outcomeEventId}`,
      );
    }

    validateElectionContestProvenance(
      world,
      result.provenance,
      result.resolvedAt,
      result.sequence,
      "Election contest result",
    );
  }
}

function assertStableKey(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[],
  stableKey: string,
  label: string,
): void {
  if (records.some((record) => record.stableKey === stableKey)) {
    throw new Error(`${label} stable key already exists: ${stableKey}`);
  }
}

function validateOfficeRef(office: ElectiveOfficeRef): void {
  if (!office || typeof office !== "object") {
    throw new Error("Elective office reference must be a valid object.");
  }
  if (!office.officeKey || office.officeKey.trim().length === 0) {
    throw new Error("Elective office key must not be empty.");
  }
  if (!office.title || office.title.trim().length === 0) {
    throw new Error("Elective office title must not be empty.");
  }
  if (office.seatKey !== null && office.seatKey.trim().length === 0) {
    throw new Error("Elective office seat key must not be empty string.");
  }
}

function canonicalCandidateIds(
  ids: readonly EntityId[],
  label: string,
): readonly EntityId[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(`${label} must contain at least one candidate.`);
  }
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error(`${label} contains duplicate candidate Person IDs.`);
  }
  return [...ids];
}

function validateTallies(
  tallies: readonly CandidateTally[],
  candidatePersonIds: readonly EntityId[],
): void {
  if (!Array.isArray(tallies) || tallies.length !== candidatePersonIds.length) {
    throw new Error(
      "Election tallies count must match the candidate count exactly.",
    );
  }
  const tallyCandidates = new Set(tallies.map((t) => t.candidatePersonId));
  if (tallyCandidates.size !== tallies.length) {
    throw new Error("Election tallies contain duplicate candidate entries.");
  }
  for (const candidateId of candidatePersonIds) {
    if (!tallyCandidates.has(candidateId)) {
      throw new Error(
        `Election tallies missing entry for candidate: ${candidateId}`,
      );
    }
  }
  for (const tally of tallies) {
    if (!Number.isSafeInteger(tally.votes) || tally.votes < 0) {
      throw new Error(`Invalid vote tally count: ${tally.votes}`);
    }
    if (
      typeof tally.voteShare !== "number" ||
      tally.voteShare < 0 ||
      tally.voteShare > 1.0
    ) {
      throw new Error(`Invalid vote share: ${tally.voteShare}`);
    }
  }
}

function cloneElectionContestProvenance(
  provenance: ElectionContestProvenance,
): ElectionContestProvenance {
  return {
    method: provenance.method,
    sourceEntityIds: [...provenance.sourceEntityIds],
    note: provenance.note,
  };
}

function validateElectionContestProvenance(
  world: World,
  provenance: ElectionContestProvenance,
  asOfDate: IsoDate,
  sequenceExclusive: number,
  label: string,
): void {
  if (!provenance || typeof provenance !== "object") {
    throw new Error(`${label} provenance must be an object.`);
  }
  if (!["authored", "simulated", "manual"].includes(provenance.method)) {
    throw new Error(
      `${label} provenance method is invalid: ${provenance.method}`,
    );
  }
  for (const sourceId of provenance.sourceEntityIds) {
    if (
      !canonicalEntityAvailable(world, sourceId, asOfDate, sequenceExclusive)
    ) {
      throw new Error(
        `${label} provenance references an unavailable entity: ${sourceId}`,
      );
    }
  }
}

function canonicalEntityAvailable(
  world: World,
  id: EntityId,
  asOfDate: IsoDate,
  sequenceExclusive: number,
): boolean {
  if (id === world.id || world.jurisdictions[id] || world.people[id]) {
    return true;
  }
  if (
    electionContestEntityAvailableAt(world, id, asOfDate, sequenceExclusive)
  ) {
    return true;
  }
  const event = world.history.events.find((record) => record.id === id);
  if (event) {
    return event.occurredAt <= asOfDate && event.sequence < sequenceExclusive;
  }
  const due = world.history.futureDueItems.find((record) => record.id === id);
  if (due) {
    return due.scheduledAt <= asOfDate && due.sequence < sequenceExclusive;
  }
  return false;
}

function assertSequenceOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  for (let index = 1; index < records.length; index += 1) {
    if (records[index]!.sequence <= records[index - 1]!.sequence) {
      throw new Error(
        `${label} records must be strictly ordered by history sequence.`,
      );
    }
  }
}

function assertUniqueStableKeys(
  records: readonly { readonly stableKey: string }[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.stableKey)) {
      throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
    }
    seen.add(record.stableKey);
  }
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  record: { readonly id: EntityId; readonly sequence: number },
  kind: "election-contest" | "election-contest-result",
): void {
  if (ids.has(record.id)) {
    throw new Error(`Duplicate history record identity: ${record.id}`);
  }
  ids.add(record.id);
  const expectedPrefix = `${kind}_`;
  if (!record.id.startsWith(expectedPrefix)) {
    throw new Error(
      `Record ID does not match entity kind ${kind}: ${record.id}`,
    );
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 0) {
    throw new Error(
      `Record sequence must be a non-negative safe integer: ${record.id}`,
    );
  }
}
