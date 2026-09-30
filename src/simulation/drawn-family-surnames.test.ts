import { describe, expect, it } from "vitest";
import { adultLifeIn } from "../../tests/fixtures/state-executive-entry";

describe("a drawn family's grandparents", () => {
  it.each(["ME", "AZ", "GA"])(
    "share a surname as couples, and one side carries the family name (%s)",
    (usps) => {
      const { world, personId } = adultLifeIn(usps, `surnames-${usps}`);
      const player = world.people[personId]!;
      // Kinship rows don't order their people, so the grandparent is simply
      // the other person on the player's grandparent row.
      const grandparents = world.history.kinshipRelationships
        .filter(
          (row) =>
            row.kind === "lineal:grandparent-grandchild" &&
            row.personIds.includes(personId),
        )
        .map((row) => row.personIds.find((id) => id !== personId)!)
        .map((id) => world.people[id]!);
      expect(grandparents.length).toBeGreaterThanOrEqual(2);
      const bySurname = new Map<string, number>();
      for (const person of grandparents)
        bySurname.set(
          person.familyName,
          (bySurname.get(person.familyName) ?? 0) + 1,
        );
      // Each side is a couple sharing the surname their child was born with.
      for (const count of bySurname.values()) expect(count % 2).toBe(0);
      // One side passed the family name down to the player.
      expect(bySurname.has(player.familyName)).toBe(true);
    },
  );
});
