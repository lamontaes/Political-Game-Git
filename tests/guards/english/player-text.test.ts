import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { KNOWN_DEVELOPER_TEXT } from "./allowlist";

/**
 * No developer text in a player string (player-screen-text skill; the lane's
 * law: nothing ships in developer speak). A sentence a player reads never
 * carries an ISO date (2026-10-28) or a record's raw id or kind. Dates are
 * worded by the English engine and records are named by their labels.
 *
 * What is read: every string and template literal with a space in it (a
 * sentence, not a code token) in shipped source under the folders that make
 * player text (the bench, the director, the English engine), and every string
 * in the English banks. What counts:
 *  - an ISO date written into the sentence, or a date interpolated as ISO
 *    (`${x.date}` or `${x.iso}` with nothing turning it into words);
 *  - `${x.id}`, `${x.kind}` or `${x.somethingId}` interpolated into a sentence.
 *
 * What was already there is counted by file in ./allowlist.ts and only goes
 * down. A screen check in the browser (src/bench checks) reads what is drawn;
 * this reads what is written.
 */

const ROOT = path.resolve(__dirname, "../../..");
const SOURCE_DIRS = ["src/bench", "src/director", "src/english"];
const BANK_DIR = "data/english";

const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;
const RAW_INTERPOLATION =
  /\$\{\s*[\w.?!]*?(?:\.(?:id|kind|date|iso|isoDate)|[a-z]Id)\s*\}/;

export function developerText(text: string): string | null {
  if (!/\s/.test(text) || !/[A-Za-z]{2,} [A-Za-z]{2,}/.test(text)) return null;
  const iso = ISO_DATE.exec(text);
  if (iso) return `ISO date "${iso[0]}"`;
  const raw = RAW_INTERPOLATION.exec(text);
  if (raw) return `raw record value "${raw[0]}"`;
  return null;
}

function walk(dir: string, keep: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, keep);
    return keep(full) ? [full] : [];
  });
}

/** Developer-only files: the bench's checks and traces, the director's tools. */
const DEVELOPER_FILE =
  /(?:^|\/)(?:[\w-]+-check|dev-[\w-]+|tooling\/[\w/-]+)\.tsx?$/;

/** A literal that is an error, a log line or a test message, not player text. */
const DEVELOPER_CALL =
  /(?:\b(?:Error|console\.\w+|assert\w*|fail|gap|log|warn)\([^;(){}]*|estimatedFrom:\s*)$/;

/** String and template literals a player could read, comments skipped. */
function literals(source: string): string[] {
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

/** Where a bank keeps its provenance, which the player never reads. */
const RECORD_KEY =
  /^(?:source|sources|citation|cites|retrieved|accessed|date|at|note|notes|provenance|evidence|description|estimatedFrom|reason)$/i;

function jsonStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value))
    for (const item of value) jsonStrings(item, out);
  else if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value))
      if (!RECORD_KEY.test(key)) jsonStrings(item, out);
  return out;
}

function findings(): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  const add = (file: string, text: string) => {
    const what = developerText(text);
    if (!what) return;
    const relative = path.relative(ROOT, file).split(path.sep).join("/");
    byFile.set(relative, [...(byFile.get(relative) ?? []), what]);
  };
  for (const dir of SOURCE_DIRS)
    for (const file of walk(
      path.join(ROOT, dir),
      (file) =>
        /\.tsx?$/.test(file) &&
        !/\.(test|spec)\.tsx?$/.test(file) &&
        !/\.d\.ts$/.test(file) &&
        !DEVELOPER_FILE.test(file.split(path.sep).join("/")),
    ))
      for (const text of literals(readFileSync(file, "utf8"))) add(file, text);
  for (const file of walk(
    path.join(ROOT, BANK_DIR),
    (file) =>
      file.endsWith(".json") &&
      // Grading batches, grades and counts are records of the engine, not banks.
      !/[\\/](?:batches|grades|counts)[\\/]/.test(file),
  ))
    for (const text of jsonStrings(JSON.parse(readFileSync(file, "utf8"))))
      add(file, text);
  return byFile;
}

describe("player strings carry no developer text", () => {
  const found = findings();

  it("adds no ISO date or raw record value beyond the known list", () => {
    const over = [...found]
      .filter(([file, list]) => list.length > (KNOWN_DEVELOPER_TEXT[file] ?? 0))
      .map(
        ([file, list]) =>
          `${file}: ${list.length} found, ${KNOWN_DEVELOPER_TEXT[file] ?? 0} known (${[...new Set(list)].join("; ")}). Word the date or name the record through the English engine.`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a known count as soon as a line is fixed", () => {
    const stale = Object.entries(KNOWN_DEVELOPER_TEXT)
      .filter(([file, known]) => (found.get(file)?.length ?? 0) < known)
      .map(
        ([file, known]) =>
          `${file}: lower ${known} to ${found.get(file)?.length ?? 0} in tests/guards/english/allowlist.ts`,
      );
    expect(stale).toEqual([]);
  });

  it("catches the shapes it bans and leaves code tokens alone", () => {
    for (const text of [
      "Filed on 2026-10-28.",
      "You meet ${person.id} at the door.",
      "A ${record.kind} came in today.",
      "The hearing is on ${hearing.date}.",
      "Talk to ${speakerId} about it.",
    ])
      expect(developerText(text), text).not.toBeNull();
    for (const text of [
      "2026-10-28",
      "person-${id}",
      "You meet ${name} at the door.",
      "The hearing is on ${dateWords(hearing.date)}.",
    ])
      expect(developerText(text), text).toBeNull();
  });
});
