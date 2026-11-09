/**
 * Chooses the owner's second grading batch so his grades reach as much of the
 * game as they can (owner, Nov 9, 12:30 a.m.: "I'll be able to do a big batch,
 * and then that will affect a ton of the game"; 12:45 a.m.: "let's start
 * getting every line touched by a grade").
 *
 *   node --import tsx scripts/dialogue-batch/batch-two.ts > out.json
 *
 * A moment is one slot of one bank (a move, in one kind of scene, said by one
 * role); three of its lines are shown, as in batch 1. Moments are taken one
 * at a time, each the slot whose three best lines reach the most lines not yet
 * reached, where a line is reached when it shares a feature with a batch line
 * in its own kind of scene or in its own register and voice together
 * (`grade-map.ts`, the `near` share). Lines the owner already graded are left
 * out. Prints the batch as JSON: per line its piece key, slot, speaker's
 * bearing and traits, scene kind, register, text, the spans a grade can fall
 * on with their features, and how many lines a grade on it would reach.
 *
 * A development tool. It never words anything.
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { CalibrationTable } from "../../src/english/calibration";
import type { PartGradeLedger } from "../../src/english/english-grades";
import { contextsOf, type MapPiece } from "../../src/english/grade-map";
import { spanFeatures, spansOf } from "../../src/english/span-features";
import { readMapPieces } from "./grade-map";

interface BankPart {
  key: string;
  move: string;
  text: string;
  bearing?: string;
  tag?: { move?: string; key?: string };
  uses?: {
    purpose?: string;
    key?: string;
    step?: string;
    role?: string;
    subject?: string;
  }[];
}

const table = JSON.parse(
  readFileSync("data/english/calibration.json", "utf8"),
) as CalibrationTable;
const ledger = JSON.parse(
  readFileSync("data/english/part-grades.json", "utf8"),
) as PartGradeLedger;
const classes = table.registerClasses ?? {};
const sceneClasses = table.sceneClasses ?? {};
const pieces = readMapPieces(sceneClasses);

const parts = new Map<string, BankPart & { bank: string }>();
for (const name of readdirSync("data/english/parts")
  .filter((entry) => entry.endsWith(".json"))
  .sort()) {
  const bank = JSON.parse(
    readFileSync(join("data/english/parts", name), "utf8"),
  ) as { parts?: BankPart[] };
  for (const part of bank.parts ?? [])
    parts.set(part.key, { ...part, bank: basename(name, ".json") });
}

/** The near cells of a piece: each feature in its kind of scene and in its register and voice. */
function nearCells(piece: MapPiece): string[] {
  const features = spanFeatures(piece.text, true);
  const contexts = contextsOf(piece, classes).filter(
    (context) => context.startsWith("scene:") || context.startsWith("rv:"),
  );
  return features.flatMap((feature) =>
    contexts.map((context) => `${feature}@${context}`),
  );
}

const cellsOf = new Map<string, string[]>();
const linesOf = new Map<string, string[]>();
for (const [key, piece] of pieces) {
  const cells = nearCells(piece);
  cellsOf.set(key, cells);
  for (const cell of cells)
    linesOf.set(cell, [...(linesOf.get(cell) ?? []), key]);
}

/** The slot a piece fills: its bank, move, and the first scene step that uses it. */
function slotOf(part: BankPart & { bank: string }): string {
  const use = part.uses?.[0];
  return [
    part.bank,
    part.tag?.move ?? part.move,
    use?.purpose ?? use?.subject ?? "",
    use?.key ?? part.tag?.key ?? "",
    use?.step ?? "",
    use?.role ?? "",
  ].join("|");
}

const graded = new Set(Object.keys(ledger.parts));
const slots = new Map<string, string[]>();
for (const [key, part] of parts) {
  if (graded.has(key)) continue;
  if (part.text.length < 2) continue;
  const slot = slotOf(part);
  slots.set(slot, [...(slots.get(slot) ?? []), key]);
}

const reached = new Set<string>();
const coveredCells = new Set<string>();

/** The three lines of a slot that together reach the most lines not yet reached. */
function bestThree(keys: readonly string[]): { keys: string[]; gain: number } {
  const chosen: string[] = [];
  const extra = new Set<string>();
  const alsoReached = new Set<string>();
  let total = 0;
  for (let n = 0; n < 3; n += 1) {
    let best: string | undefined;
    let bestGain = -1;
    for (const key of keys) {
      if (chosen.includes(key)) continue;
      let g = 0;
      for (const cell of cellsOf.get(key) ?? []) {
        if (coveredCells.has(cell) || extra.has(cell)) continue;
        for (const line of linesOf.get(cell) ?? [])
          if (!reached.has(line) && !alsoReached.has(line)) g += 1;
      }
      if (
        g > bestGain ||
        (g === bestGain && best !== undefined && key < best)
      ) {
        best = key;
        bestGain = g;
      }
    }
    if (best === undefined) break;
    chosen.push(best);
    total += bestGain;
    for (const cell of cellsOf.get(best) ?? []) {
      extra.add(cell);
      for (const line of linesOf.get(cell) ?? []) alsoReached.add(line);
    }
  }
  return { keys: chosen, gain: total };
}

const MOMENTS = Number(process.env.MOMENTS ?? 70);
const usedBanks = new Map<string, number>();
const moments: { slot: string; keys: string[]; gain: number }[] = [];
const candidateSlots = [...slots].filter(([, keys]) => keys.length >= 3);

function take(pick: { slot: string; keys: string[]; gain: number }) {
  moments.push(pick);
  const bank = pick.slot.split("|")[0]!;
  usedBanks.set(bank, (usedBanks.get(bank) ?? 0) + 1);
  for (const key of pick.keys)
    for (const cell of cellsOf.get(key) ?? []) {
      coveredCells.add(cell);
      for (const line of linesOf.get(cell) ?? []) reached.add(line);
    }
}

/** The best slot among those `fits` allows, by reach, a bank already shown yielding to one not yet shown. */
function bestSlot(
  fits: (slot: string, keys: readonly string[]) => boolean,
): { slot: string; keys: string[]; gain: number } | undefined {
  let pick: { slot: string; keys: string[]; gain: number } | undefined;
  let pickScore = -1;
  for (const [slot, keys] of candidateSlots) {
    if (moments.some((moment) => moment.slot === slot)) continue;
    if (!fits(slot, keys)) continue;
    const best = bestThree(keys);
    const bank = slot.split("|")[0]!;
    const score = (best.gain + 1) / (1 + (usedBanks.get(bank) ?? 0) * 0.5);
    if (score > pickScore) {
      pick = { slot, ...best };
      pickScore = score;
    }
  }
  return pick;
}

const sceneOfSlot = (slot: string) => sceneClasses[slot.split("|")[2] ?? ""];
// Every kind of scene first, several moments each, so the batch plays like
// the game: floor, hallway, press, town hall, election.
for (const kind of [...new Set(Object.values(sceneClasses))].sort())
  for (let n = 0; n < 5; n += 1) {
    const pick = bestSlot((slot) => sceneOfSlot(slot) === kind);
    if (pick) take(pick);
  }
// Then every voice (the bearing a speaker's traits pull toward).
const bearings = [
  ...new Set([...parts.values()].map((part) => part.bearing).filter(Boolean)),
].sort() as string[];
for (const bearing of bearings) {
  const pick = bestSlot(
    (_, keys) =>
      keys.filter((key) => parts.get(key)!.bearing === bearing).length >= 3,
  );
  if (pick) take(pick);
}
// Then every bank.
for (const bank of [
  ...new Set([...parts.values()].map((part) => part.bank)),
].sort()) {
  if (usedBanks.has(bank)) continue;
  const pick = bestSlot((slot) => slot.split("|")[0] === bank);
  if (pick) take(pick);
}
// The rest by reach.
while (moments.length < MOMENTS) {
  const pick = bestSlot(() => true);
  if (!pick) break;
  take(pick);
}

/** The traits that pull a speaker toward a bearing, strongest first. */
function traitsFor(bearing: string | undefined): Record<string, number> {
  if (!bearing) return {};
  return Object.fromEntries(
    Object.entries(table.traits)
      .map(([id, row]) => [id, row.bearing?.[bearing] ?? 0] as const)
      .filter(([, pull]) => pull >= 0.4)
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .slice(0, 3)
      .map(([id]) => [id, 2]),
  );
}

/** How many lines a grade on this line would reach: those sharing a near cell. */
function reachOf(key: string): number {
  const lines = new Set<string>();
  for (const cell of cellsOf.get(key) ?? [])
    for (const line of linesOf.get(cell) ?? []) lines.add(line);
  return lines.size;
}

const out = {
  pieces: pieces.size,
  reached: reached.size,
  moments: moments.map((moment, at) => {
    const first = parts.get(moment.keys[0]!)!;
    const use = first.uses?.[0];
    return {
      moment: at + 1,
      slot: moment.slot,
      bank: first.bank,
      register: classes[first.bank] ?? "narration",
      sceneKind: use?.purpose ? (sceneClasses[use.purpose] ?? null) : null,
      purpose: use?.purpose ?? null,
      step: use?.step ?? null,
      role: use?.role ?? null,
      move: first.tag?.move ?? first.move,
      reachGain: moment.gain,
      lines: moment.keys.map((key, n) => {
        const part = parts.get(key)!;
        return {
          id: `${at + 1}.${n + 1}`,
          key,
          bearing: part.bearing ?? null,
          traits: traitsFor(part.bearing),
          text: part.text,
          features: spanFeatures(part.text, true),
          spans: spansOf(part.text),
          reach: reachOf(key),
        };
      }),
    };
  }),
};
console.log(JSON.stringify(out, null, 2));
