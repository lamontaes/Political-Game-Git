/**
 * Starting levels for one world (owner, Oct 27: "realistic, not real"): a
 * published statistic is the center of a spread the world's seed draws from
 * once at Start, so no two worlds open on the same figure and none opens on
 * the published one. Generation of the starting world only, never an actor's
 * outcome; the sizes live in the parameter table. This is the one draw: the
 * national and state economy, the budget lines, the housing medians and every
 * other starting figure take their offset from `worldOffsetUnit`.
 */
import { parameter as p } from "./parameters";
import { seededUnit } from "./seeded";

const drawn = new Map<string, number>();

/**
 * A signed size between the floor share of a spread and the whole of it (as
 * a share of the spread, so between -1 and -floor or floor and 1), fixed by
 * the world's seed and the key. Read many times a day by several engines,
 * so each draw is made once per world and key. A caller whose spread row
 * lives in its own parameter table multiplies this by that row.
 */
export function worldOffsetUnit(seed: string, key: string): number {
  const id = `${seed}|${key}`;
  const known = drawn.get(id);
  if (known !== undefined) return known;
  const floor = p("worldDrawOffsetFloorShare");
  const sign =
    seededUnit(seed, `world-draw:${key}:sign`) < p("half")
      ? p("negativeOne")
      : p("one");
  const size =
    floor + (p("one") - floor) * seededUnit(seed, `world-draw:${key}:size`);
  const value = sign * size;
  drawn.set(id, value);
  return value;
}

/** A signed share between the floor share of the named spread row and the whole of it. */
export function worldOffsetShare(
  seed: string,
  key: string,
  spreadRow: string,
): number {
  return worldOffsetUnit(seed, key) * p(spreadRow);
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
