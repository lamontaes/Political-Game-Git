/**
 * The one place a bank file of `data/english/parts/` becomes the parts a
 * module words from. Each module imports its own bank and maps the parts it
 * gets here to its own variants; which parts those are, and how a bank's
 * `{slot}` becomes the renderer's `{{slot}}`, is decided once, here.
 *
 * One gate decides what play may say: the owner's grades (`heldByGrades`). A
 * part plays unless the grades hold it; the part carries no flag of its own.
 */
import { heldByGrades } from "./english-grades";

/** One place a part is said: the director's subject and the role it words. */
export interface PartUse {
  subject: string;
  role: string;
  requiresFacts?: string[];
}

/** A part of a bank file: the key a grade reaches it by, its words and where it is said. */
export interface BankPart<Use = PartUse> {
  key: string;
  text: string;
  uses: Use[];
}

/** Whether play may say this one part: the owner's grades do not hold it. */
export function playable(part: { key: string }): boolean {
  return !heldByGrades(part.key);
}

/** The parts of a bank, in its order, that the owner's grades leave in and `fits` accepts. */
export function admittedParts<P extends { key: string }>(
  parts: readonly P[],
  fits: (part: P) => boolean = () => true,
): P[] {
  return parts.filter((part) => playable(part) && fits(part));
}

/**
 * `{my_employer}` becomes the renderer's `{{my-employer}}`, and
 * `{last-together}` its `{{last-together}}`. The one converter every bank's
 * slots pass through. `special` words a
 * slot the director names another way ("host" is `{{host}}'s`); it returns
 * nothing for every other slot.
 */
export function directorSlots(
  text: string,
  special?: (slot: string) => string | undefined,
): string {
  return text.replace(
    /\{([\w-]+)\}/g,
    (_all, slot: string) => special?.(slot) ?? `{{${slot.replace(/_/g, "-")}}}`,
  );
}
