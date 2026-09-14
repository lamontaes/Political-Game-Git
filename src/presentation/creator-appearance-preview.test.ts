import { describe, expect, it } from "vitest";
import { prospectiveCreatorPerson } from "./creator-appearance-preview";
import type { NewGameSetup } from "./new-game";

const setup: NewGameSetup = {
  placeKey: "lexington-fayette",
  startAge: 34,
  depth: "summarize-earlier-life",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  seed: "ux39-appearance",
  givenName: "Maya",
  familyName: "Calhoun",
  gender: "female",
};

describe("creator appearance preview", () => {
  it("builds a prospective person without a World and keeps identity stable", () => {
    const first = prospectiveCreatorPerson(setup);
    const second = prospectiveCreatorPerson(setup);
    expect(first).not.toBeNull();
    expect(second?.id).toBe(first?.id);
    expect(first?.givenName).toBe("Maya");
  });
});
