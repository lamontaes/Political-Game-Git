/**
 * Presentation join from locked BEA CAINC1 line 2 onto a chosen hometown.
 *
 * Uses `readPlaceDemography` for geography matching. Does not import source
 * core or domain internals. Missing population is omitted, never shown as 0.
 * County, metro, HUD, and PUMS substitutes stay out of the player summary.
 *
 * Unmatched fields (not shown): demographics — no locked place-level
 * demographic breakdown; voter — no locked voter or party-registration series.
 *
 * Creator filters by the CAINC1 reference period against the life's start
 * date. Retrieval-date-fallback on the lock is not a Bureau publication date
 * and does not hide a 2024 headcount from a 2026-01-05 start.
 */

import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import type { LifePlace } from "../simulation";
import {
  readPlaceDemography,
  type PlaceDemographyEconomicInput,
  type PlacePopulationObservation,
} from "../simulation/place-demography";
import type {
  BrowserBeaRecord,
  BrowserEconomicManifest,
  BrowserEconomicShard,
} from "./economic-context-browser-types";
import type { PlaceStartFact } from "./place-start-summary";

export const PLACE_DEMOGRAPHY_UNMATCHED = [
  {
    field: "demographics" as const,
    source: "No locked place-level demographic series (ACS or otherwise).",
  },
  {
    field: "voter" as const,
    source: "No locked voter-registration or party-registration series.",
  },
] as const;

export interface HometownPopulationQueryOptions {
  readonly baseUrl?: string;
  readonly fetchJson?: (url: string) => Promise<unknown>;
}

export function hometownPopulationAsOf(place: LifePlace): string {
  return place.context.initialMoment.date;
}

export function hometownCountyEquivalentGeoid(place: LifePlace): string | null {
  const geo = municipalGovernmentForLifePlace(
    place,
  )?.identity?.countyEquivalentGeoid?.replace(/\D/g, "");
  return geo && geo.length > 0 ? geo : null;
}

function periodEnd(period: string): string {
  if (/^\d{4}$/.test(period)) return `${period}-12-31`;
  return period;
}

function beaPopulationInputFromRecords(
  records: readonly BrowserBeaRecord[],
  geoFips: string,
  asOf: string,
): PlaceDemographyEconomicInput {
  return {
    observations: records.flatMap((row) => {
      if (row.tableName !== "CAINC1" || row.lineCode !== "2") return [];
      if (row.geoFips !== geoFips) return [];
      if (row.geographyLevel !== "county") return [];
      if (periodEnd(row.year) > asOf) return [];
      const value =
        row.value.state === "KNOWN"
          ? { state: "KNOWN" as const, value: row.value.value }
          : { state: "UNKNOWN" as const };
      return [
        {
          kind: "bea" as const,
          detailKey: "CAINC1:2",
          sourceSeriesKey: `bea.${row.tableName.toLowerCase()}.${row.lineCode}`,
          period: row.year,
          geography: {
            providerCode: row.geoFips,
            providerName: row.geoName,
            level: row.geographyLevel,
            relationship: "same-jurisdiction",
          },
          value,
        },
      ];
    }),
  };
}

export function populationStartFact(
  population: PlacePopulationObservation,
): PlaceStartFact {
  const people = new Intl.NumberFormat("en-US").format(population.people);
  return {
    kind: "population",
    text: `${people} people`,
    geography: population.geographyName,
    asOf: population.period,
    attribution: "BEA CAINC1 population",
  };
}

export function hometownPopulationFacts(
  place: LifePlace,
  economic?: PlaceDemographyEconomicInput | null,
): readonly PlaceStartFact[] {
  const population = readPlaceDemography(place, economic).population;
  return population ? [populationStartFact(population)] : [];
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Hometown population request failed (${response.status}).`);
  }
  return response.json() as Promise<unknown>;
}

export async function queryHometownPopulationFacts(
  place: LifePlace,
  options?: HometownPopulationQueryOptions,
): Promise<readonly PlaceStartFact[]> {
  const geoFips = hometownCountyEquivalentGeoid(place);
  if (!geoFips) return hometownPopulationFacts(place);
  const baseUrl = (options?.baseUrl ?? "/data/economic-context/v1").replace(
    /\/$/,
    "",
  );
  const fetchJson = options?.fetchJson ?? defaultFetchJson;
  const asOf = hometownPopulationAsOf(place);
  try {
    const manifest = (await fetchJson(
      `${baseUrl}/manifest.json`,
    )) as BrowserEconomicManifest;
    const shardPath = manifest.indexes.bea[`county:${geoFips}`];
    if (!shardPath) return hometownPopulationFacts(place);
    const shard = (await fetchJson(
      `${baseUrl}/${shardPath}`,
    )) as BrowserEconomicShard<BrowserBeaRecord>;
    return hometownPopulationFacts(
      place,
      beaPopulationInputFromRecords(shard.records, geoFips, asOf),
    );
  } catch {
    return hometownPopulationFacts(place);
  }
}
