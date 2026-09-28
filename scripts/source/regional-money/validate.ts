/** Fast cross-corpus validation of the locked regional source artifacts. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { readZipMember } from "../../../src/source/core/archive/zip";

const bases = [
  "career-occupations",
  "cbsa-delineations",
  "county-business-patterns",
  "public-employment",
] as const;
function load(base: (typeof bases)[number]) {
  const dir = `data/source/${base}`;
  const manifest = JSON.parse(
    readFileSync(`${dir}/regional-corpus-manifest.json`, "utf8"),
  );
  const lock = JSON.parse(
    readFileSync(`${dir}/regional-artifact-lock.json`, "utf8"),
  );
  const canonical = gunzipSync(readFileSync(manifest.corpusPath));
  const digest = createHash("sha256").update(canonical).digest("hex");
  if (digest !== manifest.canonicalSha256)
    throw new Error(`${base}: corpus digest mismatch`);
  for (const input of manifest.inputs) {
    const artifact = lock.artifacts.find(
      (entry: { localPath: string }) => entry.localPath === input.localPath,
    );
    if (!artifact || artifact.sha256 !== input.sha256)
      throw new Error(`${base}: manifest/lock mismatch`);
    const bytes = readFileSync(input.localPath);
    if (
      bytes.length !== artifact.length ||
      createHash("sha256").update(bytes).digest("hex") !== artifact.sha256
    )
      throw new Error(`${base}: raw artifact mismatch ${input.localPath}`);
    for (const member of artifact.members ?? []) {
      const memberBytes = readZipMember(bytes, member.path);
      if (
        memberBytes.length !== member.length ||
        createHash("sha256").update(memberBytes).digest("hex") !== member.sha256
      )
        throw new Error(`${base}: raw member mismatch ${member.path}`);
    }
  }
  const corpus = JSON.parse(canonical.toString("utf8"));
  if (corpus.rows.length !== manifest.recordCount)
    throw new Error(`${base}: row count mismatch`);
  return { corpus, manifest };
}
const wages = load("career-occupations");
const geography = load("cbsa-delineations");
const business = load("county-business-patterns");
const publicPay = load("public-employment");
// This pre-existing 2020 relation corpus is read-only: it is a place-to-county
// join audit, not a new or rewritten source artifact.
const placeParts = JSON.parse(
  readFileSync("data/source/place-county-relations/corpus.json", "utf8"),
);
const ctPrefix = "data/source/cbsa-delineations/ct-place-county-2023";
const ctManifest = JSON.parse(
  readFileSync(`${ctPrefix}-manifest.json`, "utf8"),
);
const ctLock = JSON.parse(
  readFileSync(`${ctPrefix}-artifact-lock.json`, "utf8"),
);
const ctCanonical = gunzipSync(readFileSync(ctManifest.corpusPath));
if (
  createHash("sha256").update(ctCanonical).digest("hex") !==
  ctManifest.canonicalSha256
)
  throw new Error("Connecticut corpus digest mismatch");
const ctArtifact = ctLock.artifacts[0];
const ctRaw = readFileSync(ctArtifact.localPath);
if (
  ctRaw.length !== ctArtifact.length ||
  createHash("sha256").update(ctRaw).digest("hex") !== ctArtifact.sha256 ||
  ctManifest.inputs[0].sha256 !== ctArtifact.sha256
)
  throw new Error("Connecticut raw artifact mismatch");
const ctParts = JSON.parse(ctCanonical.toString("utf8")).rows as Array<{
  placeGeoid: string;
  countyGeoid: string;
  sourceGeoId: string;
}>;
if (ctParts.length !== ctManifest.recordCount)
  throw new Error("Connecticut row count mismatch");
const oldCtPlaces = new Set<string>(
  placeParts
    .filter((part: { stateFips: string }) => part.stateFips === "09")
    .map((part: { placeGeoid: string }) => part.placeGeoid),
);
const newCtPlaces = new Set(ctParts.map((part) => part.placeGeoid));
const retiredCtPlaceIds = [...oldCtPlaces]
  .filter((place) => !newCtPlaces.has(place))
  .sort();
const addedCtPlaceIds = [...newCtPlaces]
  .filter((place) => !oldCtPlaces.has(place))
  .sort();
if (
  oldCtPlaces.size !== 215 ||
  newCtPlaces.size !== 215 ||
  retiredCtPlaceIds.join(",") !== "0908910" ||
  addedCtPlaceIds.join(",") !== "0909050"
)
  throw new Error("Unexpected Connecticut place-vintage difference");
const places = new Map<string, Set<string>>();
for (const part of placeParts) {
  if (part.stateFips === "09") continue;
  const counties = places.get(part.placeGeoid) ?? new Set<string>();
  counties.add(part.countyGeoid);
  places.set(part.placeGeoid, counties);
}
for (const part of ctParts) {
  const counties = places.get(part.placeGeoid) ?? new Set<string>();
  counties.add(part.countyGeoid);
  places.set(part.placeGeoid, counties);
}
const countyAreas = new Map<string, string>(
  geography.corpus.rows.map(
    (row: { countyFips: string; oewsAreaCode: string }) => [
      row.countyFips,
      row.oewsAreaCode,
    ],
  ),
);
const placeCoverage = {
  totalPlaces: places.size,
  fullyMappedPlaces: 0,
  unsupportedPlaces: 0,
  multiCountyPlaces: 0,
  multiAreaPlaces: 0,
  unmatchedCountyCodes: new Set<string>(),
  supportedStateFips: new Set<string>(),
  unsupportedStateFips: new Set<string>(),
};
for (const [placeGeoid, counties] of places) {
  if (counties.size > 1) placeCoverage.multiCountyPlaces++;
  const missing = [...counties].filter((county) => !countyAreas.has(county));
  if (missing.length) {
    placeCoverage.unsupportedPlaces++;
    placeCoverage.unsupportedStateFips.add(placeGeoid.slice(0, 2));
    for (const county of missing)
      placeCoverage.unmatchedCountyCodes.add(county);
    continue;
  }
  placeCoverage.fullyMappedPlaces++;
  placeCoverage.supportedStateFips.add(placeGeoid.slice(0, 2));
  if (new Set([...counties].map((county) => countyAreas.get(county))).size > 1)
    placeCoverage.multiAreaPlaces++;
}
if (placeCoverage.unmatchedCountyCodes.size || placeCoverage.unsupportedPlaces)
  throw new Error(
    `Unexpected place-to-area gap: ${[...placeCoverage.unmatchedCountyCodes].sort()}`,
  );
if (
  placeCoverage.supportedStateFips.size !== 51 ||
  placeCoverage.unsupportedStateFips.size
)
  throw new Error("Unexpected state-level place wage area coverage");
const areaCodes = new Set(
  wages.corpus.rows
    .filter((row: { scope: string }) => row.scope === "area")
    .map((row: { areaCode: string }) => row.areaCode),
);
for (const county of geography.corpus.rows)
  if (!areaCodes.has(county.oewsAreaCode))
    throw new Error(`No wage area for ${county.countyFips}`);
const businessCounties = new Set(
  business.corpus.rows.map((row: { countyFips: string }) => row.countyFips),
);
const missingUsBusiness = geography.corpus.rows
  .filter(
    (row: { countyFips: string; stateFips: string }) =>
      row.stateFips !== "72" && !businessCounties.has(row.countyFips),
  )
  .map((row: { countyFips: string }) => row.countyFips)
  .sort();
if (missingUsBusiness.join(",") !== "15005,48269")
  throw new Error(`Unexpected CBP county gap: ${missingUsBusiness}`);
const cases = [
  ["28011", "West Delta Mississippi nonmetropolitan area"],
  ["39049", "Columbus, OH"],
  ["06075", "San Francisco-Oakland-Fremont, CA"],
] as const;
const results = cases.map(([countyFips, areaTitle]) => {
  const county = geography.corpus.rows.find(
    (row: { countyFips: string }) => row.countyFips === countyFips,
  );
  if (
    !county ||
    county.oewsAreaTitle !== areaTitle ||
    !businessCounties.has(countyFips)
  )
    throw new Error(`Comparison case unavailable: ${countyFips}`);
  const retail = wages.corpus.rows.find(
    (row: { scope: string; areaCode: string; occupationCode: string }) =>
      row.scope === "area" &&
      row.areaCode === county.oewsAreaCode &&
      row.occupationCode === "41-2031",
  );
  if (!retail || retail.annualMedianUsd === null)
    throw new Error(`Retail pay unavailable: ${countyFips}`);
  const establishments = business.corpus.rows.find(
    (row: { countyFips: string; naics: string }) =>
      row.countyFips === countyFips && row.naics === "------",
  )?.establishments;
  if (establishments === null || establishments === undefined)
    throw new Error(`CBP total unavailable: ${countyFips}`);
  return {
    countyFips,
    areaCode: county.oewsAreaCode,
    areaTitle,
    retailAnnualMedianUsd: retail.annualMedianUsd,
    countyEstablishments: establishments,
  };
});
const publicStates = new Set(
  publicPay.corpus.rows
    .filter((row: { scope: string }) => row.scope === "state-research")
    .map((row: { stateFips: string }) => row.stateFips),
);
const requiredStateFips =
  "01 02 04 05 06 08 09 10 11 12 13 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 44 45 46 47 48 49 50 51 53 54 55 56".split(
    " ",
  );
for (const code of requiredStateFips)
  if (!publicStates.has(code))
    throw new Error(`Missing public ownership state ${code}`);
console.log(
  JSON.stringify(
    {
      result: "PASS",
      records: Object.fromEntries(
        bases.map((base, i) => [
          base,
          [wages, geography, business, publicPay][i]!.manifest.recordCount,
        ]),
      ),
      allMappedAreasHaveWages: true,
      publicResearchStates: publicStates.size,
      requiredStatesAndDc: requiredStateFips.length,
      missingUsBusinessCounties: missingUsBusiness,
      placeToAreaCoverage: {
        ...placeCoverage,
        unmatchedCountyCodes: [...placeCoverage.unmatchedCountyCodes].sort(),
        supportedStatesAndDc: placeCoverage.supportedStateFips.size,
        supportedStateFips: [...placeCoverage.supportedStateFips].sort(),
        unsupportedStateFips: [...placeCoverage.unsupportedStateFips].sort(),
        geographyVintage:
          "2020 place/county parts outside Connecticut; 2023 ACS 5-year geography for Connecticut",
        connecticut: {
          parts: ctParts.length,
          retired2020PlaceIds: retiredCtPlaceIds,
          added2023PlaceIds: addedCtPlaceIds,
        },
        territoryPlaceCoverage:
          "not in 2020 place-county relation corpus or this Connecticut 2023 supplement",
      },
      comparisons: results,
    },
    null,
    2,
  ),
);
