import { describe, expect, it } from "vitest";
import { actionNames } from "./words";

// Every act the play screen names has its name from the English engine's
// bank (data/english/parts/choice-names.json), not a bench table.
describe("the names of the acts", () => {
  const names = actionNames();
  it.each([
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
    "vote",
    "sign",
    "veto",
    "case",
    "speak",
    "state-of-the-city",
  ])("%s has a short name with no slot or stop left in it", (act) => {
    expect(names[act], act).toBeTruthy();
    expect(names[act], act).not.toMatch(/[{}.!?]/);
  });
});
