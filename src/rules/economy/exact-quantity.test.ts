import { describe, expect, it } from "vitest";
import * as legacy from "../../simulation/quantity";
import { STATES } from "../../simulation/state-reference";
import { SeededRng } from "../../simulation/rng";
import * as rules from "./exact-quantity";
const places = Object.keys(STATES);
function outcome(run: () => unknown) {
  try {
    return { kind: "returned", value: run() };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { kind: "threw", name: error.name, message: error.message };
  }
}
describe("KEEP exact quantities over all 56 identities", () => {
  it("uses every identity and a seeded random place", () => {
    expect(places).toHaveLength(56);
    expect(places).toContain(
      new SeededRng("rules2-economy-20261011").pick(places),
    );
  });
  for (const [index, place] of places.entries()) {
    const unit = `money:${place.toLowerCase()}`;
    it(`${place}: canonical reduction and invalid inputs match`, () => {
      for (const numerator of [
        0,
        -100,
        index + 1,
        Number.MAX_SAFE_INTEGER,
        0.5,
        Infinity,
      ])
        for (const denominator of [1, 3, 100, 0, -1, 0.5])
          expect(
            outcome(() =>
              rules.createExactQuantity(numerator, denominator, unit),
            ),
          ).toEqual(
            outcome(() =>
              legacy.createExactQuantity(numerator, denominator, unit),
            ),
          );
      expect(
        outcome(() => rules.createExactQuantity(1, 1, "BAD UNIT")),
      ).toEqual(outcome(() => legacy.createExactQuantity(1, 1, "BAD UNIT")));
    });
    it(`${place}: signed addition and comparisons preserve reductions and units`, () => {
      for (const numerator of [-6, 0, index + 1, Number.MAX_SAFE_INTEGER])
        for (const denominator of [1, 2, 3]) {
          const left = legacy.createExactQuantity(numerator, denominator, unit),
            right = legacy.createExactQuantity(index - 27, 7, unit);
          expect(
            outcome(() => rules.compareExactQuantities(left, right)),
          ).toEqual(outcome(() => legacy.compareExactQuantities(left, right)));
          expect(
            outcome(() => rules.combineExactQuantities(left, right, 1)),
          ).toEqual(outcome(() => legacy.addExactQuantities(left, right)));
          expect(
            outcome(() => rules.combineExactQuantities(left, right, -1)),
          ).toEqual(outcome(() => legacy.subtractExactQuantities(left, right)));
        }
      const left = legacy.createExactQuantity(1, 3, unit),
        different = legacy.createExactQuantity(1, 3, "time:hours");
      expect(
        outcome(() => rules.compareExactQuantities(left, different)),
      ).toEqual(outcome(() => legacy.compareExactQuantities(left, different)));
      expect(
        outcome(() => rules.combineExactQuantities(left, different, 1)),
      ).toEqual(outcome(() => legacy.addExactQuantities(left, different)));
    });
    it(`${place}: multiplication, division and exact minor-unit scaling match`, () => {
      for (const numerator of [-6, 0, index + 1, Number.MAX_SAFE_INTEGER])
        for (const denominator of [1, 2, 3]) {
          const value = legacy.createExactQuantity(
            numerator,
            denominator,
            unit,
          );
          for (const ratio of [
            legacy.createExactQuantity(0, 1, "rate:share"),
            legacy.createExactQuantity(1, 2, "rate:share"),
            legacy.createExactQuantity(-2, 3, "rate:share"),
          ]) {
            expect(
              outcome(() => rules.multiplyExactQuantities(value, ratio, unit)),
            ).toEqual(outcome(() => legacy.scaleExactQuantity(value, ratio)));
            expect(
              outcome(() =>
                rules.scaleSafeIntegerByExactShare(numerator, ratio),
              ),
            ).toEqual(
              outcome(() =>
                legacy.scaleSafeIntegerByExactShare(numerator, ratio),
              ),
            );
          }
          for (const divisor of [
            legacy.createExactQuantity(0, 1, unit),
            legacy.createExactQuantity(2, 3, unit),
            legacy.createExactQuantity(-1, 7, unit),
          ])
            expect(
              outcome(() =>
                rules.divideExactQuantities(value, divisor, "rate:share"),
              ),
            ).toEqual(
              outcome(() =>
                legacy.divideExactQuantities(value, divisor, "rate:share"),
              ),
            );
        }
      const value = legacy.createExactQuantity(4, 1, unit),
        wrong = legacy.createExactQuantity(2, 1, "time:hours");
      expect(
        outcome(() => rules.divideExactQuantities(value, wrong, "rate:share")),
      ).toEqual(
        outcome(() => legacy.divideExactQuantities(value, wrong, "rate:share")),
      );
    });
    it(`${place}: unreduced records and intermediate overflow remain errors`, () => {
      const unreduced = {
          numerator: 2,
          denominator: 4,
          unit: legacy.makeQuantityUnitKey(unit),
        },
        canonical = legacy.createExactQuantity(1, 2, unit);
      expect(
        outcome(() => rules.compareExactQuantities(unreduced, canonical)),
      ).toEqual(
        outcome(() => legacy.compareExactQuantities(unreduced, canonical)),
      );
      const high = legacy.createExactQuantity(Number.MAX_SAFE_INTEGER, 1, unit),
        half = legacy.createExactQuantity(Number.MAX_SAFE_INTEGER - 2, 2, unit);
      expect(outcome(() => rules.compareExactQuantities(high, half))).toEqual(
        outcome(() => legacy.compareExactQuantities(high, half)),
      );
      expect(() => rules.compareExactQuantities(high, half)).toThrow(
        "safe integer precision",
      );
    });
  }
});
