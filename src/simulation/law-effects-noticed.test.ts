import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { noticeLawPayChanges } from "./law-effects-noticed";
import { money } from "./resources";
import type { EntityId, World } from "./types";

// Saved-record boundary controls, not generated payroll or measured wages.
function savedPay(
  beforeAmount: number,
  beforeCadence: string,
  afterAmount: number,
  afterCadence: string,
): World {
  const personId = "person_notice-control" as EntityId;
  const flowId = "flow_notice-control" as EntityId;
  const eventId = "event_notice-law" as EntityId;
  const measureId = "measure_notice-law" as EntityId;
  const at = makeIsoDate("2027-01-20");
  return {
    id: "world_notice-control",
    currentDate: at,
    people: {
      [personId]: { id: personId, birthDate: makeIsoDate("1990-01-01") },
    },
    control: { kind: "person", personId },
    history: {
      nextSequence: 10,
      partnerships: [],
      resourcePositions: [],
      resourceTransferOutcomes: [],
      legislativeEnactments: [
        {
          measureId,
          outcome: "enacted",
          resolvedAt: at,
          outcomeEventId: eventId,
        },
      ],
      resourceFlows: [
        {
          id: flowId,
          basisReference: { kind: "work" },
          recipient: { kind: "person", personId },
        },
      ],
      resourceFlowTerms: [
        {
          id: "terms_before",
          resourceFlowId: flowId,
          effectiveAt: at,
          amount: money(beforeAmount, "USD"),
          cadenceKind: beforeCadence,
          provenance: { kind: "authored" },
          supersedesTermsId: null,
        },
        {
          id: "terms_after",
          resourceFlowId: flowId,
          effectiveAt: at,
          amount: money(afterAmount, "USD"),
          cadenceKind: afterCadence,
          provenance: { kind: "simulated-event", eventId },
          supersedesTermsId: "terms_before",
        },
      ],
    },
  } as unknown as World;
}

describe("saved law pay changes use both recorded cadences", () => {
  it("does not notice an equal annual wage paid on a new cadence", () => {
    const world = savedPay(10000, "pay:weekly", 20000, "pay:biweekly");
    expect(noticeLawPayChanges(world, world.currentDate)).toBe(world);
  });

  it.each([
    [10000, "pay:weekly", 22000, "pay:biweekly", "gain", 4333],
    [22000, "pay:biweekly", 10000, "pay:weekly", "cost", 4333],
    [20000, "pay:monthly", 23000, "pay:monthly", "gain", 3000],
  ])(
    "records the monthly difference and keeps the saved source",
    (before, beforeCadence, after, afterCadence, direction, amount) => {
      const world = savedPay(
        before as number,
        beforeCadence as string,
        after as number,
        afterCadence as string,
      );
      const noticed = noticeLawPayChanges(world, world.currentDate);
      expect(noticed.history.lawExposures).toHaveLength(1);
      expect(noticed.history.lawExposures![0]).toMatchObject({
        direction,
        amount: money(amount as number, "USD"),
        cadence: "monthly",
        sourceRecordId: "terms_after",
      });
      expect(noticed.history.resourceFlowTerms).toBe(
        world.history.resourceFlowTerms,
      );
      expect(noticeLawPayChanges(noticed, noticed.currentDate)).toBe(noticed);
    },
  );

  it("does not manufacture an annual amount from an unknown prior cadence", () => {
    const world = savedPay(10000, "pay:per-task", 22000, "pay:biweekly");
    expect(noticeLawPayChanges(world, world.currentDate)).toBe(world);
  });
});
