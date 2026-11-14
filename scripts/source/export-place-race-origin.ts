/**
 * Export each place's residents by race and Hispanic origin from the locked
 * place-level files in `data/source/place-race-origin/raw/`.
 *
 * Every `*.csv` there has the columns `fips` (the 7-digit place GEOID),
 * `eth_hispanic`, `eth_white_nh`, `eth_black_nh`, `eth_asian_nh` and
 * `eth_non_hisp` (2020 Census redistricting data, table P2). The five groups
 * the game draws from land as: hispanic (any race), white (not Hispanic),
 * black (not Hispanic), asian (not Hispanic) and other (every other person
 * not Hispanic: Native American, Pacific Islander, some other race, two or
 * more races). Writes `src/core2/place-race-origin.generated.ts`. Run with
 * `npm run export:place-race-origin`; `-- --check` fails when the committed
 * output is stale. A place with no residents is left out, never zero.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";

export const PLACE_RACE_ORIGIN_OUTPUT_PATH =
  "src/core2/place-race-origin.generated.ts";

const RAW = "data/source/place-race-origin/raw";
const LOCK = "data/source/place-race-origin/regional-artifact-lock.json";

export function renderPlaceRaceOriginModule(): string {
  const lock = JSON.parse(readFileSync(LOCK, "utf8")) as {
    asOf: string;
    artifacts: { sha256: string; vintage: string }[];
  };
  const entries: string[] = [];
  for (const file of readdirSync(RAW)
    .filter((name) => name.endsWith(".csv"))
    .sort()) {
    const lines = readFileSync(`${RAW}/${file}`, "utf8")
      .split("\n")
      .filter((line) => line.length > 0);
    const header = lines[0]!.split(",");
    const at = (name: string) => {
      const index = header.indexOf(name);
      if (index < 0) throw new Error(`${file} has no ${name} column`);
      return index;
    };
    const [fips, hispanic, white, black, asian, nonHispanic] = [
      "fips",
      "eth_hispanic",
      "eth_white_nh",
      "eth_black_nh",
      "eth_asian_nh",
      "eth_non_hisp",
    ].map(at) as [number, number, number, number, number, number];
    for (const line of lines.slice(1)) {
      // Place names hold no commas in these files, so a plain split is exact.
      const cells = line.split(",");
      const geoid = cells[fips]!;
      if (!/^\d{7}$/.test(geoid))
        throw new Error(`${file}: bad GEOID ${geoid}`);
      const h = Number(cells[hispanic]);
      const w = Number(cells[white]);
      const b = Number(cells[black]);
      const a = Number(cells[asian]);
      const other = Number(cells[nonHispanic]) - w - b - a;
      if ([h, w, b, a, other].some((n) => !Number.isInteger(n) || n < 0))
        throw new Error(`${file}: bad counts for ${geoid}`);
      if (h + w + b + a + other === 0) continue;
      entries.push(`${geoid}:${[w, h, b, a, other].join(",")}`);
    }
  }
  entries.sort();
  const meta = {
    source:
      "U.S. Census Bureau 2020 Census redistricting data (P.L. 94-171) table P2, place level for the 50 states, DC and Puerto Rico, as republished by henrydavidge/redistricting-data-2020; residents of every age.",
    lockedSha256: lock.artifacts.map((artifact) => artifact.sha256),
    asOf: lock.asOf,
    places: entries.length,
  };
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Written by scripts/source/export-place-race-origin.ts from the locked
 * place files in data/source/place-race-origin. A place not listed has no
 * row; readers fall back to its state's shares, never to zero.
 */

export const PLACE_RACE_ORIGIN_META = ${JSON.stringify(meta, null, 2)} as const;

/**
 * \`geoid:white,hispanic,black,asian,other\` (residents), separated by \`;\`.
 * The geoid is the 7-digit place GEOID.
 */
export const PLACE_RACE_ORIGIN_ROWS =
  ${JSON.stringify(entries.join(";"))};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = renderPlaceRaceOriginModule();
  if (process.argv.includes("--check")) {
    if (readFileSync(PLACE_RACE_ORIGIN_OUTPUT_PATH, "utf8") !== output)
      throw new Error(`Stale ${PLACE_RACE_ORIGIN_OUTPUT_PATH}`);
    console.log(`${PLACE_RACE_ORIGIN_OUTPUT_PATH} is current.`);
  } else {
    writeFileSync(PLACE_RACE_ORIGIN_OUTPUT_PATH, output);
    console.log(`wrote ${PLACE_RACE_ORIGIN_OUTPUT_PATH}`);
  }
}
