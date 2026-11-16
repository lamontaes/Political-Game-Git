/**
 * The register of every player-facing line (owner, Nov 16: "every single line
 * of dialogue or narration or whatever in the code has to be traced so easily,
 * there can be no leftovers because it's all registered").
 *
 * It is computed, never typed: three readers over what is already there, so
 * there is no second list to drift.
 *  - Bank lines: every piece in `data/english/parts/*.json`, with its bank,
 *    move, the tie it declares (facts, a slot filled from a record, or none),
 *    whether the grades or a rule hold it, and whether an engine can reach it.
 *  - Code lines: sentence-shaped string literals in the player-text folders
 *    (`src/bench`, `src/director`, `src/english`), the words that never went
 *    through a bank.
 *  - Data-held lines: sentence-shaped strings in the json data files beside
 *    that code (screen labels, situation text) that are not in a bank.
 * A guard (`tests/guards/english/line-register.test.ts`) lets none of the
 * three grow beyond its baseline, so what the register lists only shrinks.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CONVERSATION_BANK,
  MINED_CONVERSATION,
} from "../../src/english/mined/conversation-bank";
import { composedConversationBank } from "../../src/english/conversation-words";
import { playable } from "../../src/english/bank-parts";

export const ROOT = path.resolve(import.meta.dirname, "../..");
const PARTS_DIR = path.join(ROOT, "data/english/parts");
/** The folders whose strings a player can read. */
export const SOURCE_DIRS = ["src/bench", "src/director", "src/english"];

export function walk(dir: string, keep: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, keep);
    return keep(full) ? [full] : [];
  });
}

export const relative = (file: string) =>
  path.relative(ROOT, file).split(path.sep).join("/");

/** Developer-only files: the bench's checks and traces, the director's tools. */
export const DEVELOPER_FILE =
  /(?:^|\/)(?:[\w-]+-check|dev-[\w-]+|tooling\/[\w/-]+)\.(?:tsx?|mjs)$/;

/** A literal that is an error, a log line or a test message, not player text. */
const DEVELOPER_CALL =
  /(?:\b(?:Error|console\.\w+|assert\w*|fail|gap|log|warn)\([^;(){}]*|estimatedFrom:\s*)$/;

/** String and template literals a player could read, comments skipped. */
export function literals(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  return [...code.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)]
    .filter(
      (match) =>
        !DEVELOPER_CALL.test(
          code.slice(Math.max(0, match.index - 120), match.index),
        ),
    )
    .map((match) => match[1] ?? match[2] ?? "");
}

/** Keys a data file keeps its provenance and notes under, which the player never reads. */
export const RECORD_KEY =
  /^(?:source|sources|citation|cites|retrieved|accessed|date|at|note|notes|provenance|evidence|description|estimatedFrom|reason|id|key|kind|type|name|label|title|schema|version)$/i;

export function jsonStrings(
  value: unknown,
  out: string[] = [],
  skip: RegExp = RECORD_KEY,
): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value))
    for (const item of value) jsonStrings(item, out, skip);
  else if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value))
      if (!skip.test(key)) jsonStrings(item, out, skip);
  return out;
}

/** A sentence a player could read: capitalized, two words or more, not a path or a token. */
export function sentenceShaped(text: string): boolean {
  const trimmed = text.trim();
  return (
    /^[A-Z$]/.test(trimmed) &&
    /[A-Za-z]{2,} [A-Za-z]{2,}/.test(trimmed) &&
    !/^[A-Za-z]+(?:[-_.:/][\w-]+)+$/.test(trimmed)
  );
}

/** Code lines: sentence-shaped literals per file in the player-text folders. */
export function codeLines(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const dir of SOURCE_DIRS)
    for (const file of walk(
      path.join(ROOT, dir),
      (file) =>
        /\.(?:tsx?|mjs)$/.test(file) &&
        !/\.(?:test|spec|browser)\./.test(file) &&
        !/\.d\.ts$/.test(file) &&
        !DEVELOPER_FILE.test(relative(file)),
    )) {
      const count = literals(readFileSync(file, "utf8")).filter(
        sentenceShaped,
      ).length;
      if (count) out[relative(file)] = count;
    }
  return out;
}

/** Data-held lines: sentence-shaped strings per json data file beside the code, outside the banks. */
export function dataHeldLines(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const dir of SOURCE_DIRS)
    for (const file of walk(path.join(ROOT, dir), (f) => f.endsWith(".json"))) {
      const count = jsonStrings(JSON.parse(readFileSync(file, "utf8"))).filter(
        sentenceShaped,
      ).length;
      if (count) out[relative(file)] = count;
    }
  return out;
}

/**
 * What a line is tied to. `facts`: its use names the record facts it needs.
 * `slot-pair`: it only fills a slot from the speaker's or the hearer's own
 * record (the slot's own description in the bank says so). `slot-world`: it
 * only fills slots from other records (a news story, a bill, a calendar).
 * `weak`: it names only the kind of subject it is said about, so it can be said
 * to anyone ("Oh, my."). `none`: no use declared.
 */
export type Tie = "facts" | "slot-pair" | "slot-world" | "weak" | "none";
export type Reach = "reached" | "unreached" | "by-bank";

export interface RegisteredLine {
  key: string;
  bank: string;
  move: string;
  text: string;
  uses: number;
  /** What in the records the line is tied to; see `Tie`. */
  tie: Tie;
  /** The grades or a rule hold it back. */
  held: boolean;
  /** Whether an engine can offer it: conversation lines are checked against the engine's own data; other banks are read as a whole by their consumer. */
  reach: Reach;
}

interface RawPiece {
  key: string;
  move?: string;
  text: string;
  uses?: {
    requiresFacts?: string[];
    onlyWhen?: string[];
  }[];
}

/** The conversation pieces the two conversation paths place (the engine's data and the composed banks). */
export function reachedConversationKeys(): Set<string> {
  const seen = new Set<string>();
  const walkData = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(walkData);
    const row = value as Record<string, unknown>;
    if (typeof row.part === "string") seen.add(row.part);
    if (typeof row.pieceKey === "string") seen.add(row.pieceKey);
    if (Array.isArray(row.parts))
      for (const part of row.parts)
        if (typeof part === "string") seen.add(part);
    Object.values(row).forEach(walkData);
  };
  walkData(MINED_CONVERSATION);
  const subjects = new Set(
    CONVERSATION_BANK.parts.flatMap((part) =>
      part.uses.map((use) => use.subject),
    ),
  );
  for (const subject of subjects) walkData(composedConversationBank(subject));
  return seen;
}

/** A slot's own description says whose record fills it: the speaker's, the player's or a person both know. */
const PAIR_SLOT =
  /\b(?:speaker's|player's|listener's|asker's|both people|household record|their own|someone both)\b/i;

function tieOf(piece: RawPiece, slots: Record<string, string>): Tie {
  const uses = piece.uses ?? [];
  if (uses.some((use) => use.requiresFacts?.length || use.onlyWhen?.length))
    return "facts";
  const named = [...piece.text.matchAll(/\{([\w-]+)\}/g)].map((m) => m[1]!);
  if (named.length)
    return named.some((slot) => PAIR_SLOT.test(slots[slot] ?? ""))
      ? "slot-pair"
      : "slot-world";
  return uses.length ? "weak" : "none";
}

/** Every bank piece, registered. */
export function bankLines(): RegisteredLine[] {
  const reached = reachedConversationKeys();
  const lines: RegisteredLine[] = [];
  for (const name of readdirSync(PARTS_DIR).filter((f) =>
    f.endsWith(".json"),
  )) {
    const bank = name.replace(/\.json$/, "");
    const file = JSON.parse(
      readFileSync(path.join(PARTS_DIR, name), "utf8"),
    ) as { parts: RawPiece[]; slots?: Record<string, string> };
    const parts = file.parts;
    for (const piece of parts)
      lines.push({
        key: piece.key,
        bank,
        move: piece.move ?? "",
        text: piece.text,
        uses: piece.uses?.length ?? 0,
        tie: tieOf(piece, file.slots ?? {}),
        held: !playable(piece),
        reach:
          bank !== "conversation"
            ? "by-bank"
            : reached.has(piece.key)
              ? "reached"
              : "unreached",
      });
  }
  return lines;
}

/** The banks no code in `src` reads (their file name appears in no source file). */
export function unreadBanks(): string[] {
  const sources = SOURCE_DIRS.concat(["src/core2"]).flatMap((dir) =>
    walk(path.join(ROOT, dir), (f) => /\.(?:tsx?|mjs)$/.test(f)).map((f) =>
      readFileSync(f, "utf8"),
    ),
  );
  return readdirSync(PARTS_DIR)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !sources.some((text) => text.includes(`parts/${name}`)))
    .map((name) => `data/english/parts/${name}`)
    .sort();
}

/** The figures the guard and the report read. */
export function registerCounts() {
  const lines = bankLines();
  const bankCount: Record<string, number> = {};
  /** Lines tied to nothing of the speaker or the hearer: weak, none, or only a slot of the world. They can be said to anyone. */
  const untied: Record<string, number> = {};
  const byTie: Record<Tie, number> = {
    facts: 0,
    "slot-pair": 0,
    "slot-world": 0,
    weak: 0,
    none: 0,
  };
  for (const line of lines) {
    bankCount[line.bank] = (bankCount[line.bank] ?? 0) + 1;
    byTie[line.tie] += 1;
    if (line.tie === "none" || line.tie === "weak" || line.tie === "slot-world")
      untied[line.bank] = (untied[line.bank] ?? 0) + 1;
  }
  return {
    bankCount,
    byTie,
    untied,
    unreachedConversation: lines
      .filter((line) => line.reach === "unreached")
      .map((line) => line.key)
      .sort(),
    unreadBanks: unreadBanks(),
    codeLines: codeLines(),
    dataHeldLines: dataHeldLines(),
  };
}

/** What the guard holds the register to: only what is not tied, reached, read or banked yet, which only shrinks. */
export function baselineOf(counts = registerCounts()) {
  return {
    untiedBankLines: counts.untied,
    unreachedConversation: counts.unreachedConversation,
    unreadBanks: counts.unreadBanks,
    codeLines: counts.codeLines,
    dataHeldLines: counts.dataHeldLines,
  };
}

if (process.argv[1]?.endsWith("line-register.ts")) {
  const counts = registerCounts();
  if (process.argv.includes("--write-baseline")) {
    writeFileSync(
      path.join(ROOT, "tests/guards/english/line-register-baseline.json"),
      `${JSON.stringify(baselineOf(counts), null, 2)}\n`,
    );
    process.exit(0);
  }
  const sum = (o: Record<string, number>) =>
    Object.values(o).reduce((a, b) => a + b, 0);
  console.log(
    JSON.stringify(
      {
        bankLines: sum(counts.bankCount),
        byTie: counts.byTie,
        untiedBankLines: sum(counts.untied),
        unreachedConversationLines: counts.unreachedConversation.length,
        unreadBanks: counts.unreadBanks,
        codeLines: sum(counts.codeLines),
        dataHeldLines: sum(counts.dataHeldLines),
      },
      null,
      2,
    ),
  );
}
