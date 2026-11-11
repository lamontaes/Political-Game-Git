import type { PersonFace } from "./scene";
import {
  bustChoices,
  bustOfLook,
  bustPeople,
  bustPerson,
  skinLabel,
  type BustLook,
  type BustPerson,
} from "./bust";
import rules from "./data/whole-figures.json" with { type: "json" };

/**
 * The creator's appearance step (owner, Nov 7, 2026: "busts, never full
 * figures"): a look is one of the bust bank's people (their skin), a hair
 * piece and, where the bank paints any, facial hair. The clothes are not
 * chosen: a bust wears the top its person would wear where they are seen
 * (everyday, work or in office). Every choice is read from the bank's
 * manifest (bust.ts), so a new person or piece there is offered here with no
 * change.
 */
// stopgapId: SG-PLAY-creator-bust-choices
export type LookRecipe = BustLook;

export interface AppearanceRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
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
/** The facial hair a person may wear: none first, then each piece the bank paints for their sex. */
const facesOf = (person: BustPerson): readonly (string | undefined)[] => [
  undefined,
  ...bustChoices(person.sex).face.map((piece) => piece.file),
];

export function appearanceRows(
  recipe: LookRecipe,
  gender: string,
): AppearanceRow[] {
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person.sex);
  const named = (pieces: typeof choices.hair, file: string | undefined) =>
    pieces.find((piece) => piece.file === file)?.label ?? LABELS.none;
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
    ...(choices.face.length
      ? [
          {
            id: "face",
            label: LABELS.rows.face,
            value: named(choices.face, recipe.face),
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
  if (rowId === "body" && showsBody(gender))
    return onPerson(recipe, step(sexes(), person.sex, turn), person.tone);
  if (rowId === "skin") {
    const tones = peopleOf(person.sex).map((row) => row.tone);
    return onPerson(recipe, person.sex, step(tones, person.tone, turn));
  }
  if (rowId === "hair") {
    const hair = bustChoices(person.sex).hair.map((piece) => piece.file);
    return { ...recipe, hair: step(hair, recipe.hair, turn) };
  }
  if (rowId === "face" && bustChoices(person.sex).face.length) {
    const next = step(facesOf(person), recipe.face, turn);
    return {
      person: recipe.person,
      hair: recipe.hair,
      ...(next ? { face: next } : {}),
    };
  }
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

/** A look the bank paints: hair or facial hair the person's set lacks falls back to its first hair and to none. */
function settled(recipe: Partial<LookRecipe> & { person: string }): LookRecipe {
  const person = bustPerson(recipe.person)!;
  const choices = bustChoices(person.sex);
  const hair =
    choices.hair.find((piece) => piece.file === recipe.hair) ??
    choices.hair[0]!;
  const face = choices.face.find((piece) => piece.file === recipe.face);
  return {
    person: person.id,
    hair: hair.file,
    ...(face ? { face: face.file } : {}),
  };
}

export function hash(text: string): number {
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
  const face = pick(facesOf(person), "face");
  return {
    person: person.id,
    hair: pick(bustChoices(sex).hair, "hair").file,
    ...(face ? { face } : {}),
  };
}

/** A look from the page or a person's record, checked against the bank. */
export function readRecipe(text: string): LookRecipe {
  const input = JSON.parse(text) as Partial<LookRecipe>;
  if (!bustPerson(String(input.person ?? ""))) throw new Error("No such look.");
  return settled({
    person: String(input.person),
    ...(input.hair ? { hair: String(input.hair) } : {}),
    ...(input.face ? { face: String(input.face) } : {}),
  });
}

/** The look as a face: the bust every screen draws for it, in everyday clothes (bust.ts). */
export function portraitFace(recipe: LookRecipe): PersonFace | null {
  const bust = bustOfLook(recipe, "everyday");
  return bust ? { bust } : null;
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
    const { hair } = bustChoices(person.sex);
    const face = facesOf(person)[n % facesOf(person).length];
    const bust = bustOfLook(
      {
        person: person.id,
        hair: hair[n % hair.length]!.file,
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
