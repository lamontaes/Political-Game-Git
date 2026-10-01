import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../../src/simulation/dates";
import { lawInForceAtStart } from "../../src/simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import type { PublicBudgetGovernment } from "../../src/simulation/public-budgets";
import { taxLawFactor } from "../../src/simulation/public-budgets/month";
import {
  FUEL_TAX_EROSION_PER_YEAR,
  MILEAGE_FEE_QUESTION,
  motorFuelShare,
} from "../../src/simulation/public-budgets/road-usage-charge";
import { STATES } from "../../src/simulation/state-reference";
import type { EntityId, World } from "../../src/simulation/types";

/*
 * A state's fuel tax erodes as the fleet burns less fuel per mile. A per-mile
 * road charge bills miles instead, so from its first bill, two years after
 * the law takes effect, the state's selective sales taxes stop losing that
 * share; a repeal sends the state back to the fuel tax at what the fleet
 * then pays. The world is partial, as in the public budget tests.
 */

const FEE = `proposition:${MILEAGE_FEE_QUESTION}` as EntityId;
const OPENED = makeIsoDate("2026-01-01");

/** A partial world where one law on the road charge takes effect in 2027. */
function withLaw(jurisdictionId: EntityId | null, answer: "yes" | "no"): World {
  const laws = jurisdictionId ? [{ jurisdictionId, answer }] : [];
  return {
    id: "world_test" as EntityId,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: { [FEE]: { id: FEE, stableKey: MILEAGE_FEE_QUESTION } },
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law) => ({
        id: "measure_fee" as EntityId,
        jurisdictionId: law.jurisdictionId,
        propositionIds: [FEE],
        propositionAnswers: [{ propositionId: FEE, answer: law.answer }],
      })),
      legislativeEnactments: laws.map(() => ({
        id: "enactment_fee" as EntityId,
        sequence: 1000,
        measureId: "measure_fee" as EntityId,
        resolvedAt: makeIsoDate("2026-06-01"),
        outcome: "enacted",
        effectiveAt: makeIsoDate("2027-01-01"),
      })),
    },
  } as unknown as World;
}

function government(
  jurisdictionId: EntityId,
  stateKey: string,
  level: PublicBudgetGovernment["level"] = "state",
): PublicBudgetGovernment {
  return {
    level,
    stateKey,
    lawJurisdictionId: jurisdictionId,
    years: [
      { adoptedOn: OPENED, expectedRevenue: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    ],
  } as unknown as PublicBudgetGovernment;
}

/** What a state keeps of its opening selective sales taxes after `years`. */
function eroded(stateKey: string, years: number): number {
  return (
    1 -
    motorFuelShare(stateKey) *
      (1 - Math.pow(1 - FUEL_TAX_EROSION_PER_YEAR, years))
  );
}

describe("a per-mile road charge in place of the fuel tax", () => {
  it("the erosion is CBO's 21% by 2040, and every place has a measured or averaged fuel share", () => {
    expect(Math.pow(1 - FUEL_TAX_EROSION_PER_YEAR, 28)).toBeCloseTo(0.79, 9);
    expect(Object.keys(STATES)).toHaveLength(56);
    for (const usps of Object.keys(STATES)) {
      const share = motorFuelShare(`US-${usps}`);
      expect(share, usps).toBeGreaterThan(0);
      expect(share, usps).toBeLessThan(1);
    }
    expect(motorFuelShare("US-CA")).toBe(0.436);
    expect(motorFuelShare("US-GU")).toBe(0.285);
  });

  it("every state that enacts one keeps the fuel tax it had at the first bill; one that repeals its own goes back to an eroding fuel tax", () => {
    for (const usps of Object.keys(STATES)) {
      const key = `US-${usps}`;
      const state = stateJurisdictionForKey(key)!.id;
      const began =
        lawInForceAtStart(withLaw(null, "no"), state, FEE, OPENED) === "yes";
      const changed = withLaw(state, began ? "no" : "yes");
      const kept = withLaw(state, began ? "yes" : "no");
      const factor = (world: World, on: string) =>
        taxLawFactor(
          world,
          government(state, key),
          "selectiveSalesTaxes",
          makeIsoDate(on),
        );
      const tenYears = 10;
      if (began) {
        // A state that began with a charge loses nothing while it keeps it.
        expect(factor(kept, "2036-01-01"), usps).toBe(1);
        // A repeal returns it to the fuel tax at what today's fleet pays.
        expect(factor(changed, "2036-01-01"), usps).toBeCloseTo(
          eroded(key, tenYears),
          3,
        );
      } else {
        // Without a charge the fuel tax erodes every year.
        expect(factor(kept, "2036-01-01"), usps).toBeCloseTo(
          eroded(key, tenYears),
          3,
        );
        // Before the first bill the charge changes nothing.
        expect(factor(changed, "2028-06-01"), usps).toBe(
          factor(kept, "2028-06-01"),
        );
        // From the first bill, January 2029, the share stops falling.
        expect(factor(changed, "2036-01-01"), usps).toBeCloseTo(
          eroded(key, 3),
          3,
        );
        expect(factor(changed, "2036-01-01"), usps).toBeGreaterThan(
          factor(kept, "2036-01-01"),
        );
      }
    }
  });

  it("a county's or city's budget is not moved by the state's fuel tax", () => {
    const state = stateJurisdictionForKey("US-OH")!.id;
    expect(
      taxLawFactor(
        withLaw(state, "yes"),
        government(state, "US-OH", "city"),
        "selectiveSalesTaxes",
        makeIsoDate("2036-01-01"),
      ),
    ).toBe(1);
  });
});
