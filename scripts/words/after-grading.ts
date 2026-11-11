/**
 * One command after a grading (owner, Oct 23: "every time I update a batch
 * or something, it should update through the entire game").
 *
 *   npm run words:grade
 *
 * Runs, in the order the words-engine skill gives, each as its own process:
 *   1. apply-grades: folds every grade file into data/english/part-grades.json.
 *   2. run-rules: runs every rule over every line, writes
 *      data/english/pulled.json and a Markdown report.
 * Stops at the first failing step and names it. At the end prints the
 * report's path and its Totals lines. A second run changes nothing. A
 * development tool: no model calls, no world.
 *
 * The pair loop (`words:pairs`, `words:verdicts`) needs a judge session and is
 * not part of this order.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface GradeStep {
  readonly name: string;
  readonly args: readonly string[];
}

export function gradeSteps(reportPath: string): readonly GradeStep[] {
  return [
    {
      name: "apply-grades",
      args: ["scripts/dialogue-batch/apply-grades.ts"],
    },
    {
      name: "run-rules",
      args: ["scripts/words/run-rules.ts", "--report", reportPath],
    },
  ];
}

export function totalsOf(report: string): string[] {
  const from = report.indexOf("## Totals");
  if (from < 0) return [];
  const rest = report.slice(from).split("\n");
  const end = rest.findIndex((line, i) => i > 0 && line.startsWith("## "));
  return rest
    .slice(0, end < 0 ? rest.length : end)
    .filter((line) => line.startsWith("- "));
}

function main(): number {
  const reportPath = join(
    mkdtempSync(join(tmpdir(), "words-grade-")),
    "report.md",
  );
  for (const step of gradeSteps(reportPath)) {
    process.stdout.write(`words:grade step ${step.name}\n`);
    const done = spawnSync(
      process.execPath,
      ["--import", "tsx", ...step.args],
      { stdio: ["ignore", "ignore", "inherit"], encoding: "utf8" },
    );
    if (done.status !== 0) {
      process.stderr.write(
        `words:grade stopped: step ${step.name} failed (exit ${done.status}).\n`,
      );
      return done.status ?? 1;
    }
  }
  process.stdout.write(`Report: ${reportPath}\n`);
  process.stdout.write(
    `${totalsOf(readFileSync(reportPath, "utf8")).join("\n")}\n`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
