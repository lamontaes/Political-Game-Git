/**
 * The audit autoscan: checks the verified audit's items against the code,
 * engine by engine, in the order the engine doc gives them.
 *
 * Each rule in scripts/audit/rules.json belongs to one audit ID and is a list
 * of checks, each one of:
 *
 *   absent   a bad call must be gone: `pattern` matches no line of `file`
 *   present  a replacement must be called from production code: `pattern`
 *            matches a line of `file`
 *   reader   `dataFile` is read by some non-test file under src/
 *   test     the test that proves a behavioral item exists on main: `file`
 *            exists and, when given, `pattern` matches its title line or
 *            `assertion` identifies an actual expect call, regardless of formatting
 *
 * A `file` ending in "/" means every non-test code file under that folder.
 * Patterns are tested line by line with comments blanked out, so a name in a
 * doc comment neither keeps a bad call alive nor proves a replacement.
 *
 * An item is done only when every check passes and its rules cover the whole
 * item (`covers: "whole"`); rules that cover part of an item can at most make
 * it partly done. Some checks passing is partly, none is not started. An item
 * with no rules is unknown, and so is one whose proving test is not on main
 * yet while its code checks (if any) all pass; otherwise its code checks say.
 *
 * Engine, sequence, owner and "after" come from the verified JSON; the engine
 * order and each engine's squads come from the engine doc. An item's "after"
 * steps are the audit IDs its `after` field names, and they are done when each
 * of those items scans done. The verified list and the engine doc are read,
 * never written.
 *
 * Usage:
 *   npm run audit:scan                         # per-engine table; writes scripts/audit/scan-result.json
 *   npm run audit:scan -- --out <file>         # the JSON somewhere else
 *   npm run audit:scan -- --rules <file>       # another rules file
 *   npm run audit:scan -- --only A124,A125     # some items
 *   npm run audit:scan -- --changed a.ts,b.ts  # which audit items these changed files move
 *   npm run audit:scan -- --changed-range <base>..<head>   # the same, from git
 *     add --claimed "<pull request title>" to check the audit IDs it names,
 *     and --markdown for a check summary
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "prettier";
import ts from "typescript";
import {
  codeFiles,
  REPO_ROOT,
  researchReaders,
  withoutComments,
} from "./readers";

export const VERIFIED_PATH = "docs/codex/audit-verified-2026-10-01.json";
export const ENGINE_DOC_PATH = "docs/codex/audit-by-engine-2026-10-01.md";
export const RULES_PATH = "scripts/audit/rules.json";
export const DEFAULT_OUT = "scripts/audit/scan-result.json";

export type AuditStatus = "done" | "partly" | "not-started" | "unknown";

export interface AuditAssertion {
  readonly received: string;
  readonly matcher: "toContain";
  readonly value: string;
}

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
    }
  | {
      readonly kind: "test";
      readonly file: string;
      readonly pattern?: string;
      readonly assertion?: AuditAssertion;
      readonly why?: string;
    };

export interface AuditRule {
  readonly covers: "whole" | "part";
  readonly checks: readonly AuditCheck[];
  readonly note?: string;
}

export interface AuditRules {
  readonly about?: string;
  readonly rules: Readonly<Record<string, AuditRule>>;
}

export interface VerifiedItem {
  readonly id: string;
  readonly short: string;
  readonly status: string;
  readonly engine: string;
  readonly seq: number;
  readonly owner: string;
  readonly after: string;
  readonly evidence: readonly string[];
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
  readonly seq: number;
  readonly short: string;
  readonly owner: string;
  readonly verified: string;
  readonly scanned: AuditStatus;
  /** Why an item with rules is still unknown. */
  readonly unknownBecause?: string;
  readonly after: string;
  readonly afterSteps: readonly {
    readonly id: string;
    readonly scanned: AuditStatus;
  }[];
  /** True when every audit item named in `after` scans done; null when it names none. */
  readonly afterDone: boolean | null;
  readonly drift: readonly string[];
  readonly covers: "whole" | "part" | null;
  readonly passed: number;
  readonly checks: readonly CheckResult[];
}

export interface EngineResult {
  readonly engine: string;
  readonly squads: string;
  /** In the engine doc's order: numbered steps, then the section's done items. */
  readonly items: readonly (ItemResult & { readonly step: string })[];
}

export interface ScanResult {
  readonly verifiedFrom: string;
  readonly engineDoc: string;
  readonly rules: string;
  readonly coverage: { readonly withRules: number; readonly total: number };
  readonly counts: {
    readonly verified: Readonly<Record<string, number>>;
    readonly scanned: Readonly<Record<string, number>>;
  };
  /** Engines and items in the engine doc's order, or what differs from it. */
  readonly orderMatchesEngineDoc: boolean;
  readonly orderMismatches: readonly string[];
  readonly engines: readonly EngineResult[];
}

const readText = (path: string): string =>
  readFileSync(resolve(REPO_ROOT, path), "utf8");
const readJson = <T>(path: string): T => JSON.parse(readText(path)) as T;

const textCache = new Map<string, string | null>();
function textOf(path: string): string | null {
  if (!textCache.has(path)) {
    const absolute = join(REPO_ROOT, path);
    textCache.set(
      path,
      // Comments are blanked: a name in a doc comment is not a live call.
      existsSync(absolute)
        ? withoutComments(readFileSync(absolute, "utf8"))
        : null,
    );
  }
  return textCache.get(path)!;
}

/** The files a check reads: one file, or every non-test code file in a folder. */
const folderCache = new Map<string, string[]>();
function filesFor(file: string): string[] {
  if (!file.endsWith("/")) return [file];
  if (!folderCache.has(file)) folderCache.set(file, codeFiles([file]));
  return folderCache.get(file)!;
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

/** Exact assertion calls, rather than text that merely names an assertion. */
export function assertedLiteralLines(
  file: string,
  text: string,
  assertion: AuditAssertion,
): number[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const lines: number[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === assertion.matcher &&
      ts.isCallExpression(node.expression.expression)
    ) {
      const received = node.expression.expression;
      const value = node.arguments[0];
      if (
        ts.isIdentifier(received.expression) &&
        received.expression.text === "expect" &&
        received.arguments.length === 1 &&
        ts.isIdentifier(received.arguments[0]!) &&
        received.arguments[0]!.text === assertion.received &&
        node.arguments.length === 1 &&
        value &&
        ts.isStringLiteral(value) &&
        value.text === assertion.value
      )
        lines.push(
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return lines;
}

type ReaderIndex = ReadonlyMap<
  string,
  readonly { file: string; line: number }[]
>;

export function runCheck(
  check: AuditCheck,
  readers: () => ReaderIndex,
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
  if (check.kind === "test") {
    if (textOf(check.file) === null)
      return { check, pass: false, at: [], note: "test not on main yet" };
    if (check.assertion) {
      const at = assertedLiteralLines(
        check.file,
        textOf(check.file)!,
        check.assertion,
      ).map((line) => `${check.file}:${line}`);
      return {
        check,
        pass: at.length > 0,
        at,
        ...(at.length ? {} : { note: "required assertion not found" }),
      };
    }
    if (!check.pattern) return { check, pass: true, at: [check.file] };
    const { at } = matches(check.file, check.pattern);
    return {
      check,
      pass: at.length > 0,
      at,
      ...(at.length ? {} : { note: "test not on main yet" }),
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

function statusOf(
  rule: AuditRule | undefined,
  checks: readonly CheckResult[],
): { scanned: AuditStatus; unknownBecause?: string } {
  if (checks.length === 0) return { scanned: "unknown" };
  const testMissing = checks.some(
    (result) => result.check.kind === "test" && !result.pass,
  );
  const code = checks.filter((result) => result.check.kind !== "test");
  const codePassed = code.filter((result) => result.pass).length;
  // A missing proving test leaves the item unknown only when the code checks
  // can't say otherwise: there are none, or all of them already pass.
  if (testMissing && codePassed === code.length)
    return {
      scanned: "unknown",
      unknownBecause: "its proving test is not on main yet",
    };
  if (testMissing)
    return { scanned: codePassed > 0 ? "partly" : "not-started" };
  const passed = checks.filter((result) => result.pass).length;
  if (passed === checks.length)
    return { scanned: rule!.covers === "whole" ? "done" : "partly" };
  return { scanned: passed > 0 ? "partly" : "not-started" };
}

/**
 * Engine sections of the engine doc, in order: each engine's squads, its open
 * items as numbered steps, and its done items from the section's "Done:" line.
 */
export function engineDocOrder(): {
  engine: string;
  squads: string;
  steps: string[];
  done: string[];
}[] {
  const sections: {
    engine: string;
    squads: string;
    steps: string[];
    done: string[];
  }[] = [];
  for (const line of readText(ENGINE_DOC_PATH).split("\n")) {
    const heading = /^## (.+?) — (.+)$/.exec(line);
    if (heading) {
      sections.push({
        engine: heading[1]!,
        squads: heading[2]!,
        steps: [],
        done: [],
      });
      continue;
    }
    const section = sections.at(-1);
    if (!section) continue;
    const step = /^\d+\. \*\*(A\d+)\*\*/.exec(line);
    if (step) section.steps.push(step[1]!);
    else if (line.startsWith("Done:")) section.done.push(...auditIdsIn(line));
  }
  return sections;
}

export function auditIdsIn(text: string): string[] {
  return [...new Set(text.match(/\bA\d+\b/g) ?? [])];
}

export function scan(
  rules: AuditRules,
  only?: ReadonlySet<string>,
): ScanResult {
  const items = readJson<VerifiedItem[]>(VERIFIED_PATH);
  let readerIndex: ReaderIndex | null = null;
  const readers = () => (readerIndex ??= researchReaders(["src"]));

  // Status first, so "after" can read the status of the steps it names.
  const base = new Map(
    items.map((item) => {
      const rule = rules.rules[item.id];
      const checks = (rule?.checks ?? []).map((check) =>
        runCheck(check, readers),
      );
      return [item.id, { item, rule, checks, ...statusOf(rule, checks) }];
    }),
  );
  const results = new Map<string, ItemResult>();
  for (const { item, rule, checks, scanned, unknownBecause } of base.values()) {
    const afterSteps = auditIdsIn(item.after ?? "")
      .filter((id) => id !== item.id && base.has(id))
      .map((id) => ({ id, scanned: base.get(id)!.scanned }));
    results.set(item.id, {
      id: item.id,
      seq: item.seq,
      short: item.short,
      owner: item.owner,
      verified: item.status,
      scanned,
      ...(unknownBecause ? { unknownBecause } : {}),
      after: item.after ?? "",
      afterSteps,
      afterDone: afterSteps.length
        ? afterSteps.every((step) => step.scanned === "done")
        : null,
      drift: item.drift.map((entry) => entry.kind),
      covers: rule?.covers ?? null,
      passed: checks.filter((result) => result.pass).length,
      checks,
    });
  }

  const doc = engineDocOrder();
  const mismatches: string[] = [];
  for (const name of new Set(items.map((item) => item.engine)))
    if (!doc.some((section) => section.engine === name))
      mismatches.push(`engine "${name}" has no section in the engine doc`);
  const engines: EngineResult[] = doc.map((section) => {
    const inJson = items
      .filter((item) => item.engine === section.engine)
      .sort((a, b) => a.seq - b.seq)
      .map((item) => item.id);
    const listed = [...section.steps, ...section.done];
    const missing = inJson.filter((id) => !listed.includes(id));
    const extra = listed.filter((id) => !inJson.includes(id));
    if (
      missing.length ||
      extra.length ||
      new Set(listed).size !== listed.length
    )
      mismatches.push(
        `${section.engine}: the doc lists ${listed.length} items, the JSON ${inJson.length}${missing.length ? `; not in the doc: ${missing.join(", ")}` : ""}${extra.length ? `; not in the JSON: ${extra.join(", ")}` : ""}`,
      );
    // The numbered steps keep the JSON's sequence among themselves.
    const stepsBySeq = inJson.filter((id) => section.steps.includes(id));
    if (stepsBySeq.join(",") !== section.steps.join(","))
      mismatches.push(
        `${section.engine}: the doc's step order (${section.steps.join(", ")}) differs from the JSON's sequence (${stepsBySeq.join(", ")})`,
      );
    return {
      engine: section.engine,
      squads: section.squads,
      items: listed
        .filter((id) => results.has(id) && (!only || only.has(id)))
        .map((id) => ({
          ...results.get(id)!,
          step: section.steps.includes(id)
            ? String(section.steps.indexOf(id) + 1)
            : "done",
        })),
    };
  });

  const shown = engines.flatMap((engine) => engine.items);
  const countBy = (key: "verified" | "scanned") => {
    const counts: Record<string, number> = {};
    for (const result of shown)
      counts[result[key]] = (counts[result[key]] ?? 0) + 1;
    return counts;
  };
  return {
    verifiedFrom: VERIFIED_PATH,
    engineDoc: ENGINE_DOC_PATH,
    rules: RULES_PATH,
    coverage: {
      withRules: shown.filter((result) => result.checks.length > 0).length,
      total: shown.length,
    },
    counts: { verified: countBy("verified"), scanned: countBy("scanned") },
    orderMatchesEngineDoc: mismatches.length === 0,
    orderMismatches: mismatches,
    engines,
  };
}

function afterText(result: ItemResult): string {
  if (!result.after) return "";
  if (!result.afterSteps.length) return result.after;
  const steps = result.afterSteps
    .map((step) => `${step.id} ${step.scanned}`)
    .join(", ");
  return `${result.afterDone ? "ready" : "waits"}: ${steps}`;
}

function table(rows: readonly (readonly string[])[], head: readonly string[]) {
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

export function report(result: ScanResult): string {
  const out: string[] = [];
  for (const engine of result.engines) {
    if (!engine.items.length) continue;
    out.push("", `## ${engine.engine} — ${engine.squads}`, "");
    out.push(
      table(
        engine.items.map((item) => [
          item.step,
          item.id,
          item.verified,
          item.scanned,
          item.checks.length ? `${item.passed}/${item.checks.length}` : "-",
          item.owner,
          afterText(item),
          item.short.slice(0, 50),
        ]),
        ["#", "id", "verified", "scanned", "rules", "owner", "after", "item"],
      ),
    );
  }
  const ruled = result.engines
    .flatMap((engine) => engine.items)
    .filter((item) => item.checks.length > 0);
  out.push(
    "",
    `${result.coverage.total} items, ${result.coverage.withRules} with rules.`,
    `Verified list: ${JSON.stringify(result.counts.verified)}`,
    `Autoscan:      ${JSON.stringify(result.counts.scanned)}`,
    `Differ from the verified list: ${ruled.filter((item) => item.verified !== item.scanned).length} of the ${ruled.length} with rules.`,
    result.orderMatchesEngineDoc
      ? "Engine and item order match the engine doc."
      : `Order differs from the engine doc:\n${result.orderMismatches.join("\n")}`,
  );
  return out.join("\n");
}

/** Every repository path an evidence line names, by path or by `file.ts:line`. */
function citesFile(evidence: string, file: string): boolean {
  if (evidence.includes(file)) return true;
  const parts = file.split("/");
  // The last two segments (`press/finding-consequences.ts`) name it plainly.
  if (parts.length >= 2 && evidence.includes(parts.slice(-2).join("/")))
    return true;
  // A bare file name with a line number, unless the name is too common.
  const name = parts.at(-1)!;
  if (/^(?:index|types|month|rules|queries)\.[cm]?[jt]sx?$/.test(name))
    return false;
  return new RegExp(
    `(?:^|[^\\w/.-])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\d`,
  ).test(evidence);
}

export interface ChangedItem {
  readonly id: string;
  readonly engine: string;
  readonly seq: number;
  readonly owner: string;
  readonly scanned: AuditStatus;
  readonly short: string;
  /** Each changed file and how it reaches the item: a rule check or the evidence. */
  readonly via: readonly string[];
}

/** The audit items a set of changed files moves, by rule and by evidence. */
export function changedItems(
  result: ScanResult,
  changedFiles: readonly string[],
  /** The lines a range added or removed, per file; without it, the file's text now. */
  changedLines?: ReadonlyMap<string, readonly string[]>,
): ChangedItem[] {
  const items = readJson<VerifiedItem[]>(VERIFIED_PATH);
  const byId = new Map(
    result.engines.flatMap((engine) =>
      engine.items.map((item) => [item.id, { engine: engine.engine, item }]),
    ),
  );
  const files = changedFiles
    .map((file) => file.trim())
    .filter(Boolean)
    .map((file) => posix.normalize(file));
  const out: ChangedItem[] = [];
  for (const item of items) {
    const scanned = byId.get(item.id);
    if (!scanned) continue;
    const via: string[] = [];
    for (const file of files) {
      const ruled = scanned.item.checks.some(({ check }) => {
        if (check.kind === "reader") return check.dataFile === file;
        if (check.file === file) return true;
        if (!check.file.endsWith("/") || !file.startsWith(check.file))
          return false;
        // A folder rule counts only where the change touches its pattern.
        if (check.kind === "test" && !check.pattern) return true;
        const regex = new RegExp(check.pattern!);
        const lines =
          changedLines?.get(file) ?? (textOf(file) ?? "").split("\n");
        return lines.some((line) => regex.test(line));
      });
      if (ruled) via.push(`${file} (rule)`);
      else if (item.evidence.some((line) => citesFile(line, file)))
        via.push(`${file} (evidence)`);
    }
    if (via.length)
      out.push({
        id: item.id,
        engine: item.engine,
        seq: item.seq,
        owner: item.owner,
        scanned: scanned.item.scanned,
        short: item.short,
        via,
      });
  }
  return out;
}

/** The changed-files result as a check summary, in Markdown. */
export function changedMarkdown(
  moved: readonly ChangedItem[],
  claimed: readonly string[],
  changedCount: number,
): string {
  const cell = (text: string) => text.replace(/\|/g, "\\|");
  const out = [
    "### Audit items this pull request moves",
    "",
    `${changedCount} changed files move ${moved.length} audit ${moved.length === 1 ? "item" : "items"}.`,
    "",
  ];
  if (moved.length) {
    out.push(
      "| Item | Engine, step | Status on this head | Owner | Moved by |",
      "| --- | --- | --- | --- | --- |",
      ...moved.map(
        (item) =>
          `| ${item.id} | ${cell(item.engine)} #${item.seq} | ${item.scanned} | ${cell(item.owner)} | ${cell(item.via.join("; "))} |`,
      ),
      "",
    );
  }
  if (claimed.length) {
    const ids = new Set(moved.map((item) => item.id));
    out.push(
      "Audit IDs claimed in the title:",
      "",
      ...claimed.map((id) =>
        ids.has(id)
          ? `- ${id}: moved by these files.`
          : `- ${id}: no rule or evidence of ${id} names these files.`,
      ),
      "",
    );
  } else {
    out.push("The title claims no audit ID.", "");
  }
  return out.join("\n");
}

/** Lines a git range added or removed, per file, with comments left in. */
function changedLinesIn(range: string): Map<string, string[]> {
  const diff = execFileSync("git", ["diff", "-U0", range], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const lines = new Map<string, string[]>();
  let file: string | null = null;
  for (const line of diff.split("\n")) {
    const header = /^\+\+\+ b\/(.+)$/.exec(line) ?? /^--- a\/(.+)$/.exec(line);
    if (header) {
      file = header[1]!;
      if (!lines.has(file)) lines.set(file, []);
      continue;
    }
    if (file && /^[+-]/.test(line) && !/^(?:\+\+\+|---) /.test(line))
      lines.get(file)!.push(line.slice(1));
  }
  return lines;
}

async function main(): Promise<void> {
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
  const result = {
    ...scan(readJson<AuditRules>(rulesPath), only),
    rules: rulesPath,
  };

  const changedArg = value("--changed");
  const range = value("--changed-range");
  if (changedArg !== undefined || range !== undefined) {
    const files = range
      ? execFileSync("git", ["diff", "--name-only", range], {
          cwd: REPO_ROOT,
          encoding: "utf8",
        }).split("\n")
      : changedArg!.split(",");
    const moved = changedItems(
      result,
      files,
      range ? changedLinesIn(range) : undefined,
    );
    const claimed = auditIdsIn(value("--claimed") ?? "");
    const movedIds = new Set(moved.map((item) => item.id));
    const changedCount = files.filter((file) => file.trim()).length;
    if (args.includes("--markdown")) {
      console.log(changedMarkdown(moved, claimed, changedCount));
      return;
    }
    console.log(
      moved.length
        ? table(
            moved.map((item) => [
              item.id,
              `${item.engine} #${item.seq}`,
              item.scanned,
              item.owner,
              item.via.join("; "),
            ]),
            ["id", "engine", "scanned", "owner", "moved by"],
          )
        : "No audit item names these files.",
    );
    for (const id of claimed)
      console.log(
        movedIds.has(id)
          ? `Claimed ${id}: moved by these files.`
          : `Claimed ${id}: no rule or evidence of ${id} names these files.`,
      );
    console.log(
      `\n${changedCount} changed files move ${moved.length} audit items (${Date.now() - started} ms).`,
    );
    return;
  }

  console.log(report(result));
  console.log(`Scanned in ${Date.now() - started} ms.`);
  const absolute = resolve(REPO_ROOT, out);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(
    absolute,
    await format(JSON.stringify(result), { parser: "json" }),
  );
  console.log(`Wrote ${out}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
