/**
 * Normalizer for NOAA Storm Events Records
 *
 * Ingests raw NOAA NCEI Storm Events data (details, fatalities, episodes)
 * and produces normalized, strongly-typed StormEventRecord and StormEpisodeRecord entities.
 */

import { createStormEpisodeId, createStormEventId } from "./ids";
import { getCoverageEraForDate, mapEventTypeToFamily } from "./coverage";
import { parseStormMagnitude } from "./magnitude";
import type { RawMagnitudeInput } from "./magnitude";
import { parseStormDamage } from "./damage";
import type { RawDamageInput } from "./damage";
import type {
  CountyOrZoneType,
  StormCasualties,
  StormEpisodeRecord,
  StormEventRecord,
  StormLocation,
  StormNarratives,
  StormProvenance,
} from "./types";

export interface RawStormEventInput extends RawMagnitudeInput, RawDamageInput {
  readonly eventId: number | string;
  readonly episodeId: number | string;
  readonly eventType: string;
  readonly beginDateTime: string; // ISO 8601 or NOAA timestamp "03-APR-74 15:30:00"
  readonly endDateTime?: string | null;
  readonly state: string;
  readonly stateFips: number | string;
  readonly czType?: CountyOrZoneType | string | null;
  readonly czFips?: number | string | null;
  readonly czName?: string | null;
  readonly wfo?: string | null;
  readonly locationName?: string | null;
  readonly rangeMiles?: number | string | null;
  readonly azimuth?: string | null;
  readonly beginLat?: number | string | null;
  readonly beginLon?: number | string | null;
  readonly endLat?: number | string | null;
  readonly endLon?: number | string | null;
  readonly injuriesDirect?: number | string | null;
  readonly injuriesIndirect?: number | string | null;
  readonly deathsDirect?: number | string | null;
  readonly deathsIndirect?: number | string | null;
  readonly source?: string | null;
  readonly episodeNarrative?: string | null;
  readonly eventNarrative?: string | null;
  readonly sourceDataset?: string;
  readonly sourceUrl?: string;
  readonly vintage?: string;
  readonly checksum?: string;
}

export interface RawStormEpisodeInput {
  readonly episodeId: number | string;
  readonly state: string;
  readonly stateFips: number | string;
  readonly beginDateTime: string;
  readonly endDateTime?: string | null;
  readonly wfo?: string | null;
  readonly narrative?: string | null;
  readonly sourceDataset?: string;
  readonly sourceUrl?: string;
  readonly vintage?: string;
}

/**
 * Normalizes a raw event input into a canonical StormEventRecord.
 */
export function normalizeStormEvent(
  input: RawStormEventInput,
): StormEventRecord {
  const sourceEventId = parseIntegerOrThrow(input.eventId, "eventId");
  const episodeId = parseIntegerOrThrow(input.episodeId, "episodeId");
  const eventIdStr = createStormEventId(sourceEventId);

  const eventType = input.eventType.trim();
  const eventFamily = mapEventTypeToFamily(eventType);

  const beginDateTime = normalizeIsoDateTime(input.beginDateTime);
  const endDateTime = input.endDateTime
    ? normalizeIsoDateTime(input.endDateTime)
    : beginDateTime;

  const coverageEra = getCoverageEraForDate(beginDateTime);

  const state = input.state.trim().toUpperCase();
  const stateFips = padLeft(String(input.stateFips).trim(), 2);

  const czType: CountyOrZoneType =
    input.czType === "Z" ? "Z" : input.czType === "M" ? "M" : "C";
  const czFips = padLeft(String(input.czFips ?? "000").trim(), 3);
  const czName = (input.czName ?? "").trim().toUpperCase();
  const fullFips =
    czType === "C" ? `${stateFips}${czFips}` : `${stateFips}Z${czFips}`;

  const wfo = input.wfo ? input.wfo.trim().toUpperCase() : null;

  const location = normalizeLocation(input);
  const magnitude = parseStormMagnitude(input, eventFamily, beginDateTime);
  const casualties = normalizeCasualties(input);
  const damage = parseStormDamage(input);

  const narratives: StormNarratives = {
    episodeNarrative: cleanString(input.episodeNarrative),
    eventNarrative: cleanString(input.eventNarrative),
  };

  const provenance: StormProvenance = {
    sourceDataset: input.sourceDataset ?? "NOAA NCEI Storm Events Database",
    sourceUrl:
      input.sourceUrl ??
      "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/",
    vintage: input.vintage ?? "2026-06",
    recordChecksum: input.checksum,
  };

  return {
    id: eventIdStr,
    sourceEventId,
    episodeId,
    eventType,
    eventFamily,
    coverageEra,
    beginDateTime,
    endDateTime,
    state,
    stateFips,
    czType,
    czFips,
    czName,
    fullFips,
    wfo,
    location,
    magnitude,
    casualties,
    damage,
    source: cleanString(input.source),
    narratives,
    provenance,
  };
}

/**
 * Normalizes a raw episode input and synthesizes episode aggregates from linked events.
 */
export function normalizeStormEpisode(
  input: RawStormEpisodeInput,
  linkedEvents: readonly StormEventRecord[] = [],
): StormEpisodeRecord {
  const sourceEpisodeId = parseIntegerOrThrow(input.episodeId, "episodeId");
  const episodeIdStr = createStormEpisodeId(sourceEpisodeId);

  const state = input.state.trim().toUpperCase();
  const stateFips = padLeft(String(input.stateFips).trim(), 2);

  const beginDateTime =
    linkedEvents.length > 0
      ? linkedEvents.map((e) => e.beginDateTime).sort()[0]!
      : normalizeIsoDateTime(input.beginDateTime);

  const endDateTime =
    linkedEvents.length > 0
      ? linkedEvents
          .map((e) => e.endDateTime)
          .sort()
          .at(-1)!
      : input.endDateTime
        ? normalizeIsoDateTime(input.endDateTime)
        : beginDateTime;

  const wfo = input.wfo ? input.wfo.trim().toUpperCase() : null;
  const narrative = cleanString(input.narrative);

  const eventIds = linkedEvents.map((e) => e.id);
  const eventTypes = Array.from(
    new Set(linkedEvents.map((e) => e.eventType)),
  ).sort();
  const eventFamilies = Array.from(
    new Set(linkedEvents.map((e) => e.eventFamily)),
  ).sort();

  // Casualties roll-up (preserving missing as null if all events missing)
  let totalDirectInjuries: number | null = null;
  let totalDirectDeaths: number | null = null;

  for (const event of linkedEvents) {
    if (event.casualties.injuriesDirect !== null) {
      totalDirectInjuries =
        (totalDirectInjuries ?? 0) + event.casualties.injuriesDirect;
    }
    if (event.casualties.deathsDirect !== null) {
      totalDirectDeaths =
        (totalDirectDeaths ?? 0) + event.casualties.deathsDirect;
    }
  }

  // Damages roll-up
  let totalPropertyDamageDollars: number | null = null;
  let totalCropDamageDollars: number | null = null;
  let totalEstimatedDamageDollars: number | null = null;

  for (const event of linkedEvents) {
    if (event.damage.property.estimatedDollars !== null) {
      totalPropertyDamageDollars =
        (totalPropertyDamageDollars ?? 0) +
        event.damage.property.estimatedDollars;
    }
    if (event.damage.crops.estimatedDollars !== null) {
      totalCropDamageDollars =
        (totalCropDamageDollars ?? 0) + event.damage.crops.estimatedDollars;
    }
    if (event.damage.totalEstimatedDollars !== null) {
      totalEstimatedDamageDollars =
        (totalEstimatedDamageDollars ?? 0) + event.damage.totalEstimatedDollars;
    }
  }

  const provenance: StormProvenance = {
    sourceDataset: input.sourceDataset ?? "NOAA NCEI Storm Events Database",
    sourceUrl:
      input.sourceUrl ??
      "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/",
    vintage: input.vintage ?? "2026-06",
  };

  return {
    id: episodeIdStr,
    sourceEpisodeId,
    state,
    stateFips,
    beginDateTime,
    endDateTime,
    wfo,
    narrative,
    eventIds,
    eventTypes,
    eventFamilies,
    totalDirectInjuries,
    totalDirectDeaths,
    totalPropertyDamageDollars,
    totalCropDamageDollars,
    totalEstimatedDamageDollars,
    provenance,
  };
}

function normalizeLocation(input: RawStormEventInput): StormLocation {
  const locationName = cleanString(input.locationName);
  const rangeMiles = parseOptionalNumber(input.rangeMiles);
  const azimuth = cleanString(input.azimuth);

  const beginLat = parseOptionalNumber(input.beginLat);
  const beginLon = parseOptionalNumber(input.beginLon);
  const endLat = parseOptionalNumber(input.endLat);
  const endLon = parseOptionalNumber(input.endLon);

  const beginCoordinates = isValidCoordinate(beginLat, beginLon)
    ? { latitude: beginLat!, longitude: beginLon! }
    : null;

  const endCoordinates = isValidCoordinate(endLat, endLon)
    ? { latitude: endLat!, longitude: endLon! }
    : null;

  return {
    locationName,
    rangeMiles,
    azimuth,
    beginCoordinates,
    endCoordinates,
  };
}

function normalizeCasualties(input: RawStormEventInput): StormCasualties {
  const injuriesDirect = parseOptionalInteger(input.injuriesDirect);
  const injuriesIndirect = parseOptionalInteger(input.injuriesIndirect);
  const deathsDirect = parseOptionalInteger(input.deathsDirect);
  const deathsIndirect = parseOptionalInteger(input.deathsIndirect);

  let totalDirectCasualties: number | null = null;
  if (injuriesDirect !== null || deathsDirect !== null) {
    totalDirectCasualties = (injuriesDirect ?? 0) + (deathsDirect ?? 0);
  }

  return {
    injuriesDirect,
    injuriesIndirect,
    deathsDirect,
    deathsIndirect,
    totalDirectCasualties,
  };
}

function isValidCoordinate(lat: number | null, lon: number | null): boolean {
  if (lat === null || lon === null) return false;
  // Exclude 0,0 (often a null default in legacy databases)
  if (lat === 0 && lon === 0) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function normalizeIsoDateTime(dateStr: string): string {
  const trimmed = dateStr.trim();
  // If already standard ISO 8601 (e.g. "1974-04-03T15:30:00Z" or "1974-04-03T15:30:00-05:00" or "1974-04-03")
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed;
  }

  // Handle NOAA standard text format: "03-APR-74 15:30:00" or "03-APR-1974 15:30:00"
  const match = trimmed.match(
    /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    const day = padLeft(match[1]!, 2);
    const monthAbbr = match[2]!.toUpperCase();
    const months: Record<string, string> = {
      JAN: "01",
      FEB: "02",
      MAR: "03",
      APR: "04",
      MAY: "05",
      JUN: "06",
      JUL: "07",
      AUG: "08",
      SEP: "09",
      OCT: "10",
      NOV: "11",
      DEC: "12",
    };
    const month = months[monthAbbr] ?? "01";
    let rawYear = match[3]!;
    if (rawYear.length === 2) {
      const yr = parseInt(rawYear, 10);
      rawYear = yr >= 50 ? `19${rawYear}` : `20${rawYear}`;
    }
    const hour = match[4] ? padLeft(match[4], 2) : "00";
    const min = match[5] ? padLeft(match[5], 2) : "00";
    const sec = match[6] ? padLeft(match[6], 2) : "00";
    return `${rawYear}-${month}-${day}T${hour}:${min}:${sec}Z`;
  }

  return trimmed;
}

function parseIntegerOrThrow(val: number | string, fieldName: string): number {
  if (typeof val === "number" && Number.isInteger(val)) return val;
  const parsed = parseInt(String(val).trim(), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer for field ${fieldName}: ${val}`);
  }
  return parsed;
}

function parseOptionalNumber(
  val: number | string | null | undefined,
): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const str = String(val).trim();
  if (str === "" || str.toLowerCase() === "null") return null;
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

function parseOptionalInteger(
  val: number | string | null | undefined,
): number | null {
  const num = parseOptionalNumber(val);
  return num !== null ? Math.floor(num) : null;
}

function cleanString(str: string | null | undefined): string | null {
  if (str === null || str === undefined) return null;
  const trimmed = str.trim();
  return trimmed === "" ? null : trimmed;
}

function padLeft(str: string, len: number): string {
  return str.padStart(len, "0");
}
