import { describe, expect, it } from "vitest";
import { assertFactoryCoreV1, createCore } from "./state";
import type { CoreInput, CoreState } from "./types";

function input(): CoreInput {
  return {
    seed: "controlled-factory-core-identity",
    startedAt: "2021-01-01",
    people: [],
    households: [],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

describe("Part1b exact factory core boundary", () => {
  it("accepts the actual successful core and rejects wrappers without reflection", () => {
    const core = createCore(input());
    expect(() => assertFactoryCoreV1(core)).not.toThrow();
    let reflected = 0;
    const rejectReflection = (): never => {
      reflected++;
      throw new Error("An unowned core wrapper was reflected.");
    };
    const wrapper = new Proxy(core, {
      get: rejectReflection,
      has: rejectReflection,
      getOwnPropertyDescriptor: rejectReflection,
      getPrototypeOf: rejectReflection,
      ownKeys: rejectReflection,
      set: rejectReflection,
      defineProperty: rejectReflection,
    });
    expect(() => assertFactoryCoreV1(wrapper)).toThrow(
      "Part1b requires its actual factory-owned core.",
    );
    expect(reflected).toBe(0);
    expect(() => assertFactoryCoreV1({ ...core })).toThrow(
      "Part1b requires its actual factory-owned core.",
    );
    expect(() => assertFactoryCoreV1(Object.create(core) as CoreState)).toThrow(
      "Part1b requires its actual factory-owned core.",
    );
    expect(() => assertFactoryCoreV1(core)).not.toThrow();
  });
});
