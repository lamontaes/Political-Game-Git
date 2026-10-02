import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { researchedPublicCashOpeningProfile } from "../public-budgets/opening-cash-profile";
import { SeededRng } from "../rng";
import {
  drawLegislativeStartingProcedures,
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
} from "../legislative-starting-procedures";
import type { World } from "../types";
import { assertWorldIntegrity } from "../world";

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
import { CRUNCH46_WORLD_OPENING_VERSION } from "./types";

const KEY = "world-setup:crunch46-v1";

/** Saves the budget adapter's researched estimates once at Begin. */
export function drawPublicCashOpeningProfile(
  world: World,
): PublicCashOpeningProfile {
  return researchedPublicCashOpeningProfile(world);
}

/** Streams are domain-separated forks of the world seed; UI never draws here. */
export function worldSetupRng(world: World, purpose: string): SeededRng {
  return new SeededRng(world.seed).fork(`${KEY}:${purpose}`);
}

/** An existing saved regime is evidence; a seed alone is not. */
export function drawStartingRegime(world: World): StartingRegime | null {
  return (
    macroStartingConditions(world)?.regime ??
    worldOpeningRecord(world)?.regime ??
    null
  );
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

export interface WorldStartingConditionsOptions {
  readonly openingVersion: WorldOpeningVersion;
  /** Supplied by the political initializer; absent in a macro-only test. */
  readonly political?: (
    world: World,
    regime: StartingRegime | null,
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
