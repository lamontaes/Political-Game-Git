/** Empirical map context; never a count or attribute of simulated people. */
import { districtIdentityCatalog } from "../districts/catalog";
import type { MapLayerId } from "../maps/geometry-types";
import { makeIsoDate } from "../simulation/dates";
import { lifePlaceByKey } from "../simulation/life-places";
import { hometownCountyEquivalentGeoid } from "./place-hometown-population";
import type {
  BrowserArtifactLock,
  BrowserBeaRecord,
  BrowserEconomicManifest,
  BrowserEconomicShard,
} from "./economic-context-browser-types";

/** One international mile is exactly 1,609.344 meters. */
const SQUARE_METERS_PER_SQUARE_MILE = 1_609.344 ** 2;

export interface MapDemographySource {
  readonly artifactId: string;
  readonly sha256: string;
  readonly url: string;
}
export interface MapDemographySelection {
  readonly layer: MapLayerId;
  readonly geoid: string;
  readonly stateUsps: string;
  readonly asOf: string;
  readonly landArea?: {
    readonly layer: MapLayerId;
    readonly geoid: string;
    readonly stateUsps: string;
    readonly squareMeters: number;
    readonly referencePeriod: string;
    readonly source: MapDemographySource;
  };
}
export interface MapDemographyMetric {
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly period: string;
  readonly geography: {
    readonly level: string;
    readonly geoid: string;
    readonly name: string;
  };
  readonly source: MapDemographySource;
  readonly series: string;
  readonly release: string;
  readonly retrievedAt: string;
  readonly publisherReleaseDate: string | null;
}
export interface MapPlaceDemography {
  readonly selection: MapDemographySelection;
  readonly referenceKind: "dated-real-world-context";
  readonly boundary: string;
  readonly population: MapDemographyMetric | null;
  readonly density:
    | (MapDemographyMetric & { readonly landAreaSource: MapDemographySource })
    | null;
  readonly detailFields: readonly MapDemographyMetric[];
  readonly omissions: readonly {
    readonly field: string;
    readonly reason: string;
  }[];
}
export interface MapDemographyQueryOptions {
  readonly baseUrl?: string;
  readonly fetchJson?: (url: string) => Promise<unknown>;
}
const stateFips = new Map(
  districtIdentityCatalog().map((row) => [row.stateUsps, row.stateFips]),
);
stateFips.set("DC", "11");

function binding(
  selection: MapDemographySelection,
): { level: "state" | "county"; geoid: string } | null {
  const fips = stateFips.get(selection.stateUsps);
  if (!fips || !selection.geoid.startsWith(fips)) return null;
  if (selection.layer === "state" && selection.geoid === fips)
    return { level: "state", geoid: `${fips}000` };
  if (selection.layer === "county" && /^\d{5}$/.test(selection.geoid))
    return { level: "county", geoid: selection.geoid };
  if (selection.layer === "place" && /^\d{7}$/.test(selection.geoid)) {
    const place = lifePlaceByKey(selection.geoid);
    const county = place && hometownCountyEquivalentGeoid(place);
    if (county) return { level: "county", geoid: county };
  }
  return null;
}

/** A later missing/suppressed value does not silently fall back to an older year. */
function latestMetric(
  rows: readonly BrowserBeaRecord[],
  lock: BrowserArtifactLock,
  selected: { level: string; geoid: string },
  asOf: string,
  line: "2" | "3",
): MapDemographyMetric | null {
  const eligible = rows
    .filter((row) => {
      const artifact = lock.artifacts.find(
        (item) => item.artifactId === row.evidence?.artifactId,
      );
      return (
        row.tableName === "CAINC1" &&
        row.lineCode === line &&
        row.geoFips === selected.geoid &&
        row.geographyLevel === selected.level &&
        /^\d{4}$/.test(row.year) &&
        `${row.year}-12-31` <= asOf &&
        artifact &&
        (!artifact.publisher.releaseDate ||
          artifact.publisher.releaseDate <= asOf)
      );
    })
    .sort((a, b) => b.year.localeCompare(a.year));
  const row = eligible[0];
  if (
    !row ||
    row.value.state !== "KNOWN" ||
    !Number.isFinite(row.value.value) ||
    row.value.value < 0
  )
    return null;
  if (
    (line === "2" &&
      (row.valuationKind !== "headcount" ||
        row.unit !== "Number of persons")) ||
    (line === "3" && row.valuationKind !== "currency-per-person")
  )
    return null;
  if (row.value.asOf > asOf) return null;
  const artifact = lock.artifacts.find(
    (item) => item.artifactId === row.evidence.artifactId,
  )!;
  return {
    label: line === "2" ? "Population" : "Per-capita personal income",
    value: row.value.value,
    unit: row.unit,
    period: row.year,
    geography: {
      level: row.geographyLevel,
      geoid: row.geoFips,
      name: row.geoName,
    },
    source: {
      artifactId: artifact.artifactId,
      sha256: artifact.bytes.sha256,
      url: artifact.retrieval.url,
    },
    series: `BEA CAINC1 line ${line}`,
    release: row.value.release,
    retrievedAt: artifact.retrieval.retrievedAt,
    publisherReleaseDate: artifact.publisher.releaseDate,
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok)
    throw new Error(`Map demographic request failed (${response.status}).`);
  return response.json();
}

/** Reads existing production shards only. Reference year and actual publisher release
 * dates are guarded; acquisition time is retained but is not a publication date. */
export async function queryMapPlaceDemography(
  selection: MapDemographySelection,
  options: MapDemographyQueryOptions = {},
): Promise<MapPlaceDemography> {
  const omissions: { field: string; reason: string }[] = [
    {
      field: "ACS profile",
      reason:
        "No acquired ACS profile supports age, race/ethnicity, education, household income or housing characteristics here.",
    },
    {
      field: "Voter affiliation",
      reason:
        "No sourced voter-registration or party-affiliation series is available.",
    },
  ];
  let population: MapDemographyMetric | null = null;
  let income: MapDemographyMetric | null = null;
  let unavailable =
    "No compatible population observation is available by this date.";
  try {
    makeIsoDate(selection.asOf);
    const selected = binding(selection);
    if (!selected) {
      unavailable =
        "No exact or reviewed equivalent demographic geography is available for this selection.";
    } else {
      const base = (options.baseUrl ?? "/data/economic-context/v1").replace(
        /\/$/,
        "",
      );
      const load = options.fetchJson ?? fetchJson;
      const manifest = (await load(
        `${base}/manifest.json`,
      )) as BrowserEconomicManifest;
      if (
        manifest.schemaVersion !== "1" ||
        manifest.corpora.bea.inputClass !== "production"
      )
        throw new Error("Unsupported demographic manifest");
      const path = manifest.indexes.bea[`${selected.level}:${selected.geoid}`];
      if (path) {
        const shard = (await load(
          `${base}/${path}`,
        )) as BrowserEconomicShard<BrowserBeaRecord>;
        if (
          shard.schemaVersion !== "1" ||
          shard.product !== "bea" ||
          !Array.isArray(shard.records)
        )
          throw new Error("Unsupported demographic shard");
        population = latestMetric(
          shard.records,
          manifest.locks.bea,
          selected,
          selection.asOf,
          "2",
        );
        income = latestMetric(
          shard.records,
          manifest.locks.bea,
          selected,
          selection.asOf,
          "3",
        );
      }
    }
  } catch {
    population = null;
    income = null;
    unavailable =
      "Demographic data could not be read for this selection and date.";
  }
  let density: MapPlaceDemography["density"] = null;
  const area = selection.landArea;
  if (
    population &&
    area &&
    area.layer === selection.layer &&
    area.geoid === selection.geoid &&
    area.stateUsps === selection.stateUsps &&
    area.referencePeriod === population.period &&
    Number.isFinite(area.squareMeters) &&
    area.squareMeters > 0 &&
    area.source.artifactId &&
    /^[a-f0-9]{64}$/.test(area.source.sha256) &&
    /^https?:\/\//.test(area.source.url)
  ) {
    // Players read density per square mile; the source measures square meters.
    const value =
      population.value / (area.squareMeters / SQUARE_METERS_PER_SQUARE_MILE);
    if (Number.isFinite(value))
      density = {
        ...population,
        label: "Population density",
        value,
        unit: "people per square mile",
        landAreaSource: area.source,
      };
  }
  if (!population) omissions.push({ field: "Population", reason: unavailable });
  if (!density)
    omissions.push({
      field: "Population density",
      reason:
        "Requires population and sourced land area for the same geography and reference year.",
    });
  if (!income)
    omissions.push({
      field: "Per-capita personal income",
      reason: "No compatible observation is available by this date.",
    });
  return {
    selection: structuredClone(selection),
    referenceKind: "dated-real-world-context",
    boundary:
      "These historical statistics describe the real-world area, not the people generated in this save. Per-capita personal income is not median household income.",
    population,
    density,
    detailFields: income ? [income] : [],
    omissions,
  };
}
