import type { PersonFace } from "./scene";
import { faceOfFigure } from "./scene";
import {
  colorParts,
  figurePng,
  lookKey,
  lookLabel,
  packFigures,
  packPeople,
  packPerson,
  type PackFigure,
  type PackPerson,
} from "./people-pack";
import { portraitOf } from "./whole-figures";
import rules from "./data/whole-figures.json" with { type: "json" };

/**
 * The creator's appearance step: one of the people pack's painted people,
 * an outfit (everyday clothes or one of the looks painted for them), and for
 * everyday clothes a color for each part from that person's palettes. Every
 * choice is read from the pack's manifest, so a new person, outfit or color
 * there is offered here with no change. The look chosen here is the player's
 * figure in every scene.
 */
export interface LookRecipe {
  /** The pack person's id. */
  person: string;
  outfit: string;
  /** A palette color's name for each recolorable part; the painted color where absent. */
  colors?: Readonly<Record<string, string>>;
}

export interface Swatch {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}
export interface AppearanceRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly swatch?: string;
  /** A row of colors to pick from, each with its worded name. */
  readonly swatches?: readonly (Swatch & { readonly chosen: boolean })[];
}

const LABELS = rules.creator;
const PACK_SEX: Readonly<Record<string, string>> = rules.packSex;
const EVERYDAY = "everyday";
const sentenceCase = (name: string) =>
  name ? name[0]!.toUpperCase() + name.slice(1) : name;

const sexes = () => [...new Set(packPeople().map((row) => row.sex))];
const peopleOf = (sex: string) => packPeople().filter((row) => row.sex === sex);
/**
 * Every look a person has (people-pack.ts `lookKey`: everyday clothes, or an
 * outfit in one hairstyle), each one they can be drawn in holding nothing.
 */
const outfitsOf = (person: string) => [
  ...new Set(
    packFigures()
      .filter((row) => row.person === person && !row.prop)
      .map(lookKey),
  ),
];
/** A look's worded name: everyday clothes, else the manifest's own label for it. */
function outfitLabel(person: string, look: string): string {
  if (look === EVERYDAY) return LABELS.everyday;
  return sentenceCase(lookLabel(person, look) ?? look.split(":")[0]!);
}
const partLabel = (part: string) =>
  (LABELS.parts as Record<string, string>)[part] ??
  `${sentenceCase(part)} color`;
const sexLabel = (sex: string) =>
  (LABELS.sex as Record<string, string>)[sex] ?? sentenceCase(sex);

/** The palette of one part, as swatches. */
function swatches(person: PackPerson, part: string): Swatch[] {
  return Object.entries(person.palettes[part] ?? {}).map(([name, rgb]) => ({
    id: name,
    label: sentenceCase(name),
    color: `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`,
  }));
}
/** The parts a look recolors: everyday clothes only; a look is painted whole. */
const partsOf = (recipe: LookRecipe, person: PackPerson) =>
  recipe.outfit === EVERYDAY ? colorParts(person) : [];

/** The figure the creator shows for a look: the person standing, facing the viewer. */
export function figureFor(recipe: LookRecipe): PackFigure | null {
  const person = packPerson(recipe.person);
  if (!person || !outfitsOf(person.id).includes(recipe.outfit)) return null;
  return portraitOf(
    person,
    { id: person.id, birthDate: "", official: false, look: recipe },
    [],
  );
}

function step<T>(items: readonly T[], current: T, by: number): T {
  const index = Math.max(0, items.indexOf(current));
  return items[(index + by + items.length) % items.length]!;
}

/** The body row shows only where the gender does not settle the body. */
const showsBody = (gender: string) => !PACK_SEX[gender];

export function appearanceRows(
  recipe: LookRecipe,
  gender: string,
): AppearanceRow[] {
  const person = packPerson(recipe.person)!;
  return [
    ...(showsBody(gender)
      ? [{ id: "body", label: "Body", value: sexLabel(person.sex) }]
      : []),
    { id: "build", label: "Build", value: sentenceCase(person.build) },
    {
      id: "outfit",
      label: "Clothes",
      value: outfitLabel(person.id, recipe.outfit),
    },
    ...partsOf(recipe, person).map((part) => {
      const list = swatches(person, part);
      const current = recipe.colors?.[part] ?? list[0]!.id;
      return {
        id: part,
        label: partLabel(part),
        value: list.find((row) => row.id === current)?.label ?? "",
        swatches: list.map((row) => ({ ...row, chosen: row.id === current })),
      };
    }),
  ];
}

/** Choose a swatch directly (a click on it). */
export function setColor(
  recipe: LookRecipe,
  rowId: string,
  swatchId: string,
): LookRecipe {
  const person = packPerson(recipe.person)!;
  if (
    !partsOf(recipe, person).includes(rowId) ||
    !person.palettes[rowId]?.[swatchId]
  )
    throw new Error("No such color.");
  return { ...recipe, colors: { ...recipe.colors, [rowId]: swatchId } };
}

export function moveAppearance(
  recipe: LookRecipe,
  gender: string,
  rowId: string,
  by: number,
): LookRecipe {
  const turn = by < 0 ? -1 : 1;
  const person = packPerson(recipe.person)!;
  if (rowId === "body" && showsBody(gender)) {
    const sex = step(sexes(), person.sex, turn);
    return onPerson(recipe, sex, person.build);
  }
  if (rowId === "build") {
    const builds = peopleOf(person.sex).map((row) => row.build);
    return onPerson(recipe, person.sex, step(builds, person.build, turn));
  }
  if (rowId === "outfit")
    return {
      ...recipe,
      outfit: step(outfitsOf(person.id), recipe.outfit, turn),
    };
  if (partsOf(recipe, person).includes(rowId)) {
    const ids = swatches(person, rowId).map((row) => row.id);
    const now = recipe.colors?.[rowId] ?? ids[0]!;
    return {
      ...recipe,
      colors: { ...recipe.colors, [rowId]: step(ids, now, turn) },
    };
  }
  throw new Error("No such appearance row.");
}

/** The look moved onto another of the pack's people, keeping the outfit and colors they have. */
function onPerson(recipe: LookRecipe, sex: string, build: string): LookRecipe {
  const people = peopleOf(sex);
  const person =
    people.find((row) => row.build === build) ?? people[0] ?? packPeople()[0]!;
  return settled({ ...recipe, person: person.id });
}

/**
 * A look whose body matches the chosen gender: a man or a woman always has
 * that body, so a look carried over from before the gender changed is
 * redrawn on the right body, keeping its build, clothes and colors where that
 * body has them. Any other gender keeps the body chosen on the Body row.
 */
export function lookForGender(recipe: LookRecipe, gender: string): LookRecipe {
  const sex = PACK_SEX[gender];
  const person = packPerson(recipe.person)!;
  if (!sex || person.sex === sex) return recipe;
  return onPerson(recipe, sex, person.build);
}

/** A look the pack paints: an outfit or a color the person lacks falls back to their first. */
function settled(recipe: LookRecipe): LookRecipe {
  const person = packPerson(recipe.person)!;
  const outfits = outfitsOf(person.id);
  const outfit = outfits.includes(recipe.outfit) ? recipe.outfit : outfits[0]!;
  const colors = Object.fromEntries(
    Object.entries(recipe.colors ?? {}).filter(
      ([part, name]) => person.palettes[part]?.[name],
    ),
  );
  return {
    person: person.id,
    outfit,
    ...(Object.keys(colors).length ? { colors } : {}),
  };
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
  const pick = <T>(items: readonly T[], key: string) =>
    items[hash(`${seed}:${draw}:${key}`) % items.length]!;
  const sex = PACK_SEX[gender] ?? pick(sexes(), "body");
  const person = pick(peopleOf(sex), "build");
  const outfit = pick(outfitsOf(person.id), "outfit");
  return {
    person: person.id,
    outfit,
    colors: Object.fromEntries(
      colorParts(person).map((part) => [
        part,
        pick(Object.keys(person.palettes[part]!), part),
      ]),
    ),
  };
}

/** A look from the page or a person's record, checked against the pack. */
export function readRecipe(text: string): LookRecipe {
  const input = JSON.parse(text) as Partial<LookRecipe>;
  const recipe = {
    person: String(input.person ?? ""),
    outfit: String(input.outfit ?? ""),
    ...(input.colors && typeof input.colors === "object"
      ? {
          colors: Object.fromEntries(
            Object.entries(input.colors).map(([k, v]) => [k, String(v)]),
          ),
        }
      : {}),
  };
  if (!figureFor(recipe)) throw new Error("No such look.");
  return settled(recipe);
}

/** The look's standing figure, as the game draws it. */
export function portraitPng(recipe: LookRecipe): Buffer {
  const figure = figureFor(recipe);
  if (!figure) throw new Error("No such look.");
  return figurePng(figure, figure.kind === "kit" ? (recipe.colors ?? {}) : {});
}

/** The look as a face for a headshot: its figure drawn at `url`, cropped by the screen to the figure's own head. */
export function portraitFace(
  recipe: LookRecipe,
  url: string,
): PersonFace | null {
  const figure = figureFor(recipe);
  return figure ? faceOfFigure(figure, url) : null;
}
