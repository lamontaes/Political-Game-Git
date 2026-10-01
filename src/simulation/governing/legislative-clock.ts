import {
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../dates";
import {
  cancelScheduledActivity,
  createScheduledActivity,
  scheduledConflictExists,
  scheduledActivityState,
} from "../time-work";
import { formatStatutoryDate } from "../legislation-content-contracts";
import {
  legislativeProcedureForPack,
  legislativeRulePackForWorld,
  regularSessionYearForWorld,
} from "../legislative-procedure-world";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import { typedTaxEnactmentDate } from "../tax-policy-activation";
import {
  scheduleFutureDueItem,
  futureDueItemStateAt,
} from "../future-transitions";
import {
  attemptVetoOverride,
  availableMeasureSteps,
  COMMITTEE_HEARING_TRANSITION_KEY,
  enrollMeasure,
  measurePosition,
  nextMeasureStableKey,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordAdjournmentDeath,
  recordConcurrenceVote,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  requireMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
  type MeasureStepKey,
  type FloorVoteInput,
} from "../legislation";
import {
  authoredScenarioSeatCount,
  dispositionsFromCounts,
  legislativeBlueprint,
  legislativeScenarioKeysForPlace,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForConcurrence,
  votePlanKeyForFloor,
  votePlanKeyForOverride,
  type LegislativeBlueprint,
  type SeatedBody,
} from "../legislation-scenarios";
import { committeeRoster } from "./committee-assignment";
import {
  chamberQuestionKey,
  MEMBER_BALLOT_LOCATION_KEY,
  memberBallotOn,
  recordMemberBallot,
  type ChamberQuestion,
  type MemberBallot,
} from "./member-ballots";
import { offerPlannedAmendment } from "./amendment-authors";
import {
  amendmentAdmissible,
  floorStageTakesAmendments,
} from "./chamber-procedure";
import { decideChamberVote, seatedChamberForPack } from "./chamber-votes";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";
import {
  adjournmentStopsPhase,
  considerSessionAdjournment,
  measureSessionYear,
} from "./leaders-adjourn";
import { sessionClosesOn } from "./session-adjournments";
import {
  congressBlueprint,
  congressReferralCommittee,
  isCongressMeasure,
  scheduleCongressSitting,
} from "./congress-chambers";
import { chamberByKey, floorStageByKey } from "../legislature-rules";
import type { LegislativeRulePack } from "../legislature-rules";
import { personName } from "../people";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeQuestionIdentity,
  LegislativeVoteDisposition,
  World,
} from "../types";
import { hasStableKey, recordByStableKey } from "../history-index";

/**
 * LEGISLATIVE CLOCK — the institution acts while the player is elsewhere.
 *
 * A bill's sponsor office moves its own chamber's requests. Everything that
 * belongs to somebody else — the other chamber's committee and floor, the
 * clerks, the governor — happens on the canonical clock through the same
 * legislative writers, using only decisions the World already records for
 * that bill. Where a question has no recorded member decisions, the step is
 * blocked with that reason; no tally is invented. After a session's sourced
 * outer limit, nothing moves: whether the bill carries over is not
 * established, so it is neither advanced nor declared dead. A veto returned
 * after the close is the exception: it waits for the legislature's next
 * sitting and is reconsidered then.
 */

export const LEGISLATIVE_CLOCK_VERSION = "legislative-clock/v1";
export const LEGISLATIVE_INSTITUTION_STEP =
  "legislature:institution-step" as const;

/**
 * PROVISIONAL, and awaiting SOURCED RULES rather than anyone's sign-off.
 * lamontae declined to confirm these as game numbers on 2026-09-22 — "defer to
 * realistic rules", "no hardcoding" — so the question is what actually governs
 * the interval between steps and where it varies, filed as
 * legislative-step-pacing-and-veto-override. A better constant does not settle
 * it; a rule the code can read per jurisdiction does.
 */
export const LEGISLATIVE_CADENCE_PROFILE = {
  id: "ocd-legislative-cadence/v1",
  /** Days between one institutional step and the next. */
  daysBetweenSteps: 3,
  /** Days from referral to a scheduled committee hearing. */
  daysToHearing: 7,
} as const;

export type MeasureStepOwner = "sponsor-office" | "institution" | "executive";

/** Who takes the measure's next step, given the chamber the sponsor sits in. */
export function measureStepOwner(
  world: World,
  measureId: EntityId,
  sponsorChamberKey: string,
): MeasureStepOwner | null {
  const position = measurePosition(world, measureId);
  const measure = requireMeasure(world, measureId);
  // In a saved state profile, seated members decide collective questions on
  // the clock. A sponsor can move the bill onto that calendar but cannot cast
  // the chamber's vote through a fixed authored scenario.
  const recordedMemberDecision =
    legislativeProcedureForPack(world, measure.rulePackId) !== null ||
    isCongressMeasure(measure);
  switch (position.phase) {
    case "awaiting-referral":
    case "awaiting-floor":
      return position.chamberKey === sponsorChamberKey
        ? "sponsor-office"
        : "institution";
    case "in-committee":
    case "on-floor":
    case "awaiting-concurrence":
      return recordedMemberDecision || position.chamberKey !== sponsorChamberKey
        ? "institution"
        : "sponsor-office";
    case "awaiting-transmittal":
    case "awaiting-enrollment":
    case "awaiting-presentation":
    case "awaiting-enactment":
      return "institution";
    case "awaiting-executive":
      return "executive";
    case "awaiting-override":
      return recordedMemberDecision ? "institution" : "sponsor-office";
    default:
      return null;
  }
}

/**
 * Whether the controlled character's office carries this bill: they sponsor
 * it, or their legislative office opened it. Every other bill is moved
 * entirely by its (non-player) sponsor and the institution.
 */
export function playerOfficeHoldsMeasure(
  world: World,
  measure: LegislativeMeasureRecord,
): boolean {
  if (world.control.kind !== "person") return false;
  if (measure.sponsorPersonId === world.control.personId) return true;
  return measure.stableKey.startsWith("legislative-work:");
}

function effectiveOwner(
  world: World,
  measure: LegislativeMeasureRecord,
): MeasureStepOwner | null {
  const owner = measureStepOwner(world, measure.id, measure.originChamberKey);
  if (owner === "sponsor-office" && !playerOfficeHoldsMeasure(world, measure))
    // A non-player sponsor's requests go through on the clock. A veto
    // override is put to the members where the legislature is seated with
    // real people, so the result is their decisions against the state's own
    // override rule; with no seated members there is nobody to decide it.
    return measurePosition(world, measure.id).phase === "awaiting-override"
      ? isSeatedChamber(world, legislativeBlueprintForMeasure(world, measure))
        ? "institution"
        : null
      : "institution";
  return owner;
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

function sessionYear(world: World, measureId: EntityId): number {
  return measureSessionYear(world, measureId);
}

/**
 * The day the session ended or will end: the day its leaders adjourned it
 * (`leaders-adjourn.ts`), else its legal limit. That is the current session
 * for a carried bill, or the introducing session for a bill that cannot
 * carry over. After it, nothing moves on this measure.
 */
export function measureSessionClosedOn(
  world: World,
  measure: LegislativeMeasureRecord,
  pack: LegislativeRulePack,
): IsoDate | null {
  const starting = legislativeProcedureForPack(world, measure.rulePackId);
  let year = starting?.measuresCarryOver
    ? Number(world.currentDate.slice(0, 4))
    : sessionYear(world, measure.id);
  if (
    starting?.measuresCarryOver &&
    !regularSessionYearForWorld(world, measure.jurisdictionId, year)
  ) {
    year -= 1;
  }
  return sessionClosesOn(world, pack, year);
}

export { adjournmentStopsPhase };

export function measureSessionIsClosed(
  world: World,
  measureId: EntityId,
): { readonly closed: boolean; readonly closedOn: IsoDate | null } {
  if (!adjournmentStopsPhase(measurePosition(world, measureId).phase)) {
    return { closed: false, closedOn: null };
  }
  const measure = requireMeasure(world, measureId);
  const pack = legislativeBlueprintForMeasure(world, measure).pack;
  const closedOn = measureSessionClosedOn(world, measure, pack);
  return {
    closed: closedOn !== null && world.currentDate > closedOn,
    closedOn,
  };
}

/**
 * A veto returned after the session closed is reconsidered when the same
 * legislature next sits (Alaska Const. art. II, § 16 is one such rule),
 * unless its rules say pending bills die at adjournment. The legislature has
 * sat again once it takes up a bill introduced after the close.
 *
 * GAME ASSUMPTION: the record does not say when one legislature ends and the
 * next begins, so a veto after a legislature's last session also waits for
 * the next sitting rather than standing.
 */
function vetoWaitsForNextSitting(
  world: World,
  measure: LegislativeMeasureRecord,
  phase: string,
): boolean {
  if (phase !== "awaiting-override") return false;
  const dies = legislativeBlueprintForMeasure(world, measure).pack.session
    .measuresDieAtAdjournment;
  return !(dies.kind === "known" && dies.value);
}

/**
 * Whether the measure's legislature has taken up a bill introduced after
 * `closedOn`: the first sign, in the record, that it is sitting again.
 */
function maxIsoDate(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

function legislatureSatSince(
  world: World,
  measure: LegislativeMeasureRecord,
  closedOn: IsoDate,
): boolean {
  return (world.history.legislativeMeasures ?? []).some(
    (candidate) =>
      candidate.rulePackId === measure.rulePackId &&
      candidate.introducedAt > closedOn &&
      candidate.introducedAt <= world.currentDate,
  );
}

/* ------------------------------------------------------------------ *
 * Procedure context, rebuilt from the measure
 * ------------------------------------------------------------------ */

/** The scenario key a production measure was opened under. */
function scenarioKeyForMeasure(
  measure: LegislativeMeasureRecord,
): string | null {
  const match = /^legislative-work:(.+?):measure(?::\d+)?$/.exec(
    measure.stableKey,
  );
  return match ? match[1]! : null;
}

/**
 * The authored content the measure carries: the written measure whose title
 * it bears, or the legislature's own institutional blueprint.
 */
export function legislativeBlueprintForMeasure(
  world: World,
  measure: LegislativeMeasureRecord,
): LegislativeBlueprint {
  if (isCongressMeasure(measure)) return congressBlueprint(world);
  const pack = legislativeRulePackForWorld(world, measure.rulePackId);
  const eligible = legislativeScenarioKeysForPlace(measure.jurisdictionId);
  const authored = eligible.find(
    (key) => legislativeBlueprint(key).shortTitle === measure.shortTitle,
  );
  if (authored) return { ...legislativeBlueprint(authored), pack };
  const key = scenarioKeyForMeasure(measure);
  return {
    ...legislativeBlueprint(key ?? `institution:${measure.rulePackId}`),
    pack,
  };
}

function bodiesForMeasure(
  world: World,
  measure: LegislativeMeasureRecord,
  blueprint: LegislativeBlueprint,
): readonly SeatedBody[] {
  // A legislature seated with real people is the chamber, whatever story the
  // bill came from.
  const seated = blueprint.pack.chambers.map((chamber) =>
    seatedChamberForPack(
      world,
      blueprint.pack.packId,
      chamber.chamberKey,
      chamber.name,
    ),
  );
  if (seated.every((chamber) => chamber !== null))
    return seated.map((chamber) => chamber!.body);
  // An institutional legislature has no recorded roster; its votes stay
  // blocked rather than borrowing a story roster.
  if (blueprint.scenarioKey.startsWith("institution:")) return [];
  return blueprint.pack.chambers.map((chamber) => {
    const sponsor = measure.sponsorPersonId
      ? world.people[measure.sponsorPersonId]
      : undefined;
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
      chamber.chamberKey === measure.originChamberKey && sponsor
        ? [{ personId: sponsor.id, name: personName(sponsor) }]
        : [],
      blueprint.nonpartisan,
    );
  });
}

/* ------------------------------------------------------------------ *
 * Institutional steps
 * ------------------------------------------------------------------ */

export type InstitutionStepResult =
  | {
      readonly kind: "applied";
      readonly world: World;
      readonly step: MeasureStepKey;
    }
  | {
      readonly kind: "wait-until";
      readonly date: IsoDate;
      readonly world?: World;
    }
  | { readonly kind: "blocked"; readonly reason: string }
  | { readonly kind: "ended"; readonly world: World }
  | { readonly kind: "executive"; readonly world: World }
  | { readonly kind: "idle" };

/** A seam the governing matter system fills: what the governor does. */
export type ExecutiveDeskHandler = (
  world: World,
  measure: LegislativeMeasureRecord,
  blueprint: LegislativeBlueprint,
) => World;

function votes(
  blueprint: LegislativeBlueprint,
  members: SeatedBody["members"],
  question: string,
) {
  const plan = blueprint.votePlan[question];
  return plan ? dispositionsFromCounts(members, plan) : null;
}

/**
 * The members' own decisions where the chamber is seated with real people,
 * and the authored counts otherwise. Nobody seated is voted for by a count.
 */
function decide(
  world: World,
  blueprint: LegislativeBlueprint,
  members: SeatedBody["members"],
  planKey: string,
  question: Omit<
    LegislativeQuestionIdentity,
    "amendmentStableKey" | "provisionKey"
  >,
  stableKey: string,
  contested?: boolean,
) {
  const seated = members.length > 0 && members.every((m) => m.personId);
  if (!seated || !isSeatedChamber(world, blueprint)) {
    const authored = votes(blueprint, members, planKey);
    return authored
      ? { dispositions: authored, method: "authored-fixture" as const }
      : null;
  }
  return {
    dispositions: decideChamberVote(world, {
      stableKey,
      question: {
        question: { ...question, amendmentStableKey: null, provisionKey: null },
        questionLabel: planKey,
      },
      members,
      // The player is never voted for: a player sitting in this chamber who
      // has not decided their ballot is recorded absent, not decided for.
      playerPersonId:
        world.control.kind === "person" ? world.control.personId : null,
      playerBallot:
        world.control.kind === "person"
          ? memberBallotOn(world, world.control.personId, question)
          : null,
      ...(contested === undefined ? {} : { contested }),
      nonpartisan: blueprint.nonpartisan,
    }),
    method: "member-decisions" as const,
  };
}

function isSeatedChamber(world: World, blueprint: LegislativeBlueprint) {
  return blueprint.pack.chambers.every(
    (chamber) =>
      seatedChamberForPack(
        world,
        blueprint.pack.packId,
        chamber.chamberKey,
        chamber.name,
      ) !== null,
  );
}

/** Members who took part: everyone recorded, less those recorded absent. */
function present(dispositions: readonly LegislativeVoteDisposition[]) {
  return dispositions.filter(
    (entry) =>
      entry.disposition !== "absent" && entry.disposition !== "excused",
  ).length;
}

function provenance(
  note: string,
  method: "authored-fixture" | "member-decisions" = "authored-fixture",
) {
  return {
    method,
    note,
    sourceEntityIds: [],
  };
}

/** An existing decision writer may pass its recorded roll call to the driver. */
export interface InstitutionStepInput {
  readonly recordedFloorVote?: FloorVoteInput & {
    /** Actual dated seats read by the caller; the driver never invents members. */
    readonly seatedMemberPersonIds: readonly EntityId[];
  };
}

/** The shared floor writer, whether decisions arrived or were read by the driver. */
function applyInstitutionFloorVote(
  world: World,
  input: FloorVoteInput,
  seatedMemberPersonIds: readonly EntityId[] | null,
): InstitutionStepResult {
  if (measurePosition(world, input.measureId).phase !== "on-floor")
    return { kind: "idle" };
  if (seatedMemberPersonIds) {
    const seats = new Set(seatedMemberPersonIds);
    if (seats.size === 0)
      return {
        kind: "blocked",
        reason: "No seated members can decide this floor question.",
      };
    const voters = new Set<EntityId>();
    for (const disposition of input.dispositions) {
      if (!disposition.personId || !seats.has(disposition.personId))
        return {
          kind: "blocked",
          reason: "This recorded decision is not a vote of the seated body.",
        };
      if (voters.has(disposition.personId))
        return {
          kind: "blocked",
          reason: "A member cannot vote twice on one floor question.",
        };
      voters.add(disposition.personId);
    }
  }
  try {
    return {
      kind: "applied",
      step: "move-floor-vote",
      world: takeFloorVote(world, input),
    };
  } catch (error) {
    return {
      kind: "blocked",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Applies the institution's next step to one measure, if it has one. */
export function applyInstitutionStep(
  before: World,
  measureId: EntityId,
  onExecutiveDesk: ExecutiveDeskHandler,
  input: InstitutionStepInput = {},
): InstitutionStepResult {
  const measure = requireMeasure(before, measureId);
  if (input.recordedFloorVote) {
    if (input.recordedFloorVote.measureId !== measureId)
      return {
        kind: "blocked",
        reason: "The recorded floor vote belongs to another measure.",
      };
    return applyInstitutionFloorVote(
      before,
      input.recordedFloorVote,
      input.recordedFloorVote.seatedMemberPersonIds,
    );
  }
  const blueprint = legislativeBlueprintForMeasure(before, measure);
  const bodies = bodiesForMeasure(before, measure, blueprint);
  // Every seated member who may vote on the bill holds principles of their
  // own before any question is put, Congress's members included: without
  // them a member had only a party cue, and every roll call was unanimous.
  const world = closeLapsedVoteNotices(
    ensureOfficeholderPrinciples(
      before,
      bodies.flatMap((body) =>
        body.members.flatMap((member) =>
          member.personId ? [member.personId] : [],
        ),
      ),
    ),
    measureId,
  );
  // Drawing principles and closing notices change neither the rule pack nor
  // the seated roster. Reuse the roster already read for this same step.
  const pack = blueprint.pack;
  const owner = effectiveOwner(world, measure);
  if (owner === null || owner === "sponsor-office") return { kind: "idle" };
  const position = measurePosition(world, measureId);
  const session = measureSessionIsClosed(world, measureId);
  const phase = position.phase;
  const reconsidersVetoLater =
    session.closed && vetoWaitsForNextSitting(world, measure, phase);
  if (
    reconsidersVetoLater &&
    !legislatureSatSince(world, measure, session.closedOn!)
  )
    // A closed session's legislature sits again in a later year at the
    // soonest; from then, it checks on its ordinary cadence.
    return {
      kind: "wait-until",
      date: maxIsoDate(
        makeIsoDate(`${Number(session.closedOn!.slice(0, 4)) + 1}-01-01`),
        addDays(
          world.currentDate,
          LEGISLATIVE_CADENCE_PROFILE.daysBetweenSteps,
        ),
      ),
    };
  const closed = session.closed && !reconsidersVetoLater;
  const dies = pack.session.measuresDieAtAdjournment;
  // Where the rules say a pending bill dies when the session adjourns, one
  // still before the legislature dies; that is how most bills end.
  if (closed && owner !== "executive" && dies.kind === "known" && dies.value)
    return {
      kind: "ended",
      world: recordAdjournmentDeath(world, {
        stableKey: nextMeasureStableKey(
          world,
          measureId,
          `measure:${measureId}:died-on-adjournment`,
        ),
        measureId,
      }),
    };
  if (closed)
    return {
      kind: "blocked",
      reason: legislativeProcedureForPack(world, measure.rulePackId)
        ?.measuresCarryOver
        ? `The regular session ended on ${session.closedOn}; the bill remains pending for the next regular session.`
        : `The session ended on ${session.closedOn}; whether this bill carries over is not established, so nothing more happens to it.`,
    };
  if (owner === "executive")
    return {
      kind: "executive",
      world: onExecutiveDesk(world, measure, blueprint),
    };

  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const steps = availableMeasureSteps(world, measureId);
  const key = (prefix: string) =>
    nextMeasureStableKey(world, measureId, `measure:${measureId}:${prefix}`);
  const body = bodies.find((entry) => entry.chamberKey === chamberKey);
  const applied = (
    next: World,
    step: MeasureStepKey,
  ): InstitutionStepResult => ({
    kind: "applied",
    world: next,
    step,
  });

  if (
    steps.includes("await-next-legislative-day") &&
    position.earliestNextFloorDate
  )
    return { kind: "wait-until", date: position.earliestNextFloorDate };
  if (steps.includes("request-committee-hearing")) {
    const pending = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
        item.entityIds.includes(measureId) &&
        futureDueItemStateAt(world, item.id, {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        })?.status === "scheduled",
    );
    const hearingDate =
      pending?.dueAt ??
      addDays(world.currentDate, LEGISLATIVE_CADENCE_PROFILE.daysToHearing);
    const closedOn = measureSessionClosedOn(world, measure, pack);
    if (closedOn && hearingDate > closedOn) {
      // A hearing cannot occur after adjournment. Let the next clock tick
      // settle a dying bill or carry a pending one into the next session.
      return { kind: "wait-until", date: addDays(closedOn, 1) };
    }
    // The committee reports only after it has heard the bill: resume the day
    // after the hearing.
    return {
      kind: "wait-until",
      date: addDays(hearingDate, 1),
      world: pending
        ? world
        : scheduleCommitteeHearing(world, {
            stableKey: key(`hearing:${chamberKey}`),
            measureId,
            hearingDate,
          }),
    };
  }
  if (steps.includes("request-referral")) {
    // A Congress bill goes to the committee for its policy field; any other
    // bill to the chamber's first compiled committee.
    const referredKey = congressReferralCommittee(world, measure, chamberKey);
    const committee =
      chamber.committees.find((entry) => entry.committeeKey === referredKey) ??
      chamber.committees[0];
    if (!committee)
      return {
        kind: "blocked",
        reason: `The ${chamber.name}'s committees are not compiled, so no referral is made.`,
      };
    return applied(
      referMeasure(world, {
        stableKey: key(`refer:${chamberKey}`),
        measureId,
        committeeKey: committee.committeeKey,
      }),
      "request-referral",
    );
  }
  if (steps.includes("move-committee-report")) {
    const committee = chamber.committees.find(
      (entry) => entry.committeeKey === position.committeeKey,
    );
    const stableKey = key(`committee:${chamberKey}`);
    const decided =
      committee && body
        ? decide(
            world,
            blueprint,
            // The committee's own roster, not whoever happens to be listed
            // first in the chamber.
            committeeRoster(
              body,
              chamber.committees,
              committee.committeeKey,
              `${pack.packId}:${chamberKey}`,
            ),
            votePlanKeyForCommittee(committee.committeeKey),
            {
              measureId,
              purpose: "committee-report",
              forumKey: committee.committeeKey,
              floorStageKey: null,
            },
            stableKey,
          )
        : null;
    if (!committee || !decided)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} committee has no recorded member decisions on this bill.`,
      };
    return applied(
      recordCommitteeDisposition(world, {
        stableKey,
        measureId,
        recommendation: "favorable",
        dispositions: decided.dispositions,
        rationale:
          "The committee weighed the testimony it heard and voted on reporting the bill.",
        provenance: provenance(
          "Committee members' recorded decisions for this bill.",
          decided.method,
        ),
      }),
      "move-committee-report",
    );
  }
  if (steps.includes("request-calendar-placement"))
    return applied(
      placeMeasureOnCalendar(world, {
        stableKey: key(`calendar:${chamberKey}`),
        measureId,
      }),
      "request-calendar-placement",
    );
  if (steps.includes("move-floor-vote")) {
    const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
    const stableKey = key(`floor:${chamberKey}:${stage.stageKey}`);
    // Before the question is put, a member may offer an amendment for their
    // own reasons, where this stage takes amendments and the chamber is
    // seated with people who have reasons (Build 25 step 3).
    const onFloor =
      body &&
      body.members.length > 0 &&
      body.members.every((member) => member.personId) &&
      isSeatedChamber(world, blueprint) &&
      floorStageTakesAmendments(chamber, stage)
        ? offerPlannedAmendment(world, {
            measureId,
            chamber,
            stage,
            members: body.members,
            stableKey,
            nonpartisan: blueprint.nonpartisan,
            // Only what the chamber's rules put in order, as they stand now.
            admissible: (bill, part) =>
              amendmentAdmissible(world, blueprint.pack, chamberKey, bill, part)
                .admissible,
          })
        : world;
    const decided = body
      ? decide(
          onFloor,
          blueprint,
          body.members,
          votePlanKeyForFloor(chamberKey, stage.stageKey),
          {
            measureId,
            purpose: "floor-stage",
            forumKey: chamberKey,
            floorStageKey: stage.stageKey,
          },
          stableKey,
          // PLACEHOLDER until research question how-congress-moves-bills is
          // answered: a Senate cloture vote divides by party, so a bill with
          // backers from only one party needs sixty of that party to get past
          // a filibuster.
          isCongressMeasure(measure) && stage.stageKey === "cloture"
            ? true
            : undefined,
        )
      : null;
    if (!body || !decided)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} has no recorded member decisions on this question.`,
      };
    return applyInstitutionFloorVote(
      onFloor,
      {
        stableKey,
        measureId,
        dispositions: decided.dispositions,
        presentMembers:
          decided.method === "member-decisions"
            ? present(decided.dispositions)
            : body.members.length,
        electedMembers: body.members.length,
        provenance: provenance(
          "Members' recorded decisions on this question.",
          decided.method,
        ),
      },
      body.members.every((member) => member.personId !== null)
        ? body.members.map((member) => member.personId!)
        : null,
    );
  }

  if (steps.includes("move-veto-override")) {
    // Every returned bill is reconsidered: whether leadership would bring a
    // given override up at all is not modeled, and the members' own votes
    // against the state's threshold decide it (DEPTH2 A09: an override is
    // member decisions checked against the correct voting rule, not a roll).
    const override = pack.executive.override;
    if (override.kind === "not-applicable" || bodies.length === 0)
      return {
        kind: "blocked",
        reason: `The legislature has no seated members to reconsider the veto.`,
      };
    const stableKey = key("override");
    const question = (forumKey: string) => ({
      measureId,
      purpose: "veto-override" as const,
      forumKey,
      floorStageKey: null,
    });
    const forums =
      override.kind === "joint-session"
        ? (() => {
            const members = bodies.flatMap((entry) => entry.members);
            const decided = decide(
              world,
              blueprint,
              members,
              votePlanKeyForOverride("joint"),
              question("joint"),
              `${stableKey}:joint`,
            );
            return decided
              ? [
                  {
                    forumKey: "joint",
                    dispositions: decided.dispositions,
                    presentMembers: present(decided.dispositions),
                    electedMembers: members.length,
                  },
                ]
              : null;
          })()
        : pack.chamberOrder.map((forumKey) => {
            const forumBody = bodies.find(
              (entry) => entry.chamberKey === forumKey,
            );
            const decided = forumBody
              ? decide(
                  world,
                  blueprint,
                  forumBody.members,
                  votePlanKeyForOverride(forumKey),
                  question(forumKey),
                  `${stableKey}:${forumKey}`,
                )
              : null;
            return decided && forumBody
              ? {
                  forumKey,
                  dispositions: decided.dispositions,
                  presentMembers: present(decided.dispositions),
                  electedMembers: forumBody.members.length,
                }
              : null;
          });
    if (!forums || forums.some((forum) => forum === null))
      return {
        kind: "blocked",
        reason:
          "The legislature has no recorded member decisions on the override.",
      };
    return applied(
      attemptVetoOverride(world, {
        stableKey,
        measureId,
        forums: forums.map((forum) => forum!),
        rationale: "The legislature reconsidered the vetoed bill.",
        provenance: provenance(
          "Members' recorded decisions on overriding the veto.",
          "member-decisions",
        ),
      }),
      "move-veto-override",
    );
  }
  if (steps.includes("move-concurrence")) {
    const stableKey = key(`concurrence:${chamberKey}`);
    const decided = body
      ? decide(
          world,
          blueprint,
          body.members,
          votePlanKeyForConcurrence(chamberKey),
          {
            measureId,
            purpose: "concurrence",
            forumKey: chamberKey,
            floorStageKey: null,
          },
          stableKey,
        )
      : null;
    if (!body || !decided)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} has no recorded member decisions on the other chamber's changes.`,
      };
    return applied(
      recordConcurrenceVote(world, {
        stableKey,
        measureId,
        dispositions: decided.dispositions,
        presentMembers:
          decided.method === "member-decisions"
            ? present(decided.dispositions)
            : body.members.length,
        electedMembers: body.members.length,
        provenance: provenance(
          "Members' recorded decisions on accepting the other chamber's changes.",
          decided.method,
        ),
      }),
      "move-concurrence",
    );
  }
  if (steps.includes("transmit-to-second-chamber"))
    return applied(
      transmitMeasure(world, { stableKey: key("transmit"), measureId }),
      "transmit-to-second-chamber",
    );
  if (steps.includes("request-enrollment"))
    return applied(
      enrollMeasure(world, { stableKey: key("enroll"), measureId }),
      "request-enrollment",
    );
  if (steps.includes("present-to-executive"))
    return applied(
      presentMeasureToExecutive(world, {
        stableKey: key("present"),
        measureId,
      }),
      "present-to-executive",
    );
  if (steps.includes("record-enactment")) {
    const typedTaxDate = typedTaxEnactmentDate(world, measureId);
    return applied(
      // Enactment is also where the law changes what it governs: an
      // appropriation becomes spending authority the executive can commit, a
      // levy becomes a tax policy. A measure without either writes nothing.
      applyEnactedLawEffects(
        recordEnactment(world, {
          stableKey: key("enactment"),
          measureId,
          // A federal law takes effect on the day it is enacted unless it
          // says otherwise (the Congress pack's enactment rule), and no
          // Congress bill here says otherwise.
          ...(isCongressMeasure(measure)
            ? { effectiveAt: world.currentDate }
            : typedTaxDate
              ? { effectiveAt: typedTaxDate }
              : {}),
        }),
        measureId,
      ),
      "record-enactment",
    );
  }
  return { kind: "idle" };
}

/** Records the governor's decision on a bound bill through the legislative writer. */
export function recordGovernorDecisionOnMeasure(
  world: World,
  measureId: EntityId,
  action: "signed" | "vetoed",
  rationale: string,
  actorPersonId?: EntityId,
): World {
  if (measurePosition(world, measureId).phase !== "awaiting-executive")
    return world;
  return recordExecutiveAction(world, {
    ...(actorPersonId !== undefined ? { actorPersonId } : {}),
    stableKey: nextMeasureStableKey(
      world,
      measureId,
      `measure:${measureId}:governor`,
    ),
    measureId,
    action,
    rationale,
  });
}

/* ------------------------------------------------------------------ *
 * Scheduling
 * ------------------------------------------------------------------ */

function pendingInstitutionStep(
  world: World,
  measureId: EntityId,
  excludeDueItemId: EntityId | null,
): boolean {
  return world.history.futureDueItems.some(
    (item) =>
      item.id !== excludeDueItemId &&
      item.transitionKey === LEGISLATIVE_INSTITUTION_STEP &&
      item.entityIds.includes(measureId) &&
      futureDueItemStateAt(world, item.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled",
  );
}

/** A game-clock work day, not a claim about when a legislature convenes. */
function nextRegularBillWorkDay(
  world: World,
  jurisdictionId: EntityId,
): IsoDate {
  const currentYear = Number(world.currentDate.slice(0, 4));
  for (let year = currentYear; year <= currentYear + 4; year += 1) {
    if (!regularSessionYearForWorld(world, jurisdictionId, year)) continue;
    const day = makeIsoDate(`${year}-02-15`);
    if (day > world.currentDate) return day;
  }
  throw new Error("No next regular bill work day was found.");
}

/**
 * Puts the institution's next step for a measure on the calendar, when the
 * next step is not the sponsor office's. Safe to call after any action.
 */
export function scheduleInstitutionStep(
  world: World,
  measureId: EntityId,
  on?: IsoDate,
  excludeDueItemId: EntityId | null = null,
): World {
  const measure = requireMeasure(world, measureId);
  if (measurePosition(world, measureId).outcome !== null) return world;
  const owner = effectiveOwner(world, measure);
  if (owner === null || owner === "sponsor-office") return world;
  // Congress's bills move together at its sittings, not on dates of their own.
  if (isCongressMeasure(measure))
    return measureSessionIsClosed(world, measureId).closed
      ? world
      : scheduleCongressSitting(world);
  if (pendingInstitutionStep(world, measureId, excludeDueItemId)) return world;
  const sessionClosed = measureSessionIsClosed(world, measureId).closed;
  const starting = legislativeProcedureForPack(world, measure.rulePackId);
  if (
    sessionClosed &&
    !starting?.measuresCarryOver &&
    !vetoWaitsForNextSitting(
      world,
      measure,
      measurePosition(world, measureId).phase,
    )
  )
    return world;
  const dueAt = sessionClosed
    ? nextRegularBillWorkDay(world, measure.jurisdictionId)
    : on && on > world.currentDate
      ? on
      : addDays(
          world.currentDate,
          LEGISLATIVE_CADENCE_PROFILE.daysBetweenSteps,
        );
  const scheduled = scheduleFutureDueItem(world, {
    stableKey: `${LEGISLATIVE_CLOCK_VERSION}:${measureId}:${world.history.nextSequence}`,
    dueAt,
    transitionKey: LEGISLATIVE_INSTITUTION_STEP,
    entityIds: [measureId],
    jurisdictionId: measure.jurisdictionId,
    provenance: {
      kind: "authored",
      note: `${LEGISLATIVE_CADENCE_PROFILE.id}: the institution takes its next step on this bill.`,
    },
  });
  return noticeMemberVote(scheduled, measureId, dueAt);
}

/** Builds the due handler around the governing system's executive seam. */
export function createInstitutionStepHandler(
  onExecutiveDesk: ExecutiveDeskHandler,
) {
  return (world: World, due: FutureDueItem): FutureTransitionHandlerResult => {
    const measureId = due.entityIds[0];
    const done = (
      next: World,
      context: string,
    ): FutureTransitionHandlerResult => ({
      world: next,
      status: "resolved",
      reasonKey: null,
      context,
      outcomeEventId: null,
    });
    if (
      !measureId ||
      !world.history.legislativeMeasures?.some((m) => m.id === measureId)
    )
      return done(world, "No measure stands behind this step.");
    if (measurePosition(world, measureId).outcome !== null)
      return done(world, "This measure already has a recorded outcome.");
    const result = applyInstitutionStep(world, measureId, onExecutiveDesk);
    switch (result.kind) {
      case "idle":
        return done(world, "Nothing for the institution to do.");
      case "blocked":
        if (
          legislativeProcedureForPack(
            world,
            requireMeasure(world, measureId).rulePackId,
          )?.measuresCarryOver &&
          measureSessionIsClosed(world, measureId).closed
        ) {
          return done(
            scheduleInstitutionStep(world, measureId, undefined, due.id),
            result.reason,
          );
        }
        return {
          world,
          status: "blocked",
          reasonKey: "legislature:institution-step-blocked",
          context: result.reason,
          outcomeEventId: null,
        };
      case "wait-until":
        return done(
          scheduleInstitutionStep(
            result.world ?? world,
            measureId,
            result.date,
            due.id,
          ),
          "The chamber waits for its next scheduled business on this bill.",
        );
      case "ended":
        return done(
          considerSessionAdjournment(result.world, measureId),
          "The bill died when the session adjourned.",
        );
      case "executive":
        // An executive who decides on the day puts the bill back in the
        // institution's hands; this step is still the one running, so it is
        // excluded or the next step would never be scheduled.
        return done(
          scheduleInstitutionStep(
            considerSessionAdjournment(result.world, measureId),
            measureId,
            undefined,
            due.id,
          ),
          "The bill is on the executive's desk.",
        );
      case "applied":
        return done(
          scheduleInstitutionStep(
            considerSessionAdjournment(result.world, measureId),
            measureId,
            undefined,
            due.id,
          ),
          `The institution took the step ${result.step}.`,
        );
    }
  };
}

/* ------------------------------------------------------------------ *
 * A seated player's own votes
 * ------------------------------------------------------------------ */

/** One body that will answer the measure's next question, and who sits in it. */
export interface ChamberQuestionForum {
  readonly question: ChamberQuestion;
  readonly forumName: string;
  readonly members: SeatedBody["members"];
}

/**
 * The question the seated chamber will put on this measure at its next step,
 * whether the institution's clock or the sponsor's office moves that step,
 * as it stands on `onDate`.
 *
 * Mirrors the step handler's choice of voters: the committee's own roster, the
 * chamber on a floor stage or a concurrence, and every chamber (or the joint
 * session) on a veto override. A step put to no seated members has no question
 * here.
 */
export function pendingChamberQuestions(
  world: World,
  measureId: EntityId,
  onDate: IsoDate = world.currentDate,
): readonly ChamberQuestionForum[] {
  const measure = requireMeasure(world, measureId);
  // A council's ordinances are voted at its own meetings (the council
  // procedures in municipal-ordinance-procedure.ts and
  // living-world/local-council-meetings.ts), never by this clock.
  if (measure.originChamberKey === "council") return [];
  const owner = effectiveOwner(world, measure);
  if (owner !== "institution" && owner !== "sponsor-office") return [];
  const blueprint = legislativeBlueprintForMeasure(world, measure);
  if (!isSeatedChamber(world, blueprint)) return [];
  const pack = blueprint.pack;
  const position = measurePosition(world, measureId);
  const steps = availableMeasureSteps(world, measureId);
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const floorReady =
    steps.includes("move-floor-vote") ||
    (steps.includes("await-next-legislative-day") &&
      position.earliestNextFloorDate !== null &&
      position.earliestNextFloorDate <= onDate);
  if (
    !floorReady &&
    !steps.includes("move-committee-report") &&
    !steps.includes("move-concurrence") &&
    !steps.includes("move-veto-override")
  )
    return [];
  const bodies = bodiesForMeasure(world, measure, blueprint);
  const body = bodies.find((entry) => entry.chamberKey === chamberKey);
  const hearingBeforeVote = world.history.futureDueItems.some(
    (item) =>
      item.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
      item.entityIds.includes(measureId) &&
      item.dueAt < onDate &&
      futureDueItemStateAt(world, item.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled",
  );
  if (
    steps.includes("move-committee-report") &&
    (!steps.includes("request-committee-hearing") || hearingBeforeVote) &&
    body
  ) {
    const committee = chamber.committees.find(
      (entry) => entry.committeeKey === position.committeeKey,
    );
    return committee
      ? [
          {
            question: {
              measureId,
              purpose: "committee-report",
              forumKey: committee.committeeKey,
              floorStageKey: null,
            },
            forumName: committee.name,
            members: committeeRoster(
              body,
              chamber.committees,
              committee.committeeKey,
              `${pack.packId}:${chamberKey}`,
            ),
          },
        ]
      : [];
  }
  if (floorReady && body && position.floorStageKey)
    return [
      {
        question: {
          measureId,
          purpose: "floor-stage",
          forumKey: chamberKey,
          floorStageKey: position.floorStageKey,
        },
        forumName: chamber.name,
        members: body.members,
      },
    ];
  if (steps.includes("move-concurrence") && body)
    return [
      {
        question: {
          measureId,
          purpose: "concurrence",
          forumKey: chamberKey,
          floorStageKey: null,
        },
        forumName: chamber.name,
        members: body.members,
      },
    ];
  if (steps.includes("move-veto-override")) {
    const override = pack.executive.override;
    if (override.kind === "not-applicable") return [];
    if (override.kind === "joint-session")
      return [
        {
          question: {
            measureId,
            purpose: "veto-override",
            forumKey: "joint",
            floorStageKey: null,
          },
          forumName: "the joint session",
          members: bodies.flatMap((entry) => entry.members),
        },
      ];
    return pack.chamberOrder.flatMap((forumKey) => {
      const forumBody = bodies.find((entry) => entry.chamberKey === forumKey);
      return forumBody
        ? [
            {
              question: {
                measureId,
                purpose: "veto-override" as const,
                forumKey,
                floorStageKey: null,
              },
              forumName: chamberByKey(pack, forumKey).name,
              members: forumBody.members,
            },
          ]
        : [];
    });
  }
  return [];
}

/** A question the controlled member will vote on, and what they have decided. */
export interface MemberVoteAhead extends ChamberQuestionForum {
  readonly measure: LegislativeMeasureRecord;
  /** The day the question is put, when the institution has scheduled it. */
  readonly voteOn: IsoDate | null;
  readonly ballot: MemberBallot | null;
}

/**
 * Every question still to be put that the person sits on, soonest first. Read
 * only: it spends no time and records nothing.
 */
export function memberVotesAhead(
  world: World,
  personId: EntityId,
): readonly MemberVoteAhead[] {
  const ahead: MemberVoteAhead[] = [];
  for (const measure of world.history.legislativeMeasures ?? []) {
    const voteOn = scheduledInstitutionStepDate(world, measure.id);
    for (const forum of pendingChamberQuestions(
      world,
      measure.id,
      voteOn ?? world.currentDate,
    )) {
      if (!forum.members.some((member) => member.personId === personId))
        continue;
      ahead.push({
        ...forum,
        measure,
        voteOn,
        ballot: memberBallotOn(world, personId, forum.question),
      });
    }
  }
  return ahead.sort((l, r) =>
    (l.voteOn ?? "9999-12-31").localeCompare(r.voteOn ?? "9999-12-31"),
  );
}

/**
 * The controlled member decides their ballot on a question still to be put.
 * Refused (World unchanged) unless the person is the one the player controls
 * and sits on that question. Deciding again replaces the earlier ballot; the
 * earlier one stays in the record.
 */
export function castMemberBallot(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly question: ChamberQuestion;
    readonly ballot: MemberBallot;
  },
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  )
    return world;
  const key = chamberQuestionKey(input.question);
  const facing = memberVotesAhead(world, input.personId).find(
    (entry) => chamberQuestionKey(entry.question) === key,
  );
  if (!facing || facing.ballot === input.ballot) return world;
  const label =
    input.ballot === "yea"
      ? "for"
      : input.ballot === "nay"
        ? "against"
        : "present, not voting, on";
  const next = recordMemberBallot(world, {
    personId: input.personId,
    jurisdictionId: facing.measure.jurisdictionId,
    question: input.question,
    ballot: input.ballot,
    summary: `Decided to vote ${label} ${facing.measure.designation}, ${facing.measure.shortTitle}, in ${facing.forumName}.`,
  });
  // Decided: the reminder to decide no longer needs to stop the day.
  const notice = recordByStableKey(
    next.history.scheduledActivities,
    memberVoteNoticeKey(input.question, input.personId),
  );
  return notice &&
    scheduledActivityState(next, notice.id).status === "scheduled"
    ? cancelScheduledActivity(next, notice.id)
    : next;
}

/**
 * A reminder to decide a vote that time passed without the player attending
 * it (a campaign afternoon, a trip) is over once the reminder's hour is past;
 * it no longer waits on the calendar. The roll call still records the player
 * absent unless they decided.
 */
/** Releases outstanding ballot reminders when a measure receives a final outcome. */
export function closeResolvedMemberVoteNotices(
  world: World,
  measureId: EntityId,
): World {
  const prefix = `${LEGISLATIVE_CLOCK_VERSION}:member-vote:`;
  let next = world;
  for (const activity of next.history.scheduledActivities) {
    if (
      !activity.stableKey.startsWith(prefix) ||
      !activity.sourceEntityIds.includes(measureId) ||
      scheduledActivityState(next, activity.id).status !== "scheduled"
    )
      continue;
    next = cancelScheduledActivity(next, activity.id);
  }
  return next;
}

function closeLapsedVoteNotices(world: World, measureId: EntityId): World {
  const prefix = `${LEGISLATIVE_CLOCK_VERSION}:member-vote:`;
  let next = world;
  for (const activity of world.history.scheduledActivities) {
    if (
      !activity.stableKey.startsWith(prefix) ||
      !activity.sourceEntityIds.includes(measureId)
    )
      continue;
    const state = scheduledActivityState(next, activity.id);
    if (
      state.status === "scheduled" &&
      compareSimulationMoments(state.end, next.currentMoment) <= 0
    )
      next = cancelScheduledActivity(next, activity.id);
  }
  return next;
}

function memberVoteNoticeKey(
  question: ChamberQuestion,
  personId: EntityId,
): string {
  return `${LEGISLATIVE_CLOCK_VERSION}:member-vote:${chamberQuestionKey(question)}:${personId}`;
}

function scheduledInstitutionStepDate(
  world: World,
  measureId: EntityId,
): IsoDate | null {
  const item = world.history.futureDueItems.find(
    (entry) =>
      entry.transitionKey === LEGISLATIVE_INSTITUTION_STEP &&
      entry.entityIds.includes(measureId) &&
      futureDueItemStateAt(world, entry.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled",
  );
  return item?.dueAt ?? null;
}

/** Late afternoon, the day before the roll call. */
const MEMBER_VOTE_NOTICE_MINUTE = 16 * 60;
const MEMBER_VOTE_NOTICE_MINUTES = 60;
/** How soon a late notice comes, in minutes. */
const MEMBER_VOTE_NOTICE_SOON = 30;

/**
 * A question the player sits on goes on their calendar the day before it is
 * put, so time stops for it the way it stops for any confirmed commitment and
 * the player can decide their ballot. Nothing is decided for them: without a
 * ballot they are recorded absent, as before.
 */
function noticeMemberVote(
  world: World,
  measureId: EntityId,
  voteOn: IsoDate,
): World {
  if (world.control.kind !== "person") return world;
  const personId = world.control.personId;
  let next = world;
  for (const forum of pendingChamberQuestions(world, measureId, voteOn)) {
    if (!forum.members.some((member) => member.personId === personId)) continue;
    const stableKey = memberVoteNoticeKey(forum.question, personId);
    if (
      memberBallotOn(next, personId, forum.question) !== null ||
      hasStableKey(next.history.scheduledActivities, stableKey)
    )
      continue;
    const dayBefore = simulationMomentAtLocalTime({
      date: addDays(voteOn, -1),
      minuteOfDay: MEMBER_VOTE_NOTICE_MINUTE,
      timeZone: next.currentMoment.timeZone,
      preferredUtcOffsetMinutes: next.currentMoment.utcOffsetMinutes,
    });
    // A question put tomorrow, set after late afternoon, is noticed as soon
    // as it is set. One put today has already been reached by the clock.
    const start =
      compareSimulationMoments(dayBefore, next.currentMoment) > 0
        ? dayBefore
        : voteOn > next.currentDate
          ? addSimulationMinutes(next.currentMoment, MEMBER_VOTE_NOTICE_SOON)
          : null;
    if (!start) continue;
    // More than one question can reach the same roll call. Keep each ballot
    // decision visible as its own reminder, but give those reminders
    // consecutive free hours instead of asking the player to hold overlapping
    // calendar commitments. The member-vote panel still carries each ballot
    // independently if a full day leaves no reminder slot.
    let noticeStart = start;
    while (noticeStart.date < voteOn) {
      const noticeEnd = addSimulationMinutes(
        noticeStart,
        MEMBER_VOTE_NOTICE_MINUTES,
      );
      const endsBeforeVoteDay =
        noticeEnd.date < voteOn ||
        (noticeEnd.date === voteOn && noticeEnd.minuteOfDay === 0);
      if (
        endsBeforeVoteDay &&
        !scheduledConflictExists(next, [personId], noticeStart, noticeEnd)
      )
        break;
      noticeStart = addSimulationMinutes(
        noticeStart,
        MEMBER_VOTE_NOTICE_MINUTES,
      );
    }
    if (noticeStart.date >= voteOn) continue;
    const measure = requireMeasure(next, measureId);
    const what =
      forum.question.purpose === "committee-report"
        ? `whether to report ${measure.designation} to the floor`
        : forum.question.purpose === "concurrence"
          ? `whether to accept the other chamber's changes to ${measure.designation}`
          : forum.question.purpose === "veto-override"
            ? `whether to override the veto of ${measure.designation}`
            : `${measure.designation}`;
    next = createScheduledActivity(next, {
      stableKey,
      title: `Decide your vote on ${measure.designation}`,
      summary: `${forum.forumName} votes on ${what}, ${measure.shortTitle}, on ${formatStatutoryDate(voteOn)}.`,
      kind: "confirmed",
      start: noticeStart,
      end: addSimulationMinutes(noticeStart, MEMBER_VOTE_NOTICE_MINUTES),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        jurisdictionId: measure.jurisdictionId,
        label: forum.forumName,
        locationKey: MEMBER_BALLOT_LOCATION_KEY,
      },
      sourceEntityIds: [measureId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
  }
  return next;
}

/* ------------------------------------------------------------------ *
 * Intake: the legislature files its own bills
 * ------------------------------------------------------------------ */

export const LEGISLATIVE_INTAKE_VERSION = "legislative-intake/v1";
