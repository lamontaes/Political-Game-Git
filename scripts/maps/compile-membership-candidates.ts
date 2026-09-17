/**
 * compile:map-membership — candidate-district tables for the map inspector.
 *
 * - county → 119th congressional districts, from the Census county-within-CD
 *   cartographic file (attribute table only). A county is "whole" only when
 *   Census publishes a single, unsplit part.
 * - split place → every intersecting state legislative district, from the
 *   accepted 2024 SLD–2020 place relationship corpus.
 *
 * These are candidate sets. Nothing here picks one district for a person.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import type { PlaceDistrictRelationRecord } from "../../src/source/domains/sld-place-relations/index";
import { readShapefileArchive } from "./shapefile";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const lock = JSON.parse(
  readFileSync(
    join(ROOT, "data/source/map-geometry/artifact-lock.json"),
    "utf8",
  ),
) as {
  cacheDirectory: string;
  artifacts: {
    artifactId: string;
    file: string;
    bytes: number;
    sha256: string;
  }[];
  relationshipArtifacts: {
    artifactId: string;
    file: string;
    cacheDirectory: string;
    url: string;
    bytes: number;
    sha256: string;
  }[];
};
const OUT = join(ROOT, "src/maps/data/membership-candidates.generated.json");

const artifact = lock.artifacts.find(
  (entry) => entry.artifactId === "cb-2025-county-within-cd119-500k",
);
if (!artifact)
  throw new Error("county-within-cd119 artifact missing from lock");
const bytes = readFileSync(join(ROOT, lock.cacheDirectory, artifact.file));
const sha = createHash("sha256").update(bytes).digest("hex");
if (sha !== artifact.sha256)
  throw new Error(`${artifact.file} does not match the lock.`);

const countyCongressional: Record<
  string,
  { districts: string[]; whole: boolean }
> = {};
for (const { attributes } of readShapefileArchive(bytes).records) {
  const county = `${attributes.STATEFP}${attributes.COUNTYFP}`;
  const district = `${attributes.STATEFP}${attributes.CD119FP}`;
  const entry = countyCongressional[county] ?? { districts: [], whole: true };
  if (!entry.districts.includes(district)) entry.districts.push(district);
  if (attributes.PARTFLG === "Y") entry.whole = false;
  countyCongressional[county] = entry;
}
for (const entry of Object.values(countyCongressional)) {
  entry.districts.sort();
  if (entry.districts.length !== 1) entry.whole = false;
}

// place → 119th congressional districts, from the Census relationship file.
// A district counts only where the place has land inside it; a water-only
// sliver is not somewhere a home can be.
const relation = lock.relationshipArtifacts.find(
  (entry) => entry.artifactId === "census-rel-2020-cd119-place20-national",
);
if (!relation)
  throw new Error("CD119–place relationship artifact missing from lock");
const relationPath = join(ROOT, relation.cacheDirectory, relation.file);
if (!existsSync(relationPath)) {
  if (!process.argv.includes("--acquire")) {
    throw new Error(`${relationPath} is missing. Re-run with --acquire.`);
  }
  mkdirSync(dirname(relationPath), { recursive: true });
  const response = await fetch(relation.url);
  if (!response.ok)
    throw new Error(
      `Download of ${relation.file} failed: HTTP ${response.status}`,
    );
  writeFileSync(relationPath, Buffer.from(await response.arrayBuffer()));
}
const relationBytes = readFileSync(relationPath);
if (
  createHash("sha256").update(relationBytes).digest("hex") !== relation.sha256
) {
  throw new Error(`${relation.file} does not match the lock.`);
}
const [header, ...rows] = relationBytes
  .toString("utf8")
  .replace(/^\uFEFF/, "")
  .trim()
  .split(/\r?\n/);
const column = Object.fromEntries(
  (header ?? "").split("|").map((name, index) => [name, index]),
);
const placeLand = new Map<string, Map<string, number>>();
for (const row of rows) {
  const cells = row.split("|");
  const place = cells[column.GEOID_PLACE_20 as number] ?? "";
  const district = cells[column.GEOID_CD119_20 as number] ?? "";
  if (!place || !district) continue;
  const land = Number(cells[column.AREALAND_PART as number] ?? 0);
  const entry = placeLand.get(place) ?? new Map<string, number>();
  entry.set(district, (entry.get(district) ?? 0) + land);
  placeLand.set(place, entry);
}
const wholePlaceCongressional: Record<string, string> = {};
const splitPlaceCongressional: Record<string, string[]> = {};
for (const [place, districts] of placeLand) {
  const withLand = [...districts]
    .filter(([, land]) => land > 0)
    .map(([district]) => district);
  const candidates = (
    withLand.length ? withLand : [...districts.keys()]
  ).sort();
  if (candidates.length === 1)
    wholePlaceCongressional[place] = candidates[0] as string;
  else splitPlaceCongressional[place] = candidates;
}

const relations = JSON.parse(
  readFileSync(
    join(ROOT, "data/source/sld-place-relations/corpus.json"),
    "utf8",
  ),
) as PlaceDistrictRelationRecord[];
const splitPlaceDistricts: Record<string, Record<string, string[]>> = {};
for (const record of relations) {
  if (record.membership === "whole-place") continue;
  const entry = splitPlaceDistricts[record.placeGeoid] ?? {};
  entry[record.chamber] = [...record.intersectingDistrictGeoids].sort();
  splitPlaceDistricts[record.placeGeoid] = entry;
}

const sortObject = <T>(value: Record<string, T>) =>
  Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );

/**
 * Packed by state FIPS with short codes: a string is the single district a
 * whole area lies in; an array lists candidate districts.
 */
type Packed = Record<string, Record<string, string | string[]>>;
const pack = (
  entries: Iterable<[string, string | string[]]>,
  codeLength: number,
): Packed => {
  const out: Packed = {};
  for (const [geoid, value] of entries) {
    const state = geoid.slice(0, 2);
    const code = geoid.slice(2);
    const short = (district: string) => district.slice(2);
    (out[state] ??= {})[code] =
      typeof value === "string" ? short(value) : value.map(short);
  }
  void codeLength;
  return Object.fromEntries(
    Object.entries(out)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, table]) => [state, sortObject(table)]),
  );
};

const payload = {
  format: "ocd-map-membership-candidates/v2",
  countyCongressional: {
    source: { artifactId: artifact.artifactId, sha256: artifact.sha256 },
    vintage: "census-cb-2025-county-within-cd119",
    byState: pack(
      Object.entries(countyCongressional).map(([county, entry]) => [
        county,
        entry.whole ? (entry.districts[0] as string) : entry.districts,
      ]),
      3,
    ),
  },
  placeCongressional: {
    source: { artifactId: relation.artifactId, sha256: relation.sha256 },
    vintage: "census-rel-2020-cd119-place20",
    byState: pack(
      [
        ...Object.entries(wholePlaceCongressional),
        ...Object.entries(splitPlaceCongressional),
      ],
      5,
    ),
  },
  splitPlaceStateLegislative: {
    source: "data/source/sld-place-relations/corpus.json",
    vintage: "census-rel-2024-sld-place20",
    /** state → place code → { u: upper codes, l: lower codes }. */
    byState: Object.fromEntries(
      Object.entries(
        Object.entries(splitPlaceDistricts).reduce<
          Record<string, Record<string, Record<string, string[]>>>
        >((out, [place, chambers]) => {
          const table = (out[place.slice(0, 2)] ??= {});
          table[place.slice(2)] = Object.fromEntries(
            Object.entries(chambers).map(([chamber, districts]) => [
              chamber === "state-upper" ? "u" : "l",
              districts.map((district) => district.slice(2)),
            ]),
          );
          return out;
        }, {}),
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([state, table]) => [state, sortObject(table)]),
    ),
  },
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
console.log(
  `counties ${Object.keys(countyCongressional).length}, places→CD whole ${Object.keys(wholePlaceCongressional).length} split ${Object.keys(splitPlaceCongressional).length}, SLD split places ${Object.keys(splitPlaceDistricts).length}, ${Math.round(readFileSync(OUT).length / 1024)} KB`,
);
