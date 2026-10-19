/**
 * The repetition guard: runs on every generated grading batch before it is
 * written. Development tooling; shipped play never imports it.
 *
 * Owner, Oct 14, 2026, on batch 7: "still super repetitive and terrible."
 *
 * Per kind of text it measures four shares over the batch's lines:
 *   - openers: distinct openers (the first two words) over lines;
 *   - closers: distinct closers (the last two words) over lines, so a
 *              look-back ("I didn't know at the time.") is not said twice;
 *   - shapes:  distinct sentence shapes (the text with names, slot values,
 *              quoted titles, numbers and dates masked) over lines;
 *   - verbs:   distinct main verbs over lines.
 * A kind below its threshold (src/director/data/director.json, parameters
 * `dialogueGuard<Kind><Measure>`, each ESTIMATED from real samples of the
 * same size, see `measure-real.ts`) fails the batch.
 *
 * It also fails any single line whose event is a school, a workplace or an
 * institution ("I went to X School.", "I attended X.", "I went to work at X.",
 * "I went to {filing office}.") or whose bill title is carried as a bare
 * command ("2026-010, Shift highway funds to transit"). These are found from
 * the line's part keys and the record names in its facts, not guessed.
 */
import { readFileSync } from "node:fs";
import directorData from "../../src/director/data/director.json" with { type: "json" };
import lexicon from "./verb-lexicon.json" with { type: "json" };

export const MEASURES = ["openers", "closers", "shapes", "verbs"] as const;
export type Measure = (typeof MEASURES)[number];

export interface GuardLine {
  kind: string;
  text: string;
  /** The mined part keys that made the line. */
  parts: string[];
  /** Names and slot values in the line (people, places, titles, offices), masked in its shape. */
  masks?: string[];
  /** Names of the schools, workplaces and offices of record in the line's facts. */
  institutions?: string[];
  /** Bill and policy titles of record the line may carry. */
  titles?: string[];
  sourceRecordIds?: string[];
}

export type Rule =
  | "held-by-grades"
  | "ungrammatical"
  | "institution-part"
  | "institution-event"
  | "bare-command-title"
  | "policy-name-said"
  | "repeated-opener"
  | "repeated-closer"
  | "repeated-shape"
  | "repeated-verb";

export interface Rejection {
  rule: Rule;
  kind: string;
  text: string;
}

export type Thresholds = Record<string, Record<Measure, number>>;

/* ------------------------------------------------------------- the measures */

const clean = (word: string) => word.toLowerCase().replace(/[^a-z']/g, "");

/** The first two words of the line's first sentence. */
export function openerOf(text: string): string {
  const words = (text.split("\n")[0] ?? "")
    .split(/\s+/)
    .map(clean)
    .filter(Boolean);
  return words.slice(0, 2).join(" ");
}

/** The last two words of the line's last sentence. */
export function closerOf(text: string): string {
  const words = text.split(/\s+/).map(clean).filter(Boolean);
  return words.slice(-2).join(" ");
}

const MONTHS =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/g;

/** The text with names, slot values, quoted titles, numbers and dates masked. */
export function shapeOf(text: string, masks: readonly string[] = []): string {
  let out = text;
  for (const mask of [...masks]
    .filter((m) => m.trim().length > 1)
    .sort((a, b) => b.length - a.length))
    out = out.split(mask).join("_");
  out = out
    .replace(/["“][^"”]*["”]/g, "_")
    .replace(MONTHS, "_")
    .replace(/\d[\d,.:-]*/g, "#")
    // A capitalized word after the first word of a sentence is a name.
    .replace(/(^|[.!?:]\s+)([A-Z][\w']*)/g, "$1\uE000$2")
    .replace(
      /(?<!\uE000)\b[A-Z][\w'.]*(?:\s+(?:of|the|de|la)?\s*[A-Z][\w'.]*)*/g,
      "_",
    )
    .replace(/\uE000/g, "")
    .toLowerCase();
  return out
    .replace(/(?:_\s*)+/g, "_ ")
    .replace(/\s+/g, " ")
    .trim();
}

const AUX = new Set<string>(lexicon.auxiliary);
const IRREGULAR = lexicon.irregular as Record<string, string>;
const VERBS = new Set<string>(lexicon.verbs);
const NOUN_CUES = new Set<string>(lexicon.nounCues);

/** The base form of a word when it is a verb form, else null. */
function verbBase(word: string): string | null {
  if (IRREGULAR[word]) return IRREGULAR[word]!;
  const tries = [
    word,
    word.replace(/ies$/, "y"),
    word.replace(/es$/, ""),
    word.replace(/s$/, ""),
    word.replace(/ed$/, ""),
    word.replace(/d$/, ""),
    word.replace(/ing$/, ""),
    word.replace(/ing$/, "e"),
    word.replace(/([b-df-hj-np-tv-z])\1(?:ed|ing)$/, "$1"),
    word.replace(/ied$/, "y"),
  ];
  for (const base of tries) if (VERBS.has(base)) return base;
  return null;
}

/** The main verb of the line's first sentence: the first lexical verb, else the first auxiliary. */
export function verbOf(text: string): string {
  const words = (text.split(/(?<=[.!?])\s|\n/)[0] ?? "")
    .split(/\s+/)
    .map(clean)
    .filter(Boolean);
  let aux = "";
  for (let at = 0; at < words.length; at += 1) {
    const word = words[at]!;
    if (AUX.has(word)) {
      aux ||= word;
      continue;
    }
    if (at > 0 && NOUN_CUES.has(words[at - 1]!) && !AUX.has(words[at - 1]!))
      continue;
    const base = verbBase(word);
    if (base) return base;
  }
  return aux ? "be" : "(none)";
}

export interface KindMeasure {
  kind: string;
  lines: number;
  openers: number;
  closers: number;
  shapes: number;
  verbs: number;
}

const share = (values: string[]) =>
  values.length ? new Set(values).size / values.length : 1;

export function measureLines(
  kind: string,
  lines: readonly GuardLine[],
): KindMeasure {
  return {
    kind,
    lines: lines.length,
    openers: share(lines.map((line) => openerOf(line.text))),
    closers: share(lines.map((line) => closerOf(line.text))),
    shapes: share(lines.map((line) => shapeOf(line.text, line.masks))),
    verbs: share(lines.map((line) => verbOf(line.text))),
  };
}

/* ------------------------------------------------------------------- thresholds */

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
export const parameterKey = (kind: string, measure: Measure) =>
  `dialogueGuard${cap(kind)}${cap(measure)}`;

/** The thresholds from the director's parameter table. */
export function loadThresholds(
  kinds: readonly string[],
  parameters: Record<string, { value: number }> = (
    directorData as unknown as { parameters: Record<string, { value: number }> }
  ).parameters,
): Thresholds {
  const out: Thresholds = {};
  for (const kind of kinds) {
    out[kind] = {} as Record<Measure, number>;
    for (const measure of MEASURES) {
      const row = parameters[parameterKey(kind, measure)];
      if (!row) throw new Error(`no ${parameterKey(kind, measure)} parameter`);
      out[kind]![measure] = row.value;
    }
  }
  return out;
}

/* -------------------------------------------------------------- single lines */

const SETTING_PART = /^journal\.(?:school|work|job)[-.]|filing-office/;
const ATTENDING =
  /\b(?:went|go|going|attend\w*|graduat\w*|was at|were at|started at|enrolled|worked|work at|joined|studied|hired)\b/i;
const IMPERATIVE_LEAD = (title: string) =>
  VERBS.has(clean(title.split(/\s+/)[0] ?? "")) &&
  !/^(?:the|a|an)\s/i.test(title);

/**
 * Whether a composed sentence is whole English: no unfilled slot, no empty
 * slot left as a gap ("was  years old"), no age without its number ("was born
 * years old"), no doubled word,
 * and a capital after every full stop.
 */
export function grammatical(text: string): boolean {
  if (/[{}]|\s{2,}|\s[.,?!]|[.,?!]{2,}/.test(text)) return false;
  if (/\b(\w+) \1\b/i.test(text)) return false;
  if (/\byears old\b/i.test(text) && !/\b\d+(?: years old)/i.test(text))
    return false;
  return text
    .split(/(?<=[.?!])\s+/)
    .every((sentence) => !sentence || /^["“'(]?[\p{Lu}\d]/u.test(sentence));
}

/** The kinds that are spoken aloud, where a catalog name is never said. */
const SPOKEN = new Set([
  "interview",
  "campaign",
  "conversation",
  "meeting",
  "hearing",
  "emotion",
]);

/** The reason a single line fails, or null. */
export function lineProblem(line: GuardLine): Rule | null {
  if (line.parts.some((key) => SETTING_PART.test(key)))
    return "institution-part";
  // The event is the sentence: "I went to X School." fails, while "I knew
  // Dawn from X School." (the revision: the person is the event) passes.
  // An initial or an abbreviation ("Nicholas S. Lacorte", "School No. 3")
  // does not end a sentence.
  const sentences = line.text
    .replace(/\b(?:[A-Z]|No|St|Mt|Dr|Jr|Sr|Mr|Mrs|Ms)\. /g, (abbr) =>
      abbr.replace(". ", "\u00a0"),
    )
    .split(/(?<=[.!?])\s+/);
  for (const name of line.institutions ?? [])
    if (
      name &&
      sentences.some(
        (sentence) => sentence.includes(name) && ATTENDING.test(sentence),
      )
    )
      return "institution-event";
  // Any named school, whoever's it is: "Gabriel Day graduated from Lacorte
  // School No. 3." makes the school the event.
  if (
    line.kind !== "conversation" &&
    sentences.some(
      (sentence) =>
        ATTENDING.test(sentence) &&
        /\b(?:School|Elementary|Academy|College|University)\b/.test(sentence),
    )
  )
    return "institution-event";
  // Nobody says a policy's catalog name aloud ("I'm committed to 'bottle
  // deposit'"); people say their bill, what it does, or its moniker (owner,
  // batch 9). Written forms (bill text, notices, minutes) carry the title.
  if (
    SPOKEN.has(line.kind) &&
    (line.titles ?? []).some(
      (title) =>
        title.length > 2 &&
        line.text.toLowerCase().includes(title.toLowerCase()),
    )
  )
    return "policy-name-said";
  for (const title of line.titles ?? []) {
    if (!IMPERATIVE_LEAD(title)) continue;
    const at = line.text.toLowerCase().indexOf(title.toLowerCase());
    if (at < 0) continue;
    const before = line.text.charAt(at - 1);
    if (before !== '"' && before !== "“") return "bare-command-title";
  }
  return null;
}

/* ---------------------------------------------------------------- selection */

export interface Selection<T extends GuardLine> {
  chosen: T[];
  rejections: Rejection[];
  /** Candidates looked at before the batch passed (or ran out). */
  tried: number;
  short: boolean;
}

/**
 * Takes candidates in order, drops any that fails a line rule, and drops any
 * that makes a share unreachable (the share if every remaining slot were
 * distinct would still fall under the threshold). Stops at `wanted` lines.
 */
export function selectPassing<T extends GuardLine>(
  kind: string,
  candidates: readonly T[],
  wanted: number,
  thresholds: Thresholds,
): Selection<T> {
  const limit = thresholds[kind];
  if (!limit) throw new Error(`no thresholds for ${kind}`);
  const chosen: T[] = [];
  const rejections: Rejection[] = [];
  const seen: Record<Measure, Map<string, number>> = {
    openers: new Map(),
    closers: new Map(),
    shapes: new Map(),
    verbs: new Map(),
  };
  const keys = (line: T): Record<Measure, string> => ({
    openers: openerOf(line.text),
    closers: closerOf(line.text),
    shapes: shapeOf(line.text, line.masks),
    verbs: verbOf(line.text),
  });
  const chosenSet = new Set<T>();
  const take = (candidate: T, key: Record<Measure, string>) => {
    chosen.push(candidate);
    chosenSet.add(candidate);
    for (const measure of MEASURES)
      seen[measure].set(
        key[measure],
        (seen[measure].get(key[measure]) ?? 0) + 1,
      );
  };
  // First pass: lines that bring a new opener, a new shape and a new verb, so the
  // batch is spread before any repeat is allowed. Second pass: the rest, under the thresholds.
  for (const pass of ["new", "any"] as const) {
    for (const candidate of candidates) {
      if (chosen.length >= wanted) break;
      if (chosenSet.has(candidate)) continue;
      const problem = lineProblem(candidate);
      const key = keys(candidate);
      const novel = MEASURES.every(
        (measure) => !seen[measure].has(key[measure]),
      );
      if (pass === "new") {
        if (!problem && novel) take(candidate, key);
        continue;
      }
      if (problem) continue;
      const rules: Record<Measure, Rule> = {
        openers: "repeated-opener",
        closers: "repeated-closer",
        shapes: "repeated-shape",
        verbs: "repeated-verb",
      };
      let refused: Rule | null = null;
      for (const measure of MEASURES) {
        const distinct =
          seen[measure].size + (seen[measure].has(key[measure]) ? 0 : 1);
        const reachable = distinct + (wanted - chosen.length - 1);
        if (reachable < Math.ceil(limit[measure] * wanted - 1e-9)) {
          refused = rules[measure];
          break;
        }
      }
      if (refused) continue;
      take(candidate, key);
    }
  }
  // A kind the records cannot fill: drop the latest repeats until the lines left meet the thresholds.
  if (chosen.length < wanted) {
    for (;;) {
      const now = measureLines(kind, chosen);
      if (
        MEASURES.every((m) => now[m] + 1e-9 >= limit[m]) ||
        chosen.length <= 1
      )
        break;
      let drop = -1;
      chosen.forEach((line, at) => {
        const key = keys(line);
        if (
          chosen.some(
            (other, from) =>
              from < at && MEASURES.some((m) => keys(other)[m] === key[m]),
          )
        )
          drop = at;
      });
      if (drop < 0) break;
      const [gone] = chosen.splice(drop, 1);
      chosenSet.delete(gone!);
      for (const m of MEASURES) {
        const k = keys(gone!)[m];
        const left = (seen[m].get(k) ?? 1) - 1;
        if (left > 0) seen[m].set(k, left);
        else seen[m].delete(k);
      }
    }
  }
  // Every candidate looked at before the batch filled and not kept is a rejection, with its reason.
  let last = -1;
  candidates.forEach((candidate, at) => {
    if (chosenSet.has(candidate)) last = at;
  });
  const reach = chosen.length < wanted ? candidates.length : last + 1;
  const names: Record<Measure, Rule> = {
    openers: "repeated-opener",
    closers: "repeated-closer",
    shapes: "repeated-shape",
    verbs: "repeated-verb",
  };
  candidates.slice(0, reach).forEach((candidate) => {
    if (chosenSet.has(candidate)) return;
    const problem = lineProblem(candidate);
    const key = keys(candidate);
    const repeated = MEASURES.find((measure) =>
      seen[measure].has(key[measure]),
    );
    rejections.push({
      rule: problem ?? (repeated ? names[repeated] : "repeated-shape"),
      kind,
      text: candidate.text,
    });
  });
  return { chosen, rejections, tried: reach, short: chosen.length < wanted };
}

/** The whole batch against the table: every failing kind and every failing line. */
export function checkBatch(
  lines: readonly GuardLine[],
  thresholds: Thresholds,
): { failures: string[]; rejections: Rejection[]; measures: KindMeasure[] } {
  const failures: string[] = [];
  const rejections: Rejection[] = [];
  const measures: KindMeasure[] = [];
  const kinds = [...new Set(lines.map((line) => line.kind))];
  for (const kind of kinds) {
    const own = lines.filter((line) => line.kind === kind);
    for (const line of own) {
      const problem = lineProblem(line);
      if (problem) {
        rejections.push({ rule: problem, kind, text: line.text });
        failures.push(`${kind}: ${problem}: ${line.text.slice(0, 80)}`);
      }
    }
    const measured = measureLines(kind, own);
    measures.push(measured);
    const limit = thresholds[kind];
    if (!limit) {
      failures.push(`${kind}: no thresholds`);
      continue;
    }
    for (const measure of MEASURES)
      if (measured[measure] + 1e-9 < limit[measure])
        failures.push(
          `${kind}: ${measure} ${measured[measure].toFixed(2)} is under ${limit[measure]}`,
        );
  }
  return { failures, rejections, measures };
}

/** Reads a batch file's lines for a standalone check. */
export function linesOfBatchFile(path: string): GuardLine[] {
  const batch = JSON.parse(readFileSync(path, "utf8")) as {
    items: {
      kind: string;
      text: string;
      lineParts: string[];
      sourceRecordIds: string[];
      guard?: { masks?: string[]; institutions?: string[]; titles?: string[] };
    }[];
  };
  return batch.items.map((item) => ({
    kind: item.kind,
    text: item.text,
    parts: item.lineParts,
    sourceRecordIds: item.sourceRecordIds,
    ...item.guard,
  }));
}

/** `npm run dialogue:guard -- <batch file>`: the guard over a written batch. */
if (process.argv[1]?.endsWith("repetition-guard.ts") && process.argv[2]) {
  const lines = linesOfBatchFile(process.argv[2]);
  const kinds = [...new Set(lines.map((line) => line.kind))];
  const result = checkBatch(lines, loadThresholds(kinds));
  for (const measured of result.measures)
    console.log(
      `${measured.kind.padEnd(12)} n=${measured.lines} openers ${measured.openers.toFixed(2)} closers ${measured.closers.toFixed(2)} shapes ${measured.shapes.toFixed(2)} verbs ${measured.verbs.toFixed(2)}`,
    );
  console.log(
    result.failures.length
      ? `FAILS:\n${result.failures.join("\n")}`
      : "the batch passes",
  );
  process.exit(result.failures.length ? 1 : 0);
}
