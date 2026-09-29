import { legislatureForState } from "./legislature-game-profile";
import type { LegislativeRulePack } from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import { canonicalStateJurisdictionId } from "./state-jurisdiction-id";
import {
  isFederalDistrictUsps,
  isTerritoryUsps,
  STATES,
} from "./state-reference";
import regularSessionYearsData from "../../data/research/laws/regular-session-years.json" with { type: "json" };
import { stateSessionEnds } from "./governing/statute-effective-date";
import type { World } from "./types";

/** Changing a rule or its baseline requires a new version for new worlds. */
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
  .filter((usps) => !isFederalDistrictUsps(usps) && !isTerritoryUsps(usps))
  .map((usps) => `US-${usps}`)
  .sort();

/**
 * The game's default interval for an act that names no date; the states'
 * own researched rules date acts in play (`governing/statute-effective-date.ts`).
 */
const EFFECTIVE_DATE_DAYS: LegislativeEffectiveDateDays = 90;

const REGULAR_SESSION_YEARS = (
  regularSessionYearsData as {
    readonly rows: Readonly<Record<string, { readonly years: "odd" | "even" }>>;
  }
).rows;

/** The years the session-end table is read for: the opening year and the one before. */
const TABLE_YEARS = [2025, 2026] as const;

/**
 * A state's constitution names the years it meets when it does not meet
 * every year (`data/research/laws/regular-session-years.json`); every other
 * state meets annually.
 */
function sessionCadence(jurisdictionKey: string): LegislativeSessionCadence {
  return Object.hasOwn(REGULAR_SESSION_YEARS, jurisdictionKey)
    ? "biennial"
    : "annual";
}

function sessionYearParity(
  jurisdictionKey: string,
  cadence: LegislativeSessionCadence,
): LegislativeSessionYearParity {
  return cadence === "annual"
    ? null
    : REGULAR_SESSION_YEARS[jurisdictionKey]!.years;
}

/**
 * Where the reference pack states no limit, the day the state's session
 * usually ends, from the same table; null where the table has none.
 */
function regularSessionCutoff(
  jurisdictionKey: string,
  baselinePack: LegislativeRulePack,
): LegislativeRegularSessionCutoff {
  if (baselinePack.session.regularSessionLatestAdjournment) return null;
  for (const year of [...TABLE_YEARS].reverse()) {
    const end = stateSessionEnds(jurisdictionKey, year).at(-1);
    if (end)
      return { month: Number(end.slice(5, 7)), day: Number(end.slice(8, 10)) };
  }
  return null;
}

/** Pending bills carry over where the reference pack says they do not die. */
function measuresCarryOver(baselinePack: LegislativeRulePack): boolean {
  const expiry = baselinePack.session.measuresDieAtAdjournment;
  // An unresolved source value stays unresolved in baselinePack; the
  // game profile then uses no carryover.
  return expiry.kind === "known" ? !expiry.value : false;
}

/** Build once at Begin and save the result; readers never rebuild it. */
export function drawLegislativeStartingProcedures(
  // The procedures no longer vary by world; callers still name the world
  // they are saved for.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _world: Pick<World, "seed">,
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

    const cadence = sessionCadence(jurisdictionKey);
    entries[jurisdictionKey] = {
      jurisdictionKey,
      jurisdictionId,
      // The playable registry adds standing committee stand-ins where the
      // researched pack has none. Save that executable baseline for replay.
      baselinePack: structuredClone(rulePackById(pack.packId)),
      effectiveDateDays: EFFECTIVE_DATE_DAYS,
      sessionCadence: cadence,
      sessionYearParity: sessionYearParity(jurisdictionKey, cadence),
      regularSessionCutoff: regularSessionCutoff(jurisdictionKey, pack),
      measuresCarryOver: measuresCarryOver(pack),
      procedureProvenance: {
        kind: "game-profile",
        version: LEGISLATIVE_STARTING_PROCEDURES_VERSION,
      },
    };
  }

  return entries;
}
