import type { EntityId, IsoDate } from "../types";
import type { MacroLatents, MacroStartValues } from "./kernel";
import type {
  CHANGE_AUTHORED_IMPULSES_VERSION,
  GameplaySectorKey,
  MACRO_POLICY_VERSION,
  MacroRegime,
  MacroShockKind,
} from "./policy";

export const MACRO_ECONOMY_CONTRACT_VERSION = "change-macro/v1" as const;

/**
 * WORLD-owned starting draw, read through `start-port.ts`. CHANGE never
 * draws it again; it only cites it.
 */
export interface MacroStartingConditions {
  readonly contractVersion: "crunch46-macro-start/v1";
  readonly policyVersion: typeof MACRO_POLICY_VERSION;
  readonly regime: MacroRegime;
  readonly volatilityScale: number;
  readonly latents: MacroLatents;
  readonly initial: MacroStartValues;
  readonly effectiveDate: IsoDate;
}

/** "national" or one jurisdiction's local layer. */
export type MacroScopeKey = "national" | `jurisdiction:${string}`;

export interface MacroPolicyRateRange {
  readonly lowerPct: number;
  readonly upperPct: number;
  /** No central-bank actor is modeled yet, so the range never moves. */
  readonly basis: "retained-reference" | "modeled-decision";
  readonly decisionEventId: EntityId | null;
}

export interface MacroHousingCondition {
  /** Modeled supply ÷ demand; 1 is authored neutral, not a shortage. */
  readonly supplyDemandRatio: number;
  /** Absolute counts only where a recorded source supplies them. */
  readonly supplyUnits: number | null;
  readonly demandHouseholds: number | null;
  readonly classification: "shortage" | "adequate" | "surplus";
}

/**
 * One canonical month, written once when the month has ended. Model state is
 * continuous-rate; published discrete rates live in releases.
 */
export interface MacroMonthRecord {
  readonly key: string;
  readonly scope: MacroScopeKey;
  readonly ordinal: number;
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
  readonly recordedAt: IsoDate;
  readonly growthPct: number;
  readonly unemploymentPct: number;
  readonly inflationPct: number;
  readonly realOutputIndex: number;
  readonly priceIndex: number;
  /** Real income needs wage records the game does not keep yet. */
  readonly realIncomeIndex: null;
  /** Null for a local layer: no local housing stock source is compiled. */
  readonly housing: MacroHousingCondition | null;
  /**
   * Null for the national record. A local layer says how shocks were
   * scaled to it; without a compiled local sector source it is the
   * national average, and says so.
   */
  readonly exposure: {
    readonly basis: "national-average-no-local-source" | "source-derived";
    readonly multiplier: number;
    readonly sourceKey: string | null;
  } | null;
  readonly creditTightness: number;
  readonly policyRate: MacroPolicyRateRange;
  readonly innovations: {
    readonly growth: number;
    readonly unemployment: number;
    readonly inflation: number;
  };
  readonly impulses: {
    readonly growthPp: number;
    readonly laborPp: number;
    readonly pricePp: number;
  };
  /** Shocks whose intensity contributed to this month, sorted. */
  readonly shockKeys: readonly string[];
}

export type MacroShockPersistence =
  | { readonly kind: "geometric"; readonly monthlyRetention: number }
  | {
      readonly kind: "until-origin-ends";
      readonly monthlyRetention: number;
    };

/**
 * A shock created only from a canonical origin event. Headlines never
 * create shocks; a missing origin means no shock.
 */
export interface MacroShockRecord {
  readonly key: string;
  readonly kind: MacroShockKind;
  readonly originEventId: EntityId;
  /** Exactly-once key: origin + consumer + effective version. */
  readonly dedupeKey: string;
  readonly consumer: "change-macro";
  readonly impulsesVersion: typeof CHANGE_AUTHORED_IMPULSES_VERSION;
  readonly geographyIds: readonly EntityId[];
  readonly scope: MacroScopeKey;
  readonly sectors: readonly GameplaySectorKey[];
  readonly signedMagnitude: {
    readonly growthPp: number;
    readonly laborPp: number;
    readonly pricePp: number;
    readonly units: "percentage-points-per-month-at-full-intensity";
  };
  /** 0–1 ordinal scaling from the origin; null origins default to 1. */
  readonly intensity: number;
  readonly beginsAt: IsoDate;
  readonly persistence: MacroShockPersistence;
  readonly observedState: "public" | "not-public";
  readonly modelUncertainty: "authored-unvalidated";
  readonly schemaVersion: typeof MACRO_ECONOMY_CONTRACT_VERSION;
  readonly causalParents: readonly EntityId[];
  readonly recordedAt: IsoDate;
}

/** Append-only: the origin recorded that the disruption ended. */
export interface MacroShockEndRecord {
  readonly shockKey: string;
  readonly endEventId: EntityId;
  readonly endedAt: IsoDate;
  readonly recordedAt: IsoDate;
}

export type MacroReleaseIndicator =
  | "unemployment-rate"
  | "consumer-price-inflation-12m"
  | "real-output-growth-annualized-quarterly";

export interface MacroReleaseRecord {
  readonly key: string;
  readonly indicator: MacroReleaseIndicator;
  readonly scope: MacroScopeKey;
  readonly referencePeriodStart: IsoDate;
  readonly referencePeriodEnd: IsoDate;
  readonly releasedAt: IsoDate;
  /** Null when the model has no comparable history yet (a gap, not zero). */
  readonly value: number | null;
  readonly unit:
    "percent-of-labor-force" | "percent-12-month" | "percent-annualized";
  readonly valueClass: "simulated-publication";
  readonly sourceMonthKeys: readonly string[];
  /** The public event this release was announced through. */
  readonly eventId: EntityId;
}

export interface MacroEconomyStore {
  readonly contractVersion: typeof MACRO_ECONOMY_CONTRACT_VERSION;
  readonly policyVersion: typeof MACRO_POLICY_VERSION;
  readonly impulsesVersion: typeof CHANGE_AUTHORED_IMPULSES_VERSION;
  /** Cited WORLD start; copied values are the month-zero state. */
  readonly start: MacroStartingConditions;
  readonly months: readonly MacroMonthRecord[];
  readonly shocks: readonly MacroShockRecord[];
  readonly shockEnds: readonly MacroShockEndRecord[];
  readonly releases: readonly MacroReleaseRecord[];
}
