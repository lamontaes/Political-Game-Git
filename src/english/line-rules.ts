/**
 * The owner's notes on the words, as rules a program can test
 * (`data/english/line-rules.json`; design: `docs/design/words-machine.md`).
 *
 * A rule holds his words, one plain sentence of what it forbids or requires,
 * and a test of one of three kinds: the line's own words (`phrases`,
 * `patterns`, `sentences`), the line's place in its scene (`place`) or its
 * meaning and tone (`judged`). This file reads the first kind and runs it;
 * `place` and `judged` rules wait for their own readers and flag nothing.
 *
 * `runRules` is the whole machine in one pure function: pieces and the
 * ledger in, the pulled list out. A piece that breaks an enforced rule is
 * pulled, unless pulling it would leave one of its spots with no line that
 * breaks no enforced rule; then it waits (it keeps playing and heads the
 * rewrite queue). A piece the owner graded good is never pulled or waiting.
 * A `sample` rule never pulls; the lines it flags go in his next sample.
 *
 * Pure: no files, no world. `scripts/words/run-rules.ts` reads the banks.
 */
import { heldByGrades, type PartGradeLedger } from "./english-grades";
import type { ChoicesReport } from "./choice-sets";
import type { ReplyFollowsReport } from "./reply-pairs";

/**
 * `rewrite`: the lines the rule flags keep playing and go on the rewrite queue
 * (the `waiting` list); a rewrite that passes the rules replaces them (CTO,
 * Nov 10, 2026, on the four journal lines whose first rewrites broke the limit).
 */
export type RuleStatus = "enforced" | "sample" | "rewrite" | "awaiting-test";

export type RuleTest =
  | { readonly kind: "phrases"; readonly phrases: readonly string[] }
  | {
      readonly kind: "patterns";
      readonly patterns: readonly string[];
      /** Test each sentence of a line on its own (patterns anchored with ^ and $). */
      readonly each?: "sentence";
    }
  | { readonly kind: "sentences"; readonly sentences: readonly string[] }
  | {
      readonly kind: "place";
      /** The judged verdicts the picker reads for this rule; the run reports on them. */
      readonly reads?: string;
    }
  | { readonly kind: "judged" };

/**
 * What a rule judges: `line` (one line alone), `set` (the replies offered
 * together), `exchange` (a line with what it answers, or a scene's opener and
 * close together) or `piece-in-context` (a line with the record or screen it
 * sits on, such as a journal line's subject).
 */
export type RuleJudges = "line" | "set" | "exchange" | "piece-in-context";

export const RULE_JUDGES: readonly RuleJudges[] = [
  "line",
  "set",
  "exchange",
  "piece-in-context",
];

export interface RuleApplies {
  readonly banks?: readonly string[];
  readonly kinds?: readonly ("spoken" | "written")[];
  /** A regular expression source tested on the piece's move. */
  readonly moves?: string;
}

export interface LineRule {
  readonly id: string;
  readonly says: string;
  /** What the rule judges: one line, the replies together, an exchange, or a line in its context. */
  readonly judges: RuleJudges;
  /**
   * Set where the rule judges a `set` or an `exchange` but its detector still
   * reads one line at a time, so the mismatch is visible until a reader of the
   * whole is built.
   */
  readonly detectorReads?: "line";
  /**
   * What the owner said, short and exact. Research-only rules have none. A
   * `via` says the words are not his recorded voice but how a log, a ruling or
   * a grade row put them.
   */
  readonly from: readonly {
    readonly date: string;
    readonly words: string;
    readonly via?: string;
  }[];
  /** Where a rule with no words of his comes from. */
  readonly research?: readonly string[];
  /** Why a rule is a sample, or what his notes disagree on. */
  readonly note?: string;
  readonly status: RuleStatus;
  /** A rule that failed the build before the machine existed keeps doing so. */
  readonly failsBuild?: boolean;
  readonly test: RuleTest;
  readonly applies?: RuleApplies;
  readonly catches?: readonly string[];
  readonly spares?: readonly string[];
  /**
   * Lines he faulted for where they were said, not for their words: what came
   * before, when they played, or a record they contradict. They stay in play;
   * the judging of place and tense (steps 3 and 4) reads them as the cases a
   * place rule must catch. `before` is the line before it when his words give it.
   */
  readonly examples?: readonly {
    readonly line: string;
    readonly before?: string;
    readonly words: string;
    readonly date: string;
    readonly via?: string;
  }[];
}

export interface LineRulesFile {
  readonly schema: "english-line-rules/1";
  readonly about: string;
  readonly rules: readonly LineRule[];
}

/** One use of a piece: where it is said. Bank files hold more fields; these identify the spot. */
export type PieceUse = Readonly<Record<string, unknown>>;

/** A bank piece as the bank files hold it. */
export interface RulePiece {
  readonly bank: string;
  readonly key: string;
  readonly text: string;
  readonly kind: string;
  readonly move: string;
  readonly uses: readonly PieceUse[];
}

const plainQuotes = (text: string): string =>
  text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

const squash = (text: string): string =>
  plainQuotes(text).replace(/\s+/g, " ").trim().toLowerCase();

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const phraseCache = new Map<string, RegExp>();
function phraseExpression(phrase: string): RegExp {
  let found = phraseCache.get(phrase);
  if (!found) {
    found = new RegExp(
      `(?:^|[^a-z0-9'])${escapeRegExp(squash(phrase))}(?:$|[^a-z0-9'])`,
    );
    phraseCache.set(phrase, found);
  }
  return found;
}

const patternCache = new Map<string, RegExp>();
function patternExpression(source: string): RegExp {
  let found = patternCache.get(source);
  if (!found) {
    found = new RegExp(source, "i");
    patternCache.set(source, found);
  }
  return found;
}

/** A whole line, lower case, quotes plain, spaces single, edge punctuation off. */
export function wholeLine(text: string): string {
  return squash(text).replace(/^[^\p{L}\p{N}{]+|[^\p{L}\p{N}}]+$/gu, "");
}

/** Whether a rule's `applies` covers this piece. */
export function ruleApplies(rule: LineRule, piece: RulePiece): boolean {
  const { applies } = rule;
  if (!applies) return true;
  if (applies.banks && !applies.banks.includes(piece.bank)) return false;
  if (
    applies.kinds &&
    !(applies.kinds as readonly string[]).includes(piece.kind)
  )
    return false;
  if (applies.moves && !patternExpression(applies.moves).test(piece.move))
    return false;
  return true;
}

/** Whether the piece breaks this rule. `place` and `judged` rules flag nothing yet. */
export function ruleFlags(rule: LineRule, piece: RulePiece): boolean {
  const { test } = rule;
  if (test.kind === "place" || test.kind === "judged") return false;
  if (!ruleApplies(rule, piece)) return false;
  if (test.kind === "phrases") {
    const text = squash(piece.text);
    return test.phrases.some((phrase) => phraseExpression(phrase).test(text));
  }
  if (test.kind === "patterns") {
    const parts =
      test.each === "sentence"
        ? piece.text.split(/(?<=[.!?])\s+/)
        : [piece.text];
    return test.patterns.some((source) => {
      const expression = patternExpression(source);
      return parts.some((part) => expression.test(part));
    });
  }
  const line = wholeLine(piece.text);
  return test.sentences.some((sentence) => wholeLine(sentence) === line);
}

/** A bare string as a piece, for text that is not in a bank (a screen string, a corpus shape). */
export function textAsPiece(text: string): RulePiece {
  return { bank: "", key: "", text, kind: "", move: "", uses: [] };
}

/**
 * Whether the rule's test breaks on this text wherever it is said: `applies`
 * is ignored. A rule's `catches` and `spares` are checked this way, so they
 * are plain lines and need no bank or move.
 */
export function textBreaksRule(rule: LineRule, text: string): boolean {
  return ruleFlags({ ...rule, applies: undefined }, textAsPiece(text));
}

/** The spot identity fields of a use: what the pickers treat as alternatives. */
const SPOT_FIELDS = [
  "subject",
  "role",
  "move",
  "choice",
  "key",
  "step",
  "purpose",
  "after",
  "outcome",
] as const;

/**
 * Where a line is said. Two pieces are alternatives, and one may stand in for
 * the other, when they have the same bank and the same subject, role, move,
 * choice, key, step, purpose, after and outcome in one of their uses. These
 * are the fields the pickers match on (scene talk's `fitting`, the mined
 * banks' `variants`); the facts a use requires or excludes are not part of
 * the identity, because they only decide which alternative the world allows.
 */
export function spotsOf(piece: RulePiece): string[] {
  const spots = new Set<string>();
  for (const use of piece.uses)
    spots.add(
      [
        piece.bank,
        ...SPOT_FIELDS.map((field) => {
          const value = use[field];
          return value === undefined || value === null ? "" : String(value);
        }),
      ].join("|"),
    );
  return [...spots];
}

/**
 * A spot whose set of replies is short of four different answers: the groups
 * it offers, how many more it needs, and the groups it is missing (those its
 * own moves allow with no line written here first, then the groups a new move
 * fills a gap with). The writer's list: a spot, never a line.
 */
export interface SpotGap {
  readonly offers: readonly string[];
  readonly needs: number;
  readonly missing: readonly string[];
  readonly problems: readonly string[];
}

export interface RuleCount {
  /** Pieces that break the rule (any status, held or not, good or not). */
  readonly flagged: number;
  readonly pulled: number;
  readonly waiting: number;
  readonly examples: readonly string[];
  /** What a place rule reports about its judged verdicts (`reply-follows-the-line-before`). */
  readonly report?: ReplyFollowsReport;
  /** What the choices rule reports about the sets of replies spots offer (`four-replies-are-four-answers`). */
  readonly choices?: ChoicesReport;
}

export interface RunTotals {
  readonly pieces: number;
  readonly heldByGrades: number;
  readonly playableBefore: number;
  readonly playableAfter: number;
  readonly pulled: number;
  readonly waiting: number;
  readonly sample: number;
  readonly spots: number;
  readonly spotsWithOneLine: number;
  /** Spots whose every playable line is flagged, so every flagged line there waits. */
  readonly spotsLeftWithOnlyWaiting: number;
  /** Spots that had a playable line before the run and have none after it. Always 0. */
  readonly spotsMadeSilent: number;
  /** Spots whose sets of replies the choices rule read, and how many offer fewer than four different answers. */
  readonly replySpotsRead: number;
  readonly replySpotsShort: number;
}

/** What the place rules' own readers found, for the run to carry (`scripts/words/run-rules.ts` builds them). */
export interface PlaceReports {
  readonly "reply-follows-the-line-before"?: ReplyFollowsReport;
  readonly "four-replies-are-four-answers"?: ChoicesReport;
}

/** The place rule that reads the whole set of replies a spot offers together. */
export const CHOICES_RULE = "four-replies-are-four-answers";

export interface RunResult {
  readonly pulled: Readonly<Record<string, readonly string[]>>;
  readonly waiting: Readonly<Record<string, readonly string[]>>;
  readonly sample: Readonly<Record<string, readonly string[]>>;
  /** The rewrite queue of the reply rule: lines no reply follows, with where one is needed. */
  readonly noReplyFollows: Readonly<Record<string, readonly string[]>>;
  /** An enforced rule flags a piece the owner graded good: the rule is wrong. */
  readonly conflicts: readonly {
    readonly key: string;
    readonly rule: string;
  }[];
  /**
   * Spots whose set of replies is short of four different answers (the choices
   * rule), by spot id. Not lines to rewrite: the spot needs another reply of a
   * group it lacks.
   */
  readonly gaps: Readonly<Record<string, SpotGap>>;
  readonly perRule: Readonly<Record<string, RuleCount>>;
  readonly totals: RunTotals;
}

/** Whether the owner graded the piece good (he liked it, so no rule may touch it). */
export function gradedGood(key: string, ledger: PartGradeLedger): boolean {
  return (ledger.parts[key]?.good ?? 0) > 0;
}

const sortedRecord = (
  record: Map<string, string[]>,
): Record<string, string[]> =>
  Object.fromEntries(
    [...record.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );

/**
 * Runs every rule over every piece. Deterministic and independent of the
 * order of `pieces`. A piece is pulled when it breaks an enforced rule, is
 * not graded good, is not already held by the grades, and every one of its
 * spots keeps at least one playable line that breaks no enforced rule. When
 * a spot has none, every flagged line in it waits instead.
 */
export function runRules(
  rules: readonly LineRule[],
  pieces: readonly RulePiece[],
  ledger: PartGradeLedger,
  places: PlaceReports = {},
): RunResult {
  const enforced = rules.filter((rule) => rule.status === "enforced");
  const samples = rules.filter((rule) => rule.status === "sample");
  const rewrites = rules.filter((rule) => rule.status === "rewrite");
  const broken = new Map<string, string[]>();
  const queued = new Map<string, string[]>();
  const sampled = new Map<string, string[]>();
  const conflicts: { key: string; rule: string }[] = [];
  const perRule = new Map<
    string,
    { flagged: number; pulled: number; waiting: number; examples: string[] }
  >();
  const count = (id: string) => {
    let row = perRule.get(id);
    if (!row) {
      row = { flagged: 0, pulled: 0, waiting: 0, examples: [] };
      perRule.set(id, row);
    }
    return row;
  };
  for (const rule of rules) count(rule.id);
  const held = new Set<string>();
  const good = new Set<string>();
  for (const piece of pieces) {
    if (heldByGrades(piece.key, ledger)) held.add(piece.key);
    if (gradedGood(piece.key, ledger)) good.add(piece.key);
    for (const rule of enforced)
      if (ruleFlags(rule, piece)) {
        const row = count(rule.id);
        row.flagged += 1;
        row.examples.push(piece.key);
        if (good.has(piece.key))
          conflicts.push({ key: piece.key, rule: rule.id });
        else if (!held.has(piece.key)) {
          const list = broken.get(piece.key) ?? [];
          list.push(rule.id);
          broken.set(piece.key, list);
        }
      }
    for (const rule of samples)
      if (ruleFlags(rule, piece)) {
        const row = count(rule.id);
        row.flagged += 1;
        row.examples.push(piece.key);
        const list = sampled.get(piece.key) ?? [];
        list.push(rule.id);
        sampled.set(piece.key, list);
      }
    for (const rule of rewrites)
      if (ruleFlags(rule, piece)) {
        const row = count(rule.id);
        row.flagged += 1;
        row.examples.push(piece.key);
        if (!held.has(piece.key)) {
          const list = queued.get(piece.key) ?? [];
          list.push(rule.id);
          queued.set(piece.key, list);
        }
      }
  }
  // The choices rule reads sets, not lines. A short set is a gap in a spot
  // (it needs another reply of a group it lacks), so nothing is pulled or
  // queued: the flagged spots are their own list.
  const choices = places[CHOICES_RULE];
  const gaps: Record<string, SpotGap> = {};
  if (choices && enforced.some((rule) => rule.id === CHOICES_RULE))
    for (const flag of choices.flagged) {
      gaps[flag.spot] = {
        offers: [...new Set(flag.replies.map((reply) => reply.group))].sort(),
        needs: flag.needs,
        missing: flag.missing,
        problems: flag.problems,
      };
      const row = count(CHOICES_RULE);
      row.flagged += 1;
      row.examples.push(flag.spot);
    }
  // Spots: who can say what, and which of them is safe (plays, breaks nothing).
  const spotPieces = new Map<string, RulePiece[]>();
  for (const piece of pieces)
    for (const spot of spotsOf(piece)) {
      const list = spotPieces.get(spot) ?? [];
      list.push(piece);
      spotPieces.set(spot, list);
    }
  const safe = (piece: RulePiece) =>
    !held.has(piece.key) && (!broken.has(piece.key) || good.has(piece.key));
  const spotHasSafe = new Map<string, boolean>();
  for (const [spot, list] of spotPieces) spotHasSafe.set(spot, list.some(safe));
  const pulled = new Map<string, string[]>();
  const waiting = new Map<string, string[]>();
  const byKey = new Map(pieces.map((piece) => [piece.key, piece]));
  for (const [key, ids] of broken) {
    const piece = byKey.get(key)!;
    const ok = spotsOf(piece).every((spot) => spotHasSafe.get(spot));
    (ok ? pulled : waiting).set(key, ids);
    for (const id of ids) count(id)[ok ? "pulled" : "waiting"] += 1;
  }
  // A rewrite rule never pulls: its lines wait, still playing, unless an enforced rule pulled them.
  for (const [key, ids] of queued) {
    if (pulled.has(key)) continue;
    waiting.set(key, [...(waiting.get(key) ?? []), ...ids]);
    for (const id of ids) count(id).waiting += 1;
  }
  let playableBefore = 0;
  let playableAfter = 0;
  for (const piece of pieces)
    if (!held.has(piece.key)) {
      playableBefore += 1;
      if (!pulled.has(piece.key)) playableAfter += 1;
    }
  let oneLine = 0;
  let onlyWaiting = 0;
  let silent = 0;
  for (const list of spotPieces.values()) {
    const playingBefore = list.filter((piece) => !held.has(piece.key));
    const playingAfter = playingBefore.filter(
      (piece) => !pulled.has(piece.key),
    );
    if (list.length === 1) oneLine += 1;
    if (playingBefore.length > 0 && playingAfter.length === 0) silent += 1;
    if (
      playingAfter.length > 0 &&
      playingAfter.every((piece) => waiting.has(piece.key))
    )
      onlyWaiting += 1;
  }
  return {
    pulled: sortedRecord(pulled),
    waiting: sortedRecord(waiting),
    sample: sortedRecord(sampled),
    conflicts: conflicts.sort((a, b) =>
      a.key === b.key ? (a.rule < b.rule ? -1 : 1) : a.key < b.key ? -1 : 1,
    ),
    gaps: Object.fromEntries(
      Object.entries(gaps).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
    perRule: Object.fromEntries(
      [...perRule].map(([id, row]) => [
        id,
        {
          ...row,
          examples: row.examples.sort().slice(0, 5),
          ...(id === "reply-follows-the-line-before" &&
          places["reply-follows-the-line-before"]
            ? { report: places["reply-follows-the-line-before"] }
            : {}),
          ...(id === CHOICES_RULE && places[CHOICES_RULE]
            ? { choices: places[CHOICES_RULE] }
            : {}),
        },
      ]),
    ),
    noReplyFollows:
      places["reply-follows-the-line-before"]?.noReplyFollows ?? {},
    totals: {
      pieces: pieces.length,
      heldByGrades: held.size,
      playableBefore,
      playableAfter,
      pulled: pulled.size,
      waiting: waiting.size,
      sample: sampled.size,
      spots: spotPieces.size,
      spotsWithOneLine: oneLine,
      spotsLeftWithOnlyWaiting: onlyWaiting,
      spotsMadeSilent: silent,
      replySpotsRead: choices?.spots ?? 0,
      replySpotsShort: Object.keys(gaps).length,
    },
  };
}

/** The file `scripts/words/run-rules.ts` writes and `bank-parts.ts` reads. */
export interface PulledFile {
  readonly schema: "english-pulled/1";
  readonly pulled: Readonly<Record<string, readonly string[]>>;
  readonly waiting: Readonly<Record<string, readonly string[]>>;
  readonly sample: Readonly<Record<string, readonly string[]>>;
  /** Lines after which no reply that fits follows: a new reply is needed (`spot` is `purpose/move`). */
  readonly noReplyFollows: Readonly<Record<string, readonly string[]>>;
  /** Spots that offer fewer than four different answers, by spot id: the groups they offer, how many more they need and the groups they are missing. Read by the writer (Story), never by play. */
  readonly gaps: Readonly<Record<string, SpotGap>>;
}

export function pulledFileOf(result: RunResult): PulledFile {
  return {
    schema: "english-pulled/1",
    pulled: result.pulled,
    waiting: result.waiting,
    sample: result.sample,
    noReplyFollows: result.noReplyFollows,
    gaps: result.gaps,
  };
}
