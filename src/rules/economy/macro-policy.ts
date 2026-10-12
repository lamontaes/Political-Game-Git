/** Retained KEEP closure and necessary supporting declarations; native public-caller proof is bounded, not exhaustive. */

export const MACRO_POLICY_VERSION = "crunch46-provisional-v1" as const;
// stopgapId: "economy.macro-provisional-policy"
export const CRUNCH46_PROVISIONAL_POLICY = {
  version: MACRO_POLICY_VERSION,
  provenanceClass: "director-authored-provisional",
  regimeWeights: { "near-reference": 0.7, modest: 0.25, major: 0.05 },
  volatilityScale: { "near-reference": 0.5, modest: 1, major: 2.5 },
  baseline: {
    realOutputIndex: 100,
    growthAnchorPct: 2,
    unemploymentPct: 4.6,
    inflationPct: 2.7,
    inflationAnchorPct: 2,
    realIncomeIndex: 100,
    housingSupplyDemandRatio: 1,
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
    unemploymentGrowthGapCoefficient: 0.04,
  },
  bounds: { unemploymentPct: { min: 0, max: 100 } },
} as const;
export const UNEMPLOYMENT_RECOVERY_RULE =
  "unemployment-returns-to-normal/v1" as const;
// stopgapId: "economy.macro-recovery-episode"
export const ESTIMATED_UNEMPLOYMENT_RECOVERY = {
  rule: UNEMPLOYMENT_RECOVERY_RULE,
  naturalRatePct: CRUNCH46_PROVISIONAL_POLICY.baseline.unemploymentPct,
  monthlyGapRetention: 0.985,
} as const;
export type MacroRegime =
  keyof typeof CRUNCH46_PROVISIONAL_POLICY.regimeWeights;
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
  "public-spending-paid": {
    growthPp: 0.05,
    laborPp: -0.01,
    pricePp: 0,
    monthlyRetention: 0.6,
    sectors: ["health-education-public-services", "construction-housing"],
  },
  "tax-collections-paid": {
    growthPp: -0.05,
    laborPp: 0.01,
    pricePp: 0,
    monthlyRetention: 0.6,
    sectors: ["trade-transport-consumer"],
  },
};
export type GameplaySectorKey =
  | "energy-resources"
  | "manufacturing"
  | "construction-housing"
  | "trade-transport-consumer"
  | "finance-real-estate"
  | "information-professional-technology"
  | "health-education-public-services";
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
    scarringPerGapPp: 0.004,
    minPct: 3,
    maxPct: 9,
  },
  inflation: {
    longRunPct: 2,
    monthlyPull: 0.004,
    deanchorGapPp: 1.5,
    deanchorRate: 0.06,
    minPct: -1,
    maxPct: 14,
    recessionDisinflationPerGapPp: 0.3,
  },
} as const;
export const MACRO_ERA_CONDITIONS = {
  version: "macro-eras-conditions-v1",
  scarringAbovePp: 1,
} as const;
