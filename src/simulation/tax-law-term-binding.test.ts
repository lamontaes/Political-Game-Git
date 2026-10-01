import { describe, expect, it } from "vitest";
import {
  bindTaxLawTerms,
  type ReadAdoptedTaxCategory,
} from "./tax-law-term-binding";
import { TAX_LAW_TERM_KEYS, TAX_NUMERIC_LAW_TERMS } from "./tax-law-term-keys";
import { currentLifeCutoff } from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import { taxPowerEvidenceFor } from "./tax-policy";
import { lawInForce } from "./governing/law-in-force";
import type { EntityId, World } from "./types";
import type { TaxTerms } from "./tax-types";

const questionKey = "us-tax-terms:state.excise-tax-terms";
const id = (value: string) => value as EntityId;

/** Controlled read-only conversion records, not naturally enacted taxes or
 * earned bases. Numeric queries use production adopted-text reading. The
 * category callback models the missing shared query contract explicitly.
 */
function fixture() {
  const jurisdiction = stateJurisdictionForKey("US-AK")!;
  const date = "2026-10-01";
  const terms: TaxTerms = {
    seriesKey: "tax:binding-test",
    baseKey: "tax-base:binding-test",
    baseLabel: "Authored binding-test occurrence",
    rateNumerator: 5,
    rateDenominator: 100,
    allowanceMinorUnits: 100,
    exemptBaseKeys: [],
    currency: "USD",
    effectiveDelayDays: 90,
    collectionLagDays: 2,
    publicPurpose: "Authored test public services",
    assumptionNote:
      "Controlled conversion only, no real rate or taxable occurrence.",
    legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
  };
  const proposal = {
    id: id("proposal"),
    stableKey: "binding-test:proposal",
    sequence: 4,
    recordedAt: date,
    measureId: id("measure"),
    sponsorPersonId: id("sponsor"),
    jurisdictionId: jurisdiction.id,
    publicOrganizationId: id("recipient"),
    power: taxPowerEvidenceFor("US-AK"),
    gameProfileRef: null,
    terms,
    levyProvisionId: id("levy"),
  };
  const world = {
    id: "binding-test-world",
    currentDate: date,
    jurisdictions: { [jurisdiction.id]: jurisdiction },
    policyCatalog: {
      propositions: {
        question: { id: id("question"), stableKey: questionKey },
      },
    },
    history: {
      nextSequence: 20,
      taxProposals: [proposal],
      organizations: [
        {
          id: id("recipient"),
          stableKey: `public-government:${jurisdiction.id}`,
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
          locationJurisdictionId: jurisdiction.id,
        },
      ],
      legislativeMeasures: [
        {
          id: id("measure"),
          jurisdictionId: jurisdiction.id,
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
          measureId: id("measure"),
          sequence: 5,
          recordedAt: date,
          supersedesProvisionId: null,
          applicationScope: {
            jurisdictionId: jurisdiction.id,
            segmentKey: null,
          },
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
      // Retained history must remain byte-identical even when a proposed binding fails.
      taxAssessments: [
        {
          id: "frozen-assessment",
          taxAmount: { minorUnits: 123, currency: "USD" },
        },
      ],
      taxCollections: [
        {
          id: "completed-collection",
          transferredAmount: { minorUnits: 123, currency: "USD" },
        },
      ],
    },
  } as unknown as World;
  const law = lawInForce(world, jurisdiction.id, id("question"))!;
  const input = {
    law,
    questionKey,
    proposalId: proposal.id,
    onDate: world.currentDate,
    cutoff: currentLifeCutoff(world),
  };
  const values: Record<string, readonly string[]> = {
    [TAX_LAW_TERM_KEYS.seriesKey]: [terms.seriesKey],
    [TAX_LAW_TERM_KEYS.baseKey]: [terms.baseKey],
    [TAX_LAW_TERM_KEYS.exemptBaseKeys]: [],
    [TAX_LAW_TERM_KEYS.publicOrganizationId]: [proposal.publicOrganizationId],
    [TAX_LAW_TERM_KEYS.governmentKey]: [],
  };
  const readCategory: ReadAdoptedTaxCategory = (_world, _law, request) =>
    Object.hasOwn(values, request.termKey)
      ? {
          values: values[request.termKey]!,
          measureId: proposal.measureId,
          provisionId: proposal.levyProvisionId,
          sourceRecordIds: [id("measure"), id("enactment"), id("levy")],
        }
      : null;
  return { world, input, terms, proposal, values, readCategory };
}

function expectUnavailable(
  result: ReturnType<typeof bindTaxLawTerms>,
  reason: string,
) {
  expect(result.kind).toBe("unavailable");
  if (result.kind === "unavailable") expect(result.reason).toContain(reason);
}

describe("adopted tax term consumer", () => {
  it("binds exact numeric units and declared categories to the actual saved proposal recipient without writes", () => {
    const f = fixture();
    const before = JSON.stringify(f.world);
    const result = bindTaxLawTerms(f.world, f.input, f.readCategory);
    expect(result).toEqual({
      kind: "available",
      terms: f.terms,
      proposalId: id("proposal"),
      publicOrganizationId: id("recipient"),
      publicGovernmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: f.proposal.jurisdictionId,
      },
      sourceRecordIds: [
        id("proposal"),
        id("recipient"),
        id("recipient-profile"),
        id("measure"),
        id("enactment"),
        id("levy"),
      ],
    });
    expect(bindTaxLawTerms(f.world, f.input, f.readCategory)).toEqual(result);
    expect(JSON.stringify(f.world)).toBe(before);
  });

  it("refuses the absent canonical category query and historical numeric signature", () => {
    const f = fixture();
    expectUnavailable(bindTaxLawTerms(f.world, f.input), "category");
    expectUnavailable(
      bindTaxLawTerms(
        f.world,
        {
          ...f.input,
          cutoff: { ...f.input.cutoff, historySequenceExclusive: 10 },
        },
        f.readCategory,
      ),
      "historical",
    );
    expectUnavailable(
      bindTaxLawTerms(
        f.world,
        { ...f.input, onDate: "2026-09-30" as World["currentDate"] },
        f.readCategory,
      ),
      "historical",
    );
    expectUnavailable(
      bindTaxLawTerms(
        f.world,
        { ...f.input, law: { ...f.input.law, origin: "in-force-at-start" } },
        f.readCategory,
      ),
      "Starting-law",
    );
  });

  it("does not substitute a missing allowance, a mismatched unit or a conflicting adopted numeric section", () => {
    for (const mutation of ["absent", "unit", "conflict"] as const) {
      const f = fixture();
      const section = f.world.history.legislativeProvisions![0]!;
      const allowance = section.lawTerms!.find(
        (term) => term.key === TAX_LAW_TERM_KEYS.allowanceMinorUnits,
      )!;
      const replacement = {
        ...section,
        lawTerms: section.lawTerms!.filter((term) => term !== allowance),
      };
      f.world = {
        ...f.world,
        history: {
          ...f.world.history,
          legislativeProvisions:
            mutation === "conflict"
              ? [section, { ...section, id: id("conflict"), sequence: 5 }]
              : [
                  {
                    ...replacement,
                    lawTerms:
                      mutation === "unit"
                        ? [
                            ...replacement.lawTerms,
                            { ...allowance, unit: "years" },
                          ]
                        : replacement.lawTerms,
                  },
                ],
        },
      };
      expectUnavailable(
        bindTaxLawTerms(f.world, f.input, f.readCategory),
        "numeric term",
      );
    }
  });

  it("refuses missing exemptions and invented or ambiguous recipients", () => {
    for (const mutation of [
      "missing-exemptions",
      "wrong-recipient",
      "ambiguous",
      "state-alias",
    ] as const) {
      const f = fixture();
      if (mutation === "missing-exemptions")
        delete f.values[TAX_LAW_TERM_KEYS.exemptBaseKeys];
      if (mutation === "wrong-recipient")
        f.values[TAX_LAW_TERM_KEYS.publicOrganizationId] = ["other"];
      if (mutation === "ambiguous")
        f.values[TAX_LAW_TERM_KEYS.seriesKey] = [
          f.terms.seriesKey,
          "tax:other",
        ];
      if (mutation === "state-alias")
        f.values[TAX_LAW_TERM_KEYS.governmentKey] = [
          "invented-local-government",
        ];
      expectUnavailable(
        bindTaxLawTerms(f.world, f.input, f.readCategory),
        mutation === "missing-exemptions" ? "categorical term" : "unambiguous",
      );
    }
  });

  it("refuses absent or closed saved public accounts", () => {
    for (const closed of [false, true]) {
      const f = fixture();
      f.world = {
        ...f.world,
        history: {
          ...f.world.history,
          organizations: closed ? f.world.history.organizations : [],
          organizationProfiles: f.world.history.organizationProfiles.map(
            (row) => ({
              ...row,
              closed: { reason: "test" } as NonNullable<typeof row.closed>,
            }),
          ),
        },
      };
      expectUnavailable(
        bindTaxLawTerms(f.world, f.input, f.readCategory),
        "actual public account",
      );
    }
  });

  it("refuses unsupported authority, a different law and wrong category provenance", () => {
    const f = fixture();
    expectUnavailable(
      bindTaxLawTerms(
        f.world,
        { ...f.input, questionKey: "us-tax-terms:state.income-tax-terms" },
        f.readCategory,
      ),
      "canonical tax question",
    );
    expectUnavailable(
      bindTaxLawTerms(
        f.world,
        { ...f.input, law: { ...f.input.law, measureId: id("other") } },
        f.readCategory,
      ),
      "belong",
    );
    expectUnavailable(
      bindTaxLawTerms(
        {
          ...f.world,
          history: {
            ...f.world.history,
            taxProposals: [{ ...f.proposal, power: null }],
          },
        },
        f.input,
        f.readCategory,
      ),
      "unsupported",
    );
    expectUnavailable(
      bindTaxLawTerms(f.world, f.input, (_world, _law, request) => ({
        ...f.readCategory(_world, _law, request)!,
        measureId: id("other"),
      })),
      "categorical term",
    );
  });

  it("validates exact shares and refuses adopted term repricing of the saved proposal", () => {
    for (const numerator of [101, 6]) {
      const f = fixture();
      f.world = {
        ...f.world,
        history: {
          ...f.world.history,
          legislativeProvisions: f.world.history.legislativeProvisions!.map(
            (row) => ({
              ...row,
              lawTerms: row.lawTerms!.map((term) =>
                term.key === TAX_LAW_TERM_KEYS.rateNumerator
                  ? { ...term, value: numerator }
                  : term,
              ),
            }),
          ),
        },
      };
      const before = JSON.stringify(f.world);
      expectUnavailable(
        bindTaxLawTerms(f.world, f.input, f.readCategory),
        numerator === 101 ? "valid existing" : "frozen",
      );
      expect(JSON.stringify(f.world)).toBe(before);
    }
  });

  it("binds an explicitly adopted zero rate without rewriting retained liabilities or payments", () => {
    const f = fixture();
    f.world = {
      ...f.world,
      history: {
        ...f.world.history,
        taxProposals: [
          { ...f.proposal, terms: { ...f.terms, rateNumerator: 0 } },
        ],
        legislativeProvisions: f.world.history.legislativeProvisions!.map(
          (row) => ({
            ...row,
            lawTerms: row.lawTerms!.map((term) =>
              term.key === TAX_LAW_TERM_KEYS.rateNumerator
                ? { ...term, value: 0 }
                : term,
            ),
          }),
        ),
      },
    };
    const before = JSON.stringify(f.world);
    const result = bindTaxLawTerms(f.world, f.input, f.readCategory);
    expect(result.kind).toBe("available");
    if (result.kind === "available") expect(result.terms.rateNumerator).toBe(0);
    expect(JSON.stringify(f.world)).toBe(before);
  });
});
