/**
 * The standalone decision rules for choosing which eligible law controls.
 * Data gathering, authority checks, dates, and judicial records stay in the
 * legacy reader; callers pass only candidates that have already passed those
 * checks.
 */

export type LawLevel =
  | "federal-constitution"
  | "federal-statute"
  | "federal-regulation"
  | "federal-executive-order"
  | "state-constitution"
  | "state-statute"
  | "state-regulation"
  | "state-executive-order"
  | "local-charter"
  | "local-ordinance"
  | "local-regulation"
  | "local-executive-order";

export type LawAnswer = "yes" | "no";
export type LawOrigin = "enacted" | "in-force-at-start";
export type OperativeBasis =
  "enacted-date" | "state-rule" | "estimated-state-rule" | "game-default";

export interface LawCandidate {
  readonly answer: LawAnswer;
  readonly measureId: string;
  readonly origin: LawOrigin;
  readonly level: LawLevel;
  readonly operativeAt: string;
  readonly operativeBasis: OperativeBasis;
  readonly sequence: number;
  /** A starting state "no" which allows a local answer to take precedence. */
  readonly yieldsToLocal?: boolean;
  readonly preempts?: boolean;
}

export interface LawInForceResult {
  readonly answer: LawAnswer;
  readonly measureId: string;
  readonly origin: LawOrigin;
  readonly level: LawLevel;
  readonly operativeAt: string;
  readonly operativeBasis: OperativeBasis;
  readonly preempts?: boolean;
}

export type LawScope = "all" | "enacted-only";

/** Higher entries control over lower entries. */
export const LAW_LEVELS: readonly LawLevel[] = [
  "federal-constitution",
  "federal-statute",
  "federal-regulation",
  "federal-executive-order",
  "state-constitution",
  "state-statute",
  "state-regulation",
  "state-executive-order",
  "local-charter",
  "local-ordinance",
  "local-regulation",
  "local-executive-order",
];

/** Larger ranks govern over smaller ranks. */
export function lawLevelRank(level: LawLevel): number {
  return LAW_LEVELS.length - LAW_LEVELS.indexOf(level);
}

export function outranks(a: LawLevel, b: LawLevel): boolean {
  return lawLevelRank(a) > lawLevelRank(b);
}

/**
 * Order two already-eligible candidates using the legacy law reader's rules.
 * The rank-only treatment of conflicts is a current game assumption: floor
 * preemption by a higher-level rule is not modeled.
 */
export function governs(
  candidate: LawCandidate,
  current: LawCandidate,
): boolean {
  const rank = governingRank(candidate) - governingRank(current);
  if (rank !== 0) return rank > 0;
  if (candidate.origin !== current.origin)
    return candidate.origin === "enacted";
  if (candidate.operativeAt !== current.operativeAt)
    return candidate.operativeAt > current.operativeAt;
  return candidate.sequence > current.sequence;
}

/**
 * Select the controlling eligible law. Candidate eligibility (authority,
 * operative date, expiry, publication, and court review) is resolved by the
 * caller, just as it is by the old World-backed reader.
 */
export function lawInForceFromCandidates(input: {
  readonly enacted: readonly LawCandidate[];
  readonly starting?: LawCandidate | null;
  readonly constitutional?: LawCandidate | null;
  readonly scope?: LawScope;
}): LawInForceResult | null {
  let best: LawCandidate | null = null;
  for (const candidate of input.enacted)
    if (!best || governs(candidate, best)) best = candidate;

  const starting = input.starting ?? null;
  if ((input.scope ?? "all") === "all") {
    if (starting && (!best || governs(starting, best))) best = starting;
  } else if (
    best &&
    starting?.level === "state-constitution" &&
    governs(starting, best)
  ) {
    best = null;
  }

  const constitutional = input.constitutional ?? null;
  if (constitutional && (!best || governs(constitutional, best)))
    best = constitutional;
  if (!best) return null;

  return {
    answer: best.answer,
    measureId: best.measureId,
    origin: best.origin,
    level: best.level,
    operativeAt: best.operativeAt,
    operativeBasis: best.operativeBasis,
    ...(best.preempts === undefined ? {} : { preempts: best.preempts }),
  };
}

/** A statute cannot change a question already settled by a constitution. */
export function statuteAnswer(
  law: LawInForceResult | null,
): LawAnswer | null | "closed" {
  if (!law) return null;
  return law.level === "federal-constitution" ||
    law.level === "state-constitution"
    ? "closed"
    : law.answer;
}

function governingRank(law: LawCandidate): number {
  return law.yieldsToLocal
    ? lawLevelRank("local-ordinance") -
        LAWS_PARAMETERS.startingStateNoYieldOffset.value
    : lawLevelRank(law.level);
}
import { LAWS_PARAMETERS } from "./parameters";
