import type { SceneRegistry } from "./scene-registry";
import { titlePictureId, type TitlePicture } from "./title-civic-rotation";
import type { TitlePresentation, TitleTableauRegistry } from "./title-tableau";

/**
 * The rooms the title screen drifts through, and which one is showing.
 *
 * PRESENTATION ONLY, and pure. It is handed how many holds have elapsed and
 * returns what to paint; it owns no timer, touches no World, and consumes no
 * simulation RNG. That is not a style preference — an ambient backdrop must
 * never be able to move the game, and the cheapest way to guarantee it is to
 * write it as a function of a step count that could not reach the simulation
 * if it tried.
 *
 * It is also why the browser proof can drive it: a fake clock advances the one
 * timer the screen owns, and everything visible follows from these functions.
 */

/** How long a room holds before the next one begins to arrive. */
export const TITLE_AMBIENT_HOLD_MS = 15_000;

/** How long the two rooms overlap while one replaces the other. */
export const TITLE_AMBIENT_CROSSFADE_MS = 1_600;

export interface TitleAmbientRoom {
  readonly tableauId: string;
  readonly sceneId: string;
  /** The room in words, for the line under the title. */
  readonly label: string;
  /**
   * Set when this room is a place picture from the civic rotation rather
   * than a registered scene. Its ids are then `picture:<place>`, with the
   * light after it for a picture other than the daytime one.
   */
  readonly picture?: TitlePicture;
}

export interface TitleAmbientFrame {
  /** The room being painted now. */
  readonly current: TitleAmbientRoom;
  /**
   * The room painted underneath while it leaves, or null when nothing is
   * leaving. Null is the ordinary state and the state at rest: a crossfade is
   * a second and a half out of every sixteen, and the first room does not
   * arrive over anything.
   */
  readonly leaving: TitleAmbientRoom | null;
  /** Index into the cycle, so a proof can say which room this is. */
  readonly index: number;
}

/** The rotation entry for one place picture. */
export function pictureRoom(picture: TitlePicture): TitleAmbientRoom {
  const id = titlePictureId(picture);
  return {
    tableauId: id,
    sceneId: id,
    label: picture.label,
    picture,
  };
}

/**
 * The title's whole rotation: every national place picture, the White House
 * first and each kind spread through the rest (title-civic-rotation.ts). No
 * registered room joins it: a hearing room nobody can name is not a place the
 * country recognizes (Lamontae, Oct. 7), and it has no staging for people.
 */
export function civicAmbientCycle(
  pictures: readonly TitlePicture[],
): readonly TitleAmbientRoom[] {
  return pictures.map(pictureRoom);
}

/**
 * What to paint at `step` holds into the cycle.
 *
 * A step rather than a clock, because a step is what the screen actually has:
 * one timer of `TITLE_AMBIENT_HOLD_MS` advances it, and the crossfade is CSS
 * on the arriving room. Keeping the arithmetic here rather than in the
 * component is what lets the cycle be checked without a browser, and lets the
 * browser proof drive it with a fake clock and assert what this returned.
 *
 * A negative or non-finite step reads as the beginning rather than throwing:
 * this runs on the front door of the game, and a title screen that can crash
 * on a clock is worse than one that starts where it started.
 */
export function titleAmbientFrame(
  cycle: readonly TitleAmbientRoom[],
  step: number,
): TitleAmbientFrame | null {
  if (cycle.length === 0) return null;
  if (cycle.length === 1) {
    return { current: cycle[0]!, leaving: null, index: 0 };
  }
  const held = Number.isFinite(step) && step > 0 ? Math.floor(step) : 0;
  const index = held % cycle.length;
  const previousIndex = (index - 1 + cycle.length) % cycle.length;
  return {
    current: cycle[index]!,
    leaving: held === 0 ? null : cycle[previousIndex]!,
    index,
  };
}

/**
 * The presentation for one ambient room.
 *
 * Built from the same registry entries the resolver uses, so the backdrop
 * cannot show a room the resolver would refuse. It is always the empty
 * treatment — the title cycle has nobody in it — which is why this does not go
 * anywhere near `TitleHeroInput`.
 */
export function ambientPresentation(
  room: TitleAmbientRoom,
  registry: TitleTableauRegistry,
  scenes: SceneRegistry,
): TitlePresentation | null {
  if (room.picture) {
    return {
      kind: "neutral-tableau",
      tableau: null,
      scene: null,
      heroAnchorId: null,
      heroName: null,
      description: `${room.picture.label}.`,
      reasons: ["Civic title rotation."],
      picture: room.picture,
    };
  }
  const tableau = registry.neutralBank.find(
    (entry) => entry.tableauId === room.tableauId,
  );
  const scene = scenes.scenes.get(room.sceneId) ?? null;
  if (!tableau || !scene) return null;
  return {
    kind: "neutral-tableau",
    tableau,
    scene,
    heroAnchorId: null,
    heroName: null,
    description: `${tableau.label} with nobody in it.`,
    reasons: ["Ambient title cycle."],
  };
}

export type TitleStageRole = "showing" | "arriving" | "leaving";

/**
 * Whether a stage's image drifts. Every role follows the viewer's motion
 * preference: the leaving stage keeps its drift class so its animation keeps
 * running through the crossfade instead of snapping back to rest, and the
 * arriving stage starts its own. Reduced motion keeps every stage still.
 */
export function titleStageDrifts(
  _role: TitleStageRole,
  motionAllowed: boolean,
): boolean {
  return motionAllowed;
}

export function titleCameraClassName(drifting: boolean): string {
  return drifting
    ? "scene-camera title-tableau-camera title-tableau-camera--drift"
    : "scene-camera title-tableau-camera";
}
