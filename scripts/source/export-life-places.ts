/**
 * The one-way, reviewed export from the source substrate to the game.
 *
 * `src/source` is Node-only and the browser must never import it (the app
 * tsconfig excludes it). This script is the single seam that carries the
 * accepted national place identity across that line: it reads the COMPILED,
 * reviewed places corpus that PR #77 landed under `data/source/places/`, keeps
 * only the identity fields a life needs (the place's own code, the name a
 * resident reads, and the state), and writes them into one generated module the
 * simulation can import.
 *
 * What it deliberately does not do:
 *   - It invents no place facts. Every row is the Census Gazetteer's own
 *     GEOID, display name and state; nothing about a place's government, its
 *     powers or its office-holders is asserted here.
 *   - It builds no second geography. The corpus it reads is the accepted #77
 *     one, and this only projects a subset of it forward.
 *   - It leaves no browser import of `src/source` behind. The output is data.
 *
 * Regenerate with `npm run export:life-places`. The output is committed so the
 * browser build never runs Node source code.
 */

import { readFileSync, writeFileSync } from "fs";
import path from "path";

import type { PlaceRecord } from "../../src/source/domains/places/index";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/places/corpus.json",
);
const MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/places/corpus-manifest.json",
);
const OUTPUT_PATH = path.join(
  REPOSITORY_ROOT,
  "src/simulation/national-places.generated.ts",
);

interface CorpusManifest {
  readonly asOf: string;
  readonly canonicalSha256: string;
  readonly recordCount: number;
  readonly coverage: { readonly universeDescription: string };
  readonly compiler: { readonly name: string; readonly version: string };
  readonly inputs: readonly {
    readonly artifactId: string;
    readonly sha256: string;
  }[];
}

function main(): void {
  const records = JSON.parse(
    readFileSync(CORPUS_PATH, "utf8"),
  ) as readonly PlaceRecord[];
  const manifest = JSON.parse(
    readFileSync(MANIFEST_PATH, "utf8"),
  ) as CorpusManifest;

  // Deterministic order, so a re-export of the same corpus is byte-identical
  // and a diff of this file means the corpus changed, not the machine.
  const rows = [...records]
    .map((record) => [record.geoid, record.displayName, record.stateUsps])
    .sort((left, right) => left[0]!.localeCompare(right[0]!));

  const meta = {
    asOf: manifest.asOf,
    source: manifest.inputs[0]?.artifactId ?? "unknown",
    sourceSha256: manifest.inputs[0]?.sha256 ?? "unknown",
    corpusSha256: manifest.canonicalSha256,
    compiler: `${manifest.compiler.name}@${manifest.compiler.version}`,
    recordCount: rows.length,
    coverage: manifest.coverage.universeDescription,
  };

  // The rows travel as a single JSON string rather than a typed array literal:
  // a 32,000-element literal makes the type checker infer an enormous tuple and
  // slows every build that touches this module, where a string is free. The
  // simulation parses it once.
  const rowsJson = JSON.stringify(rows);

  const output = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/export-life-places.ts\` from the accepted places
 * corpus PR #77 landed under \`data/source/places/\`. It carries only place
 * identity (GEOID, resident-facing name, state) — no claim about any place's
 * government or powers. Regenerate with \`npm run export:life-places\`.
 *
 * This file imports nothing from \`src/source\`; it is the browser-safe side of
 * the one-way source-to-game seam.
 */

/** Provenance for the national place identities below. Surfaced honestly. */
export const NATIONAL_PLACES_META = ${JSON.stringify(meta, null, 2)} as const;

/**
 * \`[geoid, displayName, stateUsps]\` for every place in the corpus, as one JSON
 * string. Parsed once by \`life-places.ts\`; kept as a string so the type
 * checker never has to describe a 32,000-element literal.
 */
export const NATIONAL_PLACES_ROWS: string =
  ${JSON.stringify(rowsJson)};
`;

  writeFileSync(OUTPUT_PATH, output);
  process.stdout.write(
    `Wrote ${rows.length} places to ${path.relative(REPOSITORY_ROOT, OUTPUT_PATH)} (as-of ${meta.asOf}).\n`,
  );
}

main();
