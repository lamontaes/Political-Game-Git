/** Senate advice and consent for a recorded federal judicial nomination. */

import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { FEDERAL_TENURE_EVENT, currentFederalTenure } from "../federal-tenures";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { tallyDispositions } from "../legislation";
import { resolveRequiredVotes } from "../legislature-rules";
import { personName } from "../people";
import type {
  EntityId,
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
  LegislativeVoteTally,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { courtById, seatHolderAt, seatJudge } from "./courts";
import {
  judicialSelectionById,
  judicialSelectionProgress,
  judicialSelectionStages,
  recordJudicialSelectionStage,
  resolveJudicialSelectionPlan,
} from "./selection";

export const JUDICIAL_SENATE_BALLOT_EVENT = "judicial.senate-ballot";
export const JUDICIAL_SENATE_RESULT_EVENT = "judicial.senate-result";

type SenateBallot = LegislativeMemberDisposition;

function pendingNomination(world: World, selectionRecordId: string) {
  const selection = judicialSelectionById(world, selectionRecordId);
  if (!selection) throw new Error("No judicial selection attempt matches.");
  const seat = world.judiciary?.seats[selection.seatId];
  const court = seat ? courtById(world, seat.courtId) : null;
  if (!seat || !court?.level.startsWith("federal-"))
    throw new Error("This is not a federal judicial seat.");
  if (seatHolderAt(world, seat.seatId))
    throw new Error("The judicial seat is already filled.");
  const resolved = resolveJudicialSelectionPlan(
    world,
    selection.seatId,
    selection.kind,
  );
  if (resolved.state !== "ready") throw new Error(resolved.reason);
  const progress = judicialSelectionProgress(
    world,
    selection.recordId,
    resolved.plan,
  );
  if (progress.status !== "pending")
    throw new Error("No judicial confirmation is pending.");
  const stage = resolved.plan.stages[progress.nextOrder - 1];
  if (
    stage?.mechanism !== "LEGISLATIVE_CONFIRMATION" ||
    stage.actor.value !== "United States Senate"
  )
    throw new Error("The next stage is not Senate confirmation.");
  const nomination = judicialSelectionStages(world, selection.recordId).at(-1);
  const nomineeId = nomination?.candidatePersonId;
  if (!nomineeId || nomination.mechanism !== "EXECUTIVE_NOMINATION")
    throw new Error("The President has not recorded a nominee.");
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === nomineeId && death.diedAt <= world.currentDate,
    )
  )
    throw new Error("The nominee died before Senate action.");
  return { selection, seat, court, plan: resolved.plan, nomination, nomineeId };
}

/** The senator's choice is written by its actual actor, never inferred from party. */
// PLACEHOLDER(overnight): an NPC hearing/decision producer has not yet supplied these choices.
export function recordFederalJudicialSenateBallot(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly senatorPersonId: EntityId;
    readonly ballot: SenateBallot;
    readonly reason: string;
  },
): World {
  const pending = pendingNomination(world, input.selectionRecordId);
  const senate = seatedCongressChamber(world, "senate");
  if (
    !senate?.body.members.some(
      (member) => member.personId === input.senatorPersonId,
    )
  )
    throw new Error("Only a seated Senator may record this ballot.");
  if (!input.reason.trim())
    throw new Error("A Senate ballot needs its actor's stated reason.");
  if (
    !["yea", "nay", "present-not-voting", "absent", "excused"].includes(
      input.ballot,
    )
  )
    throw new Error("Unknown Senate ballot disposition.");
  const action = {
    yea: "voted yes",
    nay: "voted no",
    "present-not-voting": "was present without voting",
    absent: "was recorded absent",
    excused: "was excused",
  }[input.ballot];
  return recordWorldEvent(world, {
    stableKey: `${JUDICIAL_SENATE_BALLOT_EVENT}:${pending.selection.recordId}:${input.senatorPersonId}:${world.history.nextSequence}`,
    type: JUDICIAL_SENATE_BALLOT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.senatorPersonId, pending.nomineeId],
    participants: [
      {
        personId: input.senatorPersonId,
        role: "focus:actor",
        detail: "Senator",
      },
      {
        personId: pending.nomineeId,
        role: "focus:subject",
        detail: "Judicial nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${pending.selection.recordId}`,
      `ballot:${input.ballot}`,
      `senator:${input.senatorPersonId}`,
    ],
    // COPY-PENDING: Claude/CC1 owns final player-facing Senate wording.
    summary: `${personName(world.people[input.senatorPersonId]!)} ${action} on ${personName(world.people[pending.nomineeId]!)}'s judicial nomination. ${input.reason.trim()}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: input.reason.trim(),
      immediateReaction: input.ballot,
    },
  });
}

export type FederalJudicialSenateVoteStatus =
  | { readonly state: "unresolved"; readonly reason: string }
  | {
      readonly state: "ready";
      readonly outcome: "confirmed" | "rejected";
      readonly tally: LegislativeVoteTally;
      readonly eligibleMembers: number;
      readonly presentMembers: number;
      readonly requiredVotes: number;
      readonly dispositions: readonly LegislativeVoteDisposition[];
    };

/** Reads only recorded ballots from the currently seated Senate. */
export function federalJudicialSenateVoteStatus(
  world: World,
  selectionRecordId: string,
): FederalJudicialSenateVoteStatus {
  pendingNomination(world, selectionRecordId);
  const senate = seatedCongressChamber(world, "senate");
  if (!senate)
    return { state: "unresolved", reason: "The Senate has no saved seating." };
  const rules = US_CONGRESS_RULE_PACK.chambers.find(
    (chamber) => chamber.chamberKey === "senate",
  );
  // PLACEHOLDER(overnight): nomination procedure reuses the saved Senate
  // majority floor rule until a nomination-specific rule field is admitted.
  const vote = rules?.floorStages.find(
    (stage) => stage.stageKey === "passage",
  )?.vote;
  if (rules?.quorum.kind !== "known" || vote?.kind !== "known")
    return {
      state: "unresolved",
      reason: "The Senate vote rule is unresolved.",
    };
  const dispositions: LegislativeVoteDisposition[] = [];
  for (const member of senate.body.members) {
    const latest = world.history.events
      .filter(
        (event) =>
          event.type === JUDICIAL_SENATE_BALLOT_EVENT &&
          event.tags.includes(`selection:${selectionRecordId}`) &&
          event.tags.includes(`senator:${member.personId}`),
      )
      .at(-1);
    const disposition = latest?.context.immediateReaction;
    if (
      disposition !== "yea" &&
      disposition !== "nay" &&
      disposition !== "present-not-voting" &&
      disposition !== "absent" &&
      disposition !== "excused"
    )
      return {
        state: "unresolved",
        reason: `The Senate has unrecorded ballots, beginning with ${member.name}.`,
      };
    dispositions.push({
      memberKey: member.memberKey,
      personId: member.personId,
      disposition,
      reason: latest!.context.motivation ?? undefined,
    });
  }
  const tally = tallyDispositions(dispositions);
  const presentMembers = tally.yea + tally.nay + tally.presentNotVoting;
  const quorum = resolveRequiredVotes(
    rules.quorum.value,
    senate.body.members.length,
  );
  if (presentMembers < quorum.requiredVotes)
    return {
      state: "unresolved",
      reason: `The recorded Senate roll call lacks a quorum (${presentMembers}/${quorum.requiredVotes}).`,
    };
  const required = resolveRequiredVotes(vote.value, tally.yea + tally.nay);
  return {
    state: "ready",
    outcome: tally.yea >= required.requiredVotes ? "confirmed" : "rejected",
    tally,
    eligibleMembers: senate.body.members.length,
    presentMembers,
    requiredVotes: required.requiredVotes,
    dispositions,
  };
}

/** Applies a complete Senate roll call to the ordered selection and seat. */
export function resolveFederalJudicialSenateVote(
  world: World,
  selectionRecordId: string,
  leaveCongressSeat: (world: World, personId: EntityId) => World,
): World {
  const pending = pendingNomination(world, selectionRecordId);
  const status = federalJudicialSenateVoteStatus(world, selectionRecordId);
  if (status.state !== "ready") throw new Error(status.reason);
  const nominee = world.people[pending.nomineeId]!;
  let next = recordWorldEvent(world, {
    stableKey: `${JUDICIAL_SENATE_RESULT_EVENT}:${selectionRecordId}`,
    type: JUDICIAL_SENATE_RESULT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: pending.court.jurisdictionId,
    involvedEntityIds: [pending.nomineeId],
    participants: [
      {
        personId: pending.nomineeId,
        role: "focus:subject",
        detail: "Judicial nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${selectionRecordId}`,
      `outcome:${status.outcome}`,
      `yea:${status.tally.yea}`,
      `nay:${status.tally.nay}`,
      `quorum:${status.presentMembers}/${status.eligibleMembers}`,
      `required-yeas:${status.requiredVotes}`,
    ],
    // COPY-PENDING: Claude/CC1 owns final player-facing Senate wording.
    summary: `The Senate ${status.outcome === "confirmed" ? "confirmed" : "rejected"} ${personName(nominee)} for ${pending.court.name}, ${status.tally.yea} to ${status.tally.nay}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: status.outcome,
    },
  });
  const resultEventId = next.history.events.at(-1)!.id;
  next = recordJudicialSelectionStage(next, {
    selectionRecordId,
    plan: pending.plan,
    occurredAt: next.currentDate,
    actorPersonId: null,
    candidatePersonId: pending.nomineeId,
    outcome: status.outcome === "confirmed" ? "completed" : "rejected",
    decisionRecordId: null,
    electionContestId: null,
    outcomeEventId: resultEventId,
  });
  if (status.outcome === "rejected") return next;
  if (pending.seat.linkedOfficeId === "us-chief-justice") {
    if (currentFederalTenure(next, "us-chief-justice"))
      throw new Error("The Chief Justiceship is already filled.");
    next = recordWorldEvent(next, {
      stableKey: `${JUDICIAL_SENATE_RESULT_EVENT}:${selectionRecordId}:tenure`,
      type: FEDERAL_TENURE_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [pending.nomineeId],
      participants: [
        {
          personId: pending.nomineeId,
          role: "focus:subject",
          detail: "Chief Justice of the United States",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "office:us-chief-justice",
        "basis:us-const-art-ii-s2-cl2",
        `selection:${selectionRecordId}`,
      ],
      summary: `${personName(nominee)} began service as Chief Justice after Senate confirmation.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  } else {
    if (
      pending.court.rules.termYears.state !== "known" ||
      pending.court.rules.termYears.value !== null
    )
      throw new Error(
        "This federal seat needs its tenure duration resolved before seating.",
      );
    next = seatJudge(next, {
      seatId: pending.seat.seatId,
      personId: pending.nomineeId,
      startedAt: next.currentDate,
      selection: {
        path: "confirmation",
        selectionRecordId,
        decisionRecordId: null,
        selectingPersonId: pending.nomination.actorPersonId,
        contestId: null,
        note: `Senate result ${resultEventId}`,
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
  }
  return leaveCongressSeat(next, pending.nomineeId);
}
