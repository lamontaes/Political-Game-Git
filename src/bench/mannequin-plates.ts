// Mannequin plates (art/people-rooms/mannequin-plates, its README): a room
// painted with green mannequins in the exact poses a person may take there.
// A person is drawn only on a plate's spot, fitted to its mannequin, and a
// picture with no plate shows nobody (owner, Oct 28: "do not put people in
// until there are mannequins in there for every position"; Oct 29). Each
// `<scene>.mannequins.json` names the backdrop it was painted on; a new plate
// is a new file there, read with no change here.
import { readFileSync, readdirSync } from "node:fs";
import { PNG } from "pngjs";
import type { HeadBox } from "./people-pack";

const PLATE_DIR = new URL(
  "../../art/people-rooms/mannequin-plates/",
  import.meta.url,
);

/** One mannequin: where a person in that pose goes, in the plate's pixels. */
export interface PlateSpot {
  readonly id: string;
  readonly pose: string;
  readonly seat: string;
  readonly facing: number;
  readonly head: HeadBox;
  /** Left, top, right, bottom. */
  readonly box: readonly [number, number, number, number];
  /** The row the feet stand or rest on. */
  readonly feet?: number;
  /** Seated behind a desk: the row the hands rest on, and the desk's edge. */
  readonly hands?: number;
  readonly deskEdge?: number;
  /** The furniture in front of the mannequin, a mask over `box`. */
  readonly front?: string;
  /** A seat kept for an office's holder (data/whole-figures.json `seatRoles`). */
  readonly role?: string;
}
export interface Plate {
  readonly scene: string;
  readonly backdrop: string;
  readonly size: readonly [number, number];
  readonly spots: readonly PlateSpot[];
}

const PLATES: ReadonlyMap<string, Plate> = new Map(
  readdirSync(PLATE_DIR)
    .filter((file) => file.endsWith(".mannequins.json"))
    .map(
      (file) =>
        JSON.parse(readFileSync(new URL(file, PLATE_DIR), "utf8")) as Plate,
    )
    .filter((plate) => plate.backdrop)
    .map((plate) => [plate.backdrop, plate]),
);

/** The plate painted on this backdrop file, or none: then nobody is drawn there. */
export function plateFor(backdropFile: string): Plate | null {
  return PLATES.get(backdropFile) ?? null;
}
/** Every plate, for the checks and the proof sheet. */
export function plates(): readonly Plate[] {
  return [...PLATES.values()];
}

/**
 * How far into the room a spot is: the row its feet stand on, or behind a
 * desk the row its hands rest on. People are drawn smallest first (farthest
 * to nearest), so a desk spot draws before someone standing in front of it.
 */
export const depthOf = (spot: PlateSpot) =>
  spot.feet ?? spot.hands ?? spot.box[3];

/** Where the screen fetches a spot's front mask. */
export const frontUrl = (file: string) => `/art/people-rooms/fronts/${file}`;

const fronts = new Map<string, Buffer>();
/**
 * A front mask as the screen lays it: the plate stores its furniture as
 * gray (white in front), and the screen masks by alpha, so the gray is
 * written into the alpha.
 */
export function frontPng(file: string): Buffer {
  if (!/^[a-z0-9-]+\.front-\d+\.png$/.test(file))
    throw new Error("Unknown front.");
  let out = fronts.get(file);
  if (!out) {
    const png = PNG.sync.read(readFileSync(new URL(file, PLATE_DIR)));
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i + 3] = png.data[i]!;
      png.data[i] = png.data[i + 1] = png.data[i + 2] = 255;
    }
    out = PNG.sync.write(png);
    fronts.set(file, out);
  }
  return out;
}
