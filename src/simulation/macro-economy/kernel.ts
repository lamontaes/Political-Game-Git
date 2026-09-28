import type { SeededRng } from "../rng";
import {
  detExp,
  logistic,
  logit,
  standardNormal,
} from "../world-setup/deterministic-math";
import {
  MACRO_ERA_POLICY as ERA,
  CRUNCH46_PROVISIONAL_POLICY as POLICY,
  UNRESEARCHED_UNEMPLOYMENT_RECOVERY as RECOVERY,
  type MacroRegime,
} from "./policy";

/**
 * Pure section-13 arithmetic. No World access, no clock, no storage.
 *
 * Every persisted value is rounded to MACRO_PRECISION decimal places so a
 * replay cannot depend on floating-point tails that differ between engines.
 */
export const MACRO_PRECISION = 6;
const SCALE = 10 ** MACRO_PRECISION;

export function roundMacro(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Macro values must be finite numbers.");
  }
  const rounded = Math.round(value * SCALE) / SCALE;
  return Object.is(rounded, -0) ? 0 : rounded;
}

// Engine-independent math shared with WORLD's startup kernel, so a save
// replays to the same bits in Node, a browser or the desktop app.
export { logistic, logit, standardNormal };

export interface MacroLatents {
  readonly cycle: number;
  readonly cost: number;
  readonly housing: number;
  readonly credit: number;
}

export interface MacroStartValues {
  readonly realGrowthAnnualPct: number;
  readonly unemploymentPct: number;
  readonly inflation12mPct: number;
  readonly housingSupplyDemandRatio: number;
  readonly creditTightness: number;
}

/**
 * Section 13 startup kernel. WORLD owns the draw and persists its result;
 * this is the shared reference arithmetic both lanes can test against.
 */
export function startValuesFromLatents(
  regime: MacroRegime,
  latents: MacroLatents,
): MacroStartValues {
  const scale = POLICY.volatilityScale[regime];
  const base = POLICY.baseline;
  const startup = POLICY.startup;
  return {
    realGrowthAnnualPct: roundMacro(
      base.growthAnchorPct + scale * latents.cycle,
    ),
    unemploymentPct: roundMacro(
      logistic(
        logit(base.unemploymentPct / 100) +
          startup.unemploymentCycleLogitCoefficient * scale * latents.cycle,
      ) * 100,
    ),
    inflation12mPct: roundMacro(
      base.inflationPct +
        startup.inflationCostCoefficient * scale * latents.cost,
    ),
    housingSupplyDemandRatio: roundMacro(
      detExp(startup.housingLogCoefficient * scale * latents.housing),
    ),
    creditTightness: roundMacro(
      logistic(startup.creditLogisticCoefficient * scale * latents.credit),
    ),
  };
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

/** Innovations in percentage points, already scaled by their SDs. */
export function drawInnovations(rng: SeededRng): MacroInnovations {
  const sd = POLICY.monthly.innovationSdPp;
  const growth = standardNormal(rng.fork("growth")) * sd.growth;
  const unemployment =
    standardNormal(rng.fork("unemployment")) * sd.unemployment;
  const inflation = standardNormal(rng.fork("inflation")) * sd.inflation;
  return {
    growth: roundMacro(growth),
    unemployment: roundMacro(unemployment),
    inflation: roundMacro(inflation),
  };
}

function boundedUnemployment(value: number): number {
  const bounds = POLICY.bounds.unemploymentPct;
  return roundMacro(Math.min(bounds.max, Math.max(bounds.min, value)));
}

/**
 * Section 13 monthly transition. `previous.growthPct` is the lagged growth
 * that moves unemployment; the new growth does not act until next month.
 * Unemployment's distance from the normal rate fades by
 * `UNRESEARCHED_UNEMPLOYMENT_RECOVERY`, so a slowdown raises it for as long
 * as growth stays weak and it comes back once growth does.
 */
export function stepMonth(
  previous: MacroMonthlyState,
  innovations: MacroInnovations,
  impulses: MacroImpulses,
  era: MacroEra | null = null,
): MacroMonthlyState {
  const m = POLICY.monthly;
  // The era's anchors when there is one: trend growth less any recession
  // under way, and the drifting inflation anchor.
  const anchor = era
    ? era.trendGrowthPct - era.recessionGapPp
    : POLICY.baseline.growthAnchorPct;
  // A price shock lifts inflation's pull; a recession lowers it.
  const inflationAnchor = era
    ? era.inflationAnchorPct +
      era.priceShockPp -
      ERA.inflation.recessionDisinflationPerGapPp * era.recessionGapPp
    : POLICY.baseline.inflationAnchorPct;
  const growthPct = roundMacro(
    anchor +
      m.growthPersistence * (previous.growthPct - anchor) +
      innovations.growth +
      impulses.growthPp,
  );
  const natural = era ? era.naturalRatePct : RECOVERY.naturalRatePct;
  // Unemployment answers growth against the trend, so a recession's lost
  // growth raises it and an expansion's return brings it back.
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
    // Continuous annual rates compound monthly into strictly positive levels.
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

/**
 * A jurisdiction's month: this month's national figures plus the place's
 * own gaps and shocks, with no independent random economy. The local growth
 * gap fades at section 13's growth persistence and the local unemployment
 * gap at the same retention as the national gap from its normal rate, so a
 * local shock raises local unemployment and then lets it rejoin the nation.
 */
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

/**
 * Published quarterly real-output growth, % annualized, from recorded
 * quarterly index levels. Distinct from the continuous-rate model state.
 */
export function annualizedQuarterlyGrowthPct(
  quarterIndex: number,
  previousQuarterIndex: number,
): number {
  if (!(quarterIndex > 0) || !(previousQuarterIndex > 0)) {
    throw new Error("Quarterly output indexes must be positive.");
  }
  return roundMacro(100 * ((quarterIndex / previousQuarterIndex) ** 4 - 1));
}

/** Published 12-month change from recorded price-index levels. */
export function twelveMonthChangePct(
  indexNow: number,
  indexTwelveMonthsEarlier: number,
): number {
  if (!(indexNow > 0) || !(indexTwelveMonthsEarlier > 0)) {
    throw new Error("Price indexes must be positive.");
  }
  return roundMacro(100 * (indexNow / indexTwelveMonthsEarlier - 1));
}

/** The economy's era: the anchors of the month, and the business cycle. */
export interface MacroEra {
  readonly trendGrowthPct: number;
  readonly naturalRatePct: number;
  readonly inflationAnchorPct: number;
  readonly phase: "expansion" | "recession";
  readonly phaseMonths: number;
  /** Growth below trend while a recession lasts, in points; 0 otherwise. */
  readonly recessionGapPp: number;
  /** The drawn recession's average length, in months; 0 otherwise. */
  readonly recessionMeanMonths: number;
  /** A price shock still pushing inflation up, in points; fades each month. */
  readonly priceShockPp: number;
}

export const START_ERA: MacroEra = {
  trendGrowthPct: ERA.start.trendGrowthPct,
  naturalRatePct: ERA.start.naturalRatePct,
  inflationAnchorPct: ERA.start.inflationAnchorPct,
  phase: "expansion",
  phaseMonths: 0,
  recessionGapPp: 0,
  recessionMeanMonths: 0,
  priceShockPp: 0,
};

function bounded(value: number, min: number, max: number): number {
  return roundMacro(Math.min(max, Math.max(min, value)));
}

/**
 * One month of the era (MACRO_ERA_POLICY): trend growth wanders and can jump
 * into a new era; a recession can begin, with a drawn depth and length, or
 * end; the normal unemployment rate drifts and is scarred by slumps; the
 * inflation anchor drifts and follows inflation that stays far from it.
 */
export function stepEra(
  previous: MacroEra,
  lastMonth: MacroMonthlyState,
  rng: SeededRng,
): MacroEra {
  const t = ERA.trend;
  let trend =
    previous.trendGrowthPct +
    t.monthlyPull * (t.longRunPct - previous.trendGrowthPct) +
    standardNormal(rng.fork("trend")) * t.monthlySdPp;
  if (rng.fork("era").next() < t.eraJumpMonthlyChance)
    trend += standardNormal(rng.fork("era-size")) * t.eraJumpSdPp;
  let phase = previous.phase;
  let phaseMonths = previous.phaseMonths + 1;
  let gap = previous.recessionGapPp;
  let meanMonths = previous.recessionMeanMonths;
  const turn = rng.fork("turn").next();
  if (
    phase === "expansion" &&
    phaseMonths >= ERA.cycle.minExpansionMonths &&
    turn < ERA.cycle.recessionStartMonthlyChance
  ) {
    const pick = rng.fork("depth").next();
    let cumulative = 0;
    const depth =
      ERA.cycle.depths.find((row) => (cumulative += row.weight) > pick) ??
      ERA.cycle.depths[0]!;
    phase = "recession";
    phaseMonths = 0;
    gap = depth.gapPp;
    meanMonths = depth.meanMonths;
  } else if (phase === "recession" && turn < 1 / Math.max(1, meanMonths)) {
    phase = "expansion";
    phaseMonths = 0;
    gap = 0;
    meanMonths = 0;
  }
  const n = ERA.natural;
  const natural =
    previous.naturalRatePct +
    n.monthlyPull * (n.longRunPct - previous.naturalRatePct) +
    standardNormal(rng.fork("natural")) * n.monthlySdPp +
    (phase === "recession" ? n.scarringPerGapPp * gap : 0);
  const i = ERA.inflation;
  const inflationGap = lastMonth.inflationPct - previous.inflationAnchorPct;
  const crackdown =
    1 +
    i.crackdownPullPerPp *
      Math.max(0, previous.inflationAnchorPct - i.crackdownAbovePct);
  const inflationAnchor =
    previous.inflationAnchorPct +
    i.monthlyPull * crackdown * (i.longRunPct - previous.inflationAnchorPct) +
    standardNormal(rng.fork("inflation-anchor")) * i.monthlySdPp +
    (Math.abs(inflationGap) > i.deanchorGapPp
      ? i.deanchorRate * inflationGap
      : 0);
  let priceShock = roundMacro(
    (previous.priceShockPp ?? 0) * i.shockMonthlyRetention,
  );
  if (rng.fork("price-shock").next() < i.shockMonthlyChance)
    priceShock +=
      i.shockMinPp +
      (i.shockMaxPp - i.shockMinPp) * rng.fork("price-shock-size").next();
  return {
    trendGrowthPct: bounded(trend, t.minPct, t.maxPct),
    naturalRatePct: bounded(natural, n.minPct, n.maxPct),
    inflationAnchorPct: bounded(inflationAnchor, i.minPct, i.maxPct),
    phase,
    phaseMonths,
    recessionGapPp: gap,
    recessionMeanMonths: meanMonths,
    priceShockPp: roundMacro(priceShock),
  };
}
