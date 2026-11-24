import { expect, it } from "vitest";
import { wordPrintedStory } from "../bench/archive-words";
import { ballot } from "./modules/elections";
import { coreAPI } from "./state";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { playTownRace } from "./campaign-race-test-kit";
import { gameStartDate } from "./game-start";

// A town race's result is news to everyone who could vote in it, so the
// town's paper prints it the week of the count, naming the winner, though
// the same week holds the council's votes and laws taking effect. Pinned to
// the draw where the paper printed none of 754 stories about the race:
// Searsboro, Iowa, drawn by concession-reported's purpose with seed
// de4ef0f8ff6efdfb:agree:15.
const DRAW = "de4ef0f8ff6efdfb:agree:15";

/** A bench world on concession-reported's draw, as the race kit plays it. */
function townWorld(draw: string) {
  const place = drawPlace(draw, "concession-reported");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return { core, where: `${place.name} (${place.key}), seed ${draw}` };
}

it(`the town's paper prints its own race's result, naming the winner (${DRAW})`, () => {
  const world = townWorld(DRAW);
  const { core, where, race, winnerId, printed } = playTownRace(
    world.core,
    world.where,
    10,
  );
  expect(race, `${where}: a town race on the calendar`).toBeTruthy();
  expect(ballot(coreAPI(core), race!.id).length, where).toBeGreaterThanOrEqual(
    2,
  );
  expect(winnerId, `${where}: ${race!.id} has a winner`).toBeTruthy();
  // One story a race: an at-large race's story may come from any of its
  // seats' records, each of which carries the race's id.
  const story = printed.find(
    (s) =>
      s.id.startsWith("printed:outlet:newspaper:") &&
      (s.facts.sourceRecordId === `election-result:${race!.id}` ||
        s.facts.race === race!.id),
  );
  expect(
    story,
    `${where}: the paper printed ${race!.id} among its ${printed.length} stories after the count`,
  ).toBeTruthy();
  const words = wordPrintedStory(core, story!);
  const winner = core.people.get(winnerId!)!;
  const told = [words?.headline, ...(words?.paragraphs ?? [words?.lede])].join(
    " ",
  );
  expect(told, `${where}: ${story!.id}`).toContain(
    `${winner.givenName} ${winner.familyName}`,
  );
}, 300_000);
