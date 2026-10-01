/**
 * The audit autoscan: checks the verified audit's items against the code.
 *
 * Each rule in scripts/audit/rules.json belongs to one audit ID and is one of:
 *
 *   absent   a bad call must be gone: `pattern` matches no line of `file`
 *   present  a replacement must be called from production code: `pattern`
 *            matches a line of `file`
 *   reader   `dataFile` is read by some non-test file under src/
 *
 * A `file` ending in "/" means every non-test code file under that folder.
 * An item is done only when every one of its rules passes and its rules
 * cover the whole item (`covers: "whole"`); rules that cover part of an
 * item can at most make it partly done. Some rules passing is partly, none is
 * not started, and an item with no rules is unknown. The verified list is
 * read, never written.
 *
 * Usage:
 *   npm run audit:scan                      # table, and JSON to test-results/audit/scan.json
 *   npm run audit:scan -- --out <file>      # JSON somewhere else
 *   npm run audit:scan -- --rules <file>    # another rules file
 *   npm run audit:scan -- --only A124,A125  # some items
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { codeFiles, REPO_ROOT, researchReaders } from "./readers";

export const VERIFIED_PATH = "docs/codex/audit-verified-2026-10-01.json";
export const RULES_PATH = "scripts/audit/rules.json";
export const DEFAULT_OUT = "test-results/audit/scan.json";

export type AuditStatus = "done" | "partly" | "not-started" | "unknown";

export type AuditCheck =
  | {
      readonly kind: "absent" | "present";
      readonly file: string;
      readonly pattern: string;
      readonly why?: string;
    }
  | {
      readonly kind: "reader";
      readonly dataFile: string;
      readonly why?: string;
    };

export interface AuditRule {
  readonly covers: "whole" | "part";
  readonly checks: readonly AuditCheck[];
}

export interface AuditRules {
  readonly about?: string;
  readonly rules: Readonly<Record<string, AuditRule>>;
}

interface VerifiedItem {
  readonly id: string;
  readonly short: string;
  readonly status: string;
  readonly drift: readonly { readonly kind: string }[];
}

export interface CheckResult {
  readonly check: AuditCheck;
  readonly pass: boolean;
  /** Where a present pattern was found, or an absent one still is. */
  readonly at: readonly string[];
  readonly note?: string;
}

export interface ItemResult {
  readonly id: string;
  readonly short: string;
  readonly verified: string;
  readonly scanned: AuditStatus;
  readonly drift: readonly string[];
  readonly covers: "whole" | "part" | null;
  readonly passed: number;
  readonly checks: readonly CheckResult[];
}

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(REPO_ROOT, path), "utf8")) as T;

const textCache = new Map<string, string | null>();
function textOf(path: string): string | null {
  if (!textCache.has(path)) {
    const absolute = join(REPO_ROOT, path);
    textCache.set(
      path,
      existsSync(absolute) ? readFileSync(absolute, "utf8") : null,
    );
  }
  return textCache.get(path)!;
}

/** The files a check reads: one file, or every non-test code file in a folder. */
function filesFor(file: string): string[] {
  return file.endsWith("/") ? codeFiles([file]) : [file];
}

/** `file:line` for every line of the files that matches the pattern. */
function matches(
  file: string,
  pattern: string,
): { at: string[]; missing: boolean } {
  const regex = new RegExp(pattern);
  const at: string[] = [];
  const files = filesFor(file);
  let missing = files.length === 0;
  for (const path of files) {
    const text = textOf(path);
    if (text === null) {
      missing = true;
      continue;
    }
    text.split("\n").forEach((line, index) => {
      if (regex.test(line)) at.push(`${path}:${index + 1}`);
    });
  }
  return { at, missing };
}

export function runCheck(
  check: AuditCheck,
  readers: () => ReadonlyMap<string, readonly { file: string; line: number }[]>,
): CheckResult {
  if (check.kind === "reader") {
    const found = readers().get(check.dataFile);
    if (found === undefined)
      return { check, pass: false, at: [], note: "data file not found" };
    return {
      check,
      pass: found.length > 0,
      at: found.map((reader) => `${reader.file}:${reader.line}`),
    };
  }
  const { at, missing } = matches(check.file, check.pattern);
  if (check.kind === "present")
    return {
      check,
      pass: at.length > 0,
      at,
      ...(missing ? { note: "file not found" } : {}),
    };
  return {
    check,
    pass: at.length === 0,
    at,
    // A deleted file holds no bad call, but say so: the call may have moved.
    ...(missing ? { note: "file not found; the call may have moved" } : {}),
  };
}

export function scan(
  rules: AuditRules,
  only?: ReadonlySet<string>,
): ItemResult[] {
  const items = readJson<VerifiedItem[]>(VERIFIED_PATH);
  let readerIndex: ReadonlyMap<
    string,
    readonly { file: string; line: number }[]
  > | null = null;
  const readers = () => (readerIndex ??= researchReaders(["src"]));
  return items
    .filter((item) => !only || only.has(item.id))
    .map((item): ItemResult => {
      const rule = rules.rules[item.id];
      const checks = (rule?.checks ?? []).map((check) =>
        runCheck(check, readers),
      );
      const passed = checks.filter((result) => result.pass).length;
      const scanned: AuditStatus =
        checks.length === 0
          ? "unknown"
          : passed === checks.length
            ? rule!.covers === "whole"
              ? "done"
              : "partly"
            : passed > 0
              ? "partly"
              : "not-started";
      return {
        id: item.id,
        short: item.short,
        verified: item.status,
        scanned,
        drift: item.drift.map((entry) => entry.kind),
        covers: rule?.covers ?? null,
        passed,
        checks,
      };
    });
}

function countBy(results: readonly ItemResult[], key: "verified" | "scanned") {
  const counts: Record<string, number> = {};
  for (const result of results)
    counts[result[key]] = (counts[result[key]] ?? 0) + 1;
  return counts;
}

function table(results: readonly ItemResult[]): string {
  const rows = results.map((result) => [
    result.id,
    result.verified,
    result.scanned,
    result.checks.length ? `${result.passed}/${result.checks.length}` : "-",
    result.verified === result.scanned || result.scanned === "unknown"
      ? ""
      : "differs",
    result.short.slice(0, 60),
  ]);
  const head = ["id", "verified", "scanned", "rules", "", "item"];
  const widths = head.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column]!.length)),
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, column) => cell.padEnd(widths[column]!))
      .join("  ")
      .trimEnd();
  return [line(head), ...rows.map(line)].join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const rulesPath = value("--rules") ?? RULES_PATH;
  const out = value("--out") ?? DEFAULT_OUT;
  const onlyArg = value("--only");
  const only = onlyArg ? new Set(onlyArg.split(",")) : undefined;
  const started = Date.now();
  const results = scan(readJson<AuditRules>(rulesPath), only);
  console.log(table(results));
  const verified = countBy(results, "verified");
  const scanned = countBy(results, "scanned");
  const ruled = results.filter((result) => result.checks.length > 0);
  console.log(
    [
      "",
      `${results.length} items, ${ruled.length} with rules, scanned in ${Date.now() - started} ms.`,
      `Verified list: ${JSON.stringify(verified)}`,
      `Autoscan:      ${JSON.stringify(scanned)}`,
      `Differ from the verified list: ${ruled.filter((result) => result.verified !== result.scanned).length} of the ${ruled.length} with rules.`,
    ].join("\n"),
  );
  const absolute = resolve(REPO_ROOT, out);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(
    absolute,
    `${JSON.stringify({ verifiedFrom: VERIFIED_PATH, rules: rulesPath, counts: { verified, scanned }, items: results }, null, 2)}\n`,
  );
  console.log(`Wrote ${out}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
