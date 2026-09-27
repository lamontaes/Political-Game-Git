import { describe, expect, it } from "vitest";

import { proposalFixture } from "../../tests/fixtures/tax-policy-fixture";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import { addDays } from "./dates";
import { applyInstitutionStep } from "./governing/legislative-clock";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
} from "./legislation";
import { createLegislativeScenario } from "./legislation-scenarios";
import { recordTaxDraftIdentity } from "./legislation-tax-identity";
import { recordFiledProvision } from "./legislative-politics";
import {
  drawLegislativeStartingProcedures,
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
} from "./legislative-starting-procedures";
import { deserializeWorld, serializeWorld } from "./serialization";
import { attachTaxProposal } from "./tax-policy";
import {
  taxActivationReadiness,
  typedTaxEnactmentDate,
} from "./tax-policy-activation";
import type { EntityId, World } from "./types";
import {
  appendWorldConditions,
  ensureWorldStartingConditions,
} from "./world-setup/conditions";
import { stateTaxServiceProfileForJurisdictionKey } from "./world-setup/state-tax-service-profiles";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";

/** A saved alternate-present 105-day default is deliberately distinct from
 * the unchanged Alaska levy, which states its own 90-day source delay.
 */
function filedTax(amended = false) {
  const fixture = proposalFixture();
  let world = recordTaxDraftIdentity(fixture.world, fixture.proposalId);
  const procedures = drawLegislativeStartingProcedures(world);
  world = appendWorldConditions(world, [
    {
      kind: "legislative-starting-procedures",
      stableKey: "tax-date-test:starting-procedures",
      contractVersion: LEGISLATIVE_STARTING_PROCEDURES_VERSION,
      procedures: {
        ...procedures,
        "US-AK": { ...procedures["US-AK"]!, effectiveDateDays: 105 },
      },
    },
  ]);
  if (amended)
    world = recordFiledProvision(world, {
      stableKey: "tax-date-test:unsupported-addition",
      measureId: fixture.procedure.measureId,
      provisionKey: "unsupported-addition",
      sectionNumber: 2,
      heading: "Unsupported additional text",
      text: "This extra fictional section has no typed tax effect.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "Unsupported test text",
      },
      applicationScope: {
        jurisdictionId: world.history.taxProposals!.at(-1)!.jurisdictionId,
        segmentKey: null,
      },
    });
  return { ...fixture, world };
}

function awaitEnactment(amended = false) {
  const fixture = filedTax(amended);
  let world = fixture.world;
  const measureId = fixture.procedure.measureId;
  for (let guard = 0; guard < 40; guard++) {
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (step === "record-enactment") break;
    if (!step)
      throw new Error(
        `No supported step at ${measurePosition(world, measureId).phase}.`,
      );
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(fixture.procedure, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).phase).toBe("awaiting-enactment");
  return { ...fixture, world, measureId };
}

function assertAdopted(
  world: World,
  measureId: EntityId,
  proposalId: EntityId,
) {
  const enactment = world.history.legislativeEnactments!.find(
    (row) => row.measureId === measureId,
  )!;
  expect(enactment.effectiveAt).toBe(addDays(enactment.resolvedAt, 90));
  expect(enactment.effectiveDateGameProfile).toBeUndefined();
  expect(world.history.taxPolicies?.at(-1)).toMatchObject({
    proposalId,
    effectiveAt: enactment.effectiveAt,
  });
  expect(world.history.taxCollections ?? []).toHaveLength(0);
  expect(taxActivationReadiness(world, proposalId).kind).toBe("recorded");
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
}

describe("typed tax enactment date", () => {
  it("keeps untyped measures on their ordinary default", () => {
    const fixture = proposalFixture();
    expect(
      typedTaxEnactmentDate(fixture.world, fixture.procedure.measureId),
    ).toBeNull();
  });

  it("uses the existing fictional tax rule when the saved default is later", () => {
    const scenario = createLegislativeScenario("kentucky");
    let world = ensureWorldStartingConditions(scenario.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    // A valid alternate-present saved procedure: the filed fictional tax
    // says no earlier than its 90-day delay or the act's own effective date.
    world = {
      ...world,
      history: {
        ...world.history,
        worldConditions: world.history.worldConditions!.map((row) =>
          row.kind === "legislative-starting-procedures"
            ? {
                ...row,
                procedures: {
                  ...row.procedures,
                  "US-KY": {
                    ...row.procedures["US-KY"]!,
                    effectiveDateDays: 105 as const,
                  },
                },
              }
            : row,
        ),
      },
    };
    const profile = stateTaxServiceProfileForJurisdictionKey(world, "US-KY")!;
    world = introduceMeasure(world, {
      stableKey: "tax-date-test:fictional-measure",
      jurisdictionId: profile.jurisdictionId,
      rulePackId: scenario.pack.packId,
      designation: "HB Tax Date Test",
      shortTitle: "Fictional date test",
      summary: "Tests the saved fictional tax profile's date rule.",
      origin: "member-introduction",
      subjectClass: "revenue",
      sponsorPersonId: scenario.playerPersonId,
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    world = attachTaxProposal(world, {
      stableKey: "tax-date-test:fictional-tax",
      measureId,
      sponsorPersonId: scenario.playerPersonId,
      power: null,
      gameProfileRef: profile.ref,
      terms: profile.taxTerms,
    });
    world = recordTaxDraftIdentity(
      world,
      world.history.taxProposals!.at(-1)!.id,
    );
    expect(profile.taxTerms.effectiveDelayDays).toBe(90);
    expect(typedTaxEnactmentDate(world, measureId)).toBe(
      addDays(world.currentDate, 105),
    );
  });

  it("records the filed levy date through the player's enactment route", () => {
    const fixture = awaitEnactment();
    expect(typedTaxEnactmentDate(fixture.world, fixture.measureId)).toBe(
      addDays(fixture.world.currentDate, 90),
    );
    const after = publishLegislativeTransition(
      fixture.world,
      applyLegislativeStep(fixture.procedure, fixture.world, "record-enactment")
        .world,
    );
    assertAdopted(after, fixture.measureId, fixture.proposalId);
  });

  it("records the same date through the institutional clock", () => {
    const fixture = awaitEnactment();
    const result = applyInstitutionStep(
      fixture.world,
      fixture.measureId,
      () => {
        throw new Error("The executive desk is already complete.");
      },
    );
    expect(result.kind).toBe("applied");
    if (result.kind !== "applied") throw new Error("No enactment was applied.");
    expect(result.step).toBe("record-enactment");
    assertAdopted(result.world, fixture.measureId, fixture.proposalId);
  });

  it("leaves an amended act enacted but refuses its pinned tax effect", () => {
    const fixture = awaitEnactment(true);
    expect(typedTaxEnactmentDate(fixture.world, fixture.measureId)).toBeNull();
    const after = publishLegislativeTransition(
      fixture.world,
      applyLegislativeStep(fixture.procedure, fixture.world, "record-enactment")
        .world,
    );
    const enactment = after.history.legislativeEnactments!.at(-1)!;
    expect(enactment.outcome).toBe("enacted");
    expect(enactment.effectiveAt).toBe(addDays(enactment.resolvedAt, 105));
    expect(after.history.taxPolicies ?? []).toHaveLength(0);
    expect(after.history.taxCollections ?? []).toHaveLength(0);
    expect(taxActivationReadiness(after, fixture.proposalId)).toMatchObject({
      kind: "unavailable",
    });
  });
});
