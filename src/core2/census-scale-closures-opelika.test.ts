/**
 * Pool item world-census-scale-closures-rise, pinned regression: Opelika,
 * Alabama opened at its Census size closed firms (a wholesaler and a retailer
 * short of cash on a payday while holding savings at the bank) that the same
 * town at the sample size kept open.
 */
import { expect, it } from "vitest";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { SAMPLE, compareClosures } from "./census-scale-closures-support";

const OPELIKA = { key: "0157048", seed: "op1" };

it("Opelika, Alabama at its Census size closes no more closure rows than at the sample size", () => {
  const reference = placeReferencePopulation(OPELIKA.key)?.value;
  expect(reference).toBeGreaterThan(SAMPLE);
  compareClosures(
    `Opelika, Alabama (${OPELIKA.key}), census ${reference}, seed ${OPELIKA.seed}`,
    OPELIKA.seed,
    OPELIKA.key,
    reference!,
  );
}, 3_600_000);
