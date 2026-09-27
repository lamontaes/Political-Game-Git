/** Senate advice and consent for a recorded federal judicial nomination. */

import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { currentPresidentOf } from "../crisis/offices";
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
import { courtById, seatHolderAt } from "./courts";
import {
  judicialSelectionById,
  judicialSelectionProgress,
  judicialSelectionStages,
  recordJudicialSelectionStage,
  resolveJudicialSelectionPlan,
} from "./selection";
import {
  commissionConfirmedFederalJudge,
  federalJudicialExecutiveOfficeBlocker,
} from "./federal-judicial-commission";
import { publishJudiciaryMilestone } from "./news";

export const JUDICIAL_SENATE_BALLOT_EVENT = "judicial.senate-ballot";
export const JUDICIAL_SENATE_RESULT_EVENT = "judicial.senate-result";
export const JUDICIAL_CONFIRMATION_HEARING_EVENT =
  "judicial.confirmation-hearing";

/** A report, calendar admission, and actual floor sitting admit new ballots. */
function admittedNominationAtFloorSitting(
  world: World,
  selectionRecordId: string,
): World["history"]["events"][number] | null {
  const report = world.history.events.find(
    (event) =>
      event.type === "judicial.committee-report-result" &&
      event.tags.includes(`selection:${selectionRecordId}`) &&
      event.tags.includes("result:reported"),
  );
  const calendar = report
    ? world.history.events.find(
        (event) =>
          event.type === "judicial.executive-calendar-admission" &&
          event.tags.includes(`selection:${selectionRecordId}`) &&
          event.tags.includes(`report:${report.id}`),
      )
    : null;
  return calendar
    ? (world.history.events.findLast(
        (event) =>
          event.type === "judicial.senate-floor-sitting" &&
          event.tags.includes(`selection:${selectionRecordId}`) &&
          event.tags.includes(`calendar:${calendar.id}`) &&
          event.occurredAt >= calendar.occurredAt,
      ) ?? null)
    : null;
}

type SenateBallot = LegislativeMemberDisposition;

export function pendingFederalJudicialNomination(
  world: World,
  selectionRecordId: string,
) {
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
export function recordFederalJudicialSenateBallot(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly senatorPersonId: EntityId;
    readonly ballot: SenateBallot;
    readonly reason: string;
    readonly expectedSittingId?: EntityId;
  },
): World {
  const pending = pendingFederalJudicialNomination(
    world,
    input.selectionRecordId,
  );
  const hasNewReportRecord = world.history.events.some(
    (event) =>
      (event.type === "judicial.committee-report-result" ||
        event.type === "judicial.executive-calendar-admission") &&
      event.tags.includes(`selection:${input.selectionRecordId}`),
  );
  // Previously saved partial roll calls can finish only when an earlier
  // Senator's ballot named this same selection's actual hearing. A new report
  // record always takes the stricter report/calendar/floor route.
  const legacyBallotAlreadyRecorded =
    !hasNewReportRecord &&
    world.history.events.some((event) => {
      if (
        event.type !== JUDICIAL_SENATE_BALLOT_EVENT ||
        !event.tags.includes(`selection:${input.selectionRecordId}`)
      )
        return false;
      const heardId = event.tags
        .find((tag) => tag.startsWith("hearing:"))
        ?.slice("hearing:".length);
      return world.history.events.some(
        (hearing) =>
          hearing.id === heardId &&
          hearing.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
          hearing.tags.includes(`selection:${input.selectionRecordId}`) &&
          hearing.occurredAt <= event.occurredAt,
      );
    });
  const floorSitting = admittedNominationAtFloorSitting(
    world,
    input.selectionRecordId,
  );
  if (input.expectedSittingId && floorSitting?.id !== input.expectedSittingId)
    throw new Error("The Senate ballot targets an earlier floor sitting.");
  if (!floorSitting && !legacyBallotAlreadyRecorded)
    throw new Error(
      "A committee report, Executive Calendar admission, and actual floor sitting are needed before a new Senate ballot.",
    );
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
  const recorded = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_SENATE_BALLOT_EVENT &&
      event.tags.includes(`selection:${input.selectionRecordId}`) &&
      event.tags.includes(`senator:${input.senatorPersonId}`) &&
      (floorSitting
        ? event.tags.includes(`sitting:${floorSitting.id}`)
        : !event.tags.some((tag) => tag.startsWith("sitting:"))),
  );
  if (recorded) return world;
  if (
    floorSitting &&
    floorSitting.tags.some(
      (tag) => tag.startsWith("attendee:") || tag.startsWith("absent:"),
    ) &&
    floorSitting.tags.includes(`attendee:${input.senatorPersonId}`) !==
      !["absent", "excused"].includes(input.ballot)
  )
    throw new Error(
      "A Senate floor ballot must match recorded sitting attendance.",
    );
  const heard = world.history.knowledge
    .filter(
      (knowledge) =>
        knowledge.personId === input.senatorPersonId &&
        knowledge.learnedAt <= world.currentDate &&
        knowledge.accuracy === "accurate",
    )
    .map((knowledge) =>
      world.history.events.find((event) => event.id === knowledge.eventId),
    )
    .find(
      (event) =>
        event?.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
        event.tags.includes(`selection:${pending.selection.recordId}`),
    );
  if ((input.ballot === "yea" || input.ballot === "nay") && !heard)
    throw new Error(
      "A Senator needs a recorded hearing basis for a yes or no ballot.",
    );
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
      ...(floorSitting ? [`sitting:${floorSitting.id}`] : []),
      ...(heard ? [`hearing:${heard.id}`] : []),
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
  pendingFederalJudicialNomination(world, selectionRecordId);
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
  const sitting = admittedNominationAtFloorSitting(world, selectionRecordId);
  const savedRoster = sitting
    ? new Set(
        sitting.tags
          .filter((tag) => tag.startsWith("roster:"))
          .map((tag) => tag.slice("roster:".length)),
      )
    : null;
  // Earlier saved first sittings carry attendee/absent tags but no roster tag.
  if (sitting && savedRoster && savedRoster.size === 0) {
    for (const tag of sitting.tags) {
      if (tag.startsWith("attendee:"))
        savedRoster.add(tag.slice("attendee:".length));
      if (tag.startsWith("absent:"))
        savedRoster.add(tag.slice("absent:".length));
    }
  }
  const members = senate.body.members.filter(
    (member) => member.personId !== null,
  );
  if (
    savedRoster &&
    savedRoster.size > 0 &&
    (members.length !== savedRoster.size ||
      members.some((member) => !savedRoster.has(member.personId!)))
  )
    return {
      state: "unresolved",
      reason: "The Senate seating changed after this floor sitting.",
    };
  const dispositions: LegislativeVoteDisposition[] = [];
  for (const member of members) {
    const latest = world.history.events
      .filter(
        (event) =>
          event.type === JUDICIAL_SENATE_BALLOT_EVENT &&
          event.tags.includes(`selection:${selectionRecordId}`) &&
          event.tags.includes(`senator:${member.personId}`) &&
          (sitting
            ? event.tags.includes(`sitting:${sitting.id}`)
            : !event.tags.some((tag) => tag.startsWith("sitting:"))),
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
  if (tally.yea + tally.nay === 0)
    return {
      state: "unresolved",
      reason: "No Senator cast a yes or no vote on the nomination.",
    };
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
): World {
  const pending = pendingFederalJudicialNomination(world, selectionRecordId);
  const status = federalJudicialSenateVoteStatus(world, selectionRecordId);
  if (status.state !== "ready") throw new Error(status.reason);
  const sitting = admittedNominationAtFloorSitting(world, selectionRecordId);
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
      ...(sitting ? [`sitting:${sitting.id}`] : []),
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
  next = publishJudiciaryMilestone(next, resultEventId);
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
  // A controlled President must issue the separate commission themselves.
  const presidentId = currentPresidentOf(next)?.personId;
  if (!presidentId) return next;
  if (world.control.kind === "person" && world.control.personId === presidentId)
    return next;
  if (federalJudicialExecutiveOfficeBlocker(next, pending.nomineeId))
    return next;
  return commissionConfirmedFederalJudge(next, {
    selectionRecordId,
    resultEventId,
    presidentPersonId: presidentId,
    mode: "automatic-npc",
  });
}
