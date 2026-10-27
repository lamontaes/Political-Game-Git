/**
 * The creator's town list shows each town's population from the one source
 * the world opens from (play-first-04): in a drawn place, the count the list
 * gives the town equals the opening population of the world built there.
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
    if (opened !== undefined && opened !== "not-held")
      expect(listed!.population, where).toBe(Number(opened));
    else {
      // No count on record: the world opens at the model's own size, and the
      // list says so as an estimate.
      expect(listed!.estimated, where).toBe(true);
      expect(listed!.population, where).toBe(parameter("targetPopulation"));
    }
  },
);
