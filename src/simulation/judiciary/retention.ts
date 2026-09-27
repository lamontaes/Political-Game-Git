/** Yes/no judicial retention through the shared election tally and Day clock. */

import { dateAtAge } from "../dates";
import { evaluateDeterministicYesNoBallot } from "../election-contests";
import { scheduleFutureDueItem } from "../future-transitions";
import { createStableId } from "../ids";
import { personName } from "../people";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  courtById,
  effectiveCourtRulesAt,
  seatHolderAt,
  seatJudge,
  seatsForCourt,
  vacateJudicialSeat,
} from "./courts";
import {
  judicialRetentionPasses,
  judicialRetentionThreshold,
  judicialSelectionById,
  judicialSelectionProgress,
  openJudicialSelectionFromProfile,
  recordJudicialSelectionStage,
  resolveJudicialSelectionPlan,
} from "./selection";

export const JUDICIAL_RETENTION_ELECTION = "judiciary:retention-election";
export const JUDICIAL_RETENTION_VOTER_PROFILE = "judicial-retention-voters/v1";

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

/** The seated tenure supplies the election day; no calendar is guessed here. */
export function scheduleJudicialRetentionElection(
  world: World,
  seatId: string,
): World {
  const seat = world.judiciary?.seats[seatId];
  const court = seat ? courtById(world, seat.courtId) : null;
  const holder = seatHolderAt(world, seatId);
  if (!seat || !court?.jurisdictionId || !holder)
    throw new Error(
      "Retention requires an occupied jurisdictional judicial seat.",
    );
  const tenure = world.judiciary?.seatTenures.find(
    (row) => row.tenureId === holder.tenureId,
  );
  if (!tenure?.retentionDueAt || tenure.retentionDueAt <= world.currentDate)
    throw new Error("Retention requires a recorded future election date.");
  const rules = effectiveCourtRulesAt(world, court.courtId)?.rules;
  if (
    rules?.termYears.state !== "known" ||
    !rules.termYears.value ||
    rules.termYears.value < 1
  )
    throw new Error(
      "Retention needs an operative term length for the next tenure.",
    );
  const threshold = judicialRetentionThreshold(world, seatId);
  if (threshold.state !== "ready") throw new Error(threshold.reason);
  const path = resolveJudicialSelectionPlan(world, seatId, "renewal");
  if (
    path.state !== "ready" ||
    path.plan.stages[0]?.mechanism !== "RETENTION_ELECTION"
  )
    throw new Error(
      "The reported renewal path does not begin with a retention election.",
    );
  if (
    rules.authorizedSeats.state === "known" &&
    seatsForCourt(world, court.courtId).filter(
      (active) => !active.allocationRecordId,
    ).length > rules.authorizedSeats.value
  )
    throw new Error(
      "The seat is pending retirement under the current court size.",
    );
  if (
    world.judiciary?.retentionContests.some(
      (row) =>
        row.seatId === seatId && row.electionDate === tenure.retentionDueAt,
    )
  )
    throw new Error("This judicial retention election is already scheduled.");
  const opened = openJudicialSelectionFromProfile(world, {
    seatId,
    kind: "renewal",
    candidatePersonIds: [holder.personId],
  });
  const selection = opened.judiciary!.selections.at(-1)!;
  const recordId = createStableId(
    "judicial-retention-contest",
    `${world.id}:${selection.recordId}:${tenure.retentionDueAt}`,
  );
  const contest = {
    recordId,
    selectionRecordId: selection.recordId,
    seatId,
    incumbentPersonId: holder.personId,
    jurisdictionId: court.jurisdictionId,
    scheduledAt: world.currentDate,
    electionDate: tenure.retentionDueAt,
    threshold: threshold.rule,
    sourceRecordId: court.sourceRecordId,
    decisionRecordId: null,
  } as const;
  const withContest: World = {
    ...opened,
    judiciary: {
      ...opened.judiciary!,
      selections: opened.judiciary!.selections.map((row) =>
        row.recordId === selection.recordId
          ? {
              ...row,
              ballot: {
                kind: "retention-yes-no" as const,
                electionContestId: recordId,
                incumbentPersonId: holder.personId,
                threshold: threshold.rule,
                choices: ["yes", "no"] as const,
              },
            }
          : row,
      ),
      retentionContests: [...opened.judiciary!.retentionContests, contest],
    },
  };
  assertWorldIntegrity(withContest);
  return scheduleFutureDueItem(withContest, {
    stableKey: `judicial-retention:${recordId}`,
    dueAt: contest.electionDate,
    transitionKey: JUDICIAL_RETENTION_ELECTION,
    entityIds: [holder.personId],
    jurisdictionId: court.jurisdictionId,
    provenance: {
      kind: "authored",
      note: `${JUDICIAL_RETENTION_VOTER_PROFILE}: 92L reports a retention election and threshold; the voter actor and tally baseline are explicit game profiles.`,
    },
  });
}

function outcome(
  world: World,
  status: FutureTransitionHandlerResult["status"],
  context: string,
  eventId: EntityId | null = null,
): FutureTransitionHandlerResult {
  return {
    world,
    status,
    reasonKey: status === "blocked" ? "judiciary:retention-unresolved" : null,
    context,
    outcomeEventId: eventId,
  };
}

/** The yes/no result changes the actual seat and survives Save/Continue. */
export function judicialRetentionElectionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /^judicial-retention:(.+)$/.exec(due.stableKey);
  const contest = match
    ? world.judiciary?.retentionContests.find(
        (row) => row.recordId === match[1],
      )
    : null;
  if (!contest || contest.electionDate > world.currentDate)
    return outcome(
      world,
      "blocked",
      "No dated judicial retention ballot is ready.",
    );
  if (
    world.judiciary!.retentionResults.some(
      (row) => row.contestId === contest.recordId,
    )
  )
    return outcome(
      world,
      "resolved",
      "The retention ballot was already counted.",
    );
  const selection = judicialSelectionById(world, contest.selectionRecordId);
  if (!selection)
    return outcome(world, "blocked", "The saved selection attempt is missing.");
  const resolved = resolveJudicialSelectionPlan(
    world,
    contest.seatId,
    selection.kind,
  );
  const threshold = judicialRetentionThreshold(world, contest.seatId);
  if (resolved.state !== "ready")
    return outcome(world, "blocked", resolved.reason);
  if (threshold.state !== "ready")
    return outcome(world, "blocked", threshold.reason);
  const progress = judicialSelectionProgress(
    world,
    selection.recordId,
    resolved.plan,
  );
  if (
    progress.status !== "pending" ||
    resolved.plan.stages[progress.nextOrder - 1]?.mechanism !==
      "RETENTION_ELECTION"
  )
    return outcome(
      world,
      "blocked",
      "The selection is not at its retention ballot stage.",
    );
  const seat = world.judiciary!.seats[contest.seatId]!;
  const court = courtById(world, seat.courtId)!;
  const holder = seatHolderAt(world, contest.seatId);
  if (holder?.personId !== contest.incumbentPersonId) {
    const lapsed = recordWorldEvent(world, {
      stableKey: `${contest.recordId}:lapsed`,
      type: "judicial.retention-lapsed",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: contest.jurisdictionId,
      involvedEntityIds: [contest.incumbentPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `contest:${contest.recordId}`,
        `game-profile:${JUDICIAL_RETENTION_VOTER_PROFILE}`,
      ],
      summary: `The retention election for ${court.name} lapsed because the incumbent no longer holds the seat.`,
      context: CONTEXT,
    });
    const eventId = lapsed.history.events.at(-1)!.id;
    const staged = recordJudicialSelectionStage(lapsed, {
      selectionRecordId: selection.recordId,
      plan: resolved.plan,
      occurredAt: lapsed.currentDate,
      actorPersonId: null,
      candidatePersonId: contest.incumbentPersonId,
      outcome: "lapsed",
      decisionRecordId: null,
      electionContestId: contest.recordId,
      outcomeEventId: eventId,
    });
    return outcome(
      staged,
      "resolved",
      "The incumbent left before the retention vote.",
      eventId,
    );
  }
  const rules = effectiveCourtRulesAt(world, court.courtId)?.rules;
  if (
    rules?.termYears.state !== "known" ||
    !rules.termYears.value ||
    rules.termYears.value < 1
  )
    return outcome(
      world,
      "blocked",
      "The next judicial term length is unresolved.",
    );
  if (
    rules.authorizedSeats.state === "known" &&
    seatsForCourt(world, court.courtId).filter(
      (active) => !active.allocationRecordId,
    ).length > rules.authorizedSeats.value
  )
    return outcome(
      world,
      "blocked",
      "The seat is pending retirement under the current court size.",
    );
  const { yesVotes, noVotes } = evaluateDeterministicYesNoBallot(
    world,
    contest.recordId,
  );
  const retained = judicialRetentionPasses(
    yesVotes,
    noVotes,
    threshold.threshold,
  );
  const incumbent = world.people[contest.incumbentPersonId]!;
  let next = recordWorldEvent(world, {
    stableKey: `${contest.recordId}:result`,
    type: "judicial.retention-result",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: contest.jurisdictionId,
    involvedEntityIds: [contest.incumbentPersonId],
    participants: [
      {
        personId: contest.incumbentPersonId,
        role: "focus:subject",
        detail: "Sitting judge",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `contest:${contest.recordId}`,
      `yes:${yesVotes}`,
      `no:${noVotes}`,
      `threshold:${threshold.threshold.reportedToken}`,
      `game-profile:${JUDICIAL_RETENTION_VOTER_PROFILE}`,
      "evidence:92l-research-synthesis",
    ],
    summary: `${personName(incumbent)} ${retained ? "was retained" : "lost retention"} on ${court.name} by ${yesVotes} yes to ${noVotes} no votes.`,
    context: CONTEXT,
  });
  const eventId = next.history.events.at(-1)!.id;
  next = {
    ...next,
    judiciary: {
      ...next.judiciary!,
      retentionResults: [
        ...next.judiciary!.retentionResults,
        {
          recordId: createStableId(
            "judicial-retention-result",
            `${world.id}:${contest.recordId}:result`,
          ),
          contestId: contest.recordId,
          decidedAt: world.currentDate,
          yesVotes,
          noVotes,
          outcome: retained ? "retained" : "rejected",
          outcomeEventId: eventId,
          decisionRecordId: null,
        },
      ],
    },
  };
  next = recordJudicialSelectionStage(next, {
    selectionRecordId: selection.recordId,
    plan: resolved.plan,
    occurredAt: world.currentDate,
    actorPersonId: null,
    candidatePersonId: contest.incumbentPersonId,
    outcome: retained ? "completed" : "rejected",
    decisionRecordId: null,
    electionContestId: contest.recordId,
    outcomeEventId: eventId,
  });
  next = vacateJudicialSeat(next, {
    seatId: contest.seatId,
    vacatedAt: world.currentDate,
    reason: retained ? "term-expired" : "election-loss",
  });
  if (retained)
    next = seatJudge(next, {
      seatId: contest.seatId,
      personId: contest.incumbentPersonId,
      startedAt: world.currentDate,
      selection: {
        path: "retention",
        selectionRecordId: selection.recordId,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: contest.recordId,
        note: `${JUDICIAL_RETENTION_VOTER_PROFILE}; next election timing remains unresolved.`,
      },
      termEndsAt: dateAtAge(world.currentDate, rules.termYears.value),
      retentionDueAt: null,
    });
  return outcome(
    next,
    "resolved",
    retained
      ? "The judge was retained."
      : "The judicial seat is vacant after retention loss.",
    eventId,
  );
}
