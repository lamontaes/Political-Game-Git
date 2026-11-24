// The bust bank (owner, Nov 7, 2026: "maybe just busts for most things and
// full body for certain scenes"; Nov 10: "we need to start transitioning to
// the bust system"). A person on a menu is a head, their clothes (a shirt, a
// tie and a jacket as layers, or one whole top), facial hair and hair, each a
// picture on one shared canvas, stacked in the manifest's order with nothing
// moved, scaled or tinted (owner, Nov 10: "I would like to be able to change
// ties and stuff ... I want to see colors and stuff changing as well"). This file is the only reader of
// art/busts/v1/manifest.json: it says which pieces a person is and where each
// piece's file is. The screen stacks them (ui/bust.mjs).
import { readFileSync } from "node:fs";

export const BUST_PACK = "v1";
const PACK_DIR = new URL(`../../art/busts/${BUST_PACK}/`, import.meta.url);

/** How someone is dressed where they are seen: what a bust wears. */
export type BustDress = "everyday" | "work" | "official";
/** The layers of clothes a bust may wear: one whole top, or a shirt with or without a tie and a jacket. */
const CLOTHES = ["top", "shirt", "tie", "jacket"] as const;
type ClothesLayer = (typeof CLOTHES)[number];
/** One way a dress is worn: the style of each layer it has. */
type Outfit = Readonly<Partial<Record<ClothesLayer, string>>>;

/** A hair or facial hair piece: one painted file for each color it comes in. */
interface BustStyle {
  style: string;
  files: Readonly<Record<string, string>>;
  /** A head shape's own refitted painting of the style, by color, where the standard one does not fit it. */
  byShape?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}
interface BustSet {
  /** The folder of this set's pieces, under the pack. */
  dir: string;
  /** Where the head sits on the canvas: its top, its middle and its width, in canvas pixels. */
  head: { top: number; middle: number; width: number };
  /** The skin tones the set paints, lightest first. */
  tones: readonly string[];
  /** The head shapes the set paints, the standard one first. */
  shapes: readonly string[];
  /** A shape's heads by tone: as an adult and as an older face. */
  heads: Readonly<
    Record<string, Readonly<Record<string, { adult: string; older: string }>>>
  >;
  /** Pairs of a head and a hair or facial hair piece the art checks flag; never drawn together. */
  doNotCombine: readonly { piece: string; head: string }[];
  /** The clothes the set paints, by layer: each style with one painted file for each color. */
  clothes: Readonly<Record<ClothesLayer, readonly BustStyle[]>>;
  /** What each way of dressing wears: the outfits a person may have, by the style of each layer. */
  dress: Readonly<Record<BustDress, readonly Outfit[]>>;
  /** Facial hair styles; a person may wear none. */
  face: readonly BustStyle[];
  hair: readonly BustStyle[];
}
interface Manifest {
  pack: number;
  canvas: number;
  order: readonly string[];
  people: readonly { id: string; sex: string; tone: string }[];
  /** The painted hair colors an adult of each tone may have. */
  hairColors: Readonly<Record<string, readonly string[]>>;
  /** The hair color an older head wears. */
  olderHair: string;
  /** The creator's words for a tone, a style and a color. */
  names: Readonly<Record<string, string>>;
  sets: Readonly<Record<string, BustSet>>;
}
const MANIFEST = JSON.parse(
  readFileSync(new URL("manifest.json", PACK_DIR), "utf8"),
) as Manifest;
/** Each set's flagged pairs as `head|piece`, for a look-up. */
const BLOCKED = new Map(
  Object.entries(MANIFEST.sets).map(([sex, set]) => [
    sex,
    new Set(set.doNotCombine.map((row) => `${row.head}|${row.piece}`)),
  ]),
);

/** A bust as the screen draws it: the pieces' urls from the bottom up, and where the head is. */
export interface PersonBust {
  layers: readonly string[];
  /** The head on the canvas: top, middle and width, in canvas pixels. */
  head: readonly [number, number, number];
  /** The canvas is square; this is its side in pixels. */
  size: number;
}

/**
 * The number that sets a person's hair and facial hair, from a text that is
 * theirs alone: their appearance seed. A look chosen in the creator names its
 * own pieces instead (`bustOfLook`).
 */
export function bustPick(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}
/**
 * Someone a bust can be: one of the bank's painted people. `tone` is their
 * skin among the people of their sex, 0 the lightest.
 */
export interface BustPerson {
  readonly id: string;
  /** The bank's word: woman or man. */
  readonly sex: string;
  /** Their skin among the tones their set paints, 0 the lightest. */
  readonly tone: number;
  /** How many tones their set paints. */
  readonly tones: number;
  /** The tone's own name in the manifest: fair, light, olive, medium, brown or dark. */
  readonly toneName: string;
}
const PEOPLE: readonly BustPerson[] = MANIFEST.people.map((row) => ({
  id: row.id,
  sex: row.sex,
  toneName: row.tone,
  tone: Math.max(0, MANIFEST.sets[row.sex]?.tones.indexOf(row.tone) ?? 0),
  tones: MANIFEST.sets[row.sex]?.tones.length ?? 1,
}));
const BY_ID = new Map(PEOPLE.map((row) => [row.id, row]));
/** Every person the bank paints, in the manifest's order. */
export const bustPeople = (): readonly BustPerson[] => PEOPLE;
/** One of the bank's people by id (the id a saved look names). */
export const bustPerson = (id: string) => BY_ID.get(id);

const url = (set: BustSet, file: string) =>
  new URL(`${set.dir}/${file}`, "http://bust/art/busts/").pathname;

/**
 * A look chosen in the creator: one of the bank's people (their sex and
 * skin), a hairstyle in a color and, where they wear it, facial hair. The
 * same record draws the creator, the title's Continue and every screen in play.
 */
export interface BustLook {
  /** One of the bank's people (`bustPerson`). */
  person: string;
  /** The head shape, one of the person's set's; absent for the standard one. */
  shape?: string;
  /** The hairstyle, one of the person's set's. */
  hair: string;
  /** The hair's color, one the style is painted in. */
  hairColor: string;
  /** The facial hair's style; absent for none. */
  face?: string;
  /** The shirt's color; absent for the first the set paints. */
  shirt?: string;
  /** The tie's color; absent for no tie. */
  tie?: string;
  /** The jacket's color; absent for no jacket where the look is not in office. */
  jacket?: string;
  /** The everyday top, one of the set's whole tops; absent for the game's own pick. */
  top?: string;
  /** The everyday top's color, one the top is painted in. */
  topColor?: string;
}

/** The pieces stacked in the manifest's order, as the screen draws them. */
function stack(
  set: BustSet,
  pieces: Readonly<Record<string, string | undefined>>,
): PersonBust {
  return {
    layers: MANIFEST.order.flatMap((part) =>
      pieces[part] ? [url(set, pieces[part])] : [],
    ),
    head: [set.head.top, set.head.middle, set.head.width],
    size: MANIFEST.canvas,
  };
}

/** A head shape of the set: the one named, else the standard one. */
const shapeIn = (set: BustSet, shape: string | undefined) =>
  shape && set.shapes.includes(shape) ? shape : set.shapes[0]!;
/** A person's head file in a shape, as an adult or older. */
const headFile = (
  set: BustSet,
  person: BustPerson,
  shape: string,
  older: boolean,
) => set.heads[shape]![person.toneName]![older ? "older" : "adult"];
/** A hair or facial hair style's file for a head shape in a color: the shape's own painting where it has one, else the standard one; the style's first painted color where it lacks that one. */
const pieceIn = (style: BustStyle, shape: string, color: string) => {
  const own = style.byShape?.[shape];
  return (
    own?.[color] ?? style.files[color] ?? Object.values(own ?? style.files)[0]
  );
};
/** Whether the art checks flag a hair or facial hair piece on a head. */
const blocked = (
  sex: string,
  head: string,
  piece: string | undefined,
): boolean => !!piece && !!BLOCKED.get(sex)?.has(`${head}|${piece}`);

/** The colors an adult of a tone may have, or the one an older head wears. */
const hairColorsOf = (person: BustPerson, older: boolean) =>
  older ? [MANIFEST.olderHair] : (MANIFEST.hairColors[person.toneName] ?? []);

/** A layer's style in the set, by name. */
const styleOf = (
  set: BustSet,
  layer: ClothesLayer,
  name: string | undefined,
) =>
  name === undefined
    ? undefined
    : set.clothes[layer].find((row) => row.style === name);
/** A style's file in a color, or in its first painted color where it lacks that one. */
const inColor = (style: BustStyle | undefined, color: string | undefined) =>
  style && (style.files[color ?? ""] ?? Object.values(style.files)[0]);
/** A style's file by a number: which of its painted colors. */
const byNumber = (style: BustStyle | undefined, n: number) => {
  const files = style ? Object.values(style.files) : [];
  return files.length ? files[n % files.length] : undefined;
};

/**
 * The bust of one of the bank's people, dressed as `dress`. `pick` is a
 * number set once from the person's own appearance seed: it decides which
 * hairstyle, hair color, facial hair, which of the dress's outfits and
 * which color of each piece they have, so the same person is the same bust
 * everywhere. It decides who
 * someone looks like, never what anyone does. `facialHair` is false for
 * someone who wears none (a teenager); `older` gives the older face and its
 * hair color. Null for someone the bank does not paint.
 */
export function bustFor(
  who: { readonly id: string },
  dress: BustDress,
  pick: number,
  facialHair = true,
  older = false,
): PersonBust | null {
  const person = BY_ID.get(who.id);
  const set = person && MANIFEST.sets[person.sex];
  if (!set) return null;
  const n = Math.abs(Math.trunc(pick));
  const colors = hairColorsOf(person, older);
  const color = colors[Math.floor(n / 11) % colors.length]!;
  const shape = set.shapes[Math.floor(n / 29) % set.shapes.length]!;
  const head = headFile(set, person, shape, older);
  // The first hairstyle from their pick on that the art checks do not flag on this head.
  const hairs = set.hair.map((_, i) => set.hair[(n + i) % set.hair.length]!);
  const hair =
    hairs.find(
      (row) => !blocked(person.sex, head, pieceIn(row, shape, color)),
    ) ?? hairs[0]!;
  // One person in each (styles + 1) wears no facial hair, nor does one the art checks flag on this head.
  const wears =
    facialHair && set.face.length
      ? set.face[Math.floor(n / 7) % (set.face.length + 1)]
      : undefined;
  const face =
    wears && !blocked(person.sex, head, pieceIn(wears, shape, color))
      ? wears
      : undefined;
  const outfits = set.dress[dress];
  const outfit = outfits[Math.floor(n / 13) % outfits.length] ?? {};
  return stack(set, {
    head,
    top: byNumber(styleOf(set, "top", outfit.top), Math.floor(n / 17)),
    shirt: byNumber(styleOf(set, "shirt", outfit.shirt), Math.floor(n / 17)),
    tie: byNumber(styleOf(set, "tie", outfit.tie), Math.floor(n / 19)),
    jacket: byNumber(styleOf(set, "jacket", outfit.jacket), Math.floor(n / 23)),
    face: face && pieceIn(face, shape, color),
    hair: pieceIn(hair, shape, color),
  });
}

/**
 * The everyday top a look wears and its color: the one chosen in the
 * creator's Everyday tab, or, for a look that names none, one of the set's
 * everyday outfits picked from the look itself, the same every time. Null
 * where the set paints no top.
 */
export function lookTop(look: BustLook): { top: string; color: string } | null {
  const person = BY_ID.get(look.person);
  const set = person && MANIFEST.sets[person.sex];
  if (!set) return null;
  const chosen = styleOf(set, "top", look.top);
  if (chosen) {
    const colors = Object.keys(chosen.files);
    const color = colors.includes(look.topColor ?? "")
      ? look.topColor!
      : colors[0]!;
    return { top: chosen.style, color };
  }
  const n = bustPick(`${look.person}:${look.hair}:${look.hairColor}:clothes`);
  const everyday = set.dress.everyday;
  const style = styleOf(
    set,
    "top",
    everyday[n % Math.max(1, everyday.length)]?.top,
  );
  if (!style) return null;
  const colors = Object.keys(style.files);
  return {
    top: style.style,
    color: colors[Math.floor(n / 17) % colors.length]!,
  };
}

/**
 * The bust of a look chosen in the creator, dressed as `dress`; null where
 * the bank lacks one of its pieces. The look's own shirt, tie and jacket are
 * what it wears to work and in office: at work the shirt, with the tie where
 * one was chosen, and no jacket; in office the jacket too, the look's own or
 * the set's first where none was chosen. Everyday it wears its own top
 * (`lookTop`).
 */
export function bustOfLook(
  look: BustLook,
  dress: BustDress,
  older = false,
): PersonBust | null {
  const person = BY_ID.get(look.person);
  const set = person && MANIFEST.sets[person.sex];
  if (!set) return null;
  const hair = set.hair.find((row) => row.style === look.hair);
  const color = older ? MANIFEST.olderHair : look.hairColor;
  const shape = shapeIn(set, look.shape);
  if (!hair || !pieceIn(hair, shape, color)) return null;
  const face =
    look.face === undefined
      ? undefined
      : set.face.find((row) => row.style === look.face);
  if (look.face !== undefined && !face) return null;
  const head = headFile(set, person, shape, older);
  const hairPiece = pieceIn(hair, shape, color);
  const facePiece = face && pieceIn(face, shape, color);
  if (
    blocked(person.sex, head, hairPiece) ||
    blocked(person.sex, head, facePiece)
  )
    return null;
  const first = (layer: ClothesLayer) => set.clothes[layer][0];
  const everyday = lookTop(look);
  const top =
    dress === "everyday" && everyday
      ? inColor(styleOf(set, "top", everyday.top), everyday.color)
      : undefined;
  return stack(set, {
    head,
    top,
    shirt: top ? undefined : inColor(first("shirt"), look.shirt),
    tie: top || !look.tie ? undefined : inColor(first("tie"), look.tie),
    jacket:
      top || dress !== "official"
        ? undefined
        : inColor(first("jacket"), look.jacket),
    face: facePiece,
    hair: hairPiece,
  });
}

/**
 * Whether a look's head, hair and facial hair go together at every age:
 * none of its pieces is one the art checks flag on its head, as an adult in
 * its own hair color or as an older face in gray. The creator offers, and
 * the game draws, only looks that fit.
 */
export function bustFits(look: BustLook): boolean {
  const person = BY_ID.get(look.person);
  const set = person && MANIFEST.sets[person.sex];
  const hair = set?.hair.find((row) => row.style === look.hair);
  if (!person || !set || !hair) return false;
  const face =
    look.face === undefined
      ? undefined
      : set.face.find((row) => row.style === look.face);
  const shape = shapeIn(set, look.shape);
  return [false, true].every((older) => {
    const color = older ? MANIFEST.olderHair : look.hairColor;
    const head = headFile(set, person, shape, older);
    return (
      !blocked(person.sex, head, pieceIn(hair, shape, color)) &&
      !blocked(person.sex, head, face && pieceIn(face, shape, color))
    );
  });
}

/** A choice the creator offers, with its worded name. */
export interface BustChoice {
  /** The style or the color, as the manifest names it. */
  readonly key: string;
  readonly label: string;
}
const named = (key: string): BustChoice => ({
  key,
  label: MANIFEST.names[key] ?? "",
});
/**
 * What a person may choose in the creator: hairstyles, the hair colors of
 * their tone, facial hair, the colors of the shirt, the tie and the jacket
 * their set paints, and the everyday tops (each whole top the set paints),
 * in the manifest's order.
 */
export function bustChoices(person: BustPerson): {
  shape: readonly BustChoice[];
  hair: readonly BustChoice[];
  hairColor: readonly BustChoice[];
  face: readonly BustChoice[];
  shirt: readonly BustChoice[];
  tie: readonly BustChoice[];
  jacket: readonly BustChoice[];
  top: readonly BustChoice[];
} {
  const set = MANIFEST.sets[person.sex];
  const colors = (layer: ClothesLayer) =>
    Object.keys(set?.clothes[layer][0]?.files ?? {}).map(named);
  return {
    shape: (set?.shapes ?? []).map(named),
    hair: (set?.hair ?? []).map((row) => named(row.style)),
    hairColor: hairColorsOf(person, false).map(named),
    face: (set?.face ?? []).map((row) => named(row.style)),
    shirt: colors("shirt"),
    tie: colors("tie"),
    jacket: colors("jacket"),
    top: (set?.clothes.top ?? []).map((row) => named(row.style)),
  };
}
/** The colors an everyday top is painted in, in the manifest's order; none for a top the set lacks. */
export function bustTopColors(
  person: BustPerson,
  top: string | undefined,
): readonly BustChoice[] {
  const set = MANIFEST.sets[person.sex];
  const style = set && styleOf(set, "top", top);
  return Object.keys(style?.files ?? {}).map(named);
}
/** The creator's word for a person's skin. */
export const skinLabel = (person: BustPerson) =>
  MANIFEST.names[person.toneName] ?? "";

/** Every piece the manifest names, as the urls a bust may carry. */
export function bustPieces(): readonly string[] {
  return Object.values(MANIFEST.sets).flatMap((set) =>
    [
      ...Object.values(set.heads).flatMap((tones) =>
        Object.values(tones).flatMap((head) => [head.adult, head.older]),
      ),
      ...[
        ...CLOTHES.flatMap((layer) => set.clothes[layer]),
        ...set.face,
        ...set.hair,
      ].flatMap((row) => [
        ...Object.values(row.files),
        ...Object.values(row.byShape ?? {}).flatMap((own) =>
          Object.values(own),
        ),
      ]),
    ].map((file) => url(set, file)),
  );
}
const KNOWN = new Set(bustPieces());

/** The file behind a bust piece's url; only pieces the manifest names are served. */
export function bustPath(pathname: string): URL {
  if (!KNOWN.has(pathname)) throw new Error("Unknown bust piece.");
  return new URL(pathname.slice("/art/busts/".length), PACK_DIR);
}
