import { describe, expect, it } from "vitest";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import {
  declarePersonalTaxOccurrence,
  exactQuantityTaxRateInput,
  exactTaxQuantityInput,
} from "../presentation/tax-work";
import { makeIsoDate, makeSimulationMoment } from "./dates";
import { recordGovernorDecisionOnMeasure } from "./governing/legislative-clock";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
} from "./legislation";
import { createLegislativeScenario } from "./legislation-scenarios";
import { recordTaxDraftIdentity } from "./legislation-tax-identity";
import { lifePlaceStateIdentities } from "./life-places";
import { createProductionPolicyCatalog } from "./production-catalog";
import { MILEAGE_FEE_QUESTION } from "./public-budgets/road-usage-charge-constants";
import { createResourcePosition, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  attachTaxProposal,
  previewTax,
  taxPowerEvidenceFor,
  createTaxTransitionHandlerRegistry,
  assertTaxIntegrity,
} from "./tax-policy";
import { createWorld, advanceWorld, assertWorldIntegrity } from "./world";
import type { TaxTerms } from "./tax-types";

const TERMS: TaxTerms = {
  seriesKey: "tax:test-mileage",
  baseKey: "tax-base:test-vehicle-miles",
  baseLabel: "Vehicle miles (fixture)",
  baseUnit: "vehicle-mile",
  allowanceUnits: 0,
  allowanceMinorUnits: 0,
  rateNumerator: 2,
  rateDenominator: 1,
  currency: "USD",
  exemptBaseKeys: [],
  collectionLagDays: 2,
  publicPurpose: "Fixture road services",
  assumptionNote:
    "Explicit test levy at two cents per declared mile; no default or observed rate.",
  legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
};

function fixture() {
  const scenario = createLegislativeScenario("alaska");
  let world = createWorld({
    seed: scenario.world.seed,
    currentDate: makeIsoDate("2027-01-20"),
    control: scenario.world.control,
    jurisdictions: scenario.world.jurisdictionOrder.map(
      (id) => scenario.world.jurisdictions[id]!,
    ),
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    policyCatalog: createProductionPolicyCatalog(),
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === MILEAGE_FEE_QUESTION,
  )!;
  world = introduceMeasure(world, {
    stableKey: "mileage-test:measure",
    jurisdictionId: scenario.world.jurisdictionOrder[0]!,
    rulePackId: scenario.pack.packId,
    designation: "HB Fixture",
    shortTitle: "Fixture mileage levy",
    summary: "Controlled adopted terms.",
    origin: "member-introduction",
    subjectClass: "revenue",
    sponsorPersonId: scenario.playerPersonId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = attachTaxProposal(world, {
    stableKey: "mileage-test:proposal",
    measureId,
    sponsorPersonId: scenario.playerPersonId,
    power: taxPowerEvidenceFor(scenario.pack.jurisdictionKey)!,
    terms: TERMS,
  });
  const proposalId = world.history.taxProposals!.at(-1)!.id;
  world = recordTaxDraftIdentity(world, proposalId);
  for (
    let guard = 0;
    guard < 40 && measurePosition(world, measureId).phase !== "enacted";
    guard++
  ) {
    if (measurePosition(world, measureId).phase === "awaiting-executive") {
      world = recordGovernorDecisionOnMeasure(
        world,
        measureId,
        "signed",
        "Explicit fixture executive choice.",
      );
      continue;
    }
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) throw new Error("Fixture has no supported legislative step.");
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep({ ...scenario, measureId }, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).phase).toBe("enacted");
  const policy = world.history.taxPolicies!.at(-1)!;
  const before = world;
  // A controlled effective-date frontier, not elapsed generated-world proof.
  // Cancel unrelated fixture dues through their canonical writer before moving it.
  for (const due of world.history.futureDueItems) {
    if (
      futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled"
    )
      world = cancelFutureDueItem(world, {
        stableKey: `fixture:${due.id}:canceled`,
        dueItemId: due.id,
        effectiveAt: world.currentDate,
        reasonKey: "fixture:tax-period",
        context:
          "Controlled tax servicing fixture; unrelated scheduled activity is outside this test.",
      });
  }
  world = {
    ...world,
    currentDate: policy.effectiveAt,
    currentMoment: makeSimulationMoment({
      ...world.currentMoment,
      date: policy.effectiveAt,
    }),
  };
  world = createResourcePosition(world, {
    stableKey: "mileage-test:cash",
    owner: { kind: "person", personId: scenario.playerPersonId },
    openedAt: world.currentDate,
    openingBalance: money(10000, "USD"),
    provenance: { kind: "authored", note: "Known fixture cash." },
  });
  return {
    world,
    before,
    personId: scenario.playerPersonId,
    proposalId,
    measureId,
  };
}

const declaration = (f: ReturnType<typeof fixture>) => ({
  personId: f.personId,
  proposalId: f.proposalId,
  stableKey: "mileage-test:declaration",
  baseKey: TERMS.baseKey,
  quantity: { unit: "vehicle-mile" as const, units: 1000 },
  assumptionNote:
    "Explicit selected mileage declaration; no other resident is assigned driving.",
});

describe("mileage through the existing tax engine", () => {
  it("uses one registered quantity mechanism in all 56 places without treating miles as dollars", () => {
    expect(exactQuantityTaxRateInput("0.025")).toEqual({
      rateNumerator: 5,
      rateDenominator: 2,
    });
    expect(exactTaxQuantityInput("1000")).toBe(1000);
    expect(() => exactTaxQuantityInput("")).toThrow();
    expect(() => exactTaxQuantityInput("1.5")).toThrow();
    expect(
      previewTax(
        { ...TERMS, ...exactQuantityTaxRateInput("0.025") },
        TERMS.baseKey,
        { unit: "vehicle-mile", units: 1 },
      ),
    ).toMatchObject({ taxAmount: money(3, "USD") });
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    const catalog = createProductionPolicyCatalog();
    const question = Object.values(catalog.propositions).find(
      (row) => row.stableKey === MILEAGE_FEE_QUESTION,
    )!;
    expect(question.consequences?.[0]).toMatchObject({
      kind: "tax",
      what: "assess-enacted-tax-base",
    });
    for (const place of places) {
      expect(
        taxPowerEvidenceFor(place.jurisdictionKey),
        place.jurisdictionKey,
      ).toBeTruthy();
      expect(
        previewTax(TERMS, TERMS.baseKey, { unit: "vehicle-mile", units: 1000 }),
      ).toMatchObject({
        taxableAmount: { unit: "vehicle-mile", units: 1000 },
        taxAmount: money(2000, "USD"),
      });
    }
    expect(() =>
      previewTax(TERMS, TERMS.baseKey, money(1000, "USD")),
    ).toThrow();
    expect(() =>
      previewTax(
        { ...TERMS, baseUnit: undefined, allowanceUnits: undefined },
        TERMS.baseKey,
        { unit: "vehicle-mile", units: 1000 },
      ),
    ).toThrow();
    expect(
      previewTax({ ...TERMS, allowanceUnits: 100 }, TERMS.baseKey, {
        unit: "vehicle-mile",
        units: 1000,
      }),
    ).toMatchObject({ taxAmount: money(1800, "USD") });
    expect(
      previewTax(TERMS, "tax-base:not-covered", {
        unit: "vehicle-mile",
        units: 1000,
      }),
    ).toMatchObject({
      taxAmount: money(0, "USD"),
      exemptionReason: "excluded-base",
    });
  });
  it("counts only the explicit declaration and conserves named payer/public money through the one due collection and reload", () => {
    const f = fixture();
    expect(() =>
      declarePersonalTaxOccurrence(f.before, declaration(f)),
    ).toThrow(/not effective/);
    expect(f.world.history.taxBases ?? []).toEqual([]);
    let world = declarePersonalTaxOccurrence(f.world, declaration(f));
    expect(world.history.taxBases).toHaveLength(1);
    expect(world.history.taxBases![0]!.amount).toEqual({
      unit: "vehicle-mile",
      units: 1000,
    });
    expect(world.history.taxAssessments).toHaveLength(1);
    const assessment = world.history.taxAssessments![0]!;
    expect(assessment.taxAmount).toEqual(money(2000, "USD"));
    expect(assessment.lawEffectStamps![0]).toMatchObject({
      questionKey: MILEAGE_FEE_QUESTION,
      governingLawKey: f.measureId,
    });
    expect(declarePersonalTaxOccurrence(world, declaration(f))).toBe(world);
    expect(() =>
      declarePersonalTaxOccurrence(world, {
        ...declaration(f),
        quantity: { unit: "vehicle-mile", units: 1001 },
      }),
    ).toThrow(/overwritten/);
    const base = world.history.taxBases![0]!;
    expect(() =>
      assertTaxIntegrity(
        {
          ...world,
          history: {
            ...world.history,
            taxBases: [
              { ...base, amount: { unit: "vehicle-mile", units: 1001 } },
            ],
          },
        },
        new Set(),
      ),
    ).toThrow(/Invalid tax base occurrence/);
    world = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      2,
      createTaxTransitionHandlerRegistry(),
    );
    const collection = world.history.taxCollections![0]!;
    expect(collection.assessmentId).toBe(assessment.id);
    expect(collection.transferredAmount).toEqual(money(2000, "USD"));
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: f.personId },
        "USD",
      )!.liquidBalance,
    ).toEqual(money(8000, "USD"));
    const recipient = world.history.taxProposals![0]!.publicOrganizationId;
    expect(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId: recipient },
        "USD",
      )!.liquidBalance,
    ).toEqual(money(2000, "USD"));
    expect(world.history.taxCollections).toHaveLength(1);
    assertWorldIntegrity(world);
    expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  });
});
