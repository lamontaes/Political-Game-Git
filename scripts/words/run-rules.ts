/**
 * Runs the owner's rules (`data/english/line-rules.json`) over every bank
 * line and writes `data/english/pulled.json`, the list the game reads.
 *
 *   npm run words:rules                      writes the list, prints the report
 *   npm run words:rules -- --report out.md   also writes the report as Markdown
 *
 * After a grading, `apply-grades.ts` then this command is the whole update:
 * the first folds the grades into the ledger, the second runs every rule
 * over every line. Run it again after any change to a bank or a rule; a
 * second run changes nothing. A development tool: no model calls, no world.
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { PartGradeLedger } from "../../src/english/english-grades";
import {
  pulledFileOf,
  runRules,
  type LineRule,
  type LineRulesFile,
  type PulledFile,
  type RulePiece,
  type RunResult,
} from "../../src/english/line-rules";

export const RULES_FILE = "data/english/line-rules.json";
export const PULLED_FILE = "data/english/pulled.json";
export const LEDGER_FILE = "data/english/part-grades.json";
export const PARTS_DIR = "data/english/parts";

/** Every bank piece, in file order. */
export function readBankPieces(dir = PARTS_DIR): RulePiece[] {
  const pieces: RulePiece[] = [];
  for (const name of readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const bank = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      parts?: {
        key: string;
        text: unknown;
        kind?: string;
        move?: string;
        uses?: Record<string, unknown>[];
      }[];
    };
    for (const part of bank.parts ?? [])
      pieces.push({
        bank: basename(name, ".json"),
        key: part.key,
        text:
          typeof part.text === "string" ? part.text : JSON.stringify(part.text),
        kind: part.kind ?? "",
        move: part.move ?? "",
        uses: part.uses ?? [],
      });
  }
  return pieces;
}

export function readRules(file = RULES_FILE): LineRule[] {
  return (
    JSON.parse(readFileSync(file, "utf8")) as LineRulesFile
  ).rules.slice();
}

export function readLedger(file = LEDGER_FILE): PartGradeLedger {
  return JSON.parse(readFileSync(file, "utf8")) as PartGradeLedger;
}

/** A fresh run over the files on disk. */
export function freshRun(): {
  readonly result: RunResult;
  readonly pulledFile: PulledFile;
  readonly rules: LineRule[];
  readonly pieces: RulePiece[];
} {
  const rules = readRules();
  const pieces = readBankPieces();
  const result = runRules(rules, pieces, readLedger());
  return { result, pulledFile: pulledFileOf(result), rules, pieces };
}

const short = (text: string, max = 80) =>
  text.length > max ? `${text.slice(0, max - 1)}...` : text;

/** The report: each rule, what it said, what it pulled, then the totals and conflicts. */
export function reportOf(
  rules: readonly LineRule[],
  pieces: readonly RulePiece[],
  result: RunResult,
): string {
  const text = new Map(pieces.map((piece) => [piece.key, piece.text]));
  const lines: string[] = ["# Rules run", ""];
  for (const rule of rules) {
    const row = result.perRule[rule.id]!;
    lines.push(
      `## ${rule.id} (${rule.status}, ${rule.test.kind})`,
      "",
      rule.says,
      "",
      `Notes behind it: ${rule.from.length}${rule.research ? `, research ${rule.research.length}` : ""}. ` +
        `Lines it flags: ${row.flagged}. Pulled: ${row.pulled}. Waiting: ${row.waiting}.`,
    );
    if (row.examples.length)
      lines.push(
        "",
        ...row.examples.map((key) => `- ${key}: ${short(text.get(key) ?? "")}`),
      );
    lines.push("");
  }
  const t = result.totals;
  lines.push(
    "## Totals",
    "",
    `- Pieces: ${t.pieces}. Held by the grades before the run: ${t.heldByGrades}.`,
    `- Playable before the rules: ${t.playableBefore}. After: ${t.playableAfter}.`,
    `- Pulled: ${t.pulled}. Waiting for a rewrite: ${t.waiting}. Flagged by a sample rule: ${t.sample}.`,
    `- Spots: ${t.spots}. Spots with one line: ${t.spotsWithOneLine}. Spots left with only waiting lines: ${t.spotsLeftWithOnlyWaiting}. Spots made silent: ${t.spotsMadeSilent}.`,
    "",
    "## Conflicts (an enforced rule flags a line he graded good)",
    "",
    ...(result.conflicts.length
      ? result.conflicts.map(
          (row) =>
            `- ${row.rule} flags ${row.key}: ${short(text.get(row.key) ?? "")}`,
        )
      : ["None."]),
    "",
  );
  return lines.join("\n");
}

function main() {
  const { result, pulledFile, rules, pieces } = freshRun();
  writeFileSync(PULLED_FILE, `${JSON.stringify(pulledFile, null, 2)}\n`);
  execSync(`npx prettier --write ${PULLED_FILE}`, { stdio: "ignore" });
  const report = reportOf(rules, pieces, result);
  console.log(report);
  const at = process.argv.indexOf("--report");
  if (at >= 0 && process.argv[at + 1]) {
    writeFileSync(process.argv[at + 1]!, report);
    console.log(`Wrote ${process.argv[at + 1]}.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
