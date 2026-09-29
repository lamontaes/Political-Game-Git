/**
 * Export what kinds of households a town has, from the locked ACS tables.
 *
 * Reads the two extracts in `data/source/acs-household-mix/raw/` (U.S. Census
 * Bureau, 2020-2024 American Community Survey 5-year, tables B11001 and
 * B11003; the lock beside them names the full files they were cut from) and
 * writes `src/simulation/household-mix.generated.ts`: for the nation, each
 * state and each place, the number of households of the five shapes the town
 * generator draws. Run with `npm run export:household-mix`; `-- --check` fails
 * when the committed output is stale.
 *
 * How the tables map to the five shapes (every household lands in exactly one):
 *   alone                 B11001 living alone
 *   couple                B11003 married-couple family, no own children under 18
 *   couple-with-children  B11003 married-couple family, own children under 18
 *   parent-with-children  B11003 one householder, no spouse, own children under 18
 *   housemates            B11001 nonfamily, not living alone, plus B11003 other
 *                         family with no own children under 18 (siblings,
 *                         a grown child with a parent)
 * A geography with no households, or whose cells were withheld, is left out.
 */

import { readFileSync, writeFileSync } from "node:fs";

export const HOUSEHOLD_MIX_OUTPUT_PATH =
  "src/simulation/household-mix.generated.ts";

const RAW = "data/source/acs-household-mix/raw";
const LOCK = "data/source/acs-household-mix/regional-artifact-lock.json";

function table(name: string): Map<string, Map<string, number | null>> {
  const lines = readFileSync(`${RAW}/acsdt5y2024-${name}.dat`, "utf8")
    .split("\n")
    .filter((line) => line.length > 0);
  const header = lines[0]!.split("|");
  const rows = new Map<string, Map<string, number | null>>();
  for (const line of lines.slice(1)) {
    const cells = line.split("|");
    const cell = new Map<string, number | null>();
    header.forEach((column, index) => {
      if (!column.includes("_E")) return;
      const raw = cells[index] ?? "";
      cell.set(column, /^\d+$/.test(raw) ? Number(raw) : null);
    });
    rows.set(cells[0]!, cell);
  }
  return rows;
}

const key = (geoId: string): string | null => {
  if (geoId === "0100000US") return "US";
  const state = /^0400000US(\d{2})$/.exec(geoId);
  if (state) return state[1]!;
  const place = /^1600000US(\d{7})$/.exec(geoId);
  return place ? place[1]! : null;
};

export function renderHouseholdMixModule(): string {
  const b11001 = table("b11001");
  const b11003 = table("b11003");
  const lock = JSON.parse(readFileSync(LOCK, "utf8")) as {
    asOf: string;
    artifacts: { sha256: string }[];
  };
  const entries: string[] = [];
  let withheld = 0;
  for (const geoId of [...b11001.keys()].sort()) {
    const name = key(geoId);
    if (!name) continue;
    const a = b11001.get(geoId)!;
    const f = b11003.get(geoId);
    const cells = f
      ? [
          a.get("B11001_E008"),
          a.get("B11001_E009"),
          f.get("B11003_E003"),
          f.get("B11003_E007"),
          f.get("B11003_E010"),
          f.get("B11003_E016"),
          f.get("B11003_E014"),
          f.get("B11003_E020"),
        ]
      : [];
    if (cells.length === 0 || cells.some((cell) => cell == null)) {
      withheld += 1;
      continue;
    }
    const [
      alone,
      notAlone,
      coupleKids,
      couple,
      maleKids,
      femaleKids,
      ...other
    ] = cells as number[];
    const shapes = [
      alone!,
      couple!,
      coupleKids!,
      maleKids! + femaleKids!,
      notAlone! + other.reduce((sum, n) => sum + n, 0),
    ];
    if (shapes.reduce((sum, n) => sum + n, 0) <= 0) {
      withheld += 1;
      continue;
    }
    entries.push(`${name}:${shapes.join(",")}`);
  }
  const meta = {
    source:
      "U.S. Census Bureau, 2020-2024 American Community Survey 5-year, tables B11001 and B11003, nation, states and places.",
    lockedSha256: lock.artifacts.map((artifact) => artifact.sha256),
    asOf: lock.asOf,
    geographies: entries.length,
    withheld,
  };
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-household-mix.ts\` from the
 * locked ACS household tables. A geography the survey withheld is absent,
 * never zero.
 */

export const HOUSEHOLD_MIX_META = ${JSON.stringify(meta, null, 2)} as const;

/**
 * \`geography:alone,couple,couple-with-children,parent-with-children,housemates\`
 * (households of each shape), separated by \`;\`. The geography is \`US\`, a
 * 2-digit state FIPS or a 7-digit place GEOID.
 */
export const HOUSEHOLD_MIX_ROWS =
  ${JSON.stringify(entries.join(";"))};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = renderHouseholdMixModule();
  if (process.argv.includes("--check")) {
    if (readFileSync(HOUSEHOLD_MIX_OUTPUT_PATH, "utf8") !== output)
      throw new Error(`Stale ${HOUSEHOLD_MIX_OUTPUT_PATH}`);
    console.log(`${HOUSEHOLD_MIX_OUTPUT_PATH} is current.`);
  } else {
    writeFileSync(HOUSEHOLD_MIX_OUTPUT_PATH, output);
    console.log(`wrote ${HOUSEHOLD_MIX_OUTPUT_PATH}`);
  }
}
