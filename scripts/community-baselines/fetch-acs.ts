import type { AcsVintage } from "../../src/community_baselines/types";
import {
  geographyIdToCensusApiParams,
  type GeographyId,
} from "../../src/community_baselines/geography";

export interface FetchAcsOptions {
  vintage: AcsVintage;
  variables?: string[];
  geographyId: GeographyId;
  apiKey?: string;
  cacheDir?: string;
}

export async function fetchCensusAcsData(
  options: FetchAcsOptions,
): Promise<(string | null)[][]> {
  const vintage = options.vintage;
  const endpoint = `https://api.census.gov/data/${vintage}/acs/acs5`;
  const apiKey = options.apiKey || process.env.CENSUS_API_KEY;

  const vars = options.variables || [
    "NAME",
    "B01003_001E",
    "B01003_001M",
    "B09021_001E",
    "B09021_001M",
    "B29001_001E",
    "B29001_001M",
    "B01002_001E",
    "B01002_001M",
    "B19013_001E",
    "B19013_001M",
    "B17001_001E",
    "B17001_001M",
    "B17001_002E",
    "B17001_002M",
    "B23025_001E",
    "B23025_001M",
    "B23025_003E",
    "B23025_003M",
    "B23025_004E",
    "B23025_004M",
    "B23025_005E",
    "B23025_005M",
    "B25003_001E",
    "B25003_001M",
    "B25003_002E",
    "B25003_002M",
    "B25003_003E",
    "B25003_003M",
    "B25064_001E",
    "B25064_001M",
    "B25077_001E",
    "B25077_001M",
  ];

  const geoParams = geographyIdToCensusApiParams(options.geographyId);
  const url = new URL(endpoint);
  url.searchParams.set("get", vars.join(","));
  url.searchParams.set("for", geoParams.for);
  if (geoParams.in) {
    url.searchParams.set("in", geoParams.in);
  }
  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Census API request failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const data = (await response.json()) as (string | null)[][];
  return data;
}
