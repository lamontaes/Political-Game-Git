/**
 * A seller's capacity comes from its own books (lift the pins, family 26c):
 * what it is projected to sell, or its best recent month if that was more. No
 * industry utilization rate sets it.
 */
import { expect, it } from "vitest";
import { sellerCapacityMinor } from "./modules/residents";

it("a new seller serves its projected month, and a busy one its best month", () => {
  expect(sellerCapacityMinor(1_000_000)).toBe(1_000_000);
  expect(sellerCapacityMinor(1_000_000, [900_000, 800_000])).toBe(1_000_000);
  expect(sellerCapacityMinor(1_000_000, [900_000, 1_400_000])).toBe(1_400_000);
});
