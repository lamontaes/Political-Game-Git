/** Retained KEEP closure and necessary supporting declarations; native public-caller proof is bounded, not exhaustive. */
import { detExp } from "./macro-deterministic-math";
import {
  MACRO_ERA_CONDITIONS as ERA_CONDITIONS,
  MACRO_ERA_POLICY as ERA,
  CRUNCH46_PROVISIONAL_POLICY as POLICY,
  ESTIMATED_UNEMPLOYMENT_RECOVERY as RECOVERY,
} from "./macro-policy";
export const MACRO_PRECISION = 6;
const SCALE = 10 ** MACRO_PRECISION;
export function roundMacro(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Macro values must be finite numbers.");
  }
  const rounded = Math.round(value * SCALE) / SCALE;
  return Object.is(rounded, -0) ? 0 : rounded;
}
export interface MacroMonthlyState {
  readonly growthPct: number;
  readonly unemploymentPct: number;
  readonly inflationPct: number;
  readonly realOutputIndex: number;
  readonly priceIndex: number;
}
export interface MacroInnovations {
  readonly growth: number;
  readonly unemployment: number;
  readonly inflation: number;
}
export interface MacroImpulses {
  readonly growthPp: number;
  readonly laborPp: number;
  readonly pricePp: number;
}
export const NO_IMPULSES: MacroImpulses = {
  growthPp: 0,
  laborPp: 0,
  pricePp: 0,
};
export const NO_INNOVATIONS: MacroInnovations = {
  growth: 0,
  unemployment: 0,
  inflation: 0,
};
function boundedUnemployment(value: number): number {
  const bounds = POLICY.bounds.unemploymentPct;
  return roundMacro(Math.min(bounds.max, Math.max(bounds.min, value)));
}
export function stepMonth(
  previous: MacroMonthlyState,
  innovations: MacroInnovations,
  impulses: MacroImpulses,
  era: MacroEra | null = null,
): MacroMonthlyState {
  const m = POLICY.monthly;
  const anchor = era
    ? era.trendGrowthPct - era.recessionGapPp
    : POLICY.baseline.growthAnchorPct;
  const inflationAnchor = era
    ? era.inflationAnchorPct -
      ERA.inflation.recessionDisinflationPerGapPp * era.recessionGapPp
    : POLICY.baseline.inflationAnchorPct;
  const growthPct = roundMacro(
    anchor +
      m.growthPersistence * (previous.growthPct - anchor) +
      innovations.growth +
      impulses.growthPp,
  );
  const natural = era ? era.naturalRatePct : RECOVERY.naturalRatePct;
  const trend = era ? era.trendGrowthPct : anchor;
  const unemploymentPct = boundedUnemployment(
    natural +
      RECOVERY.monthlyGapRetention * (previous.unemploymentPct - natural) -
      m.unemploymentGrowthGapCoefficient * (previous.growthPct - trend) +
      innovations.unemployment +
      impulses.laborPp,
  );
  const inflationPct = roundMacro(
    inflationAnchor +
      m.inflationPersistence * (previous.inflationPct - inflationAnchor) +
      innovations.inflation +
      impulses.pricePp,
  );
  return {
    growthPct,
    unemploymentPct,
    inflationPct,
    realOutputIndex: roundMacro(
      previous.realOutputIndex * detExp(growthPct / 100 / 12),
    ),
    priceIndex: roundMacro(
      previous.priceIndex * detExp(inflationPct / 100 / 12),
    ),
  };
}
export interface MacroLocalStep {
  readonly growthPct: number;
  readonly unemploymentPct: number;
}
export function stepLocalMonth(
  national: MacroMonthlyState,
  previousNational: MacroMonthlyState,
  previousLocal: MacroMonthlyState,
  impulses: MacroImpulses,
): MacroLocalStep {
  const m = POLICY.monthly;
  const growthGap = previousLocal.growthPct - previousNational.growthPct;
  const unemploymentGap =
    previousLocal.unemploymentPct - previousNational.unemploymentPct;
  return {
    growthPct: roundMacro(
      national.growthPct + m.growthPersistence * growthGap + impulses.growthPp,
    ),
    unemploymentPct: boundedUnemployment(
      national.unemploymentPct +
        RECOVERY.monthlyGapRetention * unemploymentGap -
        m.unemploymentGrowthGapCoefficient * growthGap +
        impulses.laborPp,
    ),
  };
}
export interface MacroEra {
  readonly trendGrowthPct: number;
  readonly naturalRatePct: number;
  readonly inflationAnchorPct: number;
  readonly phase: "expansion" | "recession";
  readonly phaseMonths: number;
  readonly recessionGapPp: number;
  readonly recessionMeanMonths: number;
}
export const START_ERA: MacroEra = {
  trendGrowthPct: ERA.start.trendGrowthPct,
  naturalRatePct: ERA.start.naturalRatePct,
  inflationAnchorPct: ERA.start.inflationAnchorPct,
  phase: "expansion",
  phaseMonths: 0,
  recessionGapPp: 0,
  recessionMeanMonths: 0,
};
function bounded(value: number, min: number, max: number): number {
  return roundMacro(Math.min(max, Math.max(min, value)));
}
export function stepEraConditions(
  previous: MacroEra,
  lastMonth: MacroMonthlyState,
): MacroEra {
  const t = ERA.trend;
  const trend =
    previous.trendGrowthPct +
    t.monthlyPull * (t.longRunPct - previous.trendGrowthPct);
  const shrinking = lastMonth.growthPct < 0;
  const phase: MacroEra["phase"] = shrinking ? "recession" : "expansion";
  const phaseMonths = phase === previous.phase ? previous.phaseMonths + 1 : 0;
  const n = ERA.natural;
  const shortfall = Math.max(
    0,
    previous.trendGrowthPct -
      lastMonth.growthPct -
      ERA_CONDITIONS.scarringAbovePp,
  );
  const natural =
    previous.naturalRatePct +
    n.monthlyPull * (n.longRunPct - previous.naturalRatePct) +
    n.scarringPerGapPp * shortfall;
  const i = ERA.inflation;
  const inflationGap = lastMonth.inflationPct - previous.inflationAnchorPct;
  const inflationAnchor =
    previous.inflationAnchorPct +
    i.monthlyPull * (i.longRunPct - previous.inflationAnchorPct) +
    (Math.abs(inflationGap) > i.deanchorGapPp
      ? i.deanchorRate * inflationGap
      : 0);
  return {
    trendGrowthPct: bounded(trend, t.minPct, t.maxPct),
    naturalRatePct: bounded(natural, n.minPct, n.maxPct),
    inflationAnchorPct: bounded(inflationAnchor, i.minPct, i.maxPct),
    phase,
    phaseMonths,
    recessionGapPp: 0,
    recessionMeanMonths: 0,
  };
}
