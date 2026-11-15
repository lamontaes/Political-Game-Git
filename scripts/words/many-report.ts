/**
 * The counted "many" report (words machine part 3: many-variants-of-the-same-meaning
 * and many-versions-of-each-scene). "Many" is a count, not a judgment: the
 * Words lead set the floors (Nov 14, /mnt/project-files/words-lead/9133/ruling-many.md)
 * and ruled that the report never fails a build and never pulls a line. It
 * lists the thin ones as work for the scene's owner.
 *
 *   node --import tsx scripts/words/many-report.ts [--report <file>]
 *
 * Variants per slot. A slot is a spot the composer picks from in the
 * scene-talk bank: one use's purpose, situation key, step, move and role,
 * whatever line a piece answers (`after`) and whatever facts it needs. Only
 * variants that differ count: each group variants-differ judges (`slotVariants`)
 * counts as one when it judged them rewordings of one meaning ("no"), and as
 * its size otherwise; a group not yet judged counts its size and says so. Floors:
 * - a line met in most talks (a talk's own greeting, opener, plain yes, plain
 *   no, closer, leave, or any line of the everyday talk): 8;
 * - a line tied to a rare record (every variant needs a fact on record): 2;
 * - any other line, met once in a talk of its kind: 4.
 *
 * Versions of each scene type. A purpose of src/director/data/purpose-arcs.json
 * is one scene type; its versions are its arcs in arc-variants.json (one when
 * it has none), since an arc differs in who is there, what is asked or how it
 * can end. Floors: corruption 30, legislating and negotiating 12, each part of
 * campaigning 3, everything else 3. Which group a purpose is in is the table
 * below; the Words lead corrects it.
 */
import { writeFileSync } from "node:fs";
import arcJson from "../../src/director/data/arc-variants.json" with { type: "json" };
import purposeJson from "../../src/director/data/purpose-arcs.json" with { type: "json" };
import { verdictId } from "../../src/english/judged";
import type { RulePiece } from "../../src/english/line-rules";
import { readBankPieces, readRules } from "./run-rules";
import { readStore, storeName } from "./verdicts";

export type SlotClass = "common" | "once" | "rare";
export const SLOT_FLOORS: Readonly<Record<SlotClass, number>> = {
  common: 8,
  once: 4,
  rare: 2,
};

export type SceneGroup = "corruption" | "legislating" | "campaigning" | "other";
export const SCENE_FLOORS: Readonly<Record<SceneGroup, number>> = {
  corruption: 30,
  legislating: 12,
  campaigning: 3,
  other: 3,
};

/** Which group each scene type is in (owner, Nov 8 and Nov 14, by the Words lead's floors). */
export const SCENE_GROUPS: Readonly<Record<string, SceneGroup>> = {
  "bribe-offer": "corruption",
  "bribe-pressed": "corruption",
  "favor-job": "corruption",
  "ask-vote": "legislating",
  "section-bargain": "legislating",
  "carry-bill": "legislating",
  "confirm-vote": "legislating",
  "floor-debate": "legislating",
  "hearing-ask": "legislating",
  "desk-visit": "legislating",
  "cut-argument": "legislating",
  "ask-support": "campaigning",
  "ask-signature": "campaigning",
  "donor-ask": "campaigning",
  "rally-opponent": "campaigning",
  "rally-word": "campaigning",
  "rival-word": "campaigning",
  "invite-debate": "campaigning",
  "invite-interview": "campaigning",
  "press-comment": "campaigning",
  "filing-clerk": "campaigning",
  "filing-petition": "campaigning",
  "family-filing": "campaigning",
  "offer-to-run": "campaigning",
  "ask-to-run": "campaigning",
  "party-welcome": "campaigning",
  "concession-call": "campaigning",
  "victory-night": "campaigning",
  "poll-problem": "campaigning",
};

/** Lines every kind of talk has: its greeting, opener, plain yes and no, closer and leave. */
const COMMON_MOVES = new Set([
  "greet",
  "leave",
  "accept",
  "agree",
  "decline",
  "refuse",
]);
const COMMON_STEPS = new Set(["open", "close"]);
/** The everyday talk's purposes: their lines are met in most talks. */
const EVERYDAY = new Set(["*", "talk", ""]);

export interface SlotRow {
  readonly slot: string;
  readonly cls: SlotClass;
  readonly variants: number;
  /** Variants that count: each variants-differ group counts one when judged rewordings, else its size. */
  readonly counted: number;
  readonly judged: "yes" | "no" | "not yet" | "one";
  readonly floor: number;
  readonly words: readonly string[];
}

export function slotRows(
  pieces: readonly RulePiece[],
  differ: { yes: ReadonlySet<string>; no: ReadonlyMap<string, unknown> },
): SlotRow[] {
  // The exact slots variants-differ judges (every field of the use but the
  // facts), gathered into the spot the composer picks from: a line written
  // to answer one line (`after`) is one of the spot's variants too.
  const spots = new Map<
    string,
    {
      use: Record<string, unknown>;
      exact: Map<
        string,
        Map<string, { key: string; text: string; needs: boolean }>
      >;
    }
  >();
  const nameOf = (slot: Record<string, unknown>) =>
    JSON.stringify(
      Object.keys(slot)
        .sort()
        .map((field) => [field, slot[field]]),
    );
  for (const piece of pieces) {
    if (piece.bank !== "scene-talk") continue;
    for (const use of piece.uses) {
      const slot = { ...(use as Record<string, unknown>) };
      const needs = slot.requiresFacts;
      delete slot.requiresFacts;
      delete slot.excludesFacts;
      const spotUse = { ...slot };
      delete spotUse.after;
      const spotName = nameOf(spotUse);
      const spot = spots.get(spotName) ?? { use: spotUse, exact: new Map() };
      spots.set(spotName, spot);
      const exactName = nameOf(slot);
      const exact = spot.exact.get(exactName) ?? new Map();
      spot.exact.set(exactName, exact);
      exact.set(piece.key, {
        key: piece.key,
        text: piece.text,
        needs: Array.isArray(needs) && needs.length > 0,
      });
    }
  }
  const rows: SlotRow[] = [];
  for (const { use, exact } of spots.values()) {
    let counted = 0;
    const judged = new Set<SlotRow["judged"]>();
    const all = new Map<
      string,
      { key: string; text: string; needs: boolean }
    >();
    for (const variants of exact.values()) {
      const shown = [...variants.values()].sort((a, b) =>
        a.key.localeCompare(b.key),
      );
      for (const variant of shown) all.set(variant.key, variant);
      if (shown.length < 2) {
        counted += shown.length;
        judged.add("one");
        continue;
      }
      const id = verdictId(
        shown.map((variant) => variant.key),
        shown.map((variant) => variant.text),
      );
      const verdict = differ.no.has(id)
        ? "no"
        : differ.yes.has(id)
          ? "yes"
          : "not yet";
      judged.add(verdict);
      counted += verdict === "no" ? 1 : shown.length;
    }
    const variants = [...all.values()];
    const purpose = String(use.purpose ?? "");
    const cls: SlotClass = variants.every((variant) => variant.needs)
      ? "rare"
      : EVERYDAY.has(purpose) ||
          COMMON_MOVES.has(String(use.move ?? "")) ||
          COMMON_STEPS.has(String(use.step ?? ""))
        ? "common"
        : "once";
    rows.push({
      slot: [use.purpose, use.key, use.step, use.move, use.role]
        .filter((part) => typeof part === "string")
        .join("/"),
      cls,
      variants: variants.length,
      counted,
      judged: judged.has("not yet")
        ? "not yet"
        : judged.has("no")
          ? "no"
          : judged.has("yes")
            ? "yes"
            : "one",
      floor: SLOT_FLOORS[cls],
      words: variants.map((variant) => variant.text),
    });
  }
  return rows;
}

export interface SceneRow {
  readonly purpose: string;
  readonly group: SceneGroup;
  readonly versions: number;
  readonly floor: number;
  readonly arcs: readonly string[];
}

export function sceneRows(
  purposes: readonly string[],
  families: Readonly<Record<string, { variants: Record<string, unknown> }>>,
): SceneRow[] {
  return purposes.map((purpose) => {
    const arcs = Object.keys(families[purpose]?.variants ?? {});
    const group = SCENE_GROUPS[purpose] ?? "other";
    return {
      purpose,
      group,
      versions: Math.max(1, arcs.length),
      floor: SCENE_FLOORS[group],
      arcs,
    };
  });
}

/** The slots of each scene, by the purpose that opens the slot's name. */
function byScene(slots: readonly SlotRow[]): Map<string, SlotRow[]> {
  const scenes = new Map<string, SlotRow[]>();
  for (const row of slots) {
    const purpose = row.slot.split("/")[0] ?? "";
    scenes.set(purpose, [...(scenes.get(purpose) ?? []), row]);
  }
  return scenes;
}

function main() {
  const at = process.argv.indexOf("--report");
  const report = at >= 0 ? process.argv[at + 1] : undefined;
  const differRule = readRules().find(
    (rule) => rule.id === "variants-differ-in-what-they-say",
  );
  if (!differRule) throw new Error("variants-differ-in-what-they-say is gone");
  const slots = slotRows(readBankPieces(), readStore(storeName(differRule)));
  const scenes = sceneRows(
    Object.keys(purposeJson.purposes),
    arcJson.families as Record<string, { variants: Record<string, unknown> }>,
  );
  const thinSlots = slots.filter((row) => row.counted < row.floor);
  const thinScenes = scenes.filter((row) => row.versions < row.floor);
  const lines = [
    "# How many: variants per slot and versions per scene (counted)",
    "",
    "Floors by the Words lead (Nov 14). A thin one is work for the scene's owner; this report never fails a build and never pulls a line.",
    "",
    `Slots: ${slots.length} in the scene-talk bank; ${thinSlots.length} below their floor.`,
    ...(["common", "once", "rare"] as const).map((cls) => {
      const of = slots.filter((row) => row.cls === cls);
      const thin = of.filter((row) => row.counted < row.floor);
      return `- ${cls} (floor ${SLOT_FLOORS[cls]}): ${of.length} slots, ${thin.length} thin; ${of.filter((row) => row.judged === "not yet").length} not yet judged by variants-differ`;
    }),
    "",
    `Scene types: ${scenes.length}; ${thinScenes.length} below their floor.`,
    ...(["corruption", "legislating", "campaigning", "other"] as const).map(
      (group) => {
        const of = scenes.filter((row) => row.group === group);
        return `- ${group} (floor ${SCENE_FLOORS[group]}): ${of.length} types, ${of.filter((row) => row.versions < row.floor).length} thin`;
      },
    ),
    "",
    "## Scene types below their floor",
    "",
    ...thinScenes
      .sort((a, b) => a.versions - a.floor - (b.versions - b.floor))
      .map(
        (row) =>
          `- ${row.purpose} (${row.group}): ${row.versions} of ${row.floor}${row.arcs.length ? ` (${row.arcs.join(", ")})` : ""}`,
      ),
    "",
    "## Slots by scene: how many are below their floor",
    "",
    ...[...byScene(slots).entries()]
      .map(([purpose, rows]) => ({
        purpose,
        rows: rows.length,
        thin: rows.filter((row) => row.counted < row.floor).length,
        counted: rows.reduce((sum, row) => sum + row.counted, 0),
      }))
      .sort((a, b) => b.thin - a.thin || a.purpose.localeCompare(b.purpose))
      .map(
        (row) =>
          `- ${row.purpose}: ${row.thin} of ${row.rows} slots thin, ${(row.counted / row.rows).toFixed(1)} counted variants a slot`,
      ),
    "",
    "## Slots below their floor, thinnest first",
    "",
    ...thinSlots
      .sort(
        (a, b) =>
          a.counted / a.floor - b.counted / b.floor ||
          a.slot.localeCompare(b.slot),
      )
      .map(
        (row) =>
          `- ${row.slot} (${row.cls}): ${row.counted} of ${row.floor}${row.judged === "no" ? `, ${row.variants} rewordings of one meaning` : row.judged === "not yet" ? ", not yet judged" : ""}: ${row.words
            .slice(0, 3)
            .map((words) => `"${words}"`)
            .join(" / ")}`,
      ),
  ];
  const text = `${lines.join("\n")}\n`;
  if (report) writeFileSync(report, text);
  console.log(lines.slice(0, 16).join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
