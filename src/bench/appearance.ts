import { recordDraw } from "../core2/kernel/draw-recorder";
import type { PersonFace } from "./scene";
import {
  bustChoices,
  bustOfLook,
  bustTopColors,
  lookTop,
  bustPeople,
  bustPerson,
  skinLabel,
  type BustLook,
  type BustPerson,
} from "./bust";
import rules from "./data/whole-figures.json" with { type: "json" };

/**
 * The creator's appearance step (owner, Nov 7, 2026: "busts, never full
 * figures"): a look is one of the bust bank's people (their skin), a
 * hairstyle in a color, facial hair where the bank paints any, and the
 * clothes they dress up in: a shirt, a tie and a jacket, each in a color
 * (owner, Nov 10: "I would like to be able to change ties and stuff ... I
 * want to see colors and stuff changing as well"), and the everyday top they
 * wear away from work, in a color (owner, Nov 12: "two tabs, everyday and
 * formal, bust flips between them"). Every choice is read from the bank's
 * manifest (bust.ts), so a new person, piece or color there is offered here
 * with no change.
 */
// stopgapId: SG-PLAY-creator-bust-choices
export type LookRecipe = BustLook;

/** The creator's two tabs of clothes; a row without one is shared by both. */
export type LookTab = "everyday" | "formal";
export interface AppearanceRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  /** The tab the row sits in; absent for a row both tabs share. */
  readonly tab?: LookTab;
  /** Everything the row offers, each a swatch or a picture. */
  readonly options: readonly AppearanceOption[];
}

const LABELS = rules.creator;
const PACK_SEX: Readonly<Record<string, string>> = rules.packSex;
const sentenceCase = (name: string) =>
  name ? name[0]!.toUpperCase() + name.slice(1) : name;

const sexes = () => [...new Set(bustPeople().map((row) => row.sex))];
/** The people of one sex, lightest skin first: the Skin row's order. */
const peopleOf = (sex: string) =>
  bustPeople()
    .filter((row) => row.sex === sex)
    .sort((a, b) => a.tone - b.tone || a.id.localeCompare(b.id));
const sexLabel = (sex: string) =>
  (LABELS.sex as Record<string, string>)[sex] ?? sentenceCase(sex);

/** The body row shows only where the gender does not settle the body. */
const showsBody = (gender: string) => !PACK_SEX[gender];
/** The facial hair a person may wear: none first, then each style the bank paints for their sex. */
const facesOf = (person: BustPerson): readonly (string | undefined)[] => [
  undefined,
  ...bustChoices(person).face.map((choice) => choice.key),
];
/** A tie or a jacket a person may wear: none first, then each color the bank paints for their sex. */
const orNone = (
  person: BustPerson,
  layer: "tie" | "jacket",
): readonly (string | undefined)[] => [
  undefined,
  ...bustChoices(person)[layer].map((choice) => choice.key),
];
/** The look with one optional piece set or taken off, its other pieces kept. */
function withPiece(
  recipe: LookRecipe,
  piece: "face" | "tie" | "jacket",
  value: string | undefined,
): LookRecipe {
  const rest = { ...recipe };
  delete rest[piece];
  return value ? { ...rest, [piece]: value } : rest;
}

/** One thing a row offers: a skin, a hairstyle, a color of cloth, each a recipe the look becomes when it is picked. */
interface LookOption {
  readonly id: string;
  readonly label: string;
  readonly recipe: LookRecipe;
  /** The swatch's color; absent where the option is drawn as a picture or is "none". */
  readonly color?: string;
  /** Drawn as a picture of the person wearing it (the Nov 17 ruling: hair and facial hair as pictures). */
  readonly picture?: "head" | "chest";
  readonly chosen: boolean;
}
const NONE = "none";
const COLORS = rules.creator.swatches as Record<string, string>;
const colorOf = (key: string) => COLORS[key] ?? COLORS.unknown!;

/** What each row offers, in the manifest's order; the rows, a pick and a step all read this one list. */
function rowOptions(
  recipe: LookRecipe,
  gender: string,
  rowId: string,
): LookOption[] {
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person);
  const top = lookTop(recipe);
  const make = (
    id: string,
    label: string,
    next: LookRecipe,
    chosen: boolean,
    how: { color?: string; picture?: "head" | "chest" },
  ): LookOption => ({ id, label, recipe: next, chosen, ...how });
  const optional = (
    list: typeof choices.hair,
    piece: "face" | "tie" | "jacket",
    current: string | undefined,
    how: (key: string) => { color?: string; picture?: "head" | "chest" },
  ) => [
    make(
      NONE,
      LABELS.none,
      withPiece(recipe, piece, undefined),
      !current,
      piece === "face" ? how(NONE) : {},
    ),
    ...list.map((choice) =>
      make(
        choice.key,
        choice.label,
        withPiece(recipe, piece, choice.key),
        current === choice.key,
        how(choice.key),
      ),
    ),
  ];
  if (rowId === "body" && showsBody(gender))
    return sexes().map((sex) =>
      make(
        sex,
        sexLabel(sex),
        onPerson(recipe, sex, person.tone),
        person.sex === sex,
        { picture: "head" },
      ),
    );
  if (rowId === "skin")
    return peopleOf(person.sex).map((row) =>
      make(
        row.id,
        skinLabel(row),
        onPerson(recipe, person.sex, row.tone),
        row.id === person.id,
        { color: colorOf(`skin:${row.toneName}`) },
      ),
    );
  if (rowId === "hair")
    return choices.hair.map((choice) =>
      make(
        choice.key,
        choice.label,
        { ...recipe, hair: choice.key },
        recipe.hair === choice.key,
        {
          picture: "head",
        },
      ),
    );
  if (rowId === "hair-color")
    return choices.hairColor.map((choice) =>
      make(
        choice.key,
        choice.label,
        { ...recipe, hairColor: choice.key },
        recipe.hairColor === choice.key,
        { color: colorOf(`hair:${choice.key}`) },
      ),
    );
  if (rowId === "face" && choices.face.length)
    return optional(choices.face, "face", recipe.face, () => ({
      picture: "head",
    }));
  if (rowId === "top" && top && choices.top.length)
    return choices.top.map((choice) =>
      make(
        choice.key,
        choice.label,
        {
          ...recipe,
          top: choice.key,
          topColor: bustTopColors(person, choice.key)[0]!.key,
        },
        top.top === choice.key,
        { picture: "chest" },
      ),
    );
  if (rowId === "top-color" && top)
    return bustTopColors(person, top.top).map((choice) =>
      make(
        choice.key,
        choice.label,
        { ...recipe, top: top.top, topColor: choice.key },
        top.color === choice.key,
        { color: colorOf(`top:${top.top}:${choice.key}`) },
      ),
    );
  if (rowId === "shirt" && choices.shirt.length)
    return choices.shirt.map((choice) =>
      make(
        choice.key,
        choice.label,
        { ...recipe, shirt: choice.key },
        (recipe.shirt ?? choices.shirt[0]!.key) === choice.key,
        { color: colorOf(`shirt:${choice.key}`) },
      ),
    );
  if (rowId === "tie" && choices.tie.length)
    return optional(choices.tie, "tie", recipe.tie, (key) => ({
      color: colorOf(`tie:${key}`),
    }));
  if (rowId === "jacket" && choices.jacket.length)
    return optional(choices.jacket, "jacket", recipe.jacket, (key) => ({
      color: colorOf(`jacket:${key}`),
    }));
  throw new Error("No such appearance row.");
}

/** What a picked option looks like in its row: a swatch's color, or a picture of the person wearing it. */
export interface AppearanceOption {
  readonly id: string;
  readonly label: string;
  readonly chosen: boolean;
  readonly color?: string;
  readonly picture?: "head" | "chest";
  readonly face?: PersonFace;
}

export function appearanceRows(
  recipe: LookRecipe,
  gender: string,
): AppearanceRow[] {
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person);
  const top = lookTop(recipe);
  const topColors = bustTopColors(person, top?.top);
  const row = (id: string, tab?: LookTab): AppearanceRow => {
    const options = rowOptions(recipe, gender, id);
    const chosen = options.find((option) => option.chosen);
    return {
      id,
      label: (LABELS.rows as Record<string, string>)[
        id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
      ]!,
      value: chosen?.label ?? LABELS.none,
      ...(tab ? { tab } : {}),
      options: options.map((option) => {
        const face = option.picture
          ? bustOfLook(option.recipe, "everyday")
          : null;
        return {
          id: option.id,
          label: option.label,
          chosen: option.chosen,
          ...(option.color ? { color: option.color } : {}),
          ...(option.picture && face
            ? { picture: option.picture, face: { bust: face } }
            : {}),
        };
      }),
    };
  };
  return [
    ...(showsBody(gender) ? [row("body")] : []),
    row("skin"),
    row("hair"),
    row("hair-color"),
    ...(choices.face.length ? [row("face")] : []),
    // The everyday top and its color, where the bank paints tops.
    ...(top
      ? [
          row("top", "everyday"),
          ...(topColors.length > 1 ? [row("top-color", "everyday")] : []),
        ]
      : []),
    // The clothes they dress up in, each row only where the bank paints the piece.
    ...(choices.shirt.length ? [row("shirt", "formal")] : []),
    ...(choices.tie.length ? [row("tie", "formal")] : []),
    ...(choices.jacket.length ? [row("jacket", "formal")] : []),
  ];
}

/** The look with one option picked by its id in its row. */
export function pickAppearance(
  recipe: LookRecipe,
  gender: string,
  rowId: string,
  optionId: string,
): LookRecipe {
  const option = rowOptions(recipe, gender, rowId).find(
    (candidate) => candidate.id === optionId,
  );
  if (!option) throw new Error("No such appearance choice.");
  return option.recipe;
}

/** The look with a row stepped to its next or previous option. */
export function moveAppearance(
  recipe: LookRecipe,
  gender: string,
  rowId: string,
  by: number,
): LookRecipe {
  const options = rowOptions(recipe, gender, rowId);
  const at = Math.max(
    0,
    options.findIndex((option) => option.chosen),
  );
  return options[(at + (by < 0 ? -1 : 1) + options.length) % options.length]!
    .recipe;
}

/** The look moved onto another of the bank's people, keeping the hair and facial hair that person's set paints. */
function onPerson(recipe: LookRecipe, sex: string, tone: number): LookRecipe {
  const people = peopleOf(sex);
  const person =
    people.find((row) => row.tone === tone) ?? people[0] ?? bustPeople()[0]!;
  return settled({ ...recipe, person: person.id });
}

/**
 * A look whose body matches the chosen gender: a man or a woman always has
 * that body, so a look carried over from before the gender changed is
 * redrawn on the right body, keeping its skin. Any other gender keeps the
 * body chosen on the Body row.
 */
export function lookForGender(recipe: LookRecipe, gender: string): LookRecipe {
  const sex = PACK_SEX[gender];
  const person = bustPerson(recipe.person)!;
  if (!sex || person.sex === sex) return recipe;
  return onPerson(recipe, sex, person.tone);
}

/** A look the bank paints: a hairstyle, a hair color or a shirt the person's set lacks falls back to its first; facial hair, a tie or a jacket it lacks, to none; a top it lacks, to the game's own pick. */
function settled(recipe: Partial<LookRecipe> & { person: string }): LookRecipe {
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person);
  const has = (list: typeof choices.hair, key: string | undefined) =>
    list.find((choice) => choice.key === key)?.key;
  const face = has(choices.face, recipe.face);
  const shirt = has(choices.shirt, recipe.shirt) ?? choices.shirt[0]?.key;
  const tie = has(choices.tie, recipe.tie);
  const jacket = has(choices.jacket, recipe.jacket);
  // The everyday top: the one named, else the game's own pick for this look, so it stays put as the other rows move.
  const top = lookTop({
    person: person.id,
    hair: has(choices.hair, recipe.hair) ?? choices.hair[0]!.key,
    hairColor:
      has(choices.hairColor, recipe.hairColor) ?? choices.hairColor[0]!.key,
    ...(recipe.top ? { top: recipe.top } : {}),
    ...(recipe.topColor ? { topColor: recipe.topColor } : {}),
  });
  return {
    person: person.id,
    hair: has(choices.hair, recipe.hair) ?? choices.hair[0]!.key,
    hairColor:
      has(choices.hairColor, recipe.hairColor) ?? choices.hairColor[0]!.key,
    ...(face ? { face } : {}),
    ...(shirt ? { shirt } : {}),
    ...(tie ? { tie } : {}),
    ...(jacket ? { jacket } : {}),
    ...(top ? { top: top.top, topColor: top.color } : {}),
  };
}

export function hash(text: string): number {
  recordDraw("look hash");
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * A whole look drawn from a seed and a draw number (the Random button, and
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
  const person = pick(peopleOf(sex), "skin");
  const choices = bustChoices(person);
  const face = pick(facesOf(person), "face");
  const tie = pick(orNone(person, "tie"), "tie");
  const jacket = pick(orNone(person, "jacket"), "jacket");
  const top = choices.top.length ? pick(choices.top, "top").key : undefined;
  const topColors = bustTopColors(person, top);
  return settled({
    person: person.id,
    hair: pick(choices.hair, "hair").key,
    hairColor: pick(choices.hairColor, "hair-color").key,
    ...(face ? { face } : {}),
    ...(choices.shirt.length
      ? { shirt: pick(choices.shirt, "shirt").key }
      : {}),
    ...(tie ? { tie } : {}),
    ...(jacket ? { jacket } : {}),
    ...(top ? { top } : {}),
    ...(topColors.length ? { topColor: pick(topColors, "top-color").key } : {}),
  });
}

/** A look from the page or a person's record, checked against the bank. */
export function readRecipe(text: string): LookRecipe {
  const input = JSON.parse(text) as Partial<LookRecipe>;
  if (!bustPerson(String(input.person ?? ""))) throw new Error("No such look.");
  return settled({
    person: String(input.person),
    ...(input.hair ? { hair: String(input.hair) } : {}),
    ...(input.hairColor ? { hairColor: String(input.hairColor) } : {}),
    ...(input.face ? { face: String(input.face) } : {}),
    ...(input.shirt ? { shirt: String(input.shirt) } : {}),
    ...(input.tie ? { tie: String(input.tie) } : {}),
    ...(input.jacket ? { jacket: String(input.jacket) } : {}),
    ...(input.top ? { top: String(input.top) } : {}),
    ...(input.topColor ? { topColor: String(input.topColor) } : {}),
  });
}

/**
 * The look as a face: the bust in its formal clothes, the shirt with the tie
 * where one is chosen and the jacket over them where one is chosen (bust.ts).
 * In play the same look wears these at work and in office.
 */
export function portraitFace(recipe: LookRecipe): PersonFace | null {
  const bust = bustOfLook(recipe, recipe.jacket ? "official" : "work");
  return bust ? { bust } : null;
}

/** The look in the creator's two tabs: in its everyday top, and in its formal clothes (`portraitFace`). */
export function lookFaces(
  recipe: LookRecipe,
): Record<LookTab, PersonFace | null> {
  const everyday = bustOfLook(recipe, "everyday");
  return {
    everyday: everyday ? { bust: everyday } : null,
    formal: portraitFace(recipe),
  };
}

/**
 * The busts on New game (the approved front mock, fr-new): someone starting
 * out, in everyday clothes, and three who hold office, each drawn from the
 * bank's people by the visit's seed (owner, Nov 17: "the New game screen shows
 * new people each time"). No world exists yet, so these are only who is
 * pictured, never a choice anyone makes. They are the Random button's own draw
 * (`drawnAppearance`), so no new pick exists.
 */
export function newGameFaces(seed: string): {
  start: PersonFace | null;
  advanced: PersonFace[];
} {
  const pictured = (n: number, dress: "everyday" | "official") => {
    const bust = bustOfLook(drawnAppearance("", seed, n), dress);
    return bust ? { bust } : null;
  };
  return {
    start: pictured(0, "everyday"),
    advanced: [1, 2, 3].flatMap((n) => pictured(n, "official") ?? []),
  };
}
