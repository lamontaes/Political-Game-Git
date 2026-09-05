import { describe, expect, it } from "vitest";

import { planLifeScenePeople } from "../src/presentation/life-scene-people";
import { DOMESTIC_CANONICAL_SCENE_ID } from "../src/presentation/scene-registry";
import { createNewGameWorld } from "../src/presentation/new-game";
import type { ScenePerson } from "../src/presentation/life-story";
import type { EntityId, NewGameSetup } from "../src/simulation";

/**
 * Standing the generated people in the room (Packet 88+ scene-first shell).
 *
 * The fourth human play reported a room with no family in it. The repair places
 * the people a moment actually contains on the scene's own anchors. These tests
 * hold the placement contract and, crucially, the fail-closed one: with no
 * production body art released, every person still gets a spatially-correct,
 * honestly-named placeholder rather than a broken image or somebody else's
 * likeness.
 */

function aWorld() {
  return createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "scene-people-proof",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
}

function scenePeople(count: number): ScenePerson[] {
  return Array.from({ length: count }, (_, index) => ({
    personId: `person_scene_${index}` as EntityId,
    name: `Person ${index}`,
    relationship: index === 0 ? "your mom" : null,
    introduction: `Person ${index}`,
  }));
}

describe("The generated people stand in the room", () => {
  it("places each present person on a real anchor, in plate percentages", () => {
    const { world } = aWorld();
    const placed = planLifeScenePeople(
      world,
      scenePeople(2),
      DOMESTIC_CANONICAL_SCENE_ID,
    );
    expect(placed.length).toBe(2);
    for (const person of placed) {
      expect(person.anchorId.length).toBeGreaterThan(0);
      expect(person.leftPercent).toBeGreaterThanOrEqual(0);
      expect(person.leftPercent).toBeLessThan(100);
      expect(person.topPercent).toBeGreaterThanOrEqual(0);
      expect(person.widthPercent).toBeGreaterThan(0);
      expect(person.heightPercent).toBeGreaterThan(0);
    }
  });

  it("fails closed to a named placeholder, never a broken image", () => {
    // No production body master is released, so no real art resolves. The
    // person is still here, named, in the right place.
    const { world } = aWorld();
    const placed = planLifeScenePeople(
      world,
      scenePeople(1),
      DOMESTIC_CANONICAL_SCENE_ID,
    );
    expect(placed[0]!.hasArt).toBe(false);
    expect(placed[0]!.layers).toEqual([]);
    expect(placed[0]!.presence).toContain("Person 0");
    expect(placed[0]!.presence).toContain("your mom");
  });

  it("stands nobody in a room that has no plate, and never invents one", () => {
    const { world } = aWorld();
    expect(planLifeScenePeople(world, scenePeople(2), null)).toEqual([]);
    expect(
      planLifeScenePeople(world, scenePeople(2), "not-a-real-scene"),
    ).toEqual([]);
  });

  it("stands nobody when nobody is present", () => {
    const { world } = aWorld();
    expect(planLifeScenePeople(world, [], DOMESTIC_CANONICAL_SCENE_ID)).toEqual(
      [],
    );
  });

  it("is deterministic and bounded to the room's anchors", () => {
    const { world } = aWorld();
    const once = planLifeScenePeople(
      world,
      scenePeople(8),
      DOMESTIC_CANONICAL_SCENE_ID,
    );
    const twice = planLifeScenePeople(
      world,
      scenePeople(8),
      DOMESTIC_CANONICAL_SCENE_ID,
    );
    expect(once.map((p) => `${p.personId}:${p.anchorId}`)).toEqual(
      twice.map((p) => `${p.personId}:${p.anchorId}`),
    );
    // Never more people than the room has places, and no anchor used twice.
    const anchors = once.map((p) => p.anchorId);
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(once.length).toBeLessThanOrEqual(3);
  });
});
