import staging from "../../art/backdrops/staging.json";
import { peopleAtWorkAt } from "../simulation/living-world/work-schedules";
import { playerTown } from "../simulation/living-world/town-residents";
import { personName } from "../simulation/people";
import type { EntityId, SimulationMoment, World } from "../simulation/types";
import type { EngineRecipe } from "./appearance-engine/pack";
import { engineRecipeFor } from "./appearance-engine/recipe";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import { placeWear } from "./dress-code";
import { workUniform } from "./work-uniform";

/**
 * PEOPLE AT WORK IN A PLACE PICTURE.
 *
 * A place picture (place-backdrops.ts) has no registered anchors, so until
 * now nobody stood in it: the clerk's counter, the diner and the hospital
 * hallway were always empty. `art/backdrops/staging.json` marks where people
 * can stand in the places people work, and how tall a person is on each
 * floor line (their distance below the horizon sets the scale). The people
 * drawn are the ones actually on shift there in the player's town at this
 * moment (work-schedules.ts `peopleAtWorkAt`), dressed for the place and in
 * their uniform if their job has one. Off hours, the place is empty.
 *
 * Positions are percentages of the picture itself; the screen maps them onto
 * the picture as it is cropped to fill the view.
 */

/** A person standing in a place picture, in percent of the picture. */
export interface BackdropPerson {
  readonly personId: EntityId;
  readonly name: string;
  readonly title: string;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
  /** Behind a counter or podium: nothing below this line shows. */
  readonly clipBelowPercent: number | null;
  readonly engine: EngineRecipe;
}

interface StagingSpot {
  readonly x: number;
  readonly y: number;
  readonly clipBelowY?: number;
}

interface PlaceStaging {
  readonly horizonY: number;
  readonly metersPercent: number;
  readonly spots: readonly StagingSpot[];
}

const PLACES = staging.places as Readonly<Record<string, PlaceStaging>>;

/**
 * What staff wear at work in each place, where it differs from what a visitor
 * wears there (dress-code.ts is written for visitors): the clerk, the nurses'
 * receptionist and the teacher dress for work, while diner, store, union-hall
 * and community-room staff dress as the place does. A job with a uniform
 * (scrubs, police, a safety vest) wears it on shift wherever it is.
 */
const STAFF_WEAR: Readonly<Record<string, "business" | "casual">> = {
  "clerk-counter": "business",
  "hospital-hallway": "business",
  classroom: "business",
  "church-supper-hall": "business",
  office: "business",
  "county-party-office": "business",
  "campaign-storefront": "business",
};

/** Jobs done from behind a counter or desk. */
const COUNTER_TITLE = /clerk|receptionist|cashier|secretary|office assistant/i;

/** The place pictures are all 1672 x 941. */
export const BACKDROP_ASPECT = 1672 / 941;
/** The pictures are cropped to fill the view, anchored this far down. */
export const BACKDROP_FOCUS_Y = 0.62;
/** An adult's height in meters, for sizing on the floor line. */
const STANDING_METERS = 1.7;
/** Engine figures are about 2.55 times as tall as they are wide. */
const FIGURE_HEIGHT_TO_WIDTH = 2.55;

export function backdropStaging(place: string): PlaceStaging | null {
  return PLACES[place] ?? null;
}

/**
 * The people on shift at `place` in the player's town, standing at its
 * marked spots, nearest spot first. More workers than spots: the rest are
 * out of view.
 */
export function placeBackdropPeople(
  world: World,
  playerId: EntityId,
  place: string,
  moment: SimulationMoment = world.currentMoment,
): readonly BackdropPerson[] {
  const stage = backdropStaging(place);
  if (!stage) return [];
  const town = playerTown(world, playerId);
  if (!town) return [];
  const wear = STAFF_WEAR[place] ?? placeWear(place, world.currentDate);
  const workers = peopleAtWorkAt(world, town, place, moment).filter(
    (worker) => worker.personId !== playerId,
  );
  // Counter jobs take the spots behind a counter first; everyone else the
  // open floor, and whoever is left over takes what remains.
  const counterJob = (title: string) => COUNTER_TITLE.test(title);
  const behind = stage.spots.filter((spot) => spot.clipBelowY !== undefined);
  const open = stage.spots.filter((spot) => spot.clipBelowY === undefined);
  const assigned = [
    ...workers.filter((worker) => counterJob(worker.title)),
    ...workers.filter((worker) => !counterJob(worker.title)),
  ].map((worker) => ({
    worker,
    spot: counterJob(worker.title)
      ? (behind.shift() ?? open.shift())
      : (open.shift() ?? behind.shift()),
  }));
  const placed: BackdropPerson[] = [];
  for (const { worker, spot } of assigned) {
    if (!spot) continue;
    const record = world.people[worker.personId];
    if (!record) continue;
    const engine = engineRecipeFor(record, world.currentDate, PEOPLE_PACK, {
      wear,
      // On shift, a uniformed job wears its uniform (work-uniform.ts reads
      // "business" as dressed for work).
      uniform: workUniform(world, worker.personId, "business"),
    });
    if (!engine) continue;
    const heightPercent =
      STANDING_METERS * stage.metersPercent * (spot.y - stage.horizonY);
    const widthPercent =
      heightPercent / FIGURE_HEIGHT_TO_WIDTH / BACKDROP_ASPECT;
    placed.push({
      personId: worker.personId,
      name: personName(record),
      title: worker.title,
      leftPercent: spot.x - widthPercent / 2,
      topPercent: spot.y - heightPercent,
      widthPercent,
      heightPercent,
      clipBelowPercent: spot.clipBelowY ?? null,
      engine,
    });
  }
  return placed;
}
