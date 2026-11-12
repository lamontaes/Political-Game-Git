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
}
interface BustSet {
  /** The folder of this set's pieces, under the pack. */
  dir: string;
  /** Where the head sits on the canvas: its top, its middle and its width, in canvas pixels. */
  head: { top: number; middle: number; width: number };
  /** The skin tones the set paints, lightest first. */
  tones: readonly string[];
  /** A tone's heads: as an adult and as an older face. */
  heads: Readonly<Record<string, { adult: string; older: string }>>;
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
  readonly tone: number;
  /** The tone's own name in the manifest: light, medium or dark. */
  readonly toneName: string;
}
const PEOPLE: readonly BustPerson[] = MANIFEST.people.map((row) => ({
  id: row.id,
  sex: row.sex,
  toneName: row.tone,
  tone: Math.max(0, MANIFEST.sets[row.sex]?.tones.indexOf(row.tone) ?? 0),
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

/** The colors an adult of a tone may have, or the one an older head wears. */
const hairColorsOf = (person: BustPerson, older: boolean) =>
  older ? [MANIFEST.olderHair] : (MANIFEST.hairColors[person.toneName] ?? []);
/** Facial hair in the hair's color where it is painted so, else in its first painted color. */
const faceFile = (style: BustStyle, color: string) =>
  style.files[color] ?? Object.values(style.files)[0];

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
  const hair = set.hair[n % set.hair.length]!;
  // One person in each (styles + 1) wears no facial hair.
  const face =
    facialHair && set.face.length
      ? set.face[Math.floor(n / 7) % (set.face.length + 1)]
      : undefined;
  const outfits = set.dress[dress];
  const outfit = outfits[Math.floor(n / 13) % outfits.length] ?? {};
  return stack(set, {
    head: set.heads[person.toneName]![older ? "older" : "adult"],
    top: byNumber(styleOf(set, "top", outfit.top), Math.floor(n / 17)),
    shirt: byNumber(styleOf(set, "shirt", outfit.shirt), Math.floor(n / 17)),
    tie: byNumber(styleOf(set, "tie", outfit.tie), Math.floor(n / 19)),
    jacket: byNumber(styleOf(set, "jacket", outfit.jacket), Math.floor(n / 23)),
    face: face && faceFile(face, color),
    hair: hair.files[color] ?? Object.values(hair.files)[0],
  });
}

/**
 * The bust of a look chosen in the creator, dressed as `dress`; null where
 * the bank lacks one of its pieces. The look's own shirt, tie and jacket are
 * what it wears to work and in office: at work the shirt, with the tie where
 * one was chosen; in office the jacket too, the look's own or the set's
 * first where none was chosen. Everyday it wears one of the set's whole
 * tops, the same one every time, set from the look itself.
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
  if (!hair?.files[color]) return null;
  const face =
    look.face === undefined
      ? undefined
      : set.face.find((row) => row.style === look.face);
  if (look.face !== undefined && !face) return null;
  const first = (layer: ClothesLayer) => set.clothes[layer][0];
  const n = bustPick(`${look.person}:${look.hair}:${look.hairColor}:clothes`);
  const everyday = set.dress.everyday;
  const top =
    dress === "everyday"
      ? byNumber(
          styleOf(set, "top", everyday[n % Math.max(1, everyday.length)]?.top),
          Math.floor(n / 17),
        )
      : undefined;
  return stack(set, {
    head: set.heads[person.toneName]![older ? "older" : "adult"],
    top,
    shirt: top ? undefined : inColor(first("shirt"), look.shirt),
    tie: top || !look.tie ? undefined : inColor(first("tie"), look.tie),
    jacket:
      top || (dress !== "official" && !look.jacket)
        ? undefined
        : inColor(first("jacket"), look.jacket),
    face: face && faceFile(face, color),
    hair: hair.files[color],
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
 * their tone, facial hair, and the colors of the shirt, the tie and the
 * jacket their set paints, in the manifest's order.
 */
export function bustChoices(person: BustPerson): {
  hair: readonly BustChoice[];
  hairColor: readonly BustChoice[];
  face: readonly BustChoice[];
  shirt: readonly BustChoice[];
  tie: readonly BustChoice[];
  jacket: readonly BustChoice[];
} {
  const set = MANIFEST.sets[person.sex];
  const colors = (layer: ClothesLayer) =>
    Object.keys(set?.clothes[layer][0]?.files ?? {}).map(named);
  return {
    hair: (set?.hair ?? []).map((row) => named(row.style)),
    hairColor: hairColorsOf(person, false).map(named),
    face: (set?.face ?? []).map((row) => named(row.style)),
    shirt: colors("shirt"),
    tie: colors("tie"),
    jacket: colors("jacket"),
  };
}
/** The creator's word for a person's skin. */
export const skinLabel = (person: BustPerson) =>
  MANIFEST.names[person.toneName] ?? "";

/** Every piece the manifest names, as the urls a bust may carry. */
export function bustPieces(): readonly string[] {
  return Object.values(MANIFEST.sets).flatMap((set) =>
    [
      ...Object.values(set.heads).flatMap((head) => [head.adult, head.older]),
      ...[
        ...CLOTHES.flatMap((layer) => set.clothes[layer]),
        ...set.face,
        ...set.hair,
      ].flatMap((row) => Object.values(row.files)),
    ].map((file) => url(set, file)),
  );
}
const KNOWN = new Set(bustPieces());

/** The file behind a bust piece's url; only pieces the manifest names are served. */
export function bustPath(pathname: string): URL {
  if (!KNOWN.has(pathname)) throw new Error("Unknown bust piece.");
  return new URL(pathname.slice("/art/busts/".length), PACK_DIR);
}
