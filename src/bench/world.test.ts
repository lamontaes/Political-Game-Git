import { describe, expect, it } from "vitest";
import { entrantOf } from "./world";
import type { CoreInput } from "../core2/types";

const place = "place:entrant-fixture";
function opening(births: Record<string, string>): CoreInput {
  return {
    startedAt: "2026-10-12",
    people: Object.entries(births).map(([id, birthDate]) => ({
      id,
      placeId: place,
      birthDate,
    })),
  } as unknown as CoreInput;
}

describe("the bench player", () => {
  it("is the 17-year-old whose 18th birthday comes soonest, so turning 18 happens in play", () => {
    const input = opening({
      "turned-18-in-may": "2008-05-01",
      "turned-18-yesterday": "2008-10-11",
      "turns-18-in-march": "2009-03-01",
      "turns-18-in-three-days": "2008-10-15",
      "turns-17-tomorrow": "2009-10-13",
    });
    expect(entrantOf(input, place)).toBe("turns-18-in-three-days");
  });
  it("is the most recent 18-year-old where nobody here is 17", () => {
    const input = opening({
      "turned-18-in-may": "2008-05-01",
      "turned-18-yesterday": "2008-10-11",
      nineteen: "2007-01-01",
    });
    expect(entrantOf(input, place)).toBe("turned-18-yesterday");
  });
});
