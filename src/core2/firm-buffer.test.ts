/**
 * A firm's buffer comes from its own books (lift the pins, family 26a): one
 * booked month of what it pays out, plus the worst shortfall of costs over
 * sales in its own recent months. No constant month sets it.
 */
import { expect, it } from "vitest";
import { firmBufferMinor } from "./modules/business";

it("a firm keeps back its month's outgo, and more after a thin month", () => {
  const year = 12_000_000;
  const never = firmBufferMinor(year, 12, {
    sales: [900, 950],
    costs: [800, 700],
  });
  const none = firmBufferMinor(year, 12);
  expect(none, "no history: the month's outgo alone").toBe(1_000_000);
  expect(never, "months that always covered themselves add nothing").toBe(none);
  const thin = firmBufferMinor(year, 12, {
    sales: [900_000, 100_000],
    costs: [800_000, 700_000],
  });
  expect(thin, "a month of 600000 short is kept back too").toBe(1_600_000);
  const thinner = firmBufferMinor(year, 12, {
    sales: [900_000, 0],
    costs: [800_000, 700_000],
  });
  expect(thinner).toBeGreaterThan(thin);
});
