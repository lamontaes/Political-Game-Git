/**
 * Price laws read each household's own use (cluster 16): the same pay with
 * different people in the home gives a different bill, and the riders a
 * fare-free law adds drive less.
 */
import { describe, expect, it } from "vitest";
import goods from "./data/prices/goods.json" with { type: "json" };
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { worldCoreData } from "./modules/world";
import {
  householdComposition,
  monthlyChange,
  PLACE_PRICES_MODULE,
  ridersMilesLeft,
  ruleId,
  useFactor,
  worldGoods,
} from "./modules/place-prices";
import type { CoreInput, CoreState } from "./types";
import { ageOfMajority } from "./age-of-majority";

function api() {
  const input = {
    seed: "price-household-use-pinned",
    startedAt: "2021-01-01",
    people: [],
    households: [],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  } as unknown as CoreInput;
  return coreAPI(
    createLifeCore(input, {
      data: worldCoreData(),
      modules: [PLACE_PRICES_MODULE],
    }),
  );
}

const family = { persons: 4, adults: 2, workers: 2 };
const single = { persons: 1, adults: 1, workers: 1 };
const retired = { persons: 2, adults: 2, workers: 0 };

describe("a household's own use of a priced good", () => {
  const a = api();
  it("drives more miles with more workers and adults, and the same pay changes the fee", () => {
    const g = worldGoods(a.state.seed).goods;
    const fee = { good: "vehicle-miles", kind: "per-unit", value: 5 } as const;
    const pay = (who: typeof family) =>
      monthlyChange(fee, useFactor(a, "vehicle-miles", "per-unit", who), 1, g)
        .payMinor;
    expect(pay(family)).toBeGreaterThan(pay(single));
    expect(pay(single)).toBeGreaterThan(pay(retired) * 0.5);
    expect(pay(retired)).toBeLessThan(pay(family));
  });
  it("rides transit by its workers and people, and runs more power with more people", () => {
    expect(useFactor(a, "transit-fare", "price", family)).toBeGreaterThan(
      useFactor(a, "transit-fare", "price", retired),
    );
    expect(useFactor(a, "electricity", "share", family)).toBeGreaterThan(
      useFactor(a, "electricity", "share", single),
    );
  });
  it("takes up broadband by its workers, sliding rather than flipping", () => {
    const f = (workers: number) =>
      useFactor(a, "broadband", "offer", { persons: 3, adults: 2, workers });
    expect(f(2)).toBeGreaterThan(f(1));
    expect(f(1)).toBeGreaterThan(f(0));
  });
  it("leaves every other good unchanged", () => {
    expect(useFactor(a, "beverage-container", "per-unit", family)).toBe(1);
  });
  it("gives the reference household a factor of one", () => {
    const ref = {
      persons: a.parameter("pricesReferencePersons"),
      adults: a.parameter("pricesReferenceAdults"),
      workers: a.parameter("pricesReferenceWorkers"),
    };
    for (const good of ["vehicle-miles", "transit-fare", "broadband"] as const)
      expect(useFactor(a, good, "price", ref)).toBeCloseTo(1, 6);
    void goods;
  });
  it("takes the miles added riders no longer drive out of their own miles", () => {
    expect(ridersMilesLeft(a, 0, 100)).toBe(1);
    const left = ridersMilesLeft(a, 10, 500);
    expect(left).toBeLessThan(1);
    expect(left).toBeGreaterThan(0);
    expect(ridersMilesLeft(a, 1000, 100)).toBe(0);
  });
  it("keeps two statutes on one good as two rules (Hampden, Maine: a state that already allows retail choice also enacts a clean-electricity standard)", () => {
    const a = ruleId("p", "electricity", "share", "retail-choice");
    const b = ruleId("p", "electricity", "share", "clean-standard");
    expect(a).not.toBe(b);
    expect(ruleId("p", "electricity", "share")).not.toBe(a);
  });
});

describe("who counts as an adult for prices", () => {
  // Pinned places: 2854920 is in Mississippi (age of majority 21), 1018950 in
  // Delaware (18). The same 19-year-old worker is an adult in one and not in
  // the other, and the voting age plays no part: the reader takes no
  // parameters, so a law lowering the voting age leaves prices alone.
  const at = (placeId: string) => {
    const state = {
      date: "2026-06-01",
      people: new Map([
        ["p1", { birthDate: "2007-01-01", placeId, jobId: "j1" }],
        ["p2", { birthDate: "1980-01-01", placeId }],
      ]),
      jobs: new Map([["j1", { endsAt: undefined }]]),
    } as unknown as CoreState;
    return householdComposition(state, ["p1", "p2"]);
  };
  it("reads each place's age of majority", () => {
    expect(ageOfMajority("2854920")).toBe(21);
    expect(ageOfMajority("1018950")).toBe(18);
  });
  it("counts a 19-year-old as an adult where majority is 18 and not where it is 21", () => {
    expect(at("1018950")).toEqual({ persons: 2, adults: 2, workers: 1 });
    expect(at("2854920")).toEqual({ persons: 2, adults: 1, workers: 1 });
  });
  it("is read from no parameter, so the voting age cannot move it", () => {
    expect(householdComposition.length).toBe(2);
  });
});
