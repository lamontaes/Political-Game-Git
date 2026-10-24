import { readFileSync } from "node:fs";
import { lookFigures, type Figure } from "./whole-figures";

/**
 * The creator's appearance step (owner, Oct 24: "The character creator should
 * just be whatever people are being used currently"): the same standing v2
 * figures the game draws (whole-figures.ts), chosen by body, build and
 * clothes, with the figure itself as the portrait. The look chosen here is the
 * player's figure in every scene.
 */
export interface LookRecipe {
  sex: string;
  build: string;
  outfit: string;
}

export interface AppearanceRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly swatch?: string;
}

const SEX_LABEL: Record<string, string> = { female: "Woman", male: "Man" };
const BUILD_LABEL: Record<string, string> = {
  slim: "Slim",
  medium: "Medium",
  heavy: "Heavy",
};
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
  ];
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
  if (rowId === "build" || rowId === "outfit")
    return settled({
      ...recipe,
      [rowId]: step(options(rowId, recipe.sex), recipe[rowId], turn),
    });
  throw new Error("No such appearance row.");
}

/** A look the set paints: a build or clothes the body lacks fall back to the first it has. */
function settled(recipe: LookRecipe): LookRecipe {
  if (figureFor(recipe)) return recipe;
  const builds = options("build", recipe.sex);
  const outfits = options("outfit", recipe.sex);
  const build = builds.includes(recipe.build) ? recipe.build : builds[0]!;
  const outfit = outfits.includes(recipe.outfit) ? recipe.outfit : outfits[0]!;
  return { sex: recipe.sex, build, outfit };
}

function hash(text: string): number {
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
  return settled({
    sex,
    build: pick(options("build", sex), "build"),
    outfit: pick(options("outfit", sex), "outfit"),
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
  return recipe;
}

/** The look's standing figure, as the game draws it. */
export function portraitPng(recipe: LookRecipe): Buffer {
  const figure = figureFor(recipe);
  if (!figure) throw new Error("No such look.");
  return readFileSync(
    new URL(`../../art/people-engine/v2/${figure.file}`, import.meta.url),
  );
}
