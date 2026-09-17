import { addDays, daysBetween, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { lifePlaceByJurisdictionId, lifePlaceSearch } from "../life-places";
import { SeededRng } from "../rng";
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
 * Automatic hazard production, resampled from recorded history.
 *
 * CRUNCH47 C2: one versioned national stream samples fictional episodes from
 * the compiled NOAA/NCEI Storm Events catalog, rather than rolling a storm per
 * household. Every rate comes from that catalog's own declared window; the
 * catalog counts REPORTED events, so a rate here is a recorded-report rate for
 * 2000–2024 and not a claim about the chance of a hazard in any future year.
 * A sampled episode's footprint size is resampled from an actual recorded
 * episode of the same state, family and month; the places it actually touches
 * are the represented places of this World, because damage is bounded by what
 * the World represents.
 *
 * Mitigation, response and damage stay where they already are: this module
 * only decides that an episode occurs, where, and how wide.
 */
export const HAZARD_SAMPLE_TRANSITION_KEY = "crisis:hazard-sample";
export const HAZARD_PRODUCER_VERSION = "crisis-hazard-producer-v1";

/** The authored sampling law, stated so nobody has to infer it from code. */
export const HAZARD_SAMPLING_CONTRACT = {
  version: HAZARD_PRODUCER_VERSION,
  countLaw: "poisson-at-the-catalog-recorded-monthly-rate",
  /**
   * The catalog records episodes for a whole state; it has no per-county rate.
   * A represented place is thinned out of that state rate by the state's
   * recorded median county footprint over the number of counties in the
   * state. That is an authored assumption of uniform incidence inside a
   * state, stated here rather than hidden in the arithmetic, and it is the
   * only step in this module that is not read straight from the catalog.
   */
  countyThinning: "recorded-median-footprint-over-counties-in-state",
  footprintSource: "resampled-recorded-episode-of-the-same-state-family-month",
  magnitudeLadder: "authored-from-the-recorded-episode-area-count",
  label: "historical-report-resampling",
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
const FAMILY_OF: Readonly<Record<string, HazardFamily>> = {
  flood: "flood",
  "flash-flood": "flood",
  "thunderstorm-wind": "severe-storm",
};

/**
 * Authored magnitude ladder over the recorded episode's own size. Not a
 * damage estimate: the damage model reads represented assets separately.
 */
function magnitudeFor(areaCount: number, eventCount: number): HazardMagnitude {
  if (areaCount >= 12 || eventCount >= 40) return "catastrophic";
  if (areaCount >= 5 || eventCount >= 12) return "major";
  if (areaCount >= 2 || eventCount >= 4) return "moderate";
  return "minor";
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
export function representedRate(
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

/** Knuth's method, on the shared deterministic stream. */
function poisson(rng: SeededRng, mean: number): number {
  if (mean <= 0) return 0;
  const limit = Math.exp(-mean);
  let count = 0;
  let product = rng.next();
  while (product > limit && count < 25) {
    count += 1;
    product *= rng.next();
  }
  return count;
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
  const month = monthOf(monthStart);
  const byState = new Map<string, EntityId[]>();
  for (const area of areas) {
    byState.set(area.stateUsps, [
      ...(byState.get(area.stateUsps) ?? []),
      area.jurisdictionId,
    ]);
  }
  const sampled: SampledHazard[] = [];
  for (const [stateUsps, jurisdictionIds] of [...byState].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    for (const sourceFamily of Object.keys(FAMILY_OF).sort()) {
      const perPlace = representedRate(stateUsps, sourceFamily, month);
      if (perPlace === null || perPlace <= 0) continue;
      // One draw for the represented places of this state together.
      const rate = perPlace * jurisdictionIds.length;
      const stream = new SeededRng(HAZARD_PRODUCER_VERSION).fork(
        JSON.stringify([
          HAZARD_PRODUCER_VERSION,
          world.seed,
          monthKeyOf(monthStart),
          stateUsps,
          sourceFamily,
        ]),
      );
      const count = poisson(stream.fork("count"), rate);
      const candidates = STORM_CATALOG.episodes.filter(
        (episode) =>
          episode.family === sourceFamily &&
          episode.month === month &&
          episode.affectedAreas.some(
            (area) => area.stateFips === stateFipsOf(stateUsps),
          ),
      );
      if (candidates.length === 0) continue;
      for (let index = 0; index < count; index += 1) {
        const draw = stream.fork(`episode:${index}`);
        const recorded = draw.pick([...candidates]);
        const recordedAreaCount = recorded.affectedAreas.filter(
          (area) => area.stateFips === stateFipsOf(stateUsps),
        ).length;
        // The footprint's SIZE is resampled; the places are this World's own.
        const width = Math.max(
          1,
          Math.min(jurisdictionIds.length, recordedAreaCount),
        );
        const chosen = [...jurisdictionIds].sort().slice(0, width);
        sampled.push({
          stateUsps,
          sourceFamily,
          family: FAMILY_OF[sourceFamily]!,
          magnitude: magnitudeFor(recordedAreaCount, recorded.eventCount),
          jurisdictionIds: chosen,
          // The recorded episode's own span, bounded to what the response
          // chain represents.
          durationDays: recordedDurationDays(recorded),
          recordedEpisodeId: recorded.episodeId,
          recordedAreaCount,
        });
      }
    }
  }
  return sampled;
}

function recordedDurationDays(episode: StormEpisode): number {
  const days = daysBetween(
    makeIsoDate(episode.startDate),
    makeIsoDate(episode.endDate),
  );
  return Math.max(1, Math.min(14, days + 1));
}

function stateFipsOf(usps: string): string {
  return STATE_FIPS[usps] ?? "";
}

/** Census state FIPS codes, the join key the storm catalog uses. */
const STATE_FIPS: Readonly<Record<string, string>> = {
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
};

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
  for (const [index, sample] of sampleMonthlyHazards(
    world,
    monthStart,
  ).entries()) {
    next = declareHazardEpisode(next, {
      stableKey: `${HAZARD_PRODUCER_VERSION}:${monthKeyOf(monthStart)}:${sample.stateUsps}:${sample.sourceFamily}:${index}`,
      family: sample.family,
      magnitude: sample.magnitude,
      stateUsps: sample.stateUsps,
      jurisdictionIds: sample.jurisdictionIds,
      durationDays: sample.durationDays,
      basis: `${HAZARD_SAMPLING_CONTRACT.label}: resampled from NCEI Storm Events episode ${sample.recordedEpisodeId} (${sample.sourceFamily}, ${sample.recordedAreaCount} recorded county area(s)); count drawn ${HAZARD_SAMPLING_CONTRACT.countLaw}.`,
      sourceReference: `ncei-storm-events:${sample.recordedEpisodeId}`,
    });
    declared += 1;
  }
  const areas = representedHazardAreas(next);
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
