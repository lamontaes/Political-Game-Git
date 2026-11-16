import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  businessDataPrivacyCostYear,
  DATA_PRIVACY_QUESTION,
} from "./modules/business";
import { coreAPI } from "./state";

// What a consumer data privacy law costs a business is the share of its other
// operating costs the business engine's monthly cost review charges, so an
// employer's stake in the bill reads that cost instead of a share of payroll
// (SG-GOV-bound-employer-cost-estimate). It scales with the business's own
// books, binds only a business over the statute's size test, and any other
// law is priced elsewhere. Pinned to Pierre, South Dakota, like the other two
// privacy tests. Old premise: a place drawn at run time from a random seed; a
// draw of Manchester, New Hampshire took 42 s to build where Pierre takes 13 s,
// so no limit fit every draw (Nov 16, 2026).
const place = {
  name: "Pierre, South Dakota",
  key: "4649600",
  seed: "ilt-pierre",
};
const seed = place.seed;

it(`a data privacy law costs a business its share of other costs, scaling with its books (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const over = api.parameter("businessDataPrivacyMinSalesMinor");
    const small = businessDataPrivacyCostYear(
      api,
      DATA_PRIVACY_QUESTION,
      1_000_000,
      over,
    )!;
    const large = businessDataPrivacyCostYear(
      api,
      DATA_PRIVACY_QUESTION,
      2_000_000,
      over,
    )!;
    expect(small).toBe(
      Math.round(1_000_000 * api.parameter("businessDataPrivacyShareOfCosts")),
    );
    expect(small).toBeGreaterThan(0);
    expect(Math.abs(large - 2 * small)).toBeLessThanOrEqual(1);
    expect(
      businessDataPrivacyCostYear(
        api,
        "us-policy-positions:environment-energy.bottle-deposit",
        1_000_000,
        over,
      ),
    ).toBeNull();
    // A business under the statute's size test is not bound: the law costs it nothing.
    expect(
      businessDataPrivacyCostYear(
        api,
        DATA_PRIVACY_QUESTION,
        1_000_000,
        over - 1,
      ),
    ).toBe(0);
  } finally {
    setBookkeeping(true);
  }
}, 75_000); // 29 s alone, 37 s beside the other privacy tests at Pierre (Nov 16, 2026); about twice that.
