import { headOf, lookFigures, type Figure } from "./whole-figures";
import type { PersonFace } from "./scene";
import {
  DEFAULT_CLOTHES,
  DEFAULT_SKIN,
  GARMENTS,
  GARMENT_SWATCHES,
  SKIN_SWATCHES,
  clothesSwatch,
  skinSwatch,
  type Garment,
  type Swatch,
} from "./figure-colors";
import {
  HAIR_SWATCHES,
  drawnFigure,
  faces,
  hairStyles,
  hairSwatch,
} from "./figure-hair";

/**
 * The creator's appearance step uses the same standing v2
 * figures the game draws (whole-figures.ts), chosen by body, build and
 * clothes, with the figure itself as the portrait. The look chosen here is the
 * player's figure in every scene.
 */
export interface LookRecipe {
  sex: string;
  build: string;
  outfit: string;
  /** A skin swatch id (figure-colors.ts); the painted tone where absent. */
  skin?: string;
  /** Each piece of clothing's swatch id; the painted gray where absent. */
  jacket?: string;
  shirt?: string;
  pants?: string;
  shoes?: string;
  /** A hair style's number (figure-hair.ts), and its swatch id; bald where absent. */
  hair?: string;
  hairColor?: string;
  /** A face's number (figure-hair.ts); the painted face where absent. */
  face?: string;
}

export interface AppearanceRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly swatch?: string;
  /** A row of colors to pick from, each with its worded name. */
  readonly swatches?: readonly (Swatch & { readonly chosen: boolean })[];
}

const SEX_LABEL: Record<string, string> = { female: "Woman", male: "Man" };
const BUILD_LABEL: Record<string, string> = {
  slim: "Slim",
  medium: "Medium",
  heavy: "Heavy",
};
const GARMENT_LABEL: Record<Garment, string> = {
  jacket: "Jacket color",
  shirt: "Shirt color",
  pants: "Pants color",
  shoes: "Shoes color",
};
/** The pieces an outfit has: only a vest or a blazer has a jacket. */
const garmentsOf = (outfit: string): readonly Garment[] =>
  outfit === "vest" || outfit === "blazer"
    ? GARMENTS
    : GARMENTS.filter((garment) => garment !== "jacket");
const isGarment = (id: string): id is Garment =>
  (GARMENTS as readonly string[]).includes(id);
/** A color row's id is the piece of clothing it colors. */
const garmentRow = (rowId: string) => rowId.replace(/-color$/, "");

const OUTFIT_LABEL: Record<string, string> = {
  base: "T-shirt and shorts",
  shirt: "Button shirt",
  vest: "Vest",
  blazer: "Blazer",
};

const looks = (): readonly Figure[] => lookFigures();
const sexes = () => [...new Set(looks().map((row) => row.sex))].sort();
const options = (key: "build" | "outfit", sex: string) =>
  [
    ...new Set(
      looks()
        .filter((row) => row.sex === sex)
        .map((row) => row[key]),
    ),
  ].sort();

/** The figure a look names, or none where the set has no such figure. */
export function figureFor(recipe: LookRecipe): Figure | undefined {
  return looks().find(
    (row) =>
      row.sex === recipe.sex &&
      row.build === recipe.build &&
      row.outfit === recipe.outfit,
  );
}

function step<T>(items: readonly T[], current: T, by: number): T {
  const index = Math.max(0, items.indexOf(current));
  return items[(index + by + items.length) % items.length]!;
}

/** The body row shows only where the gender does not settle the body. */
const showsBody = (gender: string) => gender !== "male" && gender !== "female";

export function appearanceRows(
  recipe: LookRecipe,
  gender: string,
): AppearanceRow[] {
  return [
    ...(showsBody(gender)
      ? [
          {
            id: "body",
            label: "Body",
            value: SEX_LABEL[recipe.sex] ?? recipe.sex,
          },
        ]
      : []),
    {
      id: "build",
      label: "Build",
      value: BUILD_LABEL[recipe.build] ?? recipe.build,
    },
    {
      id: "outfit",
      label: "Clothes",
      value: OUTFIT_LABEL[recipe.outfit] ?? recipe.outfit,
    },
    colorRow("skin", "Skin", SKIN_SWATCHES, recipe.skin ?? DEFAULT_SKIN),
    ...(faces(recipe.sex).length
      ? [{ id: "face", label: "Face", value: faceName(recipe) }]
      : []),
    ...(hairStyles(recipe.sex).length
      ? [
          {
            id: "hair",
            label: "Hair",
            value: hairName(recipe),
          },
          colorRow(
            "hair-color",
            "Hair color",
            HAIR_SWATCHES,
            recipe.hairColor ?? DEFAULT_HAIR_COLOR,
          ),
        ]
      : []),
    ...garmentsOf(recipe.outfit).map((garment) =>
      colorRow(
        `${garment}-color`,
        GARMENT_LABEL[garment],
        GARMENT_SWATCHES[garment],
        recipe[garment] ?? DEFAULT_CLOTHES,
      ),
    ),
  ];
}

function colorRow(
  id: string,
  label: string,
  list: readonly Swatch[],
  current: string,
): AppearanceRow {
  return {
    id,
    label,
    value: list.find((row) => row.id === current)?.label ?? "",
    swatches: list.map((row) => ({ ...row, chosen: row.id === current })),
  };
}

/** The style's name, or Bald where none is chosen. */
function hairName(recipe: LookRecipe): string {
  const name = hairStyles(recipe.sex).find(
    (row) => String(row.style) === recipe.hair,
  )?.name;
  return name ? sentenceCase(name) : "Bald";
}
/** A painted piece's name as the creator's rows read: capitalized, like Slim and Button shirt. */
const sentenceCase = (name: string) => name[0]!.toUpperCase() + name.slice(1);
/** The face's worded name, or the figure's own painted face where none is chosen. */
function faceName(recipe: LookRecipe): string {
  const name = faces(recipe.sex).find(
    (row) => String(row.face) === recipe.face,
  )?.name;
  return name ? sentenceCase(name) : "Plain";
}

/** Bald first, then each painted style. */
const hairChoices = (sex: string) => [
  "",
  ...hairStyles(sex).map((row) => String(row.style)),
];
const DEFAULT_HAIR_COLOR = "dark-brown";

/** Choose a swatch directly (a click on it). */
export function setColor(
  recipe: LookRecipe,
  rowId: string,
  swatchId: string,
): LookRecipe {
  if (rowId === "hair-color" && hairSwatch(swatchId))
    return { ...recipe, hairColor: swatchId };
  if (rowId === "skin" && skinSwatch(swatchId))
    return { ...recipe, skin: swatchId };
  const garment = garmentRow(rowId);
  if (
    isGarment(garment) &&
    GARMENT_SWATCHES[garment].some((row) => row.id === swatchId)
  )
    return { ...recipe, [garment]: swatchId };
  throw new Error("No such color.");
}

export function moveAppearance(
  recipe: LookRecipe,
  gender: string,
  rowId: string,
  by: number,
): LookRecipe {
  const turn = by < 0 ? -1 : 1;
  if (rowId === "body" && showsBody(gender)) {
    const sex = step(sexes(), recipe.sex, turn);
    return settled({ ...recipe, sex });
  }
  if (rowId === "face") {
    const choices = ["", ...faces(recipe.sex).map((row) => String(row.face))];
    const face = step(choices, recipe.face ?? "", turn);
    const plain = { ...recipe };
    delete plain.face;
    return face ? { ...recipe, face } : plain;
  }
  if (rowId === "hair") {
    const hair = step(hairChoices(recipe.sex), recipe.hair ?? "", turn);
    if (hair)
      return {
        ...recipe,
        hair,
        hairColor: recipe.hairColor ?? DEFAULT_HAIR_COLOR,
      };
    const bald = { ...recipe };
    delete bald.hair;
    return bald;
  }
  if (rowId === "hair-color") {
    const ids = HAIR_SWATCHES.map((row) => row.id);
    return {
      ...recipe,
      hairColor: step(ids, recipe.hairColor ?? DEFAULT_HAIR_COLOR, turn),
    };
  }
  const garment = garmentRow(rowId);
  if (rowId === "skin" || isGarment(garment)) {
    const list =
      rowId === "skin" ? SKIN_SWATCHES : GARMENT_SWATCHES[garment as Garment];
    const key = rowId === "skin" ? "skin" : (garment as Garment);
    const now =
      recipe[key] ?? (key === "skin" ? DEFAULT_SKIN : DEFAULT_CLOTHES);
    const ids = list.map((row) => row.id);
    return { ...recipe, [key]: step(ids, now, turn) };
  }
  if (rowId === "build" || rowId === "outfit")
    return settled({
      ...recipe,
      [rowId]: step(options(rowId, recipe.sex), recipe[rowId], turn),
    });
  throw new Error("No such appearance row.");
}

/**
 * A look whose body matches the chosen gender: a man or a woman always has
 * that body, so a look carried over from before the gender changed (Undo,
 * Reset, an old page) is redrawn on the right body, keeping its build,
 * clothes and colors where that body has them. Any other gender keeps the
 * body chosen on the Body row.
 */
export function lookForGender(recipe: LookRecipe, gender: string): LookRecipe {
  if (showsBody(gender) || recipe.sex === gender) return recipe;
  return settled({ ...recipe, sex: gender });
}

/** A look the set paints: a build or clothes the body lacks fall back to the first it has. */
function settled(recipe: LookRecipe): LookRecipe {
  if (figureFor(recipe)) return recipe;
  const builds = options("build", recipe.sex);
  const outfits = options("outfit", recipe.sex);
  const build = builds.includes(recipe.build) ? recipe.build : builds[0]!;
  const outfit = outfits.includes(recipe.outfit) ? recipe.outfit : outfits[0]!;
  return { ...recipe, sex: recipe.sex, build, outfit };
}

export function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * A whole look drawn from a seed and a draw number (the Randomize button, and
 * the first look a new character is shown). It decides who someone looks
 * like, never what anyone does.
 */
export function drawnAppearance(
  gender: string,
  seed: string,
  draw: number,
): LookRecipe {
  const pick = (items: readonly string[], key: string) =>
    items[hash(`${seed}:${draw}:${key}`) % items.length]!;
  const all = sexes();
  const sex = all.includes(gender) ? gender : pick(all, "body");
  const styles = hairStyles(sex).map((row) => String(row.style));
  const painted = faces(sex).map((row) => String(row.face));
  return settled({
    sex,
    ...(painted.length ? { face: pick(painted, "face") } : {}),
    ...(styles.length
      ? {
          hair: pick(styles, "hair"),
          hairColor: pick(
            HAIR_SWATCHES.map((row) => row.id),
            "hair-color",
          ),
        }
      : {}),
    build: pick(options("build", sex), "build"),
    outfit: pick(options("outfit", sex), "outfit"),
    skin: pick(
      SKIN_SWATCHES.map((row) => row.id),
      "skin",
    ),
    ...Object.fromEntries(
      GARMENTS.map((garment) => [
        garment,
        pick(
          GARMENT_SWATCHES[garment].map((row) => row.id),
          garment,
        ),
      ]),
    ),
  });
}

/** A look from the page or a person's record, checked against the set. */
export function readRecipe(text: string): LookRecipe {
  const input = JSON.parse(text) as Partial<LookRecipe>;
  const recipe = {
    sex: String(input.sex ?? ""),
    build: String(input.build ?? ""),
    outfit: String(input.outfit ?? ""),
  };
  if (!figureFor(recipe)) throw new Error("No such look.");
  return {
    ...recipe,
    ...(input.skin && skinSwatch(String(input.skin))
      ? { skin: String(input.skin) }
      : {}),
    ...Object.fromEntries(
      GARMENTS.flatMap((garment) =>
        input[garment] && clothesSwatch(String(input[garment]))
          ? [[garment, String(input[garment])]]
          : [],
      ),
    ),
    ...(input.face &&
    faces(recipe.sex).some((row) => String(row.face) === String(input.face))
      ? { face: String(input.face) }
      : {}),
    ...(input.hair &&
    hairStyles(recipe.sex).some(
      (row) => String(row.style) === String(input.hair),
    )
      ? {
          hair: String(input.hair),
          hairColor:
            input.hairColor && hairSwatch(String(input.hairColor))
              ? String(input.hairColor)
              : DEFAULT_HAIR_COLOR,
        }
      : {}),
  };
}

const figureName = (file: string) =>
  file
    .split("/")
    .pop()!
    .replace(/\.png$/, "");

/** The look's standing figure, as the game draws it. */
export function portraitPng(recipe: LookRecipe): Buffer {
  const figure = figureFor(recipe);
  if (!figure) throw new Error("No such look.");
  return drawnFigure(figureName(figure.file), recipe);
}

/** The look as a face for a headshot: its figure drawn at `url`, and where its head is. */
export function portraitFace(
  recipe: LookRecipe,
  url: string,
): PersonFace | null {
  const figure = figureFor(recipe);
  const head = figure && headOf(figure);
  return figure && head
    ? { url, head, width: figure.width, height: figure.height }
    : null;
}
