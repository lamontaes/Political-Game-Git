/**
 * Moves director/words.ts, the word helpers (a proper name, a spoken date, a
 * possessive, an employer's name), into the English engine, and points every
 * import at the new file (CTO's story audit, Nov 26, row C6; owner: "It's all
 * just going to be called story now"). Re-runnable: when the file has already
 * moved it only fixes any import another branch has added since.
 *
 *   node scripts/story/move-word-helpers.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MOVES = [
  ["src/director/words.ts", "src/english/words.ts"],
  ["src/director/words.test.ts", "src/english/words.test.ts"],
];
const OLD = "src/director/words";
const NEW = "src/english/words";

/** The files this run moved: their own imports were written for where they stood. */
const movedNow = new Map();
for (const [from, to] of MOVES)
  if (existsSync(path.join(ROOT, from)) && !existsSync(path.join(ROOT, to))) {
    execFileSync("git", ["mv", from, to], { cwd: ROOT });
    movedNow.set(to, from);
  }

const files = execFileSync(
  "git",
  ["ls-files", "src", "scripts", "tests", "docs/current.json"],
  { cwd: ROOT, encoding: "utf8" },
)
  .split("\n")
  .filter(
    (file) =>
      /\.(ts|tsx|mjs|js)$/.test(file) && existsSync(path.join(ROOT, file)),
  );

/** The module a specifier names, from the file that writes it, without extension. */
const resolved = (file, spec) =>
  path.posix
    .normalize(path.posix.join(path.posix.dirname(file), spec))
    .replace(/\.(js|ts)$/, "");

let changed = 0;
for (const file of files) {
  // A moved file's own imports are read from where it stood, and written from where it stands.
  const wasAt = movedNow.get(file) ?? file;
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const next = text.replace(
    /(from\s+|import\(\s*|vi\.mock\(\s*|require\(\s*)(["'])(\.{1,2}\/[^"']*)\2/g,
    (all, lead, quote, spec) => {
      const was = resolved(wasAt, spec);
      const target = was === OLD ? NEW : was;
      if (target === was && wasAt === file) return all;
      const rel = path.posix.relative(path.posix.dirname(file), target);
      return `${lead}${quote}${rel.startsWith(".") ? rel : `./${rel}`}${quote}`;
    },
  );
  if (next !== text) {
    writeFileSync(path.join(ROOT, file), next);
    changed += 1;
  }
}
console.log(
  `${changed} files changed; every import of ${OLD} now names ${NEW}`,
);
