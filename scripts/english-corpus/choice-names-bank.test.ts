import { describe, expect, it } from "vitest";
import {
  CHOICE_NAMES_BANK,
  benchControlNames,
  stanceWords,
} from "./choice-names-bank";

/**
 * The decision bench's button names from the mined choice-names bank: each is
 * a mined sentence without its period, the same every time, and a name that
 * needs a target keeps its slot apart from the plain names.
 */
const mined = new Set(
  CHOICE_NAMES_BANK.parts.map((part) => part.text.replace(/\.$/, "")),
);

describe("the bench's choice names", () => {
  const names = benchControlNames();

  it("names the core actions the bench shows", () => {
    for (const action of ["work-shift", "rest"])
      expect(names.actions[action], action).toBeTruthy();
    expect(names.actionTemplates["contact-known-person"]).toMatch(/\{name\}/);
  });

  it("uses only mined sentences, without slots in plain names", () => {
    for (const text of Object.values(names.actions)) {
      expect(mined.has(text), text).toBe(true);
      expect(text).not.toMatch(/[{}.]$|\{/);
    }
    for (const text of Object.values(names.actionTemplates))
      expect(mined.has(text), text).toBe(true);
  });

  it("keeps a bench name that is also mined", () => {
    const kept = benchControlNames({
      "work-shift": "Go to work",
      rest: "Rest",
    });
    expect(kept.actions["work-shift"]).toBe("Go to work");
    expect(kept.actions.rest).toBe("Rest");
  });

  it("is the same every time", () => {
    expect(benchControlNames()).toEqual(names);
  });

  it("keeps stance questions and answers out of the buttons", () => {
    const stance = stanceWords();
    expect(stance.questions.length).toBeGreaterThan(0);
    expect(stance.answers.length).toBeGreaterThan(0);
    expect(names.actions["stance-question"]).toBeUndefined();
  });
});
