import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** What counts as a copy of a name, a pronoun or a date, and where the one place is (read by pieces-one-place.test.ts). */
const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

/** The files that are the one place for each piece; they may build it. */
export const ALLOWED: Record<Kind, string[]> = {
  name: ["src/english/plain-words.mjs"],
  pronoun: ["src/english/said-as.ts", "src/english/pronoun-words.ts"],
  date: ["src/english/day-words.ts", "src/english/plain-words.mjs"],
  list: ["src/english/plain-words.mjs"],
  capital: ["src/english/plain-words.mjs"],
  possessive: ["src/english/plain-words.mjs"],
};

export type Kind =
  "name" | "pronoun" | "date" | "list" | "capital" | "possessive";

const PATTERNS: Record<Kind, RegExp> = {
  // `${a.givenName} ${a.familyName}` or the same joined with " "
  name: /\$\{[^}]*\bgivenName\}\s*\$\{[^}]*\bfamilyName\}|\bgivenName\s*\+\s*" "\s*\+|\bgivenName,\s*[\w.!?]*familyName\s*\]\s*\.join\(/g,
  // a gender test that picks the word: === "male" ? "he" (or his, him, her)
  pronoun:
    /===\s*"(?:fe)?male"\s*\?\s*"(?:he|she|his|her|him|himself|herself)"/g,
  // a month list or the platform's date formatter
  date: /\.toLocaleDateString\(|const\s+MONTH(?:_NAMES|S)\s*(?::[^=]+)?=\s*\[/g,
  // a list joined by hand ("a, b and c"), or the platform's list formatter, which writes a serial comma
  list: /\.slice\((?:P\.)?(?:zero|0), -(?:P\.)?(?:one|1)\)\.join\(", "\)|Intl\.ListFormat/g,
  // a first letter raised by hand
  capital:
    /\.charAt\((?:P\.)?(?:zero|0)\)\.toUpperCase\(\)|\[0\]!?\.toUpperCase\(\)/g,
  // a possessive made by hand: name ending in s gets an apostrophe only
  possessive: /\.endsWith\("s"\)\s*\?\s*`\$\{[^}]+\}'`/g,
};

function sources(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "src/director", "src/english", "src/bench"],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  )
    .split("\n")
    .filter(
      (file) =>
        /\.(ts|tsx|mjs)$/.test(file) &&
        !/\.(test|spec|browser|node-test)\.(ts|tsx|mjs)$/.test(file),
    );
}

/** Per file, how many copies of each piece it builds itself. */
export function copies(
  files: string[] = sources(),
  read: (file: string) => string = (file) =>
    readFileSync(path.join(ROOT, file), "utf8"),
): Record<string, Record<string, number>> {
  const found: Record<string, Record<string, number>> = {};
  for (const file of files) {
    const text = read(file);
    for (const kind of Object.keys(PATTERNS) as Kind[]) {
      if (ALLOWED[kind].includes(file)) continue;
      const count = text.match(PATTERNS[kind])?.length ?? 0;
      if (count) (found[file] ??= {})[kind] = count;
    }
  }
  return found;
}
