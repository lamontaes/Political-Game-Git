import { evaluateDecision, isSelectedDecision } from "../decisions";
import { traitConsiderations } from "../people-traits";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  DecisionImportance,
  EntityId,
  World,
} from "../types";

/**
 * Whether a grown child living in a parent's home sets up a home of their
 * own (A135, CTO Ruling 7 step 2).
 *
 * A new household forms in town only from a recorded cause: a grown child
 * leaving home (this decision), a couple moving in together, or a couple
 * breaking up (`./town-families`). Nothing here is drawn. The grown child
 * weighs, through the decision engine with no randomness:
 *
 * - their age, sliding from 18 (the Census Bureau's Current Population
 *   Survey finds 57 percent of men and 55 percent of women aged 18 to 24 in
 *   a parent's home, and 19 and 12 percent at 25 to 34; "Living Arrangements
 *   Varied Across Age Groups", May 2024, 2022 figures, college dorms counted
 *   as the parental home);
 * - whether their own pay carries a home of their own: the town's rent for
 *   one (HUD fair market rent for an efficiency, `town-rent.ts`) against
 *   their recorded pay, with HUD's 30 percent line where it starts to weigh
 *   against them; no pay of their own holds them at home;
 * - a partner of their own outside the home;
 * - that staying where the rent is already paid is the easier thing;
 * - their own taste for risk.
 *
 * The weights are PLACEHOLDERS (research: `why-young-adults-leave-home`);
 * the survey's shares check the town's totals in the tests and never decide
 * one person.
 */
export const LEAVING_HOME_VERSION = "leaving-home-v1" as const;

export const LEAVING_HOME_EVENT = "life.left-home" as const;

export const LEAVING_HOME_OPTIONS = {
  /** Sorts first, so an even weighing keeps them at home. */
  stay: "at-home",
  leave: "own-home",
} as const;

/** PLACEHOLDER weights, as strengths from 0 to 1. */
export const UNRESEARCHED_LEAVING_HOME = {
  provenance: "unresearched-blanket-rule",
  /** Age at which age argues neither way, and the years to full strength. */
  ageFrom: 18,
  ageYearsToFull: 12,
  /** Staying where the rent is already paid. */
  easierToStay: 0.5,
  /** HUD's cost-burden line, and the share over it at full strength. */
  burdenLine: 0.3,
  burdenToFull: 0.5,
  /** A partner of their own, outside the home. */
  partner: 0.5,
  researchQuestions: ["why-young-adults-leave-home"],
} as const;

const W = UNRESEARCHED_LEAVING_HOME;

/** What one grown child weighs, read from the record by the caller. */
export interface LeavingHomeFacts {
  readonly age: number;
  /** Their own recorded pay a month, in cents; 0 with none. */
  readonly payMinor: number;
  /** The town's rent for one a month, in cents; null where none is known. */
  readonly rentForOneMinor: number | null;
  /** Whether they have a partner who does not live in this home. */
  readonly partnerElsewhere: boolean;
}

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

/** A sliding strength in the decision engine's own steps. */
function importanceOf(strength: number): DecisionImportance | null {
  if (strength >= 0.75) return "decisive";
  if (strength >= 0.5) return "strong";
  if (strength >= 0.25) return "moderate";
  if (strength > 0) return "slight";
  return null;
}

/** Each circumstance, as a strength toward one option. */
export function leavingHomeConsiderations(
  world: World,
  personId: EntityId,
  facts: LeavingHomeFacts,
  stableKey: string,
): DecisionConsideration[] {
  const rows: [string, string, number, string, "medium" | "high"][] = [
    [
      "age",
      LEAVING_HOME_OPTIONS.leave,
      clamp01((facts.age - W.ageFrom) / W.ageYearsToFull),
      `they are ${facts.age}`,
      "high",
    ],
    [
      "easier",
      LEAVING_HOME_OPTIONS.stay,
      W.easierToStay,
      "staying where the rent is already paid is easier",
      "medium",
    ],
  ];
  if (facts.payMinor <= 0)
    rows.push([
      "no-pay",
      LEAVING_HOME_OPTIONS.stay,
      1,
      "they have no pay of their own",
      "high",
    ]);
  else if (facts.rentForOneMinor !== null) {
    const share = facts.rentForOneMinor / facts.payMinor;
    if (share > W.burdenLine)
      rows.push([
        "rent",
        LEAVING_HOME_OPTIONS.stay,
        clamp01((share - W.burdenLine) / W.burdenToFull),
        `a place of their own would take ${Math.round(share * 100)} percent of their pay`,
        "high",
      ]);
    else
      rows.push([
        "rent",
        LEAVING_HOME_OPTIONS.leave,
        clamp01((W.burdenLine - share) / W.burdenLine),
        `their pay carries a place of their own (${Math.round(share * 100)} percent of it)`,
        "high",
      ]);
  }
  if (facts.partnerElsewhere)
    rows.push([
      "partner",
      LEAVING_HOME_OPTIONS.leave,
      W.partner,
      "they have a partner of their own",
      "medium",
    ]);
  const list: DecisionConsideration[] = [];
  for (const [key, option, strength, why, confidence] of rows) {
    const importance = importanceOf(strength);
    if (!importance) continue;
    list.push({
      stableKey: `${stableKey}:${key}`,
      optionKey: option,
      sourceType: "context:circumstance",
      direction: "supports",
      importance,
      confidence,
      explanation: why,
      sourceRefs: [],
    });
  }
  list.push(
    ...traitConsiderations(world, personId, stableKey, [
      {
        optionKey: LEAVING_HOME_OPTIONS.leave,
        trait: "risk",
        pole: "high",
        explanation: "They want a place of their own.",
      },
      {
        optionKey: LEAVING_HOME_OPTIONS.stay,
        trait: "risk",
        pole: "low",
        explanation: "They would rather keep what they know.",
      },
    ]),
  );
  return list;
}

export interface LeavingHomeDecision {
  readonly leaves: boolean;
  readonly evaluation: DecisionEvaluation;
}

/** One grown child's own decision, through the decision engine. Pure. */
export function decideToLeaveHome(
  world: World,
  personId: EntityId,
  facts: LeavingHomeFacts,
  stableKey: string,
): LeavingHomeDecision {
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "family.leave-parental-home",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:home", key: personId, entityId: null },
    options: [
      {
        key: LEAVING_HOME_OPTIONS.stay,
        label: "Stay at home",
        description: "Keep living in a parent's home.",
      },
      {
        key: LEAVING_HOME_OPTIONS.leave,
        label: "Move out",
        description: "Set up a home of their own in town.",
      },
    ],
    constraints: [],
    considerations: leavingHomeConsiderations(
      world,
      personId,
      facts,
      stableKey,
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return {
    leaves:
      isSelectedDecision(evaluation) &&
      evaluation.selectedOptionKey === LEAVING_HOME_OPTIONS.leave,
    evaluation,
  };
}
