import policyJson from "./crunch46-provisional-policy.json";
import type { StartingRegime } from "./types";

type ByRegime<T> = Readonly<Record<StartingRegime, T>>;

export interface Crunch46Policy {
  readonly policyVersion: "crunch46-provisional-v1";
  readonly regimes: {
    readonly order: readonly StartingRegime[];
    readonly frequency: ByRegime<number>;
  };
  readonly political: {
    readonly nationalSwingSd: ByRegime<number>;
    readonly censusRegionResidualSd: ByRegime<number>;
    readonly stateResidualSd: ByRegime<number>;
    readonly seatResidualSd: ByRegime<number>;
    readonly logitEpsilon: number;
    readonly swingToLogitDivisor: number;
    readonly seatFlipCap: null;
  };
  readonly macro: {
    readonly growthAnchorAnnualPct: number;
    readonly unemploymentReferencePct: number;
    readonly inflationReference12mPct: number;
    readonly volatilityScale: ByRegime<number>;
    readonly startupCoefficients: {
      readonly unemploymentCycleLogit: number;
      readonly inflationCost: number;
      readonly housingLog: number;
      readonly creditLogit: number;
    };
  };
}

/** Authored first-playable parameters (CRUNCH46 section 13), stored as data. */
export const CRUNCH46_POLICY = policyJson as unknown as Crunch46Policy;

const regimeTotal = CRUNCH46_POLICY.regimes.order.reduce(
  (sum, regime) => sum + CRUNCH46_POLICY.regimes.frequency[regime],
  0,
);
if (Math.abs(regimeTotal - 1) > 1e-12) {
  throw new Error("Starting regime frequencies must sum to one.");
}
