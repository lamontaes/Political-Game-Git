/**
 * `npm run compile:area-residents` — residents of every state, D.C. and
 * county, from BEA Regional CAINC1 line 2 (population, persons) for 2024.
 *
 * The place outcomes use it to weigh a city's or county's own outcome inside
 * its state's (`src/simulation/outcome-web/place-outcome-store.ts`). It reads
 * the locked corpus under `data/source/bea-regional/`, keeps only KNOWN
 * values, and writes one compact row per state (keyed `US-XX`) and county
 * (keyed by 5-digit county GEOID). A row the Bureau reports as unknown (the
 * eight retired Connecticut counties, a few Alaska census areas) is left out,
 * so it reads unknown, never 0. The territories are not in the table.
 *
 * The output is committed so the browser build never runs Node source code.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STATES } from "../../src/simulation/state-reference";

const ROOT = resolve(import.meta.dirname, "../..");
const CORPUS = "data/source/bea-regional/corpus.json";
const OUTPUT = "src/simulation/outcome-web/area-residents.generated.ts";
const YEAR = "2024";

interface CorpusRow {
  readonly tableName: string;
  readonly lineCode: string;
  readonly geoFips: string;
  readonly geoName: string;
  readonly geographyLevel: string;
  readonly recordId: string;
  readonly value: { readonly state: string; readonly value?: number | null };
}

export function renderAreaResidentsModule(bytes: Buffer): string {
  const digest = createHash("sha256").update(bytes).digest("hex");
  const rows = (JSON.parse(bytes.toString("utf-8")) as CorpusRow[]).filter(
    (row) =>
      row.tableName === "CAINC1" &&
      row.lineCode === "2" &&
      row.recordId.endsWith(`:${YEAR}`),
  );
  const stateByName = new Map(
    Object.entries(STATES).map(([usps, state]) => [state.name, usps]),
  );
  const out: string[] = [];
  let states = 0;
  let counties = 0;
  let unknown = 0;
  for (const row of rows) {
    if (row.geographyLevel !== "state" && row.geographyLevel !== "county")
      continue;
    const people =
      row.value.state === "KNOWN" && typeof row.value.value === "number"
        ? row.value.value
        : null;
    if (people === null || !Number.isFinite(people)) {
      unknown += 1;
      continue;
    }
    if (row.geographyLevel === "state") {
      const usps = stateByName.get(row.geoName.replace(/\s*\*$/, ""));
      if (!usps) continue; // BEA regions share the state level.
      out.push(`US-${usps}:${people}`);
      states += 1;
    } else {
      if (!/^\d{5}$/.test(row.geoFips))
        throw new Error(`Bad county GEOID "${row.geoFips}".`);
      out.push(`${row.geoFips}:${people}`);
      counties += 1;
    }
  }
  if (states !== 51) throw new Error(`Expected 51 states, found ${states}.`);
  out.sort();
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/world/compile-area-residents.ts\` from
 * \`${CORPUS}\` (BEA Regional CAINC1 line 2, ${YEAR}).
 * Regenerate with \`npm run compile:area-residents\`.
 */

export const AREA_RESIDENTS_META = {
  source: "BEA Regional CAINC1 line 2, population (persons), ${YEAR}",
  corpus: "${CORPUS}",
  corpusSha256:
    "${digest}",
  year: ${YEAR},
  states: ${states},
  counties: ${counties},
  unknownLeftOut: ${unknown},
} as const;

/** "KEY:residents" pairs joined by ";": \`US-XX\` or a county GEOID. */
export const AREA_RESIDENTS_ROWS: string =
  "${out.join(";")}";
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const module = renderAreaResidentsModule(readFileSync(resolve(ROOT, CORPUS)));
  writeFileSync(resolve(ROOT, OUTPUT), module);
  console.log(`Wrote ${OUTPUT}.`);
}
