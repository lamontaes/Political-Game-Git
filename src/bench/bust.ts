// The bust bank (owner, Nov 7, 2026: "maybe just busts for most things and
// full body for certain scenes"; Nov 10: "we need to start transitioning to
// the bust system"). A person on a menu is a head, a top, facial hair and
// hair, each a picture on one shared canvas, stacked in the manifest's order
// with nothing moved, scaled or tinted. This file is the only reader of
// art/busts/v1/manifest.json: it says which pieces a person is and where each
// piece's file is. The screen stacks them (ui/bust.mjs).
import { readFileSync } from "node:fs";
import { packPeople, type PackPerson } from "./people-pack";

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
}
interface Manifest {
  pack: number;
  canvas: number;
  order: readonly string[];
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
 * theirs alone: a chosen look's own words (so the creator, the title and the
 * game all draw one bust), else their appearance seed.
 */
export function bustPick(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}
/** A chosen look as the text its bust is set from. */
export const lookText = (look: {
  person: string;
  outfit?: string;
  colors?: Readonly<Record<string, string>>;
}) =>
  `${look.person}:${look.outfit ?? ""}:${Object.entries(look.colors ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([part, color]) => `${part}=${color}`)
    .join(",")}`;

const luminance = ([r, g, b]: readonly number[]) =>
  0.2126 * r! + 0.7152 * g! + 0.0722 * b!;

/**
 * Which head someone has: the pack paints its people of one sex in skin tones
 * from light to dark, and the bust bank paints its heads the same way, so a
 * person's bust has the skin of their painted figure.
 */
function headOf(person: PackPerson, set: BustSet): string {
  const alike = packPeople()
    .filter((row) => row.sex === person.sex)
    .sort(
      (a, b) =>
        luminance(b.skin) - luminance(a.skin) || a.id.localeCompare(b.id),
    );
  const rank = Math.max(
    0,
    alike.findIndex((row) => row.id === person.id),
  );
  return set.heads[
    Math.min(
      set.heads.length - 1,
      Math.floor((rank * set.heads.length) / Math.max(1, alike.length)),
    )
  ]!;
}

const url = (set: BustSet, file: string) =>
  new URL(`${set.dir}/${file}`, "http://bust/art/busts/").pathname;

/**
 * The bust of one of the pack's people, dressed as `dress`. `pick` is a
 * number set once from the person's own appearance seed: it decides which
 * hair and facial hair they have, so the same person is the same bust
 * everywhere. It decides who someone looks like, never what anyone does.
 * `facialHair` is false for someone who wears none: a teenager, and a look
 * chosen in the creator, which offers none.
 * Null where the bank paints no set for the person's sex.
 */
export function bustFor(
  person: PackPerson,
  dress: BustDress,
  pick: number,
  facialHair = true,
): PersonBust | null {
  const set = MANIFEST.sets[person.sex];
  if (!set) return null;
  const n = Math.abs(Math.trunc(pick));
  const hair = set.hair[n % set.hair.length]!;
  // One person in each (pieces + 1) wears no facial hair.
  const face =
    facialHair && set.face.length
      ? set.face[Math.floor(n / 7) % (set.face.length + 1)]
      : undefined;
  const pieces: Readonly<Record<string, string | undefined>> = {
    head: headOf(person, set),
    top: set.tops[dress],
    face,
    hair,
  };
  return {
    layers: MANIFEST.order.flatMap((part) =>
      pieces[part] ? [url(set, pieces[part])] : [],
    ),
    head: [set.head.top, set.head.middle, set.head.width],
    size: MANIFEST.canvas,
  };
}

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
