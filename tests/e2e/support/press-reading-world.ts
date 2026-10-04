import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../../src/presentation/new-game";
import { projectRoomMedia } from "../../../src/presentation/room-media";
import { mediaOutlets } from "../../../src/simulation/press/outlets";
import { mediaOutletKey } from "../../../src/simulation/press/records";
import {
  assignStory,
  recordStoryLead,
  pressStoryStepHandler,
  PRESS_STORY_STEP_TRANSITION_KEY,
} from "../../../src/simulation/press/desk";
import { storyWorkItem } from "../../../src/simulation/press/story-work";
import { advanceWorldMinutes } from "../../../src/simulation/time-work";
import { drawRandomPlace } from "../../support/random-place";

/** Controlled reporting of actual generated records, through the existing
 * assignment, work and editorial writers. No event/publication is inserted. */
export function createPressReadingWorld(seed: string) {
  const place = drawRandomPlace(seed, (row) => row.scope === "locality");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
    }),
  ).game!;
  let world = game.world;
  const room = projectRoomMedia(world, game.playerPersonId);
  const outletKeys = [room.broadcast?.station.outletKey];
  const outlets = mediaOutlets(world).filter((row) =>
    outletKeys.includes(mediaOutletKey(row.id)),
  );
  const sources = world.history.events.filter(
    (row) =>
      row.type === "local.government-seated" && row.visibility === "public",
  );
  if (outlets.length !== 1 || sources.length < 1)
    throw new Error(
      "Generated room station and seated-government records are required.",
    );
  const leads = outlets.map((outlet, index) => {
    const source = sources[index]!;
    const recorded = recordStoryLead(world, {
      stableKey: `${seed}:reported:${outlet.id}`,
      outletId: outlet.id,
      family: "scheduled-beat",
      route: "public-record",
      basisEventIds: [source.id],
      subjectPersonIds: source.involvedEntityIds.filter(
        (id) => world.people[id],
      ),
      jurisdictionId: source.jurisdictionId,
      matterId: null,
      followsPublicationId: null,
    });
    world = assignStory(recorded.world, recorded.lead.id);
    return recorded.lead;
  });
  const items = leads.map((lead) => storyWorkItem(world, lead.id));
  if (items.some((row) => !row?.effort))
    throw new Error("Actual reporter assignment was not admitted.");
  world = advanceWorldMinutes(
    world,
    Math.max(...items.map((row) => row!.effort!.requiredMinutes)),
  );
  for (const lead of leads) {
    const due = world.history.futureDueItems.find(
      (row) =>
        row.transitionKey === PRESS_STORY_STEP_TRANSITION_KEY &&
        row.stableKey.includes(lead.id),
    );
    if (!due) throw new Error("Saved reporting checkpoint required.");
    const result = pressStoryStepHandler(world, due);
    if (result.reasonKey !== "press:story-published")
      throw new Error(`Canonical editorial result: ${result.reasonKey}`);
    world = result.world;
  }
  return { world, personId: game.playerPersonId, place, seed, leads, sources };
}
