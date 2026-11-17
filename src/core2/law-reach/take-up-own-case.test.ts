import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { coreAPI } from "../state";
import type { CoreAPI } from "../types";
import { takesUp } from "./group-b-money";
import type { HouseholdFacts } from "./group-b-people";

// Pins family 27 (CTO, "LIFT THE PINS", #9747): who takes up a benefit is
// each eligible household's own case, the one a laid-off worker weighs filing
// for unemployment, with the benefit over its own income. On main every
// eligible household was paid the benefit times a published take-up share
// (preschool 0.7, child care 0.2, energy aid 0.16, SSI and veterans' draw), so
// a poor and a well-off household were paid the same.
const household = (incomeDollars: number): HouseholdFacts => ({
  id: `household:${incomeDollars}`,
  named: false,
  size: 3,
  incomeDollars,
  ages: [40, 38, 4],
});

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "take-up-own-case");

describe(`a benefit is taken up by each household's own case, in ${place.name}, seed ${seed}`, () => {
  // A played world, with every engine the law reach reads (the filing case's
  // strengths are the jobs engine's).
  let api: CoreAPI;
  beforeAll(() => {
    setBookkeeping(false);
    api = coreAPI(
      buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core,
    );
  }, 300_000);

  it("a poorer household takes up a benefit a richer one leaves", () => {
    // About $600 a month, against a year's income of $12,000 and of $250,000.
    const benefit = 60_000;
    const poor = takesUp(api, undefined, benefit, household(12_000));
    const rich = takesUp(api, undefined, benefit, household(250_000));
    expect(poor.replaced).toBeGreaterThan(rich.replaced);
    expect(poor.yes).toBe(true);
    expect(rich.yes).toBe(false);
  });

  it("a household with no benefit to take up takes nothing", () => {
    expect(takesUp(api, undefined, 0, household(12_000)).yes).toBe(false);
  });

  it("the case moves smoothly with income: a larger share of income replaced never makes a household less likely to take it up", () => {
    const benefit = 30_000;
    const incomes = [5_000, 10_000, 20_000, 40_000, 80_000, 160_000];
    const answers = incomes.map(
      (income) => takesUp(api, undefined, benefit, household(income)).yes,
    );
    // Once a richer household leaves it, every richer one leaves it too.
    const first = answers.indexOf(false);
    if (first >= 0) expect(answers.slice(first).every((a) => !a)).toBe(true);
  });
});
