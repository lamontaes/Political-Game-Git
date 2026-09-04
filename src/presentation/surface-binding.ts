import {
  DYNAMIC_SURFACE_CONTENT_CLASSES,
  isDynamicSurfaceSlot,
  type SceneSurfaceSlot,
} from "../environment/environment-scene-spec";
import type { World } from "../simulation";
import type { RegisteredScene } from "./scene-registry";

/**
 * WHAT A ROOM IS ALLOWED TO SAY.
 *
 * A scene declares surfaces — a screen, a board, a placard, a document on a
 * table — and each one names the classes of information it could carry. This
 * module decides what actually appears on them, and its whole design is one
 * refusal: presentation never supplies a payload.
 *
 * The chain is: base plate -> a slot measured off that plate -> a canonical
 * owner that holds the fact -> a binder -> the visible room. If the third link
 * is missing, the chain stops, and the slot shows the decoration the scene
 * already declared for it. It does not show a plausible bill number. It does
 * not show a seal that looks about right. It does not show yesterday's date
 * because a date is the sort of thing a screen has on it.
 *
 * WHY THAT MATTERS MORE THAN IT SOUNDS. Every surface in this game is in a
 * civic room, and the classes on offer are jurisdiction seals, bill numbers,
 * vote tallies and election results. Inventing any of those produces a picture
 * of a government that does not exist, which is indistinguishable from a bug
 * in the simulation and much harder to notice.
 *
 * TODAY, EXACTLY ONE CLASS HAS AN OWNER. The world holds a date. It holds no
 * bill the player is looking at from a room, no seal for a jurisdiction, no
 * tally, no headline, no portrait. `worldSurfacePayloads` therefore binds
 * `calendar-date` and returns nothing for everything else, with the reason
 * attached — and that is a description of the simulation, not a limitation of
 * this module. When an owner appears, it is added there and every slot that
 * accepts the class lights up.
 */

export type SurfaceBindingState =
  /** Canonical state supplied a payload and it is on screen. */
  | "bound"
  /** No canonical owner holds this class yet. The decoration shows instead. */
  | "unowned"
  /** An owner exists but has nothing for this room right now. */
  | "empty"
  /** The slot carries only decoration and was never dynamic. */
  | "decorative";

export interface SurfaceBinding {
  readonly slotId: string;
  readonly kind: string;
  readonly state: SurfaceBindingState;
  /** The class that filled it. Null unless `state` is "bound". */
  readonly contentClass: string | null;
  /** What is on the surface: the payload, or the scene's own decoration. */
  readonly shows: string;
  /** Why it is in this state, for a reviewer. Never player copy. */
  readonly because: string;
}

/**
 * A canonical payload source.
 *
 * Returns the text for a content class, or null when the owner has nothing.
 * The distinction between "no owner" and "owner with nothing" is the caller's
 * to make by leaving a class out versus returning null for it.
 */
export type SurfacePayloadProvider = (
  contentClass: string,
) => string | null | undefined;

const NOTHING_DECLARED = "nothing is drawn on it";

function decorationFor(slot: SceneSurfaceSlot): string {
  return slot.fallback_decoration ?? NOTHING_DECLARED;
}

/**
 * Binds one scene's surfaces against a payload provider.
 *
 * The provider is asked for the slot's declared classes IN THE ORDER THE SCENE
 * DECLARED THEM, and the first owner with something wins. Order is the scene
 * author's judgement about what that surface is most for, and honouring it is
 * cheaper than inventing a priority rule here.
 */
export function bindSceneSurfaces(
  scene: RegisteredScene,
  payloads: SurfacePayloadProvider,
): readonly SurfaceBinding[] {
  return scene.surfaceSlots.map((slot): SurfaceBinding => {
    if (!isDynamicSurfaceSlot(slot)) {
      return {
        slotId: slot.slot_id,
        kind: slot.kind,
        state: "decorative",
        contentClass: null,
        shows: decorationFor(slot),
        because:
          "This surface carries no class that follows simulation state, so there is nothing for an owner to fill.",
      };
    }

    const dynamicClasses = slot.allowed_content_classes.filter((contentClass) =>
      DYNAMIC_SURFACE_CONTENT_CLASSES.has(contentClass),
    );

    let sawOwner = false;
    for (const contentClass of dynamicClasses) {
      const payload = payloads(contentClass);
      if (payload === undefined) continue;
      sawOwner = true;
      if (payload === null || payload.length === 0) continue;
      return {
        slotId: slot.slot_id,
        kind: slot.kind,
        state: "bound",
        contentClass,
        shows: payload,
        because: `Canonical state owns '${contentClass}' and had something for it.`,
      };
    }

    return {
      slotId: slot.slot_id,
      kind: slot.kind,
      state: sawOwner ? "empty" : "unowned",
      contentClass: null,
      shows: decorationFor(slot),
      because: sawOwner
        ? `An owner exists for ${dynamicClasses.join(", ")} but has nothing for this room now, so the room shows what it was painted with.`
        : `Nothing in this world owns ${dynamicClasses.join(", ")} yet. The slot is kept so a binder has somewhere to attach; the room shows what it was painted with until then.`,
    };
  });
}

/**
 * The payload provider backed by canonical world state.
 *
 * Deliberately small. Every class NOT listed here returns `undefined`, which
 * the binder reads as "no owner" rather than "owner with nothing", and the
 * difference shows up in the proof surface. Adding a class here is a claim that
 * the world really holds that fact, and it should be made by whoever owns the
 * system that holds it.
 */
export function worldSurfacePayloads(world: World): SurfacePayloadProvider {
  return (contentClass) => {
    if (contentClass === "calendar-date") return world.currentDate;
    return undefined;
  };
}

/** A provider for a room nobody is standing in. Everything falls back. */
export const NO_SURFACE_PAYLOADS: SurfacePayloadProvider = () => undefined;

export interface SurfaceBindingSummary {
  readonly total: number;
  readonly bound: number;
  readonly unowned: number;
  readonly empty: number;
  readonly decorative: number;
}

export function summarizeSurfaceBindings(
  bindings: readonly SurfaceBinding[],
): SurfaceBindingSummary {
  return {
    total: bindings.length,
    bound: bindings.filter((binding) => binding.state === "bound").length,
    unowned: bindings.filter((binding) => binding.state === "unowned").length,
    empty: bindings.filter((binding) => binding.state === "empty").length,
    decorative: bindings.filter((binding) => binding.state === "decorative")
      .length,
  };
}
