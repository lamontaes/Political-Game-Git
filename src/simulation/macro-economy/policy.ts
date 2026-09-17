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
    innovationSdPp: { growth: 0.15, unemployment: 0.04, inflation: 0.04 },
  },
  bounds: { unemploymentPct: { min: 0, max: 100 } },
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
  | "international-conflict-spillover";

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
};

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
