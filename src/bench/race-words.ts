// How the Campaigns screen says where a race stands: sentences from the
// English engine's campaign-standing bank, filled from the campaign's records.
import standing from "../../data/english/parts/campaign-standing.json" with { type: "json" };

interface StandingPart {
  key: string;
  move: string;
  text: string;
  shippable: boolean;
}

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

const hash = (text: string): number =>
  [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * One sentence of the bank for a move, its slots filled from the records. The
 * wording is picked by a stable hash of the record it speaks of, so the same
 * race always reads the same.
 */
export function standingLine(
  move: string,
  recordId: string,
  slots: Readonly<Record<string, string | number>>,
): string {
  const parts = (standing.parts as StandingPart[])
    .filter((part) => part.move === move && part.shippable)
    .sort((a, b) => a.key.localeCompare(b.key));
  const part = parts[hash(`${recordId}|${move}`) % Math.max(1, parts.length)];
  if (!part) return "";
  return part.text.replace(/\{(\w+)\}/g, (_, slot: string) =>
    String(slots[slot] ?? ""),
  );
}
