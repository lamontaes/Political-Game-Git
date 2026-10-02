import { expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  TYPED_TAX_QUESTION_KEYS,
  typedTaxQuestionRow,
} from "../law-consequences/typed-tax-question-data";

it("opens one new game in a random place with the retired-module row", () => {
  const openingSeed = "a17-existing-row-new-game";
  const place = drawRandomPlace(openingSeed);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed: openingSeed,
  });
  expect(game.world.people[game.playerPersonId]).toBeDefined();
  const questions = Object.values(game.world.policyCatalog.propositions);
  for (const key of TYPED_TAX_QUESTION_KEYS) {
    const question = questions.find((row) => row.stableKey === key);
    expect(question).toBeDefined();
    expect(question!.consequences).toContainEqual(
      typedTaxQuestionRow(
        key === TYPED_TAX_QUESTION_KEYS[0] ? "tax:state:excise" : key,
      ),
    );
  }
  const bytes = serializeWorld(game.world);
  const loaded = deserializeWorld(bytes);
  expect(loaded.people[game.playerPersonId]).toEqual(
    game.world.people[game.playerPersonId],
  );
  expect(loaded.history.taxCollections ?? []).toEqual(
    game.world.history.taxCollections ?? [],
  );
  console.info(
    "A17_NEW_GAME",
    JSON.stringify({
      seed: openingSeed,
      place: place.key,
      jurisdiction: place.stateJurisdictionKey,
      playerId: game.playerPersonId,
    }),
  );
});
