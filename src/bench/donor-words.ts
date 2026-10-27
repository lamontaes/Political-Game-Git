// How the Campaigns screen says what a call to donors did: the English engine
// words each person's answer and the call's total from the donor-calls bank,
// every fact filled from a record and citing it.
import bank from "../../data/english/parts/donor-calls.json" with { type: "json" };
import { renderLine, type Fact, type Variant } from "../english/bank-line";
import { heldByGrades } from "../english/english-grades";

interface BankPart {
  key: string;
  move: string;
  text: string;
  shippable: boolean;
}

const PARTS = bank.parts as BankPart[];
const VERSION = `donor-calls:${PARTS.length}`;

const variantsOf = (move: string): Variant[] =>
  PARTS.filter(
    (part) => part.move === move && part.shippable && !heldByGrades(part.key),
  ).map((part) => ({
    key: part.key,
    pieceKey: part.key,
    text: part.text.replace(/\{(\w+)\}/g, "{{$1}}"),
  }));

/** Whole dollars, as people write a price. */
export const dollarsOf = (minor: number): string =>
  (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  });

/** One sentence for a move, from the engine's stable pick; each slot cites its record. */
export function donorLine(
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
      bankKey: `donor-calls:${move}`,
      version: VERSION,
      variants: variantsOf(move),
      facts,
      momentKey: `${recordId}|${move}`,
      fallbackSourceId: recordId,
    })?.text ?? ""
  );
}
