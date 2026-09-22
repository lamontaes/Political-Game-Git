import type { WorldContentPacks } from "./runtime-content-packs";
import {
  MIND_STRENGTHS,
  type TraitDeclaration,
  type TraitEffectDeclaration,
  type TraitLoadRejection,
  type TraitPack,
} from "./trait-packs";

/**
 * Traits that arrive in an installed content pack.
 *
 * A content pack is JSON somebody else wrote, so a row may be any shape at
 * all. `loadTraitPacks` validates what a row *means* — a pole key clashing
 * with its balanced key, a lean on a decision this build does not have — and
 * assumes the row is at least the right shape. This file is what makes that
 * assumption true: every row is checked for shape first, and a row that is
 * not a trait or an effect is skipped with its reason.
 *
 * Nothing here refuses a pack. The owner's rule for content is "ignore it and
 * say so": a malformed trait is reported and left out, and the rest of the
 * pack — its other traits, its encounters — loads as if it were not there.
 *
 * The pack name every trait is qualified by is the content pack's own id, so
 * a mod's traits live under `mod.…:` and can never claim a key the build's own
 * packs own. The id is already unique per life and already refused when it
 * is not in the `mod.` namespace.
 */

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** What is wrong with a pole, or null when it has the shape of one. */
function poleProblem(value: unknown, which: string): string | null {
  if (!isRow(value)) return `its ${which} pole is not an object`;
  for (const field of ["key", "label", "description"]) {
    if (!isText(value[field])) return `its ${which} pole needs a ${field}`;
  }
  return null;
}

/** What is wrong with a trait row's shape, or null when it has one. */
function traitShapeProblem(value: Row): string | null {
  for (const field of ["key", "label", "description"]) {
    if (!isText(value[field])) return `it needs a ${field}`;
  }
  if (!isRow(value.poles)) return "it needs low and high poles";
  const low = poleProblem(value.poles.low, "low");
  if (low) return low;
  const high = poleProblem(value.poles.high, "high");
  if (high) return high;
  if (
    !Array.isArray(value.scopes) ||
    value.scopes.some((scope) => !isText(scope))
  ) {
    return "its scopes must be a list of names";
  }
  if (
    value.conferredBy !== "seeded" &&
    value.conferredBy !== "conferred-only" &&
    value.conferredBy !== "player"
  ) {
    return `conferredBy must be "seeded", "conferred-only" or "player"`;
  }
  const scale = value.scale;
  if (!isRow(scale)) return "it needs a scale";
  for (const field of ["balancedKey", "balancedLabel", "balancedDescription"]) {
    if (!isText(scale[field])) return `its scale needs a ${field}`;
  }
  if (
    !Array.isArray(scale.steps) ||
    scale.steps.some(
      (step) =>
        !isRow(step) ||
        !isNumber(step.magnitude) ||
        !(MIND_STRENGTHS as readonly unknown[]).includes(step.strength),
    )
  ) {
    return `its scale steps must each be a magnitude and one of ${MIND_STRENGTHS.join(", ")}`;
  }
  if (
    value.seed !== null &&
    (!isRow(value.seed) ||
      !Array.isArray(value.seed.spread) ||
      value.seed.spread.some((entry) => !isNumber(entry)))
  ) {
    return "its seed must be null or a spread of numbers";
  }
  const movability = value.movability;
  if (!isRow(movability)) return "it needs a movability";
  if (!isRow(movability.settledByStrength)) {
    return "its movability needs a settled resistance per strength";
  }
  for (const strength of MIND_STRENGTHS) {
    if (!isNumber(movability.settledByStrength[strength])) {
      return `its movability needs a settled resistance for a ${strength} hold`;
    }
  }
  for (const field of [
    "settlesOver",
    "unsettledFloor",
    "experienceSpacingDays",
    "pressureCap",
  ]) {
    if (!isNumber(movability[field])) {
      return `its movability needs ${field} as a number`;
    }
  }
  return null;
}

/** What is wrong with an effect row's shape, or null when it has one. */
function effectShapeProblem(value: Row): string | null {
  if (!isText(value.decision)) return "it needs the decision it bears on";
  if (!Array.isArray(value.leans)) return "its leans must be a list";
  for (const [index, lean] of value.leans.entries()) {
    const which = `lean ${index + 1}`;
    if (!isRow(lean)) return `${which} is not an object`;
    for (const field of ["option", "trait", "explanation"]) {
      if (!isText(lean[field])) return `${which} needs a ${field}`;
    }
    if (lean.pole !== "low" && lean.pole !== "high") {
      return `${which} must lean on the "low" or "high" pole`;
    }
    if (
      lean.about !== undefined &&
      lean.about !== "actor" &&
      lean.about !== "subject"
    ) {
      return `${which} is about "actor" or "subject", or says nothing`;
    }
  }
  return null;
}

function where(value: unknown, noun: string, index: number): string {
  const named = isRow(value)
    ? noun === "trait"
      ? value.key
      : value.decision
    : undefined;
  return typeof named === "string" && named.trim()
    ? `${noun} "${named}"`
    : `${noun} ${index + 1}`;
}

export interface InstalledTraitPacks {
  readonly packs: readonly TraitPack[];
  /** Rows skipped for their shape, before `loadTraitPacks` ever saw them. */
  readonly rejections: readonly TraitLoadRejection[];
}

/** The trait packs a life's installed content carries, shape-checked. Pure. */
export function installedTraitPacks(
  contentPacks: WorldContentPacks | undefined,
): InstalledTraitPacks {
  const packs: TraitPack[] = [];
  const rejections: TraitLoadRejection[] = [];
  for (const { pack } of contentPacks?.installed ?? []) {
    if (!pack.traits) continue;
    const traits: TraitDeclaration[] = [];
    const effects: TraitEffectDeclaration[] = [];
    for (const [index, row] of pack.traits.traits.entries()) {
      const problem = isRow(row) ? traitShapeProblem(row) : "it is not a trait";
      if (problem) {
        rejections.push({
          pack: pack.id,
          where: where(row, "trait", index),
          reason: problem,
        });
        continue;
      }
      traits.push(row as unknown as TraitDeclaration);
    }
    for (const [index, row] of pack.traits.effects.entries()) {
      const problem = isRow(row)
        ? effectShapeProblem(row)
        : "it is not an effect";
      if (problem) {
        rejections.push({
          pack: pack.id,
          where: where(row, "effect", index),
          reason: problem,
        });
        continue;
      }
      effects.push(row as unknown as TraitEffectDeclaration);
    }
    packs.push({ pack: pack.id, traits, effects });
  }
  return { packs, rejections };
}
