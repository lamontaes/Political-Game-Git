import {
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
  type LegislativeStartingProcedureEntry,
} from "./legislative-starting-procedures";
import {
  assertRulePackIntegrity,
  knownRule,
  type LegislativeRulePack,
  type RuleSourceRef,
} from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import { makeIsoDate } from "./dates";
import type { EntityId, IsoDate, World } from "./types";
import type { LegislativeStartingProceduresRecord } from "./world-setup/types";

/** An old save has no record and keeps its original static rule pack. */
export function legislativeStartingProcedures(
  world: World,
): LegislativeStartingProceduresRecord | null {
  const record = (world.history.worldConditions ?? []).find(
    (candidate): candidate is LegislativeStartingProceduresRecord =>
      candidate.kind === "legislative-starting-procedures",
  );
  return record ?? null;
}

export function legislativeProcedureForPack(
  world: World,
  packId: string,
): LegislativeStartingProcedureEntry | null {
  const record = legislativeStartingProcedures(world);
  if (!record) return null;
  return (
    Object.values(record.procedures).find(
      (entry) => entry.baselinePack.packId === packId,
    ) ?? null
  );
}

export function legislativeProcedureForJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): LegislativeStartingProcedureEntry | null {
  const record = legislativeStartingProcedures(world);
  if (!record) return null;
  return (
    Object.values(record.procedures).find(
      (entry) => entry.jurisdictionId === jurisdictionId,
    ) ?? null
  );
}

/** Legacy saves and non-state bodies retain their existing calendar. */
export function regularSessionYearForWorld(
  world: World,
  jurisdictionId: EntityId,
  year: number,
): boolean {
  const entry = legislativeProcedureForJurisdiction(world, jurisdictionId);
  if (!entry || entry.sessionCadence === "annual") return true;
  return (year % 2 === 0 ? "even" : "odd") === entry.sessionYearParity;
}

/** Executable date gate shared by simulation writers and player readers. */
export function regularSessionDateStatus(
  pack: LegislativeRulePack,
  onDate: IsoDate,
):
  | { readonly kind: "unresolved" }
  | {
      readonly kind: "outside-regular-session-year";
      readonly source: RuleSourceRef;
    }
  | {
      readonly kind: "within-outer-limit" | "past-outer-limit";
      readonly deadline: IsoDate;
      readonly source: RuleSourceRef;
    } {
  const year = Number(onDate.slice(0, 4));
  const cadence = pack.session.regularSessionYears;
  if (
    cadence &&
    cadence.value !== "annual" &&
    (year % 2 === 0 ? "even" : "odd") !== cadence.value
  ) {
    return { kind: "outside-regular-session-year", source: cadence.source };
  }
  const limit = pack.session.regularSessionLatestAdjournment;
  if (!limit) return { kind: "unresolved" };
  const boundary = year % 2 ? limit.value.oddYear : limit.value.evenYear;
  const deadline = makeIsoDate(
    `${year}-${String(boundary.month).padStart(2, "0")}-${String(boundary.day).padStart(2, "0")}`,
  );
  return {
    kind: onDate > deadline ? "past-outer-limit" : "within-outer-limit",
    deadline,
    source: limit.source,
  };
}

export function regularSessionRefusalText(
  pack: LegislativeRulePack,
  onDate: IsoDate,
): string | null {
  const status = regularSessionDateStatus(pack, onDate);
  if (status.kind === "outside-regular-session-year") {
    return `The regular session is not scheduled in ${onDate.slice(0, 4)}.`;
  }
  if (status.kind === "past-outer-limit") {
    return `The regular session cannot continue after ${status.deadline}, and nothing calls this legislature into a special session.`;
  }
  return null;
}

function gameProcedureSource(
  entry: LegislativeStartingProcedureEntry,
): RuleSourceRef {
  return {
    authority: "game-profile",
    citation: `Saved starting procedure ${entry.jurisdictionKey}`,
    sourceTitle: `Our Civic Duty starting procedure (${LEGISLATIVE_STARTING_PROCEDURES_VERSION})`,
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note: "This saved world's rule is a bounded game variation from the reference pack, not a statement of current law.",
  };
}

const activePackCache = new WeakMap<
  LegislativeStartingProcedureEntry,
  LegislativeRulePack
>();

/** The saved pack is immutable; its active overlay is rebuilt only from saved fields. */
export function activeLegislativePackFromEntry(
  entry: LegislativeStartingProcedureEntry,
): LegislativeRulePack {
  const cached = activePackCache.get(entry);
  if (cached) return cached;
  const source = gameProcedureSource(entry);
  const baseline = entry.baselinePack;
  const sessionYears =
    entry.sessionCadence === "annual" ? "annual" : entry.sessionYearParity;
  if (!sessionYears) {
    throw new Error(
      `Biennial procedure for ${entry.jurisdictionKey} lacks a year parity.`,
    );
  }
  const sessionDescription =
    sessionYears === "annual"
      ? "Regular sessions occur every year."
      : `Regular sessions occur in ${sessionYears}-numbered years.`;
  const pack: LegislativeRulePack = {
    ...baseline,
    basis: "game-profile",
    session: {
      ...baseline.session,
      regularSessionYears: knownRule(sessionYears, source),
      ...(entry.regularSessionCutoff
        ? {
            regularSessionLatestAdjournment: knownRule(
              {
                oddYear: entry.regularSessionCutoff,
                evenYear: entry.regularSessionCutoff,
              },
              source,
            ),
          }
        : {}),
      adjournmentRule: knownRule(sessionDescription, source),
      measuresDieAtAdjournment: knownRule(!entry.measuresCarryOver, source),
      source,
    },
    enactment: {
      ...baseline.enactment,
      effectiveDateDistinctFromEnactment: knownRule(true, source),
      defaultEffectiveRule: knownRule(
        `The act takes effect ${entry.effectiveDateDays} days after enactment unless it states another date.`,
        source,
      ),
      defaultEffectiveSchedule: knownRule(
        { kind: "days-after-enactment", days: entry.effectiveDateDays },
        source,
      ),
      source,
    },
    sources: [...baseline.sources, source],
  };
  assertRulePackIntegrity(pack);
  activePackCache.set(entry, pack);
  return pack;
}

/** One resolver for writers, replay, integrity, filing, and presentation. */
export function legislativeRulePackForWorld(
  world: World,
  packId: string,
): LegislativeRulePack {
  const entry = legislativeProcedureForPack(world, packId);
  return entry ? activeLegislativePackFromEntry(entry) : rulePackById(packId);
}
