/* global console, process */
/**
 * Adds up the heavy set's test times: reads every vitest JSON report in a
 * folder (one a shard) and prints, as a Markdown table, the whole run's time,
 * each shard's time, the files that failed and the slowest files.
 *
 *   node scripts/heavy/suite-times.mjs <folder> [--top 40]
 *
 * A file's time is the wall time between its start and its end in its own
 * worker, so the sum is worker time, not the run's wall time.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** One row per test file from vitest's JSON reports. */
export function fileTimes(reports) {
  const rows = [];
  for (const { name, report } of reports)
    for (const file of report.testResults ?? []) {
      const tests = file.assertionResults ?? [];
      rows.push({
        shard: name,
        file: path.relative(process.cwd(), file.name).split(path.sep).join("/"),
        seconds: Math.max(0, (file.endTime - file.startTime) / 1000),
        tests: tests.length,
        failed: tests.filter((t) => t.status === "failed").length,
        status: file.status,
      });
    }
  return rows;
}

const minutes = (seconds) => (seconds / 60).toFixed(1);

/** The summary as Markdown lines. */
export function summary(rows, top = 40) {
  const lines = [];
  const total = rows.reduce((sum, row) => sum + row.seconds, 0);
  lines.push(
    `### Full suite: ${rows.length} test files, ${minutes(total)} worker minutes`,
    "",
  );
  const shards = new Map();
  for (const row of rows)
    shards.set(row.shard, (shards.get(row.shard) ?? 0) + row.seconds);
  lines.push("| Shard | Worker minutes |", "| --- | --- |");
  for (const [shard, seconds] of [...shards].sort(([a], [b]) =>
    a.localeCompare(b, "en", { numeric: true }),
  ))
    lines.push(`| ${shard} | ${minutes(seconds)} |`);
  const red = rows.filter((row) => row.failed > 0 || row.status === "failed");
  lines.push("", `**${red.length} file(s) failed.**`, "");
  for (const row of red)
    lines.push(`- \`${row.file}\` (${row.failed} of ${row.tests} cases)`);
  lines.push("", "| Seconds | Cases | File |", "| --- | --- | --- |");
  for (const row of [...rows]
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, top))
    lines.push(
      `| ${row.seconds.toFixed(0)} | ${row.tests} | \`${row.file}\` |`,
    );
  return lines;
}

function main() {
  const [folder, ...rest] = process.argv.slice(2);
  const topAt = rest.indexOf("--top");
  const top = topAt >= 0 ? Number(rest[topAt + 1]) : 40;
  const reports = readdirSync(folder)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      name: name.replace(/\.json$/, ""),
      report: JSON.parse(readFileSync(path.join(folder, name), "utf8")),
    }));
  for (const line of summary(fileTimes(reports), top)) console.log(line);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
