/**
 * Which files outside an engine import its files past its front door (People
 * items 6 and 7, the dry run).
 *
 *   node --import tsx scripts/people/doors.ts people
 *   node --import tsx scripts/people/doors.ts housing
 *
 * `people` is the family in tests/guards/families.json. `housing` is the
 * market the audit names for its own engine: the housing-*.ts files,
 * hud-rents.ts, modules/housing.ts and modules/homeless-count.ts. For each
 * game file outside the set it lists the set's files it imports, whether each
 * is an entry (a door), and counts by target and by importing family. It
 * changes nothing; the rewrite that points callers at the doors is a later,
 * separate script, once the doors exist.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const which = process.argv[2] ?? "people";
const families = JSON.parse(
  readFileSync("tests/guards/families.json", "utf8"),
) as {
  families: { id: string; entry: string[]; paths: string[] }[];
};

const globToRegExp = (glob: string): RegExp =>
  new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "@@STAR@@")
      .replace(/\*/g, "[^/]*")
      .replace(/@@STAR@@/g, ".*")}$`,
  );

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name))
      out.push(path);
  }
  return out;
};
const files = walk("src");

const familyOf = (file: string): string => {
  for (const family of families.families)
    if (family.paths.some((glob) => globToRegExp(glob).test(file)))
      return family.id;
  return "(none)";
};

let inSet: (file: string) => boolean;
let entries: Set<string>;
if (which === "housing") {
  const set = [
    /^src\/core2\/housing-[^/]*\.ts$/,
    /^src\/core2\/hud-rents\.ts$/,
    /^src\/core2\/modules\/housing\.ts$/,
    /^src\/core2\/modules\/homeless-count\.ts$/,
  ];
  inSet = (file) => set.some((re) => re.test(file));
  entries = new Set([
    "src/core2/modules/housing.ts",
    "src/core2/modules/homeless-count.ts",
  ]);
} else {
  const family = families.families.find((row) => row.id === which);
  if (!family) throw new Error(`no family ${which}`);
  const patterns = family.paths.map(globToRegExp);
  inSet = (file) => patterns.some((re) => re.test(file));
  entries = new Set(family.entry);
}

const resolve = (from: string, spec: string): string | undefined => {
  if (!spec.startsWith(".")) return undefined;
  const base = normalize(join(dirname(from), spec));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")])
    if (files.includes(candidate)) return candidate;
  return undefined;
};

const IMPORT = /(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g;
const byTarget = new Map<string, Set<string>>();
const byFamily = new Map<string, number>();
let total = 0;
for (const file of files) {
  if (inSet(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(IMPORT)) {
    const target = resolve(file, match[1]!);
    if (!target || !inSet(target) || entries.has(target)) continue;
    total += 1;
    (byTarget.get(target) ?? byTarget.set(target, new Set()).get(target)!).add(
      file,
    );
    const family = familyOf(file);
    byFamily.set(family, (byFamily.get(family) ?? 0) + 1);
  }
}
console.log(
  `${which}: ${total} imports from ${
    new Set([...byTarget.values()].flatMap((s) => [...s])).size
  } files outside the set reach ${byTarget.size} non-entry files in it`,
);
console.log("by importing family:");
for (const [family, count] of [...byFamily].sort((a, b) => b[1] - a[1]))
  console.log(`  ${count}  ${family}`);
console.log("most reached:");
for (const [target, from] of [...byTarget]
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 20))
  console.log(`  ${from.size}  ${target}`);
