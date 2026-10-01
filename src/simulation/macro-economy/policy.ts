/**
 * CRUNCH46 section 13 — explicit provisional macro policy.
 *
 * These are director-authored first-playable parameters, stored under
 * `crunch46-provisional-v1`. They are NOT fitted empirical estimates,
 * forecasts, real-world frequencies or owner-chosen weights. A save records
 * the policy version it was produced under and is never silently retrofitted.
 */
export const MACRO_POLICY_VERSION = "crunch46-provisional-v1" as const;

export const CRUNCH46_PROVISIONAL_POLICY = {
  version: MACRO_POLICY_VERSION,
  provenanceClass: "director-authored-provisional",
  regimeWeights: { "near-reference": 0.7, modest: 0.25, major: 0.05 },
  volatilityScale: { "near-reference": 0.5, modest: 1, major: 2.5 },
  baseline: {
    /** Modeled index; never presented as currency. */
    realOutputIndex: 100,
    /** Authored normal-growth anchor, annualized, continuous-rate state. */
    growthAnchorPct: 2,
    /** Retained ALIVE archive/calibration example, not a required value. */
    unemploymentPct: 4.6,
    /** Retained ALIVE archive/calibration example, 12-month CPI. */
    inflationPct: 2.7,
    inflationAnchorPct: 2,
    realIncomeIndex: 100,
    /** Authored neutral: neither shortage nor surplus. */
    housingSupplyDemandRatio: 1,
    /** Retained reference; changes only by a modeled central-bank decision. */
    policyRateRangePct: { lower: 3.5, upper: 3.75 },
  },
  startup: {
    unemploymentCycleLogitCoefficient: -0.2,
    inflationCostCoefficient: 0.6,
    housingLogCoefficient: 0.06,
    creditLogisticCoefficient: 0.4,
  },
  monthly: {
    growthPersistence: 0.85,
    inflationPersistence: 0.95,
    /** Okun-style lag: unemployment responds to the PREVIOUS month's growth gap. */
    unemploymentGrowthGapCoefficient: 0.04,
  },
  bounds: { unemploymentPct: { min: 0, max: 100 } },
} as const;

/**
 * UNRESEARCHED. Unemployment's pull back toward its normal level.
 *
 * Section 13 moves unemployment only by changes: last month's rate plus the
 * lagged growth gap, a draw and shock impulses. With nothing drawing it back,
 * every recessionary shock left a permanent step, and because the only
 * national shock origin the game produces is a slowdown, every world
 * ratcheted upward and stayed there. This rule keeps that month-to-month
 * response and lets the distance from the normal rate fade.
 *
 * `naturalRatePct` is the rate section 13 itself treats as neutral: the
 * starting draw at a zero cycle latent (`baseline.unemploymentPct`).
 * `monthlyGapRetention` is a placeholder read off one episode, BLS national
 * unemployment of 10.0% in October 2009 and 7.8% in October 2012
 * (((7.8 - 4.6) / (10.0 - 4.6)) ** (1 / 36) is about 0.985, a half-life of
 * about four years). That recovery also carried slow growth, so it is an
 * illustration, not an estimate. Both are filed as
 * `unemployment-return-to-normal`.
 */
export const UNEMPLOYMENT_RECOVERY_RULE =
  "unemployment-returns-to-normal/v1" as const;

export const UNRESEARCHED_UNEMPLOYMENT_RECOVERY = {
  rule: UNEMPLOYMENT_RECOVERY_RULE,
  naturalRatePct: CRUNCH46_PROVISIONAL_POLICY.baseline.unemploymentPct,
  monthlyGapRetention: 0.985,
} as const;

export type MacroRegime =
  keyof typeof CRUNCH46_PROVISIONAL_POLICY.regimeWeights;

/**
 * Signed shock impulses. Section 13 requires "signed impulses from actual
 * supported shocks/policies" but supplies no magnitudes, so the values below
 * are CHANGE-authored placeholders for first play. They are not estimates and
 * are reported to the director for confirmation; a later confirmed table is a
 * new version, never a silent edit of this one.
 *
 * Units: percentage points added to the month's growth (annual-rate state),
 * unemployment and inflation (12-month-rate state) at full intensity. A
 * shock's intensity decays geometrically by `monthlyRetention` unless its
 * origin records an end.
 */
export const CHANGE_AUTHORED_IMPULSES_VERSION =
  "change-authored-impulses-v1" as const;

export type MacroShockKind =
  | "energy-input-cost-disruption"
  | "regional-industry-downturn"
  | "regional-industry-boom"
  | "credit-tightening"
  | "revenue-shortfall"
  | "revenue-windfall"
  | "productivity-improvement"
  | "trade-disruption"
  | "disaster-reconstruction"
  | "public-health-disruption"
  | "international-conflict-spillover"
  | "public-spending-paid"
  | "tax-collections-paid";

export const MACRO_SHOCK_KINDS: readonly MacroShockKind[] = [
  "energy-input-cost-disruption",
  "regional-industry-downturn",
  "regional-industry-boom",
  "credit-tightening",
  "revenue-shortfall",
  "revenue-windfall",
  "productivity-improvement",
  "trade-disruption",
  "disaster-reconstruction",
  "public-health-disruption",
  "international-conflict-spillover",
  "public-spending-paid",
  "tax-collections-paid",
];

export interface ShockImpulseProfile {
  readonly growthPp: number;
  readonly laborPp: number;
  readonly pricePp: number;
  readonly monthlyRetention: number;
  readonly sectors: readonly GameplaySectorKey[];
}

export const CHANGE_AUTHORED_IMPULSES: Readonly<
  Record<MacroShockKind, ShockImpulseProfile>
> = {
  "energy-input-cost-disruption": {
    growthPp: -0.3,
    laborPp: 0.02,
    pricePp: 0.25,
    monthlyRetention: 0.7,
    sectors: ["energy-resources", "manufacturing", "trade-transport-consumer"],
  },
  "regional-industry-downturn": {
    growthPp: -0.2,
    laborPp: 0.03,
    pricePp: 0,
    monthlyRetention: 0.8,
    sectors: ["manufacturing"],
  },
  "regional-industry-boom": {
    growthPp: 0.2,
    laborPp: -0.03,
    pricePp: 0.02,
    monthlyRetention: 0.8,
    sectors: ["manufacturing"],
  },
  "credit-tightening": {
    growthPp: -0.2,
    laborPp: 0.02,
    pricePp: -0.02,
    monthlyRetention: 0.85,
    sectors: ["finance-real-estate", "construction-housing"],
  },
  "revenue-shortfall": {
    growthPp: -0.05,
    laborPp: 0.01,
    pricePp: 0,
    monthlyRetention: 0.6,
    sectors: ["health-education-public-services"],
  },
  "revenue-windfall": {
    growthPp: 0.05,
    laborPp: -0.01,
    pricePp: 0,
    monthlyRetention: 0.6,
    sectors: ["health-education-public-services"],
  },
  "productivity-improvement": {
    growthPp: 0.15,
    laborPp: 0,
    pricePp: -0.03,
    monthlyRetention: 0.9,
    sectors: ["information-professional-technology"],
  },
  "trade-disruption": {
    growthPp: -0.15,
    laborPp: 0.01,
    pricePp: 0.08,
    monthlyRetention: 0.75,
    sectors: ["manufacturing", "trade-transport-consumer"],
  },
  "disaster-reconstruction": {
    growthPp: -0.25,
    laborPp: 0.03,
    pricePp: 0.05,
    monthlyRetention: 0.7,
    sectors: ["construction-housing", "trade-transport-consumer"],
  },
  "public-health-disruption": {
    growthPp: -0.4,
    laborPp: 0.05,
    pricePp: 0.02,
    monthlyRetention: 0.75,
    sectors: ["health-education-public-services", "trade-transport-consumer"],
  },
  "international-conflict-spillover": {
    growthPp: -0.2,
    laborPp: 0.01,
    pricePp: 0.15,
    monthlyRetention: 0.8,
    sectors: ["energy-resources", "manufacturing"],
  },
  /*
   * UNRESEARCHED blanket rule, added so an enacted law can reach the economy
   * at all. Money a government actually paid out under a law adds demand in
   * that jurisdiction; tax it actually collected takes demand out. These are
   * the realized-money channels ChatGPT's C02 answer calls for, not enactment:
   * an appropriation is authority, not spending, and a tax rise is not a
   * windfall. The signs follow that accounting; the sizes are not estimates
   * and are filed as `realized-public-money-macro-magnitudes`.
   */
  "public-spending-paid": {
    growthPp: 0.1,
    laborPp: -0.02,
    pricePp: 0.01,
    monthlyRetention: 0.6,
    sectors: ["health-education-public-services", "construction-housing"],
  },
  "tax-collections-paid": {
    growthPp: -0.1,
    laborPp: 0.02,
    pricePp: 0,
    monthlyRetention: 0.6,
    sectors: ["trade-transport-consumer"],
  },
};

/**
 * UNRESEARCHED. Realized public money in one jurisdiction in one month that
 * counts as a full-intensity shock; smaller amounts scale linearly below it.
 * One figure for every jurisdiction regardless of size, which is exactly the
 * kind of simplification the research request asks to replace.
 */
export const UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS = 5_000_000_000; // $50 million

/**
 * ALIVE44 chunk 2: seven gameplay sectors, an authored aggregation of
 * BEA/NAICS rows, not a claim that BEA publishes these buckets.
 */
export type GameplaySectorKey =
  | "energy-resources"
  | "manufacturing"
  | "construction-housing"
  | "trade-transport-consumer"
  | "finance-real-estate"
  | "information-professional-technology"
  | "health-education-public-services";

export const GAMEPLAY_SECTORS: readonly GameplaySectorKey[] = [
  "energy-resources",
  "manufacturing",
  "construction-housing",
  "trade-transport-consumer",
  "finance-real-estate",
  "information-professional-technology",
  "health-education-public-services",
];

/**
 * THE ECONOMY'S ERAS (04 SYSTEM SPECS part 6, "the entire world changes").
 *
 * The anchors the monthly step pulls toward are not fixed. Trend growth, the
 * normal unemployment rate and the inflation anchor each ease toward a
 * long-run level; the normal unemployment rate is scarred by long slumps and
 * the inflation anchor comes loose when inflation runs hot. None of it is
 * drawn: no monthly wander, no jump into a new era, no price shock. What
 * changes the economy is a recorded cause: a dated shock (a disaster, a trade
 * break, public money), the credit and demand stocks, and the central bank's
 * decisions (`credit.ts`, `central-bank.ts`). Recessions are not drawn
 * either: since Build 19 they come from those stocks and decisions.
 *
 * PROVISIONAL sizes, calibrated to the broad U.S. record rather than fitted:
 * the long-run levels and the pull toward them. The record they are read
 * against: decade growth from about 4.5% (1960s) to about 1.9% (2000s); NBER
 * postwar expansions about 64 months and recessions about 10 to 11; the Great
 * Recession about 5 points below trend for 18 months and the Depression about
 * 11 for 43; decade inflation from 1.8% (2010s) to 7.1% (1970s). Filed for
 * research as society-wide-waves-causes-pace-scale.
 */
export const MACRO_ERA_POLICY = {
  version: "macro-eras-provisional-v1",
  start: {
    trendGrowthPct: CRUNCH46_PROVISIONAL_POLICY.baseline.growthAnchorPct,
    naturalRatePct: CRUNCH46_PROVISIONAL_POLICY.baseline.unemploymentPct,
    inflationAnchorPct: CRUNCH46_PROVISIONAL_POLICY.baseline.inflationAnchorPct,
  },
  trend: {
    longRunPct: 2.5,
    monthlyPull: 0.002,
    minPct: -0.5,
    maxPct: 6,
  },
  natural: {
    longRunPct: 4.8,
    monthlyPull: 0.01,
    /**
     * Rise per month for each point output runs below trend beyond
     * MACRO_ERA_CONDITIONS.scarringAbovePp (hysteresis).
     */
    scarringPerGapPp: 0.004,
    minPct: 3,
    maxPct: 9,
  },
  inflation: {
    longRunPct: 2,
    monthlyPull: 0.004,
    /** When inflation runs this far from the anchor, the anchor follows it. */
    deanchorGapPp: 1.5,
    deanchorRate: 0.06,
    minPct: -1,
    maxPct: 14,
    /** Inflation given up per point of recession depth (disinflation). */
    recessionDisinflationPerGapPp: 0.3,
  },
} as const;

/**
 * Build 19: the era with no drawn recession (`stepEraConditions`). The
 * 1-in-64 monthly recession start, its drawn depths and chance-based end, and
 * the built-in inflation crackdown are gone; the central bank's members
 * decide how hard to lean on inflation.
 */
export const MACRO_ERA_CONDITIONS = {
  version: "macro-eras-conditions-v1",
  /**
   * PLACEHOLDER: growth this many points under trend before a month scars
   * the normal unemployment rate, so an ordinary soft month does not.
   */
  scarringAbovePp: 1,
} as const;
