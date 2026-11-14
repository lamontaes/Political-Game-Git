/**
 * Writes the judging sheets for one rule a reviewer judges, in a directory
 * outside the repository.
 *
 *   npm run words:pairs -- --rule <id> --out <dir>
 *
 * For a `judged` rule about one line (alone or in its spot): the lines the
 * rule applies to that have no verdict in their current words, with what a
 * reviewer needs (`lineSheets`). For the reply rule
 * (`reply-follows-the-line-before`): every pair (line before, reply) the
 * director can produce (`src/english/reply-pairs.ts`), one file per purpose;
 * add `--only-unjudged` to skip pairs already judged, `--observed`,
 * `--per-file`, `--sample` and `--seed` as below. A pair appears on the sheet
 * of the first purpose it is offered in.
 *
 * A reviewer writes `{ rule, verdicts: [{ id, passes, why }] }` beside each
 * sheet; `npm run words:verdicts -- --from <dir>` folds them into the store.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { PartGradeLedger } from "../../src/english/english-grades";
import type { JudgedStore } from "../../src/english/judged";
import type { RulePiece } from "../../src/english/line-rules";
import {
  playableParts,
  readBankPieces,
  readLedger,
  readRules,
  RULES_FILE,
  SCENE_TALK_FILE,
} from "./run-rules";
import type { BankPart } from "../../src/english/scene-talk-words";
import {
  REPLY_FOLLOWS,
  REPLY_FOLLOWS_RUBRIC,
  REPLY_RULE,
  REPLY_STORE,
  type ReplyFollowsTable,
} from "../../src/english/reply-follows";
import {
  distinctPairs,
  pairId,
  replyPairs,
  type ReplyPair,
} from "../../src/english/reply-pairs";
import { hash53, verdictId, verdictOf } from "../../src/english/judged";
import {
  judgesLines,
  judgesSpots,
  lineSubjects,
  pieceVerdictId,
  spotSubjects,
  type LineRule,
} from "../../src/english/line-rules";
import { talkReplyFlow, talkScenes } from "../../src/director/scene-talk";
import { readStore, rubricOf, storeName } from "./verdicts";
import {
  buildTalks,
  observedPairs,
} from "../../tests/support/scene-talk-fixture";

/** Every pair, in the order of the director's scenes (purpose, then key). */
export function pairsOf(
  parts: readonly BankPart[],
  options: { everyFit?: boolean; verdicts?: ReplyFollowsTable } = {},
): ReplyPair[] {
  const scenes = talkScenes().sort(
    (a, b) =>
      (a.purpose < b.purpose ? -1 : a.purpose > b.purpose ? 1 : 0) ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  return replyPairs(parts, {
    scenes,
    flow: talkReplyFlow,
    verdicts: REPLY_FOLLOWS,
    ...options,
  });
}

/** Every bank piece's key, playable or not. */
export function bankKeys(): Set<string> {
  const bank = JSON.parse(readFileSync(SCENE_TALK_FILE, "utf8")) as {
    parts: { key: string }[];
  };
  return new Set(bank.parts.map((part) => part.key));
}

/**
 * Every pair a verdict may be about: any reply any facts could allow after any
 * line, whatever the verdicts say now. A sheet's ids all belong to it.
 */
export function knownPairs(): ReplyPair[] {
  return distinctPairs(pairsOf(playableParts(), { everyFit: true }));
}

/** Every distinct (before, reply) pair play can offer now, given the verdicts so far. */
export function currentPairs(): ReplyPair[] {
  return distinctPairs(pairsOf(playableParts()));
}

const bucket = (count: number) =>
  count === 1 ? "1" : count <= 5 ? "2-5" : count <= 20 ? "6-20" : "21+";

/** One line of a sheet. */
export interface SheetPair {
  id: string;
  before: string;
  beforeText: string;
  beforeMove: string;
  reply: string;
  replyText: string;
  replyMove: string;
  step: string;
  /** With --observed: how many times the director produced it across the scenes. */
  seen?: number;
}
export interface Sheet {
  rule: string;
  rubric: string;
  purpose: string;
  pairs: SheetPair[];
}

export interface SheetOptions {
  /** Only the pairs this many built scenes produce. */
  observed?: number;
  onlyUnjudged?: boolean;
  /** Split a purpose with more pairs into numbered files. */
  perFile?: number;
  /** One sheet of this many observed pairs, a seeded shuffle spread across purposes. */
  sample?: number;
  seed?: string;
}

export interface SheetsResult {
  /** File name to sheet. */
  files: Map<string, Sheet>;
  /** Scenes built (0 unless observed), pair instances, distinct pairs on the sheets. */
  scenes: number;
  instances: number;
  pairs: ReplyPair[];
  perPurpose: Map<string, number>;
  /** Every distinct pair there was before leaving out the judged. */
  allPairs: ReplyPair[];
}

/** What every reply sheet carries: the rule and its rubric, word for word. */
const REPLY_SHEET = { rule: REPLY_RULE, rubric: REPLY_FOLLOWS_RUBRIC };

/** One line on a line rule's sheet: what a reviewer needs to judge it. */
export interface SheetLine {
  id: string;
  key: string;
  bank: string;
  kind: string;
  move: string;
  line: string;
  /** For a rule that judges a line in its spot: the spot this row judges (`useSpotId`). */
  spot?: string;
  /** For a rule that judges a line in its spot: that use, with who says it to whom and where. */
  uses?: readonly Readonly<Record<string, unknown>>[];
}
export interface LineSheet {
  rule: string;
  /** The rule's `says`, word for word: the question for every line. */
  rubric: string;
  /** The owner's words behind the rule. */
  from: LineRule["from"];
  lines: SheetLine[];
}

/**
 * The sheets for a `judged` rule about one line: every line it judges now
 * (`lineSubjects`) with no verdict in its current words, split into files of
 * `perFile` lines (`<store>.json`, or `<store>.<n>.json`).
 */
export function lineSheets(
  rule: LineRule,
  pieces: readonly RulePiece[],
  ledger: PartGradeLedger,
  store: JudgedStore,
  perFile = 250,
): Map<string, LineSheet> {
  if (!judgesLines(rule))
    throw new Error(
      `${rule.id} judges a ${rule.judges}: its sheets come with words-machine part 3`,
    );
  // A rule about a line in its spot: one row for each spot the line is said
  // in, with who says it to whom and where (the use's tags).
  const lines: SheetLine[] = judgesSpots(rule)
    ? spotSubjects(rule, pieces, ledger)
        .filter((subject) => verdictOf(store, subject.id) === undefined)
        .map((subject) => ({
          id: subject.id,
          key: subject.piece.key,
          bank: subject.piece.bank,
          kind: subject.piece.kind,
          move: subject.piece.move,
          line: subject.piece.text,
          spot: subject.spot,
          uses: [subject.use],
        }))
    : lineSubjects(rule, pieces, ledger)
        .filter(
          (piece) => verdictOf(store, pieceVerdictId(piece)) === undefined,
        )
        .map((piece) => ({
          id: pieceVerdictId(piece),
          key: piece.key,
          bank: piece.bank,
          kind: piece.kind,
          move: piece.move,
          line: piece.text,
        }));
  const files = new Map<string, LineSheet>();
  const name = storeName(rule);
  const chunks = Math.ceil(lines.length / perFile);
  for (let k = 0; k < chunks; k += 1)
    files.set(chunks === 1 ? `${name}.json` : `${name}.${k + 1}.json`, {
      rule: rule.id,
      rubric: rubricOf(rule),
      from: rule.from,
      lines: lines.slice(k * perFile, (k + 1) * perFile),
    });
  return files;
}

/** Built scenes by count: the director builds the same ones every time. */
const TALKS = new Map<number, ReturnType<typeof buildTalks>>();

/** The sheets for these options: pure of the disk apart from reading the bank and verdicts. */
export function sheetsFor(options: SheetOptions = {}): SheetsResult {
  const parts = playableParts();
  const text = new Map(parts.map((part) => [part.key, part]));
  const verdicts = readStore(REPLY_STORE);
  const seen = new Map<string, number>();
  let allPairs: ReplyPair[];
  let scenes = 0;
  let instances = 0;
  if (options.observed !== undefined) {
    let talks = TALKS.get(options.observed);
    if (!talks) {
      talks = buildTalks({}, options.observed);
      TALKS.set(options.observed, talks);
    }
    scenes = talks.length;
    const order = new Map<string, ReplyPair>();
    for (const pair of talks.flatMap(observedPairs)) {
      instances += 1;
      const id = pairId(pair.before, pair.reply);
      seen.set(id, (seen.get(id) ?? 0) + 1);
      if (!order.has(id))
        order.set(id, {
          before: pair.before,
          reply: pair.reply,
          purpose: pair.ask.purpose,
          key: pair.ask.key,
          step: pair.step,
          move: pair.move,
        });
    }
    allPairs = [...order.values()];
  } else allPairs = currentPairs();
  const idOf = (pair: ReplyPair) =>
    verdictId(
      [pair.before, pair.reply],
      [text.get(pair.before)?.text ?? "", text.get(pair.reply)?.text ?? ""],
    );
  const judged = (pair: ReplyPair) =>
    verdictOf(verdicts, idOf(pair)) !== undefined;
  let pairs = options.onlyUnjudged
    ? allPairs.filter((p) => !judged(p))
    : allPairs;
  const moveOf = (key: string) =>
    text.get(key)?.uses.find((u) => u.subject === "scene")?.move ?? "";
  const line = (pair: ReplyPair): SheetPair => {
    const id = idOf(pair);
    return {
      id,
      before: pair.before,
      beforeText: text.get(pair.before)?.text ?? "",
      beforeMove: moveOf(pair.before),
      reply: pair.reply,
      replyText: text.get(pair.reply)?.text ?? "",
      replyMove: pair.move,
      step: pair.step,
      ...(options.observed !== undefined
        ? { seen: seen.get(pairId(pair.before, pair.reply)) }
        : {}),
    };
  };
  const files = new Map<string, Sheet>();
  if (options.sample !== undefined) {
    const seed = options.seed ?? "";
    const shuffled = [...pairs].sort((a, b) => {
      const x = hash53(`${seed}|${pairId(a.before, a.reply)}`);
      const y = hash53(`${seed}|${pairId(b.before, b.reply)}`);
      return x < y ? -1 : x > y ? 1 : 0;
    });
    const byPurpose = new Map<string, ReplyPair[]>();
    for (const pair of shuffled) {
      const list = byPurpose.get(pair.purpose) ?? [];
      list.push(pair);
      byPurpose.set(pair.purpose, list);
    }
    const queues = [...byPurpose.values()];
    const picked: ReplyPair[] = [];
    for (let round = 0; picked.length < options.sample; round += 1) {
      let any = false;
      for (const queue of queues) {
        const next = queue[round];
        if (next && picked.length < options.sample) {
          picked.push(next);
          any = true;
        }
      }
      if (!any) break;
    }
    pairs = picked;
    files.set("sample.json", {
      ...REPLY_SHEET,
      purpose: "sample",
      pairs: picked.map(line),
    });
  } else {
    const byPurpose = new Map<string, ReplyPair[]>();
    for (const pair of pairs) {
      const list = byPurpose.get(pair.purpose) ?? [];
      list.push(pair);
      byPurpose.set(pair.purpose, list);
    }
    const size = options.perFile ?? Infinity;
    for (const [purpose, list] of byPurpose) {
      const name = purpose === "*" ? "fallback" : purpose;
      const chunks = Math.ceil(list.length / size);
      for (let k = 0; k < chunks; k += 1)
        files.set(chunks === 1 ? `${name}.json` : `${name}.${k + 1}.json`, {
          ...REPLY_SHEET,
          purpose,
          pairs: list.slice(k * size, (k + 1) * size).map(line),
        });
    }
  }
  const perPurpose = new Map<string, number>();
  for (const pair of pairs)
    perPurpose.set(pair.purpose, (perPurpose.get(pair.purpose) ?? 0) + 1);
  return { files, scenes, instances, pairs, perPurpose, allPairs };
}

function main() {
  const argv = process.argv;
  const value = (flag: string) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const out = value("--out");
  const ruleId = value("--rule");
  if (!out || !ruleId)
    throw new Error("usage: npm run words:pairs -- --rule <id> --out <dir>");
  if (!relative(resolve("."), resolve(out)).startsWith(".."))
    throw new Error("--out must be a directory outside the repository");
  const rule = readRules().find((row) => row.id === ruleId);
  if (!rule) throw new Error(`no rule ${ruleId} in ${RULES_FILE}`);
  if (rule.id !== REPLY_RULE) {
    const files = lineSheets(
      rule,
      readBankPieces(),
      readLedger(),
      readStore(storeName(rule)),
      value("--per-file") ? Number(value("--per-file")) : 250,
    );
    mkdirSync(out, { recursive: true });
    let count = 0;
    for (const [name, sheet] of files) {
      count += sheet.lines.length;
      writeFileSync(join(out, name), `${JSON.stringify(sheet, null, 1)}\n`);
    }
    console.log(
      `${rule.id}: ${count} lines with no verdict in their current words, in ${files.size} files. Wrote them to ${out}.`,
    );
    return;
  }
  const observed = argv.includes("--observed")
    ? Number(
        argv[argv.indexOf("--observed") + 1]?.startsWith("--")
          ? 240
          : (value("--observed") ?? 240),
      )
    : undefined;
  const result = sheetsFor({
    observed,
    onlyUnjudged: argv.includes("--only-unjudged"),
    perFile: value("--per-file") ? Number(value("--per-file")) : 250,
    sample: value("--sample") ? Number(value("--sample")) : undefined,
    seed: value("--seed"),
  });
  mkdirSync(out, { recursive: true });
  let largest = 0;
  for (const [name, sheet] of result.files) {
    largest = Math.max(largest, sheet.pairs.length);
    writeFileSync(join(out, name), `${JSON.stringify(sheet, null, 1)}\n`);
  }
  const steps = new Map<string, number>();
  for (const pair of result.pairs)
    steps.set(pair.step, (steps.get(pair.step) ?? 0) + 1);
  const perReply = new Map<string, number>();
  for (const pair of result.allPairs)
    perReply.set(pair.reply, (perReply.get(pair.reply) ?? 0) + 1);
  const buckets = new Map<string, number>();
  for (const count of perReply.values())
    buckets.set(bucket(count), (buckets.get(bucket(count)) ?? 0) + 1);
  const lines = [
    ...(observed !== undefined
      ? [
          `Scenes built: ${result.scenes}. Pair instances: ${result.instances}. Distinct pairs: ${result.allPairs.length}.`,
        ]
      : []),
    `Pairs: ${result.allPairs.length}. On the sheets: ${result.pairs.length} (${result.allPairs.length - result.pairs.length} left out).`,
    `Purposes: ${result.perPurpose.size}. Files: ${result.files.size}. Largest file: ${largest} pairs.`,
    `Pairs per step: ${[...steps].map(([step, count]) => `${step} ${count}`).join(", ")}.`,
    `Replies by how many lines they can follow: ${["1", "2-5", "6-20", "21+"].map((name) => `${name}: ${buckets.get(name) ?? 0}`).join(", ")}.`,
    ...(observed !== undefined
      ? [
          `Pairs per purpose: ${[...result.perPurpose].map(([purpose, count]) => `${purpose} ${count}`).join(", ")}.`,
        ]
      : []),
    `Wrote ${result.files.size} files to ${out}.`,
  ];
  console.log(lines.join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
