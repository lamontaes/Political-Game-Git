import { describe, expect, it } from "vitest";
import { addDays, ageOnDate } from "../simulation/dates";
import { requireLifePlace } from "../simulation/life-places";
import { buildProductionWorld } from "./production-world";

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
    const prior = buildProductionWorld({
      ...common,
      preStartYear: {
        version: "pre-start-world-year-v1",
        targetStartDate,
        priorYearStartDate,
      },
    });
    expect(prior.playerPersonId).toBe(legacy.playerPersonId);
    expect(prior.player.birthDate).toBe(legacy.player.birthDate);
    expect(ageOnDate(prior.player.birthDate, targetStartDate)).toBe(22);
    expect(prior.world.currentDate).toBe(priorYearStartDate);
    expect(prior.world.currentMoment.date).toBe(priorYearStartDate);
    expect(legacy.world.currentDate).toBe(targetStartDate);
  });
});
