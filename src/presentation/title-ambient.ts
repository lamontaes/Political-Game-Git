import type { SceneRegistry } from "./scene-registry";
import type { TitlePresentation, TitleTableauRegistry } from "./title-tableau";
import type { RuntimeVisualLibrary } from "./visual-integration";

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

/**
 * The rooms that may appear, in a stable order.
 *
 * Three filters, and each one is a promise the packet made:
 *
 *   - only the neutral bank, because those are the tableaux that read correctly
 *     with nobody in them, and the title screen has nobody in it;
 *   - only scenes that exist in the registry;
 *   - only scenes whose raster is in the released production library, so no
 *     candidate or unreleased art can enter the cycle. Membership of that
 *     library IS release: nothing reaches it without going through the gate.
 *
 * Order is the registry's own, deduplicated by scene, so the same library
 * always produces the same cycle and the front door does not reshuffle.
 */
export function titleAmbientCycle(
  registry: TitleTableauRegistry,
  scenes: SceneRegistry,
  library: RuntimeVisualLibrary,
): readonly TitleAmbientRoom[] {
  const rooms: TitleAmbientRoom[] = [];
  const seen = new Set<string>();
  for (const tableau of registry.neutralBank) {
    if (!tableau.supportsNoCharacter) continue;
    if (seen.has(tableau.sceneId)) continue;
    const scene = scenes.scenes.get(tableau.sceneId);
    if (!scene?.raster) continue;
    if (!library.has(scene.raster.assetId)) continue;
    seen.add(tableau.sceneId);
    rooms.push({
      tableauId: tableau.tableauId,
      sceneId: tableau.sceneId,
      label: tableau.label,
    });
  }
  return rooms;
}

/**
 * Puts the front door first.
 *
 * The first thing a player sees should be the room the registry nominates as
 * the front door rather than whichever happened to be first in the bank. After
 * that the order is the bank's, so the cycle is stable and predictable.
 */
export function orderedAmbientCycle(
  registry: TitleTableauRegistry,
  scenes: SceneRegistry,
  library: RuntimeVisualLibrary,
): readonly TitleAmbientRoom[] {
  const rooms = titleAmbientCycle(registry, scenes, library);
  const frontDoorIndex = rooms.findIndex(
    (room) => room.tableauId === registry.frontDoorTableauId,
  );
  if (frontDoorIndex <= 0) return rooms;
  return [...rooms.slice(frontDoorIndex), ...rooms.slice(0, frontDoorIndex)];
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
