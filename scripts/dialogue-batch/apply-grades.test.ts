import { copyFileSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  PartGradeCounts,
  PartGradeLedger,
} from "../../src/english/english-grades";
import {
  foldGrades,
  foldLedger,
  readGradedBatches,
  withKept,
  withVoiceGrades,
  VOICE_VERDICT,
} from "./apply-grades";

/**
 * The ledger counts every graded line once (owner, Nov 10: batch 2's grades
 * were recorded three times, so a line he graded bad once read bad three
 * times). It is the grade files on disk folded fresh, plus the share of
 * batches whose files are gone; folding again from its own result is a no-op.
 */
const LEDGER_FILE = "data/english/part-grades.json";
const BATCH_2_VOICE = "data/english/grades/2026-11-09-batch-2-voice.json";

interface VoiceRow {
  key: string;
  spans: { strength: number }[];
}
const voiceRows = (
  JSON.parse(readFileSync(BATCH_2_VOICE, "utf8")) as { grades: VoiceRow[] }
).grades;

/** What each key must read from a voice file: one count for every row whose spans sum to a verdict. */
function expectedTallies(rows: readonly VoiceRow[]) {
  const tallies = new Map<string, { good: number; bad: number }>();
  for (const row of rows) {
    const net = row.spans.reduce((sum, span) => sum + span.strength, 0);
    if (Math.abs(net) < VOICE_VERDICT) continue;
    const was = tallies.get(row.key) ?? { good: 0, bad: 0 };
    tallies.set(
      row.key,
      net > 0 ? { ...was, good: was.good + 1 } : { ...was, bad: was.bad + 1 },
    );
  }
  return tallies;
}

/** A grade directory holding only the batch 2 voice file, and an empty batch directory. */
function onlyBatch2() {
  const root = mkdtempSync(join(tmpdir(), "apply-grades-"));
  const gradeDir = join(root, "grades");
  const batchDir = join(root, "batches");
  mkdirSync(gradeDir);
  mkdirSync(batchDir);
  copyFileSync(BATCH_2_VOICE, join(gradeDir, "2026-11-09-batch-2-voice.json"));
  return { gradeDir, batchDir };
}

const counts = (good: number, bad: number): PartGradeCounts => ({
  good,
  bad,
  fix: 0,
  sharedGood: 0,
  sharedBad: 0,
  sharedFix: 0,
});

/**
 * A ledger as the old script wrote it: a batch whose files are long gone
 * (`batch-old`), the voice batch already folded in once, and no `kept` share.
 */
function legacyLedger(gradeDir: string, batchDir: string): PartGradeLedger {
  const first = foldLedger(
    readGradedBatches(batchDir, gradeDir),
    undefined,
    gradeDir,
  );
  return {
    schema: "english-part-grades/1",
    batches: ["batch-old", ...first.batches],
    parts: { ...first.parts, "bank.old.line": counts(2, 1) },
  };
}

describe("the part-grade ledger counts every graded row once", () => {
  it("folds the same files twice, or ten times, to the same ledger", () => {
    const { gradeDir, batchDir } = onlyBatch2();
    const graded = readGradedBatches(batchDir, gradeDir);
    const start = legacyLedger(gradeDir, batchDir);
    const once = foldLedger(graded, start, gradeDir);
    let again = once;
    for (let run = 0; run < 10; run += 1)
      again = foldLedger(graded, again, gradeDir);
    expect(again).toEqual(once);
    expect(JSON.stringify(again)).toBe(JSON.stringify(once));
    // A first rerun from the old ledger adds nothing the files do not hold.
    const alone = withVoiceGrades(
      { schema: "english-part-grades/1", batches: [], parts: {} },
      gradeDir,
    );
    for (const [key, was] of Object.entries(alone.parts))
      expect(once.parts[key], key).toEqual(was);
    // The share of the batch whose files are gone is kept, once.
    expect(once.parts["bank.old.line"]).toEqual(counts(2, 1));
    expect(once.kept?.batches).toEqual(["batch-old"]);
  });

  it("counts each batch 2 voice row once on its part, however often the script runs", () => {
    const { gradeDir, batchDir } = onlyBatch2();
    const graded = readGradedBatches(batchDir, gradeDir);
    const tallies = expectedTallies(voiceRows);
    expect(tallies.size).toBeGreaterThan(20);
    expect([...tallies.values()].some((tally) => tally.good > 0)).toBe(true);
    expect([...tallies.values()].some((tally) => tally.bad > 0)).toBe(true);
    let ledger = legacyLedger(gradeDir, batchDir);
    for (let run = 0; run < 3; run += 1) {
      ledger = foldLedger(graded, ledger, gradeDir);
      for (const [key, tally] of tallies)
        expect(
          { good: ledger.parts[key]?.good, bad: ledger.parts[key]?.bad },
          `${key} after run ${run + 1}`,
        ).toEqual(tally);
      // Nothing else is counted: the voice file is the only grade file here.
      expect(Object.keys(ledger.parts).sort()).toEqual(
        [...tallies.keys(), "bank.old.line"].sort(),
      );
    }
    // The fold of the file alone says the same.
    const alone = withVoiceGrades(
      { schema: "english-part-grades/1", batches: [], parts: {} },
      gradeDir,
    );
    for (const [key, tally] of tallies)
      expect({
        good: alone.parts[key]?.good,
        bad: alone.parts[key]?.bad,
      }).toEqual(tally);
  });

  it("takes a batch whose files just went away into the kept share, once", () => {
    const { gradeDir, batchDir } = onlyBatch2();
    const graded = readGradedBatches(batchDir, gradeDir);
    const folded = foldLedger(
      graded,
      legacyLedger(gradeDir, batchDir),
      gradeDir,
    );
    // Its voice file is deleted: its counts stay, from `kept`, and a rerun keeps them.
    const gone = foldLedger(
      [],
      folded,
      mkdtempSync(join(tmpdir(), "no-grades-")),
    );
    expect(gone.parts).toEqual(folded.parts);
    expect(gone.kept?.batches).toContain("2026-11-09-batch-2:voice");
    expect(
      foldLedger([], gone, mkdtempSync(join(tmpdir(), "no-grades-"))),
    ).toEqual(gone);
    // Putting the file back refuses a kept share that would count it twice.
    expect(() => foldLedger(graded, gone, gradeDir)).toThrow(/on disk again/);
  });

  it("the committed ledger is the grade files on disk folded fresh plus the kept share", () => {
    const committed = JSON.parse(
      readFileSync(LEDGER_FILE, "utf8"),
    ) as PartGradeLedger;
    const graded = readGradedBatches();
    expect(committed.kept?.batches.length).toBeGreaterThan(0);
    // Run `node --import tsx scripts/dialogue-batch/apply-grades.ts` and commit the result.
    expect(foldLedger(graded, committed)).toEqual(committed);
    // Every part is its kept counts plus a fresh fold, nothing more.
    const fresh = withVoiceGrades(foldGrades(graded));
    for (const key of new Set([
      ...Object.keys(committed.parts),
      ...Object.keys(fresh.parts),
    ])) {
      const sum = (field: "good" | "bad" | "fix") =>
        (committed.kept?.parts[key]?.[field] ?? 0) +
        (fresh.parts[key]?.[field] ?? 0);
      for (const field of ["good", "bad", "fix"] as const)
        expect(committed.parts[key]?.[field] ?? 0, `${key} ${field}`).toBe(
          sum(field),
        );
    }
    expect(withKept(fresh, committed).parts).toEqual(committed.parts);
  });
});
