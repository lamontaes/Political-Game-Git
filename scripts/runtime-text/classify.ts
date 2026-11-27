/**
 * What a rendered string is, in this order:
 *
 * - engine: the English engine wrote it (a composer registered the text).
 * - kit13: it is one of the owner's approved control labels.
 * - literal: it is written in a source file; the file and line are given.
 * - literal-joined: several literals joined by a separator (a hint line).
 * - formatted: a number, date, time or amount a formatter wrote from a value.
 * - record: the world's own values make up the string (names, titles, figures).
 * - unresolved: none of the above, so it was built from pieces the audit
 *   cannot trace. These are the first to read by hand.
 *
 * A literal is checked before a record because a word like "Active" is both a
 * status in the record and a label in a screen; it is reported as the literal
 * with `alsoRecordValue` set, so a hand-written label never hides as data.
 */
type TextOrigin =
  | "engine"
  | "kit13"
  | "literal"
  | "literal-template"
  | "literal-joined"
  | "formatted"
  | "record"
  | "unresolved";

export interface Coverage {
  readonly covered: number;
  readonly total: number;
  readonly values: readonly string[];
}

export interface ClassifiedText {
  readonly text: string;
  readonly origin: TextOrigin;
  readonly file: string | null;
  readonly line: number | null;
  /** `file|what the line holds`: names the source text without its line number, so edits elsewhere in the file do not move it. */
  readonly source: string | null;
  readonly bank: string | null;
  readonly alsoRecordValue: boolean;
  readonly recordShare: number;
  readonly count: number;
  readonly screen: string;
  readonly place: string;
  readonly kind: string;
  readonly candidates: number;
  readonly testid: string | null;
  /** Why an unresolved string could not be traced; `unexplained` has no rule. */
  readonly cause: string | null;
}

export function summarize(rows: readonly ClassifiedText[]) {
  const byOrigin: Record<string, { strings: number; occurrences: number }> = {};
  for (const row of rows) {
    const entry = (byOrigin[row.origin] ??= { strings: 0, occurrences: 0 });
    entry.strings += 1;
    entry.occurrences += row.count;
  }
  return byOrigin;
}
