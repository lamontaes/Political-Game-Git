import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The hosted unit suite runs as N vitest shards on separate runners, the way
 * the browser suite does. Sharding is only a gate if every test file lands in
 * exactly one shard, so each shard records the files vitest gave it and this
 * step, run once with the whole suite's own file list, refuses a run whose
 * shards do not partition that list.
 *
 *   assert-unit-shard-union.ts <baseline file list> <directory of shard lists>
 *
 * Both lists come from `vitest list --filesOnly`, one path per line.
 */
const [baselinePath, shardsDirectory] = process.argv.slice(2);
if (!baselinePath || !shardsDirectory) {
  throw new Error(
    "usage: assert-unit-shard-union.ts <baseline-list> <shard-lists-dir>",
  );
}

const readList = (path: string): string[] =>
  readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const baseline = new Set(readList(baselinePath));
const shardFiles: string[] = [];
const walk = (directory: string) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (entry.endsWith(".json")) shardFiles.push(path);
  }
};
walk(shardsDirectory);
if (shardFiles.length === 0) throw new Error("No shard file lists were found.");

const root = `${process.cwd()}/`;
const seen = new Map<string, number>();
for (const file of shardFiles) {
  const report = JSON.parse(readFileSync(file, "utf8")) as {
    testResults?: { name: string }[];
  };
  if (!report.testResults) throw new Error(`${file} is not a vitest report`);
  for (const { name } of report.testResults) {
    const test = name.startsWith(root) ? name.slice(root.length) : name;
    seen.set(test, (seen.get(test) ?? 0) + 1);
  }
}
const missing = [...baseline].filter((test) => !seen.has(test));
const extra = [...seen.keys()].filter((test) => !baseline.has(test));
const duplicated = [...seen].filter(([, count]) => count > 1).map(([t]) => t);

for (const test of missing) console.error(`missing from every shard: ${test}`);
for (const test of extra) console.error(`not in the baseline suite: ${test}`);
for (const test of duplicated) console.error(`in more than one shard: ${test}`);
console.log(
  `unit shard union: ${baseline.size} baseline files, ${shardFiles.length} shards, ${seen.size} files seen, ${missing.length} missing, ${extra.length} extra, ${duplicated.length} duplicated.`,
);
process.exitCode =
  missing.length === 0 && extra.length === 0 && duplicated.length === 0 ? 0 : 1;
