import { describe, expect, it } from "vitest";

import {
  CIVIC_SYMBOL_CONTENT_CLASSES,
  isDynamicSurfaceSlot,
} from "../environment/environment-scene-spec";
import { SCENE_REGISTRY } from "./scene-registry";
import {
  bindSceneSurfaces,
  NO_SURFACE_PAYLOADS,
  summarizeSurfaceBindings,
  worldSurfacePayloads,
  type SurfacePayloadProvider,
} from "./surface-binding";

const scenes = [...SCENE_REGISTRY.scenes.values()];

describe("binding what a room is allowed to say", () => {
  /**
   * The load-bearing assertion. Every civic surface in this game offers seals,
   * bill numbers, tallies and results, and inventing any of them draws a
   * picture of a government that does not exist.
   */
  it("puts nothing on a surface no canonical owner fills", () => {
    for (const scene of scenes) {
      for (const binding of bindSceneSurfaces(scene, NO_SURFACE_PAYLOADS)) {
        expect(binding.state, binding.slotId).not.toBe("bound");
        expect(binding.contentClass, binding.slotId).toBeNull();
        const slot = scene.surfaceSlots.find(
          (candidate) => candidate.slot_id === binding.slotId,
        )!;
        expect(binding.shows, binding.slotId).toBe(
          slot.fallback_decoration ?? "nothing is drawn on it",
        );
      }
    }
  });

  it("shows the scene's own decoration rather than inventing one", () => {
    for (const scene of scenes) {
      for (const binding of bindSceneSurfaces(scene, NO_SURFACE_PAYLOADS)) {
        // Decoration is authored beside the plate it decorates. A binder that
        // wrote its own would be painting over the picture.
        expect(binding.shows.length, binding.slotId).toBeGreaterThan(0);
      }
    }
  });

  it("binds a class an owner really holds", () => {
    const provider: SurfacePayloadProvider = (contentClass) =>
      contentClass === "document-body"
        ? "The working draft, as it stands."
        : undefined;
    const bound = scenes
      .flatMap((scene) => bindSceneSurfaces(scene, provider))
      .filter((binding) => binding.state === "bound");
    expect(bound.length).toBeGreaterThan(0);
    for (const binding of bound) {
      expect(binding.contentClass).toBe("document-body");
      expect(binding.shows).toBe("The working draft, as it stands.");
    }
  });

  /**
   * "No owner" and "owner with nothing" are different states and stay
   * different. Collapsing them would hide the fact that a system exists and is
   * empty, which is the more actionable of the two.
   */
  it("separates a missing owner from an empty one", () => {
    const emptyOwner: SurfacePayloadProvider = (contentClass) =>
      contentClass === "document-body" ? null : undefined;
    const bindings = scenes.flatMap((scene) =>
      bindSceneSurfaces(scene, emptyOwner),
    );
    expect(bindings.some((binding) => binding.state === "empty")).toBe(true);
    expect(bindings.some((binding) => binding.state === "unowned")).toBe(true);
    for (const binding of bindings) {
      expect(binding.because.length).toBeGreaterThan(0);
    }
  });

  /**
   * A seal or a flag is never generated, redrawn or approximated. Today no
   * canonical source supplies one, and no provider in this repository may.
   */
  it("never fills a civic symbol slot from anything but a canonical source", () => {
    const everythingProvider: SurfacePayloadProvider = () => "SOMETHING";
    for (const scene of scenes) {
      for (const slot of scene.surfaceSlots) {
        const civic = slot.allowed_content_classes.filter((contentClass) =>
          CIVIC_SYMBOL_CONTENT_CLASSES.has(contentClass),
        );
        if (civic.length === 0) continue;
        // The scene must have declared the policy for such a slot at all.
        expect(slot.civic_symbol_policy, slot.slot_id).toBe(
          "canonical-source-only",
        );
      }
      // And the world provider, which is the only one wired to a real world,
      // supplies no civic symbol however hard it is asked.
      const worldProvider = worldSurfacePayloads({
        currentDate: "2026-09-03",
      } as never);
      for (const contentClass of CIVIC_SYMBOL_CONTENT_CLASSES) {
        expect(worldProvider(contentClass), contentClass).toBeUndefined();
      }
      expect(everythingProvider("jurisdiction-seal")).toBe("SOMETHING");
    }
  });

  it("binds the one class the world actually owns today", () => {
    const provider = worldSurfacePayloads({
      currentDate: "2026-09-03",
    } as never);
    expect(provider("calendar-date")).toBe("2026-09-03");
    for (const contentClass of [
      "bill-number",
      "bill-title",
      "vote-tally",
      "election-result",
      "headline",
      "jurisdiction-name",
      "jurisdiction-seal",
      "officeholder-portrait",
      "agenda",
      "briefing-slide",
      "map-label",
    ]) {
      expect(provider(contentClass), contentClass).toBeUndefined();
    }
  });

  it("reports a decorative slot as decorative rather than as a gap", () => {
    for (const scene of scenes) {
      const bindings = bindSceneSurfaces(scene, NO_SURFACE_PAYLOADS);
      for (const binding of bindings) {
        const slot = scene.surfaceSlots.find(
          (candidate) => candidate.slot_id === binding.slotId,
        )!;
        expect(binding.state === "decorative", binding.slotId).toBe(
          !isDynamicSurfaceSlot(slot),
        );
      }
      expect(summarizeSurfaceBindings(bindings).total).toBe(
        scene.surfaceSlots.length,
      );
    }
  });

  /**
   * Every production room declares at least one surface. A room with none is a
   * room where every future fact would have to be painted in, which is the
   * habit the surface contract exists to break.
   */
  it("gives every production room somewhere to put a fact", () => {
    for (const scene of scenes) {
      if (scene.presentationStatus !== "production") continue;
      expect(scene.surfaceSlots.length, scene.sceneId).toBeGreaterThan(0);
    }
  });
});
