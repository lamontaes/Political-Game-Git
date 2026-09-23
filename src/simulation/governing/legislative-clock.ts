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
  scheduledActivityState,
} from "../time-work";
import { formatStatutoryDate } from "../legislation-content-contracts";
import { compileBillDraft } from "../legislation-drafting";
import { recordDraftLineage } from "../legislation-draft-lineage";
import {
  programVariant,
  standingAuthority,
} from "../legislation-program-families";
import { recordFiledProvision } from "../legislative-politics";
import { legislativeWorkKey } from "../legislative-work-key";
import { rulePackById } from "../legislature-rule-packs";
import { appropriationFromEnactedMeasure } from "./program-governing";
import {
  scheduleFutureDueItem,
  futureDueItemStateAt,
} from "../future-transitions";
import {
  availableMeasureSteps,
  COMMITTEE_HEARING_TRANSITION_KEY,
  enrollMeasure,
  catalogPropositionIds,
  introduceMeasure,
  measureActions,
  measurePosition,
  nextMeasureStableKey,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordAdjournmentDeath,
  recordConcurrenceVote,
  recordEnactment,
  attemptVetoOverride,
  recordExecutiveAction,
  referMeasure,
  requireMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
  type MeasureStepKey,
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
import { decideChamberVote, seatedChamberForPack } from "./chamber-votes";
import {
  chamberByKey,
  defaultOriginChamber,
  floorStageByKey,
} from "../legislature-rules";
import type { LegislativeRulePack } from "../legislature-rules";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { nextMeasureDesignation } from "../measure-numbering";
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
 * established, so it is neither advanced nor declared dead.
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
  switch (position.phase) {
    case "awaiting-referral":
    case "in-committee":
    case "awaiting-floor":
    case "on-floor":
    case "awaiting-concurrence":
      return position.chamberKey === sponsorChamberKey
        ? "sponsor-office"
        : "institution";
    case "awaiting-transmittal":
    case "awaiting-enrollment":
    case "awaiting-presentation":
    case "awaiting-enactment":
      return "institution";
    case "awaiting-executive":
      return "executive";
    case "awaiting-override":
      return "sponsor-office";
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
  const first = measureActions(world, measureId)[0];
  return Number((first?.occurredAt ?? world.currentDate).slice(0, 4));
}

/**
 * The sourced outer limit of the session the measure was introduced in, if
 * the pack states one. After it, nothing moves on this measure.
 */
export function measureSessionClosedOn(
  world: World,
  measure: LegislativeMeasureRecord,
  pack: LegislativeRulePack,
): IsoDate | null {
  const limit = pack.session.regularSessionLatestAdjournment;
  if (!limit) return null;
  const year = sessionYear(world, measure.id);
  const boundary = year % 2 ? limit.value.oddYear : limit.value.evenYear;
  return makeIsoDate(
    `${year}-${String(boundary.month).padStart(2, "0")}-${String(boundary.day).padStart(2, "0")}`,
  );
}

export function measureSessionIsClosed(
  world: World,
  measureId: EntityId,
): { readonly closed: boolean; readonly closedOn: IsoDate | null } {
  const measure = requireMeasure(world, measureId);
  const pack = legislativeBlueprintForMeasure(world, measure).pack;
  const closedOn = measureSessionClosedOn(world, measure, pack);
  return {
    closed: closedOn !== null && world.currentDate > closedOn,
    closedOn,
  };
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
  const eligible = legislativeScenarioKeysForPlace(measure.jurisdictionId);
  const authored = eligible.find(
    (key) => legislativeBlueprint(key).shortTitle === measure.shortTitle,
  );
  if (authored) return legislativeBlueprint(authored);
  const key = scenarioKeyForMeasure(measure);
  return legislativeBlueprint(key ?? `institution:${measure.rulePackId}`);
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

/** Applies the institution's next step to one measure, if it has one. */
export function applyInstitutionStep(
  world: World,
  measureId: EntityId,
  onExecutiveDesk: ExecutiveDeskHandler,
): InstitutionStepResult {
  const measure = requireMeasure(world, measureId);
  const blueprint = legislativeBlueprintForMeasure(world, measure);
  const pack = blueprint.pack;
  const owner = effectiveOwner(world, measure);
  if (owner === null || owner === "sponsor-office") return { kind: "idle" };
  const session = measureSessionIsClosed(world, measureId);
  // Where the rules say a pending bill dies when the session adjourns, one
  // still before the legislature dies; that is how most bills end.
  const dies = pack.session.measuresDieAtAdjournment;
  if (
    session.closed &&
    owner !== "executive" &&
    dies.kind === "known" &&
    dies.value
  )
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
  if (session.closed)
    return {
      kind: "blocked",
      reason: `The session ended on ${session.closedOn}; whether this bill carries over is not established, so nothing more happens to it.`,
    };
  if (owner === "executive")
    return {
      kind: "executive",
      world: onExecutiveDesk(world, measure, blueprint),
    };

  const position = measurePosition(world, measureId);
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const steps = availableMeasureSteps(world, measureId);
  const key = (prefix: string) =>
    nextMeasureStableKey(world, measureId, `measure:${measureId}:${prefix}`);
  const bodies = bodiesForMeasure(world, measure, blueprint);
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
    const committee = chamber.committees[0];
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
    const decided = body
      ? decide(
          world,
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
        )
      : null;
    if (!body || !decided)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} has no recorded member decisions on this question.`,
      };
    return applied(
      takeFloorVote(world, {
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
      }),
      "move-floor-vote",
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
  if (steps.includes("record-enactment"))
    return applied(
      // Enactment is also where an appropriation becomes spending authority
      // the executive can commit; a measure without an amount writes nothing.
      appropriationFromEnactedMeasure(
        recordEnactment(world, { stableKey: key("enactment"), measureId }),
        measureId,
      ),
      "record-enactment",
    );
  return { kind: "idle" };
}

/** Records the governor's decision on a bound bill through the legislative writer. */
export function recordGovernorDecisionOnMeasure(
  world: World,
  measureId: EntityId,
  action: "signed" | "vetoed",
  rationale: string,
): World {
  if (measurePosition(world, measureId).phase !== "awaiting-executive")
    return world;
  return recordExecutiveAction(world, {
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
  const owner = effectiveOwner(world, measure);
  if (owner === null || owner === "sponsor-office") return world;
  if (pendingInstitutionStep(world, measureId, excludeDueItemId)) return world;
  if (measureSessionIsClosed(world, measureId).closed) return world;
  const dueAt =
    on && on > world.currentDate
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
    const result = applyInstitutionStep(world, measureId, onExecutiveDesk);
    switch (result.kind) {
      case "idle":
        return done(world, "Nothing for the institution to do.");
      case "blocked":
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
        return done(result.world, "The bill died when the session adjourned.");
      case "executive":
        return done(result.world, "The bill is on the executive's desk.");
      case "applied":
        return done(
          scheduleInstitutionStep(result.world, measureId, undefined, due.id),
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
 * The question the institution will put on this measure at its next step, if
 * that step is a vote of seated members, as it stands on `onDate`.
 *
 * Mirrors the step handler's choice of voters: the committee's own roster, the
 * chamber on a floor stage or a concurrence, and every chamber (or the joint
 * session) on a veto override. A step the sponsor's own office takes, or one
 * put to no seated members, has no question here.
 */
export function pendingChamberQuestions(
  world: World,
  measureId: EntityId,
  onDate: IsoDate = world.currentDate,
): readonly ChamberQuestionForum[] {
  const measure = requireMeasure(world, measureId);
  if (effectiveOwner(world, measure) !== "institution") return [];
  const blueprint = legislativeBlueprintForMeasure(world, measure);
  if (!isSeatedChamber(world, blueprint)) return [];
  const pack = blueprint.pack;
  const position = measurePosition(world, measureId);
  const steps = availableMeasureSteps(world, measureId);
  const bodies = bodiesForMeasure(world, measure, blueprint);
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const body = bodies.find((entry) => entry.chamberKey === chamberKey);
  const floorReady =
    steps.includes("move-floor-vote") ||
    (steps.includes("await-next-legislative-day") &&
      position.earliestNextFloorDate !== null &&
      position.earliestNextFloorDate <= onDate);
  if (
    steps.includes("move-committee-report") &&
    !steps.includes("request-committee-hearing") &&
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
  const notice = next.history.scheduledActivities.find(
    (activity) =>
      activity.stableKey ===
      memberVoteNoticeKey(input.question, input.personId),
  );
  return notice &&
    scheduledActivityState(next, notice.id).status === "scheduled"
    ? cancelScheduledActivity(next, notice.id)
    : next;
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
      next.history.scheduledActivities.some(
        (activity) => activity.stableKey === stableKey,
      )
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
      start,
      end: addSimulationMinutes(start, MEMBER_VOTE_NOTICE_MINUTES),
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

/** The authored measures a state's legislature can file, if any. */
export function authoredMeasuresForJurisdiction(
  jurisdictionId: EntityId,
): readonly LegislativeBlueprint[] {
  return legislativeScenarioKeysForPlace(jurisdictionId).map((key) =>
    legislativeBlueprint(key),
  );
}

/**
 * A non-player member files one of the legislature's written measures, which
 * then moves on the clock. Refused (World unchanged) when the state has no
 * written measures, the session's sourced limit has passed, or this intake
 * already ran.
 */
export function fileLegislatureMeasure(
  world: World,
  input: {
    readonly jurisdictionId: EntityId;
    readonly intakeKey: string;
  },
): World {
  const authored = authoredMeasuresForJurisdiction(input.jurisdictionId);
  if (authored.length === 0 || !world.jurisdictions[input.jurisdictionId])
    return world;
  const stableKey = `${LEGISLATIVE_INTAKE_VERSION}:${input.intakeKey}`;
  if (
    (world.history.legislativeMeasures ?? []).some(
      (measure) => measure.stableKey === stableKey,
    )
  )
    return world;
  const rng = new SeededRng(world.seed).fork(stableKey);
  const blueprint = rng.pick(authored);
  const pack = blueprint.pack;
  const limit = pack.session.regularSessionLatestAdjournment;
  if (limit) {
    const year = Number(world.currentDate.slice(0, 4));
    const boundary = year % 2 ? limit.value.oddYear : limit.value.evenYear;
    const closes = `${year}-${String(boundary.month).padStart(2, "0")}-${String(boundary.day).padStart(2, "0")}`;
    if (world.currentDate > closes) return world;
  }
  const originChamber = defaultOriginChamber(pack);
  const originChamberKey = originChamber.chamberKey;
  // Where the chamber is seated with real people, one of them carries the
  // bill. Otherwise the legacy sponsor: a person made for the purpose.
  const seated = seatedChamberForPack(
    world,
    pack.packId,
    originChamberKey,
    originChamber.name,
  );
  let next = world;
  let sponsorPersonId: EntityId;
  if (seated && seated.body.members.length > 0) {
    // PLACEHOLDER until research question
    // how-state-legislators-vote-without-a-stated-position says who sponsors
    // and carries bills.
    // Any member may file an ordinary bill. The money bill is the majority's:
    // leadership carries the budget, so its sponsor sits in the largest
    // caucus.
    const members =
      blueprint.subjectClass === "appropriation"
        ? majorityCaucus(seated.body.members)
        : seated.body.members;
    sponsorPersonId =
      members[rng.fork("seated-sponsor").integer(0, members.length)]!.personId!;
  } else {
    const sponsorKey = `${stableKey}:sponsor`;
    const age = rng.integer(34, 70);
    next = createCharacterHistoryContextPeople(world, [
      {
        stableKey: sponsorKey,
        ...drawCanonicalNamedIdentity(
          rng.fork("name"),
          generatePersonIdentity(rng.fork("identity")),
        ),
        birthDate: makeIsoDate(
          `${Number(world.currentDate.slice(0, 4)) - age}-${String(rng.integer(1, 13)).padStart(2, "0")}-${String(rng.integer(1, 29)).padStart(2, "0")}`,
        ),
        homeJurisdictionId: input.jurisdictionId,
      },
    ]);
    sponsorPersonId = characterHistoryContextPersonId(next, sponsorKey);
  }
  next = introduceMeasure(next, {
    stableKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: pack.packId,
    designation: nextMeasureDesignation(next, {
      jurisdictionId: input.jurisdictionId,
      originChamber,
    }),
    shortTitle: blueprint.shortTitle,
    summary: blueprint.summary,
    origin: "member-introduction",
    subjectClass: blueprint.subjectClass,
    sponsorPersonId,
    originChamberKey: originChamber.chamberKey,
    propositionIds: catalogPropositionIds(next, blueprint.propositionKeys),
  });
  const measure = next.history.legislativeMeasures!.at(-1)!;
  if (blueprint.subjectClass === "appropriation")
    next = attachAppropriationClauses(next, measure, stableKey);
  return scheduleInstitutionStep(next, measure.id);
}

/** The members of the chamber's largest caucus, in seat order. */
function majorityCaucus(members: SeatedBody["members"]): SeatedBody["members"] {
  const sizes = new Map<string, number>();
  for (const member of members)
    sizes.set(member.caucusLabel, (sizes.get(member.caucusLabel) ?? 0) + 1);
  const largest = [...sizes.entries()].sort(
    (l, r) => r[1] - l[1] || l[0].localeCompare(r[0]),
  )[0]![0];
  return members.filter((member) => member.caucusLabel === largest);
}

/**
 * An appropriation bill has to say how much. The clauses come from the
 * drafting family's own configuration, so the filed text, its amount and its
 * authority are the same objects a player's draft would produce — not a number
 * written here.
 */
function attachAppropriationClauses(
  world: World,
  measure: LegislativeMeasureRecord,
  stableKey: string,
): World {
  const authority = standingAuthority("standing:rural-transit-assistance");
  if (!authority) return world;
  let draft;
  try {
    draft = compileBillDraft({
      familyKey: "appropriations",
      variantKey: "single-programme",
      parameterValues: programVariant("appropriations", "single-programme")
        .variant.defaults,
      scenarioKey: legislativeWorkKey(rulePackById(measure.rulePackId)),
      jurisdictionId: measure.jurisdictionId,
      rulePackId: measure.rulePackId,
      designation: measure.designation,
      filedOn: world.currentDate,
      predicateAuthority: authority,
    });
  } catch {
    return world;
  }
  let next = world;
  for (const clause of draft.clauses)
    next = recordFiledProvision(next, {
      stableKey: `${stableKey}:${clause.provisionKey}`,
      measureId: measure.id,
      provisionKey: clause.provisionKey,
      sectionNumber: clause.sectionNumber,
      heading: clause.heading,
      text: clause.text,
      ...(clause.fiscalPeriod !== undefined
        ? { fiscalPeriod: clause.fiscalPeriod }
        : {}),
      beneficiary: clause.beneficiary,
      applicationScope: {
        jurisdictionId: measure.jurisdictionId,
        segmentKey: null,
      },
      ...(clause.fiscalExposureLabel !== null
        ? {
            fiscalExposureLabel: clause.fiscalExposureLabel,
            fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
          }
        : {}),
    });
  return recordDraftLineage(next, {
    stableKey: `${stableKey}:lineage`,
    measureId: measure.id,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    compiledAt: draft.filedOn,
    parameterValues: draft.parameterValues,
    authorityKey: authority.authorityKey,
    provenanceNote:
      "Authored appropriation configuration filed by a non-player legislature. Not a statute and not a claim about any real program.",
  });
}
