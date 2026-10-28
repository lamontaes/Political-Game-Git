/**
 * The creator's town list shows each town's population from the one source
 * the world opens from (play-first-04): in a drawn place, the world built
 * there opens on its own count, drawn around the one the list gives.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { parameter } from "../core2/parameters";
import { corePlaceByKey } from "../core2/place-lookup";
import { creatorTowns } from "./creator";
import { buildBenchWorld } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`creator-towns:${Date.now()}`).digest("hex");

it(
  "lists the drawn town with the population its world opens with",
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const place = drawPlace(runSeed, "play-first-04");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    console.log(where);
    const stateKey = corePlaceByKey(place.key)?.stateJurisdictionKey;
    expect(stateKey, where).toBeTruthy();
    const listed = creatorTowns(stateKey!, "").find(
      (row) => row.key === place.key,
    );
    expect(
      listed,
      `the drawn town is in its state's list: ${where}`,
    ).toBeDefined();
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const opened = world.core.placeMetadata?.referencePopulation;
    console.log(`listed ${listed!.population}, world opens with ${opened}`);
    // The list is shown before Start, so it reads the published count; the
    // world opens on its own count drawn around it, inside the population
    // spread (stopgap SG-WORLD-creator-town-count-published).
    if (opened !== undefined && opened !== "not-held")
      expect(
        Math.abs(Number(opened) - listed!.population),
        where,
      ).toBeLessThanOrEqual(
        Math.max(
          parameter("one"),
          Math.ceil(
            listed!.population * parameter("worldPopulationSpreadShare"),
          ),
        ),
      );
    else {
      // No count on record: the world opens at the model's own size, and the
      // list says so as an estimate.
      expect(listed!.estimated, where).toBe(true);
      expect(listed!.population, where).toBe(parameter("targetPopulation"));
    }
  },
);
