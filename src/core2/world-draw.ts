/**
 * One world's own figure for a statistic that is not set by law (owner,
 * Oct 27: "realistic, not real"). The published figure calibrates: it is the
 * center of a spread, and the world's offset is drawn once from its seed with
 * `worldOffset` (the macro pattern), so no two worlds share a number and no
 * world opens on the published one. Seeded generation of the starting world,
 * never one actor's outcome. Rates and amounts a law sets never come here.
 */
import macroParameters from "./data/macro/parameters.json" with { type: "json" };
import { worldOffset, type MacroParameter } from "./macro-model";
import { parameter } from "./parameters";

const macro = macroParameters as unknown as Readonly<
  Record<string, { value: number }>
>;
const p: MacroParameter = (key) => macro[key]?.value ?? parameter(key);

/** Offsets already drawn: a world's draw is fixed by its seed, key and spread, so it is computed once. */
const drawn = new Map<string, number>();

/** A signed share of a figure, between the floor share of the spread and all of it. */
export function drawnOffset(seed: string, key: string, spread: number): number {
  const at = `${seed}|${key}|${spread}`;
  let offset = drawn.get(at);
  if (offset === undefined) {
    offset = worldOffset(seed, key, spread, p);
    drawn.set(at, offset);
  }
  return offset;
}

/** A level (a price, an amount, a count before rounding) moved by a share of itself. */
export function drawnLevel(
  published: number,
  seed: string,
  key: string,
  spread: number,
): number {
  return published * (p("one") + drawnOffset(seed, key, spread));
}

/** A rate or share kept between 0 and 1: the spread is a share of the distance to its nearer bound. */
export function drawnShare(
  published: number,
  seed: string,
  key: string,
  spread: number,
): number {
  return (
    published +
    drawnOffset(seed, key, spread) * Math.min(published, p("one") - published)
  );
}

/** A count: the drawn level, rounded, and never below one where the published count is at least one. */
export function drawnCount(
  published: number,
  seed: string,
  key: string,
  spread: number,
): number {
  const level = Math.round(drawnLevel(published, seed, key, spread));
  return Math.round(published) >= p("one") ? Math.max(p("one"), level) : level;
}
