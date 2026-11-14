import { describe, expect, it } from "vitest";
import controls from "./data/controls.json" with { type: "json" };
import { actionNames } from "./words";

// The acts the journal of acts and a place's reasons name (play-stopgap-controls-text).
const ACTS = [
  "work-shift",
  "rest",
  "contact-known-person",
  "care-for-relative",
  "join-association",
  "organize-meeting",
  "approach-office",
  "look-up-local-institution",
  "office-hours",
  "town-hall",
  "interview",
  "meet-department-head",
  "name-department-head",
  "talk-to-colleague",
  "cut-ribbon",
  "vote",
  "sign",
  "veto",
  "case",
  "speak",
  "state-of-the-city",
];

describe("an act's name comes from the English bank", () => {
  it("the bench's control table has no acts table", () => {
    expect(Object.keys(controls)).not.toContain("actions");
  });

  it("names every act in short, slot-free words with no id", () => {
    const names = actionNames();
    for (const act of ACTS) {
      const name = names[act];
      expect(name, act).toBeTruthy();
      expect(name, act).not.toMatch(/[{}]|\.$|-/);
      expect(name!.split(" ").length, act).toBeLessThanOrEqual(6);
    }
  });
});
