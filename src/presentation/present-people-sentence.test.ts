import { describe, expect, it } from "vitest";

import { presentPeopleSentence, type ScenePerson } from "./life-story";
import { createStableId } from "../simulation";

/**
 * The line under the scene that says who is in the room.
 *
 * It joined introductions and then ran straight on into "is here", so a person
 * whose introduction carries a relation — an appositive — arrived on screen as
 * "Phoebe Akhtar, who is in your class is here", which reads as one long noun
 * rather than a sentence about somebody.
 */

function person(name: string, relationship: string | null): ScenePerson {
  return {
    personId: createStableId("person", name),
    name,
    relationship,
    introduction: relationship === null ? name : `${name}, ${relationship}`,
  };
}

describe("who is in the room, as a sentence", () => {
  it("closes the appositive before going on", () => {
    expect(
      presentPeopleSentence([person("Phoebe Akhtar", "who is in your class")]),
    ).toBe("Phoebe Akhtar, who is in your class, is here.");
  });

  it("leaves a bare name alone", () => {
    expect(presentPeopleSentence([person("Phoebe Akhtar", null)])).toBe(
      "Phoebe Akhtar is here.",
    );
  });

  it("closes both of them, and agrees the verb", () => {
    expect(
      presentPeopleSentence([
        person("Maya Pittman", "your mom"),
        person("Phoebe Akhtar", "who is in your class"),
      ]),
    ).toBe(
      "Maya Pittman, your mom, and Phoebe Akhtar, who is in your class, are here.",
    );
  });

  it("handles a room where only one of them is known", () => {
    expect(
      presentPeopleSentence([
        person("Maya Pittman", "your mom"),
        person("Phoebe Akhtar", null),
      ]),
    ).toBe("Maya Pittman, your mom, and Phoebe Akhtar are here.");
  });

  it("says nothing about an empty room", () => {
    expect(presentPeopleSentence([])).toBeNull();
  });
});
