import { describe, expect, it } from "vitest";

import {
  adultSituationBank,
  availableAdultSituations,
  buildAdultLifeContext,
} from "./adult-situations";
import type { AdultLifeContext } from "./adult-situations";
import { createDemoWorld } from "./demo";
import { RETURN_SUMMARY } from "./life-callbacks";
import type { EntityId } from "./types";

/**
 * P2 prose migration — behavioral contracts.
 *
 * The wave's rule, from PROSE-RESET: a scene that fundamentally depends on an
 * object, amount or record the world does not contain is withheld rather than
 * rewritten into prettier vagueness, and a consequence line names what the
 * record supports rather than inventing what it does not.
 */

const WITHHELD_KEYS = [
  "adult.household-repair",
  "adult.household-money-shortfall",
  "adult.unexpected-expense",
  "adult.small-windfall",
  "adult.housing-repair-standoff",
] as const;

function contextWithEverything(): AdultLifeContext {
  const world = createDemoWorld();
  const personId = world.personOrder[0]!;
  const built = buildAdultLifeContext(world, personId);
  // Every gate the withheld situations used to read is forced open, so the
  // test cannot pass merely because a sparse demo world failed the old gate.
  return {
    ...built,
    householdIds:
      built.householdIds.length > 0
        ? built.householdIds
        : ["synthetic-household" as unknown as EntityId],
    hasDwelling: true,
    hasHousingTenure: true,
    hasHousingObligation: true,
    obligationCount: Math.max(1, built.obligationCount),
  };
}

describe("withholding is first-class, not deletion", () => {
  it("keeps every withheld situation authored, with its own reason", () => {
    for (const key of WITHHELD_KEYS) {
      const situation = adultSituationBank().find(
        (candidate) => candidate.key === key,
      );
      expect(situation, key).toBeDefined();
      expect(situation!.withheld, key).toBeTruthy();
      expect(situation!.withheld!.trim().length, key).toBeGreaterThan(0);
    }
  });

  it("never offers a withheld situation, even when its old gate holds", () => {
    const offered = availableAdultSituations(contextWithEverything()).map(
      (situation) => situation.key,
    );
    for (const key of WITHHELD_KEYS) {
      expect(offered, key).not.toContain(key);
    }
  });

  it("offers no situation that declares a withholding reason", () => {
    const offered = availableAdultSituations(contextWithEverything());
    for (const situation of offered) {
      expect(situation.withheld, situation.key).toBeUndefined();
    }
  });
});

describe("regrounded availability gates", () => {
  it("offers the household-standing scene only where the errands record exists", () => {
    const base = contextWithEverything();
    const withCompanion = {
      ...base,
      householdCompanionIds:
        base.householdCompanionIds.length > 0
          ? base.householdCompanionIds
          : base.familiarPersonIds.slice(0, 1),
    };
    const standing = adultSituationBank().find(
      (situation) => situation.key === "adult.household-standing",
    )!;
    expect(
      standing.available({ ...withCompanion, hasHouseholdWorkItem: false }),
    ).toBe(false);
    if (withCompanion.householdCompanionIds.length > 0) {
      expect(
        standing.available({ ...withCompanion, hasHouseholdWorkItem: true }),
      ).toBe(true);
    }
  });

  it("puts a price on staying only when the record carries a housing payment", () => {
    const base = contextWithEverything();
    const costChange = adultSituationBank().find(
      (situation) => situation.key === "adult.housing-cost-change",
    )!;
    expect(costChange.available({ ...base, hasHousingObligation: false })).toBe(
      false,
    );
    expect(
      costChange.available({
        ...base,
        hasHousingTenure: true,
        hasHousingObligation: true,
      }),
    ).toBe(true);
  });
});

describe("every consequence that can come back reads as itself", () => {
  it("gives a family return summary to every situation able to schedule an aftermath", () => {
    for (const situation of adultSituationBank()) {
      const canReturn = situation.options.some(
        (option) => option.aftermath !== null,
      );
      if (!canReturn) continue;
      expect(
        RETURN_SUMMARY[situation.key],
        `${situation.key} can schedule an aftermath but has no return summary; its callback would fall to the generic line`,
      ).toBeTruthy();
    }
  });

  it("keeps summaries for withheld keys whose callbacks old saves may still carry", () => {
    for (const key of WITHHELD_KEYS) {
      const situation = adultSituationBank().find(
        (candidate) => candidate.key === key,
      )!;
      const canReturn = situation.options.some(
        (option) => option.aftermath !== null,
      );
      if (!canReturn) continue;
      expect(RETURN_SUMMARY[key], key).toBeTruthy();
    }
  });
});
