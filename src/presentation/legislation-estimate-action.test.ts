import { describe, expect, it } from "vitest";
import {
  createLegislativeScenario,
  makeIsoDate,
  serializeWorld,
} from "../simulation";
import { fileDraft } from "./legislation-docket";
import {
  prepareBillEstimateAction,
  projectBillEstimate,
  requestBillEstimate,
} from "./legislation-estimate-action";

function prepared(amount = 700_000_000) {
  const scenario = createLegislativeScenario("kentucky");
  const filed = fileDraft(scenario.world, {
    scenarioKey: "kentucky",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId:
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
    familyKey: "bridge-maintenance",
    variantKey: "worst-first-condition",
    parameterValues: {
      "repair-authorization": {
        kind: "money",
        minorUnits: amount,
        currency: "USD",
      },
    },
  });
  const input = prepareBillEstimateAction(
    filed.world,
    filed.bill,
    scenario.playerPersonId,
    {
      kind: "interval",
      startsAt: makeIsoDate("2027-01-01"),
      endsAt: makeIsoDate("2028-01-01"),
    },
  );
  return { ...filed, input };
}

describe("conditional docket fiscal estimate action", () => {
  it("records a scale-sensitive actual estimate with no effects or knowledge leak and replays without duplicates", () => {
    const small = prepared();
    const large = prepared(5_600_000_000);
    const before = serializeWorld(small.world);
    const result = requestBillEstimate(small.world, small.input);
    const rich = requestBillEstimate(large.world, large.input);
    expect(result.kind, result.kind === "refused" ? result.reason : "").toBe(
      "estimated",
    );
    expect(rich.kind, rich.kind === "refused" ? rich.reason : "").toBe(
      "estimated",
    );
    if (result.kind !== "estimated" || rich.kind !== "estimated") return;
    expect(result.projection.addedOutlaysMinorUnits).toBe(700_000_000);
    expect(rich.projection.addedOutlaysMinorUnits).toBe(5_600_000_000);
    expect(result.projection.qualification).toContain("zero baseline");
    expect(result.projection.referencePeriod).toEqual(
      small.input.referencePeriod,
    );
    expect(result.projection.provisionIds).toEqual(
      small.input.expectedProvisionIds,
    );
    expect(serializeWorld(small.world)).toBe(before);
    expect(result.world.history.metricStates).toEqual(
      small.world.history.metricStates,
    );
    expect(result.world.history.policyRealizations).toEqual(
      small.world.history.policyRealizations,
    );
    expect(result.world.history.effectActivations).toEqual(
      small.world.history.effectActivations,
    );
    expect(result.world.history.knowledge.length).toBe(
      small.world.history.knowledge.length + 1,
    );
    for (const person of Object.values(result.world.people)) {
      if (person.id !== small.input.playerPersonId)
        expect(
          projectBillEstimate(result.world, person.id, result.estimate.id),
        ).toBeNull();
    }
    const replay = requestBillEstimate(result.world, small.input);
    expect(replay.world).toBe(result.world);
    expect(replay.kind).toBe("estimated");
    const refreshed = requestBillEstimate(result.world, {
      ...small.input,
      expectedHistorySequence: result.world.history.nextSequence,
    });
    expect(
      refreshed.kind,
      refreshed.kind === "refused" ? refreshed.reason : "",
    ).toBe("estimated");
    expect(refreshed.world.history.policyBaselines.length).toBe(
      result.world.history.policyBaselines.length,
    );
  });
  it("refuses stale version, frontier, unsupported period, and missing metric without mutation", () => {
    const { world, input } = prepared();
    const before = serializeWorld(world);
    for (const changed of [
      { ...input, expectedProvisionIds: [] },
      { ...input, expectedHistorySequence: 0 },
      {
        ...input,
        referencePeriod: {
          ...input.referencePeriod,
          endsAt: input.referencePeriod.startsAt,
        },
      },
    ]) {
      const result = requestBillEstimate(world, changed);
      expect(result.kind).toBe("refused");
      expect(serializeWorld(result.world)).toBe(before);
    }
    const unavailable = {
      ...world,
      metricCatalog: {
        ...world.metricCatalog,
        definitions: {},
        definitionOrder: [],
      },
    };
    expect(requestBillEstimate(unavailable, input).world).toBe(unavailable);
    expect(requestBillEstimate(unavailable, input).kind).toBe("refused");
  });
});
