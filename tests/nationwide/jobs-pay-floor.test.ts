import { describe, expect, it } from "vitest";

import {
  payFloorSentence,
  payFloorSentenceAt,
} from "../../src/presentation/job-listings-view";
import { proseDate } from "../../src/presentation/prose-dates";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { TOWN_MINIMUM_WAGES } from "../../src/simulation/living-world/town-pay.generated";
import { startingMinimumHourly } from "../../src/simulation/minimum-wage";
import type { EntityId } from "../../src/simulation";

import { nashvilleWithFederalRaise, onDate } from "./federal-raise-fixture";

/*
 * The Jobs screen says the lowest legal pay where the player lives and which
 * law set it, from the same derived rate the paychecks use.
 */

describe("the Jobs screen names the pay floor and the law behind it", () => {
  it("says federal law sets $7.25 until an Act raises it, then names the Act's rate, the old rate and the day", () => {
    const { world, opened, effectiveAt } = nashvilleWithFederalRaise(45);
    const personId = (world.control as { personId: EntityId }).personId;
    expect(payFloorSentence(world, personId)).toBe(
      "The lowest legal pay here is $7.25 an hour, set by federal law.",
    );
    const after = payFloorSentence(onDate(world, effectiveAt), personId);
    expect(after).toBe(
      `The lowest legal pay here is $15.00 an hour. Federal law set it from $7.25 an hour on ${proseDate(effectiveAt)}.`,
    );
    expect(opened < effectiveAt).toBe(true);
  });

  it("gives every state, D.C. and territory on file the rate its paychecks use, and says nothing where the rate is unknown", () => {
    const { world } = nashvilleWithFederalRaise(45);
    let named = 0;
    let unknown = 0;
    for (const key of Object.keys(TOWN_MINIMUM_WAGES)) {
      const jurisdiction = stateJurisdictionForKey(key);
      if (!jurisdiction) continue;
      const sentence = payFloorSentenceAt(world, jurisdiction.id);
      const rate = startingMinimumHourly(jurisdiction.id);
      if (rate === null) {
        expect(sentence, key).toBeNull();
        unknown += 1;
        continue;
      }
      expect(sentence, key).toContain(`$${rate.toFixed(2)} an hour`);
      named += 1;
    }
    expect(named).toBeGreaterThan(40);
    expect(named + unknown).toBeGreaterThan(50);
  });
});
