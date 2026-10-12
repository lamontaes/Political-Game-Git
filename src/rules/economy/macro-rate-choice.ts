/** Retained KEEP closure and necessary supporting declarations; native public-caller proof is bounded, not exhaustive. */
import type { TraitValue } from "../../simulation/people-trait-definitions";
import type { DecisionImportance } from "../../simulation/types";
export const CENTRAL_BANK_INFLATION_GOAL_PCT = 2;
export interface RateSetterView {
  readonly inflationLean: TraitValue;
  readonly risk: TraitValue;
  readonly deliberation: TraitValue;
}
export interface RateReadings {
  readonly inflationPct: number | null;
  readonly unemploymentPct: number | null;
  readonly unemploymentEarlierPct: number | null;
  readonly normalUnemploymentPct: number;
  readonly chargeOffPct: number;
  readonly calmChargeOffPct: number;
  readonly recentBankFailures: number;
  readonly policyMidPct: number;
  readonly neutralRealRatePct: number;
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
// stopgapId: "economy.central-bank-judgment-bands"
export function rateConcerns(
  view: RateSetterView,
  readings: RateReadings,
): readonly Concern[] {
  const concerns: Concern[] = [];
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
        preferredMove: fromNeutral > 0 ? (fromNeutral > 4 ? -0.25 : 0) : 0.25,
        importance: sizeOf((Math.abs(fromNeutral) - 1) / 2),
        why: `After inflation the rate stood at ${fmt(real)}, ${fromNeutral > 0 ? "well above" : "well below"} a level that neither pushes nor holds back the economy.`,
      });
  }
  return concerns;
}

export function rateMoveOf(key: RateOptionKey): number {
  return RATE_OPTIONS.find((option) => option.key === key)!.movePp;
}

export interface RateConsideration {
  readonly concern: string;
  readonly optionKey: RateOptionKey;
  readonly direction: "supports" | "opposes";
  readonly importance: DecisionImportance;
  readonly explanation: string;
}

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
