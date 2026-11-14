/**
 * The one place a bank file of `data/english/parts/` becomes the parts a
 * module words from. Each module imports its own bank and maps the parts it
 * gets here to its own variants; which parts those are, and how a bank's
 * `{slot}` becomes the renderer's `{{slot}}`, is decided once, here.
 *
 * Two things decide what play may say: the owner's grades (`heldByGrades`)
 * and the rules run over every line (`data/english/pulled.json`, written by
 * `npm run words:rules`). A part plays unless the grades hold it or a rule
 * pulled it; the part carries no flag of its own. A part a rule only flagged
 * for a rewrite ("waiting") or for his next sample ("sample") keeps playing.
 * A part a rule judged wrong in some of the places it is said only
 * (`pulledUses`: right from an aunt, wrong from a stranger) keeps its other
 * uses and loses those.
 */
import pulledFile from "../../data/english/pulled.json" with { type: "json" };
import { heldByGrades } from "./english-grades";
import { useSpotId } from "./spot-id";

/** One place a part is said: the director's subject and the role it words. */
export interface PartUse {
  subject: string;
  role: string;
  requiresFacts?: string[];
  /** Facts that rule the piece out where the record holds them, as in scene talk. */
  excludesFacts?: string[];
}

/** A part of a bank file: the key a grade reaches it by, its words and where it is said. */
export interface BankPart<Use = PartUse> {
  key: string;
  text: string;
  uses: Use[];
}

/** The parts a rule pulled, by key (`data/english/pulled.json`). */
const PULLED = new Set(Object.keys(pulledFile.pulled));

/** The places a rule took a part out of, by key, as `useSpotId` strings. */
const PULLED_USES: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(
    (pulledFile as { pulledUses?: Record<string, string[]> }).pulledUses ?? {},
  ).map(([key, spots]) => [key, new Set(spots)]),
);

/** Whether play may say this one part: neither the grades nor a rule hold it. */
export function playable(part: { key: string }): boolean {
  return !heldByGrades(part.key) && !PULLED.has(part.key);
}

/**
 * The part without the places a rule took it out of (`pulledUses`, by
 * `useSpotId`); nothing when every place it is said was taken.
 */
export function withoutPulledUses<P extends { key: string }>(
  part: P,
  pulledUses: ReadonlyMap<string, ReadonlySet<string>> = PULLED_USES,
): P[] {
  const out = pulledUses.get(part.key);
  const uses = (part as { uses?: unknown }).uses;
  if (!out || !Array.isArray(uses)) return [part];
  const kept = (uses as Record<string, unknown>[]).filter(
    (use) => !out.has(useSpotId(use)),
  );
  return kept.length ? [{ ...part, uses: kept }] : [];
}

/** The parts of a bank, in its order, that the owner's grades leave in and `fits` accepts. */
export function admittedParts<P extends { key: string }>(
  parts: readonly P[],
  fits: (part: P) => boolean = () => true,
): P[] {
  return parts
    .filter((part) => playable(part) && fits(part))
    .flatMap((part) => withoutPulledUses(part));
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
