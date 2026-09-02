/**
 * Bureau of Economic Analysis (BEA) Regional Economy Corpus Sidecar
 * Public API and Query Utilities.
 */

export * from "./types.js";
export * from "./validator.js";
export * from "./compiler.js";

import type {
  BeaEconomyAdapterNote,
  BeaGeoLevel,
  BeaIndicatorCategory,
  BeaRegionalObservation,
} from "./types.js";

export const BEA_ECONOMY_ADAPTER_NOTE: BeaEconomyAdapterNote = {
  adapterInterfaceVersion: "1.0.0",
  purpose:
    "Provide source-backed empirical BEA regional indicators to future economy and fiscal simulation engines.",
  supportedIndicators: [
    "personal_income",
    "per_capita_personal_income",
    "gdp_nominal",
    "gdp_real",
    "population",
    "regional_price_parity",
  ],
  supportedGeoLevels: ["state", "county", "msa", "national"],
  valuationSeparationPolicy:
    "Nominal, real-chained, and index series must remain explicitly typed and never directly summed or equated without explicit conversion.",
  missingValuePolicy:
    "Missing or suppressed values remain explicit nulls; adapters must handle incomplete series without inventing fake baseline defaults.",
  gameplayModifierPolicy:
    "This corpus sidecar strictly prohibits embedding political scores, recession triggers, or gameplay modifiers inside canonical dataset artifacts.",
};

export class BeaRegionalEconomyCorpus {
  private observations: BeaRegionalObservation[];
  private indexByGeoidYearCategory: Map<string, BeaRegionalObservation>;

  constructor(observations: BeaRegionalObservation[]) {
    this.observations = observations;
    this.indexByGeoidYearCategory = new Map();

    for (const obs of observations) {
      const key = `${obs.geoid}_${obs.year}_${obs.indicatorCategory}`;
      this.indexByGeoidYearCategory.set(key, obs);
    }
  }

  public getAllObservations(): readonly BeaRegionalObservation[] {
    return this.observations;
  }

  public getObservation(
    geoid: string,
    year: number,
    indicatorCategory: BeaIndicatorCategory,
  ): BeaRegionalObservation | undefined {
    const cleanGeoid = geoid.trim().padStart(5, "0");
    const key = `${cleanGeoid}_${year}_${indicatorCategory}`;
    return this.indexByGeoidYearCategory.get(key);
  }

  public getObservationsForGeo(geoid: string): BeaRegionalObservation[] {
    const cleanGeoid = geoid.trim().padStart(5, "0");
    return this.observations.filter((obs) => obs.geoid === cleanGeoid);
  }

  public getObservationsByLevel(
    geoLevel: BeaGeoLevel,
    year?: number,
  ): BeaRegionalObservation[] {
    return this.observations.filter(
      (obs) =>
        obs.geoLevel === geoLevel && (year === undefined || obs.year === year),
    );
  }

  public getAdapterNote(): BeaEconomyAdapterNote {
    return BEA_ECONOMY_ADAPTER_NOTE;
  }
}
