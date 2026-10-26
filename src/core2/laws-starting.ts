/**
 * The start date's real law for every level that covers a place.
 *
 * Rows come from `data/laws/starting-law.json`, which
 * `scripts/research/build-starting-law.py` builds from the sourced research
 * files. A place's chain is federal, its state (or district or territory), its
 * county areas, the township over it where one governs, and the place itself; only those jurisdictions' rows load, so a
 * world never carries another place's law.
 */
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };
import {
  countyGeoidsForPlace,
  governmentUnitsForPlace,
} from "./reference/government-units";
import { corePlaceByKey } from "./place-lookup";
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";

export type LawLevelName = "federal" | "state" | "county" | "township" | "city";

export interface LawChainLevel {
  readonly level: LawLevelName;
  readonly jurisdiction: string;
}

export interface LawChain {
  readonly placeKey: string;
  readonly placeName: string;
  /** The town's place id in a world: its jurisdiction entity id. */
  readonly townPlaceId: string;
  readonly stateKey: string;
  /** County areas the place lies in, largest land share first. */
  readonly countyGeoids: readonly string[];
  /** A municipality governs the place; false for an unincorporated community. */
  readonly incorporated: boolean;
  readonly levels: readonly LawChainLevel[];
}

export interface StartingLawRow {
  readonly level: LawLevelName;
  readonly series: string;
  readonly tier: string;
  readonly value: number | null;
  readonly effectiveDate: string;
  readonly endDate: string | null;
  readonly source: string | readonly string[];
  readonly retrieved: string;
  readonly estimate: boolean;
  readonly unit?: string;
  readonly terms?: Readonly<Record<string, unknown>>;
  readonly note?: string;
}

/** A starting-law row placed in a world: jurisdiction and a stable id added. */
export interface LawRowInput extends StartingLawRow {
  readonly id: string;
  readonly jurisdiction: string;
}

interface PropertyTaxTable {
  readonly series: string;
  readonly unit: string;
  readonly source: readonly string[];
  readonly method: string;
  readonly retrieved: string;
  readonly states: Readonly<
    Record<
      string,
      {
        rate: number;
        spreadLow: number;
        spreadHigh: number;
        source?: string;
        basis?: string;
      }
    >
  >;
  readonly counties: Readonly<Record<string, number>>;
}

const data = startingLaw as unknown as {
  jurisdictions: Readonly<Record<string, readonly StartingLawRow[]>>;
  propertyTax: PropertyTaxTable;
};

export function lawChainForPlace(placeKey: string): LawChain {
  const place = corePlaceByKey(placeKey);
  if (!place) throw new Error(`Law chain needs a recorded place: ${placeKey}`);
  const stateKey = place.stateJurisdictionKey;
  if (!stateKey)
    throw new Error(`Law chain needs the place's state: ${placeKey}`);
  const geoid = place.sourceGeoid ?? place.key;
  const counties = countyGeoidsForPlace(geoid);
  return {
    placeKey,
    placeName: place.displayName,
    townPlaceId: place.context.jurisdiction.id,
    stateKey,
    countyGeoids: counties,
    incorporated: governmentUnitsForPlace(geoid).some(
      (unit) => unit.unitType === "municipality",
    ),
    levels: [
      { level: "federal", jurisdiction: "US" },
      { level: "state", jurisdiction: stateKey },
      ...counties.map((county): LawChainLevel => ({
        level: "county",
        jurisdiction: `county:${county}`,
      })),
      // A township over the place makes its own law, between its county's and the city's.
      ...placeLocalGovernmentUnits(place)
        .townships.slice(0, 1)
        .map((unit): LawChainLevel => ({
          level: "township",
          jurisdiction: unit.id,
        })),
      { level: "city", jurisdiction: `place:${geoid}` },
    ],
  };
}

export function lawRowId(
  jurisdiction: string,
  row: Pick<StartingLawRow, "series" | "tier" | "effectiveDate" | "level">,
): string {
  return `law:${jurisdiction}:${row.level}:${row.series}:${row.tier}:${row.effectiveDate}`;
}

/** Every starting-law row for the jurisdictions in a place's chain. */
export function startingLawRows(chain: LawChain): readonly LawRowInput[] {
  const rows: LawRowInput[] = [];
  for (const { jurisdiction } of chain.levels)
    for (const row of data.jurisdictions[jurisdiction] ?? [])
      rows.push({ ...row, jurisdiction, id: lawRowId(jurisdiction, row) });
  rows.push(...propertyTaxRows(chain));
  return rows;
}

/**
 * Property tax is a survey estimate of every level's tax on a home together:
 * median taxes paid over median value, by county, from the Census Bureau's
 * American Community Survey; the state figure where the county is not
 * published, with the state's middle half of county rates as its spread.
 */
function propertyTaxRows(chain: LawChain): readonly LawRowInput[] {
  const table = data.propertyTax;
  const state = table.states[chain.stateKey];
  const county = chain.countyGeoids.find((id) => id in table.counties);
  const base = {
    series: "property-tax",
    tier: "general",
    effectiveDate: "2026-01-01",
    endDate: null,
    retrieved: table.retrieved,
    estimate: true,
    unit: "percent-of-home-value",
  };
  if (county !== undefined) {
    const jurisdiction = `county:${county}`;
    const row = {
      ...base,
      level: "county" as const,
      value: table.counties[county]!,
      source: table.source,
      terms: {
        method: table.method,
        spreadLow: state?.spreadLow ?? null,
        spreadHigh: state?.spreadHigh ?? null,
      },
    };
    return [{ ...row, jurisdiction, id: lawRowId(jurisdiction, row) }];
  }
  if (!state) return [];
  const jurisdiction = chain.stateKey;
  const row = {
    ...base,
    level: "state" as const,
    value: state.rate,
    source: state.source ?? table.source,
    terms: {
      method: state.basis ?? table.method,
      spreadLow: state.spreadLow,
      spreadHigh: state.spreadHigh,
      appliesAs: "state estimate: the county is not published",
    },
  };
  return [{ ...row, jurisdiction, id: lawRowId(jurisdiction, row) }];
}
