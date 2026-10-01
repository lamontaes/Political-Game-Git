import { addDays, isoDateFromParts, makeIsoDate } from "../dates";
import {
  scheduleFutureDueItem,
  scheduledFutureDueItemsThrough,
} from "../future-transitions";
import { tellOfDeath } from "../people-bereavement";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandler,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt, recordPersonDeath } from "../vitality";
import { assertWorldIntegrity } from "../world";
import { FIXED_LN2 } from "./fixed-point";
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
  DEATH_CAUSE_ILLNESS_WITH_COURSE,
  FATAL_ILLNESS_EPISODE_PREFIX,
  FATAL_ILLNESS_ONSET_KEY,
  deathCauseSummary,
  seriousEpisodeOnsetStableKey,
} from "./death-causes";
import {
  coverageHazardIntervals,
  ensureHealthCoveragePass,
  HEALTH_COVERAGE_KEY,
  type HazardInterval,
} from "./health-coverage";
import {
  activeHealthEpisodes,
  closeHealthEpisodesForDeath,
} from "./health-queries";
import { appendCrisisRecord, crisisRecordId, crisisRecords } from "./records";
import {
  CRISIS_MORTALITY_MODEL,
  type HealthCoverageRecord,
  type HealthEpisodeRecord,
  type MortalityWindowRecord,
} from "./types";

/**
 * K1 ordinary all-cause mortality, as Ruling 29 has it: deaths without dice.
 *
 * Each person carries a strain total that grows every day from recorded
 * causes only: their age (the SSA 2023 period life table's daily hazard is the
 * base rate), and the recorded health episodes and coverage that multiply it.
 * A serious health episode begins on the day the total crosses one fixed
 * threshold, the same number for everyone, so people differ only by their
 * records. The episode then carries a number of remaining days
 * (./death-causes.ts, remainingDaysAfterOnset), and the death is written on
 * that day and cites the episode. Office, party and fame change nothing.
 *
 * Nothing scans the world every day. On the first day of each quarter one due
 * item reads each living person's strain, computed on read from the dates and
 * records (./hazard.ts keeps checkpoints), and puts the day it crosses, if it
 * falls in the quarter, on the clock. A writer that changes a person's records
 * mid-quarter re-reads that one person.
 */

export const MORTALITY_WINDOW_KEY = "crisis:mortality-window" as const;
export const MORTALITY_DEATH_KEY = "crisis:mortality-death" as const;
export { MORTALITY_CAUSE_KEY } from "./death-causes";

/**
 * The one strain threshold, in hazard units, the same for everyone. Ruling 29
 * scales the base rate so the whole population matches the life table: the
 * table's daily hazard counts against a threshold of ln 2, which is the same
 * as a base rate of the table's hazard over ln 2 against a threshold of one.
 * A person whose records multiply nothing then reaches it at the table's
 * median remaining life from the day they were first exposed: half of the
 * people of their age in the table are still alive on that day. The table
 * checks that total; it never decides one person's day.
 */
export const STRAIN_THRESHOLD = FIXED_LN2;
const STRAIN_THRESHOLD_UNITS = thresholdUnits(STRAIN_THRESHOLD);

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
  /** Health episodes that multiply a person's strain, with their end day. */
  readonly conditions: ReadonlyMap<
    EntityId,
    readonly { readonly episode: HealthEpisodeRecord; end: IsoDate | null }[]
  >;
  /** A person's coverage records, oldest first. */
  readonly coverage: ReadonlyMap<EntityId, readonly HealthCoverageRecord[]>;
}

const CONTEXTS = new WeakMap<object, MortalityContext>();

function mortalityContext(world: World): MortalityContext {
  const records = crisisRecords(world);
  const cached = CONTEXTS.get(records);
  if (cached) return cached;
  const starts = new Map<EntityId, IsoDate>();
  const calibrations = new Map<EntityId, MortalityCalibrationCategory>();
  const episodesByPerson = new Map<EntityId, HealthEpisodeRecord[]>();
  const coverageByPerson = new Map<EntityId, HealthCoverageRecord[]>();
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
      case "health-coverage": {
        const list = coverageByPerson.get(record.personId) ?? [];
        list.push(record);
        coverageByPerson.set(record.personId, list);
        break;
      }
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
  const intervalsByPerson = new Map<EntityId, HazardInterval[]>();
  for (const [personId, episodes] of episodesByPerson)
    intervalsByPerson.set(
      personId,
      episodes.map((episode) => ({
        start: episode.effectiveAt,
        end: endByEpisode.get(episode.id) ?? null,
        micros: episode.hazardMultiplierMicros,
      })),
    );
  for (const [personId, coverage] of coverageByPerson) {
    const person = world.people[personId];
    if (!person) continue;
    const spans = coverageHazardIntervals(person.birthDate, coverage);
    if (spans.length === 0) continue;
    intervalsByPerson.set(personId, [
      ...(intervalsByPerson.get(personId) ?? []),
      ...spans,
    ]);
  }
  const multipliers = new Map<EntityId, readonly HazardMultiplierChange[]>();
  for (const [personId, intervals] of intervalsByPerson)
    multipliers.set(personId, multiplierTimeline(intervals));
  const conditions = new Map(
    [...episodesByPerson].map(([personId, episodes]) => [
      personId,
      episodes.map((episode) => ({
        episode,
        end: endByEpisode.get(episode.id) ?? null,
      })),
    ]),
  );
  const context = {
    starts,
    calibrations,
    multipliers,
    conditions,
    coverage: coverageByPerson,
  };
  CONTEXTS.set(records, context);
  return context;
}

/**
 * Several active episodes (and coverage) multiply; an ended one stops
 * contributing on the day it ends.
 */
function multiplierTimeline(
  intervals: readonly HazardInterval[],
): readonly HazardMultiplierChange[] {
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
        micros = (micros * BigInt(interval.micros)) / BigInt(MULTIPLIER_ONE);
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

/**
 * The day in [from, to) on which this person's strain reaches the threshold,
 * or `from` itself when it already had; null when it does not in the span.
 */
export function strainCrossingDay(
  world: World,
  personId: EntityId,
  from: IsoDate,
  to: IsoDate,
): IsoDate | null {
  const start = mortalityExposureStarts(world).get(personId);
  if (!start) return null;
  return firstThresholdDay(
    mortalityProfile(world, personId, start),
    STRAIN_THRESHOLD_UNITS,
    from,
    to,
  );
}

/**
 * The records that drove a person's strain on `date`: the health episodes
 * multiplying it then, the coverage record in force, and the product of
 * every recorded multiplier (millionths). A serious episode cites them.
 */
export function strainDrivers(
  world: World,
  personId: EntityId,
  date: IsoDate,
): {
  readonly conditionIds: readonly EntityId[];
  readonly coverage: HealthCoverageRecord | null;
  readonly multiplierMicros: number;
} {
  const context = mortalityContext(world);
  const conditionIds = (context.conditions.get(personId) ?? [])
    .filter(
      ({ episode, end }) =>
        episode.effectiveAt <= date && (end === null || date < end),
    )
    .map(({ episode }) => episode.id);
  const coverage =
    (context.coverage.get(personId) ?? [])
      .filter((record) => record.effectiveAt <= date)
      .at(-1) ?? null;
  let multiplierMicros = MULTIPLIER_ONE;
  for (const change of hazardMultipliersOf(world, personId)) {
    if (change.effectiveAt > date) break;
    multiplierMicros = change.micros;
  }
  return { conditionIds, coverage, multiplierMicros };
}

/** The serious episode a crossing began, while it runs its course. */
export function seriousStrainEpisode(
  world: World,
  personId: EntityId,
): HealthEpisodeRecord | null {
  return (
    activeHealthEpisodes(world, personId).find((episode) =>
      episode.stableKey.startsWith(FATAL_ILLNESS_EPISODE_PREFIX),
    ) ?? null
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
 * Puts on the clock the day this person's strain crosses inside
 * [from, windowEnd), unless a serious episode already runs its course. Used by
 * the window and by any writer that changes a person's records mid-window. A
 * crossing on or before today begins tomorrow, the first day a due item can
 * fall on. An item a later record change made wrong cancels itself.
 */
export function scheduleStrainOnset(
  world: World,
  personId: EntityId,
  from: IsoDate,
  windowEnd: IsoDate,
  cause: { readonly sourceEntityId: EntityId },
): World {
  if (!alive(world, personId, world.currentDate)) return world;
  if (seriousStrainEpisode(world, personId)) return world;
  const day = strainCrossingDay(world, personId, from, windowEnd);
  if (day === null) return world;
  const tomorrow = addDays(world.currentDate, 1);
  const dueAt = day < tomorrow ? tomorrow : day;
  const stableKey = seriousEpisodeOnsetStableKey(personId, dueAt);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: FATAL_ILLNESS_ONSET_KEY,
    entityIds: [personId],
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [cause.sourceEntityId] },
  });
}

/** Puts the death a serious episode ends in on the clock for its day. */
export function scheduleStrainDeath(
  world: World,
  personId: EntityId,
  diesOn: IsoDate,
  episodeId: EntityId,
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${deathStableKey(personId, diesOn)}:due`,
    dueAt: diesOn,
    transitionKey: MORTALITY_DEATH_KEY,
    entityIds: [personId],
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [episodeId] },
  });
}

function recordMortalityDeath(
  world: World,
  personId: EntityId,
  diedAt: IsoDate,
  sources: readonly EntityId[],
): World {
  const sorted = [...new Set(sources)].sort();
  const withDeath = recordPersonDeath(world, {
    stableKey: deathStableKey(personId, diedAt),
    personId,
    diedAt,
    causeKey: DEATH_CAUSE_ILLNESS_WITH_COURSE,
    sourceEntityIds: sorted,
    summary: deathCauseSummary(DEATH_CAUSE_ILLNESS_WITH_COURSE),
    provenance: { kind: "simulated", sourceEntityIds: sorted },
  });
  const death = withDeath.history.personDeaths.at(-1)!;
  const closed = closeHealthEpisodesForDeath(withDeath, personId, death.id);
  // The family learns of it the day it happens.
  return tellOfDeath(
    recordOfficialContinuity(world, closed, personId, "death"),
    death.id,
  );
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
  // Monthly coverage passes re-plan an onset when coverage changes the strain.
  next = ensureHealthCoveragePass(next, windowId);
  for (const personId of next.personOrder) {
    if (!alive(next, personId, start)) continue;
    next = scheduleStrainOnset(next, personId, start, end, {
      sourceEntityId: windowId,
    });
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

/**
 * Writes the death a serious episode ends in, on the day the episode carried,
 * citing the episode. Nothing about the day is drawn or re-decided here.
 */
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
  const episode = seriousStrainEpisode(world, personId);
  if (!episode || !episode.stableKey.endsWith(`:${item.dueAt}`))
    return cancelled("No serious episode runs its course to this day.");
  const next = recordMortalityDeath(world, personId, item.dueAt, [
    item.id,
    episode.id,
  ]);
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
 * The next day on which a death of this person could be written by K1: a
 * window opening, a coverage pass, their serious episode's onset or their
 * scheduled death.
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
    // A coverage pass can move a death day, like a window.
    const relevant =
      item.transitionKey === MORTALITY_WINDOW_KEY ||
      item.transitionKey === HEALTH_COVERAGE_KEY ||
      ((item.transitionKey === MORTALITY_DEATH_KEY ||
        item.transitionKey === FATAL_ILLNESS_ONSET_KEY) &&
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
