import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { recordHouseholdLocation } from "../simulation/life";
import { recordStoryMoments } from "../simulation/story/moments";
import { scheduleStoryScenes } from "../simulation/story/scheduling";
import type { World } from "../simulation/types";
import { recordWorldEvent } from "../simulation/world";
import { storyCoverageReport } from "./story-coverage";

/** The player leaving home in a small world, scheduled by the story director. */
function leaving(withHome: boolean): World {
  const small = smallWorld({
    place: "US-NM",
    household: true,
    seed: "p6-story-coverage",
  });
  let world = small.world;
  if (withHome)
    world = recordHouseholdLocation(world, {
      stableKey: "test:story-coverage:home",
      householdId: world.history.households.at(-1)!.id,
      effectiveAt: world.currentDate,
      jurisdictionId: small.jurisdictionId,
      label: small.place.displayName,
      kind: "residence:home",
      provenance: { kind: "authored", note: "Story coverage test home." },
      supersedesLocationId: null,
    });
  const before = world.history.nextSequence;
  world = recordWorldEvent(world, {
    stableKey: "test:story-coverage:left-home",
    type: "life.left-home",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: small.jurisdictionId,
    involvedEntityIds: [small.personId],
    participants: [
      { personId: small.personId, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "Fixture: the player leaves home.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return scheduleStoryScenes(recordStoryMoments(world), before);
}

describe("the story coverage report", () => {
  it("totals the moments the records could not place, by reason and kind", () => {
    const report = storyCoverageReport(leaving(false));
    expect(report.scenes).toBe(0);
    expect(report.logged).toEqual([
      { reason: "no-place", kindKey: "left-home", count: 1 },
    ]);
  });

  it("counts a bound scene the English engine cannot word yet", () => {
    const report = storyCoverageReport(leaving(true));
    expect(report.scenes).toBe(1);
    expect(report.logged).toEqual([]);
    // The story banks are the English engine's to fill; until they hold a
    // departure's lines, the bound scene is counted here and not offered.
    expect(report.englishMissing).toEqual([{ typeKey: "departure", count: 1 }]);
  });
});
