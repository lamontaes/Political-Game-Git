/**
 * Pool item world-census-scale-closures-large-cities: a city far above
 * 40,000 people opened at its Census size closes no more firms than at the
 * sample size. Washington, D.C. (pinned) closed four at 69 times its sample
 * from three readers that did not multiply by the weight: an unfilled
 * opening's raise priced as one seat, the staffing target reading weighted
 * receipts against the book's unweighted capacity, and a filled-in
 * household (or a full owner) keeping money that stood for every household
 * its record did. One more city above 100,000 is drawn from all 56.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { publishedPlaceReferencePopulation } from "./gov-rules/place-population";
import { corePlaceByKey } from "./place-lookup";
import { compareClosures } from "./census-scale-closures-support";

const WASHINGTON = { key: "1150000", seed: "dc-closures-a" };
const LARGE = 100_000;
const REDRAWS = 400;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** A drawn place above 100,000 people, redrawing (bounded) until one is; the failure names every place and seed it tried. */
function drawLargeCity() {
  const tried: string[] = [];
  for (let i = 0; i < REDRAWS; i += 1) {
    const draw = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "world-census-scale-closures-large-cities",
    );
    const geoid = corePlaceByKey(draw.key)?.sourceGeoid;
    const reference = geoid
      ? publishedPlaceReferencePopulation(geoid)?.value
      : null;
    if (reference && reference > LARGE && draw.key !== WASHINGTON.key)
      return { draw, reference };
    tried.push(
      `${draw.name} (${draw.key}) seed ${draw.seed}: ${reference ?? "no population"}`,
    );
  }
  throw new Error(
    `no drawn place above ${LARGE} in ${REDRAWS} redraws (base ${base}); tried ${tried.join("; ")}`,
  );
}

it("Washington, D.C. at its Census size closes no more closure rows than at the sample size", () => {
  const reference = publishedPlaceReferencePopulation(WASHINGTON.key)?.value;
  expect(reference).toBeGreaterThan(LARGE);
  compareClosures(
    `Washington, D.C. (${WASHINGTON.key}), census ${reference}, seed ${WASHINGTON.seed}`,
    WASHINGTON.seed,
    WASHINGTON.key,
    reference!,
  );
  // Both years took about 500 seconds at one worker on a 4-core container
  // (sample 232, Census 196, building each about 52); about twice that.
}, 1_200_000);

it("a drawn city above 100,000 at its Census size closes no more closure rows than at the sample size", () => {
  const { draw, reference } = drawLargeCity();
  process.stdout.write(
    `DRAWN ${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}, base ${base}\n`,
  );
  compareClosures(
    `${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}`,
    draw.seed,
    draw.key,
    reference,
  );
  // Sized from Washington's two years (about 500 seconds); about twice that.
}, 1_200_000);
