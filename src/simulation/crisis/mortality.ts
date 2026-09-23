import { addDays, isoDateFromParts, makeIsoDate } from "../dates";
import {
  scheduleFutureDueItem,
  scheduledFutureDueItemsThrough,
} from "../future-transitions";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandler,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt, recordPersonDeath } from "../vitality";
import { assertWorldIntegrity } from "../world";
import { survivalThresholdFromDraws } from "./fixed-point";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
  type HazardMultiplierChange,
  type HazardProfile,
} from "./hazard";
import {
  SSA_2023_TABLE_ID,
  type MortalityCalibrationCategory,
} from "./mortality-table";
import { recordOfficialContinuity } from "./continuity";
import {
  FATAL_ILLNESS_LEAD_DAYS,
  FATAL_ILLNESS_ONSET_KEY,
  deathCauseSummary,
  drawDeathCause,
  fatalIllnessOnsetStableKey,
  hazardDeathCause,
} from "./death-causes";
import { closeHealthEpisodesForDeath } from "./health-queries";
import { appendCrisisRecord, crisisRecordId, crisisRecords } from "./records";
import {
  CRISIS_MORTALITY_MODEL,
  type HealthEpisodeRecord,
  type MortalityWindowRecord,
} from "./types";

/**
 * K1 ordinary all-cause mortality.
 *
 * On the first day of each quarter one Run A due item exposes every living person
 * the World holds. Each person's stable threshold −ln(u) is drawn once from a
 * domain-separated fork keyed only by world seed and person, never from UI or
 * shared RNG state. The window finds the exact day, if any, on which that
 * person's accumulated hazard reaches the threshold and schedules a death on
 * that day. Office, party and fame change nothing. A life table is not a
 * diagnosis: the death carries only a broad seeded cause group
 * (./death-causes.ts), and an illness with a course is recorded ahead of the
 * death it leads to without moving that death's day.
 */

export const MORTALITY_WINDOW_KEY = "crisis:mortality-window" as const;
export const MORTALITY_DEATH_KEY = "crisis:mortality-death" as const;
/**
 * The cause key every K1 death carried before causes were drawn. Saves keep
 * it; it renders as a plain "died" and is never reinterpreted.
 */
export const MORTALITY_CAUSE_KEY = "crisis-mortality:all-cause-unresolved";

const THRESHOLD_VERSION = "crisis-mortality-threshold-v1";

/**
 * Windows open on the first day of each calendar quarter. Deaths inside a
 * window are still scheduled on their exact day; the quarter only bounds how
 * far ahead a pending death item can exist.
 */
function firstOfNextQuarter(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const nextQuarterMonth = (Math.floor((month - 1) / 3) + 1) * 3 + 1;
  return nextQuarterMonth > 12
    ? isoDateFromParts(year + 1, 1, 1)
    : isoDateFromParts(year, nextQuarterMonth, 1);
}

export function personMortalityThreshold(
  world: World,
  personId: EntityId,
): bigint {
  const fork = new SeededRng(THRESHOLD_VERSION).fork(
    JSON.stringify([THRESHOLD_VERSION, world.seed, personId]),
  );
  return survivalThresholdFromDraws(fork.nextUint32(), fork.nextUint32());
}

function windowRecords(world: World): readonly MortalityWindowRecord[] {
  return crisisRecords(world).filter(
    (record): record is MortalityWindowRecord =>
      record.kind === "mortality-window",
  );
}

/**
 * Everything the hazard reads about people, indexed once per immutable
 * record array so a quarterly pass is linear in people.
 */
interface MortalityContext {
  readonly starts: ReadonlyMap<EntityId, IsoDate>;
  readonly calibrations: ReadonlyMap<EntityId, MortalityCalibrationCategory>;
  readonly multipliers: ReadonlyMap<
    EntityId,
    readonly HazardMultiplierChange[]
  >;
}

const CONTEXTS = new WeakMap<object, MortalityContext>();

function mortalityContext(world: World): MortalityContext {
  const records = crisisRecords(world);
  const cached = CONTEXTS.get(records);
  if (cached) return cached;
  const starts = new Map<EntityId, IsoDate>();
  const calibrations = new Map<EntityId, MortalityCalibrationCategory>();
  const episodesByPerson = new Map<EntityId, HealthEpisodeRecord[]>();
  const endByEpisode = new Map<EntityId, IsoDate>();
  for (const record of records) {
    switch (record.kind) {
      case "mortality-window":
        for (const personId of record.newlyTrackedPersonIds)
          if (!starts.has(personId)) starts.set(personId, record.effectiveAt);
        break;
      case "mortality-calibration":
        calibrations.set(record.personId, record.category);
        break;
      case "health-episode":
        if (record.hazardMultiplierMicros !== MULTIPLIER_ONE) {
          const list = episodesByPerson.get(record.personId) ?? [];
          list.push(record);
          episodesByPerson.set(record.personId, list);
        }
        break;
      case "health-state":
        if (
          (record.state === "recovered" || record.state === "deceased") &&
          !endByEpisode.has(record.episodeId)
        )
          endByEpisode.set(record.episodeId, record.effectiveAt);
        break;
      default:
        break;
    }
  }
  const multipliers = new Map<EntityId, readonly HazardMultiplierChange[]>();
  for (const [personId, episodes] of episodesByPerson)
    multipliers.set(personId, multiplierTimeline(episodes, endByEpisode));
  const context = { starts, calibrations, multipliers };
  CONTEXTS.set(records, context);
  return context;
}

/**
 * Several active episodes multiply; an ended episode stops contributing on
 * the day it ends.
 */
function multiplierTimeline(
  episodes: readonly HealthEpisodeRecord[],
  endByEpisode: ReadonlyMap<EntityId, IsoDate>,
): readonly HazardMultiplierChange[] {
  const intervals = episodes.map((episode) => ({
    start: episode.effectiveAt,
    end: endByEpisode.get(episode.id) ?? null,
    micros: BigInt(episode.hazardMultiplierMicros),
  }));
  const dates = [
    ...new Set(
      intervals.flatMap((interval) =>
        interval.end ? [interval.start, interval.end] : [interval.start],
      ),
    ),
  ].sort();
  return dates.map((date) => {
    let micros = BigInt(MULTIPLIER_ONE);
    for (const interval of intervals)
      if (
        interval.start <= date &&
        (interval.end === null || date < interval.end)
      )
        micros = (micros * interval.micros) / BigInt(MULTIPLIER_ONE);
    return { effectiveAt: date, micros: Number(micros) };
  });
}

/** First exposure day per person, from the window that first tracked them. */
export function mortalityExposureStarts(
  world: World,
): ReadonlyMap<EntityId, IsoDate> {
  return mortalityContext(world).starts;
}

export function mortalityCalibrationOf(
  world: World,
  personId: EntityId,
): MortalityCalibrationCategory {
  return mortalityContext(world).calibrations.get(personId) ?? "equal-mixture";
}

export function hazardMultipliersOf(
  world: World,
  personId: EntityId,
): readonly HazardMultiplierChange[] {
  return mortalityContext(world).multipliers.get(personId) ?? [];
}

export function mortalityProfile(
  world: World,
  personId: EntityId,
  exposureStart: IsoDate,
): HazardProfile {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing mortality person: ${personId}`);
  return {
    birthDate: person.birthDate,
    category: mortalityCalibrationOf(world, personId),
    exposureStart,
    multipliers: hazardMultipliersOf(world, personId),
  };
}

const THRESHOLDS = new Map<string, bigint>();

/** The exact day this person's hazard crosses their threshold in [from, to). */
export function mortalityCrossingDay(
  world: World,
  personId: EntityId,
  from: IsoDate,
  to: IsoDate,
): IsoDate | null {
  const start = mortalityExposureStarts(world).get(personId);
  if (!start) return null;
  const thresholdKey = `${world.seed}\u0000${personId}`;
  let threshold = THRESHOLDS.get(thresholdKey);
  if (threshold === undefined) {
    threshold = thresholdUnits(personMortalityThreshold(world, personId));
    if (THRESHOLDS.size > 100_000) THRESHOLDS.clear();
    THRESHOLDS.set(thresholdKey, threshold);
  }
  return firstThresholdDay(
    mortalityProfile(world, personId, start),
    threshold,
    from,
    to,
  );
}

function alive(world: World, personId: EntityId, date: IsoDate): boolean {
  const person = world.people[personId];
  return (
    !!person &&
    person.birthDate <= date &&
    isPersonAliveAt(world, personId, {
      asOfDate: date,
      historySequenceExclusive: world.history.nextSequence,
    })
  );
}

function windowStableKey(start: IsoDate): string {
  return `crisis:mortality:window:${start}`;
}

/**
 * Starts the model for this World if it is not already running. Existing
 * saves begin exposure at their next quarter boundary; earlier history is not
 * reinterpreted.
 */
export function ensureCrisisMortality(world: World): World {
  if (
    world.history.futureDueItems.some(
      (item) => item.transitionKey === MORTALITY_WINDOW_KEY,
    )
  )
    return world;
  const start = firstOfNextQuarter(world.currentDate);
  const next = scheduleFutureDueItem(world, {
    stableKey: `${windowStableKey(start)}:due`,
    dueAt: start,
    transitionKey: MORTALITY_WINDOW_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: {
      kind: "initialization",
      reference: `${CRISIS_MORTALITY_MODEL}:${SSA_2023_TABLE_ID}`,
    },
  });
  assertWorldIntegrity(next);
  return next;
}

function deathStableKey(personId: EntityId, date: IsoDate): string {
  return `crisis:mortality:death:${personId}:${date}`;
}

/**
 * Schedules (or, for today, records) the death this person's current hazard
 * implies inside [from, windowEnd). Used by the window and by any writer that
 * changes a person's hazard mid-window.
 */
export function scheduleMortalityWithin(
  world: World,
  personId: EntityId,
  from: IsoDate,
  windowEnd: IsoDate,
  cause: { readonly sourceEntityId: EntityId },
  crossing?: IsoDate | null,
): World {
  if (!alive(world, personId, world.currentDate)) return world;
  const day =
    crossing === undefined
      ? mortalityCrossingDay(world, personId, from, windowEnd)
      : crossing !== null && crossing < windowEnd
        ? crossing
        : null;
  if (day === null) return world;
  if (day <= world.currentDate)
    return recordMortalityDeath(
      world,
      personId,
      world.currentDate,
      cause.sourceEntityId,
    );
  const stableKey = `${deathStableKey(personId, day)}:due`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: day,
    transitionKey: MORTALITY_DEATH_KEY,
    entityIds: [personId],
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [cause.sourceEntityId] },
  });
}

function recordMortalityDeath(
  world: World,
  personId: EntityId,
  diedAt: IsoDate,
  sourceEntityId: EntityId,
): World {
  const cause = hazardDeathCause(world, personId, diedAt);
  const sources = [
    ...new Set(
      cause.episodeId ? [sourceEntityId, cause.episodeId] : [sourceEntityId],
    ),
  ].sort();
  const withDeath = recordPersonDeath(world, {
    stableKey: deathStableKey(personId, diedAt),
    personId,
    diedAt,
    causeKey: cause.causeKey,
    sourceEntityIds: sources,
    summary: deathCauseSummary(cause.causeKey),
    provenance: { kind: "simulated", sourceEntityIds: sources },
  });
  const death = withDeath.history.personDeaths.at(-1)!;
  const closed = closeHealthEpisodesForDeath(withDeath, personId, death.id);
  return recordOfficialContinuity(world, closed, personId, "death");
}

export const mortalityWindowHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const start = item.dueAt;
  const end = firstOfNextQuarter(start);
  const tracked = new Set(mortalityExposureStarts(world).keys());
  const newly = world.personOrder.filter(
    (id) => !tracked.has(id) && alive(world, id, start),
  );
  let next = appendCrisisRecord(world, {
    kind: "mortality-window",
    stableKey: windowStableKey(start),
    effectiveAt: start,
    causalParentIds: [item.id],
    visibility: "private",
    eventId: null,
    model: CRISIS_MORTALITY_MODEL,
    tableId: SSA_2023_TABLE_ID,
    windowEnd: end,
    newlyTrackedPersonIds: newly,
    dueItemId: item.id,
  });
  const windowId = crisisRecordId(next, windowStableKey(start));
  // One look past the window, far enough to see a death whose illness should
  // begin inside it. The first crossing in the longer span is the same day as
  // the first crossing in the window whenever it falls inside the window.
  const horizon = addDays(end, FATAL_ILLNESS_LEAD_DAYS.max);
  for (const personId of next.personOrder) {
    if (!alive(next, personId, start)) continue;
    const crossing = mortalityCrossingDay(next, personId, start, horizon);
    next = scheduleMortalityWithin(
      next,
      personId,
      start,
      end,
      { sourceEntityId: windowId },
      crossing,
    );
    if (crossing !== null)
      next = scheduleFatalIllnessOnset(next, personId, crossing, end, windowId);
  }
  next = scheduleFutureDueItem(next, {
    stableKey: `${windowStableKey(end)}:due`,
    dueAt: end,
    transitionKey: MORTALITY_WINDOW_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [windowId] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:mortality-window",
    context: `Exposed ${newly.length} newly tracked people.`,
    outcomeEventId: null,
  };
};

export const mortalityDeathHandler: FutureTransitionHandler = (
  world,
  item: FutureDueItem,
) => {
  const personId = item.entityIds[0]!;
  const cancelled = (context: string) => ({
    world,
    status: "cancelled" as const,
    reasonKey: "crisis:mortality-superseded" as const,
    context,
    outcomeEventId: null,
  });
  if (!alive(world, personId, item.dueAt))
    return cancelled("The person was no longer alive.");
  const window = windowRecords(world).at(-1);
  if (!window) return cancelled("No mortality window is active.");
  // The day must still be the person's crossing under current records.
  const day = mortalityCrossingDay(
    world,
    personId,
    window.effectiveAt,
    window.windowEnd,
  );
  if (day !== item.dueAt)
    return cancelled("A later hazard change moved the crossing day.");
  const next = recordMortalityDeath(world, personId, item.dueAt, item.id);
  const death = next.history.personDeaths.at(-1)!;
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:mortality-death",
    context: null,
    outcomeEventId: death.eventId,
  };
};

/**
 * When the death on `diesOn` is an illness with a course, puts the day the
 * illness is first recorded on the clock, if that day falls in this window.
 * Only the onset is scheduled here; the death keeps its own due item and its
 * own day. Nothing is scheduled when no day before the death is left.
 */
function scheduleFatalIllnessOnset(
  world: World,
  personId: EntityId,
  diesOn: IsoDate,
  windowEnd: IsoDate,
  windowId: EntityId,
): World {
  const draw = drawDeathCause(world, personId, diesOn);
  if (draw.group !== "illness-with-course") return world;
  const earliest = addDays(world.currentDate, 1);
  const planned = addDays(diesOn, -draw.leadDays);
  const onset = planned < earliest ? earliest : planned;
  if (onset >= diesOn || onset >= windowEnd) return world;
  const stableKey = fatalIllnessOnsetStableKey(personId, diesOn);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: onset,
    transitionKey: FATAL_ILLNESS_ONSET_KEY,
    entityIds: [personId],
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [windowId] },
  });
}

/**
 * The next day on which a death of this person could be written by K1: a
 * window opening (which may find a death that day) or their scheduled death.
 * A multi-week advance steps to it so a played life ends on its own day.
 */
export function nextMortalityFrontier(
  world: World,
  personId: EntityId,
  throughInclusive: IsoDate,
): IsoDate | null {
  const from = addDays(world.currentDate, 1);
  if (throughInclusive < from) return null;
  let next: IsoDate | null = null;
  for (const item of scheduledFutureDueItemsThrough(
    world,
    from,
    throughInclusive,
  )) {
    const relevant =
      item.transitionKey === MORTALITY_WINDOW_KEY ||
      (item.transitionKey === MORTALITY_DEATH_KEY &&
        item.entityIds.includes(personId));
    if (relevant && (next === null || item.dueAt < next)) next = item.dueAt;
  }
  return next;
}

/** Whether K1 has a window on the clock for this World. */
export function crisisMortalityRunning(world: World): boolean {
  return world.history.futureDueItems.some(
    (item) => item.transitionKey === MORTALITY_WINDOW_KEY,
  );
}

export function crisisMortalityWindowAt(
  world: World,
  date: IsoDate,
): MortalityWindowRecord | null {
  const target = makeIsoDate(date);
  return (
    windowRecords(world).find(
      (window) => window.effectiveAt <= target && target < window.windowEnd,
    ) ?? null
  );
}
