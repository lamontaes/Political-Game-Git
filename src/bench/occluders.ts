// What stands in front of a person at a staging spot: a mask of the place
// painting's pixels nearer than someone there (a desk, a chair back, a
// counter, a sofa arm), baked offline from a depth map of the painting by
// scripts/people/occluders.py. The screen lays the current picture's own
// pixels through the mask over that person, so furniture covers them along
// its real edge. A spot nobody is on draws nothing: the painting shows as is.
import index from "../../art/backdrops/occluders/index.json" with { type: "json" };

/** Where a spot's mask sits on the picture, in percent, and where to fetch it. */
export interface Occluder {
  url: string;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface Entry {
  file: string;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}
const PLACES = index.places as unknown as Readonly<
  Record<string, { parent: string; spots: Readonly<Record<string, Entry>> }>
>;

/** The spot's mask, or null where nothing in the painting stands in front of it. */
export function occluderFor(place: string, spotId: string): Occluder | null {
  const entry = PLACES[place]?.spots[spotId];
  if (!entry) return null;
  const { file, ...box } = entry;
  return { url: `/art/backdrops/occluders/${file}`, ...box };
}

/** The mask file on disk for a request path's tail (`<place>/<n>.png`). */
export function occluderPath(file: string): URL {
  if (!/^[a-z0-9-]+\/\d+\.png$/.test(file))
    throw new Error("Unknown occluder.");
  return new URL(`../../art/backdrops/occluders/${file}`, import.meta.url);
}
