/**
 * `npm run spelling` lists British spellings and day-first dates in the prose
 * of every tracked file, the same way `tests/american-english-sweep.test.ts`
 * reads them, and exits 1 if there are any. `npm run spelling -- --write`
 * repairs them in place: it only ever touches comments, strings with a space,
 * JSX text and Markdown outside code, so identifiers and saved tokens stay.
 *
 * Run it before merging a branch that adds docs or copy. A regex literal in a
 * test is code, not prose; it is left for a person to change.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOW_MARKER, exemptionFor } from "./american-english-scope";
import {
  britishSpellings,
  DAY_FIRST_DATE,
  monthFirstDates,
} from "./american-spelling";
import { proseKindOf, proseRanges } from "./prose-ranges";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const write = process.argv.includes("--write");
const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const findings: string[] = [];
let repaired = 0;
for (const file of files) {
  if (exemptionFor(file) || !proseKindOf(file)) continue;
  let text: string;
  try {
    text = readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    continue;
  }
  if (text.includes("\u0000")) continue;
  const allowed = new Set<number>();
  text.split("\n").forEach((line, index) => {
    if (!line.includes(ALLOW_MARKER)) return;
    allowed.add(index + 1);
    allowed.add(index + 2);
  });
  const lineOf = (index: number) => text.slice(0, index).split("\n").length;
  let out = "";
  let cursor = 0;
  for (const range of proseRanges(text, file)) {
    if (allowed.has(lineOf(range.start))) continue;
    const prose = text.slice(range.start, range.end);
    let fixed = "";
    let at = 0;
    for (const found of britishSpellings(prose)) {
      findings.push(
        `${file}:${lineOf(range.start + found.index)} "${found.british}" → "${found.american}"`,
      );
      fixed += prose.slice(at, found.index) + found.american;
      at = found.index + found.british.length;
    }
    fixed += prose.slice(at);
    for (const date of fixed.matchAll(DAY_FIRST_DATE))
      findings.push(
        `${file}:${lineOf(range.start)} "${date[0]}" → month first`,
      );
    out += text.slice(cursor, range.start) + monthFirstDates(fixed);
    cursor = range.end;
  }
  out += text.slice(cursor);
  if (out !== text && write) {
    writeFileSync(path.join(ROOT, file), out);
    repaired += 1;
  }
}

for (const finding of findings) console.log(finding);
if (write) console.log(`Repaired ${repaired} file(s).`);
else if (findings.length)
  console.log(`${findings.length} to fix; run npm run spelling -- --write.`);
process.exit(!write && findings.length ? 1 : 0);
