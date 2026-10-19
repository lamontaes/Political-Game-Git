/**
 * Builds src/core2/data/places/localities.json and county-names.json, the
 * core's place listing (src/core2/places.ts), from the Census Gazetteer 2025
 * corpora in data/source. Tooling only; reruns reproduce the files exactly.
 *
 *   npx tsx src/core2/tooling/build-places.ts
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

interface Row {
  geoid: string;
  displayName: string;
  sourceName: string;
  stateUsps: string;
}

function corpus(path: string): { rows: Row[]; sha: string } {
  const text = readFileSync(path);
  return {
    rows: JSON.parse(text.toString("utf8")) as Row[],
    sha: createHash("sha256").update(text).digest("hex"),
  };
}

const places = corpus("data/source/places/corpus.json");
writeFileSync(
  "src/core2/data/places/localities.json",
  JSON.stringify({
    source: "census-gazetteer-2025-places-zip",
    asOf: "2025-01-01",
    corpusSha256: places.sha,
    columns: ["geoid", "displayName", "stateUsps"],
    rows: places.rows.map((row) => [row.geoid, row.displayName, row.stateUsps]),
  }) + "\n",
);
const counties = corpus("data/source/counties/corpus.json");
const namesByUsps: Record<string, string[]> = {};
for (const row of counties.rows)
  (namesByUsps[row.stateUsps] ??= []).push(row.sourceName);
for (const names of Object.values(namesByUsps)) names.sort();
writeFileSync(
  "src/core2/data/places/county-names.json",
  JSON.stringify({
    source: "census-gazetteer-2025-counties-zip",
    asOf: "2025-01-01",
    corpusSha256: counties.sha,
    namesByUsps,
  }) + "\n",
);
console.log(
  `${places.rows.length} places, ${counties.rows.length} counties written`,
);
