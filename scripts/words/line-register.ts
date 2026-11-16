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
import { bankLines, type Tie } from "../../src/english/line-register";

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
  /(?:^|\/)(?:[\w-]+-check|dev-[\w-]+|dev-views\/[\w-]+|tooling\/[\w/-]+)\.(?:tsx?|mjs)$/;

/**
 * A literal that is a note, not player text, told by the call or the field it
 * is written into, never by its file (so a player line cannot hide in a notes
 * file): an error, a log line or a test message; a check's problem list; a
 * record's citation or provenance; a browser check finding a control by the
 * name the player reads (the label itself lives in controls.json).
 */
const DEVELOPER_CALL =
  /(?:\b(?:Error|console\.\w+|assert\w*|fail|gap|log|warn|super|missing)\(\[?[^;(){}]*|\b(?:problems|failures|blocked)\.push\(\s*|\b(?:estimatedFrom|citation|error|hasText):\s*|\bgetByRole\([^;()]*\{\s*name:\s*)$/;

const LITERAL =
  /"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`|'([^'\\\n]*(?:\\.[^'\\\n]*)*)'/g;

/** Source with comments blanked to spaces, so every index still matches the file. */
function withoutComments(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, " ");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(
      /(^|[^:"'`\\])(\/\/[^\n]*)/g,
      (_, lead: string, rest: string) => lead + blank(rest),
    );
}

/** Code with every literal blanked, for counting brackets and finding names. */
function withoutLiterals(code: string): string {
  return code.replace(LITERAL, (text) => text.replace(/[^\n]/g, " "));
}

/** A literal compared with === or !== is a record value the code tests, never something said. */
const COMPARED_BEFORE = /(?:===|!==)\s*$/;
const COMPARED_AFTER = /^\s*(?:===|!==)/;

const compared = (code: string, at: number, end: number) =>
  COMPARED_BEFORE.test(code.slice(Math.max(0, at - 8), at)) ||
  COMPARED_AFTER.test(code.slice(end, end + 8));

/**
 * The file's own constants that hold one literal and are only ever compared
 * (not exported, every other use beside === or !==): what they hold is a
 * record value the code tests, proved by every use, never something said.
 */
function comparedConstants(code: string): Map<string, number> {
  const plain = withoutLiterals(code);
  const out = new Map<string, number>();
  for (const match of code.matchAll(
    /^const (\w+) =\s*("[^"\\\n]*(?:\\.[^"\\\n]*)*"|'[^'\\\n]*(?:\\.[^'\\\n]*)*');$/gm,
  )) {
    const name = match[1]!;
    const literalAt = match.index + match[0].indexOf(match[2]!);
    const uses = [...plain.matchAll(new RegExp(`\\b${name}\\b`, "g"))].filter(
      (use) => use.index !== match.index + "const ".length,
    );
    if (
      uses.length &&
      uses.every((use) => compared(plain, use.index, use.index + name.length))
    )
      out.set(name, literalAt);
  }
  return out;
}

/**
 * The constants and functions whose literals are never said, each proved by
 * its readers (line-register-exempt.json): what they hold is read only by
 * developer files, tests and scripts, or only through the fields named in
 * `reads`. `exemptProblems` fails the guard when a reader breaks that.
 */
interface Exempt {
  file: string;
  name: string;
  reason: string;
  reads: string[];
}
export const EXEMPT: readonly Exempt[] = (
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, "line-register-exempt.json"),
      "utf8",
    ),
  ) as { symbols: Exempt[] }
).symbols;

/** Where a top-level constant or function is written: from its line to the end of its statement. */
function spanOf(code: string, name: string): [number, number] | null {
  const plain = withoutLiterals(code);
  const start = plain.search(
    new RegExp(`^(?:export )?(?:const|(?:async )?function) ${name}\\b`, "m"),
  );
  if (start < 0) return null;
  const isFunction = /^(?:export )?(?:async )?function/.test(
    plain.slice(start),
  );
  let depth = 0;
  for (let at = start; at < plain.length; at += 1) {
    const char = plain[at]!;
    if ("{[(".includes(char)) depth += 1;
    else if ("}])".includes(char)) {
      depth -= 1;
      if (isFunction && depth === 0 && char === "}") return [start, at + 1];
    } else if (!isFunction && char === ";" && depth === 0)
      return [start, at + 1];
  }
  return [start, plain.length];
}

function exemptSpans(file: string, code: string): [number, number][] {
  return EXEMPT.filter((row) => row.file === file).flatMap((row) => {
    const span = spanOf(code, row.name);
    return span ? [span] : [];
  });
}

/** String and template literals a player could read, comments skipped. */
export function literals(source: string, file = ""): string[] {
  const code = withoutComments(source);
  const spans = exemptSpans(file, code);
  const constants = comparedConstants(code);
  const constantAt = new Set(constants.values());
  return [...code.matchAll(LITERAL)]
    .filter(
      (match) =>
        !DEVELOPER_CALL.test(
          code.slice(Math.max(0, match.index - 120), match.index),
        ) &&
        !compared(code, match.index, match.index + match[0].length) &&
        !constantAt.has(match.index) &&
        !spans.some(([from, to]) => match.index >= from && match.index < to),
    )
    .map((match) => match[1] ?? match[2] ?? match[3] ?? "");
}

/** Files whose code could put words on a player's screen: every source file but tests and developer files. */
function readerFiles(): string[] {
  return SOURCE_DIRS.concat(["src/core2"]).flatMap((dir) =>
    walk(
      path.join(ROOT, dir),
      (file) =>
        /\.(?:tsx?|mjs)$/.test(file) &&
        !namedDeveloper(relative(file)) &&
        !drivesABrowser(relative(file)),
    ),
  );
}

/**
 * Each exemption proved by its readers: the symbol is still there, and every
 * use of it in a file that could put words on a screen, outside the exempt
 * spans themselves and the import lines, reads only a field named in `reads`.
 */
export function exemptProblems(): string[] {
  const problems: string[] = [];
  const files = readerFiles().map((full) => {
    const file = relative(full);
    const code = withoutLiterals(withoutComments(readFileSync(full, "utf8")))
      // An import names a symbol; only its uses read it.
      .replace(/^import\s[^;]*;/gm, (text) => text.replace(/[^\n]/g, " "));
    return {
      file,
      code,
      spans: exemptSpans(file, withoutComments(readFileSync(full, "utf8"))),
    };
  });
  for (const row of EXEMPT) {
    if (!row.reason.trim()) problems.push(`${row.name}: no reason given`);
    const home = files.find((entry) => entry.file === row.file);
    if (!home || !spanOf(home.code, row.name)) {
      problems.push(`${row.name} is not in ${row.file}`);
      continue;
    }
    const field = new RegExp(
      `^(?:\\[[^\\]]*\\])*\\??\\.(?:${row.reads.join("|") || "(?!)"})\\b`,
    );
    for (const { file, code, spans } of files)
      for (const use of code.matchAll(new RegExp(`\\b${row.name}\\b`, "g"))) {
        if (spans.some(([from, to]) => use.index >= from && use.index < to))
          continue;
        if (field.test(code.slice(use.index + row.name.length))) continue;
        const line = code.slice(0, use.index).split("\n").length;
        problems.push(
          `${row.name} is read at ${file}:${line}, which could put its words on a screen`,
        );
      }
  }
  return problems;
}

/**
 * Keys a data file keeps its provenance and notes under, which the player
 * never reads, by field name and never by file: provenance and ids; a
 * stopgap row's own fields; how a number was checked; a file's or a rule's
 * about (no data file in the scanned folders is read for its about as words);
 * any key ending Note or About; and the description maps a situation type
 * names its fills, settings, timings and bearings in, and the picture briefs
 * written for whoever paints them (wantedPictures, wantedScenes).
 */
export const RECORD_KEY =
  /^(?:source|sources|citation|cites|retrieved|accessed|date|at|note|notes|provenance|evidence|description|estimatedFrom|reason|id|key|kind|type|name|label|title|schema|version|whatItFakes|replacement|addedBy|resolution|why|author|checkedAgainst|spread|about|fills|settings|timings|bearings|wantedPictures|wantedScenes|\w+Note|\w+About)$/i;

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

/** A test, browser-test, type or developer file, by its name. */
const namedDeveloper = (file: string) =>
  /\.(?:test|spec|browser)\./.test(file) ||
  /\.d\.ts$/.test(file) ||
  DEVELOPER_FILE.test(file);

/**
 * A file that drives a browser for a developer, proved by its code, not its
 * name: it imports Playwright, which no page can load and no game server
 * imports. (Being named only by tests proves nothing: the bench loads some
 * files by a computed path, as dev-views.mjs does.)
 */
export function drivesABrowser(file: string): boolean {
  return /from\s*["'](?:@playwright\/test|playwright)["']/.test(
    readFileSync(path.join(ROOT, file), "utf8"),
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
        !namedDeveloper(relative(file)) &&
        !drivesABrowser(relative(file)),
    )) {
      const count = literals(readFileSync(file, "utf8"), relative(file)).filter(
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
    for (const file of walk(
      path.join(ROOT, dir),
      // Dev mode's own data (src/bench/dev-views) is read by the developer, not the player.
      (f) => f.endsWith(".json") && !/\/dev-views\//.test(f),
    )) {
      const count = jsonStrings(JSON.parse(readFileSync(file, "utf8"))).filter(
        sentenceShaped,
      ).length;
      if (count) out[relative(file)] = count;
    }
  return out;
}

/** The banks no code in `src` reads (their file name appears in no source file). */
export function unreadBanks(): string[] {
  const sources = SOURCE_DIRS.concat(["src/core2"]).flatMap((dir) =>
    // The register reads every bank itself, so it does not count as a reader.
    walk(
      path.join(ROOT, dir),
      (f) =>
        /\.(?:tsx?|mjs)$/.test(f) && !f.endsWith("english/line-register.ts"),
    ).map((f) => readFileSync(f, "utf8")),
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
    declared: 0,
    binding: 0,
    facts: 0,
    subject: 0,
    frame: 0,
    scene: 0,
    document: 0,
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
    saysNothing: lines
      .filter((line) => line.empty)
      .map((line) => line.key)
      .sort(),
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
    saysNothing: counts.saysNothing,
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
        saysNothingReplies: counts.saysNothing.length,
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
