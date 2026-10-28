/**
 * Starting levels for one world (owner, Oct 27: "realistic, not real"): a
 * published statistic is the center of a spread the world's seed draws from
 * once at Start, so no two worlds open on the same figure and none opens on
 * the published one. Generation of the starting world only, never an actor's
 * outcome; the sizes live in the parameter table.
 */
import { parameter as p } from "./parameters";
import { seededUnit } from "./seeded";

const drawn = new Map<string, number>();

/**
 * A signed share between the floor share of the named spread row and the
 * whole of it, fixed by the world's seed and the key. Read many times a day
 * by several engines, so each draw is made once per world and key.
 */
export function worldOffsetShare(
  seed: string,
  key: string,
  spreadRow: string,
): number {
  const id = `${seed}|${key}|${spreadRow}`;
  const known = drawn.get(id);
  if (known !== undefined) return known;
  const floor = p("worldDrawOffsetFloorShare");
  const sign =
    seededUnit(seed, `world-draw:${key}:sign`) < p("half")
      ? p("negativeOne")
      : p("one");
  const size =
    floor + (p("one") - floor) * seededUnit(seed, `world-draw:${key}:size`);
  const value = sign * size * p(spreadRow);
  drawn.set(id, value);
  return value;
}

/** A level moved by the world's offset as a share of itself. */
export function worldLevel(
  published: number,
  seed: string,
  key: string,
  spreadRow: string,
): number {
  return published * (p("one") + worldOffsetShare(seed, key, spreadRow));
}

/**
 * A share or rate moved relative to its nearer bound (none or all), so it
 * stays between zero and one.
 */
export function worldRate(
  published: number,
  seed: string,
  key: string,
  spreadRow: string,
): number {
  return (
    published +
    worldOffsetShare(seed, key, spreadRow) *
      Math.min(published, p("one") - published)
  );
}
