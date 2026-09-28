import type { World } from "./types";

/**
 * The play-time World check: what one clock press changed, not the whole
 * World again.
 *
 * The full check (`validateWorldIntegrity` in world.ts) walks every history
 * record the World holds, so it grew with the size of the World and the
 * length of the life, and it ran after every Day. A clock result whose old
 * history records are all the same
 * objects in the same places (the append-only delta world.ts proves first)
 * only needs its new records checked:
 *
 * - each new record's id is new to the whole World;
 * - each new record's stable key is new to its family, for the families
 *   whose stable keys the full check holds unique;
 * - each family's new records continue its sequence order.
 *
 * What this does not recheck is the cross-record reasoning of each family's
 * own validator (that a new record's references resolve). Writers check their
 * own inputs; the full check still runs on opening a save, on an explicit
 * save, in tests, behind the dev flag below, and whenever this check cannot
 * vouch for a result. Any doubt here — a missing
 * index, a collision, an unfamiliar shape — returns false and the caller runs
 * the full check, which is the authority and gives the real error.
 */

export type WorldIntegrityCheckMode = "full" | "changed";

interface CheckModeGlobals {
  /** Dev flag: set to true (for example in the browser console) to run the full check on every World again. */
  readonly __civicFullWorldCheck?: boolean;
  readonly process?: { readonly env?: Record<string, string | undefined> };
}

function defaultMode(): WorldIntegrityCheckMode {
  // Tests keep the full check after every advance; play checks what changed.
  // OCD_FULL_WORLD_CHECK=1 turns the full check back on for a Node tool.
  const env = (globalThis as CheckModeGlobals).process?.env;
  return env?.VITEST || env?.OCD_FULL_WORLD_CHECK === "1" ? "full" : "changed";
}

let mode: WorldIntegrityCheckMode = defaultMode();

export function worldIntegrityCheckMode(): WorldIntegrityCheckMode {
  if ((globalThis as CheckModeGlobals).__civicFullWorldCheck === true)
    return "full";
  return mode;
}

/** For tests and tools: choose how a clock result is checked. */
export function setWorldIntegrityCheckMode(
  next: WorldIntegrityCheckMode,
): WorldIntegrityCheckMode {
  const previous = mode;
  mode = next;
  return previous;
}

/** The families whose stable keys the full check holds unique. */
const UNIQUE_STABLE_KEY_FAMILIES: ReadonlySet<string> = new Set([
  "events",
  "memories",
  "knowledge",
  "claims",
  "relationshipInteractions",
  "propositionExposures",
  "privateBeliefs",
  "publicPositions",
  "campaignCommitments",
  "electionContests",
  "districtResidenceIntervals",
  "electionContestResults",
  "legislativeMeasures",
  "legislativeActions",
  "committeeReferrals",
  "committeeActions",
  "legislativeAmendments",
  "legislativeProvisions",
  "legislativeDraftLineages",
  "officeWorkflowPreferences",
  "officeVoteInstructions",
  "officeBriefingInspections",
  "legislativeCommitments",
  "legislativeNegotiations",
  "legislativeVotes",
  "executiveDispositions",
  "legislativeEnactments",
  "publications",
  "principles",
  "subjectKnowledge",
]);

interface ChangedCheckIndex {
  /** Every id the World holds, as of the World that owns this index. */
  readonly ids: Set<string>;
  /** Stable keys per family, built the first time a family needs them. */
  readonly stableKeys: Map<string, Set<string>>;
}

/**
 * One index, owned by the latest World it describes. It moves forward to the
 * next World when that World passes; a World it has moved past has none, and
 * a check from that World runs in full. So the sets are only ever mutated for
 * the one World they describe.
 */
const INDEX = new WeakMap<World, ChangedCheckIndex>();

function idsOf(world: World): Set<string> {
  const ids = new Set<string>([
    world.id,
    ...world.jurisdictionOrder,
    ...world.personOrder,
  ]);
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person) continue;
    for (const fact of person.establishedFacts) ids.add(fact.id);
    if (person.detailLevel === "materialized")
      for (const fact of person.details.generatedFacts) ids.add(fact.id);
  }
  const history = world.history as unknown as Record<string, unknown>;
  for (const key of Object.keys(history)) {
    const records = history[key];
    if (!Array.isArray(records)) continue;
    for (const record of records as readonly unknown[]) {
      const id = (record as { id?: unknown } | null)?.id;
      if (typeof id === "string") ids.add(id);
    }
  }
  return ids;
}

export interface ChangedHistoryFamily {
  readonly key: string;
  readonly before: readonly unknown[];
  readonly after: readonly unknown[];
}

/** How often the changed-only check vouched for a result, for timing tools. */
export const changedHistoryCheckCounts = {
  passed: 0,
  fellBack: 0,
  /** Full walks taken in play: no checked World to compare with. */
  fullNoPrevious: 0,
  /** Full walks taken in play: history was not a plain append. */
  fullNotAppend: 0,
  /** Full walks taken in play: people, places or the policy catalog changed. */
  fullEntitiesChanged: 0,
};

/** Checks the appended records only. False means "run the full check". */
export function validateChangedHistory(
  previous: World,
  world: World,
  families: readonly ChangedHistoryFamily[],
  /** Ids of entities the result added outside history (places, people). */
  addedEntityIds: readonly string[] = [],
  /** Ids a changed person carries: kept from before, or new to the World. */
  keptOrNewIds: readonly string[] = [],
): boolean {
  const passed = checkChangedHistory(
    previous,
    world,
    families,
    addedEntityIds,
    keptOrNewIds,
  );
  if (passed) changedHistoryCheckCounts.passed += 1;
  else changedHistoryCheckCounts.fellBack += 1;
  return passed;
}

function checkChangedHistory(
  previous: World,
  world: World,
  families: readonly ChangedHistoryFamily[],
  addedEntityIds: readonly string[],
  keptOrNewIds: readonly string[],
): boolean {
  const index = INDEX.get(previous) ?? {
    ids: idsOf(previous),
    stableKeys: new Map<string, Set<string>>(),
  };
  // The new records fill exactly the sequences after the old ones.
  const firstSequence = previous.history.nextSequence;
  const count = world.history.nextSequence - firstSequence;
  if (!Number.isSafeInteger(count) || count < 0) return false;
  const seen = new Uint8Array(count);
  let appended = 0;
  const newIds = new Set<string>();
  const newKeys = new Map<string, Set<string>>();
  for (const id of addedEntityIds) {
    if (index.ids.has(id) || newIds.has(id)) return false;
    newIds.add(id);
  }
  for (const id of keptOrNewIds) {
    if (index.ids.has(id)) continue;
    if (newIds.has(id)) return false;
    newIds.add(id);
  }
  for (const { key, before, after } of families) {
    let lastSequence =
      before.length > 0
        ? (before[before.length - 1] as { sequence: number }).sequence
        : -Infinity;
    const checkKeys = UNIQUE_STABLE_KEY_FAMILIES.has(key);
    let known: Set<string> | undefined;
    if (checkKeys) {
      known = index.stableKeys.get(key);
      if (!known) {
        known = new Set<string>();
        for (const record of before) {
          const stableKey = (record as { stableKey?: unknown }).stableKey;
          if (typeof stableKey === "string") known.add(stableKey);
        }
        index.stableKeys.set(key, known);
      }
    }
    for (let at = before.length; at < after.length; at += 1) {
      const record = after[at] as {
        readonly id?: unknown;
        readonly stableKey?: unknown;
        readonly sequence: number;
      };
      if (typeof record !== "object" || record === null) return false;
      if (!(record.sequence > lastSequence)) return false;
      lastSequence = record.sequence;
      const offset = record.sequence - firstSequence;
      if (
        !Number.isInteger(offset) ||
        offset < 0 ||
        offset >= count ||
        seen[offset] === 1
      )
        return false;
      seen[offset] = 1;
      appended += 1;
      if (record.id !== undefined) {
        if (typeof record.id !== "string" || record.id.trim() === "")
          return false;
        if (index.ids.has(record.id) || newIds.has(record.id)) return false;
        newIds.add(record.id);
      }
      if (checkKeys && record.stableKey !== undefined) {
        if (typeof record.stableKey !== "string") return false;
        let added = newKeys.get(key);
        if (!added) newKeys.set(key, (added = new Set<string>()));
        if (known!.has(record.stableKey) || added.has(record.stableKey))
          return false;
        added.add(record.stableKey);
      }
    }
  }
  if (appended !== count) return false;
  // Everything passed: this World now owns the index.
  for (const id of newIds) index.ids.add(id);
  for (const [key, added] of newKeys) {
    const known = index.stableKeys.get(key)!;
    for (const stableKey of added) known.add(stableKey);
  }
  INDEX.delete(previous);
  INDEX.set(world, index);
  return true;
}
