import { describe, expect, it } from "vitest";
import { addDays, ageOnDate } from "../simulation/dates";
import { requireLifePlace } from "../simulation/life-places";
import { advanceWorld } from "../simulation/world";
import {
  buildPreStartBackgroundWorld,
  buildProductionWorld,
  finalizePreStartPlayer,
} from "./production-world";

describe("versioned prior-date production construction", () => {
  it("derives identity at the target date while constructing the clock a year earlier", () => {
    const place = requireLifePlace("kentucky");
    const targetStartDate = place.context.initialMoment.date;
    const priorYearStartDate = addDays(targetStartDate, -365);
    const common = {
      seed: "prior-year-identity",
      place,
      age: 22,
      givenName: "Morgan",
      familyName: "Reed",
      startingLife: "ordinary-life" as const,
      depth: "summarize-earlier-life" as const,
      household: "lives-alone" as const,
    };
    const legacy = buildProductionWorld(common);
    const input = {
      ...common,
      preStartYear: {
        version: "pre-start-world-year-v1" as const,
        targetStartDate,
        priorYearStartDate,
      },
    };
    const background = buildPreStartBackgroundWorld(input);
    expect(background.currentDate).toBe(priorYearStartDate);
    expect(background.currentMoment.date).toBe(priorYearStartDate);
    expect(background.control.kind).toBe("observer");
    expect(background.people[legacy.playerPersonId]).toBeUndefined();
    expect(
      background.history.events.some((event) =>
        event.involvedEntityIds.includes(legacy.playerPersonId),
      ),
    ).toBe(false);
    const advanced = advanceWorld(background, 365);
    const prior = finalizePreStartPlayer(advanced, input);
    expect(prior.playerPersonId).toBe(legacy.playerPersonId);
    expect(prior.player.birthDate).toBe(legacy.player.birthDate);
    expect(ageOnDate(prior.player.birthDate, targetStartDate)).toBe(22);
    expect(prior.world.currentDate).toBe(targetStartDate);
    expect(prior.world.currentMoment.date).toBe(targetStartDate);
    expect(legacy.world.currentDate).toBe(targetStartDate);
  });
});
