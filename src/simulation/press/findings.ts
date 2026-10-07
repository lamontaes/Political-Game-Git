import { addDays } from "../dates";
import type { EntityId, IsoDate, World } from "../types";
import type {
  MatterProceedingRecord,
  ProceedingOutcome,
  ProceedingStepRecord,
} from "./records";
import { pressRecordsOfKind } from "./store";

/**
 * Which proceeding outcomes count against the person they name once they are
 * public. A complaint, a notice, reason to believe and probable cause are
 * procedural stages, not findings. A confidential reprimand is adverse but
 * nobody outside the proceeding knows of it, so it reaches no voter, donor,
 * relative or party. A simulated inquiry's report is issued only when the
 * record supports the allegation (see `procedures.ts`), and it says so in
 * public, but it has no sanction power: it can cost standing, never money.
 */
export const ADVERSE_PUBLIC_OUTCOMES = [
  "finding",
  "conciliation",
  "report-issued",
] as const satisfies readonly ProceedingOutcome[];

export type AdversePublicOutcome = (typeof ADVERSE_PUBLIC_OUTCOMES)[number];

export function isAdversePublicStep(
  step: Pick<ProceedingStepRecord, "publicStep" | "outcome">,
): step is ProceedingStepRecord & { outcome: AdversePublicOutcome } {
  return (
    step.publicStep &&
    step.outcome !== null &&
    (ADVERSE_PUBLIC_OUTCOMES as readonly string[]).includes(step.outcome)
  );
}

/**
 * ESTIMATED FROM AVERAGE. How far a public ethics finding moves a candidate's
 * support, and how long voters remember one. The size rests on published
 * studies of scandal and incumbents' vote share (Welch and Hibbing 1997 put a
 * corruption charge near 6 points); the memory window is a game estimate of a
 * few election cycles. Filed with the research queue as
 * `ethics-finding-electoral-magnitudes`; a researched table replaces this one
 * under a new version, never as a silent edit.
 */
export const FINDING_EFFECTS_ESTIMATE = {
  version: "finding-consequences-unresearched-v1",
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "published studies of scandal and incumbent vote share (Welch and Hibbing 1997, Journal of Politics)",
  /** Basis points of contest support a respondent loses when it lands. */
  supportLossBasisPoints: {
    finding: 300,
    conciliation: 300,
    "report-issued": 150,
  } satisfies Record<AdversePublicOutcome, number>,
  /**
   * Starting-weight penalty in a later contest, per finding still within the
   * memory window. Starting weights are drawn from 850 to 1150 in
   * `campaigns.ts`, so 90 is roughly a quarter of that spread.
   */
  laterContestWeightPenalty: 90,
  /** Days a public finding still counts against a later candidacy. */
  memoryDays: 6 * 365,
} as const;

export interface AdversePublicFinding {
  readonly step: ProceedingStepRecord & { outcome: AdversePublicOutcome };
  readonly proceeding: MatterProceedingRecord;
}

/**
 * Public adverse outcomes naming `personId`, recorded on or before `asOf`.
 * Read-only: it writes nothing and draws nothing.
 */
export function publicAdverseFindingsAgainst(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly AdversePublicFinding[] {
  const proceedings = new Map(
    pressRecordsOfKind(world, "matter-proceeding")
      .filter((proceeding) => proceeding.respondentPersonIds.includes(personId))
      .map((proceeding) => [proceeding.id, proceeding]),
  );
  if (proceedings.size === 0) return [];
  return pressRecordsOfKind(world, "proceeding-step").flatMap((step) => {
    const proceeding = proceedings.get(step.proceedingId);
    if (!proceeding || step.at > asOf || !isAdversePublicStep(step)) return [];
    return [{ step, proceeding }];
  });
}

/** Findings still inside the estimated memory window on `asOf`. */
export function rememberedAdverseFindingsAgainst(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly AdversePublicFinding[] {
  return publicAdverseFindingsAgainst(world, personId, asOf).filter(
    (finding) =>
      addDays(finding.step.at, FINDING_EFFECTS_ESTIMATE.memoryDays) >= asOf,
  );
}

/**
 * ESTIMATED FROM AVERAGE. How much harder a second or later public finding lands than
 * the first. The owner asked that getting caught more than once cost more
 * (2026-09-22); how much more, for voters and for a body's fines, has not
 * been researched. Filed with the research queue as
 * `repeat-ethics-offense-escalation`; a researched table replaces this one
 * under a new version, never as a silent edit.
 */
export const REPEAT_OFFENSE_ESTIMATE = {
  version: "repeat-offense-unresearched-v1",
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "owner direction of 2026-09-22 that repeat findings cost more; the step size is a game estimate until the research queue answers",
  /** Added to the support-loss multiplier for each earlier finding. */
  supportLossStepPerPriorFinding: 0.5,
  /** Added to the civil-penalty multiplier for each earlier finding. */
  civilPenaltyStepPerPriorFinding: 1,
  maxMultiplier: 3,
} as const;

/**
 * Earlier public findings against `personId`, before the one in `step`. Every
 * earlier finding counts, remembered by voters or not: a regulator's record
 * does not fade the way a voter's memory does.
 */
export function priorAdverseFindings(
  world: World,
  personId: EntityId,
  step: Pick<ProceedingStepRecord, "id" | "at">,
): readonly AdversePublicFinding[] {
  return publicAdverseFindingsAgainst(world, personId, step.at).filter(
    (finding) => finding.step.id !== step.id && finding.step.at <= step.at,
  );
}

export function repeatOffenseMultiplier(
  priorFindings: number,
  kind: "support-loss" | "civil-penalty",
): number {
  const rule = REPEAT_OFFENSE_ESTIMATE;
  const stepSize =
    kind === "support-loss"
      ? rule.supportLossStepPerPriorFinding
      : rule.civilPenaltyStepPerPriorFinding;
  return Math.min(rule.maxMultiplier, 1 + stepSize * priorFindings);
}
