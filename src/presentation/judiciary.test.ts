import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import { ensureOpeningJudiciary } from "../simulation/judiciary/opening";
import { projectJudiciary } from "./judiciary";

describe("government judiciary roster", () => {
  it("shows named courts in the selected state and the national Supreme Court without writing", () => {
    const oldSave = createDemoWorld("judiciary-roster");
    expect(projectJudiciary(oldSave, "KY")).toEqual({
      supremeCourt: null,
      federalCourts: [],
      stateCourts: [],
      stateName: null,
    });
    const world = ensureOpeningJudiciary(oldSave);
    const before = JSON.stringify(world);
    const kentucky = projectJudiciary(world, "KY");
    const texas = projectJudiciary(world, "TX");
    expect(kentucky.stateName).toBe("Kentucky");
    expect(
      kentucky.stateCourts.some((court) =>
        court.name.includes("Supreme Court"),
      ),
    ).toBe(true);
    expect(kentucky.supremeCourt?.seatCount).toBe(9);
    expect(
      kentucky.supremeCourt?.holders.filter((holder) => holder.personId),
    ).toHaveLength(8);
    expect(
      kentucky.supremeCourt?.holders.find((holder) => holder.personId)
        ?.startedAt,
    ).toBe(world.currentDate);
    expect(kentucky.federalCourts.length).toBeGreaterThan(100);
    expect(
      kentucky.federalCourts.every((court) => court.holders.length > 0),
    ).toBe(true);
    expect(
      texas.stateCourts.filter((court) =>
        court.courtId.startsWith("us-tx:highest_court"),
      ),
    ).toHaveLength(2);
    expect(JSON.stringify(world)).toBe(before);
  });
});
