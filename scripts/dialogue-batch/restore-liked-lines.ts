/**
 * Puts back the lines the owner graded good whose bank pieces a rewrite or a
 * trim deleted (owner, via the CTO, Nov 8: "A rewrite never deletes a line he
 * graded good").
 *
 *   node --import tsx scripts/dialogue-batch/restore-liked-lines.ts
 *   node --import tsx scripts/dialogue-batch/apply-grades.ts
 *
 * `restored-liked-lines.json` (beside this file) is the record: one row per
 * liked key, with the piece as it was recovered from history (or the live
 * piece that already says the same line), the bank slot that serves its job
 * today, and the grade it carries. This script
 *
 *   - splices each new piece into its bank as text, additions only (the banks
 *     are large and other sessions edit them; a rewrite of the file would
 *     re-expand every short object),
 *   - gives a live piece a second use where the same words already live in
 *     the bank (a bank refuses two pieces with the same text),
 *   - writes `data/english/grades/restored-liked-lines.json`, one grade row
 *     per piece whose key differs from the ledger's, so the grade attaches to
 *     the live piece (`apply-grades.ts` folds it).
 *
 * Idempotent: a piece already in its bank, a use already on its target and a
 * grade file already written are left as they are. A development tool; it
 * never words anything.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import * as prettier from "prettier";

export const RESTORED_FILE = "scripts/dialogue-batch/restored-liked-lines.json";
export const RESTORED_GRADES = "data/english/grades/restored-liked-lines.json";
const PARTS_DIR = "data/english/parts";

interface Grade {
  readonly by: string;
  readonly line: string;
  readonly note: string;
  readonly batch: string;
}

export interface RestoredRow {
  /** The key the ledger carries the grade under. */
  readonly oldKey: string;
  readonly bank: string;
  /**
   * same-key: the piece comes back under the ledger's key. new-key: the old
   * key cannot stand in the live bank, so the piece is added under a valid
   * one. add-use: the live bank already has the words; the target gets a use.
   * alias: the live bank already has the words for this job; the grade moves.
   * bank-piece: no scene reads the line yet; it goes into a bank of its own
   * kind (made here from `banks` when the file is gone), under a stopgap.
   */
  readonly how: "same-key" | "new-key" | "add-use" | "alias" | "bank-piece";
  readonly piece?: Record<string, unknown>;
  readonly target?: string;
  readonly use?: Record<string, unknown>;
  readonly grade: Grade;
}

interface BankHeader {
  readonly description: string;
  readonly slots: Record<string, string>;
  readonly maxWords: number;
}

const restoredFile = () =>
  JSON.parse(readFileSync(RESTORED_FILE, "utf8")) as {
    rows: RestoredRow[];
    banks: Record<string, BankHeader>;
  };

export const readRestored = (): readonly RestoredRow[] => restoredFile().rows;

/** The key a restored line's grade lives under today. */
export const liveKey = (row: RestoredRow): string =>
  row.piece ? (row.piece.key as string) : row.target!;

const pretty = async (value: unknown, indent: number): Promise<string> => {
  const text = await prettier.format(JSON.stringify(value, null, 2), {
    parser: "json",
  });
  return text
    .trimEnd()
    .split("\n")
    .map((line) => " ".repeat(indent) + line)
    .join("\n");
};

/** Adds one piece before the end of the bank's `parts` array, as text. */
async function addPiece(
  file: string,
  piece: Record<string, unknown>,
): Promise<boolean> {
  if (!existsSync(file)) {
    const register = basename(file, ".json");
    const header = restoredFile().banks[register];
    if (!header) throw new Error(`${file}: no bank and no header for it`);
    writeFileSync(
      file,
      await prettier.format(
        JSON.stringify({
          schema: "english-parts/1",
          register,
          ...header,
          parts: [piece],
        }),
        { parser: "json" },
      ),
    );
    return true;
  }
  const text = readFileSync(file, "utf8");
  if (text.includes(`"key": "${piece.key as string}"`)) return false;
  const close = text.lastIndexOf("\n  ]\n}");
  if (close < 0) throw new Error(`${file}: no end of the parts array`);
  const next = `${text.slice(0, close)},\n${await pretty(piece, 4)}${text.slice(close)}`;
  writeFileSync(file, next);
  return true;
}

/** Adds one use to a live piece's `uses` array, as text. */
async function addUse(
  file: string,
  key: string,
  use: Record<string, unknown>,
): Promise<boolean> {
  const text = readFileSync(file, "utf8");
  const at = text.indexOf(`"key": "${key}"`);
  if (at < 0) throw new Error(`${file}: no piece ${key}`);
  const uses = text.indexOf('"uses": [', at);
  const end = text.indexOf("\n      ]", uses);
  const block = text.slice(uses, end);
  const says = (name: string) =>
    block.includes(`"${name}": "${use[name] as string}"`);
  if (["purpose", "step", "move", "role"].every(says)) return false;
  const spliced = `${text.slice(0, end)},\n${await pretty(use, 8)}${text.slice(end)}`;
  writeFileSync(file, spliced);
  return true;
}

async function main() {
  const rows = readRestored();
  let added = 0;
  for (const row of rows) {
    const file = join(PARTS_DIR, `${row.bank}.json`);
    if (row.piece && (await addPiece(file, row.piece))) added += 1;
    if (row.how === "add-use" && (await addUse(file, row.target!, row.use!)))
      added += 1;
  }
  // A same-key piece is graded under its own key already; every other row
  // carries the grade to the live key.
  const grades = rows
    .filter((row) => liveKey(row) !== row.oldKey)
    .map((row, i) => ({
      i,
      grade: "good",
      by: `${row.grade.by}; restored Nov 8, 2026 (${row.grade.batch})`,
      line: row.grade.line,
      note: row.grade.note,
      parts: [liveKey(row)],
      restoredFrom: row.oldKey,
    }));
  const out = await prettier.format(
    JSON.stringify(
      {
        batch: "restored-liked-lines",
        note: 'Lines the owner graded good whose bank pieces a rewrite or a trim deleted, put back on the live piece that serves the same job (owner, via the CTO, Nov 8: "A rewrite never deletes a line he graded good"). Each row carries the ledger key the grade was first given under (`restoredFrom`) and the live key it now counts for (`parts`). Written by scripts/dialogue-batch/restore-liked-lines.ts.',
        grades,
      },
      null,
      2,
    ),
    { parser: "json" },
  );
  writeFileSync(RESTORED_GRADES, out);
  process.stdout.write(
    `Restored ${added} change(s); wrote ${grades.length} grade rows to ${RESTORED_GRADES}.\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
