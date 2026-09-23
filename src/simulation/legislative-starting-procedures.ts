import { legislatureForState } from "./legislature-game-profile";
import type { LegislativeRulePack } from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import { canonicalStateJurisdictionId } from "./state-jurisdiction-id";
import { SeededRng } from "./rng";
import { STATES, TERRITORY_USPS } from "./state-reference";
import type { World } from "./types";

/** Changing a draw or its baseline requires a new version for new worlds. */
export const LEGISLATIVE_STARTING_PROCEDURES_VERSION =
  "ocd-legislative-starting-procedures/v1" as const;

export type LegislativeSessionCadence = "annual" | "biennial";
export type LegislativeSessionYearParity = "odd" | "even" | null;
export type LegislativeEffectiveDateDays = 75 | 90 | 105;
export type LegislativeRegularSessionCutoff = Readonly<{
  month: number;
  day: number;
}> | null;

/** One saved alternate-present state legislature and its active procedure. */
export interface LegislativeStartingProcedureEntry {
  readonly jurisdictionKey: string;
  readonly jurisdictionId: string;
  /** Full opening reference, independent of later changes to compiled packs. */
  readonly baselinePack: LegislativeRulePack;
  readonly effectiveDateDays: LegislativeEffectiveDateDays;
  readonly sessionCadence: LegislativeSessionCadence;
  /** Null for annual sessions; executable year parity for biennial sessions. */
  readonly sessionYearParity: LegislativeSessionYearParity;
  /** Null preserves an executable source limit in the saved baseline pack. */
  readonly regularSessionCutoff: LegislativeRegularSessionCutoff;
  readonly measuresCarryOver: boolean;
  /** Active draws are game rules, not assertions about real law. */
  readonly procedureProvenance: {
    readonly kind: "game-profile";
    readonly version: typeof LEGISLATIVE_STARTING_PROCEDURES_VERSION;
  };
}

export type LegislativeStartingProcedures = Readonly<
  Record<string, LegislativeStartingProcedureEntry>
>;

const STATE_KEYS = Object.keys(STATES)
  .filter((usps) => usps !== "DC" && !TERRITORY_USPS.has(usps))
  .map((usps) => `US-${usps}`)
  .sort();

/** Each field has its own stream, so adding another draw cannot retune it. */
function fieldRng(
  worldSeed: string,
  jurisdictionKey: string,
  field: string,
): SeededRng {
  return new SeededRng(worldSeed).fork(
    `${LEGISLATIVE_STARTING_PROCEDURES_VERSION}:${jurisdictionKey}:${field}`,
  );
}

function effectiveDateDays(
  worldSeed: string,
  jurisdictionKey: string,
): LegislativeEffectiveDateDays {
  // The opening profile stays near 90 days, with a bounded two-week drift.
  const draw = fieldRng(worldSeed, jurisdictionKey, "effective-days").integer(
    0,
    6,
  );
  return draw === 0 ? 75 : draw === 1 ? 105 : 90;
}

function sessionCadence(
  worldSeed: string,
  jurisdictionKey: string,
): LegislativeSessionCadence {
  // Nevada's compiled pack explicitly establishes biennial sessions. Annual
  // is a game-profile center elsewhere, not a claim all other states are annual.
  const baseline: LegislativeSessionCadence =
    jurisdictionKey === "US-NV" ? "biennial" : "annual";
  const varies =
    fieldRng(worldSeed, jurisdictionKey, "session-cadence").integer(0, 8) === 0;
  return varies ? (baseline === "annual" ? "biennial" : "annual") : baseline;
}

function sessionYearParity(
  worldSeed: string,
  jurisdictionKey: string,
  cadence: LegislativeSessionCadence,
): LegislativeSessionYearParity {
  if (cadence === "annual") return null;
  // Nevada's biennial legislature convenes after its even-year election.
  if (jurisdictionKey === "US-NV") return "odd";
  return fieldRng(worldSeed, jurisdictionKey, "session-year-parity").pick([
    "odd",
    "even",
  ] as const);
}

function regularSessionCutoff(
  worldSeed: string,
  jurisdictionKey: string,
  baselinePack: LegislativeRulePack,
): LegislativeRegularSessionCutoff {
  if (baselinePack.session.regularSessionLatestAdjournment) return null;
  // A saved game cutoff gives unresolved sessions an executable window. June
  // is the center; May and July are small alternate-present departures.
  const draw = fieldRng(
    worldSeed,
    jurisdictionKey,
    "regular-session-cutoff",
  ).integer(0, 5);
  if (draw === 0) return { month: 5, day: 31 };
  if (draw === 4) return { month: 7, day: 31 };
  return { month: 6, day: 30 };
}

function measuresCarryOver(
  worldSeed: string,
  jurisdictionKey: string,
  baselinePack: LegislativeRulePack,
): boolean {
  const expiry = baselinePack.session.measuresDieAtAdjournment;
  // An unresolved source value stays unresolved in baselinePack. The active
  // game profile uses no carryover as its center, with a small seeded drift.
  const baseline = expiry.kind === "known" ? !expiry.value : false;
  const varies =
    fieldRng(worldSeed, jurisdictionKey, "bill-carryover").integer(0, 8) === 0;
  return varies ? !baseline : baseline;
}

/** Build once at Begin and save the result; readers must never reroll it. */
export function drawLegislativeStartingProcedures(
  world: Pick<World, "seed">,
): LegislativeStartingProcedures {
  const entries: Record<string, LegislativeStartingProcedureEntry> = {};

  for (const jurisdictionKey of STATE_KEYS) {
    const jurisdictionId = canonicalStateJurisdictionId(jurisdictionKey);
    const pack = legislatureForState(jurisdictionKey);
    if (!jurisdictionId || !pack) {
      throw new Error(
        `No canonical jurisdiction or legislature for ${jurisdictionKey}.`,
      );
    }

    const cadence = sessionCadence(world.seed, jurisdictionKey);
    entries[jurisdictionKey] = {
      jurisdictionKey,
      jurisdictionId,
      // The playable registry adds standing committee stand-ins where the
      // researched pack has none. Save that executable baseline for replay.
      baselinePack: structuredClone(rulePackById(pack.packId)),
      effectiveDateDays: effectiveDateDays(world.seed, jurisdictionKey),
      sessionCadence: cadence,
      sessionYearParity: sessionYearParity(
        world.seed,
        jurisdictionKey,
        cadence,
      ),
      regularSessionCutoff: regularSessionCutoff(
        world.seed,
        jurisdictionKey,
        pack,
      ),
      measuresCarryOver: measuresCarryOver(world.seed, jurisdictionKey, pack),
      procedureProvenance: {
        kind: "game-profile",
        version: LEGISLATIVE_STARTING_PROCEDURES_VERSION,
      },
    };
  }

  return entries;
}
