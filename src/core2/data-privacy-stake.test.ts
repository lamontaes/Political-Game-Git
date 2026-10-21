import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
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
// books, and any other law is priced elsewhere. A drawn place, a seed nobody chose.
const seed = process.env.PRIVACY_STAKE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "data-privacy-stake");

it(`a data privacy law costs a business its share of other costs, scaling with its books (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const small = businessDataPrivacyCostYear(
      api,
      DATA_PRIVACY_QUESTION,
      1_000_000,
    )!;
    const large = businessDataPrivacyCostYear(
      api,
      DATA_PRIVACY_QUESTION,
      2_000_000,
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
      ),
    ).toBeNull();
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
