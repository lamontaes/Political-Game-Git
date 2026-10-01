import { beforeAll, describe, expect, it } from "vitest";
import { federalTopRateTermsFixture } from "../../tests/fixtures/team6-tax-kind-fixture";
import {
  enactedTaxFixture,
  enactSecondTaxVersion,
  TEST_TAX_TERMS,
} from "../../tests/fixtures/tax-policy-fixture";
import { readFinalEnactedLawTerm } from "./governing/automatic-legislation";
import { lawInForce } from "./governing/law-in-force";
import { RAISE_TOP_FEDERAL_RATE_QUESTION } from "./federal-top-income-tax-law";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { advanceWorld, recordWorldEvent } from "./world";
import { daysBetween } from "./dates";
import {
  assessTaxBase,
  createTaxTransitionHandlerRegistry,
  recordTaxBase,
} from "./tax-policy";
import { money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";

// These fixtures exercise existing writers independently. They do not claim
// that an annual marginal income-tax threshold maps to an excise occurrence
// allowance, or that a generic tax-kind producer has been admitted.
let federal: ReturnType<typeof federalTopRateTermsFixture>;
beforeAll(() => {
  federal = federalTopRateTermsFixture();
});

describe("declared final federal tax terms", () => {
  it("reads the rate fraction and annual threshold from the enacted provision with exact source IDs", () => {
    const law = lawInForce(
      federal.world,
      NATIONAL_ELECTION_JURISDICTION.id,
      federal.propositionId,
      federal.world.currentDate,
      "enacted-only",
    )!;
    expect(law.measureId).toBe(federal.measureId);
    for (const [termKey, unit, value] of [
      ["rate", "ratio", federal.rate],
      ["threshold", "minor", federal.threshold],
    ] as const) {
      const term = readFinalEnactedLawTerm(federal.world, law, {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        termKey,
        unit,
      });
      expect(term).toMatchObject({
        value,
        unit,
        measureId: federal.measureId,
        provisionId: federal.provisionId,
      });
      expect(term!.sourceRecordIds).toEqual(
        expect.arrayContaining([
          federal.measureId,
          federal.provisionId,
          federal.world.history.legislativeEnactments!.at(-1)!.id,
        ]),
      );
    }
    expect(federal.rate).toBeLessThan(1);
    expect(federal.threshold).toBe(64_060_000);
    const reopened = deserializeWorld(serializeWorld(federal.world));
    expect(
      readFinalEnactedLawTerm(reopened, law, {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        termKey: "rate",
        unit: "ratio",
      }),
    ).toEqual(
      readFinalEnactedLawTerm(federal.world, law, {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        termKey: "rate",
        unit: "ratio",
      }),
    );
  });

  it("refuses different units or undeclared aliases instead of inferring a tax amount", () => {
    const law = lawInForce(
      federal.world,
      NATIONAL_ELECTION_JURISDICTION.id,
      federal.propositionId,
      federal.world.currentDate,
      "enacted-only",
    )!;
    expect(
      readFinalEnactedLawTerm(federal.world, law, {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        termKey: "rate",
        unit: "minor",
      }),
    ).toBeNull();
    expect(
      readFinalEnactedLawTerm(federal.world, law, {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        termKey: "threshold",
        unit: "ratio",
      }),
    ).toBeNull();
    expect(
      readFinalEnactedLawTerm(federal.world, law, {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        termKey: "rateNumerator",
        unit: "ratio",
      }),
    ).toBeNull();
    expect(federal.world.history.taxBases ?? []).toHaveLength(0);
    expect(federal.world.history.taxAssessments ?? []).toHaveLength(0);
  });
});

describe("existing tax occurrence and immutable assessment sequence", () => {
  it("requires an actual saved occurrence, assesses once, and preserves a completed assessment through later policy and reload", () => {
    const fixture = enactedTaxFixture();
    const policy = fixture.world.history.taxPolicies!.at(-1)!;
    let world = advanceWorld(
      fixture.world,
      daysBetween(fixture.world.currentDate, policy.effectiveAt),
      createTaxTransitionHandlerRegistry(),
    );
    const proposal = world.history.taxProposals!.at(-1)!;
    const before = serializeWorld(world);
    expect(() =>
      recordTaxBase(world, {
        stableKey: "team6-tax-kind:missing-event",
        jurisdictionId: proposal.jurisdictionId,
        payer: { kind: "person", personId: fixture.personId },
        baseKey: TEST_TAX_TERMS.baseKey,
        occurredAt: world.currentDate,
        amount: money(2100, "USD"),
        assumptionNote: "Explicit fixture base.",
        sourceEventId: fixture.personId,
      }),
    ).toThrow(/canonical occurrence/);
    expect(serializeWorld(world)).toBe(before);
    world = recordWorldEvent(world, {
      stableKey: "team6-tax-kind:actual-occurrence",
      type: "tax.declared-occurrence",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: proposal.jurisdictionId,
      involvedEntityIds: [fixture.personId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["tax"],
      summary:
        "Explicit existing excise fixture occurrence; not annual wages or an automatic sale.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const sourceEventId = world.history.events.at(-1)!.id;
    world = recordTaxBase(world, {
      stableKey: "team6-tax-kind:actual-base",
      jurisdictionId: proposal.jurisdictionId,
      payer: { kind: "person", personId: fixture.personId },
      baseKey: TEST_TAX_TERMS.baseKey,
      occurredAt: world.currentDate,
      amount: money(2100, "USD"),
      assumptionNote:
        "Existing explicitly authored excise fixture; no federal mapping inferred.",
      sourceEventId,
    });
    const base = world.history.taxBases!.at(-1)!;
    expect(base.sourceEventId).toBe(sourceEventId);
    expect(world.history.taxAssessments ?? []).toHaveLength(0);
    world = assessTaxBase(world, base.id, TEST_TAX_TERMS.seriesKey);
    const assessment = world.history.taxAssessments!.at(-1)!;
    expect(assessment).toMatchObject({
      baseId: base.id,
      policyId: policy.id,
      taxAmount: money(100, "USD"),
    });
    expect(assessment.sequence).toBeGreaterThan(base.sequence);
    expect(assessTaxBase(world, base.id, TEST_TAX_TERMS.seriesKey)).toBe(world);
    world = advanceWorld(
      world,
      TEST_TAX_TERMS.collectionLagDays,
      createTaxTransitionHandlerRegistry(),
    );
    const collection = world.history.taxCollections!.find(
      (row) => row.assessmentId === assessment.id,
    )!;
    expect(collection.status).toBe("collected");
    expect(collection.resourceOutcomeId).not.toBeNull();
    const changed = enactSecondTaxVersion(
      { ...fixture, world },
      { ...TEST_TAX_TERMS, rateNumerator: 10 },
    );
    const reopened = deserializeWorld(serializeWorld(changed.world));
    const repeated = assessTaxBase(reopened, base.id, TEST_TAX_TERMS.seriesKey);
    expect(repeated).toBe(reopened);
    expect(
      repeated.history.taxAssessments!.find((row) => row.id === assessment.id),
    ).toEqual(assessment);
    expect(
      repeated.history.taxCollections!.find((row) => row.id === collection.id),
    ).toEqual(collection);
    expect(
      repeated.history.resourceTransferOutcomes.find(
        (row) => row.id === collection.resourceOutcomeId,
      ),
    ).toEqual(
      world.history.resourceTransferOutcomes.find(
        (row) => row.id === collection.resourceOutcomeId,
      ),
    );
  });
});
