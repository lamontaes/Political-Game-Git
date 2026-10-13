import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { advanceCore, createLifeCore } from "./life";
import { fillInIdentity } from "./state";

describe("fill-in from a recorded identity (officials)", () => {
  it("builds a full person once, with party and seat on the record", () => {
    const core = createLifeCore(piecesInput());
    const identity = {
      id: "official:governor",
      givenName: "Dana",
      familyName: "Reyes",
      birthDate: "1968-04-02",
      placeId: "state",
      party: "Independent",
      seatKey: "office:state:governor",
      source: piecesSource,
    };
    const person = fillInIdentity(core, identity);
    expect(person.givenName).toBe("Dana");
    expect(core.households.get(person.householdId)!.memberIds).toEqual([
      identity.id,
    ]);
    expect(person.pastFacts?.map((fact) => fact.kind)).toEqual([
      "identity:party",
      "identity:seat",
    ]);
    expect(fillInIdentity(core, identity)).toBe(person);
    // Traits come from the seeded temperament model: filled, and the same
    // person in a fresh world with the same seed.
    expect(Object.keys(person.traits).length).toBeGreaterThan(0);
    expect(
      fillInIdentity(createLifeCore(piecesInput()), identity).traits,
    ).toEqual(person.traits);
    expect(() => advanceCore(core, "2026-03-01")).not.toThrow();
  });
});
