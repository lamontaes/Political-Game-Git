import type { MacroOpeningReference } from "../world-setup/types";
import type { MacroEra } from "./kernel";
import type { CentralBankState } from "./central-bank";
import type { MacroCreditState, MacroGrowthDrivers } from "./credit";
import type { EntityId, IsoDate } from "../types";
import type { MacroLatents, MacroStartValues } from "./kernel";
import type {
  CHANGE_AUTHORED_IMPULSES_VERSION,
  GameplaySectorKey,
  MACRO_POLICY_VERSION,
  MacroRegime,
  MacroShockKind,
  UNEMPLOYMENT_RECOVERY_RULE,
} from "./policy";

export const MACRO_ECONOMY_CONTRACT_VERSION = "change-macro/v1" as const;

/**
 * WORLD-owned starting draw, read through `start-port.ts`. CHANGE never
 * draws it again; it only cites it.
 */
export interface MacroStartingConditions {
  readonly contractVersion:
    "crunch46-macro-start/v1" | "observed-macro-start/v2";
  readonly policyVersion: typeof MACRO_POLICY_VERSION;
  readonly regime: MacroRegime | null;
  readonly volatilityScale: number | null;
  readonly latents: MacroLatents | null;
  readonly reference?: MacroOpeningReference;
  readonly initialHousingCounts?: {
    readonly supplyUnits: number;
    readonly demandHouseholds: number;
  };
  readonly initialPolicyRate?: {
    readonly lowerPct: number;
    readonly upperPct: number;
  };
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
  /**
   * The national era this month stood in (MACRO_ERA_POLICY). Absent on local
   * layers and on records written before eras existed.
   */
  readonly era?: MacroEra;
  /**
   * The unemployment rule that wrote this month. Absent on months written
   * before unemployment returned toward its normal rate; those stay as they
   * were recorded.
   */
  readonly unemploymentRule?: typeof UNEMPLOYMENT_RECOVERY_RULE;
  /**
   * Build 19: the credit stocks at the month's end and what pushed the
   * month's growth. Absent on months written before recessions came from
   * conditions, and on local layers.
   */
  readonly credit?: MacroCreditState;
  readonly drivers?: MacroGrowthDrivers;
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
  /** Build 19: the board that sets the policy rate. Absent on older saves until their next month. */
  readonly centralBank?: CentralBankState;
  /**
   * Build 19: whether the national economy is shrinking, as an observer
   * would say it, and the event that said so. A description, never a cause.
   */
  readonly cycle?: MacroCycleState;
}

export interface MacroCycleState {
  readonly phase: "expansion" | "recession";
  /** The first month of the phase. */
  readonly sinceMonth: string;
  readonly eventId: EntityId | null;
}
