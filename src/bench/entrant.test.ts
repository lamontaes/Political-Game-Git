import { describe, expect, it } from "vitest";
import { entrantOf } from "./world";
import entryTable from "./data/entry.json" with { type: "json" };
import type { PersonInput } from "../core2/types";

// Edge fixtures for the pick only; the played-world test (check J) proves it
// on generated towns.
const person = (id: string, birthDate: string, placeId = "town") =>
  ({ id, birthDate, placeId }) as unknown as PersonInput;
const opening = "2026-10-12";

describe("the player is the resident about to turn 18 (PW-6)", () => {
  it("picks the soonest 18th birthday after the opening, never someone already 18", () => {
    const pick = entrantOf(
      {
        startedAt: opening,
        people: [
          person("already-18", "2008-10-01"),
          person("turns-18-on-opening-day", "2008-10-12"),
          person("in-forty-days", "2008-11-21"),
          person("in-ten-days", "2008-10-22"),
          person("elsewhere", "2008-10-13", "other-town"),
        ],
      },
      "town",
    );
    expect(pick).toMatchObject({
      personId: "in-ten-days",
      turns18At: "2026-10-22",
      daysToBirthday: 10,
      windowDays: entryTable.parameters.entryWindowDays.value,
      basis: "within-window",
    });
  });

  it("says so when the soonest birthday is outside the window", () => {
    const pick = entrantOf(
      { startedAt: opening, people: [person("in-spring", "2009-04-01")] },
      "town",
    );
    expect(pick.personId).toBe("in-spring");
    expect(pick.basis).toBe("soonest-outside-window");
  });
});
