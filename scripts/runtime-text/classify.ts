import { readFileSync } from "node:fs";
import { join } from "node:path";
import { causeOf } from "./causes";
import {
  normalizeText,
  resolveJoined,
  resolveLiteral,
  type LiteralIndex,
} from "./literal-index";

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
export type TextOrigin =
  | "engine"
  | "kit13"
  | "literal"
  | "literal-template"
  | "literal-joined"
  | "formatted"
  | "record"
  | "unresolved";

export interface RenderedText {
  readonly text: string;
  readonly kind: string;
  readonly screen: string;
  readonly place: string;
  readonly testid?: string;
}

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

const MONTH =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const WEEKDAY = "(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)";
const FORMATTED = [
  /^[^A-Za-z]*$/,
  new RegExp(`^(?:${WEEKDAY},? )?${MONTH}(?: \\d{1,2})?(?:,? \\d{4})?$`),
  /^\d{1,2}:\d{2} ?[AP]M$/i,
  /^\d+(?:st|nd|rd|th)$/,
];

export const KIT13_LABELS: ReadonlySet<string> = new Set(
  JSON.parse(
    readFileSync(
      join(process.cwd(), "scripts/runtime-text/kit13-labels.json"),
      "utf8",
    ),
  ) as string[],
);

export function classifyTexts(input: {
  readonly rendered: readonly RenderedText[];
  readonly engine: ReadonlyMap<string, { bank: string; variant?: string }>;
  readonly coverage: ReadonlyMap<string, Coverage>;
  readonly index: LiteralIndex;
}): ClassifiedText[] {
  const engineTexts = [...input.engine.keys()].map((text) =>
    normalizeText(text),
  );
  const engineByNormal = new Map(
    [...input.engine.entries()].map(([text, origin]) => [
      normalizeText(text),
      origin,
    ]),
  );
  const rows = new Map<string, ClassifiedText>();
  for (const item of input.rendered) {
    const text = normalizeText(item.text);
    const key = `${item.place}\u0000${item.screen}\u0000${item.kind}\u0000${text}`;
    const existing = rows.get(key);
    if (existing) {
      rows.set(key, { ...existing, count: existing.count + 1 });
      continue;
    }
    const coverage = input.coverage.get(text);
    const share =
      coverage && coverage.total > 0 ? coverage.covered / coverage.total : 0;
    let origin: TextOrigin = "unresolved";
    let file: string | null = null;
    let line: number | null = null;
    let bank: string | null = null;
    let candidates = 0;

    const engine = engineByNormal.get(text);
    const partialEngine =
      engine === undefined && text.length >= 15
        ? engineTexts.find(
            (candidate) =>
              candidate.length >= 15 &&
              (candidate.includes(text) || text.includes(candidate)),
          )
        : undefined;
    if (engine || partialEngine !== undefined) {
      origin = "engine";
      bank = (engine ?? engineByNormal.get(partialEngine!))?.bank ?? null;
    } else if (KIT13_LABELS.has(text)) {
      origin = "kit13";
    } else {
      const hits = resolveLiteral(input.index, text);
      candidates = hits.length;
      if (hits.length > 0) {
        origin = hits[0]!.via === "literal" ? "literal" : "literal-template";
        file = hits[0]!.file;
        line = hits[0]!.line;
      } else if (resolveJoined(input.index, text)) {
        const joined = resolveJoined(input.index, text)!;
        origin = "literal-joined";
        file = joined.file;
        line = joined.line;
      } else if (FORMATTED.some((pattern) => pattern.test(text)))
        origin = "formatted";
      else if (share >= 0.9) origin = "record";
    }
    rows.set(key, {
      text,
      origin,
      file,
      line,
      bank,
      alsoRecordValue:
        (origin === "literal" ||
          origin === "literal-template" ||
          origin === "literal-joined") &&
        share >= 0.9,
      recordShare: Math.round(share * 100) / 100,
      count: 1,
      screen: item.screen,
      place: item.place,
      kind: item.kind,
      candidates,
      testid: item.testid ?? null,
      cause: origin === "unresolved" ? causeOf(text, item.testid).id : null,
    });
  }
  return [...rows.values()];
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
