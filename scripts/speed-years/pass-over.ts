import { NoPlayerHereError } from "../../src/bench/world";
import { drawPlace, type DrawnPlace } from "../core2-year/place";

/**
 * A place the world refuses to open (every adult lives in group quarters, so there
 * is no one to play) is one a new game's draw passes over, and so is a measurement's.
 * The draw for `seed` is tried first, as it always was; a refusal is named, then the
 * next draw is tried (`<seed>:1`, `<seed>:2`, and so on), each printed with its seed so
 * the run can be asked for again. A place asked for by key is not passed over.
 */
export interface Opened<W> {
  readonly world: W;
  readonly place: DrawnPlace;
  /** The seed the draw was made from: the run's own for the first draw, `<seed>:<n>` after. */
  readonly drawSeed: string;
  /** Each draw passed over, with why. */
  readonly passed: readonly string[];
}

export function openFirstPlace<W>(
  seed: string,
  purpose: string,
  build: (place: DrawnPlace) => W,
  options: {
    readonly tries?: number;
    readonly say?: (line: string) => void;
    readonly draw?: typeof drawPlace;
  } = {},
): Opened<W> {
  const { tries = 12, say = console.log, draw = drawPlace } = options;
  const passed: string[] = [];
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const drawSeed = attempt ? `${seed}:${attempt}` : seed;
    const place = draw(drawSeed, purpose);
    try {
      return { world: build(place), place, drawSeed, passed };
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      const line = `${place.name} (key ${place.key}, seed ${drawSeed}): ${error.message}`;
      passed.push(line);
      say(`passed over ${line}`);
    }
  }
  throw new Error(
    `no place opened in ${tries} draws of seed ${seed}: ${passed.join("; ")}`,
  );
}
