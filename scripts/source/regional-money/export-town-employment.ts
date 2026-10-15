/**
 * Export the compact county industry mix and state public-employment mix the
 * town's jobs are sized from.
 *
 * Reads the locked regional corpora merged in #701 and writes
 * `src/simulation/living-world/town-employment.generated.ts`:
 *
 * - For every county in the Census 2023 County Business Patterns file, its
 *   March employment in each two-digit industry sector, in the fixed sector
 *   order `TOWN_EMPLOYMENT_SECTORS`. County Business Patterns covers private
 *   employers only.
 * - For every state and D.C. in the BLS May 2025 OEWS state tables, its total
 *   wage and salary employment, and from the BLS state ownership research
 *   estimates its federal, state and local government employment, with local
 *   government split by major occupation group.
 *
 * A published cell BLS or Census withheld stays missing (an empty field), never
 * zero. Run with
 * `node --import tsx scripts/source/regional-money/export-town-employment.ts`.
 * The output is committed so the browser build never reads the corpora.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

export const TOWN_EMPLOYMENT_OUTPUT_PATH =
  "src/simulation/living-world/town-employment.generated.ts";

/** Two-digit NAICS sectors, in the order the county rows list them. */
export const SECTORS = [
  "11",
  "21",
  "22",
  "23",
  "31",
  "42",
  "44",
  "48",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "61",
  "62",
  "71",
  "72",
  "81",
] as const;

/** Local government major occupation groups kept, in row order. */
export const LOCAL_GROUPS = [
  "11",
  "13",
  "21",
  "25",
  "29",
  "31",
  "33",
  "37",
  "43",
  "47",
  "49",
  "53",
] as const;

function load(base: string) {
  const manifest = JSON.parse(
    readFileSync(`data/source/${base}/regional-corpus-manifest.json`, "utf8"),
  ) as { corpusPath: string; canonicalSha256: string; asOf: string };
  const corpus = JSON.parse(
    gunzipSync(readFileSync(manifest.corpusPath)).toString("utf8"),
  ) as { rows: Record<string, unknown>[] };
  return { manifest, rows: corpus.rows };
}

const cell = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "";

export function renderTownEmploymentModule(): string {
  const cbp = load("county-business-patterns");
  const counties = new Map<string, Map<string, number>>();
  for (const row of cbp.rows) {
    const naics = String(row.naics).slice(0, 2);
    if (!(SECTORS as readonly string[]).includes(naics)) continue;
    const fips = String(row.countyFips);
    let sectors = counties.get(fips);
    if (!sectors) counties.set(fips, (sectors = new Map()));
    if (typeof row.employment === "number") sectors.set(naics, row.employment);
  }
  const countyRows = [...counties.keys()]
    .sort()
    .map(
      (fips) =>
        `${fips}:${SECTORS.map((sector) => cell(counties.get(fips)!.get(sector))).join(",")}`,
    )
    .join(";");

  const occupations = load("career-occupations");
  const stateTotals = new Map<string, number | null>();
  for (const row of occupations.rows)
    if (
      row.scope === "state" &&
      row.occupationCode === "00-0000" &&
      typeof row.areaCode === "string" &&
      row.areaCode.length === 2
    )
      stateTotals.set(
        row.areaCode,
        typeof row.employment === "number" ? row.employment : null,
      );

  const publicEmployment = load("public-employment");
  const ownership = new Map<string, Map<string, number | null>>();
  for (const row of publicEmployment.rows) {
    if (row.scope !== "state-research" || typeof row.stateFips !== "string")
      continue;
    const code = String(row.occupationCode);
    const own = String(row.ownershipCode);
    const key =
      code === "00-0000"
        ? `total:${own}`
        : own === "3" && row.occupationGroup === "major"
          ? `local:${code.slice(0, 2)}`
          : null;
    if (!key) continue;
    let state = ownership.get(row.stateFips);
    if (!state) ownership.set(row.stateFips, (state = new Map()));
    state.set(key, typeof row.employment === "number" ? row.employment : null);
  }
  const stateRows = [...stateTotals.keys()]
    .filter((fips) => ownership.has(fips))
    .sort()
    .map((fips) => {
      const state = ownership.get(fips)!;
      return [
        fips,
        [
          cell(stateTotals.get(fips)),
          cell(state.get("total:1")),
          cell(state.get("total:2")),
          cell(state.get("total:3")),
          ...LOCAL_GROUPS.map((group) => cell(state.get(`local:${group}`))),
        ].join(","),
      ].join(":");
    })
    .join(";");

  const meta = {
    countyBusinessPatterns: {
      source:
        "Census Bureau, 2023 County Business Patterns, county file, March employment by two-digit NAICS sector (private employers).",
      corpusSha256: cbp.manifest.canonicalSha256,
      asOf: cbp.manifest.asOf,
    },
    stateEmployment: {
      source:
        "BLS Occupational Employment and Wage Statistics, May 2025, state tables, all occupations.",
      corpusSha256: occupations.manifest.canonicalSha256,
      asOf: occupations.manifest.asOf,
    },
    publicEmployment: {
      source:
        "BLS OEWS May 2025 state ownership research estimates: federal, state and local government, including schools and hospitals. BLS notes these carry more model error than standard estimates.",
      corpusSha256: publicEmployment.manifest.canonicalSha256,
      asOf: publicEmployment.manifest.asOf,
    },
    sectors: SECTORS,
    localGroups: LOCAL_GROUPS,
  };

  return `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-town-employment.ts\` from
 * the locked regional corpora. An empty field is a figure the source withheld
 * or did not publish, never zero.
 */

export const TOWN_EMPLOYMENT_META = ${JSON.stringify(meta, null, 2)} as const;

/** \`county:employment per sector, in TOWN_EMPLOYMENT_META.sectors order\`. */
export const COUNTY_SECTOR_EMPLOYMENT =
  ${JSON.stringify(countyRows)};

/**
 * \`state:total,federal,state government,local government,local government by
 * major group in TOWN_EMPLOYMENT_META.localGroups order\`.
 */
export const STATE_PUBLIC_EMPLOYMENT =
  ${JSON.stringify(stateRows)};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(TOWN_EMPLOYMENT_OUTPUT_PATH, renderTownEmploymentModule());
  console.log(`wrote ${TOWN_EMPLOYMENT_OUTPUT_PATH}`);
}
