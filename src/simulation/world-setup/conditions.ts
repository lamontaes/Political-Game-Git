import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { canonicalStateJurisdictionId } from "../state-jurisdiction-id";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import {
  drawLegislativeStartingProcedures,
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
} from "../legislative-starting-procedures";
import type { World } from "../types";
import { assertWorldIntegrity } from "../world";
import { detExp, logistic, roundTo } from "./deterministic-math";
import { WORLD_CONDITION_ID_KIND, worldConditionRecords } from "./integrity";
import { CRUNCH46_POLICY } from "./policy";
import type {
  MacroStartingConditionsRecord,
  LegislativeStartingProceduresRecord,
  PoliticalStartingConditionsRecord,
  StartingRegime,
  WorldConditionRecord,
  WorldOpeningRecord,
  WorldOpeningVersion,
  PublicCashOpeningProfile,
} from "./types";
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  PUBLIC_CASH_OPENING_PROFILE_VERSION,
} from "./types";

import nationalAnnualConditions from "../../../data/research/macro/national-annual-conditions.json" with { type: "json" };

const KEY = "world-setup:crunch46-v1";

/** A temporary game bank for operative bills, saved once at Begin. */
export function drawPublicCashOpeningProfile(): PublicCashOpeningProfile {
  return {
    contractVersion: PUBLIC_CASH_OPENING_PROFILE_VERSION,
    federalMinorUnits: 100_000_000_000, // $1 billion
    stateByJurisdictionId: Object.fromEntries(
      US_STATE_USPS.map((usps) => {
        const id = canonicalStateJurisdictionId(`US-${usps}`);
        if (!id) throw new Error(`Missing state identity for ${usps}.`);
        return [id, 10_000_000_000]; // $100 million per state
      }),
    ),
    localMinorUnits: 500_000_000, // $5 million per admitted local government
  };
}

/** Streams are domain-separated forks of the world seed; UI never draws here. */
export function worldSetupRng(world: World, purpose: string): SeededRng {
  return new SeededRng(world.seed).fork(`${KEY}:${purpose}`);
}

export function drawStartingRegime(world: World): StartingRegime {
  // R21: a regime is model state, not a randomly assigned observation.
  // No observation-to-regime mapping is defined, so retain neutral model state.
  void world;
  return CRUNCH46_POLICY.regimes.order[0]!;
}

type Draft<T extends WorldConditionRecord> = T extends WorldConditionRecord
  ? Omit<
      T,
      | "id"
      | "sequence"
      | "recordedAt"
      | "effectiveDate"
      | "policyVersion"
      | "provenanceClass"
    >
  : never;

/** Appends condition records in one integrity pass. */
export function appendWorldConditions(
  world: World,
  drafts: readonly Draft<WorldConditionRecord>[],
): World {
  let sequence = world.history.nextSequence;
  const date = makeIsoDate(world.currentDate);
  const records = drafts.map(
    (draft) =>
      ({
        ...draft,
        id: createStableId(
          WORLD_CONDITION_ID_KIND,
          `${world.id}:${draft.stableKey}`,
        ),
        sequence: sequence++,
        recordedAt: date,
        effectiveDate: date,
        policyVersion: CRUNCH46_POLICY.policyVersion,
        provenanceClass: "simulated-condition",
      }) as WorldConditionRecord,
  );
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence,
      worldConditions: [...worldConditionRecords(world), ...records],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function worldOpeningRecord(world: World): WorldOpeningRecord | null {
  return (
    worldConditionRecords(world).find(
      (record): record is WorldOpeningRecord => record.kind === "world-opening",
    ) ?? null
  );
}

/** The opening generator that built this save; old saves have no record. */
export function worldOpeningVersionOf(
  world: World,
): WorldOpeningVersion | null {
  return worldOpeningRecord(world)?.openingVersion ?? null;
}

export function macroStartingConditions(
  world: World,
): MacroStartingConditionsRecord | null {
  return (
    worldConditionRecords(world).find(
      (record): record is MacroStartingConditionsRecord =>
        record.kind === "macro-starting-conditions",
    ) ?? null
  );
}

export function politicalStartingConditions(
  world: World,
): PoliticalStartingConditionsRecord | null {
  return (
    worldConditionRecords(world).find(
      (record): record is PoliticalStartingConditionsRecord =>
        record.kind === "political-starting-conditions",
    ) ?? null
  );
}

/** Null on saves created before the saved state procedure profile. */
export function legislativeStartingProceduresCondition(
  world: World,
): LegislativeStartingProceduresRecord | null {
  return (
    worldConditionRecords(world).find(
      (record): record is LegislativeStartingProceduresRecord =>
        record.kind === "legislative-starting-procedures",
    ) ?? null
  );
}

/**
 * One seat's saved starting condition (its generated share and affiliation at
 * Begin), or null for a legacy save or an unknown seat. A reader only: later
 * elections and successors are decided by their own writers, which may use
 * this as the seat's opening lean.
 */
export function seatStartingCondition(
  world: World,
  seatKey: string,
): PoliticalStartingConditionsRecord["seats"][number] | null {
  return (
    politicalStartingConditions(world)?.seats.find(
      (seat) => seat.seatKey === seatKey,
    ) ?? null
  );
}

/**
 * Section 13's small startup kernel. It sets modeled initial conditions for
 * the economy writer to start from; it moves no money and writes no history
 * of monthly observations.
 */
export function drawMacroStartingConditions(
  world: World,
  regime: StartingRegime,
): Draft<MacroStartingConditionsRecord> {
  const policy = CRUNCH46_POLICY.macro;
  const scale = policy.volatilityScale[regime];
  // One seeded pick among actual complete historical years, once at Begin.
  // Every observed component comes from this same row; no independent draws.
  const observed = worldSetupRng(world, "macro:observed-year").pick(
    nationalAnnualConditions.rows,
  );
  const coefficients = policy.startupCoefficients;
  const cycle =
    (observed.realGrowthContinuouslyCompoundedAnnualPct -
      policy.growthAnchorAnnualPct) /
    scale;
  const cost =
    (observed.inflation12mPct - policy.inflationReference12mPct) /
    (coefficients.inflationCost * scale);
  // Affordability and debt service are not supply balance or credit tightness.
  // Their raw observations are saved below; undefined model coordinates stay
  // neutral under R21 instead of pretending an unapproved mapping exists.
  const housing = 0;
  const credit = 0;
  return {
    kind: "macro-starting-conditions",
    stableKey: `${KEY}:macro-starting-conditions`,
    contractVersion: "crunch46-macro-start/v1",
    regime,
    volatilityScale: scale,
    observedYear: {
      year: observed.year,
      source: "data/research/macro/national-annual-conditions.json",
      effectiveFederalFundsAnnualAveragePct:
        observed.effectiveFederalFundsAnnualAveragePct,
      homePriceToHouseholdIncomeRatio: observed.homePriceToHouseholdIncomeRatio,
      householdDebtServicePctDisposableIncome:
        observed.householdDebtServicePctDisposableIncome,
    },
    modelStateBasis:
      "MODEL STATE AT START: regime is neutral; volatility uses existing policy; cycle and cost invert existing growth/inflation equations; housing and credit latents are neutral/no deviation because affordability and debt service do not define their model coordinates. Observed unemployment is retained directly.",
    latents: {
      cycle: roundTo(cycle),
      cost: roundTo(cost),
      housing: roundTo(housing),
      credit: roundTo(credit),
    },
    initial: {
      realGrowthAnnualPct: roundTo(
        observed.realGrowthContinuouslyCompoundedAnnualPct,
      ),
      unemploymentPct: observed.unemploymentAnnualAveragePct,
      inflation12mPct: roundTo(observed.inflation12mPct),
      housingSupplyDemandRatio: roundTo(
        detExp(coefficients.housingLog * scale * housing),
      ),
      creditTightness: roundTo(
        logistic(coefficients.creditLogit * scale * credit),
      ),
    },
  };
}

export interface WorldStartingConditionsOptions {
  readonly openingVersion: WorldOpeningVersion;
  /** Supplied by the political initializer; absent in a macro-only test. */
  readonly political?: (
    world: World,
    regime: StartingRegime,
  ) => Draft<PoliticalStartingConditionsRecord>;
}

/**
 * Persists a new save's generated starting conditions once, at Begin.
 * Only the current opening version writes them; a legacy replay writes none,
 * and nothing reads-then-writes on load.
 */
export function ensureWorldStartingConditions(
  world: World,
  options: WorldStartingConditionsOptions,
): World {
  if (options.openingVersion !== CRUNCH46_WORLD_OPENING_VERSION) return world;
  if (worldOpeningRecord(world)) return world;
  const regime = drawStartingRegime(world);
  const drafts: Draft<WorldConditionRecord>[] = [
    {
      kind: "world-opening",
      stableKey: `${KEY}:opening`,
      openingVersion: options.openingVersion,
      regime,
      publicCashOpening: drawPublicCashOpeningProfile(),
    },
    drawMacroStartingConditions(world, regime),
    {
      kind: "legislative-starting-procedures",
      stableKey: `${KEY}:legislative-starting-procedures`,
      contractVersion: LEGISLATIVE_STARTING_PROCEDURES_VERSION,
      procedures: drawLegislativeStartingProcedures(world),
    },
  ];
  if (options.political) drafts.push(options.political(world, regime));
  return appendWorldConditions(world, drafts);
}
