/**
 * Plays the golden path for one seed and prints what the player hit.
 *
 *   node --max-old-space-size=12288 --import tsx scripts/golden-path/run.ts \
 *     --seed golden-path-1 [--out report.json] [--no-save]
 *
 * A week-old world is large enough that saving it needs the bigger heap.
 *
 * Exits 1 when any step recorded a break, so a later session can run it as a
 * check once the path is whole.
 */
import { writeFileSync } from "node:fs";
import {
  GOLDEN_PATH_STEPS,
  playGoldenPath,
  type GoldenPathState,
} from "./golden-path";

function argument(name: string): string | null {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? null) : null;
}

const seed = argument("seed") ?? "golden-path-1";
const out = argument("out");
const started = Date.now();

let printedNotes = 0;
let printedBreaks = 0;
// Saving a week-old world takes minutes and most of the memory; skip it when
// only the path before it is being checked.
const steps = process.argv.includes("--no-save")
  ? GOLDEN_PATH_STEPS.filter((step) => step.id !== "save-continue")
  : GOLDEN_PATH_STEPS;
const state = playGoldenPath(seed, steps, (step, current) => {
  const seconds = Math.round((Date.now() - started) / 1000);
  const breaks = current.breaks.filter((row) => row.step === step.id);
  console.log(
    `[${seconds}s] ${step.id} — ${current.world.currentDate}: ${breaks.length ? `${breaks.length} break(s)` : "ok"}`,
  );
  // Printed as each step ends, so a run that dies later keeps what it found.
  for (const row of current.notes.slice(printedNotes))
    console.log(`  note ${row.step} ${row.date}: ${row.text}`);
  for (const row of current.breaks.slice(printedBreaks))
    console.log(
      `  BREAK ${row.step} [${row.kind}] ${row.detail}\n    ${row.evidence.join("\n    ")}`,
    );
  printedNotes = current.notes.length;
  printedBreaks = current.breaks.length;
});

function report(final: GoldenPathState) {
  return {
    seed: final.seed,
    place: {
      key: final.place.key,
      name: final.place.displayName,
      state: final.place.stateJurisdictionKey,
    },
    playerPersonId: final.playerPersonId,
    started: final.startDate,
    reached: final.world.currentDate,
    filedOfficeKey: final.filedOfficeKey,
    dayTimingsMs: final.dayTimingsMs,
    notes: final.notes,
    breaks: final.breaks,
  };
}

const summary = report(state);
console.log(
  `${summary.breaks.length} break(s) in ${Math.round((Date.now() - started) / 1000)} s`,
);
if (out) writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
process.exitCode = summary.breaks.length > 0 ? 1 : 0;
