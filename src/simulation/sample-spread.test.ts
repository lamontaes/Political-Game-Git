import { describe, expect, it } from "vitest";
import { spreadOf } from "./sample-spread";

describe("existing population spread arithmetic", () => {
  it("returns the mean and population spread of the supplied game values", () => {
    expect(spreadOf([2, 4, 6])).toEqual({
      mean: 4,
      standardDeviation: Math.sqrt(8 / 3),
      count: 3,
    });
  });

  it("preserves an actual zero and a singleton observation", () => {
    expect(spreadOf([0])).toEqual({ mean: 0, standardDeviation: 0, count: 1 });
    expect(spreadOf([-3, 3])).toEqual({
      mean: 0,
      standardDeviation: 3,
      count: 2,
    });
  });

  it("does not depend on donor ordering", () => {
    expect(spreadOf([8, 4, 0])).toEqual(spreadOf([0, 8, 4]));
  });

  it("keeps the existing empty-input behavior rather than inventing zero", () => {
    const empty = spreadOf([]);
    expect(empty.count).toBe(0);
    expect(empty.mean).toBeNaN();
    expect(empty.standardDeviation).toBeNaN();
  });
});
