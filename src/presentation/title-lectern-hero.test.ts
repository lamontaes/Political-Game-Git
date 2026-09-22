import { describe, expect, it, vi } from "vitest";

import type { BrowserWorldSummary } from "./browser-world-repository";
import type { PlacedScenePerson } from "./life-scene-people";
import {
  buildTitleLecternHero,
  resolveTitleLecternHero,
} from "./title-lectern-hero";
import { TITLE_LECTERN_SCENE } from "./title-lectern-scene";
import { PRODUCTION_CHARACTER_LIBRARY } from "./visual-integration";

/**
 * These tests cover the WIRING, which is the part that had no caller and no
 * coverage. Whether the composed portrait is the right likeness against the
 * private title41 plate is a judgement for the owner on a build that has the
 * art; it is deliberately not asserted here, and cannot be, because a public
 * checkout carries none of that art.
 */

function summary(
  overrides: Partial<BrowserWorldSummary> = {},
): BrowserWorldSummary {
  return {
    saveId: "save_1",
    worldId: "world_1",
    snapshotId: "snap_1",
    snapshotFormatVersion: 1,
    worldSchemaVersion: 1,
    worldGeneratorVersion: "gen-1",
    playerPersonId: "person_c1c80651738523eb",
    playerName: "Dawn Willard",
    playerAge: 41,
    residence: null,
    currentMoment: {
      day: 0,
      minute: 0,
    } as BrowserWorldSummary["currentMoment"],
    actionSequence: 0,
    createdAt: "2026-01-05T00:00:00.000Z",
    savedAt: "2026-01-05T00:00:00.000Z",
    lastPlayedAt: "2026-01-05T00:00:00.000Z",
    ...overrides,
  };
}

function placedHero(): PlacedScenePerson {
  return {
    personId: "person_c1c80651738523eb",
    name: "Dawn Willard",
    relationship: null,
    anchorId: "title41-speaker",
    seated: false,
    leftPercent: 10,
    topPercent: 10,
    widthPercent: 30,
    heightPercent: 70,
    sourcePoseId: "title41-v2-test-lectern",
    layers: [
      {
        assetId: "body",
        kind: "body",
        url: "blob:body",
        leftPercent: 0,
        topPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
      },
    ] as PlacedScenePerson["layers"],
    hasArt: true,
    presence: "Dawn Willard",
  };
}

describe("title lectern hero wiring", () => {
  it("returns null when there is no save", () => {
    const compose = vi.fn();
    expect(
      resolveTitleLecternHero(undefined, PRODUCTION_CHARACTER_LIBRARY, compose),
    ).toBeNull();
    expect(compose).not.toHaveBeenCalled();
  });

  it("draws no hero in a checkout without the private lectern plate", () => {
    // A public checkout carries no title41 plate, so the resolver must stop
    // before composing anything — today's behaviour, made explicit.
    const compose = vi.fn().mockReturnValue(placedHero());
    expect(
      resolveTitleLecternHero(summary(), PRODUCTION_CHARACTER_LIBRARY, compose),
    ).toBeNull();
    expect(compose).not.toHaveBeenCalled();
  });

  it("wraps a composed speaker in a lectern hero-in-tableau presentation", () => {
    // The build that has the plate reaches this with a real composed figure;
    // the test stands in for it and asserts the wiring around one.
    const hero = placedHero();
    const resolved = buildTitleLecternHero("Dawn Willard", hero);

    expect(resolved.hero).toBe(hero);
    expect(resolved.presentation.kind).toBe("hero-in-tableau");
    expect(resolved.presentation.scene).toBe(TITLE_LECTERN_SCENE);
    expect(resolved.presentation.heroName).toBe("Dawn Willard");
    // The anchor the backdrop paints against is the hero's own, never invented.
    expect(resolved.presentation.heroAnchorId).toBe(hero.anchorId);
  });
});
