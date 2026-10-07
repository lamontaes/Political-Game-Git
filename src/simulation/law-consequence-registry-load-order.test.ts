import { describe, expect, it } from "vitest";
import "./people-traits";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "./law-consequence-registry";

/**
 * A registry built while a module is still loading holds an undefined entry,
 * and the first law dispatch then crashes. Loading the people code first used
 * to do that, because the policy packs pulled in whole handler modules.
 */
describe("the law consequence registry loads whole whatever loads first", () => {
  it("holds no empty registration after the people code loads first", () => {
    expect(LAW_CONSEQUENCE_REGISTRATIONS.every((entry) => entry)).toBe(true);
    expect(LAW_CONSEQUENCE_REGISTRATIONS.map((entry) => entry.kind)).toEqual(
      expect.arrayContaining([
        "public-library-service",
        "snap-participation",
        "curriculum-application",
      ]),
    );
  });
});
