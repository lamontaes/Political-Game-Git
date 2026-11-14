/**
 * The one lookup that names a story scene's picture: an ordered list of
 * picture names (and the `@` tokens the records fill in) read from
 * `situationPlaces`, the school list and `sceneSettings` in scene-places.json.
 * It reads data only, no world, so the game (`scene-picture.ts`) and the
 * gap report (`scripts/scene-pictures/build.ts`) cannot disagree on which row
 * a scene used. To give a scene its own picture, add one row to
 * `situationPlaces`; a name nobody has painted yet is skipped, so painting it
 * later is adding it to art/backdrops/manifest.json and nothing else.
 */
import { hasBackdrop } from "./backdrop-places";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const SETTINGS = scenePlaces.sceneSettings as Record<string, string[]>;
const SITUATIONS = scenePlaces.situationPlaces as Record<string, string[]>;
const SCHOOLS = scenePlaces.schoolPlacesByAge;

/** Where a name in the list came from. */
export type PictureRow = "variant" | "type" | "school" | "setting";

export interface PictureStep {
  /** A painted place's name, or an `@` token the records fill in (`@home`, `@org`, `@door`, `@office`, `@seatroom`). */
  readonly name: string;
  readonly row: PictureRow;
}

export interface PictureAsk {
  /** The situation type's key. */
  readonly typeKey: string;
  /** The purpose id of the arc variant the records gave this scene (`ask-signature.lost-job`), when it has one. */
  readonly variant?: string | undefined;
  /** The setting kind the scene was staged in. */
  readonly setting: string;
  /** The setting is an officeholder's seat of government (the director names it a venue). */
  readonly seat?: boolean | undefined;
  /** The player's age, for a school scene. */
  readonly age?: number | undefined;
}

/** The setting key a row is written under: a seat is its own kind of place. */
export function settingKey(ask: Pick<PictureAsk, "setting" | "seat">): string {
  return ask.seat ? "seat" : ask.setting;
}

/**
 * The names a scene tries, in order: the variant's own row, the type's own
 * row, the school list by age, then the setting's default. The first one
 * painted (or filled in from the records) wins.
 */
export function pictureSteps(ask: PictureAsk): PictureStep[] {
  const kind = settingKey(ask);
  const rows = (names: readonly string[] | undefined, row: PictureRow) =>
    (names ?? []).map((name) => ({ name, row }));
  return [
    ...(ask.variant
      ? rows(SITUATIONS[`${ask.variant}:${kind}`], "variant")
      : []),
    ...rows(SITUATIONS[`${ask.typeKey}:${kind}`], "type"),
    ...(kind === "school" && ask.age !== undefined
      ? rows(SCHOOLS.find((row) => ask.age! < row.underAge)?.places, "school")
      : []),
    ...rows(SETTINGS[kind] ?? ["@home"], "setting"),
  ];
}

const DOORS = scenePlaces.doorKnockingPlaces as Record<string, string>;
const DOORS_OWN = scenePlaces.doorKnockingOwn as unknown as Record<
  string,
  readonly string[]
>;

/**
 * The door a resident's kind of dwelling is drawn with: its own door picture
 * when one is painted (doorKnockingOwn), else the shared one for that kind of
 * dwelling, else a house's. The canvass outing and the story scene read this.
 */
export function doorPlaceFor(dwelling: string): string {
  return (
    [...(DOORS_OWN[dwelling] ?? []), DOORS[dwelling], DOORS.house].find(
      (name): name is string => !!name && hasBackdrop(name),
    ) ?? "doorstep-entrance"
  );
}
