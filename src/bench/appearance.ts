import { recordDraw } from "../core2/kernel/draw-recorder";
import type { PersonFace } from "./scene";
import {
  bustChoices,
  bustOfLook,
  bustTopColors,
  lookTop,
  bustPeople,
  bustPerson,
  bustSwatch,
  bustChoiceLabel,
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
  /** A color row's choices as swatches (owner, Nov 16: "skin and colors as swatches"). */
  readonly swatches?: readonly AppearanceSwatch[];
  /** A hairstyle or facial hair row's choices as pictures of the look wearing each (owner, Nov 16). */
  readonly pictures?: readonly AppearancePicture[];
}
/** One color on a swatch row; no color for "none" (no tie, no jacket). */
export interface AppearanceSwatch {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
  readonly chosen: boolean;
}
/** One style on a picture row: the look's face wearing it. */
export interface AppearancePicture {
  readonly id: string;
  readonly label: string;
  readonly face: PersonFace | null;
  readonly chosen: boolean;
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

function step<T>(items: readonly T[], current: T, by: number): T {
  const index = Math.max(0, items.indexOf(current));
  return items[(index + by + items.length) % items.length]!;
}

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

export function appearanceRows(
  recipe: LookRecipe,
  gender: string,
): AppearanceRow[] {
  return namedRows(recipe, gender).map((row) =>
    withChoices(row, recipe, gender),
  );
}

/** The keys a row may be set to, in the order its arrows step through them. */
function rowKeys(
  recipe: LookRecipe,
  rowId: string,
): readonly (string | undefined)[] {
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person);
  const keys = (list: readonly { key: string }[]) => list.map((c) => c.key);
  if (rowId === "skin") return peopleOf(person.sex).map((row) => row.id);
  if (rowId === "hair") return keys(choices.hair);
  if (rowId === "hair-color") return keys(choices.hairColor);
  if (rowId === "face") return facesOf(person);
  if (rowId === "shirt") return keys(choices.shirt);
  if (rowId === "tie" || rowId === "jacket") return orNone(person, rowId);
  if (rowId === "top-color")
    return keys(bustTopColors(person, lookTop(recipe)?.top));
  return [];
}
/** What a row holds now, as one of its keys. */
function rowKey(recipe: LookRecipe, rowId: string): string | undefined {
  if (rowId === "skin") return recipe.person;
  if (rowId === "hair") return recipe.hair;
  if (rowId === "hair-color") return recipe.hairColor;
  if (rowId === "face") return recipe.face;
  if (rowId === "shirt") return recipe.shirt;
  if (rowId === "tie") return recipe.tie;
  if (rowId === "jacket") return recipe.jacket;
  if (rowId === "top-color") return lookTop(recipe)?.color;
  return undefined;
}
const SWATCH_KIND = {
  skin: "skin",
  "hair-color": "hairColor",
  shirt: "shirt",
  tie: "tie",
  jacket: "jacket",
  "top-color": "top",
} as const;
const PICTURE_ROWS = new Set(["hair", "face"]);

/** A row with its choices: swatches for a color, pictures for a hairstyle or facial hair. */
function withChoices(
  row: AppearanceRow,
  recipe: LookRecipe,
  gender: string,
): AppearanceRow {
  const person = bustPerson(recipe.person)!;
  const now = rowKey(recipe, row.id);
  const kind = SWATCH_KIND[row.id as keyof typeof SWATCH_KIND];
  if (kind)
    return {
      ...row,
      swatches: rowKeys(recipe, row.id).map((key) => ({
        id: key ?? "",
        label: key
          ? kind === "skin"
            ? skinLabel(bustPerson(key)!)
            : (bustChoiceLabel(key) ?? key)
          : LABELS.none,
        ...(key
          ? { color: bustSwatch(person, kind, key, lookTop(recipe)?.top) }
          : {}),
        chosen: key === now,
      })),
    };
  if (PICTURE_ROWS.has(row.id))
    return {
      ...row,
      pictures: rowKeys(recipe, row.id).map((key) => {
        const look = pickAppearance(recipe, gender, row.id, key ?? "");
        return {
          id: key ?? "",
          label: key ? (bustChoiceLabel(key) ?? key) : LABELS.none,
          face: portraitFace(look),
          chosen: key === now,
        };
      }),
    };
  return row;
}

/**
 * The look with one row set to a chosen key (a swatch or a picture clicked);
 * "" is none on a row that may be empty. A key the row does not offer is refused.
 */
export function pickAppearance(
  recipe: LookRecipe,
  gender: string,
  rowId: string,
  key: string,
): LookRecipe {
  const offered = rowKeys(recipe, rowId);
  const want = key === "" ? undefined : key;
  if (!offered.includes(want)) throw new Error("No such appearance choice.");
  if (rowId === "skin") {
    const wearer = bustPerson(key)!;
    return lookForGender(onPerson(recipe, wearer.sex, wearer.tone), gender);
  }
  if (rowId === "hair") return { ...recipe, hair: key };
  if (rowId === "hair-color") return { ...recipe, hairColor: key };
  if (rowId === "face") return withPiece(recipe, "face", want);
  if (rowId === "shirt") return { ...recipe, shirt: key };
  if (rowId === "tie" || rowId === "jacket")
    return withPiece(recipe, rowId, want);
  if (rowId === "top-color") {
    const top = lookTop(recipe)!;
    return { ...recipe, top: top.top, topColor: key };
  }
  throw new Error("No such appearance row.");
}

/** The rows' names and current values, before their choices are added. */
function namedRows(recipe: LookRecipe, gender: string): AppearanceRow[] {
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person);
  const named = (list: typeof choices.hair, key: string | undefined) =>
    list.find((choice) => choice.key === key)?.label ?? LABELS.none;
  const top = lookTop(recipe);
  const topColors = bustTopColors(person, top?.top);
  return [
    ...(showsBody(gender)
      ? [{ id: "body", label: LABELS.rows.body, value: sexLabel(person.sex) }]
      : []),
    { id: "skin", label: LABELS.rows.skin, value: skinLabel(person) },
    {
      id: "hair",
      label: LABELS.rows.hair,
      value: named(choices.hair, recipe.hair),
    },
    {
      id: "hair-color",
      label: LABELS.rows.hairColor,
      value: named(choices.hairColor, recipe.hairColor),
    },
    ...(choices.face.length
      ? [
          {
            id: "face",
            label: LABELS.rows.face,
            value: named(choices.face, recipe.face),
          },
        ]
      : []),
    // The everyday top and its color, where the bank paints tops.
    ...(top
      ? [
          {
            id: "top",
            label: LABELS.rows.top,
            value: named(choices.top, top.top),
            tab: "everyday" as const,
          },
          ...(topColors.length > 1
            ? [
                {
                  id: "top-color",
                  label: LABELS.rows.topColor,
                  value: named(topColors, top.color),
                  tab: "everyday" as const,
                },
              ]
            : []),
        ]
      : []),
    // The clothes they dress up in, each row only where the bank paints the piece.
    ...(choices.shirt.length
      ? [
          {
            id: "shirt",
            label: LABELS.rows.shirt,
            value: named(choices.shirt, recipe.shirt),
            tab: "formal" as const,
          },
        ]
      : []),
    ...(choices.tie.length
      ? [
          {
            id: "tie",
            label: LABELS.rows.tie,
            value: named(choices.tie, recipe.tie),
            tab: "formal" as const,
          },
        ]
      : []),
    ...(choices.jacket.length
      ? [
          {
            id: "jacket",
            label: LABELS.rows.jacket,
            value: named(choices.jacket, recipe.jacket),
            tab: "formal" as const,
          },
        ]
      : []),
  ];
}

export function moveAppearance(
  recipe: LookRecipe,
  gender: string,
  rowId: string,
  by: number,
): LookRecipe {
  const turn = by < 0 ? -1 : 1;
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person);
  const keys = (list: typeof choices.hair) => list.map((choice) => choice.key);
  if (rowId === "body" && showsBody(gender))
    return onPerson(recipe, step(sexes(), person.sex, turn), person.tone);
  if (rowId === "skin") {
    const tones = peopleOf(person.sex).map((row) => row.tone);
    return onPerson(recipe, person.sex, step(tones, person.tone, turn));
  }
  if (rowId === "hair")
    return { ...recipe, hair: step(keys(choices.hair), recipe.hair, turn) };
  if (rowId === "hair-color")
    return {
      ...recipe,
      hairColor: step(keys(choices.hairColor), recipe.hairColor, turn),
    };
  if (rowId === "face" && choices.face.length)
    return withPiece(recipe, "face", step(facesOf(person), recipe.face, turn));
  const top = lookTop(recipe);
  if (rowId === "top" && top && choices.top.length) {
    const next = step(keys(choices.top), top.top, turn);
    return {
      ...recipe,
      top: next,
      topColor: keys(bustTopColors(person, next))[0]!,
    };
  }
  if (rowId === "top-color" && top) {
    const colors = keys(bustTopColors(person, top.top));
    return { ...recipe, top: top.top, topColor: step(colors, top.color, turn) };
  }
  if (rowId === "shirt" && choices.shirt.length)
    return {
      ...recipe,
      shirt: step(keys(choices.shirt), recipe.shirt ?? "", turn),
    };
  if (rowId === "tie" && choices.tie.length)
    return withPiece(
      recipe,
      "tie",
      step(orNone(person, "tie"), recipe.tie, turn),
    );
  if (rowId === "jacket" && choices.jacket.length)
    return withPiece(
      recipe,
      "jacket",
      step(orNone(person, "jacket"), recipe.jacket, turn),
    );
  throw new Error("No such appearance row.");
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
 * out, in everyday clothes, and three who hold office, each a different one
 * of the bank's people. No world exists yet, so they are the bank's own
 * people in its order, the same every visit: who is pictured, never a choice
 * anyone makes.
 */
export function newGameFaces(): {
  start: PersonFace | null;
  advanced: PersonFace[];
} {
  const kinds = sexes();
  const pictured = (n: number, dress: "everyday" | "official") => {
    const people = peopleOf(kinds[n % kinds.length]!);
    const person = people[n % people.length]!;
    const choices = bustChoices(person);
    const face = facesOf(person)[n % facesOf(person).length];
    const bust = bustOfLook(
      {
        person: person.id,
        hair: choices.hair[n % choices.hair.length]!.key,
        hairColor: choices.hairColor[n % choices.hairColor.length]!.key,
        ...(face ? { face } : {}),
      },
      dress,
    );
    return bust ? { bust } : null;
  };
  return {
    start: pictured(3, "everyday"),
    advanced: [0, 1, 2].flatMap((n) => pictured(n, "official") ?? []),
  };
}
