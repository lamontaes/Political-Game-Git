/**
 * Turns the mined scene and bring-it-up banks into the words the English
 * engine says them with (`src/english/scene-words.ts` for a scene's
 * narration, `src/english/bring-it-up-words.ts` for `bringItUp`). Each mined part names the director's
 * subject (setting, present, cause; change, blame) and its role (the setting
 * kind, the cause's label prefix, the blame's source). The structure is
 * `data/scene-rows.json` and `data/bring-it-up-rows.json`, which hold no
 * sentences. A row no record words yet is left empty, and the director leaves
 * that line out.
 */
import sceneJson from "../../../data/english/parts/scene-words.json" with { type: "json" };
import bringJson from "../../../data/english/parts/bring-it-up.json" with { type: "json" };
import { heldByGrades } from "../english-grades";
import bringRowsJson from "../../director/data/bring-it-up-rows.json" with { type: "json" };
import sceneRowsJson from "../../director/data/scene-rows.json" with { type: "json" };
import type { BringRows } from "../../director/bring-it-up";
import type { BringWords } from "../bring-it-up-words";
import type { SceneRows } from "../../director/scene";
import type { SceneWords } from "../scene-words";

interface Use {
  subject: string;
  role: string;
  choice: string;
  stages?: string[];
}
interface MinedPart {
  key: string;
  text: string;
  uses: Use[];
  shippable: boolean;
  /** The manner the wording carries, for the speaker's trait pulls. */
  bearing?: string;
}
type Bank = { parts: MinedPart[] };
export const SCENE_BANK = sceneJson as unknown as Bank;
export const BRING_BANK = bringJson as unknown as Bank;
export const SCENE_ROWS = sceneRowsJson as unknown as SceneRows;
export const BRING_ROWS = bringRowsJson as unknown as BringRows;

/**
 * Bank slots as the director names its facts: a host's home is `{{host}}'s`,
 * several people present are one `{{who}}`.
 */
function directorText(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_all, slot: string) =>
    slot === "host"
      ? "{{host}}'s"
      : slot === "who_many"
        ? "{{who}}"
        : `{{${slot.replace(/_/g, "-")}}}`,
  );
}

/**
 * The parts a slot may say. Play says only shipped parts. A grading page
 * (`heldFirst`) says the held ones wherever one fits, so the owner reads each
 * in a real scene; a slot no held part fits keeps its shipped parts.
 */
function admitted(
  bank: Bank,
  fits: (part: MinedPart) => boolean,
  heldFirst: boolean,
): MinedPart[] {
  const shipped = bank.parts.filter(
    (part) => part.shippable && !heldByGrades(part.key) && fits(part),
  );
  if (!heldFirst) return shipped;
  const held = bank.parts.filter(
    (part) => !part.shippable && !heldByGrades(part.key) && fits(part),
  );
  return held.length ? held : shipped;
}

function variants(
  bank: Bank,
  subject: string,
  role: string,
  staged = false,
  heldFirst = false,
) {
  return admitted(
    bank,
    (part) =>
      part.uses.some((use) => use.subject === subject && use.role === role),
    heldFirst,
  ).map((part) => {
    const stages = part.uses.find(
      (use) => use.subject === subject && use.role === role,
    )?.stages;
    return {
      key: part.key,
      text: directorText(part.text),
      // A use's choice names the stage a part is said at ("any" says it at all).
      ...(stages
        ? { stages }
        : staged
          ? stagesOf(part.uses.filter((use) => use.subject === subject))
          : {}),
      ...(part.bearing ? { bearing: part.bearing, pieceKey: part.key } : {}),
    };
  });
}

function stagesOf(uses: readonly Use[]): { stages?: string[] } {
  const stages = uses.map((use) => use.choice);
  return stages.includes("any") || !stages.length ? {} : { stages };
}

/**
 * A cause's sentence is said about you (`self`: no one else is in the cause)
 * or about the person it names (`other`); a line with any other choice fits
 * both.
 */
function causeVariants(bank: Bank, role: string, heldFirst = false) {
  return admitted(
    bank,
    (part) =>
      part.uses.some((use) => use.subject === "cause" && use.role === role),
    heldFirst,
  ).map((part) => {
    const choice = part.uses.find(
      (use) => use.subject === "cause" && use.role === role,
    )!.choice;
    return {
      key: part.key,
      text: directorText(part.text),
      ...(choice === "self" || choice === "other" ? { stages: [choice] } : {}),
    };
  });
}

/** `heldFirst` is for a grading page only: see `admitted`. */
export function sceneWordsFromBank(
  bank: Bank = SCENE_BANK,
  rows: SceneRows = SCENE_ROWS,
  heldFirst = false,
): SceneWords {
  return {
    version: rows.version,
    and: rows.and,
    settings: Object.fromEntries(
      rows.settings.map((kind) => [
        kind,
        variants(bank, "setting", kind, false, heldFirst),
      ]),
    ),
    frame: variants(bank, "frame", "day", false, heldFirst),
    household: variants(bank, "household", "kin", true, heldFirst),
    leads: rows.leads.map((typeKey) => ({
      typeKey,
      variants: variants(bank, "lead", typeKey, true, heldFirst),
    })),
    causes: rows.causes.map((labelPrefix) => ({
      labelPrefix,
      variants: causeVariants(bank, labelPrefix, heldFirst),
    })),
    openings: Object.fromEntries(
      (rows.openings ?? []).map((move) => [
        move,
        variants(bank, "opening", move, false, heldFirst),
      ]),
    ),
  };
}

/** `heldFirst` is for a grading page only: see `admitted`. */
export function bringWordsFromBank(
  bank: Bank = BRING_BANK,
  rows: BringRows = BRING_ROWS,
  heldFirst = false,
): BringWords {
  return {
    version: rows.version,
    changes: Object.fromEntries(
      rows.changes.map((row) => [
        row.eventKind,
        variants(bank, "change", row.eventKind, false, heldFirst),
      ]),
    ),
    blame: Object.fromEntries(
      rows.blame.map((how) => [
        how,
        variants(bank, "blame", how, false, heldFirst),
      ]),
    ) as BringWords["blame"],
  };
}
