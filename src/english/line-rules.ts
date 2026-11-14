/**
 * The owner's notes on the words, as rules a program can test
 * (`data/english/line-rules.json`; design: `docs/design/words-machine.md`).
 *
 * A rule holds his words, one plain sentence of what it forbids or requires,
 * and a test of one of four kinds: the line's own words (`phrases`,
 * `patterns`, `sentences`), the line's place in its scene (`place`), its
 * meaning and tone (`judged`), or whole composed texts (`composed`, read by
 * `./composed-checks.ts` over texts played in drawn worlds, never here). This file reads the first kind and runs it. A
 * `judged` rule reads its saved verdicts (`./judged.ts`): a line a reviewer
 * judged "no" is flagged, a line nobody has judged passes and is counted as
 * waiting for a verdict. A `place` rule's own reader runs outside the run.
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
import { verdictId, verdictOf, type JudgedStores } from "./judged";
import type { ReplyFollowsReport } from "./reply-pairs";
import { spotTags } from "./spot-tags";
import { useSpotId } from "./spot-id";

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
  | { readonly kind: "judged" }
  | {
      /**
       * Reads whole composed texts made in drawn worlds, not bank lines
       * (`./composed-checks.ts`, `npm run words:composed`): the named checks
       * run over the texts of the listed kinds (all kinds when none).
       */
      readonly kind: "composed";
      readonly check: string | readonly string[];
      readonly applies?: readonly string[];
    };

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

/**
 * A condition on where a piece is said, read from one of its uses: the tags
 * the composer chooses by (subject, role, purpose, step, the facts a use
 * requires or excludes, and the part's own bearing, voice, address kind,
 * topic and device, which `usesWithTags` copies onto every use). Each value
 * is a regular expression source tested on the tag (on each entry of a list).
 */
export interface UseCondition {
  /** Every named tag holds a value that matches. */
  readonly has?: Readonly<Record<string, string>>;
  /** No named tag holds a value that matches; a tag the use does not have matches nothing. */
  readonly lacks?: Readonly<Record<string, string>>;
}

export interface RuleApplies {
  readonly banks?: readonly string[];
  readonly kinds?: readonly ("spoken" | "written")[];
  /** A regular expression source tested on the piece's move. */
  readonly moves?: string;
  /** The piece is covered where one of its uses meets this condition. */
  readonly uses?: UseCondition;
}

/**
 * A line a rule must catch or spare. A bare string is the line wherever it is
 * said (the rule's `applies` is ignored); a line with its spot is tested
 * where it is said, for a rule that tells two lines apart by their place.
 */
export type RuleCase =
  | string
  | {
      readonly text: string;
      readonly bank?: string;
      readonly kind?: string;
      readonly move?: string;
      readonly use?: PieceUse;
    };

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
  /** Where the rule applies; a list applies where any one of its entries does. */
  readonly applies?: RuleApplies | readonly RuleApplies[];
  readonly catches?: readonly RuleCase[];
  readonly spares?: readonly RuleCase[];
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

/**
 * A bank piece as the bank files hold it. Each use carries the part's own
 * tags too (`usesWithTags`), so a rule's `applies.uses` reads one record of
 * where and how the piece is said.
 */
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

/**
 * The part's own tags the composer chooses by, copied onto each use: how the
 * line is said (`bearing`, `voice`), the address it belongs to
 * (`addressKind`), what it is about (`topic`) and its turn of speech
 * (`device`). None of them is a spot field, so `spotsOf` is unchanged.
 */
export const PART_TAGS = [
  "bearing",
  "voice",
  "addressKind",
  "topic",
  "device",
] as const;

/**
 * A part's uses with its own tags on each, and who says it to whom and where
 * (`spotTags`, read from the director's situation types); a use's own value
 * wins.
 */
export function usesWithTags(
  part: Readonly<Record<string, unknown>>,
  uses: readonly PieceUse[],
): PieceUse[] {
  const tags: Record<string, unknown> = {};
  for (const tag of PART_TAGS)
    if (part[tag] !== undefined && part[tag] !== null) tags[tag] = part[tag];
  return uses.map((use) => ({ ...tags, ...spotTags(use), ...use }));
}

function tagMatches(use: PieceUse, tag: string, source: string): boolean {
  const value = use[tag];
  if (value === undefined || value === null) return false;
  const expression = patternExpression(source);
  return (Array.isArray(value) ? value : [value]).some((entry) =>
    expression.test(typeof entry === "string" ? entry : JSON.stringify(entry)),
  );
}

/** Whether one use meets a use condition. */
export function useMeets(condition: UseCondition, use: PieceUse): boolean {
  return (
    Object.entries(condition.has ?? {}).every(([tag, source]) =>
      tagMatches(use, tag, source),
    ) &&
    !Object.entries(condition.lacks ?? {}).some(([tag, source]) =>
      tagMatches(use, tag, source),
    )
  );
}

function appliesTo(applies: RuleApplies, piece: RulePiece): boolean {
  if (applies.banks && !applies.banks.includes(piece.bank)) return false;
  if (
    applies.kinds &&
    !(applies.kinds as readonly string[]).includes(piece.kind)
  )
    return false;
  if (applies.moves && !patternExpression(applies.moves).test(piece.move))
    return false;
  if (applies.uses && !piece.uses.some((use) => useMeets(applies.uses!, use)))
    return false;
  return true;
}

/** Whether a rule's `applies` covers this piece. */
export function ruleApplies(rule: LineRule, piece: RulePiece): boolean {
  const { applies } = rule;
  if (!applies) return true;
  const entries: readonly RuleApplies[] = Array.isArray(applies)
    ? applies
    : [applies as RuleApplies];
  return entries.some((entry) => appliesTo(entry, piece));
}

/** Whether a `judged` rule judges one line at a time (alone or in its spot); a set or an exchange is keyed by words-machine part 3. */
export const judgesLines = (rule: LineRule): boolean =>
  rule.test.kind === "judged" &&
  (rule.judges === "line" || rule.judges === "piece-in-context");

/** The lines a `judged` rule judges now: those it applies to that the grades do not hold. */
export function lineSubjects(
  rule: LineRule,
  pieces: readonly RulePiece[],
  ledger: PartGradeLedger,
): RulePiece[] {
  if (!judgesLines(rule)) return [];
  return pieces.filter(
    (piece) => ruleApplies(rule, piece) && !heldByGrades(piece.key, ledger),
  );
}

const pieceIds = new WeakMap<RulePiece, string>();
/** A line's verdict id: its key and its exact words. */
export function pieceVerdictId(piece: RulePiece): string {
  let id = pieceIds.get(piece);
  if (id === undefined) {
    id = verdictId([piece.key], [piece.text]);
    pieceIds.set(piece, id);
  }
  return id;
}

/**
 * Whether a `judged` rule judges a line in each spot it is said (words
 * machine, part 2): the same words can be right from an aunt and wrong from a
 * stranger, so a verdict is about one use, and a "no" takes the line out of
 * that spot only (`pulledUses`).
 */
export const judgesSpots = (rule: LineRule): boolean =>
  rule.test.kind === "judged" && rule.judges === "piece-in-context";

/** The key a spot verdict carries beside the piece's key: `spot:` and the use's spot. */
export const SPOT_KEY = "spot:";

export const isSpotKey = (key: string): boolean => key.startsWith(SPOT_KEY);

/** One line in one spot, as a reviewer judges it. */
export interface SpotSubject {
  readonly piece: RulePiece;
  readonly use: PieceUse;
  /** The use's spot within its bank (`useSpotId`). */
  readonly spot: string;
  readonly keys: readonly [string, string];
  readonly id: string;
}

/** A line's verdict id in one spot: its key, the spot and its exact words. */
export function spotVerdictId(piece: RulePiece, spot: string): string {
  return verdictId([piece.key, `${SPOT_KEY}${spot}`], [piece.text, ""]);
}

/**
 * The spots of one piece a spot rule judges: each distinct spot of a use the
 * rule's `applies` covers (with `applies.uses`, only the uses that meet it).
 */
export function pieceSpotSubjects(
  rule: LineRule,
  piece: RulePiece,
): SpotSubject[] {
  if (!ruleApplies(rule, piece)) return [];
  const entries: readonly RuleApplies[] = !rule.applies
    ? [{}]
    : Array.isArray(rule.applies)
      ? rule.applies
      : [rule.applies as RuleApplies];
  const seen = new Map<string, SpotSubject>();
  for (const use of piece.uses) {
    const covered = entries.some(
      (entry) =>
        appliesTo({ ...entry, uses: undefined }, piece) &&
        (!entry.uses || useMeets(entry.uses, use)),
    );
    if (!covered) continue;
    const spot = useSpotId(use);
    if (!seen.has(spot))
      seen.set(spot, {
        piece,
        use,
        spot,
        keys: [piece.key, `${SPOT_KEY}${spot}`],
        id: spotVerdictId(piece, spot),
      });
  }
  return [...seen.values()];
}

/** Every line-in-spot a spot rule judges now: the grades do not hold the line. */
export function spotSubjects(
  rule: LineRule,
  pieces: readonly RulePiece[],
  ledger: PartGradeLedger,
): SpotSubject[] {
  if (!judgesSpots(rule)) return [];
  return pieces
    .filter((piece) => !heldByGrades(piece.key, ledger))
    .flatMap((piece) => pieceSpotSubjects(rule, piece));
}

/** The spots (`useSpotId`) where a reviewer judged the piece "no" for this rule. */
export function spotsJudgedNo(
  rule: LineRule,
  piece: RulePiece,
  stores?: JudgedStores,
): string[] {
  if (!judgesSpots(rule)) return [];
  const store = stores?.get(rule.id);
  if (!store) return [];
  return pieceSpotSubjects(rule, piece)
    .filter((subject) => verdictOf(store, subject.id) === "no")
    .map((subject) => subject.spot);
}

/** Whether every place the piece is said is a spot judged "no": then the whole line goes. */
function everySpotNo(piece: RulePiece, no: readonly string[]): boolean {
  if (!no.length) return false;
  const set = new Set(no);
  return piece.uses.every((use) => set.has(useSpotId(use)));
}

/**
 * Whether the piece breaks this rule. A `judged` rule flags a line a reviewer
 * judged "no" in these exact words (`stores`); a `place` rule flags nothing
 * here, its reader works where the line is said; a `composed` rule flags no
 * bank line, it reads whole texts (`npm run words:composed`).
 */
export function ruleFlags(
  rule: LineRule,
  piece: RulePiece,
  stores?: JudgedStores,
): boolean {
  const { test } = rule;
  if (test.kind === "place" || test.kind === "composed") return false;
  if (!ruleApplies(rule, piece)) return false;
  if (test.kind === "judged" && judgesSpots(rule))
    return everySpotNo(piece, spotsJudgedNo(rule, piece, stores));
  if (test.kind === "judged")
    return (
      judgesLines(rule) &&
      verdictOf(stores?.get(rule.id), pieceVerdictId(piece)) === "no"
    );
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

/** The words of a case, for checks that read only the line. */
export const caseText = (line: RuleCase): string =>
  typeof line === "string" ? line : line.text;

/**
 * Whether the rule breaks on a case: a bare line wherever it is said
 * (`textBreaksRule`), a line with its spot where it is said.
 */
export function caseBreaksRule(rule: LineRule, line: RuleCase): boolean {
  if (typeof line === "string") return textBreaksRule(rule, line);
  return ruleFlags(rule, {
    bank: line.bank ?? "",
    key: "",
    text: line.text,
    kind: line.kind ?? "",
    move: line.move ?? "",
    uses: line.use ? [line.use] : [],
  });
}

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
  for (const use of piece.uses) spots.add(`${piece.bank}|${useSpotId(use)}`);
  return [...spots];
}

export interface RuleCount {
  /** Pieces that break the rule (any status, held or not, good or not). */
  readonly flagged: number;
  readonly pulled: number;
  readonly waiting: number;
  readonly examples: readonly string[];
  /** What a place rule reports about its judged verdicts (`reply-follows-the-line-before`). */
  readonly report?: ReplyFollowsReport;
  /** A `judged` rule's verdicts on the lines it judges now. */
  readonly verdicts?: VerdictCount;
}

/** For a `judged` rule: lines with a verdict in their current words, of them judged bad, and lines with none. */
export interface VerdictCount {
  readonly judged: number;
  readonly bad: number;
  readonly waiting: number;
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
}

/** What the place rules' own readers found, for the run to carry (`scripts/words/run-rules.ts` builds them). */
export interface PlaceReports {
  readonly "reply-follows-the-line-before"?: ReplyFollowsReport;
}

export interface RunResult {
  readonly pulled: Readonly<Record<string, readonly string[]>>;
  /** Lines taken out of some of their spots only: key -> spots (`useSpotId`). */
  readonly pulledUses: Readonly<Record<string, readonly string[]>>;
  readonly waiting: Readonly<Record<string, readonly string[]>>;
  readonly sample: Readonly<Record<string, readonly string[]>>;
  /** The rewrite queue of the reply rule: lines no reply follows, with where one is needed. */
  readonly noReplyFollows: Readonly<Record<string, readonly string[]>>;
  /** An enforced rule flags a piece the owner graded good: the rule is wrong. */
  readonly conflicts: readonly {
    readonly key: string;
    readonly rule: string;
  }[];
  readonly perRule: Readonly<Record<string, RuleCount>>;
  /**
   * For each `judged` rule past `awaiting-test`: lines it judges that have no
   * verdict in their current words. The English guard fails, by the rule's
   * name, when one is higher than the committed count (the backlog only falls).
   */
  readonly awaitingVerdict: Readonly<Record<string, number>>;
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
  stores: JudgedStores = new Map(),
): RunResult {
  const enforced = rules.filter((rule) => rule.status === "enforced");
  const samples = rules.filter((rule) => rule.status === "sample");
  const rewrites = rules.filter((rule) => rule.status === "rewrite");
  const broken = new Map<string, string[]>();
  /** Lines judged "no" in some spots: key -> spot (`useSpotId`) -> rules. */
  const spotBroken = new Map<string, Map<string, string[]>>();
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
  const verdicts = new Map<string, VerdictCount>();
  const awaitingVerdict: Record<string, number> = {};
  for (const rule of rules.filter(judgesLines)) {
    const store = stores.get(rule.id);
    // A spot rule judges each line in each spot it is said; another, each line.
    const judging = judgesSpots(rule)
      ? spotSubjects(rule, pieces, ledger).map((subject) => subject.id)
      : lineSubjects(rule, pieces, ledger).map(pieceVerdictId);
    let judged = 0;
    let bad = 0;
    for (const id of judging) {
      const verdict = verdictOf(store, id);
      if (verdict) judged += 1;
      if (verdict === "no") bad += 1;
    }
    const waiting = judging.length - judged;
    verdicts.set(rule.id, { judged, bad, waiting });
    if (rule.status !== "awaiting-test") awaitingVerdict[rule.id] = waiting;
  }
  const held = new Set<string>();
  const good = new Set<string>();
  for (const piece of pieces) {
    if (heldByGrades(piece.key, ledger)) held.add(piece.key);
    if (gradedGood(piece.key, ledger)) good.add(piece.key);
    for (const rule of enforced) {
      // A line judged "no" in some of its spots, not all: it leaves those spots only.
      if (judgesSpots(rule) && !ruleFlags(rule, piece, stores))
        for (const spot of spotsJudgedNo(rule, piece, stores)) {
          const row = count(rule.id);
          row.flagged += 1;
          row.examples.push(piece.key);
          if (good.has(piece.key))
            conflicts.push({ key: piece.key, rule: rule.id });
          else if (!held.has(piece.key)) {
            const bySpot = spotBroken.get(piece.key) ?? new Map();
            bySpot.set(spot, [...(bySpot.get(spot) ?? []), rule.id]);
            spotBroken.set(piece.key, bySpot);
          }
        }
      if (ruleFlags(rule, piece, stores)) {
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
    }
    for (const rule of samples)
      if (
        ruleFlags(rule, piece, stores) ||
        spotsJudgedNo(rule, piece, stores).length
      ) {
        const row = count(rule.id);
        row.flagged += 1;
        row.examples.push(piece.key);
        const list = sampled.get(piece.key) ?? [];
        list.push(rule.id);
        sampled.set(piece.key, list);
      }
    for (const rule of rewrites)
      if (ruleFlags(rule, piece, stores)) {
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
  // A spot pull: the line leaves one spot when that spot keeps another
  // playable line that breaks nothing there; else it waits, still playing.
  const pulledUses = new Map<string, string[]>();
  const spotPulled = (piece: RulePiece, spot: string) =>
    spotBroken.get(piece.key)?.has(spot) ?? false;
  for (const [key, bySpot] of spotBroken) {
    const piece = byKey.get(key)!;
    if (pulled.has(key)) continue;
    for (const [spot, ids] of bySpot) {
      const others = spotPieces.get(`${piece.bank}|${spot}`) ?? [];
      const ok = others.some(
        (other) =>
          other.key !== key &&
          safe(other) &&
          !pulled.has(other.key) &&
          !spotPulled(other, spot),
      );
      if (ok) pulledUses.set(key, [...(pulledUses.get(key) ?? []), spot]);
      else waiting.set(key, [...(waiting.get(key) ?? []), ...ids]);
      for (const id of ids) count(id)[ok ? "pulled" : "waiting"] += 1;
    }
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
  for (const [spotId, list] of spotPieces) {
    const spot = spotId.slice(spotId.indexOf("|") + 1);
    const playingBefore = list.filter((piece) => !held.has(piece.key));
    const playingAfter = playingBefore.filter(
      (piece) =>
        !pulled.has(piece.key) &&
        !(pulledUses.get(piece.key) ?? []).includes(spot),
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
    pulledUses: sortedRecord(
      new Map([...pulledUses].map(([key, spots]) => [key, spots.sort()])),
    ),
    waiting: sortedRecord(waiting),
    sample: sortedRecord(sampled),
    conflicts: conflicts.sort((a, b) =>
      a.key === b.key ? (a.rule < b.rule ? -1 : 1) : a.key < b.key ? -1 : 1,
    ),
    perRule: Object.fromEntries(
      [...perRule].map(([id, row]) => [
        id,
        {
          ...row,
          examples: row.examples.sort().slice(0, 5),
          ...(verdicts.has(id) ? { verdicts: verdicts.get(id) } : {}),
          ...(places[id as keyof PlaceReports]
            ? { report: places[id as keyof PlaceReports] }
            : {}),
        },
      ]),
    ),
    noReplyFollows:
      places["reply-follows-the-line-before"]?.noReplyFollows ?? {},
    awaitingVerdict: Object.fromEntries(
      Object.entries(awaitingVerdict).sort(([a], [b]) => (a < b ? -1 : 1)),
    ),
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
    },
  };
}

/** The file `scripts/words/run-rules.ts` writes and `bank-parts.ts` reads. */
export interface PulledFile {
  readonly schema: "english-pulled/1";
  readonly pulled: Readonly<Record<string, readonly string[]>>;
  /** Lines a spot rule took out of some spots only (`useSpotId`); play leaves those uses out (`bank-parts.ts`). */
  readonly pulledUses?: Readonly<Record<string, readonly string[]>>;
  readonly waiting: Readonly<Record<string, readonly string[]>>;
  readonly sample: Readonly<Record<string, readonly string[]>>;
  /** Lines after which no reply that fits follows: a new reply is needed (`spot` is `purpose/move`). */
  readonly noReplyFollows: Readonly<Record<string, readonly string[]>>;
  /** Per `judged` rule past `awaiting-test`, lines waiting for a verdict: the count the guard holds new lines to. */
  readonly awaitingVerdict: Readonly<Record<string, number>>;
}

/**
 * The counts of lines waiting for a verdict a run may write: a count may fall
 * or hold, never rise above the committed one. A rule the committed file does
 * not count yet (it just left `awaiting-test`) starts at its fresh count.
 * `rose` names each rule whose fresh count is higher, for the run to refuse.
 */
export function awaitingAfter(
  fresh: Readonly<Record<string, number>>,
  committed: Readonly<Record<string, number>> | undefined,
): {
  readonly counts: Readonly<Record<string, number>>;
  readonly rose: readonly { rule: string; fresh: number; committed: number }[];
} {
  const counts: Record<string, number> = {};
  const rose: { rule: string; fresh: number; committed: number }[] = [];
  for (const [rule, count] of Object.entries(fresh)) {
    const before = committed?.[rule];
    if (before !== undefined && count > before) {
      rose.push({ rule, fresh: count, committed: before });
      counts[rule] = before;
    } else counts[rule] = count;
  }
  return { counts, rose };
}

export function pulledFileOf(
  result: RunResult,
  awaitingVerdict: Readonly<Record<string, number>> = result.awaitingVerdict,
): PulledFile {
  return {
    schema: "english-pulled/1",
    pulled: result.pulled,
    ...(Object.keys(result.pulledUses).length
      ? { pulledUses: result.pulledUses }
      : {}),
    waiting: result.waiting,
    sample: result.sample,
    noReplyFollows: result.noReplyFollows,
    awaitingVerdict,
  };
}
