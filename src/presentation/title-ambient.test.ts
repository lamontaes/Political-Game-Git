import { describe, expect, it } from "vitest";

import { SCENE_REGISTRY } from "./scene-registry";
import {
  ambientPresentation,
  orderedAmbientCycle,
  TITLE_AMBIENT_HOLD_MS,
  titleAmbientCycle,
  titleAmbientFrame,
  type TitleAmbientRoom,
} from "./title-ambient";
import { TITLE_TABLEAU_REGISTRY } from "./title-tableau";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";

/**
 * The rooms the front door drifts through.
 *
 * The human playtest asked for a title screen that is a place rather than a
 * picture: slow movement over approved art, and another approved room every
 * fifteen seconds. What is checked here is everything about that which does
 * not need a browser — which room may appear, in what order, and what is
 * painted at a given point in the cycle. The browser proof drives the one
 * timer and asserts that these answers reach the screen.
 */

const CYCLE = orderedAmbientCycle(
  TITLE_TABLEAU_REGISTRY,
  SCENE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
);

describe("Which rooms the title screen may drift through", () => {
  it("offers more than one, or there is nothing to cycle", () => {
    expect(CYCLE.length).toBeGreaterThan(1);
  });

  it("admits only released art", () => {
    // The packet's hard line: no candidate or unreleased raster may enter the
    // cycle. Membership of the production library is release, so this is the
    // whole check rather than a proxy for it.
    for (const room of CYCLE) {
      const scene = SCENE_REGISTRY.scenes.get(room.sceneId);
      expect(scene, `${room.sceneId} is not a registered scene`).toBeDefined();
      expect(scene!.raster, `${room.sceneId} has no raster`).not.toBeNull();
      expect(
        PRODUCTION_VISUAL_LIBRARY.has(scene!.raster!.assetId),
        `${room.sceneId} paints art that is not released`,
      ).toBe(true);
    }
  });

  it("admits only rooms that read correctly with nobody in them", () => {
    // A cycling backdrop has no character in it, so a tableau that needs one
    // to make sense would be presentation inventing a life.
    for (const room of CYCLE) {
      const tableau = TITLE_TABLEAU_REGISTRY.neutralBank.find(
        (entry) => entry.tableauId === room.tableauId,
      );
      expect(
        tableau,
        `${room.tableauId} is not in the neutral bank`,
      ).toBeDefined();
      expect(tableau!.supportsNoCharacter).toBe(true);
    }
  });

  it("shows the front door first", () => {
    expect(CYCLE[0]!.tableauId).toBe(TITLE_TABLEAU_REGISTRY.frontDoorTableauId);
  });

  it("never shows the same room twice in one lap", () => {
    const scenes = CYCLE.map((room) => room.sceneId);
    expect(new Set(scenes).size).toBe(scenes.length);
  });

  it("is the same cycle every time it is asked", () => {
    const again = titleAmbientCycle(
      TITLE_TABLEAU_REGISTRY,
      SCENE_REGISTRY,
      PRODUCTION_VISUAL_LIBRARY,
    );
    expect(again.map((room) => room.sceneId)).toEqual(
      titleAmbientCycle(
        TITLE_TABLEAU_REGISTRY,
        SCENE_REGISTRY,
        PRODUCTION_VISUAL_LIBRARY,
      ).map((room) => room.sceneId),
    );
  });
});

describe("What is painted at a point in the cycle", () => {
  it("holds each room for fifteen seconds", () => {
    // The number the packet asked for, stated once so the screen and the
    // browser proof cannot disagree about it.
    expect(TITLE_AMBIENT_HOLD_MS).toBe(15_000);
  });

  it("arrives over nothing at the beginning", () => {
    const frame = titleAmbientFrame(CYCLE, 0)!;
    expect(frame.index).toBe(0);
    expect(frame.current.sceneId).toBe(CYCLE[0]!.sceneId);
    expect(frame.leaving).toBeNull();
  });

  it("names what is leaving once the cycle has moved", () => {
    const frame = titleAmbientFrame(CYCLE, 1)!;
    expect(frame.index).toBe(1);
    expect(frame.current.sceneId).toBe(CYCLE[1]!.sceneId);
    expect(frame.leaving?.sceneId).toBe(CYCLE[0]!.sceneId);
  });

  it("comes back round", () => {
    const lap = titleAmbientFrame(CYCLE, CYCLE.length)!;
    expect(lap.index).toBe(0);
    expect(lap.current.sceneId).toBe(CYCLE[0]!.sceneId);
    // Coming back round is still a change, so something is still leaving.
    expect(lap.leaving?.sceneId).toBe(CYCLE[CYCLE.length - 1]!.sceneId);
  });

  it("starts at the beginning rather than throwing on a broken clock", () => {
    for (const step of [-1, Number.NaN, Number.POSITIVE_INFINITY, -0]) {
      const frame = titleAmbientFrame(CYCLE, step)!;
      expect(frame.index).toBe(0);
    }
  });

  it("stands still when there is only one room, and paints nothing when there are none", () => {
    const one: readonly TitleAmbientRoom[] = [CYCLE[0]!];
    const held = titleAmbientFrame(one, 9)!;
    expect(held.index).toBe(0);
    expect(held.leaving).toBeNull();
    expect(titleAmbientFrame([], 3)).toBeNull();
  });
});

describe("The presentation an ambient room resolves to", () => {
  it("is always the empty treatment, with nobody named", () => {
    for (const room of CYCLE) {
      const presentation = ambientPresentation(
        room,
        TITLE_TABLEAU_REGISTRY,
        SCENE_REGISTRY,
      )!;
      expect(presentation.kind).toBe("neutral-tableau");
      expect(presentation.heroName).toBeNull();
      expect(presentation.heroAnchorId).toBeNull();
      expect(presentation.scene?.sceneId).toBe(room.sceneId);
    }
  });

  it("says what is on screen without naming a mechanism", () => {
    for (const room of CYCLE) {
      const { description } = ambientPresentation(
        room,
        TITLE_TABLEAU_REGISTRY,
        SCENE_REGISTRY,
      )!;
      expect(description.length).toBeGreaterThan(0);
      expect(description).not.toMatch(
        /tableau|asset|tier|registry|raster|fixture|anchor|cycle/i,
      );
    }
  });

  it("refuses a room that is not in the bank rather than inventing one", () => {
    expect(
      ambientPresentation(
        { tableauId: "no-such-tableau", sceneId: "no-such-scene", label: "X" },
        TITLE_TABLEAU_REGISTRY,
        SCENE_REGISTRY,
      ),
    ).toBeNull();
  });
});
