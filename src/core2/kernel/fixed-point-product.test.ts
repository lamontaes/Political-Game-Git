/**
 * A budget line carried forward is last year's cents times its drivers' ratios, rounded once to the nearest cent
 * of the exact result (CTO, #9747 6991875920). Checked against Python's exact fractions for these doubles:
 * 305,461,397,985,352.4967; the floating-point path the engine used before gave 353.
 */
import { expect, it } from "vitest";
import { roundExactProduct } from "./fixed-point";

it("rounds a line times its ratios once, from the exact product", () => {
  const was = 108880157470703;
  const [debt, priorDebt] = [55382480621337890, 31563606262207030];
  const [yieldNow, priorYield] = [0.048348732590675354, 0.030238711833953855];
  expect(
    roundExactProduct(was, [debt, yieldNow], [priorDebt, priorYield]),
  ).toBe(305461397985352);
  // The old floating-point path lands across the half cent.
  expect(Math.round(was * ((debt / priorDebt) * (yieldNow / priorYield)))).toBe(
    305461397985353,
  );
  expect(roundExactProduct(5, [1], [2])).toBe(3);
  expect(roundExactProduct(-5, [1], [2])).toBe(-2);
  expect(roundExactProduct(100, [])).toBe(100);
});
