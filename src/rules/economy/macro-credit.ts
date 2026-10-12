/** Retained KEEP closure and necessary supporting declarations; native public-caller proof is bounded, not exhaustive. */
import { detExp, logistic } from "./macro-deterministic-math";
import type { MacroEra } from "./macro-kernel";
import { MACRO_ERA_POLICY } from "./macro-policy";
export const MACRO_CREDIT_VERSION = "macro-credit-conditions-v1" as const;
// stopgapId: "economy.credit-response-model"
export const MACRO_CREDIT_POLICY = {
  version: MACRO_CREDIT_VERSION,
  start: {
    debtRatio: 1.4,
    spreadPp: 2,
    bankCapitalRatio: 0.1,
    chargeOffPct: 0.5,
  },
  debtRepricedPctPerMonth: 3.3,
  spreadPerTightnessPp: 3,
  burdenLine: 0.082,
  chargeOff: {
    perBurdenPointPct: 2,
    perUnemploymentPointPct: 0.14,
    lossGivenDefault: 0.55,
  },
  bank: {
    earningsRate: 0.012,
    spreadEarnedPerPoint: 0.5,
    targetCapitalRatio: 0.1,
  },
  tightness: {
    intercept: 0,
    perCapitalShortfallPoint: 2,
    perChargeOffPoint: 0.35,
    perRealRatePoint: 0.11,
    monthlyAdjustment: 0.59,
  },
  lending: {
    perGrowthGapPp: 0.35,
    perTightnessTenthPp: 2.5,
    perBurdenPointPp: 0.8,
    perRoomPointPp: 0.1,
  },
  growth: {
    perCreditGapPp: 0.011,
    perCreditChangePp: 1.5,
    perRealRatePointPp: 0.017,
    perUnemploymentRisePp: 0.32,
  },
  inflation: {
    perSlackPointPp: 0.048,
  },
  neutralRealRatePct: 1.2,
} as const;
export interface MacroCreditState {
  readonly version: typeof MACRO_CREDIT_VERSION;
  readonly debtRatio: number;
  readonly debtRatePct: number;
  readonly burden: number;
  readonly chargeOffPct: number;
  readonly bankCapitalRatio: number;
  readonly lendingGrowthPct: number;
  readonly tightness: number;
  readonly priorUnemploymentPct: number;
}
export interface MacroGrowthDrivers {
  readonly trendPct: number;
  readonly carriedPp: number;
  readonly creditPp: number;
  readonly ratePp: number;
  readonly demandPp: number;
  readonly shocksPp: number;
  readonly chancePp: number;
}
function round6(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Credit values must be finite.");
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
export function startCreditState(
  policyMidPct: number,
  startTightness: number,
  unemploymentPct: number,
): MacroCreditState {
  const s = MACRO_CREDIT_POLICY.start;
  const debtRatePct = round6(policyMidPct + s.spreadPp);
  return {
    version: MACRO_CREDIT_VERSION,
    debtRatio: s.debtRatio,
    debtRatePct,
    burden: round6((s.debtRatio * debtRatePct) / 100),
    chargeOffPct: s.chargeOffPct,
    bankCapitalRatio: s.bankCapitalRatio,
    lendingGrowthPct: round6(
      MACRO_ERA_POLICY.start.trendGrowthPct +
        MACRO_ERA_POLICY.start.inflationAnchorPct +
        s.chargeOffPct,
    ),
    tightness: round6(startTightness),
    priorUnemploymentPct: unemploymentPct,
  };
}
export interface CreditMonthInput {
  readonly previousGrowthPct: number;
  readonly previousUnemploymentPct: number;
  readonly previousInflationPct: number;
  readonly era: MacroEra;
  readonly policyMidPct: number;
  readonly startTightness: number;
}
export interface CreditMonthResult {
  readonly credit: MacroCreditState;
  readonly creditPp: number;
  readonly ratePp: number;
  readonly demandPp: number;
  readonly slackPricePp: number;
}
export function stepCredit(
  previous: MacroCreditState,
  input: CreditMonthInput,
): CreditMonthResult {
  const p = MACRO_CREDIT_POLICY;
  const { era } = input;
  const realPolicy = input.policyMidPct - era.inflationAnchorPct;
  const realGap = realPolicy - p.neutralRealRatePct;
  const offered =
    input.policyMidPct +
    p.start.spreadPp +
    p.spreadPerTightnessPp * (previous.tightness - input.startTightness);
  const debtRatePct =
    previous.debtRatePct +
    (p.debtRepricedPctPerMonth / 100) * (offered - previous.debtRatePct);
  const burden = (previous.debtRatio * debtRatePct) / 100;
  const burdenPoints = (burden - p.burdenLine) * 100;
  const strainPoints = Math.max(0, burdenPoints);
  const unemploymentOver = Math.max(
    0,
    input.previousUnemploymentPct - era.naturalRatePct,
  );
  const chargeOffPct =
    p.start.chargeOffPct +
    p.chargeOff.perBurdenPointPct * strainPoints +
    p.chargeOff.perUnemploymentPointPct * unemploymentOver;
  const lossRate = (chargeOffPct / 100) * p.chargeOff.lossGivenDefault;
  const earnings =
    p.bank.earningsRate +
    (p.bank.spreadEarnedPerPoint *
      p.spreadPerTightnessPp *
      Math.max(0, previous.tightness - input.startTightness)) /
      100;
  const bankCapitalRatio = clamp(
    previous.bankCapitalRatio +
      (earnings - lossRate) / 12 -
      (previous.bankCapitalRatio * (previous.lendingGrowthPct / 100)) / 12,
    0,
    0.3,
  );
  const shortfallPoints = (p.bank.targetCapitalRatio - bankCapitalRatio) * 100;
  const wanted = logistic(
    p.tightness.intercept +
      Math.log(input.startTightness / (1 - input.startTightness)) +
      p.tightness.perCapitalShortfallPoint * shortfallPoints +
      p.tightness.perChargeOffPoint * (chargeOffPct - p.start.chargeOffPct) +
      p.tightness.perRealRatePoint * Math.max(0, realGap),
  );
  const tightness = clamp(
    previous.tightness +
      p.tightness.monthlyAdjustment * (wanted - previous.tightness),
    0.001,
    0.999,
  );
  const nominalTrend = era.trendGrowthPct + era.inflationAnchorPct;
  const calmLending = nominalTrend + p.start.chargeOffPct;
  const lendingGrowthPct =
    calmLending +
    p.lending.perGrowthGapPp * (input.previousGrowthPct - era.trendGrowthPct) -
    p.lending.perTightnessTenthPp * 10 * (tightness - input.startTightness) -
    (burdenPoints > 0
      ? p.lending.perBurdenPointPp * burdenPoints
      : p.lending.perRoomPointPp * burdenPoints);
  const nominalGrowth = input.previousGrowthPct + input.previousInflationPct;
  const debtRatio = clamp(
    previous.debtRatio *
      detExp((lendingGrowthPct - chargeOffPct - nominalGrowth) / 1200),
    0.2,
    6,
  );
  const creditPp =
    p.growth.perCreditGapPp * (lendingGrowthPct - calmLending) +
    p.growth.perCreditChangePp * (lendingGrowthPct - previous.lendingGrowthPct);
  const ratePp = -p.growth.perRealRatePointPp * realGap;
  const demandPp =
    -p.growth.perUnemploymentRisePp *
    (input.previousUnemploymentPct - previous.priorUnemploymentPct);
  const slackPricePp =
    p.inflation.perSlackPointPp *
    (era.naturalRatePct - input.previousUnemploymentPct);
  return {
    credit: {
      version: MACRO_CREDIT_VERSION,
      debtRatio: round6(debtRatio),
      debtRatePct: round6(debtRatePct),
      burden: round6(burden),
      chargeOffPct: round6(chargeOffPct),
      bankCapitalRatio: round6(bankCapitalRatio),
      lendingGrowthPct: round6(lendingGrowthPct),
      tightness: round6(tightness),
      priorUnemploymentPct: input.previousUnemploymentPct,
    },
    creditPp: round6(creditPp),
    ratePp: round6(ratePp),
    demandPp: round6(demandPp),
    slackPricePp: round6(slackPricePp),
  };
}
