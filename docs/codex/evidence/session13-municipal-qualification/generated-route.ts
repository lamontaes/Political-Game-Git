import { createScenarioWorld } from "../../../../src/simulation/demo.ts";
import { drawRandomPlace } from "../../../../tests/support/random-place.ts";
import { searchLifePlaces } from "../../../../src/simulation/life-places.ts";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../../../src/presentation/opening-life.ts";
import { DEFAULT_NEW_GAME_SETUP } from "../../../../src/presentation/new-game.ts";
import { openOrdinaryLife } from "../../../../src/presentation/ordinary-life.ts";
import { projectCampaignOffices } from "../../../../src/presentation/campaign-office-discovery.ts";
void createScenarioWorld;
const seed = "session13-municipal-estimate-random-town";
const places = [
  searchLifePlaces("East Providence", 100).find((p) =>
    p.displayName.includes("East Providence"),
  )!,
  drawRandomPlace(seed),
];
for (const place of places) {
  if (!place) throw Error("Named place missing");
  const setup = prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed:
      place.key === places[0]!.key
        ? "session13-east-providence-estimate"
        : seed,
    placeKey: place.key,
    startAge: 34,
    questionnaire: "skipped",
  });
  const generated = generateOpeningLife(setup).game!;
  const world = openOrdinaryLife(generated.world, generated.playerPersonId);
  console.log(
    JSON.stringify(
      {
        seed: setup.setup.seed,
        place: place.displayName,
        key: place.key,
        world: world.id,
        player: generated.playerPersonId,
        date: world.currentDate,
        offices: projectCampaignOffices(world, generated.playerPersonId),
      },
      null,
      2,
    ),
  );
}
