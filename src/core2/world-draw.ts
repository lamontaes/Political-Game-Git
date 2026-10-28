/**
 * Realistic, not real (owner, Oct 27): a published statistic that no law sets
 * is the center of a per-world spread, never the value a world opens on. The
 * draw is seeded generation of the starting world, fixed by the world's seed
 * and a key; it never decides what a person, business or official does.
 *
 * The offset is signed, and its size sits between a floor share of the spread
 * and the whole spread (the macro model's `worldOffset`), so a world is near
 * the published figure but never on it.
 */
import { parameter as p } from "./parameters";
import { seededUnit } from "./past-module";

/** The signed size, as a share of the spread, between -1 and +1 and never 0. */
function drawnShare(seed: string, key: string): number {
  const floor = p("worldDrawFloorShare");
  const size = floor + (p("one") - floor) * seededUnit(seed, `${key}:size`);
  return seededUnit(seed, `${key}:sign`) < p("one") / p("two") ? -size : size;
}

/** A level's multiplier around 1: a world's price level, balance level or benefit level against the published one. */
export function worldLevelShare(
  seed: string,
  key: string,
  spreadParameter: string,
): number {
  return p("one") + drawnShare(seed, key) * p(spreadParameter);
}

/**
 * A share or percent kept strictly between 0 and `bound` (1 or 100): the move
 * is relative to the nearer bound, so a published 93% cannot pass 100% and a
 * published 4% cannot pass 0%.
 */
export function worldBoundedShare(
  seed: string,
  key: string,
  published: number,
  spreadParameter: string,
  bound: number = p("one"),
): number {
  const move = drawnShare(seed, key) * p(spreadParameter);
  return move >= p("zero")
    ? published + move * (bound - published)
    : published * (p("one") + move);
}

/**
 * A whole-person count around the published one: never below 1, whole, and a
 * different count from the published one wherever the published count is 2 or
 * more (a count of 0 is a place the Census holds as empty and stays 0).
 */
export function worldCount(
  seed: string,
  key: string,
  published: number,
  spreadParameter: string,
): number {
  if (!(published > p("zero"))) return published;
  const share = drawnShare(seed, key);
  const drawn = Math.max(
    p("one"),
    Math.round(published * (p("one") + share * p(spreadParameter))),
  );
  if (drawn !== published || published < p("two")) return drawn;
  return Math.max(
    p("one"),
    published + (share < p("zero") ? -p("one") : p("one")),
  );
}
