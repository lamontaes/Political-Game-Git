import type { OutfitTag } from "./appearance-engine/pack";

/**
 * WHAT PEOPLE WEAR WHERE.
 *
 * Every place has a dress code, and people dress for it: everyday clothes at
 * home and in the neighborhood, business clothes where people work in
 * offices, formal wear where government is done in public. Outdoors in the
 * cold months everyone wears their coat. Each person keeps their own outfit
 * for each (appearance-engine/recipe.ts), so the same neighbor wears the same
 * coat all winter.
 *
 * Places are tagged by the kind of place their scene shows, one rule for every
 * state. Every registered scene must match a rule (dress-code.test.ts), so a
 * new kind of room is tagged when it is added, never dressed by accident.
 */

export type DressCode = "casual" | "business" | "formal";

export interface PlaceDressCode {
  readonly dress: DressCode;
  readonly outdoors: boolean;
}

interface PlaceRule extends PlaceDressCode {
  readonly match: RegExp;
  /** Why this kind of place asks for this. */
  readonly why: string;
}

/** First match wins. */
const PLACE_RULES: readonly PlaceRule[] = [
  {
    match:
      /legislative-chamber|chamber|capitol|senate|assembly|statehouse|courtroom|court|oval|governor|mayor|executive-office|press-briefing|civic-hearing-room|hearing|committee-room/,
    dress: "formal",
    outdoors: false,
    why: "Government done in public: floor sessions, hearings, courts, briefings and the offices of elected executives.",
  },
  {
    match: /office|workroom|city-hall|campaign-storefront|newsroom|bank/,
    dress: "business",
    outdoors: false,
    why: "Offices where staff, aides and campaign workers spend the working day.",
  },
  {
    match: /^park-|pavilion|street|plaza|rally|sidewalk|yard|field/,
    dress: "casual",
    outdoors: true,
    why: "Outdoors in the neighborhood: everyday clothes, and a coat in the cold months.",
  },
  {
    match:
      /^residence-|community-meeting|community-portrait|diner|church|school|store|union-hall/,
    dress: "casual",
    outdoors: false,
    why: "Homes and neighborhood places indoors.",
  },
];

/** The rule a place falls under, or null when no rule names it. */
export function placeRule(sceneId: string): PlaceRule | null {
  return PLACE_RULES.find((rule) => rule.match.test(sceneId)) ?? null;
}

/** A place's dress code; a place no rule names dresses casually, indoors. */
export function placeDressCode(sceneId: string): PlaceDressCode {
  const rule = placeRule(sceneId);
  return rule
    ? { dress: rule.dress, outdoors: rule.outdoors }
    : { dress: "casual", outdoors: false };
}

/**
 * November through March. PLACEHOLDER(wave2): one season for every state; a
 * state's own climate should set it.
 */
export function isColdMonth(isoDate: string): boolean {
  const month = Number(isoDate.slice(5, 7));
  return month >= 11 || month <= 3;
}

/** What a person in this place on this date dresses in. */
export function placeWear(
  sceneId: string,
  isoDate: string,
): Exclude<OutfitTag, "uniform"> {
  const place = placeDressCode(sceneId);
  return place.outdoors && isColdMonth(isoDate) ? "cold" : place.dress;
}
