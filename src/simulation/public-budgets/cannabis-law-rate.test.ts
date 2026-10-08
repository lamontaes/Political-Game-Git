import { describe, expect, it } from "vitest";
import market from "../../../data/research/money/cannabis-retail-market.json";
import { makeIsoDate } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import { createWorld } from "../world";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensureOpeningGovernmentAccounts } from "./opening-government-accounts";
import type { EntityId, World } from "../types";
import { cannabisSalesRevenueChange } from "./cannabis-sales-revenue";
import { CANNABIS_TAX_EFFECT } from "./rules";
import { withOpenedBudgets } from ".";
import { BUDGET_SOURCES, PUBLIC_BUDGETS_VERSION } from "./store";
import { readMonthFlows, settleGovernmentMonth } from "./month";

const questionId = "proposition_cannabis_rate_fixture" as EntityId;
const date = makeIsoDate("2027-04-01");
const enacted = makeIsoDate("2026-02-01");
const seed = "au3-wire-04-law-rate-all-places";

function worldWithRate(placeKey: string, rate: number): World {
  const jurisdiction = chiefExecutiveJurisdiction(placeKey.slice(3))!;
  const world = ensureOpeningGovernmentAccounts(
    createWorld({
      seed,
      currentDate: date,
      jurisdictions: [jurisdiction],
      people: [],
      lineage: "production",
    }),
  );
  return {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [questionId]: {
          id: questionId,
          stableKey: CANNABIS_TAX_EFFECT.questionKey,
        },
      },
    },
    history: {
      ...world.history,
      legislativeMeasures: [
        {
          id: "measure_cannabis_rate" as EntityId,
          jurisdictionId: jurisdiction.id,
          propositionIds: [questionId],
          propositionAnswers: [{ propositionId: questionId, answer: "yes" }],
        },
      ],
      legislativeEnactments: [
        {
          id: "enactment_cannabis_rate" as EntityId,
          sequence: 3,
          measureId: "measure_cannabis_rate" as EntityId,
          outcome: "enacted",
          resolvedAt: enacted,
          effectiveAt: enacted,
        },
      ],
      legislativeProvisions: [
        {
          id: "provision_cannabis_rate" as EntityId,
          sequence: 2,
          measureId: "measure_cannabis_rate" as EntityId,
          recordedAt: enacted,
          supersedesProvisionId: null,
          applicationScope: { segmentKey: null },
          lawTerms: [
            {
              questionKey: CANNABIS_TAX_EFFECT.questionKey,
              key: "tax-rate",
              unit: "ratio",
              value: rate,
            },
          ],
        },
      ],
    },
  } as unknown as World;
}

describe("enacted cannabis rates reach the monthly budget in all 56 places", () => {
  const places = lifePlaceStateIdentities();
  it("covers the complete place roster", () => expect(places).toHaveLength(56));
  it("does not replace invalid adopted rates with an estimated levy", () => {
    const place = places[0]!;
    for (const rate of [-0.1, 1.1, Number.NaN]) {
      const world = worldWithRate(place.jurisdictionKey, rate);
      const reading = cannabisSalesRevenueChange(
        world,
        {
          level: "state",
          lawJurisdictionId: chiefExecutiveJurisdiction(place.usps)!.id,
          population: 1000,
        },
        date,
      );
      expect(reading).toEqual({
        reason: "tax-terms-not-operative",
        annualRevenueDelta: 0,
        sourceMeasureId: null,
      });
    }
  });
  it.each(places)("uses the adopted rate in $jurisdictionKey", (place) => {
    const lowWorld = worldWithRate(place.jurisdictionKey, 0.4);
    const highWorld = worldWithRate(place.jurisdictionKey, 0.8);
    const store = withOpenedBudgets(
      lowWorld,
      {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      },
      date,
    );
    const opening = store.governments.find(
      (row) => row.key === place.jurisdictionKey,
    )!;
    const index = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
    const government = {
      ...opening,
      years: opening.years.map((year) => ({
        ...year,
        expectedRevenue: year.expectedRevenue.map((value, at) =>
          at === index ? 0 : value,
        ),
      })),
    };
    const lowFlows = readMonthFlows(lowWorld, store).flows;
    const highFlows = readMonthFlows(highWorld, store).flows;
    expect(government, `${seed}: ${place.jurisdictionKey}`).toBeDefined();
    const low = cannabisSalesRevenueChange(lowWorld, government, date);
    const high = cannabisSalesRevenueChange(highWorld, government, date);
    const annualSales =
      government.population *
      market.adultPopulationShare.value *
      market.pastMonthUseShare.value *
      market.monthlySpendingPerUser.value *
      12;
    expect(high.annualRevenueDelta - low.annualRevenueDelta).toBeCloseTo(
      annualSales * 0.4,
      4,
    );
    expect(high.sourceMeasureId).toBe("measure_cannabis_rate");
    const lowMonth = settleGovernmentMonth(
      lowWorld,
      government,
      date,
      lowFlows,
    ).government.months.at(-1)!;
    const highMonth = settleGovernmentMonth(
      highWorld,
      government,
      date,
      highFlows,
    ).government.months.at(-1)!;
    const forecast = (row: typeof highMonth) =>
      (row as typeof row & { cannabisRevenue: number }).cannabisRevenue;
    expect(forecast(highMonth)).toBeGreaterThan(forecast(lowMonth));
    expect(forecast(highMonth) - forecast(lowMonth)).toBeCloseTo(
      (annualSales * 0.4) / 12,
      -1,
    );
    // Forecasts never mint cash: there are still no paid receipts in the ledger.
    expect(highMonth.revenue[index]).toBe(0);
    expect(lowMonth.revenue[index]).toBe(0);
    expect(
      cannabisSalesRevenueChange(
        JSON.parse(JSON.stringify(highWorld)),
        government,
        date,
      ),
    ).toEqual(high);
    const zero = cannabisSalesRevenueChange(
      worldWithRate(place.jurisdictionKey, 0),
      government,
      date,
    );
    expect(low.annualRevenueDelta - zero.annualRevenueDelta).toBeCloseTo(
      annualSales * 0.4,
      4,
    );
  });
});
