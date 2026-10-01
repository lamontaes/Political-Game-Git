import { annualPovertyLineMinor } from "./crisis/health-coverage";
import { addDays, makeIsoDate } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { createStableId } from "./ids";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { placeOutcomeKey } from "./outcome-web/place-outcome-store";
import { residenceStateKey } from "./statutory-tax";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandler,
  FutureTransitionHandlerResult,
  FutureTransitionKey,
  HistoricalCutoff,
  HouseholdPovertyRecord,
  IsoDate,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";

/**
 * EACH HOUSEHOLD'S MONTHLY POVERTY STATUS, FROM ITS RECORDED PAY.
 *
 * On the first of every month each household the world records is measured
 * for the month just ended: what its living members were actually paid
 * (paychecks the payroll wrote, four weeks of them scaled to a month) against
 * the federal poverty guideline for its size and its state (HHS 2026: 91 FR
 * 1797, read by `annualPovertyLineMinor`). Alaska and Hawaii read their own
 * tables; every other place, the territories included, the 48-state one.
 *
 * A household with someone at work whose pay the world has not recorded yet
 * is "pay-unrecorded": unknown, never counted as zero and never as poor. A
 * household with nobody at work and no pay is below the line, because no pay
 * at all is what the record shows.
 *
 * The record is saved, append-only, so the outcome web (the
 * `household.recorded-poverty-share` measure) and opinion code read the same
 * month the world measured, never a recomputation. Pure: no randomness.
 */

export const HOUSEHOLD_POVERTY_VERSION = "household-poverty-v1" as const;
export const HOUSEHOLD_POVERTY_TRANSITION_KEY =
  "money:household-poverty" as const;

/** The pay window: four weeks of paychecks, as the payroll pays every four. */
const PAY_WINDOW_DAYS = 28;
const DAYS_PER_MONTH = 365.25 / 12;

function firstOfNextMonth(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

/** Schedules the first monthly pass, on the first of next month. Idempotent. */
export function ensureHouseholdPovertySchedule(world: World): World {
  if (
    world.history.futureDueItems.some(
      (item) => item.transitionKey === HOUSEHOLD_POVERTY_TRANSITION_KEY,
    )
  )
    return world;
  const dueAt = firstOfNextMonth(makeIsoDate(world.currentDate));
  return scheduleFutureDueItem(world, {
    stableKey: `${HOUSEHOLD_POVERTY_VERSION}:pass:${dueAt.slice(0, 7)}`,
    dueAt,
    transitionKey: HOUSEHOLD_POVERTY_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: {
      kind: "initialization",
      reference: HOUSEHOLD_POVERTY_VERSION,
    },
  });
}

/** Each person's actual paychecks from work in the window, in cents. */
function paychecksByPerson(
  world: World,
  from: IsoDate,
  to: IsoDate,
): ReadonlyMap<EntityId, { total: number; count: number }> {
  const recipient = new Map<EntityId, EntityId>();
  for (const flow of world.history.resourceFlows)
    if (flow.basisReference.kind === "work" && flow.recipient.kind === "person")
      recipient.set(flow.id, flow.recipient.personId);
  const pay = new Map<EntityId, { total: number; count: number }>();
  for (const outcome of world.history.resourceTransferOutcomes) {
    const personId = recipient.get(outcome.resourceFlowId);
    if (!personId) continue;
    if (outcome.occurredAt <= from || outcome.occurredAt > to) continue;
    const entry = pay.get(personId) ?? { total: 0, count: 0 };
    entry.total += outcome.transferredAmount.minorUnits;
    entry.count += 1;
    pay.set(personId, entry);
  }
  return pay;
}

/** Every household's status for the month ending on `monthEnd`. */
export function householdPovertyForMonth(
  world: World,
  monthEnd: IsoDate,
): readonly Omit<
  HouseholdPovertyRecord,
  "id" | "stableKey" | "sequence" | "recordedAt"
>[] {
  const cutoff: HistoricalCutoff = {
    asOfDate: monthEnd,
    historySequenceExclusive: world.history.nextSequence,
  };
  const pay = paychecksByPerson(
    world,
    addDays(monthEnd, -PAY_WINDOW_DAYS),
    monthEnd,
  );
  const month = monthEnd.slice(0, 7);
  const rows: Omit<
    HouseholdPovertyRecord,
    "id" | "stableKey" | "sequence" | "recordedAt"
  >[] = [];
  for (const household of world.history.households) {
    const memberIds = peopleInHouseholdAt(world, household.id, cutoff).filter(
      (id) => isPersonAliveAt(world, id, cutoff),
    );
    if (memberIds.length === 0) continue;
    const first = world.people[memberIds[0]!];
    const stateKey = residenceStateKey(world, memberIds[0]!);
    if (!first || !stateKey) continue;
    const annual = annualPovertyLineMinor(stateKey, memberIds.length, monthEnd);
    const monthlyGuidelineMinor = Math.round(annual / 12);
    // Someone at work with no paycheck in the window: the household's pay is
    // not recorded yet, and unknown is not zero.
    const unrecorded = memberIds.some(
      (id) =>
        activeWorkRelationshipsAt(world, id, cutoff).length > 0 &&
        !pay.get(id)?.count,
    );
    const windowTotal = memberIds.reduce(
      (sum, id) => sum + (pay.get(id)?.total ?? 0),
      0,
    );
    const monthlyPayMinor = unrecorded
      ? null
      : Math.round((windowTotal * DAYS_PER_MONTH) / PAY_WINDOW_DAYS);
    rows.push({
      householdId: household.id,
      jurisdictionId: first.homeJurisdictionId,
      month,
      stateKey,
      memberIds,
      monthlyGuidelineMinor,
      monthlyPayMinor,
      status:
        monthlyPayMinor === null
          ? "pay-unrecorded"
          : monthlyPayMinor < monthlyGuidelineMinor
            ? "below"
            : "at-or-above",
    });
  }
  return rows;
}

/** Appends the month's records once; a month already recorded is left alone. */
export function recordHouseholdPoverty(world: World, monthEnd: IsoDate): World {
  const month = monthEnd.slice(0, 7);
  const existing = world.history.householdPoverty ?? [];
  if (existing.some((row) => row.month === month)) return world;
  let sequence = world.history.nextSequence;
  const added = householdPovertyForMonth(world, monthEnd).map((draft) => {
    const stableKey = `${HOUSEHOLD_POVERTY_VERSION}:${draft.householdId}:${month}`;
    const record: HouseholdPovertyRecord = {
      ...draft,
      id: createStableId("household-poverty", `${world.id}:${stableKey}`),
      stableKey,
      sequence,
      recordedAt: world.currentDate,
    };
    sequence += 1;
    return record;
  });
  if (added.length === 0) return world;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence,
      householdPoverty: [...existing, ...added],
    },
  };
}

export function householdPovertyHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== HOUSEHOLD_POVERTY_TRANSITION_KEY)
    throw new Error("The household poverty pass received another transition.");
  const due = makeIsoDate(dueItem.dueAt);
  const before = world.history.householdPoverty?.length ?? 0;
  let next = recordHouseholdPoverty(world, addDays(due, -1));
  const following = firstOfNextMonth(due);
  next = scheduleFutureDueItem(next, {
    stableKey: `${HOUSEHOLD_POVERTY_VERSION}:pass:${following.slice(0, 7)}`,
    dueAt: following,
    transitionKey: HOUSEHOLD_POVERTY_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey:
      (next.history.householdPoverty?.length ?? 0) > before
        ? "household-poverty:recorded"
        : "household-poverty:already",
    context: null,
    outcomeEventId: null,
  };
}

let householdPovertyHandlersCache:
  | readonly (readonly [FutureTransitionKey, FutureTransitionHandler])[]
  | undefined;

/** Build after module loading, so import cycles cannot capture an unset key. */
export function householdPovertyHandlers(): readonly (readonly [
  FutureTransitionKey,
  FutureTransitionHandler,
])[] {
  return (householdPovertyHandlersCache ??= [
    [HOUSEHOLD_POVERTY_TRANSITION_KEY, householdPovertyHandler],
  ] as const);
}

/* -------------------------------------------------------------------------- */
/* Readers                                                                     */
/* -------------------------------------------------------------------------- */

/** The newest recorded month on or before `asOf`, "YYYY-MM", or null. */
function latestMonth(world: World, asOf: IsoDate): string | null {
  let latest: string | null = null;
  for (const row of world.history.householdPoverty ?? [])
    if (row.recordedAt <= asOf && (latest === null || row.month > latest))
      latest = row.month;
  return latest;
}

/** A household's newest saved status on or before `asOf`, or null. */
export function householdPovertyAt(
  world: World,
  householdId: EntityId,
  asOf: IsoDate,
): HouseholdPovertyRecord | null {
  let found: HouseholdPovertyRecord | null = null;
  for (const row of world.history.householdPoverty ?? [])
    if (
      row.householdId === householdId &&
      row.recordedAt <= asOf &&
      (found === null || row.month > found.month)
    )
      found = row;
  return found;
}

/**
 * The status of the household a person lives in, as last measured, for the
 * opinion code: "below", "at-or-above", "pay-unrecorded", or null when the
 * person's household has no saved month yet.
 */
export function personPovertyStatusAt(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): HouseholdPovertyRecord["status"] | null {
  const household = householdMembershipsAt(world, personId)[0];
  if (!household) return null;
  return (
    householdPovertyAt(world, household.household.id, asOf)?.status ?? null
  );
}

/**
 * The share of a place's households below the guideline in the newest
 * recorded month, counting only households whose pay is recorded. A state
 * reads every household in it; a city or county reads its own. Null when no
 * household there has a recorded month: unknown, never zero.
 */
export function recordedPovertyShare(
  world: World,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): number | null {
  const month = latestMonth(world, asOf);
  if (month === null) return null;
  const stateKey = placeOutcomeKey(jurisdictionId);
  let below = 0;
  let known = 0;
  for (const row of world.history.householdPoverty ?? []) {
    if (row.month !== month || row.status === "pay-unrecorded") continue;
    if (row.jurisdictionId !== jurisdictionId && row.stateKey !== stateKey)
      continue;
    known += 1;
    if (row.status === "below") below += 1;
  }
  return known === 0 ? null : below / known;
}

/* -------------------------------------------------------------------------- */
/* Integrity                                                                   */
/* -------------------------------------------------------------------------- */

/** Saved months must reconcile: unique, in order, real households and people. */
export function assertHouseholdPovertyIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const rows = world.history.householdPoverty ?? [];
  const households = new Set(world.history.households.map((row) => row.id));
  const keys = new Set<string>();
  let lastSequence = -1;
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`Duplicate entity ID: ${row.id}`);
    ids.add(row.id);
    if (keys.has(row.stableKey))
      throw new Error("Duplicate household poverty identity.");
    keys.add(row.stableKey);
    if (row.sequence <= lastSequence)
      throw new Error("Household poverty records must be in sequence order.");
    lastSequence = row.sequence;
    if (!households.has(row.householdId))
      throw new Error("A household poverty record names an unknown household.");
    if (
      row.memberIds.length === 0 ||
      row.memberIds.some((id) => !world.people[id])
    )
      throw new Error("A household poverty record names an unknown member.");
    if (!/^\d{4}-\d{2}$/.test(row.month))
      throw new Error("A household poverty record's month is malformed.");
    if (!(row.monthlyGuidelineMinor > 0))
      throw new Error("A household poverty record has no guideline.");
    const expected =
      row.monthlyPayMinor === null
        ? "pay-unrecorded"
        : row.monthlyPayMinor < row.monthlyGuidelineMinor
          ? "below"
          : "at-or-above";
    if (row.status !== expected)
      throw new Error(
        "A household poverty record's status contradicts its pay.",
      );
  }
}
