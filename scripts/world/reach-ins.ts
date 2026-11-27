/**
 * Counts the reach-ins into a family's non-entry files: every import a file
 * outside the family makes of one of its files that is not an entry
 * (tests/guards/families.json). Read-only; re-run it any time:
 *
 *   node --import tsx scripts/world/reach-ins.ts [family-id] [--md]
 *
 * With no family it reads `clock-places` (places and the clock). `--md`
 * prints the table the refactor notes keep. It changes nothing; routing an
 * import through the family's entry is each consumer's own edit (World's
 * item 2 builds the doors, and the consumer switches).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { globToRegExp, familyOf } from "../../tests/guards/family-map";
import map from "../../tests/guards/families.json";

const ROOT = path.resolve(import.meta.dirname, "../..");
const family =
  process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "clock-places";
const markdown = process.argv.includes("--md");
const entry = (map.families as { id: string; entry: string[] }[])
  .find((f) => f.id === family)
  ?.entry.map(globToRegExp);
if (!entry)
  throw new Error(`No family ${family} in tests/guards/families.json`);

const files = execFileSync(
  "git",
  ["ls-files", "src/core2", "src/director", "src/english", "src/bench"],
  { cwd: ROOT, encoding: "utf8" },
)
  .split("\n")
  .filter((f) => /^src\/.*\.(ts|tsx|mjs)$/.test(f) && !/\.d\.m?ts$/.test(f));

const importsOf = (file: string, source: string): string[] =>
  [
    ...source.matchAll(
      /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["'](\.{1,2}\/[^"']+)["']/g,
    ),
  ].map((m) => {
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), m[1]!),
    );
    return /\.(ts|tsx|mjs|js|json)$/.test(target) ? target : `${target}.ts`;
  });

/** target (a non-entry file of the family) -> importing files outside it. */
const reach = new Map<string, Set<string>>();
for (const file of files) {
  const from = familyOf(file);
  if (from === family || from === "shared") continue;
  for (const target of importsOf(
    file,
    readFileSync(path.join(ROOT, file), "utf8"),
  )) {
    const to = target.replace(/\.js$/, ".ts");
    if (familyOf(to) !== family || entry.some((e) => e.test(to))) continue;
    (reach.get(to) ?? reach.set(to, new Set()).get(to)!).add(file);
  }
}
const rows = [...reach].sort(
  (a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]),
);
const total = rows.reduce((n, [, s]) => n + s.size, 0);
const test = (f: string) => /\.(test|spec|browser)\.(ts|tsx|mjs)$/.test(f);
if (markdown) {
  console.log(
    `| Non-entry file of ${family} | Importers outside it | Of them tests |`,
  );
  console.log("| --- | ---: | ---: |");
  for (const [target, set] of rows)
    console.log(
      `| \`${target}\` | ${set.size} | ${[...set].filter(test).length} |`,
    );
} else {
  for (const [target, set] of rows)
    console.log(`${set.size}\t${target}\t${[...set].sort().join(" ")}`);
}
console.error(
  `${family}: ${rows.length} non-entry files reached from outside, ${total} importing-file links (${rows.reduce((n, [, s]) => n + [...s].filter((f) => !test(f)).length, 0)} from non-test files)`,
);
