import { describe, expect, it } from "vitest";
import { minutesOf } from "./meeting-minutes";

// A meeting's minutes, worded from the pieces the owner graded good
// (data/english/parts/minutes.json): what it took up in order and who voted
// against each action.
describe("a meeting's minutes", () => {
  it("says what was discussed first, what the manager turned to next, and who voted against", () => {
    expect(
      minutesOf([
        { topic: "a higher minimum wage", against: ["Pat Lee", "Sam Ortiz"] },
        { topic: "the town's budget", against: [] },
      ]),
    ).toEqual([
      "Participants discussed a higher minimum wage.",
      "Voting against this action: Pat Lee and Sam Ortiz.",
      "The manager turned next to the town's budget.",
    ]);
  });

  it("names three members with commas and says nothing about a vote nobody opposed", () => {
    const lines = minutesOf([
      { topic: "paid sick leave", against: ["Ann Cho", "Ben Ruiz", "Cy Day"] },
    ]);
    expect(lines).toContain(
      "Voting against this action: Ann Cho, Ben Ruiz and Cy Day.",
    );
    expect(
      minutesOf([{ topic: "paid sick leave", against: [] }]).some((line) =>
        line.startsWith("Voting against"),
      ),
    ).toBe(false);
  });

  it("gives nothing for a meeting that took nothing up", () => {
    expect(minutesOf([])).toEqual([]);
  });
});
