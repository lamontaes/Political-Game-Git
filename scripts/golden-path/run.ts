/**
 * Plays the golden path for one seed and prints what the player hit.
 *
 *   node --import tsx scripts/golden-path/run.ts --seed golden-path-1 [--out report.json]
 *
 * Exits 1 when any step recorded a break, so a later session can run it as a
 * check once the path is whole.
 */
import { writeFileSync } from "node:fs";
import { playGoldenPath, type GoldenPathState } from "./golden-path";

function argument(name: string): string | null {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? null) : null;
}

const seed = argument("seed") ?? "golden-path-1";
const out = argument("out");
const started = Date.now();

const state = playGoldenPath(seed, undefined, (step, current) => {
  const seconds = Math.round((Date.now() - started) / 1000);
  const breaks = current.breaks.filter((row) => row.step === step.id);
  console.log(
    `[${seconds}s] ${step.id} — ${current.world.currentDate}: ${breaks.length ? `${breaks.length} break(s)` : "ok"}`,
  );
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
for (const row of summary.notes)
  console.log(`  note ${row.step} ${row.date}: ${row.text}`);
for (const row of summary.breaks)
  console.log(
    `  BREAK ${row.step} [${row.kind}] ${row.detail}\n    ${row.evidence.join("\n    ")}`,
  );
if (out) writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
process.exitCode = summary.breaks.length > 0 ? 1 : 0;
