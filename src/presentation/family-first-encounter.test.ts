import { describe, expect, it } from "vitest";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { buildLifeIntroduction } from "./life-introduction";
import { firstUnintroducedFamilyMember } from "./family-first-encounter";

function life(age: number) {
  const setup: NewGameSetup = {
    placeKey: "kentucky",
    startAge: age,
    depth: age < 18 ? "play-formative-years" : "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: `first-family-card-${age}`,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  };
  return createNewGameWorld(setup);
}

describe("first family introduction", () => {
  it("opens for a recorded parent in the room once, without inventing another person", () => {
    const { world, playerPersonId } = life(10);
    const family = buildLifeIntroduction(world, playerPersonId)!.household;
    const parent = family.find((person) =>
      ["your mom", "your dad", "your parent", "your guardian"].includes(
        person.relationship ?? "",
      ),
    );
    expect(parent).toBeDefined();
    const present = family.map((person) => ({
      personId: person.personId,
      relationship: person.relationship,
    }));
    const first = firstUnintroducedFamilyMember(
      world,
      playerPersonId,
      present,
      [],
    );
    expect(first).toBe(parent!.personId);
    expect(
      firstUnintroducedFamilyMember(world, playerPersonId, present, [first!]),
    ).not.toBe(first);
    expect(
      firstUnintroducedFamilyMember(world, playerPersonId, [], []),
    ).toBeNull();
    expect(
      firstUnintroducedFamilyMember(world, playerPersonId, present, null),
    ).toBeNull();
  });

  it("does not introduce an adult's familiar household as a new child's family", () => {
    const { world, playerPersonId } = life(34);
    const present = buildLifeIntroduction(world, playerPersonId)!.household.map(
      (person) => ({
        personId: person.personId,
        relationship: person.relationship,
      }),
    );
    expect(
      firstUnintroducedFamilyMember(world, playerPersonId, present, []),
    ).toBeNull();
  });
});
