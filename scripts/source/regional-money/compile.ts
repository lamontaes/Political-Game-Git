/** Source-only regional pay, geography, and business calibration. No runtime binding. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  listZipMembers,
  readZipMember,
} from "../../../src/source/core/archive/zip";
import {
  listXlsxSheets,
  readXlsxSheet,
} from "../../../src/source/core/archive/xlsx";
import { toCanonicalJson } from "../../../src/source/core/canonical-json";

const root = process.cwd();
const check = process.argv.includes("--check");
const asOf = "2026-09-26";
const requiredStateFips =
  "01 02 04 05 06 08 09 10 11 12 13 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 44 45 46 47 48 49 50 51 53 54 55 56".split(
    " ",
  );
type Row = readonly string[];

function artifact(
  path: string,
  url: string,
  vintage: string,
  mediaType: string,
) {
  const bytes = readFileSync(join(root, path));
  const members =
    mediaType === "application/zip"
      ? listZipMembers(bytes)
          .filter((member) => !member.path.endsWith("/"))
          .map((member) => {
            const memberBytes = readZipMember(bytes, member.path);
            return {
              path: member.path,
              length: memberBytes.length,
              sha256: createHash("sha256").update(memberBytes).digest("hex"),
            };
          })
      : [];
  return {
    localPath: path,
    url,
    vintage,
    mediaType,
    length: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    members,
  };
}
function write(path: string, value: unknown) {
  const bytes = toCanonicalJson(value);
  const target = join(root, path);
  if (check) {
    if (readFileSync(target, "utf8") !== bytes)
      throw new Error(`Stale ${path}`);
  } else writeFileSync(target, bytes);
  console.log(`${check ? "checked" : "wrote"} ${path}`);
}
function writeCompressed(path: string, value: unknown): string {
  const canonical = toCanonicalJson(value, 0);
  const bytes = gzipSync(Buffer.from(canonical), { level: 9 });
  const target = join(root, path);
  if (check) {
    if (!readFileSync(target).equals(bytes)) throw new Error(`Stale ${path}`);
  } else writeFileSync(target, bytes);
  console.log(`${check ? "checked" : "wrote"} ${path}`);
  return createHash("sha256").update(canonical).digest("hex");
}
function sheet(path: string, name: string): readonly Row[] {
  const bytes = readFileSync(join(root, path));
  if (!listXlsxSheets(bytes).includes(name))
    throw new Error(`Missing ${name} in ${path}`);
  return readXlsxSheet(bytes, name).rows;
}
function zippedSheet(
  path: string,
  member: string,
  name: string,
): readonly Row[] {
  return readXlsxSheet(
    readZipMember(readFileSync(join(root, path)), member),
    name,
  ).rows;
}
function headerMap(row: Row, required: readonly string[]) {
  const positions = Object.fromEntries(row.map((key, i) => [key, i]));
  for (const key of required)
    if (positions[key] === undefined) throw new Error(`Missing column ${key}`);
  return (row: Row, key: string) => row[positions[key]!] ?? "";
}
function numeric(raw: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
function lockAndManifest(
  prefix: string,
  corpus: unknown,
  artifacts: readonly ReturnType<typeof artifact>[],
  count: number,
  coverage: unknown,
) {
  const corpusPath = `${prefix}/regional-corpus.json.gz`;
  const digest = writeCompressed(corpusPath, corpus);
  write(`${prefix}/regional-artifact-lock.json`, { asOf, artifacts });
  write(`${prefix}/regional-corpus-manifest.json`, {
    asOf,
    compiler: "scripts/source/regional-money/compile.ts",
    corpusPath,
    compression: "gzip",
    canonicalSha256: digest,
    recordCount: count,
    inputs: artifacts.map(({ localPath, sha256 }) => ({ localPath, sha256 })),
    coverage,
  });
}

const statePath = "data/source/career-occupations/raw/oews-state-2025.zip";
const areaPath = "data/source/career-occupations/raw/oews-area-2025.zip";
const wageArtifacts = [
  artifact(
    statePath,
    "https://www.bls.gov/oes/special-requests/oesm25st.zip",
    "May 2025",
    "application/zip",
  ),
  artifact(
    areaPath,
    "https://www.bls.gov/oes/special-requests/oesm25ma.zip",
    "May 2025",
    "application/zip",
  ),
];
const wageRows: unknown[] = [];
const wageAreas = new Map<string, string>();
const stateCodes = new Set<string>();
const missingWages = new Map<string, number>();
for (const [path, member, name, scope] of [
  [statePath, "oesm25st/state_M2025_dl.xlsx", "state_M2025_dl", "state"],
  [areaPath, "oesm25ma/MSA_M2025_dl.xlsx", "MSA_M2025_dl", "area"],
  [areaPath, "oesm25ma/BOS_M2025_dl.xlsx", "BOS_M2025_dl", "area"],
] as const) {
  const rows = zippedSheet(path, member, name);
  const get = headerMap(rows[0]!, [
    "AREA",
    "AREA_TITLE",
    "AREA_TYPE",
    "PRIM_STATE",
    "NAICS",
    "OWN_CODE",
    "OCC_CODE",
    "OCC_TITLE",
    "O_GROUP",
    "TOT_EMP",
    "A_MEAN",
    "A_MEDIAN",
  ]);
  for (const row of rows.slice(1)) {
    if (get(row, "NAICS") !== "000000" || get(row, "OWN_CODE") !== "1235")
      continue;
    const areaCode = get(row, "AREA");
    const occupationCode = get(row, "OCC_CODE");
    if (!areaCode || !occupationCode)
      throw new Error(`Blank area or occupation in ${path}`);
    if (scope === "state") stateCodes.add(areaCode);
    else wageAreas.set(areaCode, get(row, "AREA_TITLE"));
    const medianRaw = get(row, "A_MEDIAN");
    const meanRaw = get(row, "A_MEAN");
    for (const raw of [medianRaw, meanRaw])
      if (raw && numeric(raw) === null)
        missingWages.set(raw, (missingWages.get(raw) ?? 0) + 1);
    wageRows.push({
      scope,
      areaCode,
      areaTitle: get(row, "AREA_TITLE"),
      areaType: get(row, "AREA_TYPE"),
      primaryState: get(row, "PRIM_STATE"),
      occupationCode,
      occupationTitle: get(row, "OCC_TITLE"),
      occupationGroup: get(row, "O_GROUP"),
      employment: numeric(get(row, "TOT_EMP")),
      employmentRaw: get(row, "TOT_EMP"),
      annualMeanUsd: numeric(meanRaw),
      annualMeanRaw: meanRaw,
      annualMedianUsd: numeric(medianRaw),
      annualMedianRaw: medianRaw,
    });
  }
}
for (const code of requiredStateFips)
  if (!stateCodes.has(code))
    throw new Error(`Missing state wage observations for ${code}`);
lockAndManifest(
  "data/source/career-occupations",
  {
    vintage: "May 2025",
    unit: "annual USD; employment persons",
    rows: wageRows,
  },
  wageArtifacts,
  wageRows.length,
  {
    stateCount: stateCodes.size,
    requiredStateAndDcCount: requiredStateFips.length,
    areaCount: wageAreas.size,
    missingWageTokens: Object.fromEntries(missingWages),
  },
);

const cbsaPath = "data/source/cbsa-delineations/raw/cbsa-county-2023.xlsx";
const definitionsPath =
  "data/source/cbsa-delineations/raw/oews-area-definitions-2025.xlsx";
const geoArtifacts = [
  artifact(
    cbsaPath,
    "https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx",
    "July 2023",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ),
  artifact(
    definitionsPath,
    "https://www.bls.gov/oes/area_definitions_m2025.xlsx",
    "May 2025",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ),
];
const cbsaRows = sheet(cbsaPath, "List 1");
const cbsaGet = headerMap(cbsaRows[2]!, [
  "CBSA Code",
  "Metropolitan Division Code",
  "Metropolitan/Micropolitan Statistical Area",
  "FIPS State Code",
  "FIPS County Code",
]);
const cbsaByCounty = new Map<
  string,
  { cbsaCode: string; divisionCode: string | null; classification: string }
>();
for (const row of cbsaRows.slice(3)) {
  const countyFips = `${cbsaGet(row, "FIPS State Code")}${cbsaGet(row, "FIPS County Code")}`;
  if (!/^\d{5}$/.test(countyFips)) continue;
  if (cbsaByCounty.has(countyFips))
    throw new Error(`Duplicate CBSA county ${countyFips}`);
  cbsaByCounty.set(countyFips, {
    cbsaCode: cbsaGet(row, "CBSA Code"),
    divisionCode: cbsaGet(row, "Metropolitan Division Code") || null,
    classification: cbsaGet(row, "Metropolitan/Micropolitan Statistical Area"),
  });
}
const definitionRows = sheet(definitionsPath, "area_definitions_m2025");
const areaGet = headerMap(definitionRows[0]!, [
  "FIPS Code",
  "State",
  "State Abbreviation",
  "May 2025 Area Code",
  "May 2025 Area Title",
  "County Code",
  "County Name",
]);
const countyRows: unknown[] = [];
const seenCounties = new Set<string>();
const geoStates = new Set<string>();
const unmatchedWageAreas = new Set<string>();
for (const row of definitionRows.slice(1)) {
  const stateFips = areaGet(row, "FIPS Code");
  const countyFips = `${stateFips}${areaGet(row, "County Code")}`;
  const areaCode = areaGet(row, "May 2025 Area Code");
  if (!/^\d{5}$/.test(countyFips) || !areaCode)
    throw new Error(`Invalid BLS county ${countyFips}`);
  if (seenCounties.has(countyFips))
    throw new Error(`Duplicate BLS county ${countyFips}`);
  seenCounties.add(countyFips);
  geoStates.add(stateFips);
  if (!wageAreas.has(areaCode)) unmatchedWageAreas.add(areaCode);
  const cbsa = cbsaByCounty.get(countyFips) ?? null;
  countyRows.push({
    countyFips,
    countyName: areaGet(row, "County Name"),
    stateFips,
    state: areaGet(row, "State"),
    stateAbbreviation: areaGet(row, "State Abbreviation"),
    oewsAreaCode: areaCode,
    oewsAreaTitle: areaGet(row, "May 2025 Area Title"),
    wageAreaAvailable: wageAreas.has(areaCode),
    cbsaCode: cbsa?.cbsaCode ?? null,
    metroDivisionCode: cbsa?.divisionCode ?? null,
    cbsaClassification: cbsa?.classification ?? null,
  });
}
for (const code of requiredStateFips)
  if (!geoStates.has(code))
    throw new Error(`Missing state geography for ${code}`);
lockAndManifest(
  "data/source/cbsa-delineations",
  { censusVintage: "July 2023", blsVintage: "May 2025", rows: countyRows },
  geoArtifacts,
  countyRows.length,
  {
    stateCount: geoStates.size,
    requiredStateAndDcCount: requiredStateFips.length,
    countyCount: seenCounties.size,
    areasWithoutWageRows: [...unmatchedWageAreas].sort(),
    cbsaCountyCount: cbsaByCounty.size,
  },
);

const cbpPath = "data/source/county-business-patterns/raw/cbp-county-2023.zip";
const cbpArtifacts = [
  artifact(
    cbpPath,
    "https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23co.zip",
    "2023",
    "application/zip",
  ),
];
const cbpText = readZipMember(
  readFileSync(join(root, cbpPath)),
  "cbp23co.txt",
).toString("utf8");
const lines = cbpText.split(/\r?\n/);
const cbpHeader = lines.shift()!.replaceAll('"', "").split(",");
const cbpGet = headerMap(cbpHeader, [
  "fipstate",
  "fipscty",
  "naics",
  "emp_nf",
  "emp",
  "est",
  "n<5",
  "n5_9",
  "n10_19",
  "n20_49",
  "n50_99",
  "n100_249",
  "n250_499",
  "n500_999",
  "n1000",
]);
const cbpRows: unknown[] = [];
const cbpCounties = new Set<string>();
const sizeColumns = [
  "n<5",
  "n5_9",
  "n10_19",
  "n20_49",
  "n50_99",
  "n100_249",
  "n250_499",
  "n500_999",
  "n1000",
];
for (const line of lines) {
  if (!line) continue;
  if (line.includes("\n") || (line.match(/"/g)?.length ?? 0) % 2 !== 0)
    throw new Error(`Unexpected CBP CSV syntax: ${line.slice(0, 80)}`);
  const row = line.replaceAll('"', "").split(",");
  if (row.length !== cbpHeader.length)
    throw new Error(`CBP column count ${row.length}`);
  const naics = cbpGet(row, "naics");
  if (naics !== "------" && !/^\d{2}----$/.test(naics)) continue;
  const countyFips = `${cbpGet(row, "fipstate")}${cbpGet(row, "fipscty")}`;
  if (!/^\d{5}$/.test(countyFips))
    throw new Error(`Invalid CBP county ${countyFips}`);
  // CBP's 999 rows are state residuals, not a county or county equivalent.
  if (countyFips.endsWith("999")) continue;
  cbpCounties.add(countyFips);
  const sizes = Object.fromEntries(
    sizeColumns.map((key) => [
      key,
      { value: numeric(cbpGet(row, key)), raw: cbpGet(row, key) },
    ]),
  );
  cbpRows.push({
    countyFips,
    naics,
    establishments: numeric(cbpGet(row, "est")),
    establishmentsRaw: cbpGet(row, "est"),
    employment: numeric(cbpGet(row, "emp")),
    employmentRaw: cbpGet(row, "emp"),
    employmentNoiseFlag: cbpGet(row, "emp_nf"),
    sizeEstablishments: sizes,
  });
}
const cbpMissingMappedCounties = countyRows
  .map((row) => (row as { countyFips: string }).countyFips)
  .filter((fips) => !cbpCounties.has(fips));
lockAndManifest(
  "data/source/county-business-patterns",
  {
    vintage: "2023",
    units: {
      establishments: "count",
      employment: "March 12 week persons",
      sizeEstablishments: "establishment counts by employment size",
    },
    rows: cbpRows,
  },
  cbpArtifacts,
  cbpRows.length,
  {
    countyCount: cbpCounties.size,
    sectorDefinition:
      "NAICS two-digit sector rows and all-industry total only; raw suppression and noise flags preserved; 999 state residuals excluded",
    countiesWithoutCbpRows: cbpMissingMappedCounties,
  },
);

const publicPath = "data/source/public-employment/raw/oews-industry-2025.zip";
const publicStatePath =
  "data/source/public-employment/raw/oews-state-ownership-research-2025.xlsx";
const publicArtifacts = [
  artifact(
    publicPath,
    "https://www.bls.gov/oes/special-requests/oesm25in4.zip",
    "May 2025",
    "application/zip",
  ),
  artifact(
    publicStatePath,
    "https://www.bls.gov/oes/special-requests/oes_research_2025_state_ownership.xlsx",
    "May 2025 research",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ),
];
const publicRows = zippedSheet(
  publicPath,
  "oesm25in4/national_owner_M2025_dl.xlsx",
  "National_owner_M2025_dl",
);
const publicGet = headerMap(publicRows[0]!, [
  "NAICS",
  "NAICS_TITLE",
  "OWN_CODE",
  "OCC_CODE",
  "OCC_TITLE",
  "O_GROUP",
  "TOT_EMP",
  "A_MEAN",
  "A_MEDIAN",
]);
const publicRoles: unknown[] = [];
const publicSectorCodes = new Set(["999101", "999201", "999301"]);
for (const row of publicRows.slice(1)) {
  const sectorCode = publicGet(row, "NAICS");
  if (!publicSectorCodes.has(sectorCode)) continue;
  publicRoles.push({
    scope: "national-standard",
    stateFips: null,
    sectorCode,
    sectorTitle: publicGet(row, "NAICS_TITLE"),
    ownershipCode: publicGet(row, "OWN_CODE"),
    occupationCode: publicGet(row, "OCC_CODE"),
    occupationTitle: publicGet(row, "OCC_TITLE"),
    occupationGroup: publicGet(row, "O_GROUP"),
    employment: numeric(publicGet(row, "TOT_EMP")),
    employmentRaw: publicGet(row, "TOT_EMP"),
    annualMeanUsd: numeric(publicGet(row, "A_MEAN")),
    annualMeanRaw: publicGet(row, "A_MEAN"),
    annualMedianUsd: numeric(publicGet(row, "A_MEDIAN")),
    annualMedianRaw: publicGet(row, "A_MEDIAN"),
  });
}
if (publicRoles.length < 1000)
  throw new Error(
    `Unexpectedly few public occupation rows: ${publicRoles.length}`,
  );
const statePublicRows = sheet(publicStatePath, "stateownership");
const statePublicGet = headerMap(statePublicRows[0]!, [
  "AREA",
  "AREA_TITLE",
  "NAICS",
  "NAICS_TITLE",
  "OWN_CODE",
  "OCC_CODE",
  "OCC_TITLE",
  "O_GROUP",
  "TOT_EMP",
  "A_MEAN",
  "A_MEDIAN",
]);
const publicStateCodes = new Set<string>();
for (const row of statePublicRows.slice(1)) {
  const sectorCode = statePublicGet(row, "NAICS");
  if (!publicSectorCodes.has(sectorCode)) continue;
  const stateFips = statePublicGet(row, "AREA");
  publicStateCodes.add(stateFips);
  publicRoles.push({
    scope: "state-research",
    stateFips,
    state: statePublicGet(row, "AREA_TITLE"),
    sectorCode,
    sectorTitle: statePublicGet(row, "NAICS_TITLE"),
    ownershipCode: statePublicGet(row, "OWN_CODE"),
    occupationCode: statePublicGet(row, "OCC_CODE"),
    occupationTitle: statePublicGet(row, "OCC_TITLE"),
    occupationGroup: statePublicGet(row, "O_GROUP"),
    employment: numeric(statePublicGet(row, "TOT_EMP")),
    employmentRaw: statePublicGet(row, "TOT_EMP"),
    annualMeanUsd: numeric(statePublicGet(row, "A_MEAN")),
    annualMeanRaw: statePublicGet(row, "A_MEAN"),
    annualMedianUsd: numeric(statePublicGet(row, "A_MEDIAN")),
    annualMedianRaw: statePublicGet(row, "A_MEDIAN"),
  });
}
for (const code of requiredStateFips)
  if (!publicStateCodes.has(code))
    throw new Error(`Missing public ownership research state ${code}`);
lockAndManifest(
  "data/source/public-employment",
  {
    vintage: "May 2025",
    unit: "annual USD; employment persons",
    scope:
      "Federal, state, and local government ownership, including schools and hospitals; occupations are not statutory offices",
    researchCaution:
      "State-ownership observations are research estimates; BLS notes higher possible model error, fewer occupations, and fewer quality checks than standard OEWS.",
    rows: publicRoles,
  },
  publicArtifacts,
  publicRoles.length,
  {
    sectorCodes: [...publicSectorCodes].sort(),
    publicResearchStateCount: publicStateCodes.size,
    requiredStateAndDcCount: requiredStateFips.length,
    officeSpecificSalaryCoverage: "not published in OEWS ownership table",
  },
);
console.log(
  JSON.stringify({
    wageRows: wageRows.length,
    areaCount: wageAreas.size,
    countyMappings: countyRows.length,
    cbpRows: cbpRows.length,
    cbpCounties: cbpCounties.size,
    publicRoleRows: publicRoles.length,
    missingWageTokens: Object.fromEntries(missingWages),
    unmatchedWageAreas: [...unmatchedWageAreas].sort(),
  }),
);
