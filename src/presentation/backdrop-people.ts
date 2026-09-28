import staging from "../../art/backdrops/staging.json";
import { peopleAtWorkAt } from "../simulation/living-world/work-schedules";
import { playerTown } from "../simulation/living-world/town-residents";
import { personName } from "../simulation/people";
import type { EntityId, SimulationMoment, World } from "../simulation/types";
import {
  mirrorToFace,
  type BodyPose,
  type BodyView,
  type EngineRecipe,
} from "./appearance-engine/pack";
import {
  chooseBodyPose,
  type SceneActivity,
} from "./appearance-engine/pose-chooser";
import { engineRecipeFor } from "./appearance-engine/recipe";
import {
  PEOPLE_PACK,
  peoplePackFileAvailable,
} from "./appearance-engine/runtime";
import { placeWear } from "./dress-code";
import { workUniform } from "./work-uniform";

/**
 * PEOPLE AT WORK IN A PLACE PICTURE.
 *
 * `art/backdrops/staging.json` marks, for every place picture, where people
 * can be: spots on the open floor, seats (at a desk, a table, a bench or in
 * the audience), lecterns and podiums, and walls or doorways to lean on. Each
 * spot says how a person there is posed (stand, sit, podium, lean), which way
 * they face, how near they are (depth), and how tall a person is there: the
 * floor's distance below the horizon sets the scale, and a raised floor (a
 * stage, a dais, capitol steps) has a scale of its own. One spot per place is
 * the hero spot, where the main character stands on the title screen. Every
 * light and weather version of a place uses the same spots.
 *
 * The people drawn are the ones actually on shift there in the player's town
 * at this moment (work-schedules.ts `peopleAtWorkAt`), dressed for the place
 * and in their uniform if their job has one. Off hours, the place is empty.
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
  /** Draw order: 0 is farthest; nearer people are drawn over farther ones. */
  readonly depth: number;
  readonly engine: EngineRecipe;
}

/** How a person at a spot is posed. */
export type SpotPose = "stand" | "sit" | "podium" | "lean";
/** Which way a person at a spot faces: the camera, or a side of the picture. */
export type SpotFacing = "viewer" | "left" | "right";

export interface StagingSpot {
  /** The foot point, in percent of the picture (a seated person's too). */
  readonly x: number;
  readonly y: number;
  /** A desk, counter, podium or table front hides everything below this. */
  readonly clipBelowY?: number;
  /** Standing when absent: the spots measured before poses were marked. */
  readonly pose?: SpotPose;
  readonly facing?: SpotFacing;
  /** Draw order, 0 farthest. Absent: nearer the bottom is nearer. */
  readonly depth?: number;
  /** For a seat: the top of the seat cushion. */
  readonly seatY?: number;
  /** For a podium: which way the listeners are. */
  readonly audience?: "viewer" | "left" | "right" | "away";
  /** Seats around one desk or table share a group. */
  readonly group?: string;
  /** A raised floor (stage, dais, steps) named in the place's `floors`. */
  readonly floor?: string;
  /** Where the main character stands on the title screen: one per place. */
  readonly hero?: boolean;
}

export interface PlaceStaging {
  readonly horizonY: number;
  /** The main floor's scale: see `spotFigure`. */
  readonly metersPercent: number;
  /** Raised floors: the same horizon, each with its own scale. */
  readonly floors?: Readonly<Record<string, number>>;
  readonly spots: readonly StagingSpot[];
}

/** Where and how large a person at a spot is drawn, in percent. */
export interface SpotFigure {
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
  readonly clipBelowPercent: number | null;
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
/**
 * The row of the figure canvas the painted feet stand on (a few rows above
 * its bottom edge), as a share of the canvas: the feet, not the canvas
 * edge, go on the foot point.
 */
const FEET_OF_CANVAS =
  PEOPLE_PACK.presentations.feminine.bodies.average.anchors.feet /
  PEOPLE_PACK.canvas.height;

export function backdropStaging(place: string): PlaceStaging | null {
  return PLACES[place] ?? null;
}

/**
 * A person at a spot: `STANDING_METERS x metersPercent x (y - horizonY)`
 * percent of the picture tall, the floor's own scale on a raised floor. The
 * figure's canvas is the same for every pose (a seated body sits on the same
 * canvas with its feet on the same row), so a seat is placed by its foot
 * point just as a standing spot is.
 */
export function spotFigure(stage: PlaceStaging, spot: StagingSpot): SpotFigure {
  const meters =
    (spot.floor !== undefined ? stage.floors?.[spot.floor] : undefined) ??
    stage.metersPercent;
  const heightPercent = STANDING_METERS * meters * (spot.y - stage.horizonY);
  const widthPercent = heightPercent / FIGURE_HEIGHT_TO_WIDTH / BACKDROP_ASPECT;
  return {
    leftPercent: spot.x - widthPercent / 2,
    topPercent: spot.y - heightPercent * FEET_OF_CANVAS,
    widthPercent,
    heightPercent,
    clipBelowPercent: spot.clipBelowY ?? null,
  };
}

/** The draw order of a spot: its own, or its foot line when unmarked. */
export function spotDepth(spot: StagingSpot): number {
  return spot.depth ?? spot.y;
}

/** The title screen's spot for the main character in a place, if marked. */
export function backdropHeroSpot(
  place: string,
): { readonly spot: StagingSpot; readonly figure: SpotFigure } | null {
  const stage = backdropStaging(place);
  const spot = stage?.spots.find((candidate) => candidate.hero === true);
  return stage && spot ? { spot, figure: spotFigure(stage, spot) } : null;
}

/**
 * What a worker at a spot is doing, and so the pose they are drawn in
 * (pose-chooser.ts): at a desk or table seat, working; in any other seat or
 * on the open floor, waiting (arms folded or a hand on the hip, never stiff);
 * leaning on a wall, the same; behind a counter, standing to serve.
 */
export function spotPose(spot: StagingSpot, seed: string): BodyPose {
  const seated = spot.pose === "sit";
  const activity: SceneActivity =
    spot.pose === "podium"
      ? "speech"
      : seated && spot.group !== undefined
        ? "desk"
        : !seated && spot.clipBelowY !== undefined
          ? "idle"
          : "waiting";
  return chooseBodyPose({ activity, seated, seed });
}

/** Turned toward a side of the picture: three quarters, not front on. */
export function spotView(spot: StagingSpot): BodyView {
  return spot.facing === "left" || spot.facing === "right"
    ? "three-quarter"
    : "front";
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
  // A worker never takes the lectern: a speech is the scene's to give.
  const counterJob = (title: string) => COUNTER_TITLE.test(title);
  const usable = stage.spots.filter((spot) => spot.pose !== "podium");
  const behind = usable.filter((spot) => spot.clipBelowY !== undefined);
  const open = usable.filter((spot) => spot.clipBelowY === undefined);
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
    const seed = record.appearance?.seed ?? record.id;
    const recipe = engineRecipeFor(record, world.currentDate, PEOPLE_PACK, {
      wear,
      // On shift, a uniformed job wears its uniform (work-uniform.ts reads
      // "business" as dressed for work).
      uniform: workUniform(world, worker.personId, "business"),
      pose: spotPose(spot, seed),
      view: spotView(spot),
    });
    if (!recipe) continue;
    // Turned toward the side the spot faces: mirrored when the painting
    // turns the other way.
    const engine =
      spot.facing === "left" || spot.facing === "right"
        ? {
            ...recipe,
            mirrored: mirrorToFace(
              PEOPLE_PACK.presentations[recipe.presentation],
              recipe,
              spot.x,
              spot.facing === "left" ? spot.x - 10 : spot.x + 10,
              peoplePackFileAvailable,
            ),
          }
        : recipe;
    placed.push({
      personId: worker.personId,
      name: personName(record),
      title: worker.title,
      ...spotFigure(stage, spot),
      depth: spotDepth(spot),
      engine,
    });
  }
  // Farthest first, so nearer people are drawn over them.
  return placed.sort((a, b) => a.depth - b.depth);
}
