// The master updater (owner, Nov 11, 2026): applies docs/current.json's
// replaced list to every document, rule, skill and code comment the pointer
// guard reads. A pointer to a path that was removed, with nothing in its
// place, is marked " (removed)", so a reader is told it is gone and
// docs/CURRENT.md says where to restore it from. A path that went somewhere
// else is left for a person: a sentence may be pointing a reader at the file,
// or talking about the old one, and only its writer can tell which.
// Run after adding a row to the replaced list:
// node --import tsx scripts/current/repoint.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CODE, REMOVED_MARK, data, exists, scanned } from "./pointers";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One text with the replaced list applied. `code` is true for a script, where only comment lines change. */
export function repointed(text: string, code: boolean): string {
  const apply = (line: string): string => {
    let out = line;
    for (const row of data.replaced) {
      // A path with something in its place is a person's to repoint.
      if (exists(row.now)) continue;
      // The old path, alone or with more of a path after it, in backticks.
      const ticked = new RegExp(
        `\`${escape(row.old)}((?:/[^\`\\s]*)?)\`(${escape(REMOVED_MARK)})?`,
        "g",
      );
      out = out.replace(
        ticked,
        (_all, rest: string, mark?: string) =>
          `\`${row.old}${rest}\`${mark ?? REMOVED_MARK}`,
      );
      if (!code) continue;
      // In a comment a bare path counts too.
      const bare = new RegExp(
        `(?<![\\w./\`-])${escape(row.old)}((?:/[\\w@./-]*)?)(?![\\w/\`-])(${escape(REMOVED_MARK)})?`,
        "g",
      );
      out = out.replace(
        bare,
        (_all, rest: string, mark?: string) =>
          `${row.old}${rest}${mark ?? REMOVED_MARK}`,
      );
    }
    return out;
  };
  return text
    .split("\n")
    .map((line) =>
      code && !/^\s*(\/\/|\/\*|\*)/.test(line) ? line : apply(line),
    )
    .join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let changed = 0;
  for (const file of scanned) {
    const full = path.join(ROOT, file);
    const before = readFileSync(full, "utf8");
    const after = repointed(before, CODE.test(file));
    if (after === before) continue;
    writeFileSync(full, after);
    changed += 1;
    console.log(`repointed ${file}`);
  }
  console.log(`${changed} files changed.`);
}
