import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { SeededRng } from "../rng";
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
  PoliticalStartingConditionsRecord,
  StartingRegime,
  WorldConditionRecord,
  WorldOpeningRecord,
  WorldOpeningVersion,
} from "./types";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./types";

const KEY = "world-setup:crunch46-v1";

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
    },
    drawMacroStartingConditions(world, regime),
  ];
  if (options.political) drafts.push(options.political(world, regime));
  return appendWorldConditions(world, drafts);
}
