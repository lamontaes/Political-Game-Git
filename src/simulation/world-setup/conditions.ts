import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { canonicalStateJurisdictionId } from "../state-jurisdiction-id";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { lifePlaceByKey } from "../life-places";
import { municipalGovernments } from "../municipal-government";
import {
  budgetCandidates,
  openGovernmentBudget,
  type BudgetCandidate,
} from "../public-budgets/opening";
import { SeededRng } from "../rng";
import {
  drawLegislativeStartingProcedures,
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
} from "../legislative-starting-procedures";
import type { World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  detExp,
  detLog,
  logistic,
  openUniform,
  roundTo,
  standardNormal,
} from "./deterministic-math";
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

const KEY = "world-setup:crunch46-v1";

/** Saves researched balance-plus-reserve estimates once at Begin. */
export function drawPublicCashOpeningProfile(
  world: World,
): PublicCashOpeningProfile {
  const today = makeIsoDate(world.currentDate);
  const candidates = budgetCandidates(world).candidates;
  const cash = (candidate: BudgetCandidate): number | null => {
    const opening = openGovernmentBudget(world, candidate, today);
    if (typeof opening === "string") return null;
    const amount = Math.round((opening.balance + opening.reserve) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new Error(`Invalid researched opening cash for ${candidate.key}.`);
    return amount;
  };
  let localAmounts = candidates
    .filter((candidate) => candidate.level !== "state")
    .map(cash)
    .filter((amount): amount is number => amount !== null);
  // A world with no local government uses the available municipal-profile
  // cohort, each government's existing researched estimate counted once.
  if (localAmounts.length === 0) {
    localAmounts = municipalGovernments().flatMap((government) => {
      const place = government.placeGeoid
        ? lifePlaceByKey(government.placeGeoid)
        : null;
      if (!place?.stateJurisdictionKey) return [];
      const amount = cash({
        key: `place:${government.placeGeoid}`,
        jurisdictionId: place.context.jurisdiction.id,
        lawJurisdictionId: place.context.jurisdiction.id,
        level: "city",
        name: government.displayName,
        stateKey: place.stateJurisdictionKey,
        geoid: government.placeGeoid,
      });
      return amount === null ? [] : [amount];
    });
  }
  if (localAmounts.length === 0)
    throw new Error("No researched local opening estimates are available.");
  return {
    contractVersion: PUBLIC_CASH_OPENING_PROFILE_VERSION,
    // Federal cash has no researched source yet; preserve the existing value.
    federalMinorUnits: 100_000_000_000, // $1 billion
    stateByJurisdictionId: Object.fromEntries(
      US_STATE_USPS.map((usps) => {
        const id = canonicalStateJurisdictionId(`US-${usps}`);
        if (!id) throw new Error(`Missing state identity for ${usps}.`);
        const candidate = candidates.find((row) => row.jurisdictionId === id);
        const amount = candidate ? cash(candidate) : null;
        if (amount === null)
          throw new Error(`Missing researched opening cash for ${usps}.`);
        return [id, amount];
      }),
    ),
    // ESTIMATED FROM AVERAGE: available local budget stocks, not receipts.
    localMinorUnits: Math.round(
      localAmounts.reduce((total, amount) => total + amount, 0) /
        localAmounts.length,
    ),
  };
}

/** Streams are domain-separated forks of the world seed; UI never draws here. */
export function worldSetupRng(world: World, purpose: string): SeededRng {
  return new SeededRng(world.seed).fork(`${KEY}:${purpose}`);
}

export function drawStartingRegime(world: World): StartingRegime {
  const u = openUniform(worldSetupRng(world, "regime"));
  let cumulative = 0;
  for (const regime of CRUNCH46_POLICY.regimes.order) {
    cumulative += CRUNCH46_POLICY.regimes.frequency[regime];
    if (u < cumulative) return regime;
  }
  return CRUNCH46_POLICY.regimes.order[
    CRUNCH46_POLICY.regimes.order.length - 1
  ]!;
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
  const latent = (name: string) =>
    standardNormal(worldSetupRng(world, `macro:${name}`));
  const cycle = latent("cycle");
  const cost = latent("cost");
  const housing = latent("housing");
  const credit = latent("credit");
  const coefficients = policy.startupCoefficients;
  const baseUnemployment = policy.unemploymentReferencePct / 100;
  return {
    kind: "macro-starting-conditions",
    stableKey: `${KEY}:macro-starting-conditions`,
    contractVersion: "crunch46-macro-start/v1",
    regime,
    volatilityScale: scale,
    latents: {
      cycle: roundTo(cycle),
      cost: roundTo(cost),
      housing: roundTo(housing),
      credit: roundTo(credit),
    },
    initial: {
      realGrowthAnnualPct: roundTo(
        policy.growthAnchorAnnualPct + scale * cycle,
      ),
      unemploymentPct: roundTo(
        logistic(
          detLog(baseUnemployment / (1 - baseUnemployment)) +
            coefficients.unemploymentCycleLogit * scale * cycle,
        ) * 100,
      ),
      inflation12mPct: roundTo(
        policy.inflationReference12mPct +
          coefficients.inflationCost * scale * cost,
      ),
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
      publicCashOpening: drawPublicCashOpeningProfile(world),
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
