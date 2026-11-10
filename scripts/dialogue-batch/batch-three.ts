/**
 * Chooses the owner's third grading batch (owner, Nov 9, batch 2 voice note:
 * "I'd like to get more speeches and stuff. And mix them up ... Give me a
 * legislation, a speech, a reaction, a constituent, mixing them up ... put
 * them back in and mix them in a different way. Test other things, test
 * variants of the scenes I said that I like").
 *
 *   node --import tsx scripts/dialogue-batch/batch-three.ts > out.json
 *
 * Moments come in kinds, taken in turn so no three of one kind run together:
 *
 *   speech        an opening speech, a speech's stages, an address;
 *   legislation   a floor scene (a vote asked, carried, confirmed) or the
 *                 bill's paper, the hearing, the minutes;
 *   reaction      someone reacting to news brought up, or following up what
 *                 the player just said;
 *   constituent   a constituent at office hours, in every variant;
 *   liked         other lines from the slots of the batch 2 moments he liked
 *                 (8, 9, 10, 11, 12, 13), so one grade teaches more;
 *   again         batch 2 moments he has not graded yet, put back in.
 *
 * Inside a moment the three lines are the slot's best, worst and middle line
 * by the grade map, so his grade on the contrast teaches the most. Lines he
 * has graded, lines the grades hold, and lines of his own are left out.
 * Prints the batch as JSON in batch 2's shape, without the moment sentences,
 * which are written by hand from the code that plays each slot.
 *
 * A development tool. It never words anything.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { CalibrationTable } from "../../src/english/calibration";
import {
  heldByGrades,
  type PartGradeLedger,
} from "../../src/english/english-grades";
import { contextsOf, type MapPiece } from "../../src/english/grade-map";
import { spanFeatures, spansOf } from "../../src/english/span-features";
import { readMapPieces } from "./grade-map";

interface BankPart {
  key: string;
  move: string;
  text: string;
  bearing?: string;
  origin?: string;
  tag?: { move?: string; key?: string };
  uses?: {
    purpose?: string;
    key?: string;
    step?: string;
    role?: string;
    subject?: string;
  }[];
}

interface Batch2Line {
  id: string;
  key: string;
  line: string;
}
interface Batch2Moment {
  moment: number;
  description: string;
  speaker: string;
  lines: Batch2Line[];
}

const table = JSON.parse(
  readFileSync("data/english/calibration.json", "utf8"),
) as CalibrationTable;
const ledger = JSON.parse(
  readFileSync("data/english/part-grades.json", "utf8"),
) as PartGradeLedger;
const map = JSON.parse(readFileSync("data/english/grade-map.json", "utf8")) as {
  factors: Record<string, number>;
};
const batch2 = JSON.parse(
  readFileSync("docs/coordination/batches/2026-11-09-batch-2.json", "utf8"),
) as { moments: Batch2Moment[] };
const classes = table.registerClasses ?? {};
const sceneClasses = table.sceneClasses ?? {};
const pieces = readMapPieces(sceneClasses);

const parts = new Map<string, BankPart & { bank: string }>();
for (const name of readdirSync("data/english/parts")
  .filter((entry) => entry.endsWith(".json"))
  .sort())
  for (const part of (
    JSON.parse(readFileSync(join("data/english/parts", name), "utf8")) as {
      parts?: BankPart[];
    }
  ).parts ?? [])
    parts.set(part.key, { ...part, bank: basename(name, ".json") });

/** The near cells of a piece, as batch 2 counted reach (`batch-two.ts`). */
function nearCells(piece: MapPiece): string[] {
  const contexts = contextsOf(piece, classes).filter(
    (context) => context.startsWith("scene:") || context.startsWith("rv:"),
  );
  return spanFeatures(piece.text, true).flatMap((feature) =>
    contexts.map((context) => `${feature}@${context}`),
  );
}
const linesOf = new Map<string, string[]>();
const cellsOf = new Map<string, string[]>();
for (const [key, piece] of pieces) {
  const cells = nearCells(piece);
  cellsOf.set(key, cells);
  for (const cell of cells)
    linesOf.set(cell, [...(linesOf.get(cell) ?? []), key]);
}
function reachOf(key: string): number {
  const lines = new Set<string>();
  for (const cell of cellsOf.get(key) ?? [])
    for (const line of linesOf.get(cell) ?? []) lines.add(line);
  return lines.size;
}

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

const shown = new Set(
  batch2.moments.flatMap((moment) => moment.lines.map((line) => line.key)),
);
const usable = (key: string) => {
  const part = parts.get(key)!;
  return (
    !shown.has(key) &&
    !ledger.parts[key] &&
    !heldByGrades(key, ledger) &&
    part.origin !== "owner-voice" &&
    part.text.length > 1
  );
};
const slots = new Map<string, string[]>();
for (const [key, part] of parts) {
  if (!usable(key)) continue;
  const slot = slotOf(part);
  slots.set(slot, [...(slots.get(slot) ?? []), key]);
}

/** The slot's best, worst and middle line by the grade map. */
function contrast(keys: readonly string[]): string[] {
  const sorted = [...keys].sort(
    (a, b) =>
      (map.factors[b] ?? 1) - (map.factors[a] ?? 1) || a.localeCompare(b),
  );
  if (sorted.length <= 3) return sorted;
  return [
    sorted[0]!,
    sorted[Math.floor(sorted.length / 2)]!,
    sorted[sorted.length - 1]!,
  ];
}

const KIND_OF = (slot: string): string | undefined => {
  const [bank, , purpose, , step] = slot.split("|");
  const scene =
    sceneClasses[purpose ?? ""] ?? sceneClasses[(purpose ?? "").split(".")[0]!];
  if (["opening-speech", "speech-stages", "address"].includes(bank!))
    return "speech";
  if (
    ["bill-paper", "legislation", "minutes", "hearing", "notice"].includes(
      bank!,
    )
  )
    return "legislation";
  if (bank === "scene-talk" && (purpose ?? "").startsWith("constituent-help"))
    return "constituent";
  if (bank === "scene-talk" && scene === "floor") return "legislation";
  if (bank === "bring-it-up") return "reaction";
  if (bank === "scene-talk" && step === "follow") return "reaction";
  return undefined;
};

type Moment = {
  kind: string;
  slot: string;
  keys: string[];
  description?: string;
  speaker?: string;
  from?: string;
};

const used = new Set<string>();
const usedPurpose = new Map<string, number>();
function pick(kind: string, count: number, familyCap = 4): Moment[] {
  const candidates = [...slots]
    .filter(([slot, keys]) => KIND_OF(slot) === kind && keys.length >= 3)
    .map(([slot, keys]) => {
      const three = contrast(keys);
      return {
        slot,
        three,
        gain: three.reduce((sum, key) => sum + reachOf(key), 0),
      };
    })
    .sort((a, b) => b.gain - a.gain || a.slot.localeCompare(b.slot));
  const out: Moment[] = [];
  for (const candidate of candidates) {
    if (out.length >= count) break;
    if (used.has(candidate.slot)) continue;
    // Spread over families of scene or speech: no more than three moments
    // from one (the inaugural address, the ask-vote variants).
    const [bank, , purpose] = candidate.slot.split("|");
    const variant = `${bank}|${purpose ?? ""}`;
    const family = `${bank}|${(purpose ?? "").split(".")[0]}`;
    if ((usedPurpose.get(variant) ?? 0) >= 2) continue;
    if ((usedPurpose.get(family) ?? 0) >= familyCap) continue;
    // Spread over steps too: the person's opening and request, not only replies.
    const fields = candidate.slot.split("|");
    const step = `step|${kind}|${fields[4] || fields[1] || ""}`;
    if ((usedPurpose.get(step) ?? 0) >= Math.ceil(count / 3)) continue;
    usedPurpose.set(step, (usedPurpose.get(step) ?? 0) + 1);
    used.add(candidate.slot);
    usedPurpose.set(variant, (usedPurpose.get(variant) ?? 0) + 1);
    if (family !== variant)
      usedPurpose.set(family, (usedPurpose.get(family) ?? 0) + 1);
    out.push({ kind, slot: candidate.slot, keys: candidate.three });
  }
  return out;
}

// Batch 2 moments he has not graded yet (14 on), put back in.
const again: Moment[] = batch2.moments
  .filter((moment) => moment.moment >= 14)
  .filter((moment) => moment.lines.every((line) => !ledger.parts[line.key]))
  .sort((a, b) => ((a.moment * 7919) % 61) - ((b.moment * 7919) % 61))
  .slice(0, 6)
  .map((moment) => ({
    kind: "again",
    slot: slotOf(parts.get(moment.lines[0]!.key)!),
    keys: moment.lines.map((line) => line.key),
    description: moment.description,
    speaker: moment.speaker,
    from: `batch 2's moment ${moment.moment}, not graded yet`,
  }));
for (const moment of again) used.add(moment.slot);

const speech = pick("speech", 14);
const legislation = pick("legislation", 12);
const reaction = pick("reaction", 10);
// Each variant of the office-hours visit is its own family of lines.
const constituent = pick("constituent", 8, 8);

// Variants of the moments he liked: the same slot's unseen lines, and the
// same move in the variant families' slots.
const LIKED = [8, 9, 10, 11, 12, 13];
const liked: Moment[] = [];
for (const number of LIKED) {
  const moment = batch2.moments.find((row) => row.moment === number)!;
  const slot = slotOf(parts.get(moment.lines[0]!.key)!);
  const [bank, move, purpose, key, step, role] = slot.split("|");
  const family = [...slots].filter(([other]) => {
    const [b, m, p, k, s, r] = other.split("|");
    return (
      b === bank &&
      m === move &&
      s === step &&
      r === role &&
      k === key &&
      (p === purpose || (p ?? "").startsWith(`${purpose}.`))
    );
  });
  for (const [other, keys] of family) {
    if (used.has(other) || keys.length < 3) continue;
    used.add(other);
    liked.push({
      kind: "liked",
      slot: other,
      keys: contrast(keys),
      description: moment.description,
      speaker: moment.speaker,
      from: `a variant of batch 2's moment ${number}, which he liked`,
    });
    if (
      liked.filter((row) => row.from?.includes(`moment ${number},`)).length >= 2
    )
      break;
  }
}

// In turn, so no three of one kind run together: each moment takes the kind
// with the most left that is not the kind of the two before it.
const queues = new Map<string, Moment[]>([
  ["legislation", legislation],
  ["speech", speech],
  ["reaction", reaction],
  ["constituent", constituent],
  ["liked", liked],
  ["again", again],
]);
const order: Moment[] = [];
for (;;) {
  const last = order.slice(-2).map((moment) => moment.kind);
  const blocked =
    last.length === 2 && last[0] === last[1] ? last[0] : undefined;
  const choice = [...queues]
    .filter(([kind, queue]) => queue.length > 0 && kind !== blocked)
    .sort(
      ([a, x], [b, y]) =>
        y.length - x.length ||
        (a === order.at(-1)?.kind ? 1 : 0) - (b === order.at(-1)?.kind ? 1 : 0),
    )[0];
  if (!choice) break;
  order.push(choice[1].shift()!);
}

const out = {
  moments: order.map((moment, at) => {
    const first = parts.get(moment.keys[0]!)!;
    const use = first.uses?.[0];
    return {
      moment: at + 1,
      kind: moment.kind,
      slot: moment.slot,
      bank: first.bank,
      register: classes[first.bank] ?? "narration",
      purpose: use?.purpose ?? null,
      ...(moment.description ? { description: moment.description } : {}),
      ...(moment.speaker ? { speaker: moment.speaker } : {}),
      ...(moment.from ? { from: moment.from } : {}),
      lines: moment.keys.map((key, n) => {
        const part = parts.get(key)!;
        return {
          id: `${at + 1}.${n + 1}`,
          key,
          line: part.text,
          bearing: part.bearing ?? null,
          features: spanFeatures(part.text, true),
          spans: spansOf(part.text),
          reach: reachOf(key),
          weight: map.factors[key] ?? 1,
        };
      }),
    };
  }),
};
console.log(JSON.stringify(out, null, 2));
