import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  advanceWorld,
  advanceWorldMinutes,
  scheduledActivityState,
} from "../../src/simulation";
import {
  seekCareerOffer,
  respondCareerOffer,
  startCareerWork,
  scheduleCareerTask,
} from "../../src/simulation/career-path7";
import { lifePaths2Handlers } from "../../src/simulation/life-paths2";
import { CAREER_PROVIDERS } from "../../src/presentation/career-path7-provider";
import { smallWorld } from "../fixtures/small-world";

const PLACES = lifePlaceStateIdentities();
const PROVIDER = CAREER_PROVIDERS[0]!;

describe("career task completion in every life place", () => {
  it("records the selected task when the shared clock completes its activity", () => {
    expect(PLACES).toHaveLength(56);

    for (const place of PLACES) {
      const fixture = smallWorld({
        place: place.usps,
        people: 12,
        household: true,
        seed: `career-task:${place.usps}`,
      });
      let world = fixture.world;
      const offer = seekCareerOffer(world, PROVIDER);
      expect(offer.ok, place.usps).toBe(true);
      world = offer.world;
      const relationshipId = world.history.workRelationships.at(-1)!.id;
      const accepted = respondCareerOffer(
        world,
        relationshipId,
        PROVIDER,
        true,
      );
      expect(accepted.ok, place.usps).toBe(true);
      world = advanceWorld(accepted.world, 1, lifePaths2Handlers());
      const started = startCareerWork(world, relationshipId, PROVIDER);
      expect(started.ok, place.usps).toBe(true);
      const task = PROVIDER.tasks[0]!;
      const scheduled = scheduleCareerTask(
        started.world,
        relationshipId,
        PROVIDER,
        task.id,
      );
      expect(scheduled.ok, place.usps).toBe(true);
      const activity = scheduled.world.history.scheduledActivities.at(-1)!;
      const completed = advanceWorldMinutes(
        scheduled.world,
        48 * 60,
        lifePaths2Handlers(),
      );
      expect(
        scheduledActivityState(completed, activity.id).status,
        place.usps,
      ).toBe("completed");
      expect(
        completed.history.events.some(
          (event) =>
            event.type === "career-path7.work-record" &&
            event.involvedEntityIds.includes(activity.id) &&
            event.tags.includes(`task:${task.id}`),
        ),
        place.usps,
      ).toBe(true);
    }
  });
});
