/**
 * A stopgap marker called from a module with no context still records its
 * hit in the world being run (pool item core-stopgap-hits-miss-module-calls).
 * A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a played year records the module-level markers it ran", () => {
  const place = drawPlace(seed, "stopgap-hits");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 90));
  // The housing engine's landlord and the property tax's state average run
  // every month through plain `stopgap("ID")` calls.
  expect([...core.stopgapHits], where).toEqual(
    expect.arrayContaining([
      "SG-WORLD-housing-landlord",
      "SG-WORLD-property-tax-rate",
    ]),
  );
}, 900_000);
