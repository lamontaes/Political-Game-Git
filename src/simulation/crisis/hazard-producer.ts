import { addDays, daysBetween, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { lifePlaceByJurisdictionId, lifePlaceSearch } from "../life-places";
import mechanism from "../../../data/research/hazard-catalog-mechanism.json" with { type: "json" };
import { countyGeoidsForPlace } from "../government-units";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { declareHazardEpisode, hazardExposure } from "./disaster";
import catalogJson from "./storm-catalog.generated.json" with { type: "json" };
import type { HazardFamily, HazardMagnitude } from "./types";

/**
 * Automatic hazard production, replayed from recorded seasons and geography.
 *
 * CRUNCH47 C2: one versioned national stream replays historical episodes from
 * the compiled NOAA/NCEI Storm Events catalog, rather than rolling a storm per
 * household. Every rate comes from that catalog's own declared window; the
 * catalog counts REPORTED events, so a rate here is a recorded-report rate for
 * 2000–2024 and not a claim about the chance of a hazard in any future year.
 * An episode touches represented places in its recorded county footprint.
 * Unread catalogs use an explicitly marked median seasonal reference.
 *
 * Mitigation, response and damage stay where they already are: this module
 * only decides that an episode occurs, where, and how wide.
 */
export const HAZARD_SAMPLE_TRANSITION_KEY = "crisis:hazard-sample";
/** One sampled episode, arriving on its recorded day of the month. */
export const HAZARD_EPISODE_TRANSITION_KEY = "crisis:hazard-episode";
export const HAZARD_PRODUCER_VERSION = "crisis-hazard-producer-v1";

/** The authored sampling law, stated so nobody has to infer it from code. */
export const HAZARD_SAMPLING_CONTRACT = {
  version: HAZARD_PRODUCER_VERSION,
  countLaw: "recorded-season-and-county-footprint",
  /**
   * The catalog records episodes for a whole state; it has no per-county rate.
   * A represented place is thinned out of that state rate by the state's
   * recorded median county footprint over the number of counties in the
   * state. That is an authored assumption of uniform incidence inside a
   * state, stated here rather than hidden in the arithmetic, and it is the
   * only step in this module that is not read straight from the catalog.
   */
  countyThinning: "recorded-median-footprint-over-counties-in-state",
  footprintSource: "recorded-episode-of-the-replayed-season-and-county",
  magnitudeLadder: "authored-from-the-recorded-episode-area-count",
  label: "historical-report-replay",
} as const;

interface StormEpisode {
  readonly episodeId: string;
  readonly family: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly month: number;
  readonly eventCount: number;
  readonly affectedAreas: readonly {
    readonly stateFips: string;
    readonly countyFips: string;
    readonly czType?: string;
  }[];
}

interface StateFootprint {
  readonly stateUsps: string;
  readonly family: string;
  readonly medianCountiesPerEpisode: number;
}

interface StateMonthRate {
  readonly stateUsps: string;
  readonly family: string;
  readonly month: number;
  readonly episodesPerExposureYear: number | null;
}

interface StormCatalog {
  readonly schema: string;
  readonly window: {
    readonly firstYear: number;
    readonly lastYear: number;
    readonly exposureYears: number;
  };
  readonly episodes: readonly StormEpisode[];
  readonly stateMonthlyCatalog?: readonly StateMonthRate[];
  readonly stateFootprintProfile?: readonly StateFootprint[];
  readonly episodeDetailPolicy?: {
    readonly episodeRowYears?: { firstYear: number; lastYear: number };
  };
}

export const STORM_CATALOG = catalogJson as unknown as StormCatalog;

/** Source families map onto the two families CRISIS represents. */
const FAMILY_OF = mechanism.familyOf as Readonly<Record<string, HazardFamily>>;
const FELT_AS_DISASTER = new Set<string>(mechanism.feltMagnitudes);
function magnitudeFor(areaCount: number, eventCount: number): HazardMagnitude {
  return (mechanism.magnitudes.find(
    (row) => areaCount >= row.areaCount || eventCount >= row.eventCount,
  )?.magnitude ?? mechanism.minorMagnitude) as HazardMagnitude;
}

function monthKeyOf(date: IsoDate): string {
  return date.slice(0, 7);
}

function monthOf(date: IsoDate): number {
  return Number(date.slice(5, 7));
}

function firstOfNextMonth(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

export interface RepresentedArea {
  readonly jurisdictionId: EntityId;
  readonly stateUsps: string;
}

/**
 * The places this World actually represents and that hold something a hazard
 * could touch. A world with nothing exposed produces no episodes.
 */
export function representedHazardAreas(
  world: World,
): readonly RepresentedArea[] {
  const areas: RepresentedArea[] = [];
  for (const jurisdictionId of world.jurisdictionOrder) {
    const place = lifePlaceByJurisdictionId(jurisdictionId);
    if (!place || place.scope === "state") continue;
    // A place whose state is not recorded cannot be joined to the catalog.
    if (!place.stateJurisdictionKey) continue;
    const usps = place.stateJurisdictionKey.slice(3);
    const exposure = hazardExposure(world, [jurisdictionId]);
    if (
      exposure.households.length === 0 &&
      exposure.dwellings.length === 0 &&
      exposure.organizations.length === 0
    )
      continue;
    areas.push({ jurisdictionId, stateUsps: usps });
  }
  return areas;
}

function stateMonthRate(
  stateUsps: string,
  family: string,
  month: number,
): number | null {
  const rows = STORM_CATALOG.stateMonthlyCatalog;
  if (!rows) return null;
  const row = rows.find(
    (candidate) =>
      candidate.stateUsps === stateUsps &&
      candidate.family === family &&
      candidate.month === month,
  );
  return row?.episodesPerExposureYear ?? null;
}

/**
 * Episodes indexed once by state, family and month. The catalog holds
 * thousands of rows and the sampler asks for one narrow slice per state per
 * family per month; scanning the whole array each time showed up as repeated
 * work in the long-history profile.
 */
let episodeIndex: Map<string, StormEpisode[]> | null = null;
function episodesFor(
  stateFips: string,
  family: string,
  month: number,
): readonly StormEpisode[] {
  if (episodeIndex === null) {
    episodeIndex = new Map();
    for (const episode of STORM_CATALOG.episodes) {
      const states = new Set(
        episode.affectedAreas.map((area) => area.stateFips),
      );
      for (const state of states) {
        const key = `${state}|${episode.family}|${episode.month}`;
        const bucket = episodeIndex.get(key);
        if (bucket) bucket.push(episode);
        else episodeIndex.set(key, [episode]);
      }
    }
  }
  return episodeIndex.get(`${stateFips}|${family}|${month}`) ?? [];
}

const countiesInState = new Map<string, number>();
function countyCount(stateUsps: string): number {
  const known = countiesInState.get(stateUsps);
  if (known !== undefined) return known;
  const count = lifePlaceSearch("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: `US-${stateUsps}`,
    scope: "county",
  }).length;
  countiesInState.set(stateUsps, count);
  return count;
}

/**
 * Expected episodes touching ONE represented place in that state, family and
 * month. The state rate is the catalog's; the thinning is the declared
 * assumption in HAZARD_SAMPLING_CONTRACT.
 */
function recordedRepresentedRate(
  stateUsps: string,
  family: string,
  month: number,
): number | null {
  const rate = stateMonthRate(stateUsps, family, month);
  if (rate === null) return null;
  const footprint = STORM_CATALOG.stateFootprintProfile?.find(
    (row) => row.stateUsps === stateUsps && row.family === family,
  );
  const counties = countyCount(stateUsps);
  if (!footprint || counties === 0) return null;
  const share = Math.min(1, footprint.medianCountiesPerEpisode / counties);
  return rate * share;
}

/** Unread places share the median recorded seasonal rate. */
export function representedRate(
  stateUsps: string,
  family: string,
  month: number,
): number {
  return (
    recordedRepresentedRate(stateUsps, family, month) ??
    medianRepresentedRate(family, month)
  );
}

export interface SampledHazard {
  readonly stateUsps: string;
  readonly sourceFamily: string;
  readonly family: HazardFamily;
  readonly magnitude: HazardMagnitude;
  readonly jurisdictionIds: readonly EntityId[];
  readonly durationDays: number;
  readonly recordedEpisodeId: string;
  readonly recordedAreaCount: number;
  /** The recorded episode's own start day, 1-31. */
  readonly dayOfMonth: number;
}

/**
 * What this month's stream produces for one World. Pure: the caller writes.
 */
export function sampleMonthlyHazards(
  world: World,
  monthStart: IsoDate,
): readonly SampledHazard[] {
  const areas = representedHazardAreas(world);
  if (areas.length === 0) return [];
  return hazardsForRepresentedAreas(areas, monthStart);
}

/** Replay the recorded season; only its actual county footprints select assets. */
export function hazardsForRepresentedAreas(
  areas: readonly RepresentedArea[],
  monthStart: IsoDate,
): readonly SampledHazard[] {
  const sampled: SampledHazard[] = [];
  const month = monthOf(monthStart);
  const years = STORM_CATALOG.episodeDetailPolicy?.episodeRowYears;
  if (!years)
    throw new Error("A hazard catalog needs its recorded detail years.");
  const year = Number(monthStart.slice(0, 4));
  const replayYear =
    years.firstYear +
    ((((year - years.firstYear) % (years.lastYear - years.firstYear + 1)) +
      (years.lastYear - years.firstYear + 1)) %
      (years.lastYear - years.firstYear + 1));
  const byState = new Map<string, RepresentedArea[]>();
  for (const area of areas)
    byState.set(area.stateUsps, [...(byState.get(area.stateUsps) ?? []), area]);
  for (const [stateUsps, represented] of byState) {
    for (const sourceFamily of Object.keys(FAMILY_OF)) {
      const candidates = episodesFor(
        stateFipsOf(stateUsps),
        sourceFamily,
        month,
      ).filter(
        (episode) => Number(episode.startDate.slice(0, 4)) === replayYear,
      );
      const append = (
        recorded: StormEpisode,
        jurisdictionIds: readonly EntityId[],
      ) => {
        const footprint = recorded.affectedAreas.filter(
          (area) => area.stateFips === stateFipsOf(stateUsps),
        );
        sampled.push({
          stateUsps,
          sourceFamily,
          family: FAMILY_OF[sourceFamily]!,
          magnitude: magnitudeFor(
            footprint.length || recorded.affectedAreas.length,
            recorded.eventCount,
          ),
          jurisdictionIds,
          durationDays: recordedDurationDays(recorded),
          recordedEpisodeId: recorded.episodeId,
          recordedAreaCount: footprint.length || recorded.affectedAreas.length,
          dayOfMonth: Number(recorded.startDate.slice(8, 10)),
        });
      };
      for (const recorded of candidates) {
        const jurisdictions = represented
          .filter((area) => {
            const place = lifePlaceByJurisdictionId(area.jurisdictionId);
            const counties = place?.sourceGeoid
              ? countyGeoidsForPlace(place.sourceGeoid)
              : [];
            return recorded.affectedAreas.some(
              (footprint) =>
                footprint.czType !== "Z" &&
                counties.includes(
                  `${footprint.stateFips}${footprint.countyFips}`,
                ),
            );
          })
          .map((area) => area.jurisdictionId);
        if (jurisdictions.length > 0) append(recorded, jurisdictions);
      }
      // Missing local catalog/geography uses a marked median reference. Its
      // accumulated seasonal exposure determines dates/counts, never a roll.
      if (recordedRepresentedRate(stateUsps, sourceFamily, month) === null) {
        const rate = representedRate(stateUsps, sourceFamily, month);
        const before = year * 12 + month - 1;
        const count =
          Math.floor((before + 1) * rate * represented.length) -
          Math.floor(before * rate * represented.length);
        const reference = STORM_CATALOG.episodes
          .filter(
            (row) =>
              row.family === sourceFamily &&
              row.month === month &&
              Number(row.startDate.slice(0, 4)) === replayYear,
          )
          .sort(
            (a, b) =>
              a.affectedAreas.length - b.affectedAreas.length ||
              a.episodeId.localeCompare(b.episodeId),
          );
        const median = reference[Math.floor(reference.length / 2)];
        if (median)
          for (let i = 0; i < count; i++)
            append(
              median,
              represented.map((area) => area.jurisdictionId),
            );
      }
    }
  }
  return sampled;
}

export function medianRepresentedRate(family: string, month: number): number {
  const recorded = (STORM_CATALOG.stateMonthlyCatalog ?? [])
    .filter(
      (row) =>
        row.family === family &&
        row.month === month &&
        row.episodesPerExposureYear !== null,
    )
    .map((row) => recordedRepresentedRate(row.stateUsps, family, month))
    .filter((rate): rate is number => rate !== null)
    .sort((a, b) => a - b);
  if (recorded.length === 0)
    throw new Error("No recorded seasonal hazard rates.");
  const mid = Math.floor(recorded.length / 2);
  return recorded.length % 2
    ? recorded[mid]!
    : (recorded[mid - 1]! + recorded[mid]!) / 2;
}

function recordedDurationDays(episode: StormEpisode): number {
  const days = daysBetween(
    makeIsoDate(episode.startDate),
    makeIsoDate(episode.endDate),
  );
  return Math.max(1, Math.min(mechanism.maximumEpisodeDays, days + 1));
}

function stateFipsOf(usps: string): string {
  const rows: Readonly<Record<string, string>> = mechanism.stateFips;
  return rows[usps] ?? "";
}

/** Schedules the first monthly sample for a current opening. */
export function ensureHazardProduction(world: World): World {
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION)
    return world;
  if (
    world.history.futureDueItems.some(
      (item) => item.transitionKey === HAZARD_SAMPLE_TRANSITION_KEY,
    )
  )
    return world;
  const areas = representedHazardAreas(world);
  if (areas.length === 0) return world;
  return scheduleFutureDueItem(world, {
    stableKey: `${HAZARD_PRODUCER_VERSION}:${monthKeyOf(firstOfNextMonth(makeIsoDate(world.currentDate)))}`,
    dueAt: firstOfNextMonth(makeIsoDate(world.currentDate)),
    transitionKey: HAZARD_SAMPLE_TRANSITION_KEY,
    entityIds: [areas[0]!.jurisdictionId],
    jurisdictionId: areas[0]!.jurisdictionId,
    provenance: { kind: "initialization", reference: HAZARD_PRODUCER_VERSION },
  });
}

export function hazardSampleHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== HAZARD_SAMPLE_TRANSITION_KEY) {
    throw new Error("The hazard sampler received another transition.");
  }
  const monthStart = makeIsoDate(dueItem.dueAt);
  let next = world;
  let declared = 0;
  const lastDay = Number(
    addDays(firstOfNextMonth(addDays(monthStart, 1)), -1).slice(8, 10),
  );
  for (const [index, sample] of sampleMonthlyHazards(
    world,
    monthStart,
  ).entries()) {
    if (!FELT_AS_DISASTER.has(sample.magnitude)) continue;
    // An episode arrives on its recorded episode's own day, not all of them
    // on the first of the month (playtests, 2026-09-22).
    const day = Math.min(Math.max(1, sample.dayOfMonth), lastDay);
    const input = episodeInput(monthStart, index, sample);
    const arrives = makeIsoDate(
      `${monthStart.slice(0, 8)}${String(day).padStart(2, "0")}`,
    );
    if (arrives <= next.currentDate) {
      next = declareHazardEpisode(next, input);
    } else {
      next = scheduleFutureDueItem(next, {
        stableKey: episodeDueKey(monthStart, index, sample),
        dueAt: arrives,
        transitionKey: HAZARD_EPISODE_TRANSITION_KEY,
        entityIds: [...sample.jurisdictionIds].sort(),
        jurisdictionId: sample.jurisdictionIds[0]!,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [sample.jurisdictionIds[0]!],
        },
      });
    }
    declared += 1;
  }
  // The exposure scan is the expensive part; one per handler call.
  const areas = representedHazardAreas(world);
  const following = firstOfNextMonth(addDays(monthStart, 1));
  if (areas.length > 0) {
    next = scheduleFutureDueItem(next, {
      stableKey: `${HAZARD_PRODUCER_VERSION}:${monthKeyOf(following)}`,
      dueAt: following,
      transitionKey: HAZARD_SAMPLE_TRANSITION_KEY,
      entityIds: [areas[0]!.jurisdictionId],
      jurisdictionId: areas[0]!.jurisdictionId,
      // The place itself is the canonical source of the next sample; a due
      // item being resolved is not available as one.
      provenance: {
        kind: "simulated",
        sourceEntityIds: [areas[0]!.jurisdictionId],
      },
    });
  }
  return {
    world: next,
    status: "resolved",
    reasonKey:
      declared === 0 ? "crisis:no-hazard-this-month" : "crisis:hazard-sampled",
    context: null,
    outcomeEventId: null,
  };
}

function episodeInput(
  monthStart: IsoDate,
  index: number,
  sample: Pick<
    SampledHazard,
    | "stateUsps"
    | "sourceFamily"
    | "family"
    | "magnitude"
    | "jurisdictionIds"
    | "durationDays"
    | "recordedEpisodeId"
    | "recordedAreaCount"
  >,
) {
  return {
    stableKey: `${HAZARD_PRODUCER_VERSION}:${monthKeyOf(monthStart)}:${sample.stateUsps}:${sample.sourceFamily}:${index}`,
    family: sample.family,
    magnitude: sample.magnitude,
    stateUsps: sample.stateUsps,
    jurisdictionIds: sample.jurisdictionIds,
    durationDays: sample.durationDays,
    basis: sample.recordedEpisodeId,
    sourceReference: `ncei-storm-events:${sample.recordedEpisodeId}`,
    estimatedFrom: mechanism.estimatedFrom,
  };
}

/*
 * The due item carries the sample in its stable key, so the episode that
 * arrives later in the month is exactly the one drawn on the first, whatever
 * the World has represented since.
 */
function episodeDueKey(
  monthStart: IsoDate,
  index: number,
  sample: SampledHazard,
): string {
  return [
    HAZARD_PRODUCER_VERSION,
    "episode",
    monthKeyOf(monthStart),
    sample.stateUsps,
    sample.sourceFamily,
    index,
    sample.family,
    sample.magnitude,
    sample.durationDays,
    sample.recordedAreaCount,
    sample.recordedEpisodeId,
  ].join("|");
}

export function hazardEpisodeHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== HAZARD_EPISODE_TRANSITION_KEY) {
    throw new Error("The hazard episode handler received another transition.");
  }
  const [
    ,
    ,
    month,
    stateUsps,
    sourceFamily,
    index,
    family,
    magnitude,
    durationDays,
    recordedAreaCount,
    recordedEpisodeId,
  ] = dueItem.stableKey.split("|");
  const next = declareHazardEpisode(
    world,
    episodeInput(makeIsoDate(`${month}-01`), Number(index), {
      stateUsps: stateUsps!,
      sourceFamily: sourceFamily!,
      family: family as HazardFamily,
      magnitude: magnitude as HazardMagnitude,
      jurisdictionIds: dueItem.entityIds,
      durationDays: Number(durationDays),
      recordedEpisodeId: recordedEpisodeId!,
      recordedAreaCount: Number(recordedAreaCount),
    }),
  );
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:hazard-arrived",
    context: null,
    outcomeEventId: null,
  };
}
