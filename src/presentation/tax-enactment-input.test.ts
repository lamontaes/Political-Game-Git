import { canonicalJson } from "../simulation/canonical-json";
import { createStableId } from "../simulation/ids";
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { describe, expect, it } from "vitest";
import {
  suppliedLegislativeSeat,
  endSuppliedSeat,
} from "../../tests/fixtures/supplied-legislative-seat";
import {
  TEST_TAX_TERMS,
  enactedTaxFixture,
} from "../../tests/fixtures/tax-policy-fixture";
import { fileTaxProposalFromOffice } from "./tax-work";
import {
  ALASKA_REVENUE_RECORDED_SITTING,
  prepareRecordedLegislativeSitting,
  readRecordedLegislativeSitting,
  recordedSittingAvailable,
  recordedSittingOffer,
} from "./legislative-authored-sitting";
import { legislativeBlueprint } from "../simulation/legislation-scenarios";
import { resolveLegislativeAssignmentForMeasure } from "./legislation-world";
import { resolveTaxEnactmentInputContract } from "./tax-enactment-input";
import {
  readFiledTaxContentIdentity,
  recordTaxDraftIdentity,
} from "../simulation/legislation-tax-identity";
import { assertWorldIntegrity, advanceWorld } from "../simulation/world";
import { createTaxTransitionHandlerRegistry } from "../simulation/tax-policy";
import { recordFiledProvision } from "../simulation/legislative-politics";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import type { World } from "../simulation/types";

function filed(chamber = "house") {
  const member = suppliedLegislativeSeat("US-AK", chamber);
  const beforeWorld = advanceWorld(
    member.world,
    daysBetween(member.world.currentDate, makeIsoDate("2027-02-01")),
    createTaxTransitionHandlerRegistry(),
  );
  const result = fileTaxProposalFromOffice(beforeWorld, {
    personId: member.personId,
    stableKey: "tax-input:explicit-proposal",
    terms: TEST_TAX_TERMS,
  });
  return { ...member, ...result, beforeWorld };
}

describe("F pinned ordinary revenue identity and explicit S input contract", () => {
  it("reaches the canonical tax measure and offers only its bill-bound revenue sitting, never the appropriation sitting's decisions", () => {
    const result = filed();
    const input = {
      measureId: result.measureId,
      playerPersonId: result.personId,
    };
    const bytes = serializeWorld(result.world);
    const assignment = resolveLegislativeAssignmentForMeasure(
      result.world,
      input,
    );
    expect(assignment.kind).toBe("available");
    if (assignment.kind !== "available") throw new Error(assignment.reason);
    const procedure = assignment.assignment.procedure;
    expect(procedure).toBeDefined();
    if (!procedure) throw new Error("Missing generic institutional context.");
    expect(procedure.bodies).toEqual([]);
    expect(procedure.votePlan).toEqual({});
    expect(procedure.governorAction).toBeNull();
    expect(procedure.recordedSittingEventId).toBeUndefined();
    expect(resolveTaxEnactmentInputContract(result.world, input).kind).toBe(
      "available",
    );
    // The appropriation sitting's recorded votes never enact a tax. Only the
    // owner-accepted revenue profile, bound to this exact filed text, is offered.
    expect(recordedSittingAvailable(result.world, input)).toBe(true);
    expect(recordedSittingOffer(result.world, input)?.profile).toBe(
      ALASKA_REVENUE_RECORDED_SITTING,
    );
    expect(readRecordedLegislativeSitting(result.world, input)).toBeNull();
    expect(serializeWorld(result.world)).toBe(bytes);
    expect(result.world.history.legislativeEnactments ?? []).toHaveLength(0);
    expect(result.world.history.taxCollections ?? []).toHaveLength(0);
    const admitted = prepareRecordedLegislativeSitting(result.world, {
      ...input,
      playerBallot: "present-not-voting",
    });
    const sitting = readRecordedLegislativeSitting(admitted, input)!;
    expect(sitting.votePlan).not.toEqual(
      legislativeBlueprint("alaska").votePlan,
    );
    expect(sitting.governorAction).toBe("signed");
    expect(sitting.recordedPlayerBallot).toBe("present-not-voting");
    expect(admitted.history.events.at(-1)!.context.choice).toBe(
      ALASKA_REVENUE_RECORDED_SITTING,
    );
    // Admission is recorded content, not law, a policy or money.
    expect(admitted.history.legislativeEnactments ?? []).toHaveLength(0);
    expect(admitted.history.taxPolicies ?? []).toHaveLength(0);
    expect(admitted.history.taxCollections ?? []).toHaveLength(0);
    expect(admitted.history.decisionTraces).toEqual(
      result.world.history.decisionTraces,
    );
    const reopened = deserializeWorld(serializeWorld(admitted));
    expect(readRecordedLegislativeSitting(reopened, input)).toEqual(sitting);
    // Amended text withholds the bound sitting rather than carrying it over.
    const amended = recordFiledProvision(admitted, {
      stableKey: "tax-input:admitted-then-amended",
      measureId: result.measureId,
      provisionKey: "unsupported-tax-addition",
      sectionNumber: 2,
      heading: "Explicit unsupported additional text",
      text: "This fictional extra clause has no supported F effect.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "Unsupported fixture text",
      },
      applicationScope: {
        jurisdictionId: result.jurisdictionId,
        segmentKey: null,
      },
    });
    expect(recordedSittingAvailable(amended, input)).toBe(false);
    expect(readRecordedLegislativeSitting(amended, input)).toBeNull();
  });
  it.each(["house", "senate"])(
    "files from the reconciled %s seat without introducing law, decisions or money",
    (chamber) => {
      const result = filed(chamber);
      const world = result.world;
      const bytes = serializeWorld(world);
      const context = resolveTaxEnactmentInputContract(world, {
        measureId: result.measureId,
        playerPersonId: result.personId,
      });
      expect(context.kind).toBe("available");
      if (context.kind !== "available") throw new Error(context.reason);
      expect(context.memberChamberKey).toBe(chamber);
      expect(context.contentIdentity.familyKey).toBe("tax-selective-excise");
      expect(context.requiredInputs).toContain(
        "bill-specific-executive-disposition",
      );
      expect(context.procedure).toBeNull();
      expect(world.history.legislativeMeasures!.at(-1)!.subjectClass).toBe(
        "revenue",
      );
      expect(world.history.legislativeEnactments ?? []).toHaveLength(0);
      expect(world.history.taxPolicies ?? []).toHaveLength(0);
      expect(world.history.taxCollections ?? []).toHaveLength(0);
      expect(world.history.decisionTraces).toEqual(
        result.beforeWorld.history.decisionTraces,
      );
      expect(
        fileTaxProposalFromOffice(world, {
          personId: result.personId,
          stableKey: "tax-input:explicit-proposal",
          terms: TEST_TAX_TERMS,
        }).world,
      ).toBe(world);
      expect(
        recordTaxDraftIdentity(world, world.history.taxProposals!.at(-1)!.id),
      ).toBe(world);
      expect(serializeWorld(world)).toBe(bytes);
      expect(
        resolveTaxEnactmentInputContract(deserializeWorld(bytes), {
          measureId: result.measureId,
          playerPersonId: result.personId,
        }),
      ).toEqual(context);
      assertWorldIntegrity(world);
    },
  );
  it("withholds after an ended member seat or another controlled character", () => {
    const result = filed();
    const input = {
      measureId: result.measureId,
      playerPersonId: result.personId,
    };
    expect(
      resolveTaxEnactmentInputContract(endSuppliedSeat(result.world), input)
        .kind,
    ).toBe("unavailable");
    expect(
      resolveTaxEnactmentInputContract(
        { ...result.world, control: { kind: "observer" } },
        input,
      ).kind,
    ).toBe("unavailable");
  });
  it("refuses tampered compiler/source/terms pins on import", () => {
    const result = filed();
    for (const alter of [
      (world: World) => {
        world.history.legislativeDraftLineages![0]!.familyVersion =
          "false-version";
      },
      (world: World) => {
        world.history.legislativeDraftLineages![0]!.parameters[0] = {
          ...world.history.legislativeDraftLineages![0]!.parameters[0]!,
          value: "false-source",
        };
      },
    ]) {
      const snapshot = JSON.parse(serializeWorld(result.world)) as {
        world: World;
        snapshotId: string;
      };
      alter(snapshot.world);
      snapshot.snapshotId = createStableId(
        "snapshot",
        canonicalJson(snapshot.world),
      );
      expect(() => deserializeWorld(JSON.stringify(snapshot))).toThrow(
        /Tax draft identity/,
      );
      expect(
        readFiledTaxContentIdentity(snapshot.world, result.measureId).kind,
      ).toBe("unavailable");
    }
  });
  it("withholds amended text without invalidating its append-only history", () => {
    const result = filed();
    const world = recordFiledProvision(result.world, {
      stableKey: "tax-input:additional-unsupported-clause",
      measureId: result.measureId,
      provisionKey: "unsupported-tax-addition",
      sectionNumber: 2,
      heading: "Explicit unsupported additional text",
      text: "This fictional extra clause has no supported F effect.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "Unsupported fixture text",
      },
      applicationScope: {
        jurisdictionId: result.jurisdictionId,
        segmentKey: null,
      },
    });
    assertWorldIntegrity(world);
    expect(readFiledTaxContentIdentity(world, result.measureId).kind).toBe(
      "unavailable",
    );
  });
  it("does not retroactively pin old tax saves or promote headless enactment into an ordinary sitting", () => {
    const fixture = enactedTaxFixture();
    expect(
      readFiledTaxContentIdentity(fixture.world, fixture.procedure.measureId)
        .kind,
    ).toBe("unavailable");
    expect(deserializeWorld(serializeWorld(fixture.world))).toEqual(
      fixture.world,
    );
    const result = filed();
    const later = advanceWorld(
      result.world,
      1,
      createTaxTransitionHandlerRegistry(),
    );
    expect(
      recordTaxDraftIdentity(later, later.history.taxProposals![0]!.id),
    ).toBe(later);
    expect(() =>
      recordTaxDraftIdentity(fixture.world, fixture.proposalId),
    ).toThrow(/filing/);
  });
});
