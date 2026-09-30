import { expect, it } from "vitest";
import { shapedLinkFactor } from "./outcome-web";
it("uses relative exposure change in either direction, independent of measurement scale", () => {
  const l = { shape: { kind: "elasticity" as const }, size: -0.34 };
  expect(shapedLinkFactor(l, 2.2, 2)).toBeCloseTo(0.966);
  expect(shapedLinkFactor(l, 220, 200)).toBeCloseTo(0.966);
  expect(shapedLinkFactor(l, 1.8, 2)).toBeCloseTo(1.034);
  expect(shapedLinkFactor(l, 2, 2)).toBe(1);
});
it("does not manufacture a relative exposure for zero, negative or nonfinite baseline", () => {
  for (const b of [0, -1, NaN, Infinity])
    expect(
      shapedLinkFactor({ shape: { kind: "elasticity" }, size: -0.34 }, 2, b),
    ).toBe(1);
});
it("keeps absolute linear effects distinct from elasticities", () => {
  expect(
    shapedLinkFactor({ shape: { kind: "linear" }, size: -0.34 }, 2.2, 2),
  ).toBeCloseTo(0.932);
});
