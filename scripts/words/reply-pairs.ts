/**
 * Writes the judging sheets: every pair (line before, reply) the director can
 * produce (`src/english/reply-pairs.ts`), one JSON file per purpose, in a
 * directory outside the repository.
 *
 *   npm run words:pairs -- --out <dir>                  every pair
 *   npm run words:pairs -- --out <dir> --only-unjudged  skip pairs already judged
 *
 * A judge reads a sheet and writes `{ purpose, verdicts: [{ id, follows, why }] }`
 * beside it; `npm run words:verdicts -- --from <dir>` folds them in. A pair
 * appears on the sheet of the first purpose it is offered in.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { BankPart } from "../../src/english/scene-talk-words";
import { playable } from "../../src/english/bank-parts";
import {
  REPLY_FOLLOWS,
  type ReplyFollowsTable,
} from "../../src/english/reply-follows";
import {
  distinctPairs,
  pairId,
  replyPairs,
  type ReplyPair,
} from "../../src/english/reply-pairs";
import { talkReplyFlow, talkScenes } from "../../src/director/scene-talk";
import { readVerdicts } from "./reply-verdicts";

export const SCENE_TALK_FILE = "data/english/parts/scene-talk.json";

/** The scene-talk bank's pieces play may say. */
export function playableParts(): BankPart[] {
  const bank = JSON.parse(readFileSync(SCENE_TALK_FILE, "utf8")) as {
    parts: BankPart[];
  };
  return bank.parts.filter(playable);
}

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

function main() {
  const argv = process.argv;
  const at = argv.indexOf("--out");
  const out = at >= 0 ? argv[at + 1] : undefined;
  if (!out) throw new Error("usage: npm run words:pairs -- --out <dir>");
  if (!relative(resolve("."), resolve(out)).startsWith(".."))
    throw new Error("--out must be a directory outside the repository");
  const parts = playableParts();
  const text = new Map(parts.map((part) => [part.key, part]));
  const pairs = currentPairs();
  const verdicts = readVerdicts();
  const judged = (pair: ReplyPair) => {
    const id = pairId(pair.before, pair.reply);
    return verdicts.yes.has(id) || verdicts.no.has(id);
  };
  const sheet = argv.includes("--only-unjudged")
    ? pairs.filter((pair) => !judged(pair))
    : pairs;
  const byPurpose = new Map<string, ReplyPair[]>();
  for (const pair of sheet) {
    const list = byPurpose.get(pair.purpose) ?? [];
    list.push(pair);
    byPurpose.set(pair.purpose, list);
  }
  mkdirSync(out, { recursive: true });
  const moveOf = (key: string) =>
    text.get(key)?.uses.find((u) => u.subject === "scene")?.move ?? "";
  let largest = 0;
  for (const [purpose, list] of byPurpose) {
    largest = Math.max(largest, list.length);
    const file = `${purpose === "*" ? "fallback" : purpose}.json`;
    writeFileSync(
      join(out, file),
      `${JSON.stringify(
        {
          purpose,
          pairs: list.map((pair) => ({
            id: pairId(pair.before, pair.reply),
            before: pair.before,
            beforeText: text.get(pair.before)?.text ?? "",
            beforeMove: moveOf(pair.before),
            reply: pair.reply,
            replyText: text.get(pair.reply)?.text ?? "",
            replyMove: pair.move,
            step: pair.step,
          })),
        },
        null,
        1,
      )}\n`,
    );
  }
  const steps = new Map<string, number>();
  for (const pair of sheet)
    steps.set(pair.step, (steps.get(pair.step) ?? 0) + 1);
  const perReply = new Map<string, number>();
  for (const pair of pairs)
    perReply.set(pair.reply, (perReply.get(pair.reply) ?? 0) + 1);
  const buckets = new Map<string, number>();
  for (const count of perReply.values())
    buckets.set(bucket(count), (buckets.get(bucket(count)) ?? 0) + 1);
  console.log(
    [
      `Pairs: ${pairs.length}. On the sheets: ${sheet.length} (${pairs.length - sheet.length} already judged).`,
      `Purposes (sheets): ${byPurpose.size}. Largest sheet: ${largest} pairs.`,
      `Pairs per step: ${[...steps].map(([step, count]) => `${step} ${count}`).join(", ")}.`,
      `Replies by how many lines they can follow: ${["1", "2-5", "6-20", "21+"].map((name) => `${name}: ${buckets.get(name) ?? 0}`).join(", ")}.`,
      `Wrote ${byPurpose.size} files to ${out}.`,
    ].join("\n"),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
