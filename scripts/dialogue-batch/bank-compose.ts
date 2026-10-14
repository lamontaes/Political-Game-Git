/**
 * Lines composed from the merged English part banks (schema english-parts/1),
 * for the grading batches. Every line is one bank part with its slots filled
 * from a real record; nothing is written here. A part is chosen by a stable
 * hash of a record id, never by a roll. Development tooling.
 */
import {
  heldByGrades,
  PART_GRADES,
  type PartGradeLedger,
} from "../../src/english/english-grades";

export interface EnglishPart {
  readonly key: string;
  readonly move: string;
  readonly kind: string;
  readonly text: string;
  readonly shippable: boolean;
}
export interface EnglishBank {
  readonly parts: readonly EnglishPart[];
}

/** A stable 32-bit string hash (FNV-1a). */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const slotsOf = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);

/** The parts of a move that fit the facts, after the owner's grades and the exclusion. */
export function fittingParts(
  bank: EnglishBank,
  move: string,
  facts: Record<string, string>,
  excludes?: RegExp,
  grades: PartGradeLedger = PART_GRADES,
): EnglishPart[] {
  return bank.parts.filter(
    (part) =>
      part.shippable &&
      !heldByGrades(part.key, grades) &&
      !heldByGrades(`bank:${part.key}`, grades) &&
      !excludes?.test(part.text) &&
      part.move === move &&
      slotsOf(part.text).every((slot) => (facts[slot] ?? "").trim() !== ""),
  );
}

export function composeFromBank(
  bank: EnglishBank,
  move: string,
  facts: Record<string, string>,
  pickKey: string,
  /** Parts whose words claim something the records do not hold. */
  excludes?: RegExp,
  grades: PartGradeLedger = PART_GRADES,
): { text: string; partKey: string } | null {
  const fits = fittingParts(bank, move, facts, excludes, grades);
  if (fits.length === 0) return null;
  const part = fits[stableHash(pickKey) % fits.length]!;
  const text = part.text.replace(/\{(\w+)\}/g, (_m, slot: string) =>
    facts[slot]!.trim(),
  );
  return { text, partKey: part.key };
}
