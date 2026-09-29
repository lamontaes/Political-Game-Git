import { describe, expect, it } from "vitest";
import { observerPlace } from "../../src/presentation/observer-world";
import { makeIsoDate } from "../../src/simulation/dates";
import { lawInForceAtStart } from "../../src/simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetGovernment,
} from "../../src/simulation/public-budgets";
import { firstOfNextMonth } from "../../src/simulation/public-budgets/fiscal";
import {
  settleGovernmentMonth,
  taxLawFactor,
} from "../../src/simulation/public-budgets/month";
import {
  INCENTIVE_CAP_QUESTION,
  TAX_QUESTION_EFFECTS,
} from "../../src/simulation/public-budgets/rules";
import { STATES } from "../../src/simulation/state-reference";
import type { EntityId, World } from "../../src/simulation/types";

/*
 * A cap on the tax incentives offered to attract employers means a state
 * gives up less corporate income tax, and a county or city less property
 * tax, from the day it takes effect; lifting a cap gives it back. The world
 * is partial, as in the public budget tests, and the local place is drawn
 * from all 56 by the seed.
 */

const CAP = `proposition:${INCENTIVE_CAP_QUESTION}` as EntityId;
const seed = "incentive-cap-law-1";
const place = observerPlace(seed);
const town = place.context.jurisdiction.id;
const stateSize = TAX_QUESTION_EFFECTS.find(
  (row) =>
    row.questionKey === INCENTIVE_CAP_QUESTION &&
    row.source === "corporateIncomeTax",
)!.toYes!;
const localSize = TAX_QUESTION_EFFECTS.find(
  (row) =>
    row.questionKey === INCENTIVE_CAP_QUESTION && row.source === "propertyTax",
)!.toYes!;

/** A partial world where one law on the cap question takes effect in 2027. */
function withLaw(jurisdictionId: EntityId | null, answer: "yes" | "no"): World {
  const laws = jurisdictionId ? [{ jurisdictionId, answer }] : [];
  return {
    id: "world_test" as EntityId,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: {
        [CAP]: { id: CAP, stableKey: INCENTIVE_CAP_QUESTION },
      },
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law) => ({
        id: "measure_cap" as EntityId,
        jurisdictionId: law.jurisdictionId,
        propositionIds: [CAP],
        propositionAnswers: [{ propositionId: CAP, answer: law.answer }],
      })),
      legislativeEnactments: laws.map(() => ({
        id: "enactment_cap" as EntityId,
        sequence: 1000,
        measureId: "measure_cap" as EntityId,
        resolvedAt: makeIsoDate("2026-06-01"),
        outcome: "enacted",
        effectiveAt: makeIsoDate("2027-01-01"),
      })),
    },
  } as unknown as World;
}

/** The law a place began with; none counts as no cap. */
function began(jurisdictionId: EntityId): "yes" | "no" {
  return lawInForceAtStart(
    withLaw(null, "no"),
    jurisdictionId,
    CAP,
    makeIsoDate("2026-01-01"),
  ) === "yes"
    ? "yes"
    : "no";
}

function government(
  jurisdictionId: EntityId,
  level: PublicBudgetGovernment["level"],
): PublicBudgetGovernment {
  return {
    level,
    lawJurisdictionId: jurisdictionId,
  } as unknown as PublicBudgetGovernment;
}

describe(`a cap on development incentives (${place.displayName})`, () => {
  it("sizes come from real fiscal estimates, never zero", () => {
    expect(stateSize).toBeCloseTo(1.75 / 46.01, 6);
    expect(localSize).toBeGreaterThan(0);
  });

  it("every state collects more corporate income tax under a cap it did not begin with, and less when it lifts one", () => {
    for (const usps of Object.keys(STATES)) {
      const state = stateJurisdictionForKey(`US-${usps}`)!.id;
      const start = began(state);
      const changed = withLaw(state, start === "yes" ? "no" : "yes");
      const kept = withLaw(state, start);
      const factor = (world: World, on: string) =>
        taxLawFactor(
          world,
          government(state, "state"),
          "corporateIncomeTax",
          makeIsoDate(on),
        );
      expect(factor(changed, "2026-12-01"), usps).toBe(1);
      expect(factor(changed, "2027-02-01"), usps).toBeCloseTo(
        start === "yes" ? 1 - stateSize : 1 + stateSize,
        9,
      );
      expect(factor(kept, "2027-02-01"), usps).toBe(1);
      // A state cap does not move the state's own property tax.
      expect(
        taxLawFactor(
          changed,
          government(state, "state"),
          "propertyTax",
          makeIsoDate("2027-02-01"),
        ),
        usps,
      ).toBe(1);
    }
  });

  it("a town's own ordinance moves its property tax and not a state tax", () => {
    const start = began(town);
    const changed = withLaw(town, start === "yes" ? "no" : "yes");
    const local = government(town, "city");
    expect(
      taxLawFactor(changed, local, "propertyTax", makeIsoDate("2027-02-01")),
    ).toBeCloseTo(start === "yes" ? 1 - localSize : 1 + localSize, 9);
    expect(
      taxLawFactor(
        changed,
        local,
        "corporateIncomeTax",
        makeIsoDate("2027-02-01"),
      ),
    ).toBe(1);
  });

  it("the state's budget collects the change month by month", () => {
    const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
    const start = began(state);
    const open = (world: World): PublicBudgetGovernment => {
      const store = withOpenedBudgets(
        world,
        {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        },
        world.currentDate,
      );
      return publicBudgetFor({ ...world, publicBudgets: store }, state)!;
    };
    const run = (world: World) => {
      let current = open(world);
      let month = makeIsoDate("2026-01-01");
      while (month <= "2027-03-01") {
        current = settleGovernmentMonth(world, current, month, {
          withheld: new Map(),
          represented: new Map(),
          levies: new Map(),
          payments: new Map(),
        }).government;
        month = firstOfNextMonth(month);
      }
      return current;
    };
    const at = BUDGET_SOURCES.indexOf("corporateIncomeTax");
    const withCap = run(withLaw(state, start === "yes" ? "no" : "yes"));
    const without = run(withLaw(null, "no"));
    const revenue = (row: PublicBudgetGovernment, on: string) =>
      row.months.find((month) => month.month === on)!.revenue[at]!;
    expect(revenue(withCap, "2026-12-01")).toBe(revenue(without, "2026-12-01"));
    if (revenue(without, "2027-02-01") === 0) return; // no corporate income tax
    expect(
      revenue(withCap, "2027-02-01") / revenue(without, "2027-02-01"),
    ).toBeCloseTo(start === "yes" ? 1 - stateSize : 1 + stateSize, 4);
  });
});
