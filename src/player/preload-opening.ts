import type { EntityId, World } from "../simulation";
import { enginePersonImage } from "../presentation/appearance-engine/runtime";
import { projectOpeningStops } from "../presentation/opening-stops";
import {
  openingStopBackdropUrl,
  stageOpeningStop,
} from "../presentation/opening-stop-staging";

/**
 * The longest the loading screen waits on pictures. A slow disk or a missing
 * file must not hold a new life on the loading screen; anything not ready by
 * then fills in as it arrives, as it did before.
 */
const PRELOAD_LIMIT_MS = 20_000;

function decodeImage(url: string): Promise<void> {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => undefined);
}

/**
 * Load the whole opening while the loading screen is still up (owner
 * playtest, October 8, 2026, A1): every stop's picture is decoded and every
 * person staged at a stop is composed, so no stop fills in after it shows.
 * Figures are composed through the same cached engine the screen draws from.
 */
export async function preloadOpening(
  world: World,
  personId: EntityId,
): Promise<void> {
  if (typeof Image === "undefined") return;
  const view = projectOpeningStops(world, personId);
  const jobs: Promise<unknown>[] = [];
  for (const stop of view.stops) {
    const url = openingStopBackdropUrl(stop);
    if (url) jobs.push(decodeImage(url));
    for (const person of stageOpeningStop(world, personId, stop))
      jobs.push(enginePersonImage(person.engine).catch(() => undefined));
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.allSettled(jobs),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, PRELOAD_LIMIT_MS);
    }),
  ]);
  clearTimeout(timer);
}
