// Where people can be in each place picture (art/backdrops/staging.json):
// spots on the floor, seats, podiums and walls to lean on, each with its foot
// point, pose, facing and the floor's scale. Positions are percentages of the
// picture itself.
import staging from "../../art/backdrops/staging.json" with { type: "json" };

/** How a person at a spot is posed. */
export type SpotPose = "stand" | "sit" | "podium" | "lean";
/** Which way a person at a spot faces: the camera, or a side of the picture. */
export type SpotFacing = "viewer" | "left" | "right" | "away";

export interface StagingSpot {
  readonly id?: string;
  readonly role?: string;
  /** The foot point, in percent of the picture (a seated person's too). */
  readonly x: number;
  readonly y: number;
  /** Behind a desk, counter or lectern: its top edge. The occluder bake reads the furniture's depth just below it (scripts/people/occluders.py), and the floor at the feet is hidden. */
  readonly behindY?: number;
  /** Standing when absent. */
  readonly pose?: SpotPose;
  readonly facing?: SpotFacing;
  /** Draw order, 0 farthest. Absent: nearer the bottom is nearer. */
  readonly depth?: number;
  /** For a seat: the top of the seat cushion. */
  readonly seatY?: number;
  /** For a podium: which way the listeners are. */
  readonly audience?: SpotFacing;
  /** Seats around one desk or table share a group. */
  readonly group?: string;
  /** A raised floor (stage, dais, steps) named in the place's `floors`. */
  readonly floor?: string;
  readonly floorHorizonY?: number;
  readonly floorMetersPercent?: number;
  /** Measured from a mannequin plate (art/people-rooms): the head a person here has, in percent of the picture; a figure is scaled to its width and set on its top and middle. */
  readonly head?: {
    readonly top: number;
    readonly x: number;
    readonly width: number;
  };
  /** Where the main character stands: one per place. */
  readonly hero?: boolean;
}

export interface PlaceStaging {
  readonly horizonY: number;
  /** Percent of the picture one meter is, per percent below the horizon. */
  readonly metersPercent: number;
  /** Raised floors: the same horizon, each with its own scale. */
  readonly floors?: Readonly<Record<string, number>>;
  readonly spots: readonly StagingSpot[];
}

const PLACES = staging.places as unknown as Readonly<
  Record<string, PlaceStaging>
>;

/** The place pictures are all 1672 x 941. */
export const BACKDROP_ASPECT = 1672 / 941;

export function backdropStaging(place: string): PlaceStaging | null {
  return PLACES[place] ?? null;
}
