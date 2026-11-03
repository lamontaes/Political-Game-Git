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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const root = process.cwd();
  // In a stopped merge, stage 3 is the branch's copy; otherwise the working file.
  let text = "";
  try {
    text = execFileSync("git", ["show", `:3:${OLD}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    if (existsSync(OLD)) text = readFileSync(OLD, "utf8");
  }
  if (!text) {
    console.log(`No ${OLD} on this branch; nothing to move.`);
    process.exit(0);
  }
  const theirs = JSON.parse(text) as Row[];
  const current = readStopgapFolder<Row>(root);
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
    `Moved ${moved.length} new and changed rows into ${touched.size} family files; ${OLD} removed.`,
  );
}
