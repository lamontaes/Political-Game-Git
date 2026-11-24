/* eslint-disable @typescript-eslint/no-explicit-any -- reads recorded telling inputs */
/**
 * The CTO's sameness gate (Nov 24, 7131781243 on #10377), over 20 drawn
 * sixes of a kind's outline texts:
 * 1. the skeleton pair rate, with the first HOLD sentences held in place
 *    (the greeting and the oath), no higher than the chance-order control;
 * 2. no sentence frame in more than 1 in 20 texts;
 * 3. on average at most one frame shared within a six.
 * Input: one recorded telling input per line (facts, points, traits,
 * momentKey, worldSeed), as `addressTelling` (src/director/address-telling.ts) builds it. With fewer than
 * 120 worlds, the worlds repeat with drawn traits, which overcounts slots a
 * world fact gates (the gate's own caution).
 * Run: KIND=inaugural node --import tsx scripts/sameness/gate.ts scripts/sameness/inputs/inaugural-six.jsonl
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tell, type ToldSentence } from "../../src/english/outline-planner";
import {
  frameOf,
  frameWeight,
  sentencesOf,
  skeletonLikeness,
} from "./skeleton";

const kind = process.env.KIND ?? "inaugural";
const HOLD = Number(process.env.HOLD ?? (kind === "inaugural" ? 2 : 0));
const SIXES = 20;
const SIX = 6;
const rows: any[] = readFileSync(process.argv[2]!, "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const byWorld = new Map<string, any>();
for (const row of rows)
  if (!byWorld.has(row.worldSeed)) byWorld.set(row.worldSeed, row);
const worlds = [...byWorld.values()];
const facets = [
  ...new Set(worlds.flatMap((row) => Object.keys(row.traits ?? {}))),
];
const hash = (text: string) =>
  parseInt(createHash("sha256").update(text).digest("hex").slice(0, 8), 16);
const drawn = worlds.length >= SIXES * SIX;
const told: ToldSentence[][] = [];
const texts: string[] = [];
for (let six = 0; six < SIXES; six += 1)
  for (let at = 0; at < SIX; at += 1) {
    const index = six * SIX + at;
    const row = drawn ? worlds[index] : worlds[index % worlds.length];
    const traits =
      drawn || six === 0
        ? row.traits
        : Object.fromEntries(
            facets.map((f) => [f, (hash(`${index}:${f}`) % 5) - 2]),
          );
    const text = tell({
      kind,
      facts: row.facts,
      ...(row.points ? { points: row.points } : {}),
      momentKey: `${row.momentKey}:${six}`,
      worldSeed: row.worldSeed,
      sourceRecordIds:
        row.facts && Object.values(row.facts)[0]
          ? (Object.values(row.facts)[0] as any).sourceRecordIds
          : [],
      knower: "person:gate" as any,
      traits,
    });
    told.push(text?.sentences ?? []);
    texts.push(text?.paragraphs.join(" ") ?? "");
  }
const n = texts.length;
let pairs = 0;
let chance = 0;
let total = 0;
const shuffled = texts.map((text, i) => {
  const said = sentencesOf(text);
  return [
    ...said.slice(0, HOLD),
    ...said
      .slice(HOLD)
      .map((s, j) => [hash(`${i}:${j}:shuffle`), s] as const)
      .sort((a, b) => a[0] - b[0])
      .map(([, s]) => s),
  ].join(" ");
});
for (let a = 0; a < n; a += 1)
  for (let b = a + 1; b < n; b += 1) {
    total += 1;
    if (skeletonLikeness(texts[a]!, texts[b]!) >= 0.8) pairs += 1;
    if (skeletonLikeness(shuffled[a]!, shuffled[b]!) >= 0.8) chance += 1;
  }
const pct = (x: number) => `${((x / total) * 100).toFixed(1)}%`;
console.log(
  `part 1: pair rate ${pct(pairs)} vs chance ${pct(chance)} -> ${pairs <= chance ? "PASS" : "FAIL"}`,
);
const frameTexts = new Map<string, Set<number>>();
const frameMoves = new Map<string, Set<string>>();
told.forEach((sentences, i) =>
  sentences.forEach((row) => {
    for (const s of sentencesOf(row.text)) {
      const frame = frameOf(s);
      if (frameWeight(frame) < 4) continue;
      if (!frameTexts.has(frame)) frameTexts.set(frame, new Set());
      if (!frameMoves.has(frame)) frameMoves.set(frame, new Set());
      frameTexts.get(frame)!.add(i);
      frameMoves.get(frame)!.add(row.move);
    }
  }),
);
const over = [...frameTexts]
  .filter(([, holders]) => holders.size > n / 20)
  .sort((a, b) => b[1].size - a[1].size);
const bySlot = new Map<string, number>();
for (const [frame] of over) {
  const slot = [...frameMoves.get(frame)!].join("/");
  bySlot.set(slot, (bySlot.get(slot) ?? 0) + 1);
}
console.log(
  `part 2: frames in more than 1 in 20 texts: ${over.length} -> ${over.length ? "FAIL" : "PASS"} ${JSON.stringify(Object.fromEntries(bySlot))}`,
);
if (process.env.V)
  for (const [frame, holders] of over)
    console.log(
      `  ${holders.size} | ${[...frameMoves.get(frame)!].join("/")} | ${frame}`,
    );
let shared = 0;
for (let six = 0; six < SIXES; six += 1) {
  const seen = new Map<string, number>();
  for (let at = 0; at < SIX; at += 1) {
    const frames = new Set(
      sentencesOf(texts[six * SIX + at]!)
        .map(frameOf)
        .filter((frame) => frameWeight(frame) >= 4),
    );
    for (const frame of frames) seen.set(frame, (seen.get(frame) ?? 0) + 1);
  }
  shared += [...seen.values()].filter((count) => count > 1).length;
}
console.log(
  `part 3: shared frames per six, average ${(shared / SIXES).toFixed(2)} -> ${shared / SIXES <= 1 ? "PASS" : "FAIL"}`,
);
console.log(
  `${drawn ? "drawn worlds" : `${worlds.length} worlds with drawn traits (overcounts fact-gated slots)`}; ${n} texts`,
);
