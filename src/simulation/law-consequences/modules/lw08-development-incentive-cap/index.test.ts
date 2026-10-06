import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../../../tests/fixtures/small-world";
import {
  developmentIncentiveAwardsForJurisdiction,
  DEVELOPMENT_INCENTIVE_AWARD_EVENT,
  DEVELOPMENT_INCENTIVE_AWARD_ROW,
  DEVELOPMENT_INCENTIVE_REGISTRATION,
  recordDevelopmentIncentiveAward,
} from ".";
import { createLawConsequenceRegistry } from "../../../law-consequence-registry";
import { validateLawConsequences } from "../../../law-consequence-validation";
import { createOrganization, createWorkRelationship } from "../../../life";

function fixture() {
  const small = smallWorld({ place: "US-KY", people: 4, seed: "lw08-cap-gap" });
  const world = createOrganization(small.world, {
    stableKey: "lw08:recipient-business",
    formedAt: small.world.currentDate,
    detailLevel: "lightweight",
    provenance: { kind: "authored", note: "LW-08 award-record fixture" },
    initialProfile: {
      name: "Award recipient",
      classification: "enterprise:business",
      locationJurisdictionId: small.jurisdictionId,
    },
  });
  return {
    world,
    jurisdictionId: small.jurisdictionId,
    organizationId: world.history.organizations.at(-1)!.id,
  };
}

describe("LW-08 development incentive award record", () => {
  it("registers its exact cap row and disclosure capability", () => {
    const registry = createLawConsequenceRegistry([
      DEVELOPMENT_INCENTIVE_REGISTRATION,
    ]);
    expect(
      validateLawConsequences(
        [DEVELOPMENT_INCENTIVE_AWARD_ROW],
        registry.capabilities,
      ),
    ).toEqual([]);
    expect(DEVELOPMENT_INCENTIVE_AWARD_ROW.amount).toEqual({
      op: "term",
      key: "cap",
      unit: "usd-per-award",
    });
    expect(DEVELOPMENT_INCENTIVE_AWARD_ROW.conditions).toEqual([
      {
        capability: "business.incentive-award-disclosure",
        parameters: { termKey: "disclosure" },
      },
    ]);
  });

  it("records an observed award but leaves missing legal terms unverified", () => {
    const sample = fixture();
    const result = recordDevelopmentIncentiveAward(sample.world, {
      sourceKey: "observed-award-1",
      sourceReference: "fixture-source-award-1",
      organizationId: sample.organizationId,
      jurisdictionId: sample.jurisdictionId,
      awardedAt: sample.world.currentDate,
      amountMinor: 100,
      disclosedFields: [],
    });

    expect(result.world).not.toBe(sample.world);
    expect(result.outcome).toMatchObject({ status: "recorded" });
    if (result.outcome.status !== "recorded")
      throw new Error("Expected a saved source award.");
    expect(result.outcome.verification).not.toBe("verified");
    expect(
      developmentIncentiveAwardsForJurisdiction(
        result.world,
        sample.jurisdictionId,
      ),
    ).toMatchObject([
      {
        event: { type: DEVELOPMENT_INCENTIVE_AWARD_EVENT },
        organizationId: sample.organizationId,
        amountMinor: 100,
      },
    ]);
    expect(
      result.world.history.events.find(
        (event) => event.type === DEVELOPMENT_INCENTIVE_AWARD_EVENT,
      )?.lawEffectStamps,
    ).toBeUndefined();
  });

  it("carries a named employee only through an active saved work relationship", () => {
    const sample = fixture();
    const personId = sample.world.personOrder[0]!;
    const withWork = createWorkRelationship(sample.world, {
      stableKey: "lw08:recorded-employee",
      personId,
      organizationId: sample.organizationId,
      startedAt: sample.world.currentDate,
      initialStatus: "active",
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "LW-08 employment-link test" },
      initialRole: {
        title: "Recorded employee",
        occupationClassification: "occupation:production",
        locationJurisdictionId: sample.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 20, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: sample.jurisdictionId,
        },
      },
    });
    const workRelationshipId = withWork.history.workRelationships.at(-1)!.id;
    const result = recordDevelopmentIncentiveAward(withWork, {
      sourceKey: "observed-award-2",
      sourceReference: "fixture-source-award-2",
      organizationId: sample.organizationId,
      jurisdictionId: sample.jurisdictionId,
      awardedAt: withWork.currentDate,
      amountMinor: 100,
      disclosedFields: [],
      linkedWorkRelationshipId: workRelationshipId,
    });
    expect(result.outcome.status).toBe("recorded");
    const award = developmentIncentiveAwardsForJurisdiction(
      result.world,
      sample.jurisdictionId,
    )[0]!;
    expect(award).toMatchObject({
      organizationId: sample.organizationId,
      linkedPersonId: personId,
      linkedWorkRelationshipId: workRelationshipId,
    });
    expect(award.event.involvedEntityIds).toContain(personId);
    expect(award.event.tags).toContain(
      `business.incentive-award.work-relationship:${workRelationshipId}`,
    );
  });
});
