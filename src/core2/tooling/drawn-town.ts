/**
 * Test helper: build the played world in a place drawn from all 56, trying
 * the next draw when the generator cannot open that town (a tiny place with
 * no household holding a resident of the age the opening needs). The seed and
 * place of the draw that was used come back with the world.
 */
import { buildBenchWorld } from "../../bench/world";
import { drawPlace, type DrawnPlace } from "../../../scripts/core2-year/place";
import { gameStartDate } from "../game-start";
import type { CoreState } from "../types";

export function buildDrawnTown(
  seed: string,
  purpose: string,
  attempts = 6,
): { draw: DrawnPlace; core: CoreState } {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const draw = drawPlace(seed, `${purpose}:${attempt}`);
    try {
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      return { draw, core };
    } catch (error) {
      if (!/holds a resident aged/.test(String(error))) throw error;
      last = error;
    }
  }
  throw new Error(
    `no town opened in ${attempts} draws (seed ${seed}): ${last}`,
  );
}
