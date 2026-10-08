import { describe, expect, it } from "vitest";
import {
  createMileageLevyWorld as fixture,
  MILEAGE_TEST_TERMS as TERMS,
} from "../../tests/fixtures/mileage-levy-world";
import {
  declarePersonalTaxOccurrence,
  exactQuantityTaxRateInput,
  exactTaxQuantityInput,
} from "../presentation/tax-work";
import { lifePlaceStateIdentities } from "./life-places";
import { createProductionPolicyCatalog } from "./production-catalog";
import { MILEAGE_FEE_QUESTION } from "./public-budgets/road-usage-charge-constants";
import { money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  previewTax,
  taxPowerEvidenceFor,
  createTaxTransitionHandlerRegistry,
  assertTaxIntegrity,
} from "./tax-policy";
import { advanceWorld, assertWorldIntegrity } from "./world";

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
