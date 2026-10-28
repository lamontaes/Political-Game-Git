/**
 * The one place a bank file of `data/english/parts/` becomes the parts a
 * module words from. Each module imports its own bank and maps the parts it
 * gets here to its own variants; which parts those are, and how a bank's
 * `{slot}` becomes the renderer's `{{slot}}`, is decided once, here.
 *
 * A part play may say is released (`shippable`) and not held back by the
 * owner's grades (`heldByGrades`). A grading page may say the held ones.
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
  shippable: boolean;
}

/** Which of a bank's parts to take: the released ones, the unreleased ones, or both. */
export type Admission = "shipped" | "held" | "all";

/**
 * The parts of a bank, in its order, that the owner's grades leave in and
 * `fits` accepts: the released ones by default, `held` for the ones not yet
 * released (grading only), `all` for both.
 */
export function admittedParts<P extends { key: string; shippable?: boolean }>(
  parts: readonly P[],
  fits: (part: P) => boolean = () => true,
  which: Admission = "shipped",
): P[] {
  return parts.filter(
    (part) =>
      (which === "all" || !!part.shippable === (which === "shipped")) &&
      !heldByGrades(part.key) &&
      fits(part),
  );
}

/**
 * The parts a slot may say. Play says only shipped parts. A grading page
 * (`heldFirst`) says the held ones wherever one fits, so the owner reads each
 * in a real scene; a slot no held part fits keeps its shipped parts.
 */
export function partsToSay<P extends { key: string; shippable?: boolean }>(
  parts: readonly P[],
  fits: (part: P) => boolean,
  heldFirst = false,
): P[] {
  const shipped = admittedParts(parts, fits);
  if (!heldFirst) return shipped;
  const held = admittedParts(parts, fits, "held");
  return held.length ? held : shipped;
}

/** Whether play may say this one part: released and not held back by the grades. */
export function playable(part: { key: string; shippable?: boolean }): boolean {
  return !!part.shippable && !heldByGrades(part.key);
}

/**
 * `{my_employer}` becomes the renderer's `{{my-employer}}`. `special` words a
 * slot the director names another way ("host" is `{{host}}'s`); it returns
 * nothing for every other slot.
 */
export function directorSlots(
  text: string,
  special?: (slot: string) => string | undefined,
): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => special?.(slot) ?? `{{${slot.replace(/_/g, "-")}}}`,
  );
}
