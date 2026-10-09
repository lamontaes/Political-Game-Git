import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
} from "../simulation/life-places";
import {
  livingCostsRegionForState,
  type LivingCostsRegion,
} from "../simulation/living-costs-data";
import {
  PLACE_COUNTY_RELATIONS_META,
  PLACE_COUNTY_RELATIONS_ROWS,
} from "../simulation/place-county-relations.generated";
import type { EntityId } from "../simulation/types";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import type { CoreInput, Source } from "./types";

export interface OpeningCustomerOutsideMarket {
  id: string;
  destinationPlaceId: string;
  originPlaceId: string;
  originPlaceName: string;
  /** Population is geography evidence, never a customer demand multiplier. */
  originSourcePopulation: number;
  basisRecordIds: readonly string[];
  source: Source;
}

export interface OpeningCustomerPlaceContext {
  jurisdictionKey: string;
  region: LivingCostsRegion;
  source: Source;
  outsideMarkets: readonly OpeningCustomerOutsideMarket[];
}

export type OpeningCustomerGeographyProvider = (
  placeId: string,
  input: CoreInput,
) => OpeningCustomerPlaceContext | undefined;

type CountyPart = readonly [
  place: string,
  county: string,
  land: number,
  population: number,
];
let partsByPlace: ReadonlyMap<string, readonly CountyPart[]> | undefined;
let partsByCounty: ReadonlyMap<string, readonly CountyPart[]> | undefined;

/** Opening-only index. No daily world scan, travel outcome, or government authority. */
function geographicParts() {
  if (partsByPlace && partsByCounty) return { partsByPlace, partsByCounty };
  const places = new Map<string, CountyPart[]>();
  const counties = new Map<string, CountyPart[]>();
  for (const part of JSON.parse(PLACE_COUNTY_RELATIONS_ROWS) as CountyPart[]) {
    const [placeId, countyId] = part;
    const placeRows = places.get(placeId) ?? [];
    placeRows.push(part);
    places.set(placeId, placeRows);
    const countyRows = counties.get(countyId) ?? [];
    countyRows.push(part);
    counties.set(countyId, countyRows);
  }
  partsByPlace = places;
  partsByCounty = counties;
  return { partsByPlace, partsByCounty };
}

/**
 * A sourced shared-county geography supplies one bounded outside-market option.
 * It does not establish visits, hotel demand, employment, or a commuting share.
 * Other source-qualified visit markets can use the identical caller-provider seam.
 */
export function createOpeningCustomerGeographyProvider(
  registry: Readonly<Record<string, Parameter>> = PARAMETERS,
): OpeningCustomerGeographyProvider {
  const zero = parameter("zero", registry);
  return (placeId, input) => {
    const metadataPlace = input.placeMetadata?.placeKey
      ? lifePlaceByKey(input.placeMetadata.placeKey)
      : undefined;
    const place =
      lifePlaceByJurisdictionId(placeId as EntityId) ??
      (metadataPlace?.context.jurisdiction.id === placeId
        ? metadataPlace
        : undefined);
    if (!place?.stateJurisdictionKey) return undefined;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: input.startedAt,
      generationPriorVintage:
        "2020 Census place-county population parts; 2025 canonical place directory",
      citation: `${PLACE_COUNTY_RELATIONS_META.source}; ${PLACE_COUNTY_RELATIONS_META.corpusSha256}. Canonical LifePlace ${place.key}.`,
      estimatedFrom:
        "Directory identity and archived county-area membership supply a possible outside origin. They do not establish a visit, nearby distance, hotel stay, supplier choice, or present-day population.",
    };
    const context: OpeningCustomerPlaceContext = {
      jurisdictionKey: place.stateJurisdictionKey,
      region: livingCostsRegionForState(place.stateJurisdictionKey),
      source,
      outsideMarkets: [],
    };
    if (!place.sourceGeoid) return context;
    const parts = geographicParts();
    const destinationParts = parts.partsByPlace.get(place.sourceGeoid) ?? [];
    const counties = new Set(destinationParts.map(([, countyId]) => countyId));
    const representedPlaces = new Set(
      input.people.map((person) => person.placeId),
    );
    const candidates = new Map<
      string,
      { population: number; counties: Set<string> }
    >();
    for (const county of counties) {
      for (const [geoid, countyGeoid, , population] of parts.partsByCounty.get(
        county,
      ) ?? []) {
        if (geoid === place.sourceGeoid || population <= zero) continue;
        const prior = candidates.get(geoid) ?? {
          population: zero,
          counties: new Set<string>(),
        };
        prior.population += population;
        prior.counties.add(countyGeoid);
        candidates.set(geoid, prior);
      }
    }
    // Largest sourced origin is a stable fictional-roster convention, not an outcome roll.
    for (const [geoid, candidate] of [...candidates].sort(
      ([leftGeoid, left], [rightGeoid, right]) =>
        right.population - left.population ||
        leftGeoid.localeCompare(rightGeoid),
    )) {
      const origin = lifePlaceByKey(geoid);
      if (!origin || representedPlaces.has(origin.context.jurisdiction.id))
        continue;
      return {
        ...context,
        outsideMarkets: [
          {
            id: `county-visit-market:${place.sourceGeoid}:${geoid}`,
            destinationPlaceId: placeId,
            originPlaceId: origin.context.jurisdiction.id,
            originPlaceName: origin.displayName,
            originSourcePopulation: candidate.population,
            basisRecordIds: [...candidate.counties]
              .sort()
              .map((county) => `census-2020-place-county:${geoid}:${county}`),
            source: {
              ...source,
              citation: `${source.citation} Actual origin ${origin.displayName}, ${geoid}; positive archived county-part population.`,
            },
          },
        ],
      };
    }
    return context;
  };
}
