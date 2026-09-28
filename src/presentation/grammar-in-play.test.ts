import { describe, expect, it } from "vitest";

import { personPronouns } from "../simulation/person-identity";
import { createNewGameWorld } from "./new-game";
import { projectPersonDossier } from "./person-dossier";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { recordLineInSecondPerson } from "./scene-conversation";

describe("the grammar layer where the player reads it", () => {
  it(
    "names a relative with that person's own pronouns on their card",
    { timeout: 300_000 },
    () => {
      // A parent with a kinship record; a guardian has none to name.
      let found:
        | {
            world: ReturnType<typeof createNewGameWorld>["world"];
            playerPersonId: string;
            parent: { personId: string; relationship?: string | null };
          }
        | undefined;
      for (const seed of [
        "grammar-card-a",
        "grammar-card-b",
        "grammar-card-c",
        "grammar-card-d",
        "grammar-card-e",
      ]) {
        const game = createNewGameWorld({
          startKind: "custom",
          seed,
          placeKey: "lexington-fayette",
          startAge: 10,
          depth: "play-formative-years",
          startingLife: "ordinary-life",
          household: "shares-a-home",
          givenName: null,
          familyName: null,
          questionnaire: "skipped",
        } as never);
        const parent = resolveOpeningPlaySceneContext(
          game.world,
          game.playerPersonId,
        ).presentPeople.find((person) =>
          /^your (mom|dad|parent)$/.test(person.relationship ?? ""),
        );
        if (parent) {
          found = {
            world: game.world,
            playerPersonId: game.playerPersonId,
            parent,
          };
          break;
        }
      }
      expect(found).toBeDefined();
      const { world, playerPersonId, parent } = found!;
      const card = projectPersonDossier(world, playerPersonId, parent.personId);
      const set = personPronouns(world.people[parent.personId]);
      const expected = `${set.subject.charAt(0).toUpperCase()}${set.subject.slice(1)} ${set.pluralVerb ? "are" : "is"} ${parent.relationship}.`;
      expect(card.details.map((detail) => detail.text)).toContain(expected);
    },
  );

  it("recalls what the player said in the player's own voice", () => {
    expect(
      recordLineInSecondPerson("The player said they would go to the meeting."),
    ).toBe("You said you would go to the meeting.");
    expect(
      recordLineInSecondPerson("The player promised they would call back."),
    ).toBe("You promised you would call back.");
    // A "they" about somebody else stays theirs.
    expect(
      recordLineInSecondPerson("The player asked whether they would come."),
    ).toBe("You asked whether they would come.");
  });
});
