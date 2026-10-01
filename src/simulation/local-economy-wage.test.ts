import { describe, expect, it } from "vitest";

import {
  LOCAL_BUSINESS_KINDS,
  LOCAL_BUSINESS_PLACEHOLDER,
  localBusinessWageMinor,
} from "./local-economy";
import { lifePlaceByKey } from "./life-places";

describe("what a local business pays its staff", () => {
  it("is the published wage for the worker's occupation where the town is", () => {
    const town = lifePlaceByKey("3260600")!.context.jurisdiction.id;
    for (const kind of LOCAL_BUSINESS_KINDS) {
      const wage = localBusinessWageMinor(kind, town);
      expect(wage.sourced).toBe(true);
      expect(wage.monthlyMinor).toBeGreaterThan(0);
    }
  });

  it("says so when no wage is published, and uses the marked placeholder", () => {
    const wage = localBusinessWageMinor(LOCAL_BUSINESS_KINDS[0]!, null);
    expect(wage.sourced).toBe(false);
    expect(wage.monthlyMinor).toBe(LOCAL_BUSINESS_PLACEHOLDER.monthlyWageMinor);
  });
});
