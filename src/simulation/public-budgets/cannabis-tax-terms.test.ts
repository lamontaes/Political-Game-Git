import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { LawInForce } from "../governing/law-in-force";
import { taxLevyText } from "../tax-policy";
import { makeCurrencyCode } from "../resources";
import type { TaxTerms } from "../tax-types";
import type { EntityId, World } from "../types";
import { cannabisTaxTermsForLaw } from "./cannabis-tax-terms";

/** Authored contract identities and rates; not researched state tax values. */
const id = (value: string) => value as EntityId;
const date = makeIsoDate("2026-04-01");
const jurisdiction = id("jurisdiction_contract_fixture");
const law: LawInForce = {
  answer: "yes",
  measureId: id("measure_contract"),
  origin: "enacted",
  level: "state-statute",
  operativeAt: date,
  operativeBasis: "enacted-date",
};
const binding = {
  seriesKey: "fixture-cannabis-excise",
  baseKey: "fixture-legal-retail",
};
const terms: TaxTerms = {
  ...binding,
  baseLabel: "authored arithmetic fixture sales",
  rateNumerator: 7,
  rateDenominator: 100,
  exemptBaseKeys: [],
  allowanceMinorUnits: 0,
  currency: makeCurrencyCode("USD"),
  effectiveDelayDays: 0,
  collectionLagDays: 0,
  publicPurpose: "contract test",
  assumptionNote: "authored fixture, not source research",
  legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
};
function worldWith(value: TaxTerms = terms): World {
  return {
    currentDate: date,
    history: {
      taxProposals: [
        {
          id: id("proposal_contract"),
          measureId: law.measureId,
          jurisdictionId: jurisdiction,
          recordedAt: date,
          terms: value,
          levyProvisionId: id("levy_contract"),
        },
      ],
      taxPolicies: [
        {
          id: id("policy_contract"),
          proposalId: id("proposal_contract"),
          enactmentId: id("enactment_contract"),
          effectiveAt: date,
          recordedAt: date,
          sequence: 5,
        },
      ],
      legislativeEnactments: [
        {
          id: id("enactment_contract"),
          measureId: law.measureId,
          outcome: "enacted",
          resolvedAt: date,
        },
      ],
      legislativeProvisions: [
        {
          id: id("levy_contract"),
          measureId: law.measureId,
          sequence: 1,
          provisionKey: "tax-levy",
          sectionNumber: 1,
          recordedAt: date,
          supersedesProvisionId: null,
          text: taxLevyText(value),
          operativeEffect: { kind: "tax-policy" },
        },
      ],
    },
  } as unknown as World;
}
describe("exact cannabis enacted tax-term contract", () => {
  it("retains exact rational terms and governing source identities", () => {
    const world = worldWith();
    const before = JSON.stringify(world);
    const reading = cannabisTaxTermsForLaw(
      world,
      law,
      jurisdiction,
      binding,
      date,
    );
    expect(reading.status).toBe("operative");
    if (reading.status !== "operative")
      throw new Error("Expected operative terms");
    expect(reading.rateNumerator).toBe(7);
    expect(reading.rateDenominator).toBe(100);
    expect(reading.sourceRecordIds).toEqual([
      law.measureId,
      id("enactment_contract"),
      id("proposal_contract"),
      id("levy_contract"),
      id("policy_contract"),
    ]);
    expect(JSON.stringify(world)).toBe(before);
    expect(
      cannabisTaxTermsForLaw(
        JSON.parse(before),
        law,
        jurisdiction,
        binding,
        date,
      ),
    ).toEqual(reading);
  });
  it("does not turn a declaration, starting yes/no or unknown authorization into a tax rate", () => {
    expect(
      cannabisTaxTermsForLaw(worldWith(), null, jurisdiction, binding, date)
        .status,
    ).toBe("unknown-authorization");
    expect(
      cannabisTaxTermsForLaw(
        worldWith(),
        { ...law, origin: "in-force-at-start" },
        jurisdiction,
        binding,
        date,
      ).status,
    ).toBe("starting-terms-not-established");
    expect(
      cannabisTaxTermsForLaw(worldWith(), law, jurisdiction, null, date).status,
    ).toBe("series-not-bound");
    expect(
      cannabisTaxTermsForLaw(
        worldWith(),
        { ...law, answer: "no" },
        jurisdiction,
        binding,
        date,
      ).status,
    ).toBe("sales-not-authorized");
  });
  it("rejects unbound measures, wrong bases and a levy changed without a supported revision", () => {
    expect(
      cannabisTaxTermsForLaw(
        worldWith(),
        { ...law, measureId: id("different_measure") },
        jurisdiction,
        binding,
        date,
      ).status,
    ).toBe("measure-binding-mismatch");
    expect(
      cannabisTaxTermsForLaw(
        worldWith(),
        law,
        jurisdiction,
        { ...binding, baseKey: "other_base" },
        date,
      ).status,
    ).toBe("measure-binding-mismatch");
    const world = worldWith();
    const revised = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [
          ...world.history.legislativeProvisions!,
          {
            ...world.history.legislativeProvisions![0]!,
            id: id("levy_revised"),
            sequence: 2,
            supersedesProvisionId: id("levy_contract"),
            text: "different operative levy",
          },
        ],
      },
    };
    expect(
      cannabisTaxTermsForLaw(revised, law, jurisdiction, binding, date).status,
    ).toBe("adopted-levy-mismatch");
  });
  it("keeps missing/future policies separate from an explicit zero rate and refuses unmodeled allowances", () => {
    const world = worldWith();
    expect(
      cannabisTaxTermsForLaw(
        { ...world, history: { ...world.history, taxPolicies: [] } },
        law,
        jurisdiction,
        binding,
        date,
      ).status,
    ).toBe("tax-policy-not-operative");
    expect(
      cannabisTaxTermsForLaw(
        worldWith({ ...terms, rateNumerator: 0 }),
        law,
        jurisdiction,
        binding,
        date,
      ).status,
    ).toBe("operative");
    expect(
      cannabisTaxTermsForLaw(
        worldWith({ ...terms, allowanceMinorUnits: 100 }),
        law,
        jurisdiction,
        binding,
        date,
      ).status,
    ).toBe("unsupported-aggregate-base");
    expect(
      cannabisTaxTermsForLaw(
        worldWith(),
        { ...law, operativeAt: makeIsoDate("2027-01-01") },
        jurisdiction,
        binding,
        date,
      ).status,
    ).toBe("unknown-authorization");
  });
});
