import { describe, expect, it } from "vitest";

import { addDays } from "../../src/simulation/dates";
import { lawInForceAtStart } from "../../src/simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import {
  homePriceLevel,
  homePriceLevels,
  HOUSING_SUPPLY_LAWS,
} from "../../src/simulation/living-world/housing-market";
import {
  RENT_LAW_KEYS,
  renewedMarketRent,
  marketRentLevel,
} from "../../src/simulation/living-world/town-rent";
import type { MacroMonthRecord } from "../../src/simulation/macro-economy/types";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";

/** Months whose real growth and inflation are the given annual rates. */
function months(
  rates: readonly { growthPct: number; inflationPct: number }[],
  scope = "national",
  from = 0,
): MacroMonthRecord[] {
  let output = 100;
  let price = 100;
  return rates.map((rate, at) => {
    const index = at + from;
    output *= Math.exp(rate.growthPct / 100 / 12);
    price *= Math.exp(rate.inflationPct / 100 / 12);
    const month = String((index % 12) + 1).padStart(2, "0");
    const year = 2026 + Math.floor(index / 12);
    return {
      scope,
      recordedAt: `${year}-${month}-01`,
      growthPct: rate.growthPct,
      inflationPct: rate.inflationPct,
      realOutputIndex: output,
      priceIndex: price,
      policyRate: { lowerPct: 4, upperPct: 4.25 },
    } as unknown as MacroMonthRecord;
  });
}

describe("a town's home prices follow its economy, with no draw", () => {
  it("starts at one and grows with income in a steady economy", () => {
    const steady = months(
      Array.from({ length: 121 }, () => ({ growthPct: 2, inflationPct: 2.5 })),
    );
    const levels = homePriceLevels(steady);
    expect(levels[0]!.level).toBe(1);
    // Ten years at 4.5% income growth: home prices end near exp(0.45).
    const tenYears = Math.log(levels[120]!.level);
    expect(tenYears).toBeGreaterThan(0.4);
    expect(tenYears).toBeLessThan(0.5);
    // The same months give the same prices.
    expect(homePriceLevels(steady)).toEqual(levels);
  });

  it("slows when income stops growing", () => {
    const boom = Array.from({ length: 24 }, () => ({
      growthPct: 3,
      inflationPct: 3,
    }));
    const bust = Array.from({ length: 24 }, () => ({
      growthPct: -3,
      inflationPct: 1,
    }));
    const levels = homePriceLevels(months([...boom, ...bust]));
    const yearly = (to: number) =>
      Math.log(levels[to]!.level / levels[to - 12]!.level);
    expect(yearly(47)).toBeLessThan(yearly(23));
  });

  it("reads the nation's months until the town keeps its own, then the town's, as months are added", () => {
    const steady = { growthPct: 2, inflationPct: 2.5 };
    const nation = months(Array.from({ length: 36 }, () => steady));
    // The town's own layer begins in the thirteenth month, from its own base.
    const own = months(
      Array.from({ length: 24 }, () => steady),
      "jurisdiction:town-1",
      12,
    ).map((month) => ({ ...month, realOutputIndex: 50, priceIndex: 70 }));
    const early = {
      macroEconomy: { months: nation.slice(0, 12) },
      history: {},
    } as never;
    const level = (world: never, date: string) =>
      homePriceLevel(world, "town-1" as never, date as never);
    expect(level(early, "2026-12-01")).toBeGreaterThan(1.03);
    const all = [...nation, ...own];
    const later = { macroEconomy: { months: all }, history: {} } as never;
    const year1 = level(later, "2026-12-01");
    const year2 = level(later, "2027-12-01");
    const year3 = level(later, "2028-12-01");
    expect(year1).toBeCloseTo(level(early, "2026-12-01"));
    // Steady growth carries on across the switch, with no jump.
    expect(Math.log(year3 / year2)).toBeCloseTo(Math.log(year2 / year1), 2);
    // A month added to the same array later is read.
    const growing = all.slice(0, 30);
    const world = { macroEconomy: { months: growing }, history: {} } as never;
    const before = level(world, "2031-01-01");
    growing.push(...all.slice(30));
    expect(level(world, "2031-01-01")).toBeGreaterThan(before);
  });
});

const POLICY = createProductionPolicyCatalog();
const OPENED = "2026-02-01" as IsoDate;

/**
 * A world whose state enacts, on `effectiveAt`, the given answers to supply
 * laws: only the record `lawInForce` reads, no people.
 */
function stateEnacts(
  stateId: EntityId,
  laws: readonly {
    question: string;
    answer: "yes" | "no";
    effectiveAt: IsoDate;
  }[],
): World {
  const idOf = (key: string) =>
    Object.values(POLICY.propositions).find((row) => row.stableKey === key)!.id;
  const measures: LegislativeMeasureRecord[] = [];
  const enactments: LegislativeEnactmentRecord[] = [];
  laws.forEach((law, index) => {
    const measure = {
      id: `measure_supply_${index}` as EntityId,
      stableKey: `test:supply:${index}`,
      sequence: index + 1,
      jurisdictionId: stateId,
      designation: `HB ${index + 1}`,
      propositionIds: [idOf(law.question)],
      propositionAnswers: [
        { propositionId: idOf(law.question), answer: law.answer },
      ],
    } as unknown as LegislativeMeasureRecord;
    measures.push(measure);
    enactments.push({
      id: `enactment_supply_${index}` as EntityId,
      stableKey: `test:supply:${index}:enactment`,
      sequence: 1_000_000 + index,
      measureId: measure.id,
      resolvedAt: OPENED,
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: law.effectiveAt,
      outcomeEventId: null,
    } as unknown as LegislativeEnactmentRecord);
  });
  return {
    currentDate: OPENED,
    policyCatalog: POLICY,
    history: {
      events: [],
      legislativeMeasures: measures,
      legislativeEnactments: enactments,
    },
  } as unknown as World;
}

describe("housing laws retain recorded market prices without automatic citywide overlays", () => {
  const place = drawRandomPlace("a57-shared-market-price");
  const town = place.context.jurisdiction.id;
  const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
  const effectiveAt = "2027-07-01" as IsoDate;
  const steady = months(
    Array.from({ length: 61 }, () => ({ growthPct: 2, inflationPct: 2.5 })),
  );
  const withMonths = (world: World): World =>
    ({ ...world, macroEconomy: { months: steady } }) as unknown as World;

  it.each([...HOUSING_SUPPLY_LAWS, RENT_LAW_KEYS.rentStabilization])(
    "%s does not multiply the shared market price on enactment or repeal",
    (question) => {
      const id = Object.values(POLICY.propositions).find(
        (row) => row.stableKey === question,
      )!.id;
      const started =
        lawInForceAtStart(
          { policyCatalog: POLICY, history: {} } as World,
          town,
          id,
          effectiveAt,
        ) === "yes";
      const base = withMonths(stateEnacts(state, []));
      const changed = withMonths(
        stateEnacts(state, [
          { question, answer: started ? "no" : "yes", effectiveAt },
        ]),
      );
      const repealed = withMonths(
        stateEnacts(state, [
          { question, answer: started ? "no" : "yes", effectiveAt },
          {
            question,
            answer: started ? "yes" : "no",
            effectiveAt: addDays(effectiveAt, 365),
          },
        ]),
      );
      for (const date of [
        OPENED,
        effectiveAt,
        addDays(effectiveAt, 365),
        "2030-12-01" as IsoDate,
      ]) {
        expect(homePriceLevel(changed, town, date)).toBe(
          homePriceLevel(base, town, date),
        );
        expect(homePriceLevel(repealed, town, date)).toBe(
          homePriceLevel(base, town, date),
        );
        expect(marketRentLevel(changed, town, date)).toBe(
          homePriceLevel(changed, town, date),
        );
      }
      expect(homePriceLevel(changed, town, "2030-12-01" as IsoDate)).not.toBe(
        1,
      );
    },
  );

  it("an explicit renewal cap still limits an actual market increase", () => {
    const renewal = renewedMarketRent(150_000, 1.12, 1.03, true, 0.08);
    expect(renewal.capped).toBe(true);
    expect(renewal.amountMinor).toBe(162_000);
    expect(renewal.uncappedMinor).toBe(168_000);
    expect(renewedMarketRent(150_000, 1.12, 1.03, false).amountMinor).toBe(
      168_000,
    );
  });
});
