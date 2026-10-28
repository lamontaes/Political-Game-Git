// How the Campaigns screen says where a race stands: the English engine
// words each move from the campaign-standing bank, its facts filled from the
// campaign's records and each fact citing the record it came from.
import standing from "../../data/english/parts/campaign-standing.json" with { type: "json" };
import { renderLine, type Fact, type Variant } from "../english/bank-line";
import { heldByGrades } from "../english/english-grades";

interface StandingPart {
  key: string;
  move: string;
  text: string;
  shippable: boolean;
}

const PARTS = standing.parts as StandingPart[];
const VERSION = `campaign-standing:${PARTS.length}`;

/** The bank's shippable, ungraded-down parts for a move, as engine variants. */
const variantsOf = (move: string): Variant[] =>
  PARTS.filter(
    (part) => part.move === move && part.shippable && !heldByGrades(part.key),
  ).map((part) => ({
    key: part.key,
    pieceKey: part.key,
    text: part.text.replace(/\{(\w+)\}/g, "{{$1}}"),
  }));

/** "Ann, Bo and Cy": a list of names the way people say it. */
export function nameList(names: readonly string[]): string {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Whole dollars, as people write a price. */
export const dollarsOf = (minor: number): string =>
  (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  });

/** A record's date as people write it: "March 3, 2026". */
export const dateWords = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * One sentence for a move, said to the player, from the engine's stable pick
 * among the bank's wordings; every slot is a fact citing its record.
 */
export function standingLine(
  seed: string,
  playerId: string,
  move: string,
  recordId: string,
  slots: Readonly<Record<string, string | number>>,
): string {
  const facts: Record<string, Fact> = Object.fromEntries(
    Object.entries(slots).map(([slot, value]) => [
      slot,
      { text: String(value), sourceRecordIds: [recordId] },
    ]),
  );
  return (
    renderLine({
      seed,
      surface: "menu",
      holderId: playerId,
      bankKey: `campaign-standing:${move}`,
      version: VERSION,
      variants: variantsOf(move),
      facts,
      momentKey: `${recordId}|${move}`,
      fallbackSourceId: recordId,
    })?.text ?? ""
  );
}
