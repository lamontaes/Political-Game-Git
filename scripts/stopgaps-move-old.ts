// Moves a branch's rows from the old single register file into the family
// files (tooling-stopgaps-register-per-family). For a PR cut before the split:
// after `git merge origin/main` stops on "deleted in HEAD/modified in theirs"
// for src/core2/data/stopgaps.json, run
//   node --import tsx scripts/stopgaps-move-old.ts
// It reads the branch's copy of the old file, writes every row the branch added
// or changed into its family file (matched by id), and deletes the old file.
// Rows the branch did not touch are already in the family files.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  readStopgapFolder,
  writeStopgapFolder,
} from "../src/core2/stopgaps-folder";

type Row = { id: string } & Record<string, unknown>;
const OLD = "src/core2/data/stopgaps.json";

/** Merges `rows` into `current` by id: a changed row replaces, a new row is appended. */
export function mergeRows(current: Row[], rows: Row[]): Row[] {
  const out = [...current];
  for (const row of rows) {
    const at = out.findIndex((r) => r.id === row.id);
    if (at < 0) out.push(row);
    else if (JSON.stringify(out[at]) !== JSON.stringify(row)) out[at] = row;
  }
  return out;
}

/**
 * The rows the branch added or changed against the merge base, each merged
 * field by field onto main's current row: a field comes from the branch only
 * where the branch changed it and main did not, so a row the branch touched
 * for its line keeps every later change main made to its text or status. A
 * field both sides changed differently keeps main's and is reported.
 */
export function branchRows(
  base: Row[],
  branch: Row[],
  current: Row[],
): { rows: Row[]; conflicts: string[] } {
  const before = new Map(base.map((row) => [row.id, row]));
  const now = new Map(current.map((row) => [row.id, row]));
  const rows: Row[] = [];
  const conflicts: string[] = [];
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  for (const row of branch) {
    const was = before.get(row.id);
    if (was && same(was, row)) continue;
    const main = now.get(row.id);
    if (!was || !main) {
      rows.push(main && !was ? main : row);
      continue;
    }
    const out: Row = { ...main };
    for (const key of new Set([...Object.keys(row), ...Object.keys(was)])) {
      if (same(row[key], was[key])) continue;
      if (same(main[key], was[key])) out[key] = row[key];
      else if (!same(main[key], row[key]))
        conflicts.push(`${row.id}.${key}: kept main's`);
    }
    rows.push(out);
  }
  return { rows, conflicts };
}

const show = (spec: string): string => {
  try {
    return execFileSync("git", ["show", spec], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const root = process.cwd();
  // In a stopped merge the branch's copy is whichever side kept the file:
  // stage 2 when main is merged into the branch, stage 3 when the branch is
  // merged into main. Otherwise it is the working file.
  const text =
    show(`:2:${OLD}`) ||
    show(`:3:${OLD}`) ||
    (existsSync(OLD) ? readFileSync(OLD, "utf8") : "");
  if (!text) {
    console.log(`No ${OLD} on this branch; nothing to move.`);
    process.exit(0);
  }
  // The merge base's copy: rows the branch never touched stay as main has
  // them now, even where main changed them since the branch was cut.
  let baseText = show(`:1:${OLD}`);
  if (!baseText) {
    try {
      const mergeBase = execFileSync(
        "git",
        ["merge-base", "HEAD", "MERGE_HEAD"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
      baseText = show(`${mergeBase}:${OLD}`);
    } catch {
      baseText = "";
    }
  }
  if (!baseText) {
    console.error(
      "No merge base copy of the old register: run this inside the stopped merge.",
    );
    process.exit(1);
  }
  const current = readStopgapFolder<Row>(root);
  const { rows: theirs, conflicts } = branchRows(
    JSON.parse(baseText) as Row[],
    JSON.parse(text) as Row[],
    current,
  );
  for (const line of conflicts) console.log(`both changed ${line}`);
  const merged = mergeRows(current, theirs);
  const moved = merged.filter(
    (row, i) =>
      i >= current.length || JSON.stringify(row) !== JSON.stringify(current[i]),
  );
  const touched = new Set(moved.map((row) => row.id.split("-")[1]));
  // Rewrite only the families the branch touched, whole.
  writeStopgapFolder(
    root,
    merged.filter((row) => touched.has(row.id.split("-")[1])),
  );
  rmSync(OLD, { force: true });
  try {
    execFileSync("git", ["rm", "-q", "--cached", "--ignore-unmatch", OLD]);
  } catch {
    /* not in a merge */
  }
  console.log(
    `The branch changed ${theirs.length} rows against the merge base; moved ${moved.length} into ${touched.size} family files; ${OLD} removed.`,
  );
}
