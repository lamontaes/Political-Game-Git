import { beforeAll, describe, expect, it } from "vitest";
import type { EntityId, World } from "../simulation";
import { recordStoryMoments } from "../simulation/story/moments";
import {
  observerSetup,
  openObserverWorld,
  projectObserverPerson,
} from "./observer-world";

/**
 * The observer's person file shows the story director's threads and moments
 * (docs/design/story-director.md, answer 5). The world is opened and read
 * once, with no days passed, so the file stays fast under the testing rule.
 */
describe("a watched world's person file", () => {
  let world: World;
  let anchor: EntityId;

  beforeAll(() => {
    const opened = openObserverWorld(observerSetup("observer-story-1"));
    world = recordStoryMoments(opened.world);
    anchor = opened.anchorPersonId;
  }, 60_000);

  it("shows the observer a person's threads, most important first, and recent moments", () => {
    const file = projectObserverPerson(world, anchor)!;
    expect(file.threads.length).toBeGreaterThan(0);
    const importance = file.threads.map((thread) => thread.importance);
    expect(importance).toEqual([...importance].sort((a, b) => b - a));
    for (const thread of file.threads) {
      expect(thread.name.length).toBeGreaterThan(0);
      expect(thread.importance).toBeGreaterThan(0);
      expect(world.people[thread.personId]).toBeDefined();
    }
    expect(file.moments.length).toBeGreaterThan(0);
    expect(file.moments.length).toBeLessThanOrEqual(10);
    const dates = file.moments.map((moment) => moment.at);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
