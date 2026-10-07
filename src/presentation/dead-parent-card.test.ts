import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP, otherParentQuestionApplies } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectPersonContact } from "./person-contact";

/**
 * Ketchikan (main 22b4f13e, 2026-09-23): a five-year-old's late father,
 * marked "No longer living", still offered Talk and Meet. A life that opens
 * with a parent already dead is the game's own opening, not a fixture.
 */
describe("a person who has died is not somebody to reach", () => {
  for (const [town, placeKey] of [
    ["Houma, Louisiana", "2236255"],
    ["Providence, Rhode Island", "4459000"],
  ] as const) {
    it(`${town}: every action on the card is closed, and says why`, () => {
      // The parent's death is the player's answer (A148): the first seed
      // whose family has one parent at home, told the other has died.
      const setup = Array.from({ length: 40 }, (_, index) => ({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        seed: `dead:${index}`,
        startAge: 5,
      })).find((candidate) => otherParentQuestionApplies(candidate))!;
      const game = generateOpeningLife(
        prepareOpeningLife({ ...setup, otherParent: "deceased" }),
      ).game!;
      const world = game.world;
      const dead = world.history.personDeaths.filter(
        (death) => death.diedAt <= world.currentDate,
      );
      expect(dead.length).toBeGreaterThan(0);
      for (const death of dead) {
        const card = projectPersonContact(
          world,
          game.playerPersonId,
          death.personId,
        );
        for (const action of [
          card.talk,
          card.contact,
          card.meet,
          card.travel,
        ]) {
          expect(action.available).toBe(false);
          expect(action.reason).toMatch(/ has died\.$/);
        }
      }
    }, 300_000);
  }
});
