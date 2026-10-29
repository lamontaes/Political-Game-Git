/**
 * The English engine's half of a scene's narration. The director
 * (`composeScene` in `src/director/scene.ts`) says which line the narrator
 * gives (the day, the setting, who is there, what is happening, how the scene
 * opens, what led here), with the facts from the records; this file picks the
 * mined sentence that words it and renders it.
 */
import { P } from "../core2/parameters";
import type { PersonId } from "../core2/types";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishKnowledge,
  type GroundedEnglishPacket,
} from "./grounded-english";
import { sceneWordsFromBank } from "./mined/scene-bank";

const zero = P.zero;
const one = P.one;

interface Variant {
  key: string;
  text: string;
  stages?: string[];
  /** The settings the line can be said in; none, any. */
  settings?: readonly string[];
}
export interface SceneWords {
  version: string;
  and: string;
  settings: Readonly<Record<string, Variant[]>>;
  /** What is happening, by the staged situation's type. */
  leads: readonly { typeKey: string; variants: Variant[] }[];
  causes: readonly { labelPrefix: string; variants: Variant[] }[];
  /** How the scene's first move opens it, by that move ("tell", "farewell"). */
  openings?: Readonly<Record<string, Variant[]>>;
}
/** The default words are the mined bank's. */
export const SCENE_WORDS: SceneWords = sceneWordsFromBank();

export interface Fact {
  text: string;
  sourceRecordIds: readonly string[];
}
export interface SceneLine {
  text: string;
  sourceRecordIds: readonly string[];
  /** The facts the sentence names (its slots), so the director knows what it said. */
  usedFactKeys?: readonly string[];
  /** The bank pieces that said it, so a grade reaches them. */
  parts?: readonly string[];
}

/**
 * A line the narrator gives: the setting by its kind (never the player's own
 * home, and never the day: the screen shows both), who is there, what is happening by the staged situation's type (`lead`), how the
 * first move opens the scene, and what led here by the moment's label
 * (`cause`).
 */
export type NarrationMove =
  | { part: "setting"; kind: string }
  | {
      part: "lead";
      typeKey: string;
      /** The scene's setting: a line written for another place is not said. */
      setting?: string;
    }
  | { part: "opening"; move: string }
  | { part: "cause"; label: string };

const bankOf = (
  words: SceneWords,
  move: NarrationMove,
): { key: string; variants: readonly Variant[] | undefined } | null => {
  switch (move.part) {
    case "setting":
      return {
        key: `scene-setting:${move.kind}`,
        variants: words.settings[move.kind],
      };
    case "lead": {
      const lead = words.leads.find((row) => row.typeKey === move.typeKey);
      return lead
        ? { key: `scene-lead:${lead.typeKey}`, variants: lead.variants }
        : null;
    }
    case "opening":
      return {
        key: `scene-opening:${move.move}`,
        variants: words.openings?.[move.move],
      };
    case "cause": {
      const cause = words.causes.find((row) =>
        move.label.startsWith(row.labelPrefix),
      );
      return cause
        ? { key: `scene-cause:${cause.labelPrefix}`, variants: cause.variants }
        : null;
    }
  }
};

/**
 * Words one line of the narration, or null when the bank has no sentence for
 * it or none fits its facts. The facts may be given as a function: it is
 * called only when the bank has a row for the move (what is happening, what
 * led here), so naming someone for a line the bank cannot say names no one.
 */
export function wordSceneLine(request: {
  seed: string;
  move: NarrationMove;
  viewerId: PersonId;
  facts: Record<string, Fact> | (() => Record<string, Fact>);
  /** The stage a line is worded in ("one" or "many" present, "other" or "alone"). */
  stage?: (facts: Record<string, Fact>) => string;
  momentKey: string;
  fallbackSourceId: string;
  words?: SceneWords;
}): SceneLine | null {
  const words = request.words ?? SCENE_WORDS;
  const found = bankOf(words, request.move);
  if (!found) return null;
  const facts =
    typeof request.facts === "function" ? request.facts() : request.facts;
  // A line written for one kind of place ("has been waiting for you to get
  // home") is said only in a scene set there.
  const move = request.move;
  const rows = found.variants?.filter(
    (row) =>
      move.part !== "lead" ||
      !move.setting ||
      !row.settings ||
      row.settings.includes(move.setting),
  );
  if (!rows?.length) return null;
  const bank: AuthoredEnglishBank = {
    key: found.key,
    version: words.version,
    surface: "scene",
    variants: rows.map((row) => ({ ...row, kind: "template" as const })),
  };
  const ids = [
    ...new Set(Object.values(facts).flatMap((row) => row.sourceRecordIds)),
  ];
  const result = renderGroundedEnglish(
    {
      surface: "scene",
      momentKey: request.momentKey,
      worldSeed: request.seed,
      bankVersion: words.version,
      stage: request.stage?.(facts) ?? "default",
      sourceRecordIds: ids.length ? ids : [request.fallbackSourceId],
      facts,
      viewer: { personId: request.viewerId, traits: {} },
      knowledge: Object.entries(facts).map(([factKey, fact]) => ({
        personId: request.viewerId,
        factKey,
        sourceRecordIds: fact.sourceRecordIds,
      })) as unknown as GroundedEnglishKnowledge[],
    } as unknown as GroundedEnglishPacket,
    bank,
  );
  if (result.kind !== "rendered") return null;
  return {
    text: result.text.charAt(zero).toUpperCase() + result.text.slice(one),
    sourceRecordIds: result.sourceRecordIds,
    usedFactKeys: result.usedFactKeys,
    parts: [result.variantKey],
  };
}

/** The sentences of a scene's opening, said as one paragraph. */
export function sceneParagraph(lines: readonly SceneLine[]): string {
  return lines.map((line) => line.text).join(" ");
}
