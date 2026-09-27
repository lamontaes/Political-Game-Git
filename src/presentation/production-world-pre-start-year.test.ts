import { describe, expect, it } from "vitest";
import { addDays, ageOnDate } from "../simulation/dates";
import {
  activeWorkRelationshipsAt,
  workStatusAt,
} from "../simulation/life-queries";
import { requireLifePlace } from "../simulation/life-places";
import { settleLocalBusinesses } from "../simulation/local-economy";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";
import { projectPersonalRecord } from "./personal-record";
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

  it("ends prior local work before the selected staff job begins", () => {
    const place = requireLifePlace("kentucky");
    const targetStartDate = place.context.initialMoment.date;
    const input = {
      seed: "prior-year-office-guard",
      place,
      age: 35,
      givenName: "Morgan",
      familyName: "Reed",
      startingLife: "legislative-office" as const,
      depth: "summarize-earlier-life" as const,
      household: "lives-alone" as const,
      preStartYear: {
        version: "pre-start-world-year-v1" as const,
        targetStartDate,
        priorYearStartDate: addDays(targetStartDate, -365),
      },
    };
    const background = buildPreStartBackgroundWorld(input);
    const legacy = buildProductionWorld(input);
    expect(background.people[legacy.playerPersonId]).toBeUndefined();
    const advanced = advanceWorld(background, 365);
    const { world, playerPersonId } = finalizePreStartPlayer(advanced, input);
    const active = activeWorkRelationshipsAt(world, playerPersonId);
    expect(active).toHaveLength(1);
    expect(active[0]!.relationship.kind).toBe("employment:legislative-staff");
    const priorJob = world.history.workRelationships.find(
      (row) =>
        row.personId === playerPersonId &&
        row.kind === "employment:local-business",
    );
    expect(priorJob).toBeDefined();
    expect(workStatusAt(world, priorJob!.id)?.status).toBe("ended");
    const priorPay = world.history.resourceFlows.find(
      (row) =>
        row.basisReference.kind === "work" &&
        row.basisReference.workRelationshipId === priorJob!.id,
    );
    expect(resourceFlowTermsAt(world, priorPay!.id)?.status).toBe("ended");
    const balance = projectPersonalRecord(world, playerPersonId)?.purses.find(
      (purse) => purse.kind === "personal",
    )?.balance?.minorUnits;
    expect(balance).toBeGreaterThan(0);
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(activeWorkRelationshipsAt(reloaded, playerPersonId)).toHaveLength(1);
    expect(
      projectPersonalRecord(reloaded, playerPersonId)?.purses.find(
        (purse) => purse.kind === "personal",
      )?.balance?.minorUnits,
    ).toBe(balance);
    const later = settleLocalBusinesses(
      advanceWorld(reloaded, 35),
      place.context.jurisdiction.id,
    );
    expect(
      later.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === priorPay!.id,
      ),
    ).toHaveLength(0);
    expect(advanced.control.kind).toBe("observer");
  });
});
