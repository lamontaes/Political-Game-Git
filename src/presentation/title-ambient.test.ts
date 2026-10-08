import { describe, expect, it } from "vitest";

import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { SCENE_REGISTRY } from "./scene-registry";
import {
  ambientPresentation,
  civicAmbientCycle,
  TITLE_AMBIENT_HOLD_MS,
  titleAmbientFrame,
  titleCameraClassName,
  titleStageDrifts,
  type TitleAmbientRoom,
} from "./title-ambient";
import {
  civicTitlePictures,
  type BackdropManifestRow,
} from "./title-civic-rotation";
import { TITLE_TABLEAU_REGISTRY } from "./title-tableau";

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

const PICTURES = civicTitlePictures(
  manifest.backdrops as readonly BackdropManifestRow[],
  (file) => `/art/backdrops/${file}`,
);
const CYCLE = civicAmbientCycle(PICTURES);
/** The registered rooms a returning player's resolved presentation can lead with. */
const BANK_ROOMS: readonly TitleAmbientRoom[] =
  TITLE_TABLEAU_REGISTRY.neutralBank.map((tableau) => ({
    tableauId: tableau.tableauId,
    sceneId: tableau.sceneId,
    label: tableau.label,
  }));

describe("Which rooms the title screen may drift through", () => {
  it("offers more than one, or there is nothing to cycle", () => {
    expect(CYCLE.length).toBeGreaterThan(1);
  });

  it("is made only of place pictures", () => {
    for (const room of CYCLE) {
      expect(room.picture, room.sceneId).toBeDefined();
      expect(room.sceneId).toMatch(/^picture:/);
    }
  });

  it("never admits the retired baked-audience meeting room", () => {
    // The front door is civic (Lamontae, Sept. 27 and 28), never a home.
    expect(
      TITLE_TABLEAU_REGISTRY.neutralBank.map((entry) => entry.tableauId),
    ).not.toContain("a-community-meeting");
    for (const room of CYCLE) {
      expect(room.sceneId).not.toBe("civic-community-meeting-title");
      expect(room.picture?.url ?? "").not.toContain(
        "civic_community_meeting_hero_slot",
      );
    }
  });

  it("never shows the same room twice in one lap", () => {
    const scenes = CYCLE.map((room) => room.sceneId);
    expect(new Set(scenes).size).toBe(scenes.length);
  });

  it("is the same cycle every time it is asked", () => {
    expect(civicAmbientCycle(PICTURES).map((room) => room.sceneId)).toEqual(
      CYCLE.map((room) => room.sceneId),
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
    for (const room of BANK_ROOMS) {
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
    for (const room of [...BANK_ROOMS, ...CYCLE]) {
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

describe("Title stage drift through a crossfade", () => {
  it("keeps the leaving stage drifting and starts the arriving one", () => {
    expect(titleStageDrifts("leaving", true)).toBe(true);
    expect(titleStageDrifts("arriving", true)).toBe(true);
    expect(titleStageDrifts("showing", true)).toBe(true);
    expect(titleCameraClassName(titleStageDrifts("leaving", true))).toContain(
      "title-tableau-camera--drift",
    );
  });

  it("keeps every stage still under reduced motion", () => {
    for (const role of ["leaving", "arriving", "showing"] as const) {
      expect(titleStageDrifts(role, false)).toBe(false);
      expect(titleCameraClassName(titleStageDrifts(role, false))).not.toContain(
        "--drift",
      );
    }
  });
});
