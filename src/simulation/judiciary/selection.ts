/** Dated attempts to fill or renew a real seat in the saved judiciary. */

import type { EntityId, IsoDate, World } from "../types";
import { makeIsoDate } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import { scheduleFutureDueItem } from "../future-transitions";
import { nextCongressSitting } from "../governing/congress-chambers";
import { electionContestResult } from "../election-contests";
import { personName } from "../people";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  courtById,
  effectiveCourtRulesAt,
  releaseJudicialSeatForAppointment,
  seatHolderAt,
  seatJudge,
  vacateJudicialSeat,
} from "./courts";
import { judicialSelectionProfile } from "./profiles";
import { judicialPhilosophyHasEvidence } from "./philosophy";
import type {
  JudicialRuleField,
  JudicialPhilosophyRecord,
  JudicialSelectionRecord,
  JudicialSelectionStageRecord,
  JudicialSeatSelectionPath,
} from "./types";

export const JUDICIAL_POPULAR_VOTER_PROFILE = "judicial-popular-voters/v1";
export const JUDICIAL_SENATE_REFERRAL_TRANSITION =
  "judiciary:senate-referral" as const;

export type FederalJudicialNomineeScreen =
  | {
      readonly state: "ready";
      readonly philosophy: JudicialPhilosophyRecord;
    }
  | { readonly state: "unresolved"; readonly reason: string };

/** A dated, evidenced philosophy is screening evidence; party is never a substitute. */
export function screenFederalJudicialNominee(
  world: World,
  personId: EntityId,
): FederalJudicialNomineeScreen {
  const person = world.people[personId];
  if (!person)
    return { state: "unresolved", reason: "Nominee is not in this World." };
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return {
      state: "unresolved",
      reason: "A deceased person cannot be nominated.",
    };
  const philosophy = [...(world.judiciary?.philosophies ?? [])]
    .filter(
      (record) =>
        record.personId === personId && record.formedAt <= world.currentDate,
    )
    .sort((left, right) => left.formedAt.localeCompare(right.formedAt))
    .at(-1);
  if (!philosophy)
    return {
      state: "unresolved",
      reason: "This person has no recorded judicial philosophy.",
    };
  if (!judicialPhilosophyHasEvidence(world, philosophy))
    return {
      state: "unresolved",
      reason:
        "The recorded judicial philosophy lacks supported life evidence or an assessed dimension.",
    };
  return { state: "ready", philosophy };
}

/**
 * A path already admitted by the judicial profile adapter. The adapter owns
 * legal authority and any explicitly approved game profile; this writer only
 * checks that its identity belongs to the court and enforces the saved order.
 */
export interface JudicialSelectionPlan {
  readonly sourceRecordId: string;
  readonly pathId: string;
  readonly stages: readonly {
    readonly order: number;
    readonly mechanism: string;
    readonly actor: { readonly state: string; readonly value?: string };
  }[];
}

export type JudicialSelectionPlanResolution =
  | {
      readonly state: "ready";
      readonly plan: JudicialSelectionPlan;
      readonly evidenceTier: "RESEARCH_SYNTHESIS";
      readonly primaryAuthorityStatus: "CITATIONS_REPORTED_NOT_RETRIEVED";
    }
  | { readonly state: "unresolved"; readonly reason: string };

/**
 * Reads the compact 92L projection, never its raw source corpus. A reported
 * branch cannot be selected from a court name or geographic guess.
 */
export function resolveJudicialSelectionPlan(
  world: World,
  seatId: string,
  kind: JudicialSelectionRecord["kind"],
): JudicialSelectionPlanResolution {
  const seat = world.judiciary?.seats[seatId];
  if (!seat || seat.retiredAt !== null || seat.createdAt > world.currentDate)
    return { state: "unresolved", reason: "The judicial seat is not active." };
  const court = courtById(world, seat.courtId);
  if (!court || !court.rules.selectionRecordId)
    return {
      state: "unresolved",
      reason: "The court has no admitted selection profile.",
    };
  const profile = judicialSelectionProfile(court.rules.selectionRecordId);
  if (
    profile?.jurisdictionId === "us-fed" &&
    ((court.level === "federal-supreme" &&
      (court.courtId !== "us-supreme-court" ||
        profile.officeFamily !== "highest_court")) ||
      (court.level === "federal-appellate" &&
        (!court.sourceRecordId ||
          profile.officeFamily !== "intermediate_appellate")) ||
      (court.level === "federal-district" &&
        (!court.sourceRecordId || profile.officeFamily !== "general_trial")) ||
      !court.level.startsWith("federal-"))
  )
    return {
      state: "unresolved",
      reason: "The federal court and selection profile do not match.",
    };
  if (
    profile?.jurisdictionId !== "us-fed" &&
    court.sourceRecordId !== court.rules.selectionRecordId
  )
    return {
      state: "unresolved",
      reason: "The court and its selection rule point to different records.",
    };
  if (
    !profile ||
    profile.officeExists.state !== "KNOWN" ||
    profile.officeExists.value !== true
  )
    return {
      state: "unresolved",
      reason:
        "No operative judicial selection profile establishes this office.",
    };
  if (profile.jurisdictionId !== "us-fed") {
    const expectedJurisdiction = chiefExecutiveJurisdiction(
      profile.jurisdictionId.slice(3).toUpperCase(),
    );
    if (
      !expectedJurisdiction ||
      court.jurisdictionId !== expectedJurisdiction.id
    )
      return {
        state: "unresolved",
        reason:
          "The court's jurisdiction does not match its judicial selection profile.",
      };
  }
  const path = (() => {
    if (
      kind === "vacancy" &&
      profile.jurisdictionId === "us-fed" &&
      profile.recordId === court.rules.selectionRecordId &&
      court.rules.termYears.state === "known" &&
      court.rules.termYears.value === null
    ) {
      // Article III vacancy authority is the same President/Senate pair as
      // initial appointment. Informal screening in 92L is not a mandatory
      // appointing actor. See Article II and the U.S. Courts appointment page.
      const initial = profile.initialSelection;
      const stages = initial.value?.paths[0]?.stages;
      if (
        initial.state !== "KNOWN" ||
        initial.value?.paths.length !== 1 ||
        stages?.length !== 2 ||
        stages[0]?.mechanism !== "EXECUTIVE_NOMINATION" ||
        stages[0].actor.value !== "President of the United States" ||
        stages[1]?.mechanism !== "LEGISLATIVE_CONFIRMATION" ||
        stages[1].actor.value !== "United States Senate"
      )
        return null;
      return { pathId: "article-iii-vacancy", stages };
    }
    if (kind === "vacancy") {
      const vacancy = profile.interimVacancy;
      if (vacancy.state !== "KNOWN" || !vacancy.value) return null;
      return { pathId: "interim-vacancy", stages: vacancy.value.stages };
    }
    const pipeline =
      kind === "renewal" ? profile.renewal : profile.initialSelection;
    if (pipeline.state !== "KNOWN" || !pipeline.value) return null;
    const paths = pipeline.value.paths;
    if (
      paths.length !== 1 ||
      paths[0]!.applicability.state !== "NOT_APPLICABLE"
    )
      return null;
    return paths[0]!;
  })();
  if (!path || path.stages.length === 0)
    return {
      state: "unresolved",
      reason:
        "The reported path is missing or needs a jurisdiction branch that the saved seat has not resolved.",
    };
  return {
    state: "ready",
    evidenceTier: profile.evidenceTier,
    primaryAuthorityStatus: profile.primaryAuthorityStatus,
    plan: {
      sourceRecordId: profile.recordId,
      pathId: path.pathId,
      stages: path.stages.map((stage) => ({
        order: stage.order,
        mechanism: stage.mechanism,
        actor: {
          state: stage.actor.state,
          ...(stage.actor.value ? { value: stage.actor.value } : {}),
        },
      })),
    },
  };
}

/** Open only the unambiguous ordered path read from the court's profile. */
export function openJudicialSelectionFromProfile(
  world: World,
  input: {
    readonly seatId: string;
    readonly kind: JudicialSelectionRecord["kind"];
    readonly candidatePersonIds: readonly EntityId[];
  },
): World {
  const resolved = resolveJudicialSelectionPlan(
    world,
    input.seatId,
    input.kind,
  );
  if (resolved.state !== "ready") throw new Error(resolved.reason);
  return openJudicialSelection(world, { ...input, plan: resolved.plan });
}

export function judicialSelectionById(
  world: World,
  recordId: string,
): JudicialSelectionRecord | null {
  return (
    world.judiciary?.selections.find((row) => row.recordId === recordId) ?? null
  );
}

export function judicialSelectionStages(
  world: World,
  selectionRecordId: string,
): readonly JudicialSelectionStageRecord[] {
  return (world.judiciary?.selectionStages ?? [])
    .filter((row) => row.selectionRecordId === selectionRecordId)
    .sort((a, b) => a.order - b.order);
}

export type JudicialSelectionProgress =
  | { readonly status: "pending"; readonly nextOrder: number }
  | { readonly status: "stages-completed"; readonly nextOrder: null }
  | { readonly status: "rejected" | "lapsed"; readonly nextOrder: null };

export function judicialSelectionProgress(
  world: World,
  selectionRecordId: string,
  plan: JudicialSelectionPlan,
): JudicialSelectionProgress {
  const selection = judicialSelectionById(world, selectionRecordId);
  if (!selection)
    throw new Error(`Unknown judicial selection: ${selectionRecordId}`);
  assertSelectionPlan(world, selection.seatId, selection.kind, plan);
  if (selection.pathId !== plan.pathId)
    throw new Error(
      "Judicial selection path does not match its saved attempt.",
    );
  const stages = judicialSelectionStages(world, selectionRecordId);
  const last = stages.at(-1);
  if (last?.outcome === "rejected" || last?.outcome === "lapsed")
    return { status: last.outcome, nextOrder: null };
  if (last?.order === plan.stages.length)
    return { status: "stages-completed", nextOrder: null };
  return { status: "pending", nextOrder: (last?.order ?? 0) + 1 };
}

function assertSelectionPlan(
  world: World,
  seatId: string,
  kind: JudicialSelectionRecord["kind"],
  plan: JudicialSelectionPlan,
): void {
  const seat = world.judiciary?.seats[seatId];
  if (!seat || seat.retiredAt !== null || seat.createdAt > world.currentDate)
    throw new Error(`Judicial seat is not active: ${seatId}`);
  const court = courtById(world, seat.courtId);
  if (!court || !court.rules.selectionRecordId)
    throw new Error("Judicial court has no admitted selection profile.");
  if (court.rules.selectionRecordId !== plan.sourceRecordId)
    throw new Error("Judicial selection plan belongs to another court source.");
  if (!plan.pathId || plan.stages.length === 0)
    throw new Error("Judicial selection path must have ordered stages.");
  for (let index = 0; index < plan.stages.length; index += 1) {
    const stage = plan.stages[index]!;
    if (stage.order !== index + 1 || !stage.mechanism)
      throw new Error(
        "Judicial selection stages must be consecutive and named.",
      );
  }
  const resolved = resolveJudicialSelectionPlan(world, seatId, kind);
  if (resolved.state !== "ready") throw new Error(resolved.reason);
  if (JSON.stringify(plan) !== JSON.stringify(resolved.plan))
    throw new Error(
      "Judicial selection plan differs from the admitted projection.",
    );
}

/** Open an attempt without seating anyone or advancing the clock. */
export function openJudicialSelection(
  world: World,
  input: {
    readonly seatId: string;
    readonly kind: JudicialSelectionRecord["kind"];
    readonly plan: JudicialSelectionPlan;
    readonly candidatePersonIds: readonly EntityId[];
  },
): World {
  assertSelectionPlan(world, input.seatId, input.kind, input.plan);
  const seat = world.judiciary!.seats[input.seatId]!;
  const holder = seatHolderAt(world, input.seatId);
  if (input.kind === "renewal" ? !holder : holder)
    throw new Error(
      input.kind === "renewal"
        ? "Judicial renewal requires a sitting judge."
        : "Judicial vacancy selection requires an empty seat.",
    );
  const effective = effectiveCourtRulesAt(world, seat.courtId);
  if (!effective)
    throw new Error("Judicial court has no effective rule record.");
  const previous = world.judiciary!;
  const pending = previous.selections.some((selection) => {
    if (selection.seatId !== input.seatId) return false;
    const stages = judicialSelectionStages(world, selection.recordId);
    const last = stages.at(-1);
    return (
      !last ||
      (last.outcome !== "rejected" &&
        last.outcome !== "lapsed" &&
        !previous.seatTenures.some(
          (tenure) => tenure.selection.selectionRecordId === selection.recordId,
        ))
    );
  });
  if (pending)
    throw new Error("A judicial selection is already pending for this seat.");
  const candidatePersonIds = [...new Set(input.candidatePersonIds)];
  for (const personId of candidatePersonIds) {
    if (!world.people[personId])
      throw new Error(`Unknown judicial candidate: ${personId}`);
    if (
      world.history.personDeaths.some(
        (death) =>
          death.personId === personId && death.diedAt <= world.currentDate,
      )
    )
      throw new Error(`Deceased judicial candidate: ${personId}`);
  }
  const recordId = `judicial-selection:${world.id}:${input.seatId}:${world.currentDate}:${previous.selections.length + 1}`;
  const selection: JudicialSelectionRecord = {
    recordId,
    seatId: input.seatId,
    openedAt: world.currentDate,
    kind: input.kind,
    pathId: input.plan.pathId,
    courtRuleRecordId: effective.recordId,
    candidatePersonIds,
    ballot: null,
  };
  const next = {
    ...world,
    judiciary: {
      ...previous,
      selections: [...previous.selections, selection],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

/** Record one actual stage result, in the admitted path's exact order. */
export function recordJudicialSelectionStage(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly plan: JudicialSelectionPlan;
    readonly occurredAt: IsoDate;
    readonly actorPersonId: EntityId | null;
    readonly candidatePersonId: EntityId | null;
    readonly outcome: JudicialSelectionStageRecord["outcome"];
    readonly decisionRecordId: EntityId | null;
    readonly electionContestId: EntityId | null;
    readonly outcomeEventId: EntityId | null;
  },
): World {
  const selection = judicialSelectionById(world, input.selectionRecordId);
  if (!selection)
    throw new Error(`Unknown judicial selection: ${input.selectionRecordId}`);
  const progress = judicialSelectionProgress(
    world,
    selection.recordId,
    input.plan,
  );
  if (progress.status !== "pending")
    throw new Error("Judicial selection has no next stage.");
  if (
    input.occurredAt < selection.openedAt ||
    input.occurredAt > world.currentDate
  )
    throw new Error(
      "Judicial selection stage date is outside the saved attempt.",
    );
  if (input.actorPersonId && !world.people[input.actorPersonId])
    throw new Error(`Unknown judicial selection actor: ${input.actorPersonId}`);
  if (
    input.candidatePersonId &&
    !selection.candidatePersonIds.includes(input.candidatePersonId)
  )
    throw new Error(
      "Judicial selection stage names a candidate outside its attempt.",
    );
  if (
    !input.decisionRecordId &&
    !input.electionContestId &&
    !input.outcomeEventId
  )
    throw new Error(
      "Judicial selection stage needs a recorded decision, contest, or event.",
    );
  const stage = input.plan.stages[progress.nextOrder - 1]!;
  const outcomeEvent = input.outcomeEventId
    ? world.history.events.find((event) => event.id === input.outcomeEventId)
    : null;
  if (input.outcomeEventId && !outcomeEvent)
    throw new Error("Judicial stage outcome event is not in World history.");
  if (
    input.decisionRecordId &&
    !world.history.decisionTraces.some(
      (row) => row.id === input.decisionRecordId,
    )
  )
    throw new Error("Judicial stage decision trace is not in World history.");
  if (
    input.electionContestId &&
    !world.history.electionContests?.some(
      (row) => row.id === input.electionContestId,
    ) &&
    !world.judiciary?.retentionContests.some(
      (row) => row.recordId === input.electionContestId,
    )
  )
    throw new Error("Judicial stage election contest is not in World history.");
  const approvedRetentionVoters =
    stage.mechanism === "RETENTION_ELECTION" &&
    outcomeEvent?.tags.includes("game-profile:judicial-retention-voters/v1") ===
      true &&
    input.actorPersonId === null;
  const seat = world.judiciary?.seats[selection.seatId];
  const court = seat ? courtById(world, seat.courtId) : null;
  const profile = court?.rules.selectionRecordId
    ? judicialSelectionProfile(court.rules.selectionRecordId)
    : null;
  const approvedSenateRollCall =
    profile?.jurisdictionId === "us-fed" &&
    stage.mechanism === "LEGISLATIVE_CONFIRMATION" &&
    stage.actor.value === "United States Senate" &&
    input.actorPersonId === null &&
    input.candidatePersonId !== null &&
    (input.outcome === "completed" || input.outcome === "rejected") &&
    outcomeEvent?.type === "judicial.senate-result" &&
    outcomeEvent.occurredAt === input.occurredAt &&
    outcomeEvent.tags.includes(`selection:${selection.recordId}`) &&
    outcomeEvent.tags.includes(
      `outcome:${input.outcome === "completed" ? "confirmed" : "rejected"}`,
    ) &&
    outcomeEvent.involvedEntityIds.includes(input.candidatePersonId);
  if (
    stage.actor.state === "KNOWN" &&
    stage.mechanism !== "RETENTION_ELECTION" &&
    !approvedSenateRollCall &&
    !input.actorPersonId
  )
    throw new Error("The named judicial selection actor is not recorded.");
  if (
    profile?.jurisdictionId !== "us-fed" &&
    (stage.mechanism === "EXECUTIVE_APPOINTMENT" ||
      stage.mechanism === "EXECUTIVE_REAPPOINTMENT" ||
      stage.mechanism === "EXECUTIVE_NOMINATION")
  ) {
    const stateUsps = profile?.jurisdictionId.slice(3).toUpperCase();
    const governor = currentStateExecutiveHolders(world).find(
      (holder) => holder.stateUsps === stateUsps,
    );
    if (
      !stateUsps ||
      input.occurredAt !== world.currentDate ||
      !governor ||
      governor.personId !== input.actorPersonId
    )
      throw new Error(
        "The recorded actor is not the sitting state executive for this judicial selection.",
      );
  }
  const contest = input.electionContestId
    ? world.history.electionContests?.find(
        (row) => row.id === input.electionContestId,
      )
    : null;
  const electionResult = contest
    ? electionContestResult(world, contest.id)
    : null;
  const approvedPopularVoters =
    (stage.mechanism === "PARTISAN_GENERAL_ELECTION" ||
      stage.mechanism === "NONPARTISAN_GENERAL_ELECTION") &&
    stage.actor.state === "UNKNOWN" &&
    profile?.geography.state === "KNOWN" &&
    profile.geography.value?.scope === "statewide" &&
    profile.geography.value.districtType === "statewide" &&
    profile.geography.value.notes === "Statewide selection" &&
    typeof court?.jurisdictionId === "string" &&
    contest?.jurisdictionId === court?.jurisdictionId &&
    electionResult?.winnerPersonId === input.candidatePersonId &&
    electionResult?.resolvedAt === input.occurredAt &&
    input.outcome === "completed" &&
    input.candidatePersonId !== null &&
    outcomeEvent?.jurisdictionId === court?.jurisdictionId &&
    outcomeEvent?.occurredAt === electionResult?.resolvedAt &&
    outcomeEvent?.involvedEntityIds.includes(input.candidatePersonId) ===
      true &&
    outcomeEvent?.tags.includes(`contest:${contest?.id}`) === true &&
    outcomeEvent?.tags.includes(
      `game-profile:${JUDICIAL_POPULAR_VOTER_PROFILE}`,
    ) === true &&
    input.actorPersonId === null;
  if (
    (stage.actor.state !== "KNOWN" || !stage.actor.value) &&
    !approvedRetentionVoters &&
    !approvedPopularVoters
  )
    throw new Error(
      "The next judicial selection stage has no established actor.",
    );
  const record: JudicialSelectionStageRecord = {
    recordId: `${selection.recordId}:stage:${progress.nextOrder}`,
    selectionRecordId: selection.recordId,
    order: progress.nextOrder,
    mechanism: stage.mechanism,
    occurredAt: input.occurredAt,
    actorPersonId: input.actorPersonId,
    candidatePersonId: input.candidatePersonId,
    outcome: input.outcome,
    decisionRecordId: input.decisionRecordId,
    electionContestId: input.electionContestId,
    outcomeEventId: input.outcomeEventId,
  };
  const next = {
    ...world,
    judiciary: {
      ...world.judiciary!,
      selectionStages: [...world.judiciary!.selectionStages, record],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function completedStateSelectionPath(
  mechanism: string,
  kind: JudicialSelectionRecord["kind"],
): JudicialSeatSelectionPath | null {
  switch (mechanism) {
    case "EXECUTIVE_APPOINTMENT":
      return "appointment";
    case "LEGISLATIVE_CONFIRMATION":
    case "COUNCIL_CONFIRMATION":
      return kind === "renewal" ? "reappointment" : "appointment";
    case "EXECUTIVE_REAPPOINTMENT":
    case "LEGISLATIVE_REAPPOINTMENT":
      return "reappointment";
    case "PARTISAN_GENERAL_ELECTION":
    case "NONPARTISAN_GENERAL_ELECTION":
      return "popular-election";
    case "LEGISLATIVE_ELECTION":
    case "LEGISLATIVE_REELECTION":
      return "legislative-election";
    case "RETENTION_ELECTION":
    case "LEGISLATIVE_RETENTION":
    case "COMMISSION_RETENTION":
      return "retention";
    default:
      return null;
  }
}

function stateTermEnd(
  startedAt: IsoDate,
  years: number | null,
): IsoDate | null {
  if (years === null) return null;
  if (!Number.isSafeInteger(years) || years <= 0)
    throw new Error("The state judicial term duration is invalid.");
  const nextYear = Number(startedAt.slice(0, 4)) + years;
  const monthDay = startedAt.slice(5);
  return makeIsoDate(
    `${nextYear}-${monthDay === "02-29" ? "02-28" : monthDay}`,
  );
}

/** Seat only an already completed state selection; this creates no candidates or votes. */
export function completeStateJudicialSelection(
  world: World,
  selectionRecordId: string,
): World {
  const selection = judicialSelectionById(world, selectionRecordId);
  if (!selection) throw new Error("No judicial selection attempt matches.");
  const seat = world.judiciary?.seats[selection.seatId];
  const court = seat ? courtById(world, seat.courtId) : null;
  if (!seat || !court || court.level.startsWith("federal-"))
    throw new Error("This is not a state judicial selection.");
  const resolved = resolveJudicialSelectionPlan(
    world,
    selection.seatId,
    selection.kind,
  );
  if (resolved.state !== "ready") throw new Error(resolved.reason);
  if (
    judicialSelectionProgress(world, selectionRecordId, resolved.plan)
      .status !== "stages-completed"
  )
    throw new Error("The state judicial selection is not completed.");
  if (
    world.judiciary!.seatTenures.some(
      (tenure) => tenure.selection.selectionRecordId === selectionRecordId,
    )
  )
    throw new Error("This selection already began a judicial tenure.");
  const stages = judicialSelectionStages(world, selectionRecordId);
  if (
    stages.length !== resolved.plan.stages.length ||
    stages.some((stage) => stage.outcome !== "completed")
  )
    throw new Error("The state judicial selection lacks completed stages.");
  const finalStage = stages.at(-1)!;
  const candidateId = finalStage.candidatePersonId;
  if (!candidateId || !selection.candidatePersonIds.includes(candidateId))
    throw new Error("The completed selection has no recorded candidate.");
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === candidateId && death.diedAt <= world.currentDate,
    )
  )
    throw new Error("The selected candidate died before taking the seat.");
  const path = completedStateSelectionPath(
    finalStage.mechanism,
    selection.kind,
  );
  if (!path)
    throw new Error("This state selection ending has no seating adapter.");
  const effective = effectiveCourtRulesAt(world, court.courtId);
  const years = effective?.rules.termYears;
  if (years?.state !== "known")
    throw new Error("The state judicial term duration is unresolved.");
  const termEndsAt = stateTermEnd(world.currentDate, years.value);
  const previous = [...world.judiciary!.seatTenures]
    .reverse()
    .find((tenure) => tenure.seatId === seat.seatId && tenure.endedAt === null);
  let next = world;
  if (selection.kind === "renewal") {
    if (
      !previous ||
      previous.personId !== candidateId ||
      previous.termEndsAt === null ||
      previous.termEndsAt > world.currentDate
    )
      throw new Error("The incumbent's prior term is not due for renewal.");
    next = vacateJudicialSeat(next, {
      seatId: seat.seatId,
      vacatedAt: world.currentDate,
      reason: "term-expired",
    });
  } else {
    if (seatHolderAt(world, seat.seatId))
      throw new Error("The state judicial seat is already filled.");
    if (previous) {
      const death = world.history.personDeaths.find(
        (row) =>
          row.personId === previous.personId && row.diedAt <= world.currentDate,
      );
      const expired =
        previous.termEndsAt !== null &&
        previous.termEndsAt <= world.currentDate;
      if (!death && !expired)
        throw new Error("The prior judicial tenure has no recorded end cause.");
      const deathFirst =
        death && (!expired || death.diedAt <= previous.termEndsAt!);
      next = vacateJudicialSeat(next, {
        seatId: seat.seatId,
        vacatedAt: deathFirst ? death.diedAt : previous.termEndsAt!,
        reason: deathFirst ? "death" : "term-expired",
      });
    }
    next = releaseJudicialSeatForAppointment(next, candidateId, seat.seatId);
  }
  if (next.judiciary?.seats[seat.seatId]?.retiredAt !== null)
    throw new Error("The state judicial seat was retired before seating.");
  return seatJudge(next, {
    seatId: seat.seatId,
    personId: candidateId,
    startedAt: next.currentDate,
    selection: {
      path,
      selectionRecordId,
      decisionRecordId: finalStage.decisionRecordId,
      selectingPersonId: finalStage.actorPersonId,
      contestId: finalStage.electionContestId,
      note: finalStage.outcomeEventId
        ? `Selection outcome ${finalStage.outcomeEventId}`
        : null,
    },
    termEndsAt,
    retentionDueAt: null,
  });
}

/** A President's explicit nomination records the choice; it does not seat the nominee. */
export function recordFederalJudicialNomination(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly presidentPersonId: EntityId;
    readonly nomineePersonId: EntityId;
  },
): World {
  const selection = judicialSelectionById(world, input.selectionRecordId);
  if (!selection) throw new Error("No judicial selection attempt matches.");
  const seat = world.judiciary?.seats[selection.seatId];
  const court = seat ? courtById(world, seat.courtId) : null;
  if (!court || !court.level.startsWith("federal-"))
    throw new Error("This is not a federal judicial seat.");
  const president = currentPresidentOf(world);
  if (president?.personId !== input.presidentPersonId)
    throw new Error("Only the sitting President can make this nomination.");
  if (!selection.candidatePersonIds.includes(input.nomineePersonId))
    throw new Error("Nominee is outside the recorded candidate pool.");
  const screened = screenFederalJudicialNominee(world, input.nomineePersonId);
  if (screened.state !== "ready") throw new Error(screened.reason);
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
    throw new Error("Judicial nomination is not pending.");
  const stage = resolved.plan.stages[progress.nextOrder - 1]!;
  if (
    stage.mechanism !== "EXECUTIVE_NOMINATION" ||
    stage.actor.value !== "President of the United States"
  )
    throw new Error(
      "The next judicial stage is not a Presidential nomination.",
    );
  const nominee = world.people[input.nomineePersonId];
  const presidentPerson = world.people[input.presidentPersonId];
  if (!nominee || !presidentPerson)
    throw new Error("The President and nominee must be living World people.");
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === nominee.id && death.diedAt <= world.currentDate,
    )
  )
    throw new Error("A deceased person cannot be nominated.");
  const next = recordWorldEvent(world, {
    stableKey: `${selection.recordId}:nomination:${nominee.id}`,
    type: "judicial.nomination",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: court.jurisdictionId,
    involvedEntityIds: [input.presidentPersonId, nominee.id],
    participants: [
      {
        personId: input.presidentPersonId,
        role: "focus:actor",
        detail: "President",
      },
      {
        personId: nominee.id,
        role: "focus:subject",
        detail: "Judicial nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `court:${court.courtId}`,
      `seat:${seat!.seatId}`,
      `selection:${selection.recordId}`,
      "evidence:92l-research-synthesis",
      "primary-citations:not-retrieved",
    ],
    summary: `President ${personName(presidentPerson)} nominated ${personName(nominee)} for ${court.name}. The nomination awaits Senate action.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const nominated = recordJudicialSelectionStage(next, {
    selectionRecordId: selection.recordId,
    plan: resolved.plan,
    occurredAt: next.currentDate,
    actorPersonId: input.presidentPersonId,
    candidatePersonId: nominee.id,
    outcome: "completed",
    decisionRecordId: null,
    electionContestId: null,
    outcomeEventId: next.history.events.at(-1)!.id,
  });
  return scheduleFutureDueItem(nominated, {
    stableKey: `${JUDICIAL_SENATE_REFERRAL_TRANSITION}:${selection.recordId}`,
    dueAt: nextCongressSitting(nominated.currentDate),
    transitionKey: JUDICIAL_SENATE_REFERRAL_TRANSITION,
    entityIds: [nominee.id],
    jurisdictionId: null,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [next.history.events.at(-1)!.id],
    },
  });
}

export type JudicialRetentionThreshold =
  | { readonly kind: "majority"; readonly reportedToken: "50%+1" }
  | {
      readonly kind: "percent";
      readonly percent: 57 | 60;
      readonly reportedToken: "57%_supermajority" | "60%_supermajority";
    };

export function judicialRetentionThreshold(
  world: World,
  seatId: string,
):
  | {
      readonly state: "ready";
      readonly threshold: JudicialRetentionThreshold;
      readonly rule: JudicialRuleField<string>;
    }
  | { readonly state: "unresolved"; readonly reason: string } {
  const resolved = resolveJudicialSelectionPlan(world, seatId, "renewal");
  if (resolved.state !== "ready") return resolved;
  if (
    !resolved.plan.stages.some(
      (stage) => stage.mechanism === "RETENTION_ELECTION",
    )
  )
    return {
      state: "unresolved",
      reason: "This judicial renewal is not a retention election.",
    };
  const profile = judicialSelectionProfile(resolved.plan.sourceRecordId)!;
  const threshold = profile.renewal.value?.threshold;
  if (threshold?.state !== "KNOWN" || !threshold.value)
    return {
      state: "unresolved",
      reason: "The retention approval threshold is unknown.",
    };
  const token = threshold.value;
  const parsed: JudicialRetentionThreshold | null =
    token === "50%+1"
      ? { kind: "majority", reportedToken: token }
      : token === "57%_supermajority"
        ? { kind: "percent", percent: 57, reportedToken: token }
        : token === "60%_supermajority"
          ? { kind: "percent", percent: 60, reportedToken: token }
          : null;
  if (!parsed)
    return {
      state: "unresolved",
      reason: `The reported retention threshold needs a geographic branch or an unimplemented interpretation: ${token}.`,
    };
  return {
    state: "ready",
    threshold: parsed,
    rule: {
      state: "known",
      value: token,
      basis: "sourced",
      referenceId: `${profile.recordId}:92l-research-synthesis`,
    },
  };
}

/** The recorded yes/no count, including a zero-turnout refusal. */
export function judicialRetentionPasses(
  yesVotes: number,
  noVotes: number,
  threshold: JudicialRetentionThreshold,
): boolean {
  if (
    !Number.isSafeInteger(yesVotes) ||
    !Number.isSafeInteger(noVotes) ||
    yesVotes < 0 ||
    noVotes < 0
  )
    throw new Error("Judicial retention votes must be nonnegative integers.");
  const total = yesVotes + noVotes;
  if (total === 0) return false;
  return threshold.kind === "majority"
    ? yesVotes > noVotes
    : yesVotes * 100 >= total * threshold.percent;
}
