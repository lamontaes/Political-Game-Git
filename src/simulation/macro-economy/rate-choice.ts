/**
 * What a member of the central bank's board weighs when the policy rate is
 * set (Build 19; Lamontae's note in Claude CTO's 9:35 p.m. rulings on
 * September 28, 2026: "no hard-coded rate rule").
 *
 * There is no formula for the rate. Each member reads the same published
 * numbers and forms their own considerations, and how much each concern
 * counts depends on who they are: how much they fear inflation against lost
 * jobs (their recorded view), how cautious they are (risk), and how long
 * they wait for more evidence (deliberation). The considerations go into the
 * ordinary decision engine (`decisions.ts`) like any other choice a person
 * makes, and the choice is theirs.
 *
 * Pure: no World access.
 *
 * The lines below estimate what counts as a small or large gap from the
 * recorded national readings available to every member. The estimate uses
 * the quarter- and half-point moves in the game's recorded option set and is
 * filed as `central-bank-member-judgment`. The 2 percent goal is
 * the Federal Open Market Committee's own stated longer-run goal for
 * inflation (Statement on Longer-Run Goals and Monetary Policy Strategy,
 * first adopted January 2012), a fact about the institution, not a rule for
 * what any member decides.
 */

import type { TraitValue } from "../people-trait-definitions";
import type { DecisionImportance } from "../types";

export const RATE_CHOICE_VERSION = "central-bank-rate-choice-v1" as const;

/** The institution's announced goal for 12-month inflation, percent. */
export const CENTRAL_BANK_INFLATION_GOAL_PCT = 2;

export const RATE_OPTIONS = [
  { key: "cut-half", movePp: -0.5, label: "Cut the rate by half a point" },
  {
    key: "cut-quarter",
    movePp: -0.25,
    label: "Cut the rate by a quarter point",
  },
  { key: "hold", movePp: 0, label: "Hold the rate" },
  {
    key: "raise-quarter",
    movePp: 0.25,
    label: "Raise the rate by a quarter point",
  },
  { key: "raise-half", movePp: 0.5, label: "Raise the rate by half a point" },
] as const;
export type RateOptionKey = (typeof RATE_OPTIONS)[number]["key"];

export function rateMoveOf(key: RateOptionKey): number {
  return RATE_OPTIONS.find((option) => option.key === key)!.movePp;
}

/** Who is deciding, as the decision needs them. */
export interface RateSetterView {
  /**
   * Their view of the trade-off, recorded when they joined the board:
   * positive fears inflation more, negative fears lost jobs more.
   */
  readonly inflationLean: TraitValue;
  readonly risk: TraitValue;
  readonly deliberation: TraitValue;
}

/** What every member can see at the meeting: published numbers only. */
export interface RateReadings {
  /** Latest published 12-month inflation; null before a year is recorded. */
  readonly inflationPct: number | null;
  /** Latest published unemployment rate. */
  readonly unemploymentPct: number | null;
  /** Published unemployment three months earlier. */
  readonly unemploymentEarlierPct: number | null;
  /** The board's working estimate of normal unemployment. */
  readonly normalUnemploymentPct: number;
  /** Yearly charge-offs reported by banks, percent, and their calm level. */
  readonly chargeOffPct: number;
  readonly calmChargeOffPct: number;
  /** Banks that failed since the last meeting. */
  readonly recentBankFailures: number;
  readonly policyMidPct: number;
  readonly neutralRealRatePct: number;
}

export interface RateConsideration {
  readonly concern: string;
  readonly optionKey: RateOptionKey;
  readonly direction: "supports" | "opposes";
  readonly importance: DecisionImportance;
  readonly explanation: string;
}

const LADDER: readonly DecisionImportance[] = [
  "slight",
  "moderate",
  "strong",
  "decisive",
];

function step(importance: DecisionImportance, by: number): DecisionImportance {
  const index = LADDER.indexOf(importance) + by;
  return LADDER[Math.min(LADDER.length - 1, Math.max(0, index))]!;
}

function sizeOf(gap: number): DecisionImportance {
  const size = Math.abs(gap);
  if (size >= 2) return "decisive";
  if (size >= 1) return "strong";
  if (size >= 0.5) return "moderate";
  return "slight";
}

interface Concern {
  readonly key: string;
  readonly preferredMove: number;
  readonly importance: DecisionImportance;
  readonly why: string;
}

function fmt(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} percent`;
}

/** The concerns this member forms from what they see. */
export function rateConcerns(
  view: RateSetterView,
  readings: RateReadings,
): readonly Concern[] {
  const concerns: Concern[] = [];
  // How much a member leans shifts how much a concern counts, one step per
  // point of lean, never whether they see it.
  const priceLean = view.inflationLean;
  const jobsLean = -view.inflationLean;

  if (readings.inflationPct !== null) {
    const gap = readings.inflationPct - CENTRAL_BANK_INFLATION_GOAL_PCT;
    const preferredMove =
      gap > 1 ? 0.5 : gap > 0.25 ? 0.25 : gap < -0.75 ? -0.25 : 0;
    concerns.push({
      key: "prices",
      preferredMove,
      importance: step(sizeOf(gap), priceLean),
      why: `Prices rose ${fmt(readings.inflationPct)} over the year, against a goal of ${fmt(CENTRAL_BANK_INFLATION_GOAL_PCT)}.`,
    });
  }

  if (readings.unemploymentPct !== null) {
    const gap = readings.unemploymentPct - readings.normalUnemploymentPct;
    const preferredMove =
      gap > 1 ? -0.5 : gap > 0.3 ? -0.25 : gap < -0.5 ? 0.25 : 0;
    concerns.push({
      key: "jobs",
      preferredMove,
      importance: step(sizeOf(gap), jobsLean),
      why: `Unemployment stood at ${fmt(readings.unemploymentPct)}, against about ${fmt(readings.normalUnemploymentPct)} the board takes as normal.`,
    });
    if (readings.unemploymentEarlierPct !== null) {
      const rise = readings.unemploymentPct - readings.unemploymentEarlierPct;
      if (rise >= 0.3)
        concerns.push({
          key: "jobs-turning",
          preferredMove: -0.5,
          // An impulsive member reacts to the latest turn harder.
          importance: step(
            rise >= 0.6 ? "decisive" : "strong",
            jobsLean + (view.deliberation > 0 ? 1 : 0) - 1,
          ),
          why: `Unemployment rose ${fmt(rise).replace(" percent", " points")} in three months.`,
        });
    }
  }

  const stress = readings.chargeOffPct - readings.calmChargeOffPct;
  if (stress >= 1 || readings.recentBankFailures > 0)
    concerns.push({
      key: "credit",
      preferredMove:
        stress >= 2 || readings.recentBankFailures > 0 ? -0.5 : -0.25,
      importance:
        readings.recentBankFailures > 0 || stress >= 2 ? "strong" : "moderate",
      why:
        readings.recentBankFailures > 0
          ? `${readings.recentBankFailures} bank${readings.recentBankFailures === 1 ? "" : "s"} failed since the last meeting, and lenders were writing off ${fmt(readings.chargeOffPct)} of loans a year.`
          : `Lenders were writing off ${fmt(readings.chargeOffPct)} of loans a year.`,
    });

  if (readings.inflationPct !== null) {
    const real = readings.policyMidPct - readings.inflationPct;
    const fromNeutral = real - readings.neutralRealRatePct;
    if (fromNeutral > 1.5 || fromNeutral < -1.5)
      concerns.push({
        key: "rate-level",
        // Far above neutral, a member wants to stop tightening before it
        // bites; far below, to stop pressing the accelerator.
        preferredMove: fromNeutral > 0 ? (fromNeutral > 4 ? -0.25 : 0) : 0.25,
        importance: sizeOf((Math.abs(fromNeutral) - 1) / 2),
        why: `After inflation the rate stood at ${fmt(real)}, ${fromNeutral > 0 ? "well above" : "well below"} a level that neither pushes nor holds back the economy.`,
      });
  }
  return concerns;
}

/** Every consideration, per option, that this member brings to the vote. */
export function rateConsiderations(
  view: RateSetterView,
  readings: RateReadings,
): readonly RateConsideration[] {
  const out: RateConsideration[] = [];
  for (const concern of rateConcerns(view, readings)) {
    for (const option of RATE_OPTIONS) {
      const move = option.movePp;
      const want = concern.preferredMove;
      let direction: "supports" | "opposes";
      let importance = concern.importance;
      if (move === want) {
        direction = "supports";
      } else if (want !== 0 && Math.sign(move) === Math.sign(want)) {
        direction = "supports";
        importance = step(importance, -1);
      } else if (move === 0 || want === 0) {
        direction = "opposes";
        importance = step(importance, -1);
      } else {
        direction = "opposes";
      }
      out.push({
        concern: concern.key,
        optionKey: option.key,
        direction,
        importance,
        explanation: concern.why,
      });
    }
  }
  // Temperament: a cautious member prefers to wait and dislikes big moves; a
  // deliberative one wants to see more before acting.
  if (view.risk < 0) {
    out.push({
      concern: "caution",
      optionKey: "hold",
      direction: "supports",
      importance: view.risk <= -2 ? "moderate" : "slight",
      explanation: "They prefer to move carefully.",
    });
    for (const key of ["cut-half", "raise-half"] as const)
      out.push({
        concern: "caution",
        optionKey: key,
        direction: "opposes",
        importance: "slight",
        explanation: "They distrust large moves.",
      });
  }
  if (view.deliberation < 0)
    out.push({
      concern: "patience",
      optionKey: "hold",
      direction: "supports",
      importance: "slight",
      explanation: "They want to see another month of numbers first.",
    });
  return out;
}

const IMPORTANCE_WEIGHT: Readonly<Record<DecisionImportance, number>> = {
  slight: 1,
  moderate: 2,
  strong: 4,
  decisive: 6,
};

/**
 * The same arithmetic `decisions.ts` applies to these considerations at
 * medium confidence, for a reader that has no World (a calibration run).
 * The game itself decides through `evaluateDecision`.
 */
export function rankRateOptionsWithoutWorld(
  considerations: readonly RateConsideration[],
): readonly RateOptionKey[] {
  const score = new Map<RateOptionKey, number>(
    RATE_OPTIONS.map((option) => [option.key, 0]),
  );
  for (const row of considerations)
    score.set(
      row.optionKey,
      score.get(row.optionKey)! +
        (row.direction === "supports" ? 1 : -1) *
          IMPORTANCE_WEIGHT[row.importance] *
          2,
    );
  return [...score]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}
