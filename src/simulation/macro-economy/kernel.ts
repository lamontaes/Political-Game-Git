import type { SeededRng } from "../rng";
import {
  detExp,
  logistic,
  logit,
  standardNormal,
} from "../world-setup/deterministic-math";
import {
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
): MacroMonthlyState {
  const m = POLICY.monthly;
  const anchor = POLICY.baseline.growthAnchorPct;
  const inflationAnchor = POLICY.baseline.inflationAnchorPct;
  const growthPct = roundMacro(
    anchor +
      m.growthPersistence * (previous.growthPct - anchor) +
      innovations.growth +
      impulses.growthPp,
  );
  const natural = RECOVERY.naturalRatePct;
  const unemploymentPct = boundedUnemployment(
    natural +
      RECOVERY.monthlyGapRetention * (previous.unemploymentPct - natural) -
      m.unemploymentGrowthGapCoefficient * (previous.growthPct - anchor) +
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
