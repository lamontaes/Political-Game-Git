// The people pack: the game's painted people, read from one manifest
// (art/people-engine/<pack>/manifest.json, its README). This is the only
// file that names a pack or a file in one: everything else reads the rows
// here. More clothes, colors or people are more manifest rows; a new pack is
// a new folder and this one constant (owner, Oct 29: "make it to where these
// can be updated very easily").
import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";

/** The pack the game draws its people from. */
export const PEOPLE_PACK = "v4";

const PACK_DIR = new URL(
  `../../art/people-engine/${PEOPLE_PACK}/`,
  import.meta.url,
);

type Rgb = readonly [number, number, number];

/** One painted person: their body, build, own skin and the colors each part may take. */
export interface PackPerson {
  readonly id: string;
  /** The pack's word: woman or man. */
  readonly sex: string;
  readonly build: string;
  readonly palettes: Readonly<Record<string, Readonly<Record<string, Rgb>>>>;
  readonly tones: Readonly<Record<string, { readonly Lmed: number }>>;
  readonly skin: Rgb;
  readonly hair: Rgb;
}

/** A box in a figure's own pixels. */
export interface HeadBox {
  readonly top: number;
  readonly x: number;
  readonly width: number;
}

/** One drawn figure: a person in one pose and outfit, painted whole. */
export interface PackFigure {
  readonly id: string;
  readonly person: string;
  /** `kit`: everyday clothes in recolorable parts; `look`: one picture, never recolored. */
  readonly kind: "kit" | "look";
  readonly pose: string;
  readonly seat: string;
  /** Degrees: 0 toward the viewer, minus turned toward screen-left, 180 back to the viewer. */
  readonly facing: number;
  readonly dress: string;
  readonly outfit: string;
  readonly outfitLabel?: string;
  /** The hairstyle drawn, where a person has looks in several. */
  readonly hair?: string;
  /** What the figure holds (phone, paper, pen-paper); none holds nothing. */
  readonly prop?: string;
  /** The drawn angle: front, tq-left, tq-right, btq-left, btq-right. */
  readonly angle?: string;
  readonly size: readonly [number, number];
  readonly head: HeadBox;
  /** Painted seated with its hands resting on a desk (the address pose). */
  readonly handsRestOnDesk?: boolean;
  /**
   * Drawn writing or resting its hands on a desk that is not in the drawing
   * (owner, Oct 29: "she has a pen in her hand and she's writing on her green
   * pants"): drawn only at a desk spot, cut at the hands.
   */
  readonly needsDesk?: boolean;
  /** Drawn behind a table with its forearms on it; its `hands` row is the art's own. */
  readonly drawnBehindTable?: boolean;
  readonly feet: { readonly x: number; readonly y: number };
  /** Seated at a desk: the row its hands rest on, in its own pixels, where the manifest gives it. */
  readonly hands?: number;
  readonly stature: number;
  readonly parts?: Readonly<
    Record<string, { readonly file: string; readonly tone: string | null }>
  >;
  readonly file?: string;
}

interface Manifest {
  pack: string;
  stack: readonly string[];
  people: readonly PackPerson[];
  figures: readonly PackFigure[];
}

/** The pack's manifest file, for the tools that measure the pack's own art into it. */
export const MANIFEST_URL = new URL("manifest.json", PACK_DIR);
const MANIFEST = JSON.parse(readFileSync(MANIFEST_URL, "utf8")) as Manifest;

/** The pack's people, in manifest order. */
export function packPeople(): readonly PackPerson[] {
  return MANIFEST.people;
}
/** Every drawn figure, in manifest order. */
export function packFigures(): readonly PackFigure[] {
  return MANIFEST.figures;
}
const BY_ID = new Map(MANIFEST.figures.map((row) => [row.id, row]));
const PEOPLE = new Map(MANIFEST.people.map((row) => [row.id, row]));
export const packFigure = (id: string) => BY_ID.get(id);
export const packPerson = (id: string) => PEOPLE.get(id);

/**
 * One look of a person: everyday clothes (the kit), or an outfit in one
 * hairstyle. The same person may have several looks of one outfit.
 */
export const lookKey = (figure: PackFigure) =>
  figure.kind === "kit"
    ? "everyday"
    : figure.hair
      ? `${figure.outfit}:${figure.hair}`
      : figure.outfit;
/** A look's worded name: the manifest's label of one of its rows, else none. */
export function lookLabel(person: string, look: string): string | undefined {
  return MANIFEST.figures.find(
    (row) => row.person === person && lookKey(row) === look && row.outfitLabel,
  )?.outfitLabel;
}

/** The parts a kit figure is recolored by: the person's palettes, in their order. */
export function colorParts(person: PackPerson): readonly string[] {
  // A part with no colors in its palette is drawn as painted.
  return Object.keys(person.palettes).filter(
    (part) =>
      MANIFEST.stack.includes(part) &&
      Object.keys(person.palettes[part]!).length > 0,
  );
}

/** Where the screen fetches a figure in a person's colors. */
export function figureUrl(
  figure: PackFigure,
  colors: Readonly<Record<string, string>> = {},
): string {
  const query = new URLSearchParams(
    figure.kind === "kit"
      ? Object.entries(colors).filter(([, value]) => value)
      : [],
  ).toString();
  return `/art/people/${figure.id}.png${query ? `?${query}` : ""}`;
}
/** The figure a request path names (`/art/people/<id>.png`), or none. */
export function figureAtPath(pathname: string): PackFigure | undefined {
  const match = /^\/art\/people\/([\w/-]+)\.png$/.exec(pathname);
  return match ? BY_ID.get(match[1]!) : undefined;
}

const images = new Map<string, PNG>();
function image(file: string): PNG {
  let png = images.get(file);
  if (!png) {
    png = PNG.sync.read(readFileSync(new URL(file, PACK_DIR)));
    images.set(file, png);
  }
  return png;
}
/** A part's tone map: the one the manifest names, else the README's `<part>_tone.png` beside it. */
function toneFile(part: { file: string; tone: string | null }): string | null {
  if (part.tone) return part.tone;
  const beside = part.file.replace(/\.png$/, "_tone.png");
  return existsSync(new URL(beside, PACK_DIR)) ? beside : null;
}

const drawn = new Map<string, Buffer>();
/**
 * The figure as one picture: a look as painted; a kit's parts stacked in the
 * manifest's order, each part named in `colors` repainted to that palette
 * color through its tone map (README "Recolor"), the rest as painted.
 */
export function figurePng(
  figure: PackFigure,
  colors: Readonly<Record<string, string>> = {},
): Buffer {
  // Only a palette color of one of the person's parts is painted (and kept).
  const palettes = PEOPLE.get(figure.person)?.palettes ?? {};
  colors = Object.fromEntries(
    Object.entries(colors)
      .filter(([part, name]) => palettes[part]?.[name] && figure.kind === "kit")
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  const key = `${figure.id}?${JSON.stringify(colors)}`;
  const kept = drawn.get(key);
  if (kept) return kept;
  let out: Buffer;
  if (figure.kind === "look" || !figure.parts) {
    out = readFileSync(new URL(figure.file!, PACK_DIR));
  } else {
    const person = PEOPLE.get(figure.person)!;
    const [width, height] = figure.size;
    const canvas = new PNG({ width, height });
    for (const name of MANIFEST.stack) {
      const part = figure.parts[name];
      if (!part) continue;
      const art = image(part.file);
      const swatch = colors[name]
        ? person.palettes[name]?.[colors[name]]
        : undefined;
      const tone = swatch && toneFile(part);
      const painted = tone
        ? recolor(art, image(tone), swatch, person.tones[name]!.Lmed)
        : art.data;
      over(canvas, art.width, art.height, painted);
    }
    out = PNG.sync.write(canvas);
  }
  drawn.set(key, out);
  return out;
}

const ahead: string[] = [];
/**
 * Draws the figure a link names (`/art/people/<id>.png?<colors>`) in the
 * background, one between requests, so a face the server has handed out is
 * ready before the screen that shows it asks (owner, Oct 29: faces "should
 * be there instantly"). Drawn once per look; asking again is a cache hit.
 */
export function drawAhead(link: string): void {
  ahead.push(link);
  if (ahead.length === 1) setImmediate(drawWaiting);
}
/** Draws every figure waiting to be drawn ahead, now: while a life loads. */
export function drawAheadNow(): void {
  for (let link = ahead.shift(); link !== undefined; link = ahead.shift())
    drawLink(link);
}
function drawWaiting() {
  const link = ahead.shift();
  if (link === undefined) return;
  drawLink(link);
  if (ahead.length) setImmediate(drawWaiting);
}
function drawLink(link: string) {
  const url = new URL(link, "http://localhost");
  const figure = figureAtPath(url.pathname);
  if (figure) figurePng(figure, Object.fromEntries(url.searchParams));
}

/** Lays one part (same frame as the figure) over the canvas. */
function over(canvas: PNG, width: number, height: number, data: Uint8Array) {
  const w = Math.min(width, canvas.width),
    h = Math.min(height, canvas.height);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * width + x) * 4,
        o = (y * canvas.width + x) * 4;
      const a = data[i + 3]! / 255;
      if (a === 0) continue;
      const b = canvas.data[o + 3]! / 255;
      const alpha = a + b * (1 - a);
      for (let c = 0; c < 3; c++)
        canvas.data[o + c] = Math.round(
          (data[i + c]! * a + canvas.data[o + c]! * b * (1 - a)) / alpha,
        );
      canvas.data[o + 3] = Math.round(alpha * 255);
    }
}

// CIE Lab, as the pack's own colors.py (sRGB, D65); the hands measure reads it too.
export function toLab([r, g, b]: Rgb): [number, number, number] {
  const lin = (v: number) => {
    const c = v / 255;
    return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function fromLab(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116,
    fx = fy + a / 500,
    fz = fy - b / 200;
  const inv = (t: number) =>
    t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const [X, Y, Z] = [inv(fx) * 0.95047, inv(fy), inv(fz) * 1.08883];
  const gamma = (v: number) => {
    const c = Math.min(Math.max(v, 0), 1);
    return Math.round(
      (c > 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c) * 255,
    );
  };
  return [
    gamma(3.2406 * X - 1.5372 * Y - 0.4986 * Z),
    gamma(-0.9689 * X + 1.8758 * Y + 0.0415 * Z),
    gamma(0.0557 * X - 0.204 * Y + 1.057 * Z),
  ];
}

/** The pack's recolor (README "Recolor", tools/colors.py recolor_lab): the drawing's light and shade kept as lightness offsets. */
function recolor(art: PNG, tone: PNG, color: Rgb, Lmed: number): Uint8Array {
  const [tL, ta, tb] = toLab(color);
  const quiet = Math.min(1, (tL + 10) / (Lmed + 10));
  const line = Math.min(14, 0.45 * Lmed);
  // A pixel's new color depends only on its tone (0 to 255) and whether the
  // tone map is see-through there, so each of the 512 is worked out once.
  const table = new Uint8Array(512 * 3);
  for (let entry = 0; entry < 512; entry++) {
    const Lp = (entry & 255) / 2.55;
    let off = (Lp - Lmed) * quiet;
    if (entry >= 256) off = Math.min(off, 0);
    let L = Math.min(Math.max(tL + off, 0), 100);
    const weight = Math.min(Math.max((Lp - line) / Math.max(line, 1), 0), 1);
    L = weight * L + (1 - weight) * Math.min(Lp, L);
    const k = Math.min(Math.max(L / Math.max(tL, 1), 0), 1) * weight;
    table.set(fromLab(L, ta * k, tb * k), entry * 3);
  }
  const out = new Uint8Array(art.data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const entry = (tone.data[i]! + (tone.data[i + 3]! < 250 ? 256 : 0)) * 3;
    out[i] = table[entry]!;
    out[i + 1] = table[entry + 1]!;
    out[i + 2] = table[entry + 2]!;
  }
  return out;
}
