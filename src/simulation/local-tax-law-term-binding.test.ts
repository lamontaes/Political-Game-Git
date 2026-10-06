import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
  type GovernmentUnitIdentity,
} from "./government-units";
import { lawInForce } from "./governing/law-in-force";
import { stableHash } from "./ids";
import { currentLifeCutoff } from "./life-queries";
import {
  localTaxAuthority,
  localTaxGovernment,
  localTaxPowerEvidenceFor,
  localTaxTermsQuestionKey,
  type LocalTaxInstrument,
} from "./local-tax-authority";
import { money } from "./resources";
import { bindTaxLawTerms } from "./tax-law-term-binding";
import { TAX_NUMERIC_LAW_TERMS } from "./tax-law-term-keys";
import { taxLevyText } from "./tax-policy";
import type { TaxTerms } from "./tax-types";
import type { EntityId, World } from "./types";

const id = (value: string) => value as EntityId;

/** Controlled read-only conversion records for a local government, as in the
 * state binder test: no real rate or taxable occurrence. */
function fixture(unit: GovernmentUnitIdentity, instrument: LocalTaxInstrument) {
  const government = localTaxGovernment(unit.id)!;
  const jurisdictionId = governmentUnitJurisdictionId(unit);
  const questionKey = localTaxTermsQuestionKey(government.level, instrument);
  const date = makeIsoDate("2026-10-01");
  const terms: TaxTerms = {
    seriesKey: "tax:local-binding-test",
    baseKey: "tax-base:local-binding-test",
    baseLabel: "Authored local binding-test occurrence",
    rateNumerator: 1,
    rateDenominator: 100,
    allowanceMinorUnits: 100,
    exemptBaseKeys: [],
    currency: money(0, "USD").currency,
    effectiveDelayDays: 90,
    collectionLagDays: 2,
    publicPurpose: "Authored test public services",
    assumptionNote: "Controlled conversion only.",
    legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
    instrument,
  };
  const identity = {
    kind: "local-government" as const,
    governmentKey: unit.id,
    jurisdictionId,
  };
  const proposal = {
    id: id("proposal"),
    stableKey: "local-binding-test:proposal",
    sequence: 4,
    recordedAt: date,
    measureId: id("measure"),
    sponsorPersonId: id("sponsor"),
    jurisdictionId,
    publicOrganizationId: id("recipient"),
    publicGovernmentIdentity: identity,
    power: localTaxPowerEvidenceFor({
      ...government,
      governmentKey: unit.id,
      instrument,
    }),
    gameProfileRef: null,
    terms,
    levyProvisionId: id("levy"),
  };
  const world = {
    id: "local-binding-test-world",
    currentDate: date,
    jurisdictions: { [jurisdictionId]: { id: jurisdictionId } },
    policyCatalog: {
      propositions: {
        question: { id: id("question"), stableKey: questionKey },
      },
    },
    history: {
      nextSequence: 20,
      taxProposals: [proposal],
      taxPolicies: [
        {
          id: id("policy"),
          proposalId: proposal.id,
          enactmentId: id("enactment"),
          sequence: 7,
          recordedAt: date,
          effectiveAt: date,
          supersedesPolicyId: null,
        },
      ],
      organizations: [
        {
          id: id("recipient"),
          stableKey: `public-government:local:${encodeURIComponent(unit.id)}`,
          sequence: 1,
          formedAt: date,
        },
      ],
      organizationProfiles: [
        {
          id: id("recipient-profile"),
          organizationId: id("recipient"),
          sequence: 2,
          effectiveAt: date,
          locationJurisdictionId: jurisdictionId,
        },
      ],
      legislativeMeasures: [
        {
          id: id("measure"),
          jurisdictionId,
          sequence: 3,
          propositionIds: [id("question")],
          propositionAnswers: [
            { propositionId: id("question"), answer: "yes" },
          ],
        },
      ],
      legislativeProvisions: [
        {
          id: id("levy"),
          provisionKey: "tax-levy",
          text: taxLevyText(terms),
          operativeEffect: { kind: "tax-policy" },
          measureId: id("measure"),
          sequence: 5,
          recordedAt: date,
          supersedesProvisionId: null,
          applicationScope: { jurisdictionId, segmentKey: null },
          lawTerms: TAX_NUMERIC_LAW_TERMS.map((entry) => ({
            questionKey,
            key: entry.key,
            unit: entry.unit,
            value: terms[entry.field],
          })),
        },
      ],
      legislativeEnactments: [
        {
          id: id("enactment"),
          measureId: id("measure"),
          sequence: 6,
          outcome: "enacted",
          resolvedAt: date,
          effectiveAt: date,
        },
      ],
      events: [],
      itemVetoes: [],
      policyProvisions: [],
    },
  } as unknown as World;
  const law = lawInForce(world, jurisdictionId, id("question"))!;
  return {
    world,
    questionKey,
    input: {
      law,
      questionKey,
      proposalId: proposal.id,
      onDate: world.currentDate,
      cutoff: currentLifeCutoff(world),
    },
  };
}

/** A government of the given type, in a state drawn by seed from every place. */
function drawUnit(
  seed: string,
  unitType: "county" | "municipality",
  keep: (stateUsps: string) => boolean = () => true,
) {
  const units = allGovernmentUnits().filter(
    (unit) =>
      unit.functionalActive &&
      unit.unitType === unitType &&
      keep(unit.stateUsps),
  );
  return units[parseInt(stableHash(seed).slice(0, 8), 16) % units.length]!;
}

const permitsPayroll = (usps: string) =>
  localTaxAuthority({
    stateUsps: usps,
    level: "MUNICIPALITY",
    instrument: "payroll",
  }).permits;

describe("one binder for a county or a city in any state", () => {
  it("binds a county property tax and a city payroll tax in two random places, saying how each was authorized", () => {
    const county = drawUnit("seam-binder-county", "county");
    const city = drawUnit("seam-binder-city", "municipality", permitsPayroll);
    for (const [unit, instrument] of [
      [county, "property"],
      [city, "payroll"],
    ] as const) {
      const f = fixture(unit, instrument);
      const before = JSON.stringify(f.world);
      const result = bindTaxLawTerms(f.world, f.input);
      const status = localTaxAuthority({
        ...localTaxGovernment(unit.id)!,
        instrument,
      });
      process.stderr.write(
        `LOCAL BINDER ${unit.stateUsps} ${unit.unitType} ${unit.id} ${instrument}: ${result.kind}, authority ${status.status} (${status.basis})\n`,
      );
      expect(result.kind).toBe("available");
      if (result.kind === "available")
        expect(result.publicGovernmentIdentity).toMatchObject({
          kind: "local-government",
          governmentKey: unit.id,
        });
      expect(JSON.stringify(f.world)).toBe(before);
    }
  });

  it("refuses a payroll tax where the state forbids the level, and says why", () => {
    const city = drawUnit(
      "seam-binder-refuse",
      "municipality",
      (usps) => !permitsPayroll(usps),
    );
    const f = fixture(city, "payroll");
    const result = bindTaxLawTerms(f.world, f.input);
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable")
      expect(result.reason).toContain("does not let this level");
  });

  it("refuses a tax that is not the question's tax, and a county question for a city", () => {
    const city = drawUnit("seam-binder-mismatch", "municipality");
    const f = fixture(city, "property");
    const wrongInstrument = {
      ...f.world,
      history: {
        ...f.world.history,
        taxProposals: f.world.history.taxProposals!.map((row) => ({
          ...row,
          terms: { ...row.terms, instrument: "sales" as const },
        })),
      },
    } as World;
    expect(bindTaxLawTerms(wrongInstrument, f.input).kind).toBe("unavailable");
    const county = drawUnit("seam-binder-mismatch-county", "county");
    const g = fixture(county, "property");
    const wrongLevel = {
      ...g.world,
      policyCatalog: {
        propositions: {
          question: {
            id: id("question"),
            stableKey: "us-tax-terms:city.property-tax-terms",
          },
        },
      },
    } as unknown as World;
    expect(
      bindTaxLawTerms(wrongLevel, {
        ...g.input,
        questionKey: "us-tax-terms:city.property-tax-terms",
      }).kind,
    ).toBe("unavailable");
  });
});
