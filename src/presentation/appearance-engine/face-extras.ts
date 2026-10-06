import { stableHash } from "../../simulation/ids";
import type { EngineAppearanceChoice } from "../../simulation/types";
import {
  ACCESSORY_KINDS,
  FACIAL_HAIR_STYLES,
  type AccessoryKind,
  type BodyPresentation,
  type FacialHairStyle,
  type OutfitTag,
  type PackPresentation,
} from "./pack";

/**
 * WHO WEARS A BEARD, GLASSES OR JEWELRY.
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
// ESTIMATED FROM A SIMILAR PLACE: Great Britain's age-specific survey shares
// stand in for the United States; the source, dates, and sample are above.
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

/**
 * WHO WEARS EARRINGS, A NECKLACE, A WATCH, A RING OR A LAPEL PIN.
 *
 * No survey gives these shares, so the first three and the pin were counted:
 * Claude looked at the official portraits of a seeded sample of members of
 * the 119th Congress and wrote down, for each, whether it showed earrings, a
 * necklace and a lapel pin. The sample: legislators-current.yaml from
 * unitedstates/congress-legislators (539 sitting members), 80 women and 80
 * men drawn with random seed 20260928, portraits from unitedstates/images
 * (the Congressional bioguide photographs). Of the 539 members, 156 are women
 * and 383 are men. Four of the 80 women drawn had no portrait yet, so the
 * sample is 76 women and 80 men (156 portraits). Each share is counted within
 * its own sex, so Congress's makeup does not weight it.
 *
 * What the count can and cannot say, stated so nobody trusts it further:
 * 1. It is a count of what a portrait shows. A small stud under hair or a
 *    thin chain under a collar is not seen, so the shares are floors.
 * 2. Officeholders sit for these portraits in formal clothes, so the shares
 *    fit a person in business or formal wear, and the lapel pin fits only
 *    someone who holds an office.
 * 3. It is one count by one reader, not a coded study; counts were 51 of 76
 *    women with earrings, 38 of 76 with a necklace, 21 of 76 with a lapel
 *    pin; 0 of 80 men with earrings, 0 of 80 with a necklace, 18 of 80 with
 *    a lapel pin.
 * 4. A portrait is head and shoulders. No wrist and no hand showed in any of
 *    the 156, so it says nothing about watches or rings. The watch shares are
 *    ESTIMATED FROM AVERAGE for U.S. adults: 25% for feminine presentations
 *    and 40% for masculine presentations. They are not portrait counts.
 * 5. No share varies with age: 156 portraits are too few to split by age.
 */
export const ACCESSORY_SHARE: Readonly<
  Record<AccessoryKind, Readonly<Record<BodyPresentation, number>>>
> = {
  earrings: { feminine: 51 / 76, masculine: 0 },
  necklace: { feminine: 38 / 76, masculine: 0 },
  "lapel-pin": { feminine: 21 / 76, masculine: 18 / 80 },
  // ESTIMATED FROM SIMILAR PEOPLE: general adult watch-wearing shares stand in
  // because the recorded U.S. congressional portraits show no wrists.
  watch: { feminine: 0.25, masculine: 0.4 },
  // PLACEHOLDER(accessories): the share of MARRIED people who wear a wedding
  // ring, not counted from a head-and-shoulders portrait. Unmarried people
  // wear none (see accessoriesFor). Research question filed: the share of
  // married American adults who wear a wedding ring, by sex.
  ring: { feminine: 0.8, masculine: 0.8 },
};

/** The kinds a player chooses in the creator; a lapel pin comes with an office. */
export const CHOSEN_ACCESSORY_KINDS: readonly AccessoryKind[] =
  ACCESSORY_KINDS.filter((kind) => kind !== "lapel-pin");

/** The clothes a lapel pin goes on. */
const PIN_WEAR: readonly OutfitTag[] = ["business", "formal"];

export interface AccessoryContext {
  /** What the place calls for (dress-code.ts); a pin needs a jacket. */
  readonly wear?: Exclude<OutfitTag, "uniform">;
  /** Whether the person holds a public office now; asked only when a pin could be worn. */
  readonly officeholder?: () => boolean;
  /**
   * Whether the person is married now (an active legal marriage). A wedding
   * ring follows this: only a married person wears one, at ACCESSORY_SHARE.
   * When the caller does not say, no ring is drawn.
   */
  readonly married?: () => boolean;
}

/** The kind an accessory id is a variant of ("earrings-pearl" -> "earrings"). */
export function accessoryKindOf(id: string): AccessoryKind | null {
  return (
    ACCESSORY_KINDS.find((kind) => id === kind || id.startsWith(`${kind}-`)) ??
    null
  );
}

/**
 * The accessories a person wears now, by id. What the player chose in the
 * creator (saved as a list, an empty list being a choice of none) wins for
 * the kinds it covers; the rest come from the person's seed at the shares
 * above, one variant per kind from the ones the pack has painted. A lapel pin
 * is never a choice: it goes on a person who holds an office and is dressed
 * for it. Nothing the pack has not painted is ever worn, so recipes and their
 * keys do not change until the art lands.
 */
export function accessoriesFor(
  seed: string,
  age: number,
  presentation: BodyPresentation,
  pack: PackPresentation,
  choice: EngineAppearanceChoice | undefined,
  context: AccessoryContext = {},
): readonly string[] {
  const painted = pack.accessories ?? [];
  if (painted.length === 0 || age < 18) return [];
  const worn: string[] = [];
  for (const kind of ACCESSORY_KINDS) {
    const variants = painted.filter((entry) => entry.kind === kind);
    if (variants.length === 0) continue;
    if (kind === "lapel-pin") {
      if (
        context.wear &&
        PIN_WEAR.includes(context.wear) &&
        draw(seed, "accessory:lapel-pin") <
          ACCESSORY_SHARE[kind][presentation] &&
        context.officeholder?.()
      )
        worn.push(pickVariant(seed, kind, variants));
      continue;
    }
    if (choice?.accessories) {
      const chosen = choice.accessories.find(
        (id) => accessoryKindOf(id) === kind,
      );
      if (chosen && variants.some((entry) => entry.id === chosen))
        worn.push(chosen);
      continue;
    }
    if (kind === "ring" && !context.married?.()) continue;
    if (draw(seed, `accessory:${kind}`) < ACCESSORY_SHARE[kind][presentation])
      worn.push(pickVariant(seed, kind, variants));
  }
  return worn;
}

function pickVariant(
  seed: string,
  kind: AccessoryKind,
  variants: readonly { readonly id: string }[],
): string {
  return variants[
    Math.floor(draw(seed, `accessory-variant:${kind}`) * variants.length)
  ]!.id;
}
