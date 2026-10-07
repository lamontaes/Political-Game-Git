import { expect, it } from "vitest";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../../tests/fixtures/tax-policy-fixture";
import { declarePersonalTaxOccurrence } from "../../presentation/tax-work";
import { advanceWorld, assertWorldIntegrity } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { daysBetween } from "../dates";
import { applyLawConsequences } from "../enacted-law-effects";
import { serializeWorld, deserializeWorld } from "../serialization";

it("assesses an actually enacted questionless levy once and collects it after Save/Continue", () => {
  const fixture = enactedTaxFixture();
  const policy = fixture.world.history.taxPolicies![0]!;
  const registry = createCampaignElectionTransitionRegistry();
  let world = advanceWorld(
    fixture.world,
    daysBetween(fixture.world.currentDate, policy.effectiveAt),
    registry,
  );
  const measure = world.history.legislativeMeasures!.find(
    (row) => row.id === fixture.procedure.measureId,
  )!;
  expect(measure.propositionIds ?? []).toHaveLength(0);
  world = declarePersonalTaxOccurrence(world, {
    personId: fixture.personId,
    proposalId: policy.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: 2100,
    assumptionNote:
      "Explicit authored taxable occurrence for regression proof.",
    stableKey: "saved-tax:occurrence",
  });
  expect(world.history.taxAssessments).toHaveLength(1);
  expect(world.history.taxAssessments![0]!.taxAmount.minorUnits).toBe(100);
  const base = world.history.taxBases![0]!;
  world = applyLawConsequences(world, {
    onDate: world.currentDate,
    activity: "assessment",
    activityId: base.id,
    subjectIds: [fixture.personId],
    governingLawId: fixture.procedure.measureId,
  });
  expect(world.history.taxAssessments).toHaveLength(1);
  world = advanceWorld(deserializeWorld(serializeWorld(world)), 2, registry);
  expect(world.history.taxCollections).toHaveLength(1);
  expect(world.history.taxCollections![0]!.status).toBe("collected");
  assertWorldIntegrity(world);
});
