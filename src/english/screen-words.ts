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
import { playable } from "./bank-parts";

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
