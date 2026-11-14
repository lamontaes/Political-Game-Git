import { describe, expect, it } from "vitest";
import { minutesOf } from "./meeting-minutes";

// A meeting's minutes, worded from the pieces in data/english/parts/minutes.json.
describe("a meeting's minutes", () => {
  it("says the manager turned next only when the record says the manager ran the meeting", () => {
    const items = (ranBy: string | null) => [
      { topic: "a higher minimum wage", against: ["Pat Lee", "Sam Ortiz"] },
      { topic: "the town's budget", against: [], ranBy },
    ];
    expect(minutesOf(items("manager"))).toEqual([
      "Participants discussed a higher minimum wage.",
      "Voting against this action: Pat Lee and Sam Ortiz.",
      "The manager turned next to the town's budget.",
    ]);
    const chaired = minutesOf(items("chair"));
    expect(chaired.some((line) => line.includes("manager"))).toBe(false);
    expect(minutesOf(items(null)).length).toBe(2);
  });

  it("names a council as the one that discussed, never 'Participants'", () => {
    expect(
      minutesOf([{ topic: "paid sick leave", against: [], body: "council" }]),
    ).toEqual(["The council discussed paid sick leave."]);
  });

  it("joins three names with the bank's joiner and says nothing about a vote nobody opposed", () => {
    const lines = minutesOf([
      { topic: "paid sick leave", against: ["Ann Cho", "Ben Ruiz", "Cy Day"] },
    ]);
    expect(lines).toContain(
      "Voting against this action: Ann Cho, Ben Ruiz, and Cy Day.",
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
