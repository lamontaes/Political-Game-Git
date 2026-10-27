/**
 * Pool item world-census-scale-closures-rise: a town opened at its Census size
 * pays that multiple of wages (its counted workers stand for several), takes
 * in that multiple of sales and holds that multiple of cash, so it closes no
 * more job rows than the same town at the sample size. A drawn place above
 * 10,000 people, opened at reference over the 10,000-person sample, played
 * for a year each way.
 */
import { createHash, randomBytes } from "node:crypto";
import { it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { corePlaceByKey } from "./place-lookup";
import { SAMPLE, compareClosures } from "./census-scale-closures-support";

const REDRAWS = 200;
/** A year of a larger city at its Census size does not fit one test process's memory. */
const LARGEST = 40_000;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/**
 * A drawn place whose Census population is above 10,000 and at most 40,000, redrawing (bounded)
 * until one is; the failure names every place and seed it tried.
 */
function drawLargeTown() {
  const tried: string[] = [];
  for (let i = 0; i < REDRAWS; i += 1) {
    const draw = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "world-census-scale-closures",
    );
    const geoid = corePlaceByKey(draw.key)?.sourceGeoid;
    const reference = geoid ? placeReferencePopulation(geoid)?.value : null;
    if (reference && reference > SAMPLE && reference <= LARGEST)
      return { draw, reference };
    tried.push(
      `${draw.name} (${draw.key}) seed ${draw.seed}: ${reference ?? "no population"}`,
    );
  }
  throw new Error(
    `no drawn place from ${SAMPLE} to ${LARGEST} in ${REDRAWS} redraws (base ${base}); tried ${tried.join("; ")}`,
  );
}

it("a drawn Census-size town closes no more closure rows than the same town at the sample size", () => {
  const { draw, reference } = drawLargeTown();
  compareClosures(
    `${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}`,
    draw.seed,
    draw.key,
    reference,
  );
  // Lisbon, Wisconsin (11,150 people) took 728 seconds for its two years at
  // one worker on a 4-core container; a town near 40,000 carries about four
  // times the weight, so up to about five times that.
}, 3_600_000);
