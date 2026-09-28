import { stableHash } from "../../simulation/ids";
import type { EngineAppearanceChoice } from "../../simulation/types";
import {
  FACIAL_HAIR_STYLES,
  type BodyPresentation,
  type FacialHairStyle,
  type PackPresentation,
} from "./pack";

/**
 * WHO WEARS A BEARD, AND WHO WEARS GLASSES.
 *
 * Both come from the person's own seed, at the shares real surveys give for
 * their age, so a crowd has the mix a real one has and each person keeps
 * theirs on every screen. A player's choice in the creator wins, and is
 * remembered on the saved appearance.
 *
 * The share tables below are in the design checkpoint Claude CTO approves
 * (03 PROJECT LANES, Sept. 28, 2026); each names its source.
 */

function draw(seed: string, question: string): number {
  return (
    Number.parseInt(stableHash(`${seed}:${question}`).slice(0, 8), 16) /
    0x100000000
  );
}

/** One row of a share table: from this age up, this share. */
interface AgeShare {
  readonly fromAge: number;
  readonly share: number;
}

function shareAt(table: readonly AgeShare[], age: number): number {
  let share = 0;
  for (const row of table) if (age >= row.fromAge) share = row.share;
  return share;
}

/**
 * Men with any facial hair, by age: YouGov, "Facial hair" (Great Britain,
 * fieldwork 9/8/2023-9/11/2023, 2,058 adults; "Do you currently have facial
 * hair?", base all men). No public US survey gives this by age, so the
 * British shares stand in for American men: an assumption, stated here.
 * https://ygo-assets-websites-editorial-emea.yougov.net/documents/YouGov_-_Facial_hair_2023.pdf
 */
export const FACIAL_HAIR_SHARE: readonly AgeShare[] = [
  { fromAge: 18, share: 0.66 },
  { fromAge: 25, share: 0.68 },
  { fromAge: 35, share: 0.71 },
  { fromAge: 45, share: 0.54 },
  { fromAge: 55, share: 0.36 },
];

/**
 * Among men with facial hair, the style, by age: the same YouGov table's
 * columns (beard and mustache, stubble, beard only, mustache only), each row
 * scaled to add to one. The survey does not tell a short beard from a full
 * one, so its "beard and mustache" is split evenly between them, and its
 * "beard only" (a beard without a mustache) is drawn as the goatee: both are
 * the game's assumptions.
 */
export const FACIAL_HAIR_STYLE_BY_AGE: readonly {
  readonly fromAge: number;
  readonly weights: Readonly<Record<FacialHairStyle, number>>;
}[] = [
  { fromAge: 18, weights: styleWeights(59, 14, 12, 8) },
  { fromAge: 25, weights: styleWeights(66, 25, 9, 0) },
  { fromAge: 35, weights: styleWeights(59, 29, 8, 1) },
  { fromAge: 45, weights: styleWeights(56, 33, 7, 1) },
  { fromAge: 55, weights: styleWeights(68, 16, 2, 11) },
];

function styleWeights(
  beardAndMustache: number,
  stubble: number,
  beardOnly: number,
  mustacheOnly: number,
): Readonly<Record<FacialHairStyle, number>> {
  const total = beardAndMustache + stubble + beardOnly + mustacheOnly;
  return {
    stubble: stubble / total,
    mustache: mustacheOnly / total,
    goatee: beardOnly / total,
    "short-beard": beardAndMustache / 2 / total,
    "full-beard": beardAndMustache / 2 / total,
  };
}

/**
 * Adults who wear glasses (glasses only, or glasses and contacts), by age:
 * YouGov, "Why most Americans prefer glasses over contact lenses" (5/13/2025,
 * YouGov Profiles). It reports generations; their ages in 2025 set the rows:
 * Gen Z 50% (37 + 13), Millennials 54% (39 + 15), Gen X 55% (glasses only;
 * both was not stated, so this is a floor), Boomers 73% (67 + 6).
 * https://yougov.com/en-us/articles/52157-why-most-americans-prefer-glasses-over-contact-lenses
 */
export const GLASSES_SHARE: readonly AgeShare[] = [
  { fromAge: 18, share: 0.5 },
  { fromAge: 29, share: 0.54 },
  { fromAge: 45, share: 0.55 },
  { fromAge: 61, share: 0.73 },
];

/**
 * Of those who wear glasses, the share who wear them only to read, by age.
 * No public source gives it by age, so it is inferred: presbyopia "usually"
 * begins "after age 45" (National Eye Institute, updated 12/4/2024), and
 * 13.2% of American adults wear over-the-counter readers, "most who do are
 * over 45" (The Vision Council, quoted by Consumer Reports, 8/2/2022). With
 * about half of adults over 45, that is roughly a fifth of them, or about 0.3
 * of the glasses wearers that age. Before 45: none.
 */
export const READING_ONLY_SHARE: readonly AgeShare[] = [
  { fromAge: 18, share: 0 },
  { fromAge: 45, share: 0.3 },
];

/** "none" means a choice for no facial hair (or no glasses). */
export type WornChoice = string | "none";

/**
 * The facial hair a person wears: their saved choice, or one drawn from their
 * seed at their age's share. Feminine presentations wear none.
 */
export function facialHairFor(
  seed: string,
  age: number,
  presentation: BodyPresentation,
  choice: EngineAppearanceChoice | undefined,
): FacialHairStyle | null {
  const chosen = choice?.facialHair;
  if (chosen === "none") return null;
  if (chosen && (FACIAL_HAIR_STYLES as readonly string[]).includes(chosen))
    return chosen as FacialHairStyle;
  if (presentation !== "masculine" || age < 18) return null;
  if (draw(seed, "facial-hair") >= shareAt(FACIAL_HAIR_SHARE, age)) return null;
  const weights = [...FACIAL_HAIR_STYLE_BY_AGE]
    .reverse()
    .find((row) => age >= row.fromAge)!.weights;
  const roll = draw(seed, "facial-hair-style");
  let edge = 0;
  for (const style of FACIAL_HAIR_STYLES) {
    edge += weights[style];
    if (roll < edge) return style;
  }
  return "full-beard";
}

/** When a person has their glasses on. */
export type GlassesWear = "always" | "reading";

/**
 * A person's glasses: their saved choice, or drawn from their seed at their
 * age's share, with some wearing them only to read. The frame is one of the
 * frames the pack has, drawn from the seed; null when they wear none, or the
 * pack has no frames yet.
 */
export function glassesFor(
  seed: string,
  age: number,
  pack: PackPresentation,
  choice: EngineAppearanceChoice | undefined,
): { readonly frame: string; readonly wear: GlassesWear } | null {
  const frames = pack.glasses ?? [];
  if (choice?.glasses === "none") return null;
  const chosen = frames.find((frame) => frame.id === choice?.glasses);
  if (chosen)
    return { frame: chosen.id, wear: choice?.glassesWear ?? "always" };
  if (frames.length === 0 || age < 18) return null;
  if (draw(seed, "glasses") >= shareAt(GLASSES_SHARE, age)) return null;
  const frame =
    frames[Math.floor(draw(seed, "glasses-frame") * frames.length)]!.id;
  return {
    frame,
    wear:
      draw(seed, "glasses-reading") < shareAt(READING_ONLY_SHARE, age)
        ? "reading"
        : "always",
  };
}
