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
// The wholesaler closed on 2025-07-02, short of cash on a payday with its
// savings in the bank. A year of this town at the sample size outgrows one
// test process's memory from August on, so the case plays to late August.
const DAYS = 220;

it("Opelika, Alabama at its Census size closes no more closure rows than at the sample size, through its wholesaler's July payday", () => {
  const reference = placeReferencePopulation(OPELIKA.key)?.value;
  expect(reference).toBeGreaterThan(SAMPLE);
  compareClosures(
    `Opelika, Alabama (${OPELIKA.key}), census ${reference}, seed ${OPELIKA.seed}`,
    OPELIKA.seed,
    OPELIKA.key,
    reference!,
    DAYS,
  );
  // Both worlds' 220 days took 548 seconds at one worker on a 4-core
  // container; about twice that.
}, 1_200_000);
