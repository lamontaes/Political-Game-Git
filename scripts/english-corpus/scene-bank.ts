/**
 * Turns the mined scene and bring-it-up banks into the story director's words
 * (`composeScene` in `src/director/scene.ts`, `bringItUp` in
 * `src/director/bring-it-up.ts`). Each mined part names the director's
 * subject (setting, present, cause; change, blame) and its role (the setting
 * kind, the cause's label prefix, the blame's source). A row no record words
 * yet is left empty, and the director leaves that line out.
 *
 * OPUS-WORDS owns this file until OPUS-PEOPLE folds it into the director.
 */
import sceneJson from "../../data/english/parts/scene-words.json" with { type: "json" };
import bringJson from "../../data/english/parts/bring-it-up.json" with { type: "json" };
import { heldByGrades } from "../../src/english/english-grades";
import { SCENE_WORDS, type SceneWords } from "../../src/director/scene";
import { BRING_IT_UP_DATA } from "../../src/director/bring-it-up";

interface Use {
  subject: string;
  role: string;
  choice: string;
}
interface MinedPart {
  key: string;
  text: string;
  uses: Use[];
  shippable: boolean;
}
type Bank = { parts: MinedPart[] };
export const SCENE_BANK = sceneJson as unknown as Bank;
export const BRING_BANK = bringJson as unknown as Bank;

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

function variants(bank: Bank, subject: string, role: string) {
  return bank.parts
    .filter(
      (part) =>
        part.shippable &&
        !heldByGrades(part.key) &&
        part.uses.some((use) => use.subject === subject && use.role === role),
    )
    .map((part) => ({ key: part.key, text: directorText(part.text) }));
}

export function sceneWordsFromBank(bank: Bank = SCENE_BANK): SceneWords {
  return {
    ...SCENE_WORDS,
    version: "words-scene-v1",
    settings: Object.fromEntries(
      Object.keys(SCENE_WORDS.settings).map((kind) => [
        kind,
        variants(bank, "setting", kind),
      ]),
    ),
    present: ["one", "many"].flatMap((stage) =>
      variants(bank, "present", stage).map((row) => ({
        ...row,
        stages: [stage],
      })),
    ),
    causes: SCENE_WORDS.causes.map((row) => ({
      labelPrefix: row.labelPrefix,
      variants: variants(bank, "cause", row.labelPrefix),
    })),
  };
}

export function bringDataFromBank(
  bank: Bank = BRING_BANK,
): typeof BRING_IT_UP_DATA {
  return {
    ...BRING_IT_UP_DATA,
    version: "words-bring-it-up-v1",
    changes: BRING_IT_UP_DATA.changes.map((row) => ({
      ...row,
      line: variants(bank, "change", row.eventKind),
    })),
    blame: Object.fromEntries(
      Object.keys(BRING_IT_UP_DATA.blame).map((how) => [
        how,
        variants(bank, "blame", how),
      ]),
    ) as typeof BRING_IT_UP_DATA.blame,
  };
}
