/**
 * What the words machine has read besides the rules' own words: the owner's
 * rulings about words from his rulings log, the playtest blocks, the prior
 * rulings and the play-first law (`data/english/rulings-read.json`), and his
 * grade notes, with the reason each note that no rule cites is not a rule
 * (`data/english/notes-not-rules.json`). Both files are read by the report of
 * `npm run words:rules`; `line-rules.test.ts` checks them.
 *
 * Pure: no files. The script and the test read the files.
 */
import type { LineRule } from "./line-rules";

export interface RulingRead {
  readonly id: string;
  /** `path :: heading`: the file his words are copied from, and the heading they sit under. */
  readonly source: string;
  readonly date: string;
  /** His words, copied exactly from the source file. */
  readonly words: string;
  /** The id of the rule it is attached to in line-rules.json. */
  readonly rule?: string;
  /** Why it is not a rule. */
  readonly notARule?: string;
  /** The row of a later ruling that replaces this one. */
  readonly supersededBy?: string;
  readonly note?: string;
}

export interface RulingsReadFile {
  readonly schema: "english-rulings-read/1";
  readonly about: string;
  /** Rule ids another session is building: rulings may name them before they exist. */
  readonly pendingRules: Readonly<Record<string, string>>;
  readonly rulings: readonly RulingRead[];
}

export interface NoteNotRule {
  readonly file: string;
  readonly key: string;
  readonly date: string;
  readonly note: string;
  readonly reason: string;
}

export interface NotesNotRulesFile {
  readonly schema: "english-notes-not-rules/1";
  readonly about: string;
  readonly notes: readonly NoteNotRule[];
}

/** One grade row as the grade files hold it; only what the reading needs. */
export interface GradeRow {
  readonly key?: string;
  readonly parts?: readonly string[];
  readonly note?: string;
}

export interface GradeNote {
  /** The grade file's name, without its folder. */
  readonly file: string;
  /** The ledger key of the piece he graded. */
  readonly key: string;
  readonly note: string;
}

export const normalWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .match(/[a-z0-9']+/g) ?? [];

const GRAM = 4;
const grams = (words: readonly string[]): string[] =>
  words
    .slice(0, Math.max(0, words.length - GRAM + 1))
    .map((_, i) => words.slice(i, i + GRAM).join(" "));

/** Every grade row with a note, in file order. */
export function gradeNotesOf(
  files: readonly { file: string; grades: readonly GradeRow[] }[],
): GradeNote[] {
  return files.flatMap(({ file, grades }) =>
    grades.flatMap((row) =>
      row.note && (row.key ?? row.parts?.[0])
        ? [{ file, key: (row.key ?? row.parts?.[0])!, note: row.note }]
        : [],
    ),
  );
}

/**
 * Whether a rule cites the note: some four words of the note run through
 * the words a rule keeps from him (`from` and `examples`), or the whole note
 * sits inside one of them.
 */
export function noteMatcher(
  rules: readonly LineRule[],
): (note: string) => boolean {
  const sources = rules.flatMap((rule) => [
    ...rule.from.map((entry) => normalWords(entry.words)),
    ...(rule.examples ?? []).map((entry) => normalWords(entry.words)),
  ]);
  const seen = new Set(sources.flatMap(grams));
  const padded = sources.map((words) => ` ${words.join(" ")} `);
  return (note) => {
    const words = normalWords(note);
    if (!words.length) return false;
    if (grams(words).some((gram) => seen.has(gram))) return true;
    const whole = ` ${words.join(" ")} `;
    return padded.some((source) => source.includes(whole));
  };
}

export interface ReadingReport {
  readonly notes: readonly GradeNote[];
  readonly unattachedNotes: readonly (GradeNote & {
    readonly date: string;
    readonly reason: string;
  })[];
  readonly rulings: readonly RulingRead[];
  readonly attachedRulings: number;
  /** Rulings per file, for the totals. */
  readonly perPlace: Readonly<Record<string, number>>;
}

const PLACES: readonly [string, (source: string) => boolean][] = [
  ["OWNER-DECISIONS.md", (s) => s.includes("coordination/OWNER-DECISIONS.md")],
  ["playtest blocks", (s) => s.includes("coordination/playtest/")],
  ["prior-rulings", (s) => s.includes("coordination/prior-rulings/")],
  ["play-first LAW.md", (s) => s.includes("play-first/LAW.md")],
];

/** The reading, joined: notes against the rules, rulings against their rules. */
export function readingOf(
  rules: readonly LineRule[],
  notes: readonly GradeNote[],
  rulings: RulingsReadFile,
  reasons: NotesNotRulesFile,
): ReadingReport {
  const attached = noteMatcher(rules);
  const why = new Map(
    reasons.notes.map((row) => [`${row.file}::${row.key}`, row]),
  );
  const unattachedNotes = notes
    .filter((note) => !attached(note.note))
    .map((note) => {
      const row = why.get(`${note.file}::${note.key}`);
      return {
        ...note,
        date: row?.date ?? "",
        reason: row?.reason ?? "",
      };
    });
  const perPlace: Record<string, number> = {};
  for (const [name, test] of PLACES)
    perPlace[name] = rulings.rulings.filter((r) => test(r.source)).length;
  return {
    notes,
    unattachedNotes,
    rulings: rulings.rulings,
    attachedRulings: rulings.rulings.filter((r) => r.rule).length,
    perPlace,
  };
}

const quote = (text: string) => `"${text.replace(/\s+/g, " ").trim()}"`;

/** The top lines of the report: what was read and how much of it is attached. */
export function readingTotals(reading: ReadingReport): string[] {
  const notes = reading.notes.length;
  const noteAttached = notes - reading.unattachedNotes.length;
  const rulings = reading.rulings.length;
  const places = Object.entries(reading.perPlace)
    .map(([name, count]) => `${name} ${count}`)
    .join(", ");
  return [
    `- Grade notes read: ${notes}. Attached to a rule: ${noteAttached}. Attached to none: ${reading.unattachedNotes.length}.`,
    `- Rulings read from the other places: ${rulings} (${places}). Attached to a rule: ${reading.attachedRulings}. Not rules: ${rulings - reading.attachedRulings}.`,
  ];
}

/** The two lists at the end of the report: notes no rule cites, and rulings that are not rules. */
export function readingSections(reading: ReadingReport): string[] {
  const batch = (file: string) => file.replace(/\.json$/, "");
  return [
    `## Grade notes attached to no rule (${reading.unattachedNotes.length})`,
    "",
    ...reading.unattachedNotes.map(
      (note) =>
        `- ${note.date || "no date"}, ${batch(note.file)}, ${quote(note.note)}: ${note.reason || "NO REASON GIVEN"}`,
    ),
    "",
    `## Rulings that are not rules (${reading.rulings.length - reading.attachedRulings})`,
    "",
    ...reading.rulings
      .filter((r) => !r.rule)
      .map(
        (r) =>
          `- ${r.id}, ${r.date}, ${r.source}, ${quote(r.words)}: ${r.notARule ?? "NO REASON GIVEN"}`,
      ),
    "",
  ];
}
