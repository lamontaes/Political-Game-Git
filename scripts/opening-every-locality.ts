// Opens every locality whose own government is its county, where two coverage
// rows meet (the county-buyer account's recorded count and its offices in the
// place), and names each one that throws (core-opening-coverage-every-locality).
// About 8,200 localities at about 12 seconds an opening, so it runs in chunks
// and resumes: every result is appended to the results file as it happens,
// and a rerun skips the keys already there.
//
//   npm run opening:every-locality -- --out <file.jsonl> [--limit N] [--state XX]
//
// Exit 1 when any opening in this run threw; the summary names each one.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { buildBenchWorld } from "../src/bench/world";
import { setBookkeeping } from "../src/core2/bookkeeping";
import { gameStartDate } from "../src/core2/game-start";
import { placeLocalGovernmentUnits } from "../src/core2/gov-rules/local-governments";
import { corePlaceByKey } from "../src/core2/place-lookup";
import { placeLocalities, placeStateKeys } from "../src/core2/places";

export type LocalityRow = { key: string; name: string; state: string };

/** Every locality whose own government is its county (no city, village or township), sorted by key. */
export function countyGovernedLocalities(only?: string): LocalityRow[] {
  const rows: LocalityRow[] = [];
  for (const state of [...placeStateKeys()].sort()) {
    if (only && state !== only) continue;
    for (const locality of placeLocalities(state)) {
      const units = placeLocalGovernmentUnits(corePlaceByKey(locality.key));
      if (
        units.municipal.length === 0 &&
        units.townships.length === 0 &&
        units.counties.length > 0
      )
        rows.push({ key: locality.key, name: locality.displayName, state });
    }
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

/** The world seed for a locality: fixed by its key, so a failure replays on the same town. */
export const localitySeed = (key: string): string =>
  createHash("sha256").update(`opening-every-locality:${key}`).digest("hex");

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const out = flag("out");
  if (!out) {
    console.error("usage: --out <file.jsonl> [--limit N] [--state XX]");
    process.exit(2);
  }
  const limit = Number(flag("limit") ?? Infinity);
  const done = new Set(
    existsSync(out)
      ? readFileSync(out, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => (JSON.parse(line) as { key: string }).key)
      : [],
  );
  setBookkeeping(false);
  const all = countyGovernedLocalities(flag("state"));
  const todo = all.filter((row) => !done.has(row.key)).slice(0, limit);
  console.log(
    `${all.length} county-governed localities; ${done.size} already in ${out}; this run opens ${todo.length}.`,
  );
  const failed: string[] = [];
  for (const row of todo) {
    const seed = localitySeed(row.key);
    // Named before the build, so a run that dies building it still names it.
    process.stderr.write(`opening ${row.name} (${row.key})\n`);
    const started = performance.now();
    let error: string | null = null;
    try {
      buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: row.key,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      failed.push(`${row.name} (${row.key}) seed ${seed}: ${error}`);
    }
    appendFileSync(
      out,
      `${JSON.stringify({ ...row, seed, ok: error === null, error, seconds: Math.round((performance.now() - started) / 100) / 10 })}\n`,
    );
    (globalThis as { gc?: () => void }).gc?.();
  }
  const results = readFileSync(out, "utf8").split("\n").filter(Boolean);
  const bad = results.filter(
    (line) => !(JSON.parse(line) as { ok: boolean }).ok,
  );
  console.log(
    `Opened ${results.length} of ${all.length}; ${bad.length} threw in all runs so far.`,
  );
  for (const line of failed) console.log(`FAILED ${line}`);
  process.exit(failed.length ? 1 : 0);
}
