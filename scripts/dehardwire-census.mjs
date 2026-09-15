#!/usr/bin/env node
/* global console, process */
/**
 * DIRECTOR42 ROLE B — the dehardwire census.
 *
 * Answers one question with evidence rather than opinion: which world-instance
 * gameplay literals can an ordinary player actually reach?
 *
 * "Reach" is the whole point. A literal in a module the production spine only
 * imports for its types is erased before the game runs, and a literal behind a
 * developer route is not in a player's way either. So the census walks the
 * RUNTIME import graph — value imports only — from the ordinary-play entry and
 * reports what it finds there, next to the declared classification for each
 * case. An undeclared world-instance literal on that graph fails the run.
 *
 * Usage:
 *   node scripts/dehardwire-census.mjs            # write + check
 *   node scripts/dehardwire-census.mjs --check    # check only, no write
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs/dehardwire/census.json");
const REGISTRY = resolve(ROOT, "docs/dehardwire/classification.json");

/** Ordinary play. Not App.tsx: every developer route hangs off that. */
const PLAY_ENTRY = "src/player/PlayerGame.tsx";

/* -------------------------------------------------------------------------- */
/* The runtime import graph                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Value imports only.
 *
 * `import type {...} from "./x"` and `import { type A } from "./x"` contribute
 * nothing to the bundle, so a literal in `x` cannot reach a player through
 * them. Counting them would report fixtures as production reachable and send
 * the next owner chasing a dependency that does not exist at runtime.
 */
function runtimeImports(file) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const specifiers = [];
  const pattern =
    /(?:^|[\s;}])(?:import|export)(\s+type\s+|\s+)([^'";]*?)from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/gm;
  for (const match of source.matchAll(pattern)) {
    const dynamic = match[4];
    if (dynamic) {
      specifiers.push(dynamic);
      continue;
    }
    const typeKeyword = match[1];
    const clause = match[2] ?? "";
    const specifier = match[3];
    if (!specifier) continue;
    if (typeKeyword && typeKeyword.includes("type")) continue;
    // `import { type A, type B } from "x"` erases too; `{ type A, b }` does not.
    const braced = clause.match(/\{([^}]*)\}/);
    if (braced) {
      const named = braced[1]
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const outsideBraces = clause.replace(/\{[^}]*\}/, "").trim();
      const bareDefaultOrNamespace = outsideBraces.replace(/,/g, "").trim();
      if (
        named.length > 0 &&
        named.every((part) => part.startsWith("type ")) &&
        bareDefaultOrNamespace.length === 0
      ) {
        continue;
      }
    }
    specifiers.push(specifier);
  }
  return specifiers;
}

function resolveRelative(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ]) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

export function runtimeReachable(entry) {
  const seen = new Set();
  const queue = [resolve(ROOT, entry)];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of runtimeImports(file)) {
      const resolved = resolveRelative(file, specifier);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

/* -------------------------------------------------------------------------- */
/* What counts as a world-instance literal                                     */
/* -------------------------------------------------------------------------- */

/**
 * A measure's institutional designation written into source.
 *
 * "HB" on its own is a chamber label and stays. "HB 214" names one bill in one
 * world, which is the thing a fresh life must never be handed because a module
 * spells it out.
 */
const MEASURE_DESIGNATION =
  /["'`](?:[A-Z]{2,4})\s?\d{1,4}["'`]|["'`][^"'`\n]*\b(?:HB|SB|LB|HR|SR|AB|HCR|SCR|HJR|SJR)\s?\d{1,4}\b[^"'`\n]*["'`]/g;

/** A module whose name says it exists to stand in for a world. */
const FIXTURE_MODULE =
  /(?:^|[/-])(?:fixture|fixtures|demo|synthetic)(?:[/-]|\.|$)/i;

const SKIP_LINE = /^\s*(?:\/\/|\*|\/\*)/;

function scanFile(absolute) {
  const rel = relative(ROOT, absolute);
  const hits = [];
  let source;
  try {
    source = readFileSync(absolute, "utf8");
  } catch {
    return hits;
  }
  // A generated corpus is data by construction and is checked by its own
  // generator; scanning three megabytes of it here would drown the report.
  if (rel.includes(".generated.")) return hits;
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    if (SKIP_LINE.test(line)) return;
    MEASURE_DESIGNATION.lastIndex = 0;
    for (const match of line.matchAll(MEASURE_DESIGNATION)) {
      hits.push({
        kind: "measure-designation",
        file: rel,
        line: index + 1,
        literal: match[0],
        text: line.trim().slice(0, 160),
      });
    }
  });
  return hits;
}

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

function main() {
  const checkOnly = process.argv.includes("--check");
  const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
  const declared = new Map(
    registry.cases.map((entry) => [`${entry.file}:${entry.literal}`, entry]),
  );

  const reachable = [...runtimeReachable(PLAY_ENTRY)]
    .map((file) => relative(ROOT, file))
    .filter((file) => /\.tsx?$/.test(file))
    .sort();

  const fixtureModulesOnSpine = reachable.filter((file) =>
    FIXTURE_MODULE.test(file),
  );

  const hits = [];
  for (const file of reachable) hits.push(...scanFile(resolve(ROOT, file)));

  const cases = hits.map((hit) => {
    const key = `${hit.file}:${hit.literal}`;
    // Exact literals only. A file-wide wildcard would let a NEW world-instance
    // literal hide behind an older one's clearance in the same file, which is
    // the way an inventory like this goes quietly stale.
    const entry = declared.get(key);
    return {
      ...hit,
      classification: entry?.classification ?? "UNCLASSIFIED",
      rationale: entry?.rationale ?? null,
    };
  });

  const unclassified = cases.filter(
    (entry) => entry.classification === "UNCLASSIFIED",
  );
  const productionHardcodes = cases.filter(
    (entry) => entry.classification === "production-hardcode",
  );

  const census = {
    generatedFrom: PLAY_ENTRY,
    note: "Runtime (value-import) reachability from ordinary play. Type-only imports are erased before a player runs the game and are not counted.",
    runtimeReachableModules: reachable.length,
    fixtureNamedModulesOnRuntimeSpine: fixtureModulesOnSpine,
    counts: {
      total: cases.length,
      legitimateDataOrLabel: cases.filter(
        (entry) => entry.classification === "legitimate-data-label",
      ).length,
      devOrTestOnlyFixture: cases.filter(
        (entry) => entry.classification === "dev-or-test-only-fixture",
      ).length,
      productionHardcode: productionHardcodes.length,
      unclassified: unclassified.length,
    },
    cases: cases.sort((a, b) =>
      a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file),
    ),
  };

  if (!checkOnly) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(census, null, 2)}\n`);
  }

  console.log(
    `Runtime-reachable modules from ${PLAY_ENTRY}: ${census.runtimeReachableModules}`,
  );
  console.log(
    `World-instance literals on that graph: ${census.counts.total} ` +
      `(${census.counts.legitimateDataOrLabel} data/label, ` +
      `${census.counts.productionHardcode} production hardcode, ` +
      `${census.counts.unclassified} unclassified)`,
  );

  if (fixtureModulesOnSpine.length > 0) {
    console.error(
      `\nFixture-named modules reachable at runtime from ordinary play:\n` +
        fixtureModulesOnSpine.map((file) => `  ${file}`).join("\n"),
    );
  }
  if (unclassified.length > 0) {
    console.error(
      `\n${unclassified.length} world-instance literal(s) on the ordinary-play ` +
        `graph are not classified in docs/dehardwire/classification.json:\n` +
        unclassified
          .map((entry) => `  ${entry.file}:${entry.line}  ${entry.literal}`)
          .join("\n"),
    );
    process.exitCode = 1;
  }
  if (productionHardcodes.length > 0) {
    console.error(
      `\n${productionHardcodes.length} case(s) still classified as production hardcode:\n` +
        productionHardcodes
          .map((entry) => `  ${entry.file}:${entry.line}  ${entry.literal}`)
          .join("\n"),
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main();
}
