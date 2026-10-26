import { describe, expect, it } from "vitest";
import { endpointOf, ENDPOINT_CLASSES } from "./scene-endpoint";

describe("what a scene is for", () => {
  it("gives bills, votes and notices their endpoint", () => {
    expect(endpointOf({ kind: "legislation" })).toBe("bill");
    expect(endpointOf({ kind: "minutes" })).toBe("bill");
    expect(
      endpointOf({ kind: "notices", context: "A hearing notice for 2026-1" }),
    ).toBe("bill");
    expect(
      endpointOf({
        kind: "notices",
        context: "The notice of the 2028 election in Bowers",
      }),
    ).toBe("political-life");
    expect(endpointOf({ kind: "campaign" })).toBe("political-life");
  });

  it("makes a family talk personal, or money when the household's money opened it", () => {
    expect(
      endpointOf({ kind: "family", topic: "kin:person_1", kin: true }),
    ).toBe("personal");
    expect(
      endpointOf({
        kind: "family",
        topic: "kin:person_1",
        occasion: "money:job-ended",
        kin: true,
      }),
    ).toBe("money");
  });

  it("gives a talk with no topic and a talk about work between relatives no political endpoint", () => {
    expect(endpointOf({ kind: "conversation" })).toBeNull();
    expect(
      endpointOf({ kind: "conversation", topic: "their-work:p1", kin: true }),
    ).toBe("personal");
    expect(
      endpointOf({ kind: "conversation", topic: "their-work:p1", kin: false }),
    ).toBe("political-life");
  });

  it("describes every class it can return", () => {
    for (const kind of ["legislation", "campaign", "journal"]) {
      const found = endpointOf({ kind });
      expect(ENDPOINT_CLASSES[found!]).toMatch(/\.$/);
    }
  });
});
