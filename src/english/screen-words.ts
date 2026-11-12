/**
 * Short worded lines for the play screens (a calendar entry, a person's sketch
 * and history, a bill paper's warnings), from the English engine's screen banks. A part the owner's
 * grades hold back, or whose slots the record cannot fill, gives null, and
 * the screen shows nothing for it.
 */
import calendarJson from "../../data/english/parts/calendar.json" with { type: "json" };
import personSketchJson from "../../data/english/parts/person-sketch.json" with { type: "json" };
import personHistoryJson from "../../data/english/parts/person-history.json" with { type: "json" };
import billPaperJson from "../../data/english/parts/bill-paper.json" with { type: "json" };
import { directorSlots, playable } from "./bank-parts";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
} from "./grounded-english";

interface ScreenPart {
  key: string;
  text: string;
}
const BANKS: Readonly<Record<string, ReadonlyMap<string, ScreenPart>>> = {
  calendar: new Map(
    (calendarJson.parts as ScreenPart[]).map((part) => [part.key, part]),
  ),
  "person-sketch": new Map(
    (personSketchJson.parts as ScreenPart[]).map((part) => [part.key, part]),
  ),
  "person-history": new Map(
    (personHistoryJson.parts as ScreenPart[]).map((part) => [part.key, part]),
  ),
  "bill-paper": new Map(
    (billPaperJson.parts as ScreenPart[]).map((part) => [part.key, part]),
  ),
};

/** The part `key` of `bank` with its slots filled from `facts`, or null. */
export function screenLine(
  bank: string,
  key: string,
  facts: Readonly<Record<string, string | number>>,
): string | null {
  const part = BANKS[bank]?.get(key);
  if (!part || !playable(part)) return null;
  let missing = false;
  const text = part.text.replace(/\{(\w+)\}/g, (_all, slot: string) => {
    const value = facts[slot];
    if (value === undefined || value === "") missing = true;
    return String(value ?? "");
  });
  return missing ? null : text;
}

/**
 * Every way the bank says `key` that the owner's grades let play: the piece
 * itself, then its other wordings (`<key>.w2`, `<key>.w3` ...), in the bank's
 * order. A screen that tells several lines of one kind picks among them, so no
 * two lines read the same.
 */
export function screenWays(bank: string, key: string): string[] {
  const parts = BANKS[bank];
  if (!parts) return [];
  return [...parts.values()]
    .filter(
      (part) =>
        (part.key === key || part.key.startsWith(`${key}.w`)) && playable(part),
    )
    .map((part) => part.key);
}

/** The words of part `key` of `bank` before its slots are filled, or "". */
export function partText(bank: string, key: string): string {
  return BANKS[bank]?.get(key)?.text ?? "";
}

/**
 * One of several wordings (`keys`) of `bank`, chosen by the English engine's
 * own stable pick for this moment (`momentKey`, the record the line tells),
 * among those whose slots the facts fill; null when none can be said. The
 * facts cite `sourceIds`. A screen never picks a wording by a hash of its own.
 */
export function screenPick(
  bank: string,
  keys: readonly string[],
  facts: Readonly<Record<string, string>>,
  request: { momentKey: string; sourceIds: readonly string[] },
): { key: string; text: string } | null {
  const parts = keys.flatMap((key) => {
    const part = BANKS[bank]?.get(key);
    return part && playable(part) ? [part] : [];
  });
  if (!parts.length || !request.sourceIds.length) return null;
  const grounded = Object.fromEntries(
    Object.entries(facts)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [
        key.replace(/_/g, "-"),
        { text: value, sourceRecordIds: request.sourceIds },
      ]),
  );
  const reader = `${bank}:reader`;
  const result = renderGroundedEnglish(
    {
      surface: "menu",
      momentKey: request.momentKey,
      worldSeed: bank,
      bankVersion: bank,
      stage: bank,
      sourceRecordIds: request.sourceIds,
      facts: grounded,
      viewer: { personId: reader, traits: {} },
      knowledge: Object.keys(grounded).map((factKey) => ({
        personId: reader,
        factKey,
        sourceRecordIds: request.sourceIds,
      })),
    } as unknown as GroundedEnglishPacket,
    {
      key: `screen:${bank}`,
      version: bank,
      surface: "menu",
      variants: parts.map((part) => ({
        key: part.key,
        text: directorSlots(part.text),
        kind: "template" as const,
      })),
    } as unknown as AuthoredEnglishBank,
  );
  return result.kind === "rendered"
    ? { key: result.variantKey, text: result.text }
    : null;
}
