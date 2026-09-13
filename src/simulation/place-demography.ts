/**
 * One-way place demography read from already-normalized providers.
 *
 * This adapter does not invent a city series. Gazetteer identity has no
 * population field. ACS PUMS is a PUMA/state sample. HUD Fair Market Rent
 * `publishedPopulation` is an FMR-area figure. BEA CAINC1 line 2 is a
 * headcount at the Bureau's own geography. A county observation is never
 * presented as a city count unless this place's sourced government identity
 * names that county-equivalent GEOID. A missing or non-KNOWN value stays
 * unknown; it is not coerced to zero. No voter metric is synthesized.
 */

import { municipalGovernmentForLifePlace } from "./municipal-government";
import type { LifePlace } from "./life-places";

/** Fields the population join actually reads. Broader economic models satisfy this. */
export interface PlaceDemographyBeaObservation {
  readonly kind: string;
  readonly detailKey: string;
  readonly sourceSeriesKey: string;
  readonly period: string;
  readonly geography: {
    readonly providerCode: string;
    readonly providerName: string;
    readonly level: string;
    readonly relationship: string;
  };
  readonly value: {
    readonly state: string;
    readonly value?: number | null;
  };
}

export interface PlaceDemographyEconomicInput {
  readonly observations: readonly PlaceDemographyBeaObservation[];
}

export type PlaceDemographyOmissionReason =
  | "no-place-series"
  | "county-not-city"
  | "metro-not-place"
  | "hud-area-not-place"
  | "acs-pums-not-place"
  | "unknown-value"
  | "voter-unresolved";

export interface PlaceDemographyOmission {
  readonly field: "population" | "demographics" | "voter";
  readonly reason: PlaceDemographyOmissionReason;
  readonly geographyLevel?: string;
  readonly geographyCode?: string;
}

export interface PlacePopulationObservation {
  readonly kind: "population";
  readonly people: number;
  readonly period: string;
  readonly geographyLevel: string;
  readonly geographyCode: string;
  readonly geographyName: string;
  readonly relationship: "same-jurisdiction";
  readonly sourceProduct: "bea-regional";
  readonly sourceSeriesKey: string;
}

export interface PlaceDemographyReadModel {
  readonly placeKey: string;
  readonly censusGeoid: string | null;
  readonly population: PlacePopulationObservation | null;
  readonly omissions: readonly PlaceDemographyOmission[];
}

function digits(value: string | null | undefined): string | null {
  if (!value) return null;
  const only = value.replace(/\D/g, "");
  return only.length > 0 ? only : null;
}

function countyEquivalentDigits(place: LifePlace): string | null {
  const government = municipalGovernmentForLifePlace(place);
  return digits(government?.identity?.countyEquivalentGeoid);
}

function knownNumber(
  value: PlaceDemographyBeaObservation["value"],
): number | "unknown" {
  if (value.state !== "KNOWN") return "unknown";
  if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
    return "unknown";
  }
  return value.value;
}

function geographyMatchesPlace(
  place: LifePlace,
  observation: PlaceDemographyBeaObservation,
): boolean {
  if (observation.geography.relationship !== "same-jurisdiction") return false;
  const geo = digits(observation.geography.providerCode);
  if (!geo) return false;
  if (observation.geography.level === "county") {
    return countyEquivalentDigits(place) === geo;
  }
  return digits(place.sourceGeoid) === geo;
}

function latestMatchingBeaPopulation(
  place: LifePlace,
  economic: PlaceDemographyEconomicInput,
):
  | { readonly status: "missing" }
  | {
      readonly status: "ineligible";
      readonly sample: PlaceDemographyBeaObservation;
      readonly reason: "county-not-city" | "metro-not-place";
    }
  | {
      readonly status: "unknown";
      readonly sample: PlaceDemographyBeaObservation;
    }
  | {
      readonly status: "known";
      readonly observation: PlaceDemographyBeaObservation;
      readonly people: number;
    } {
  const rows = economic.observations.filter(
    (observation) =>
      observation.kind === "bea" && observation.detailKey === "CAINC1:2",
  );
  if (rows.length === 0) return { status: "missing" };
  const eligible = rows.filter((row) => geographyMatchesPlace(place, row));
  if (eligible.length === 0) {
    const countySubstitute = rows.some(
      (row) => row.geography.level === "county",
    );
    return {
      status: "ineligible",
      sample: rows.find((row) => row.geography.level === "county") ?? rows[0]!,
      reason: countySubstitute ? "county-not-city" : "metro-not-place",
    };
  }
  const known = eligible.flatMap((row) => {
    const people = knownNumber(row.value);
    return people === "unknown" ? [] : [{ row, people }];
  });
  if (known.length === 0) {
    return { status: "unknown", sample: eligible[0]! };
  }
  const latest = known.reduce((best, item) =>
    item.row.period > best.row.period ? item : best,
  );
  return {
    status: "known",
    observation: latest.row,
    people: latest.people,
  };
}

/**
 * Population and demographic facts a life-place can honestly carry from
 * existing locked providers. Presentation may omit the card entirely when
 * `population` is null; it must not fill from county, metro, HUD, or PUMS.
 */
export function readPlaceDemography(
  place: LifePlace,
  economic?: PlaceDemographyEconomicInput | null,
): PlaceDemographyReadModel {
  const omissions: PlaceDemographyOmission[] = [
    { field: "voter", reason: "voter-unresolved" },
    { field: "demographics", reason: "no-place-series" },
    { field: "population", reason: "acs-pums-not-place" },
    { field: "population", reason: "hud-area-not-place" },
  ];

  const censusGeoid = place.sourceGeoid ?? null;
  if (!economic) {
    omissions.push({ field: "population", reason: "no-place-series" });
    return {
      placeKey: place.key,
      censusGeoid,
      population: null,
      omissions,
    };
  }

  const bea = latestMatchingBeaPopulation(place, economic);
  if (bea.status === "missing") {
    omissions.push({ field: "population", reason: "no-place-series" });
    return {
      placeKey: place.key,
      censusGeoid,
      population: null,
      omissions,
    };
  }
  if (bea.status === "unknown") {
    omissions.push({
      field: "population",
      reason: "unknown-value",
      geographyLevel: bea.sample.geography.level,
      geographyCode: bea.sample.geography.providerCode,
    });
    return {
      placeKey: place.key,
      censusGeoid,
      population: null,
      omissions,
    };
  }
  if (bea.status === "ineligible") {
    omissions.push({
      field: "population",
      reason: bea.reason,
      geographyLevel: bea.sample.geography.level,
      geographyCode: bea.sample.geography.providerCode,
    });
    return {
      placeKey: place.key,
      censusGeoid,
      population: null,
      omissions,
    };
  }

  return {
    placeKey: place.key,
    censusGeoid,
    population: {
      kind: "population",
      people: bea.people,
      period: bea.observation.period,
      geographyLevel: bea.observation.geography.level,
      geographyCode: bea.observation.geography.providerCode,
      geographyName: bea.observation.geography.providerName,
      relationship: "same-jurisdiction",
      sourceProduct: "bea-regional",
      sourceSeriesKey: bea.observation.sourceSeriesKey,
    },
    omissions,
  };
}
