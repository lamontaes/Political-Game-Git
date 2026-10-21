/**
 * A played world (the bench world, every module installed) in the first
 * drawn place that has what a test reads, for tests that would otherwise end
 * early in a place without it. Places are drawn from all 56 in turn from the
 * seed; none having the case fails by name, listing why each was passed over.
 */
import { drawPlace, type DrawnPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { gameStartDate } from "../game-start";

export type PlayedWorld = ReturnType<typeof buildBenchWorld>;

export function worldWith(
  seed: string,
  purpose: string,
  has: (world: PlayedWorld, place: DrawnPlace) => boolean,
  attempts = 8,
): { world: PlayedWorld; place: DrawnPlace } {
  const tried: string[] = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const place = drawPlace(attempt ? `${seed}:${attempt}` : seed, purpose);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    if (has(world, place)) return { world, place };
    tried.push(`${place.name} (${place.key})`);
  }
  throw new Error(
    `no drawn place had the case (${purpose}, seed ${seed}): ${tried.join("; ")}`,
  );
}
