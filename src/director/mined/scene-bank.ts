/**
 * Turns the mined scene and bring-it-up banks into the story director's words
 * (`composeScene` in `src/director/scene.ts`, `bringItUp` in
 * `src/director/bring-it-up.ts`). Each mined part names the director's
 * subject (setting, present, cause; change, blame) and its role (the setting
 * kind, the cause's label prefix, the blame's source). The structure is
 * `data/scene-rows.json` and `data/bring-it-up-rows.json`, which hold no
 * sentences. A row no record words yet is left empty, and the director leaves
 * that line out.
 */
import sceneJson from "../../../data/english/parts/scene-words.json" with { type: "json" };
import bringJson from "../../../data/english/parts/bring-it-up.json" with { type: "json" };
import { heldByGrades } from "../../english/english-grades";
import bringRowsJson from "../data/bring-it-up-rows.json" with { type: "json" };
import sceneRowsJson from "../data/scene-rows.json" with { type: "json" };
import type { BringData, BringRows } from "../bring-it-up";
import type { SceneRows, SceneWords } from "../scene";

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

function variants(bank: Bank, subject: string, role: string, staged = false) {
  return bank.parts
    .filter(
      (part) =>
        part.shippable &&
        !heldByGrades(part.key) &&
        part.uses.some((use) => use.subject === subject && use.role === role),
    )
    .map((part) => {
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
function causeVariants(bank: Bank, role: string) {
  return bank.parts
    .filter(
      (part) =>
        part.shippable &&
        !heldByGrades(part.key) &&
        part.uses.some((use) => use.subject === "cause" && use.role === role),
    )
    .map((part) => {
      const choice = part.uses.find(
        (use) => use.subject === "cause" && use.role === role,
      )!.choice;
      return {
        key: part.key,
        text: directorText(part.text),
        ...(choice === "self" || choice === "other"
          ? { stages: [choice] }
          : {}),
      };
    });
}

export function sceneWordsFromBank(
  bank: Bank = SCENE_BANK,
  rows: SceneRows = SCENE_ROWS,
): SceneWords {
  return {
    version: rows.version,
    and: rows.and,
    settings: Object.fromEntries(
      rows.settings.map((kind) => [kind, variants(bank, "setting", kind)]),
    ),
    present: ["one", "many"].flatMap((stage) =>
      variants(bank, "present", stage).map((row) => ({
        ...row,
        stages: [stage],
      })),
    ),
    frame: variants(bank, "frame", "day"),
    leads: rows.leads.map((typeKey) => ({
      typeKey,
      variants: variants(bank, "lead", typeKey, true),
    })),
    causes: rows.causes.map((labelPrefix) => ({
      labelPrefix,
      variants: causeVariants(bank, labelPrefix),
    })),
    openings: Object.fromEntries(
      (rows.openings ?? []).map((move) => [
        move,
        variants(bank, "opening", move),
      ]),
    ),
  };
}

export function bringDataFromBank(
  bank: Bank = BRING_BANK,
  rows: BringRows = BRING_ROWS,
): BringData {
  return {
    version: rows.version,
    toldEvent: rows.toldEvent,
    heardKey: rows.heardKey,
    blameKey: rows.blameKey,
    changes: rows.changes.map((row) => ({
      ...row,
      line: variants(bank, "change", row.eventKind),
    })),
    blame: Object.fromEntries(
      rows.blame.map((how) => [how, variants(bank, "blame", how)]),
    ) as BringData["blame"],
  };
}
