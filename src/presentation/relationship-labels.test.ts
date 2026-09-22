import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation/life-places";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectPeopleDirectory } from "./people-directory";

/*
 * People are named from the player's side, as a noun a person would use:
 * "Dean Campos, your housemate", never "Dean Campos, who you live with". The
 * teacher case is the one that went wrong in play: the record sorts its two
 * ids, so a 64-year-old teacher came out as "a former student of yours"
 * whenever the teacher's id happened to sort first.
 */
describe("who somebody is, said from your side", () => {
  it.each([
    ["Reno", "continuation-kin-a"],
    ["Bozeman", "labels-bozeman"],
    ["Burlington", "labels-vt"],
  ])(
    "in %s",
    (town, seed) => {
      const place = searchLifePlaces(town, 3)[0]!;
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey: place.key,
          seed,
          startAge: 34,
        }),
      ).game!;
      const { world, playerPersonId: me } = game;
      const people = projectPeopleDirectory(world, me).people;
      for (const person of people) {
        if (person.relationship === null) continue;
        expect(person.relationship).toMatch(
          /^(your |someone |a former |from )/,
        );
      }
      let teachers = 0;
      for (const interaction of world.history.relationshipInteractions) {
        if (interaction.kind !== "mentorship:guidance") continue;
        if (!interaction.personIds.includes(me)) continue;
        const other = interaction.personIds.find((id) => id !== me)!;
        expect(
          world.people[other]!.birthDate < world.people[me]!.birthDate,
        ).toBe(true);
        teachers += 1;
        expect(people.find((p) => p.personId === other)?.relationship).toBe(
          "your former teacher",
        );
      }
      expect(teachers).toBe(1);
    },
    120_000,
  );
});
