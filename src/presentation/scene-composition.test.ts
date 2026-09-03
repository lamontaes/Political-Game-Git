import { describe, expect, it } from "vitest";

import { composeSceneProof, createSceneProofWorld } from "./scene-proof";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_POSE_ART,
  PRODUCTION_POSE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
} from "./visual-integration";
import { CONTACT_TOLERANCE_PERCENT } from "./scene-placement";

const world = createSceneProofWorld(PRODUCTION_CHARACTER_LIBRARY);
const proof = composeSceneProof(
  world,
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
  PRODUCTION_POSE_REGISTRY,
  PRODUCTION_POSE_ART,
);
const everyone = proof.contexts.flatMap((context) => context.characters);

describe("scene composition", () => {
  it("places people in both scene purposes, including the room with no plate", () => {
    expect(proof.contexts.map((context) => context.scene.sceneId)).toEqual([
      "office-council-staff-fixture",
      "committee-room-fixture",
    ]);
    expect(proof.contexts[0]!.scene.raster).not.toBeNull();
    expect(proof.contexts[1]!.scene.raster).toBeNull();
    for (const context of proof.contexts) {
      expect(context.characters.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("derives every person's scale from their room's floor, never from a constant", () => {
    const scales = new Set(
      everyone.map((character) => character.placement.scale),
    );
    expect(scales.size).toBeGreaterThan(2);
    for (const character of everyone) {
      expect(character.placement.scale).toBeGreaterThan(0);
      expect(character.box.widthPercent).toBeCloseTo(
        character.placement.scale *
          proof.contexts.find(
            (context) => context.scene.sceneId === character.sceneId,
          )!.scene.standardBodyWidthPercent!,
        9,
      );
    }
  });

  /**
   * The same person, placed in two different rooms with different floor ramps,
   * keeps their identity and changes only their size and position. That is the
   * whole claim of the contact contract in one assertion.
   */
  it("keeps one person's identity across rooms while their placement changes", () => {
    const byPerson = new Map<string, typeof everyone>();
    for (const character of everyone) {
      byPerson.set(character.personId, [
        ...(byPerson.get(character.personId) ?? []),
        character,
      ]);
    }
    const repeated = [...byPerson.values()].filter(
      (appearances) => appearances.length > 1,
    );
    expect(repeated.length).toBeGreaterThan(0);
    for (const appearances of repeated) {
      const [first, ...rest] = appearances;
      for (const other of rest) {
        expect(other.recipe.identity.bodyFamily).toBe(
          first!.recipe.identity.bodyFamily,
        );
        expect(other.recipe.identity.headFamily).toBe(
          first!.recipe.identity.headFamily,
        );
        expect(other.recipe.identity.complexion).toBe(
          first!.recipe.identity.complexion,
        );
      }
    }
  });

  it("lands every declared contact on the plane the scene declares for it", () => {
    for (const context of proof.contexts) {
      for (const character of context.characters) {
        const anchor = context.scene.anchors.get(character.anchorId)!;
        const { placement } = character;

        if (placement.seatedPelvisMarker && anchor.seatContact) {
          expect(
            Math.abs(
              placement.seatedPelvisMarker.yPercent -
                anchor.seatContact.seat_plane_y_percent,
            ),
            `${character.displayName} pelvis`,
          ).toBeLessThanOrEqual(CONTACT_TOLERANCE_PERCENT);
        }
        if (placement.floorContactMarkers.length === 2) {
          const soleY = Math.max(
            ...placement.floorContactMarkers.map((marker) => marker.yPercent),
          );
          expect(
            Math.abs(soleY - anchor.contactFloorYPercent),
            `${character.displayName} soles`,
          ).toBeLessThanOrEqual(CONTACT_TOLERANCE_PERCENT);
        }
      }
    }
  });

  it("orders people by their floor line rather than by how they were listed", () => {
    for (const context of proof.contexts) {
      const floors = context.characters.map(
        (character) => character.placement.contactFloorYPercent,
      );
      expect(floors, context.scene.sceneId).toEqual(
        [...floors].sort((a, b) => a - b),
      );
    }
  });

  /**
   * The legacy generation-1 body declares no contacts and no complexion. It
   * still places, and the runtime reports exactly why its contact is not
   * verified rather than implying it was checked.
   */
  it("says when a body predates the contact contract instead of pretending otherwise", () => {
    const legacy = everyone.filter(
      (character) => character.recipe.identity.complexion === null,
    );
    expect(legacy.length).toBeGreaterThan(0);
    for (const character of legacy) {
      expect(
        character.diagnostics.some(
          (diagnostic) => diagnostic.code === "body-declares-no-contacts",
        ),
        character.displayName,
      ).toBe(true);
      expect(character.complete).toBe(false);
    }
  });

  it("gives every incomplete person player-facing copy free of implementation words", () => {
    const jargon = [
      "slot",
      "asset",
      "anchor",
      "component",
      "contact",
      "family",
      "catalog",
      "raster",
      "tier",
      "pose",
      "fixture",
      "recipe",
      "null",
      "undefined",
    ];
    const incomplete = everyone.filter((character) => !character.complete);
    expect(incomplete.length).toBeGreaterThan(0);
    for (const character of incomplete) {
      const copy = character.fallbackDescription!;
      expect(copy.startsWith(character.displayName)).toBe(true);
      expect(copy.endsWith(".")).toBe(true);
      for (const word of jargon) {
        expect(copy.toLowerCase(), copy).not.toContain(word);
      }
    }
    for (const character of everyone.filter((entry) => entry.complete)) {
      expect(character.fallbackDescription).toBeNull();
    }
  });

  it("keeps development warnings technical, and specific enough to act on", () => {
    const diagnostics = everyone.flatMap((character) => character.diagnostics);
    expect(diagnostics.length).toBeGreaterThan(0);
    for (const diagnostic of diagnostics) {
      expect(diagnostic.sceneId).toBeTruthy();
      expect(diagnostic.anchorId).toBeTruthy();
      expect(diagnostic.subject).toBeTruthy();
      expect(diagnostic.message.length).toBeGreaterThan(30);
    }
  });

  it("is deterministic for one world", () => {
    const again = composeSceneProof(
      world,
      PRODUCTION_CHARACTER_LIBRARY,
      PRODUCTION_VISUAL_LIBRARY,
      PRODUCTION_POSE_REGISTRY,
      PRODUCTION_POSE_ART,
    );
    expect(JSON.stringify(again.contexts.map(summarize))).toBe(
      JSON.stringify(proof.contexts.map(summarize)),
    );
  });
});

function summarize(context: (typeof proof.contexts)[number]) {
  return context.characters.map((character) => ({
    person: character.personId,
    anchor: character.anchorId,
    box: character.box,
    scale: character.placement.scale,
    layers: character.layers.map((layer) => layer.assetId),
    diagnostics: character.diagnostics.map((entry) => entry.code),
  }));
}
