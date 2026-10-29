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
import { portraitOf, portraitPose } from "./whole-figures";
import rules from "./data/whole-figures.json" with { type: "json" };

/**
 * The creator's appearance step: one of the people pack's painted people,
 * their everyday clothes (with a color for each part from that person's
 * palettes) and, separately, their work clothes (a suit, a blazer, a dress)
 * (owner, Oct 29: "The creator mixes formal clothes ... with regular
 * clothes. There needs to be two separate ones"). Rooms dress the player in
 * whichever the place calls for: work clothes at work and in office, everyday
 * clothes elsewhere. Every choice is read from the pack's manifest, so a new
 * person, look or color there is offered here with no change.
 */
export interface LookRecipe {
  /** The pack person's id. */
  person: string;
  /** Everyday clothes: one of the person's everyday looks (people-pack.ts `lookKey`). */
  outfit: string;
  /** Work clothes: one of the person's work looks. */
  work: string;
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
/** Which clothes a look is: everyday, or work (every dress but the everyday one). */
export type Clothes = "everyday" | "work";
const clothesOf = (row: PackFigure): Clothes =>
  row.dress === rules.everydayDress ? "everyday" : "work";
/**
 * Every look of one kind a person has (people-pack.ts `lookKey`: everyday
 * clothes, or an outfit in one hairstyle) that is painted standing, as the
 * creator shows it.
 */
const looksOf = (person: string, clothes: Clothes) => [
  ...new Set(
    packFigures()
      .filter(
        (row) =>
          row.person === person &&
          portraitPose(row) &&
          clothesOf(row) === clothes,
      )
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

/** The figure the creator shows for the everyday or the work clothes: the person standing, facing the viewer. */
export function figureFor(
  recipe: LookRecipe,
  clothes: Clothes = "everyday",
): PackFigure | null {
  const person = packPerson(recipe.person);
  const look = clothes === "work" ? recipe.work : recipe.outfit;
  if (!person || !looksOf(person.id, clothes).includes(look)) return null;
  return portraitOf(
    person,
    { id: person.id, birthDate: "", official: false, look: recipe },
    clothes === "work" ? rules.dressOrder.work : [rules.everydayDress],
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
    // Everyday clothes: their look where the person has several, then its colors.
    ...(looksOf(person.id, "everyday").length > 1
      ? [
          {
            id: "outfit",
            label: LABELS.rows.everyday,
            value: outfitLabel(person.id, recipe.outfit),
          },
        ]
      : []),
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
    // Work clothes, chosen apart from the everyday ones.
    {
      id: "work",
      label: LABELS.rows.work,
      value: outfitLabel(person.id, recipe.work),
    },
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
      outfit: step(looksOf(person.id, "everyday"), recipe.outfit, turn),
    };
  if (rowId === "work")
    return {
      ...recipe,
      work: step(looksOf(person.id, "work"), recipe.work, turn),
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

/**
 * A look the pack paints: clothes or a color the person lacks fall back to
 * their first; a work look saved as the everyday clothes (before the two were
 * separate) becomes the work clothes.
 */
function settled(recipe: Partial<LookRecipe> & { person: string }): LookRecipe {
  const person = packPerson(recipe.person)!;
  const everyday = looksOf(person.id, "everyday");
  const work = looksOf(person.id, "work");
  const outfit = everyday.includes(recipe.outfit ?? "")
    ? recipe.outfit!
    : everyday[0]!;
  const chosenWork = work.includes(recipe.work ?? "")
    ? recipe.work!
    : work.includes(recipe.outfit ?? "")
      ? recipe.outfit!
      : work[0]!;
  const colors = Object.fromEntries(
    Object.entries(recipe.colors ?? {}).filter(
      ([part, name]) => person.palettes[part]?.[name],
    ),
  );
  return {
    person: person.id,
    outfit,
    work: chosenWork,
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
  return {
    person: person.id,
    outfit: pick(looksOf(person.id, "everyday"), "outfit"),
    work: pick(looksOf(person.id, "work"), "work"),
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
  if (!packPerson(String(input.person ?? ""))) throw new Error("No such look.");
  const recipe = settled({
    person: String(input.person),
    ...(input.outfit ? { outfit: String(input.outfit) } : {}),
    ...(input.work ? { work: String(input.work) } : {}),
    ...(input.colors && typeof input.colors === "object"
      ? {
          colors: Object.fromEntries(
            Object.entries(input.colors).map(([k, v]) => [k, String(v)]),
          ),
        }
      : {}),
  });
  if (!figureFor(recipe) || !figureFor(recipe, "work"))
    throw new Error("No such look.");
  return recipe;
}

/** The look's standing figure in its everyday or work clothes, as the game draws it. */
export function portraitPng(
  recipe: LookRecipe,
  clothes: Clothes = "everyday",
): Buffer {
  const figure = figureFor(recipe, clothes);
  if (!figure) throw new Error("No such look.");
  return figurePng(figure, figure.kind === "kit" ? (recipe.colors ?? {}) : {});
}

/** The look as a face for a headshot: its everyday figure drawn at `url`, cropped by the screen to the figure's own head. */
export function portraitFace(
  recipe: LookRecipe,
  url: string,
): PersonFace | null {
  const figure = figureFor(recipe);
  return figure ? faceOfFigure(figure, url) : null;
}
