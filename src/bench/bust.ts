// The bust bank (owner, Nov 7, 2026: "maybe just busts for most things and
// full body for certain scenes"; Nov 10: "we need to start transitioning to
// the bust system"). A person on a menu is a head, a top, facial hair and
// hair, each a picture on one shared canvas, stacked in the manifest's order
// with nothing moved, scaled or tinted. This file is the only reader of
// art/busts/v1/manifest.json: it says which pieces a person is and where each
// piece's file is. The screen stacks them (ui/bust.mjs).
import { readFileSync } from "node:fs";

export const BUST_PACK = "v1";
const PACK_DIR = new URL(`../../art/busts/${BUST_PACK}/`, import.meta.url);

/** How someone is dressed where they are seen: the top a bust wears. */
export type BustDress = "everyday" | "work" | "official";

interface BustSet {
  /** The folder of this set's pieces, under the pack. */
  dir: string;
  /** Where the head sits on the canvas: its top, its middle and its width, in canvas pixels. */
  head: { top: number; middle: number; width: number };
  /** The heads, lightest skin first. */
  heads: readonly string[];
  tops: Readonly<Record<BustDress, string>>;
  /** Facial hair pieces; a person may wear none. */
  face: readonly string[];
  hair: readonly string[];
  /** The creator's words for a head (its skin), a hair piece and a facial hair piece, by file. */
  names: Readonly<Record<string, string>>;
}
interface Manifest {
  pack: number;
  canvas: number;
  order: readonly string[];
  people: readonly { id: string; sex: string; head: string }[];
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
  /** The file of their head, in their set's folder. */
  readonly head: string;
}
const PEOPLE: readonly BustPerson[] = MANIFEST.people.map((row) => ({
  ...row,
  tone: Math.max(0, MANIFEST.sets[row.sex]?.heads.indexOf(row.head) ?? 0),
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
 * skin), a hair piece and, where they wear it, a facial hair piece. The same
 * record draws the creator, the title's Continue and every screen in play.
 */
export interface BustLook {
  /** One of the bank's people (`bustPerson`). */
  person: string;
  /** The hair piece's file, one of the person's set's. */
  hair: string;
  /** The facial hair piece's file; absent for none. */
  face?: string;
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

/**
 * The bust of one of the bank's people, dressed as `dress`. `pick` is a
 * number set once from the person's own appearance seed: it decides which
 * hair and facial hair they have, so the same person is the same bust
 * everywhere. It decides who someone looks like, never what anyone does.
 * `facialHair` is false for someone who wears none (a teenager).
 * Null for someone the bank does not paint.
 */
export function bustFor(
  who: { readonly id: string },
  dress: BustDress,
  pick: number,
  facialHair = true,
): PersonBust | null {
  const person = BY_ID.get(who.id);
  const set = person && MANIFEST.sets[person.sex];
  if (!set) return null;
  const n = Math.abs(Math.trunc(pick));
  return stack(set, {
    head: person.head,
    top: set.tops[dress],
    // One person in each (pieces + 1) wears no facial hair.
    face:
      facialHair && set.face.length
        ? set.face[Math.floor(n / 7) % (set.face.length + 1)]
        : undefined,
    hair: set.hair[n % set.hair.length]!,
  });
}

/** The bust of a look chosen in the creator, dressed as `dress`; null where the bank lacks one of its pieces. */
export function bustOfLook(
  look: BustLook,
  dress: BustDress,
): PersonBust | null {
  const person = BY_ID.get(look.person);
  const set = person && MANIFEST.sets[person.sex];
  if (!set || !set.hair.includes(look.hair)) return null;
  if (look.face !== undefined && !set.face.includes(look.face)) return null;
  return stack(set, {
    head: person.head,
    top: set.tops[dress],
    face: look.face,
    hair: look.hair,
  });
}

/** A piece the creator offers, with its worded name. */
export interface BustPiece {
  readonly file: string;
  readonly label: string;
}
/** What a person of this sex may choose in the creator: hair and facial hair, in the manifest's order. */
export function bustChoices(sex: string): {
  hair: readonly BustPiece[];
  face: readonly BustPiece[];
} {
  const set = MANIFEST.sets[sex];
  const named = (file: string) => ({ file, label: set?.names[file] ?? "" });
  return {
    hair: (set?.hair ?? []).map(named),
    face: (set?.face ?? []).map(named),
  };
}
/** The creator's word for a person's skin: their head's name in their set. */
export const skinLabel = (person: BustPerson) =>
  MANIFEST.sets[person.sex]?.names[person.head] ?? "";

/** Every piece the manifest names, as the urls a bust may carry. */
export function bustPieces(): readonly string[] {
  return Object.values(MANIFEST.sets).flatMap((set) =>
    [...set.heads, ...Object.values(set.tops), ...set.face, ...set.hair].map(
      (file) => url(set, file),
    ),
  );
}
const KNOWN = new Set(bustPieces());

/** The file behind a bust piece's url; only pieces the manifest names are served. */
export function bustPath(pathname: string): URL {
  if (!KNOWN.has(pathname)) throw new Error("Unknown bust piece.");
  return new URL(pathname.slice("/art/busts/".length), PACK_DIR);
}
