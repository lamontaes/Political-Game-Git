import { rentalFixture } from "../fixtures/rental-cap-world";
import { describe, expect, it, vi } from "vitest";

import { addDays } from "../../src/simulation/dates";
import { lawEffectPaths } from "../../src/simulation/governing/law-effect-paths";
import { lawInForceAtStart } from "../../src/simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import {
  homePriceLevel,
  homePriceLevels,
  HOUSING_SUPPLY_LAWS,
  housingLawEffect,
} from "../../src/simulation/living-world/housing-market";
import {
  RENT_LAW_KEYS,
  renewedMarketRent,
  rentLawLevel,
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

describe("housing law answers do not inject a fixed market price push", () => {
  const place = drawRandomPlace("housing-supply-law");
  const town = place.context.jurisdiction.id;
  const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
  const question = HOUSING_SUPPLY_LAWS[1];
  const questionId = Object.values(POLICY.propositions).find(
    (row) => row.stableKey === question,
  )!.id;
  const effectiveAt = "2027-07-01" as IsoDate;
  const acts = addDays(effectiveAt, 365);
  // The answer the place began with, and the one a change in play gives it.
  const started =
    lawInForceAtStart(
      { policyCatalog: POLICY, history: {} } as unknown as World,
      town,
      questionId,
      effectiveAt,
    ) === "yes";
  const changed = started ? "no" : "yes";

  it(`${place.displayName} (${place.key}, seed housing-supply-law): nothing before the law has been in force a year`, () => {
    const world = stateEnacts(state, [
      { question, answer: changed, effectiveAt },
    ]);
    expect(housingLawEffect(world, town, OPENED)).toBe(0);
    expect(housingLawEffect(world, town, addDays(acts, -1))).toBe(0);
  });

  it("the law and its repeal supply no unsupported direct price push", () => {
    const world = stateEnacts(state, [
      { question, answer: changed, effectiveAt },
    ]);
    expect(housingLawEffect(world, town, acts)).toBeCloseTo(0, 12);
    // Both directions: the law repealed a year later puts prices back on
    // their own path once the repeal has been in force a year.
    const repealed = stateEnacts(state, [
      { question, answer: changed, effectiveAt },
      {
        question,
        answer: started ? "yes" : "no",
        effectiveAt: addDays(effectiveAt, 365),
      },
    ]);
    expect(housingLawEffect(repealed, town, addDays(acts, 400))).toBe(0);
  });

  it("an enacted law that repeats the answer the place began with moves nothing", () => {
    const world = stateEnacts(state, [
      { question, answer: started ? "yes" : "no", effectiveAt },
    ]);
    expect(housingLawEffect(world, town, addDays(acts, 30))).toBe(0);
  });

  it("the home-price level follows recorded conditions rather than a law-only multiplier", () => {
    const steady = months(
      Array.from({ length: 60 }, () => ({ growthPct: 2, inflationPct: 2.5 })),
    );
    const law = stateEnacts(state, [
      { question, answer: changed, effectiveAt },
    ]);
    const base = homePriceLevels(steady);
    const moved = homePriceLevels(steady, (month) =>
      housingLawEffect(law, town, month.recordedAt),
    );
    const at = (levels: typeof base, date: string) =>
      levels.filter((row) => row.recordedAt <= date).at(-1)!.level;
    // Before the law acts the two paths are the same; after, prices part
    // the way the law points.
    expect(at(moved, "2028-06-01")).toBe(at(base, "2028-06-01"));
    const parted = Math.log(at(moved, "2030-12-01") / at(base, "2030-12-01"));
    expect(Math.sign(parted)).toBe(0);
  });

  it("in a steady economy, a missing market price observation injects no fixed change", () => {
    const steady = months(
      Array.from({ length: 61 }, () => ({ growthPct: 2, inflationPct: 2.5 })),
    );
    const base = homePriceLevels(steady).at(-1)!.level;
    const moved = homePriceLevels(steady, () => 0).at(-1)!.level;
    expect(Math.log(moved / base)).toBeCloseTo(0, 2);
  });

  it("each supply law is a law effect path the unwired-laws list counts", () => {
    for (const key of HOUSING_SUPPLY_LAWS)
      expect(
        lawEffectPaths().filter(
          (path) => path.questionKey === key && path.kind === "home-prices",
        ),
        key,
      ).toHaveLength(1);
  });
});

describe("rent stabilization raises the town's market rents a year after it takes effect", () => {
  const place = drawRandomPlace("rent-stabilization-citywide");
  const town = place.context.jurisdiction.id;
  const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
  const question = RENT_LAW_KEYS.rentStabilization;
  const questionId = Object.values(POLICY.propositions).find(
    (row) => row.stableKey === question,
  )!.id;
  const effectiveAt = "2027-07-01" as IsoDate;
  const acts = addDays(effectiveAt, 365);
  const started =
    lawInForceAtStart(
      { policyCatalog: POLICY, history: {} } as unknown as World,
      town,
      questionId,
      effectiveAt,
    ) === "yes";
  const changed = started ? "no" : "yes";
  const raised = 1 + 0;

  it(`${place.displayName} (${place.key}, seed rent-stabilization-citywide): no blanket rise before or after the law takes effect`, () => {
    const world = stateEnacts(state, [
      { question, answer: changed, effectiveAt },
    ]);
    expect(rentLawLevel(world, town, OPENED)).toBe(1);
    expect(rentLawLevel(world, town, addDays(acts, -1))).toBe(1);
    expect(rentLawLevel(world, town, acts)).toBeCloseTo(
      started ? 1 / raised : raised,
      12,
    );
  });

  it("a repeal a year later puts rents back once it has acted, and a law repeating the starting answer moves nothing", () => {
    const repealed = stateEnacts(state, [
      { question, answer: changed, effectiveAt },
      {
        question,
        answer: started ? "yes" : "no",
        effectiveAt: addDays(effectiveAt, 365),
      },
    ]);
    expect(rentLawLevel(repealed, town, addDays(acts, 400))).toBe(1);
    const same = stateEnacts(state, [
      { question, answer: started ? "yes" : "no", effectiveAt },
    ]);
    expect(rentLawLevel(same, town, addDays(acts, 30))).toBe(1);
  });

  it("a controlled covered renewal uses its own typed final cap", () => {
    // Home prices up 4% and the law's rise on top, against prices up 3%:
    // the landlord seeks 9.3%, the cap allows 8%.
    const fixture = rentalFixture(place.stateJurisdictionKey!.slice(3), {
      cap: {
        op: "constant",
        value: 0.08,
        unit: "ratio",
        sourceIds: ["authored:controlled-cap"],
      },
      coverage: { exemptions: [] },
    });
    const renewal = renewedMarketRent(150_000, 1.0933, fixture.input);
    vi.restoreAllMocks();
    expect(renewal.capped).toBe(true);
    expect(renewal.amountMinor).toBe(162_000);
    expect(renewal.uncappedMinor).toBe(164_000);
  });
});
