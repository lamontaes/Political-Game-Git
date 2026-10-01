import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { TOWN_FINANCE_POLICY } from "../../src/simulation/living-world/town-finances";
import type { World } from "../../src/simulation/types";

/**
 * A71: a town business's credit line and how far its sales follow the town's
 * pay are still set by hand. No defensible source sizes either, so each names
 * a filed research question with the datasets that can settle it, and this
 * test proves the credit line is the number the world's books actually run
 * on, in a place drawn by seed from all 56 (set A71_SEED to watch another).
 */

const SEED = process.env.A71_SEED ?? "a71-town-credit-9";
const SOURCE = readFileSync(
  "src/simulation/living-world/town-finances.ts",
  "utf8",
);

function filedRequest(questionId: string): { questionId: string } {
  return JSON.parse(
    readFileSync(`docs/research/requests/${questionId}.json`, "utf8"),
  ) as { questionId: string };
}

describe("the town finance placeholders name their research (A71)", () => {
  it.each([
    ["creditLineDaysOfRevenue", "small-business-credit-line-size"],
    ["localDemandElasticity", "local-sales-response-to-town-pay"],
  ])("%s points at the filed question %s", (key, questionId) => {
    const at = SOURCE.indexOf(`    ${key}:`);
    expect(at).toBeGreaterThan(0);
    const comment = SOURCE.slice(SOURCE.lastIndexOf("/**", at), at);
    expect(comment).toContain("PLACEHOLDER (A71)");
    expect(comment).toContain(`\`${questionId}\``);
    expect(filedRequest(questionId).questionId).toBe(questionId);
  });
});

describe(`watched world, seed ${SEED}`, () => {
  const place = observerPlace(SEED);

  it(
    `opens in ${place.displayName} (${place.key}) and sizes every bank line from the policy value`,
    { timeout: 600_000 },
    () => {
      console.log(
        `A71 watched place: ${place.displayName} (${place.key}), seed ${SEED}`,
      );
      let world: World = openObserverWorld(
        observerSetup(SEED, place.key),
      ).world;
      for (let month = 0; month < 4; month += 1)
        world = advanceObservedWorld(world, 30);
      const businesses = Object.values(world.townFinances?.businesses ?? {});
      const days = TOWN_FINANCE_POLICY.business.creditLineDaysOfRevenue;
      const sized = (amount: number) =>
        Math.round(((amount * days) / 365) * 100) / 100;
      const banked = businesses.filter((books) => books.lineLimit > 0);
      console.log(
        `A71 ${place.displayName}: ${businesses.length} business books, ${banked.length} with a credit line`,
      );
      expect(
        banked.length,
        `${place.displayName}, seed ${SEED}`,
      ).toBeGreaterThan(0);
      // The line is sized from the unrounded revenue, so allow the cent the
      // stored revenue was rounded to.
      for (const books of banked)
        expect(
          Math.min(
            ...[
              books.annualRevenue,
              books.capacity,
              books.openingMarketSales,
            ].map((amount) => Math.abs(sized(amount) - books.lineLimit)),
          ),
          books.organizationId,
        ).toBeLessThanOrEqual(0.011);
    },
  );
});
