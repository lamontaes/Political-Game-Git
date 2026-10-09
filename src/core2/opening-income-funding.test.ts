import { describe, expect, it } from "vitest";
import { isoDateFromParts } from "../simulation/dates";
import { seatOfGovernmentPlace } from "../simulation/life-places";
import { advanceDate } from "./calendar";
import {
  buildOpeningRetirementIncome,
  DEFAULT_OPENING_INCOME_DATA,
  type OpeningIncomeInput,
} from "./opening-income";
import {
  buildOpeningRetirementFunding,
  DEFAULT_OPENING_RETIREMENT_FUNDING_DATA as data,
  type OpeningRetirementFundingBuild,
  type OpeningRetirementFundingOptions,
} from "./opening-income-funding";
import { PARAMETERS, parameter as p, type Parameter } from "./parameters";
import { coreAPI, createCore } from "./state";
import { FINANCE_MODULE } from "./modules/finance";
import type {
  CoreInput,
  CoreState,
  OrganizationInput,
  PersonInput,
  Source,
} from "./types";

const startedAt = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Small authored finite-funding boundary fixture, not observed public accounts or actual 2021 awards.",
  estimatedFrom:
    "Fixture identities, dated school context and original cash records.",
};
const home = {
  id: "place:local-fixture",
  name: "Recorded Local Fixture",
  source,
};
const external = {
  id: "place:external-fixture",
  name: "Recorded External Fixture",
  source,
};
const retiredId = "person:retired-fixture",
  workerId = "person:owned-worker";
const options: OpeningRetirementFundingOptions = { contributorPlace: external };

function person(
  id: string,
  placeId = home.id,
  birthDate = "1950-02-20",
): PersonInput {
  const schoolYear = Number(birthDate.slice(0, 4)) + 14;
  return {
    id,
    givenName: "Preserved",
    familyName: id,
    birthDate,
    placeId,
    householdId: `${id}:household`,
    tier: "weekly",
    traits: { [DEFAULT_OPENING_INCOME_DATA.contextTrait]: p("zero") },
    traitSources: { [DEFAULT_OPENING_INCOME_DATA.contextTrait]: source },
    liquidMinor: p("minorPerDollar"),
    livingCostDailyMinor: p("one"),
    source,
    familyIds: [],
    knownIds: [],
    looks: { hair: "saved fixture appearance" },
    said: ["Saved original statement"],
    pastFacts: [
      {
        id: `${id}:school`,
        date: `${schoolYear}-08-26`,
        kind: "school:cohort-estimate",
        summary: "Saved estimated school cohort",
        source,
        facts: {
          stage: "high",
          schoolName: "Recorded Fixture School",
          placeId,
          attendance: "cohort-estimate",
        },
      },
    ],
  };
}

function rawFixture(
  people: readonly PersonInput[] = [
    person(retiredId),
    { ...person(workerId), jobId: "job:original" },
  ],
): CoreInput {
  return {
    seed: "finite-retirement-funding-fixture",
    startedAt,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: people.some((row) => row.id === workerId)
      ? [
          {
            id: "job:original",
            personId: workerId,
            organizationId: "organization:original-employer",
            title: "Preserved fixture job",
            wageDailyMinor: 1200,
            hoursDaily: 3,
            hourlyMinor: 400,
            source,
          },
        ]
      : [],
    workCommitments: people.some((row) => row.id === workerId)
      ? [
          {
            id: "commitment:original",
            jobId: "job:original",
            personId: workerId,
            organizationId: "organization:original-employer",
            startsAt: startedAt,
            anchorDate: startedAt,
            periodDays: 7,
            slots: [{ offsetDays: 1, startMinute: 480, minutes: 180 }],
            expectedWeeklyMinutes: 180,
            hourlyMinor: 400,
            scheduleSource: source,
            paySource: source,
          },
        ]
      : [],
    organizations: [
      {
        id: "organization:original-employer",
        placeId: home.id,
        name: "Preserved fixture employer",
        kind: "employer",
        liquidMinor: 10_000,
        source,
      },
    ],
    focusPersonIds: [people[p("zero")]!.id],
    focusPlaceIds: [],
    visiblePlaceIds: [home.id],
    calendarDates: [],
    gaps: ["Original fixture gap"],
  };
}

function incomeFixture(raw = rawFixture()): OpeningIncomeInput {
  const places = [...new Set(raw.people.map((row) => row.placeId))].map(
    (id) => ({ id, name: `${home.name} ${id}`, source }),
  );
  return buildOpeningRetirementIncome(raw, { places }).input;
}

function build(
  input = incomeFixture(),
  extra: OpeningRetirementFundingOptions = {},
): OpeningRetirementFundingBuild {
  return buildOpeningRetirementFunding(input, { ...options, ...extra });
}

function registry(
  key: string,
  value: number,
): Readonly<Record<string, Parameter>> {
  return { ...PARAMETERS, [key]: { ...PARAMETERS[key]!, value } };
}

function cash(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    p("zero"),
  );
}

function recordedContributor(liquidMinor: number): OrganizationInput {
  return {
    id: "organization:recorded-contributor",
    placeId: external.id,
    name: "Recorded finite public contribution account",
    kind: "government",
    liquidMinor,
    source,
  };
}

describe("finite source-qualified opening retirement funding", () => {
  it("derives its bounded envelope from saved award records and adds named finite external accounts without changing original WHO/PAST/work", () => {
    const input = incomeFixture();
    const snapshot = structuredClone(input);
    const result = build(input);
    expect(input).toEqual(snapshot);
    for (const key of [
      "people",
      "households",
      "jobs",
      "workCommitments",
      "focusPersonIds",
      "focusPlaceIds",
      "visiblePlaceIds",
      "calendarDates",
    ] as const)
      expect(result.input[key]).toBe(input[key]);
    for (const original of input.organizations)
      expect(
        result.input.organizations.find((row) => row.id === original.id),
      ).toBe(original);
    for (const original of input.finance!.contracts)
      expect(
        result.input.finance!.contracts.find((row) => row.id === original.id),
      ).toBe(original);
    expect(result.input.finance!.facilities).toBe(input.finance!.facilities);
    expect(result.input.finance!.businesses).toBe(input.finance!.businesses);
    const group = result.receipt.groups[p("zero")]!;
    const income = input.finance!.contracts.find(
      (row) => row.recipientIncome?.personId === retiredId,
    )!;
    expect(group.sourceAwardIds).toEqual([
      income.recipientIncome!.sourceFactId,
    ]);
    expect(group.personIds).toEqual([retiredId]);
    expect(group.savedCoveredMonthsByPerson[retiredId]).toBeGreaterThanOrEqual(
      p(DEFAULT_OPENING_INCOME_DATA.parameters.minimumCoveredMonths),
    );
    expect(result.receipt.nominalAnnualAwardsMinor).toBe(
      income.amountMinor * p("monthsPerYear"),
    );
    expect(result.receipt.boundedAnnualEnvelopeMinor).toBeLessThanOrEqual(
      result.receipt.nominalAnnualAwardsMinor,
    );
    expect(result.receipt.boundedAnnualEnvelopeMinor).toBeLessThanOrEqual(
      p(data.parameters.nationalAnnualOutlayMinor),
    );
    const contributor = result.receipt.contributorAccounts[p("zero")]!;
    expect(contributor.name).toContain(data.flowEvidence.publisher);
    expect(contributor.placeId).toBe(external.id);
    expect(contributor.source.tag).toBe("ESTIMATED");
    expect(contributor.source.generationPriorVintage).toBe(
      data.flowEvidence.sourceVintage,
    );
    expect(contributor.source.estimatedFrom).toContain(
      "not national reserve assets turned into cash",
    );
    expect(contributor.openingLiquidMinor).toBe(
      Math.floor(
        group.annualEnvelopeMinor * p(data.parameters.openingLiquidShare),
      ),
    );
    const term = result.input.finance!.contracts.find(
      (row) => row.id === group.contractId,
    )!;
    expect(term.payerIds).toEqual([contributor.id]);
    expect(term.payeeId).toBe(group.retirementPayerId);
    expect(term.recipientIncome).toBeUndefined();
    expect(term.householdId).toBeUndefined();
    expect(term.creditFacilityId).toBeUndefined();
    expect(term.interestFacilityId).toBeUndefined();
    expect(term.salesReceipt).toBe(false);
    expect(term.salesReceiptBudget).toBe(false);
    expect(term.accruesArrears).toBe(false);
    expect(term.settlementPhaseId).toBe(data.settlementPhaseId);
    expect(term.dueAt).toBe(income.dueAt);
    expect(term.endsAt).toBe("2022-02-01");
  });

  it("discloses every new stock once and keeps the existing retirement payer buffer separate", () => {
    const input = incomeFixture();
    const result = build(input);
    const originalCash =
      input.people.reduce((sum, row) => sum + row.liquidMinor, p("zero")) +
      input.organizations.reduce(
        (sum, row) => sum + row.liquidMinor,
        p("zero"),
      );
    const enrichedCash =
      result.input.people.reduce(
        (sum, row) => sum + row.liquidMinor,
        p("zero"),
      ) +
      result.input.organizations.reduce(
        (sum, row) => sum + row.liquidMinor,
        p("zero"),
      );
    expect(enrichedCash).toBe(
      originalCash + result.receipt.addedOpeningLiquidMinor,
    );
    expect(result.receipt.addedOpeningLiquidMinor).toBe(
      result.receipt.contributorAccounts
        .filter((row) => row.added)
        .reduce((sum, row) => sum + row.openingLiquidMinor, p("zero")),
    );
    const payer = input.organizations.find(
      (row) => row.id === result.receipt.groups[p("zero")]!.retirementPayerId,
    )!;
    expect(
      result.input.organizations.find((row) => row.id === payer.id)!
        .liquidMinor,
    ).toBe(payer.liquidMinor);
    expect(new Set(result.input.organizations.map((row) => row.id)).size).toBe(
      result.input.organizations.length,
    );
  });

  it("is independent of employer balances and preserves accounts/terms exactly on repeat enrichment", () => {
    const low = incomeFixture();
    const high = {
      ...low,
      organizations: low.organizations.map((row) =>
        row.id === "organization:original-employer"
          ? { ...row, liquidMinor: 1_000_000 }
          : row,
      ),
    };
    const first = build(low);
    expect(build(high).receipt.contributorAccounts).toEqual(
      first.receipt.contributorAccounts,
    );
    const second = build(first.input);
    expect(second.input).toEqual(first.input);
    expect(second.receipt.addedContractIds).toEqual([]);
    expect(second.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(second.receipt.contributorAccounts.every((row) => !row.added)).toBe(
      true,
    );
  });

  it("uses the canonical recorded seat for its default external location", () => {
    const actual = seatOfGovernmentPlace(data.contributorJurisdictionKey);
    expect(actual).not.toBeNull();
    const result = buildOpeningRetirementFunding(incomeFixture());
    expect(result.receipt.contributorAccounts[p("zero")]!.placeId).toBe(
      actual!.place.context.jurisdiction.id,
    );
  });

  it("performs conserving funding before actual recipient income through the existing writer, without sales or household-income double counting", () => {
    const result = build();
    const group = result.receipt.groups[p("zero")]!;
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core);
    const total = cash(core);
    const contributorBefore = core.organizations.get(
      group.contributorId,
    )!.liquidMinor;
    const payerBefore = core.organizations.get(
      group.retirementPayerId,
    )!.liquidMinor;
    const residentIncomeBefore = new Map(core.finance.paidIncomeByPlaceMonth);
    advanceDate(core, group.dueAt);
    const funding = api.settleFinanceContract(group.contractId);
    expect(funding.requestedMinor).toBe(group.monthlyFundingMinor);
    expect(funding.paidMinor).toBe(group.monthlyFundingMinor);
    expect(funding.payments[p("zero")]!.payerBeforeMinor).toBe(
      contributorBefore,
    );
    expect(funding.payments[p("zero")]!.payerAfterMinor).toBe(
      contributorBefore - funding.paidMinor,
    );
    expect(funding.payeeBeforeMinor).toBe(payerBefore);
    expect(funding.payeeAfterMinor).toBe(payerBefore + funding.paidMinor);
    expect(cash(core)).toBe(total);
    expect(core.finance.paidIncomeByPlaceMonth).toEqual(residentIncomeBefore);
    expect(core.finance.totalsByKind.get(data.contractKind)!.paidMinor).toBe(
      funding.paidMinor,
    );
    const income = result.input.finance!.contracts.find(
      (row) => row.recipientIncome?.personId === retiredId,
    )!;
    const personBefore = core.people.get(retiredId)!.liquidMinor;
    const paidIncome = api.settleFinanceContract(income.id);
    expect(core.people.get(retiredId)!.liquidMinor).toBe(
      personBefore + paidIncome.paidMinor,
    );
    expect(core.organizations.get(group.retirementPayerId)!.liquidMinor).toBe(
      funding.payeeAfterMinor - paidIncome.paidMinor,
    );
    expect(
      [...core.finance.paidIncomeByPlaceMonth.values()].reduce(
        (sum, amount) => sum + amount,
        p("zero"),
      ),
    ).toBe(paidIncome.paidMinor);
    expect(cash(core)).toBe(total);
  });

  it("allows partial then exhausted funding without inventing cash, refilling the contributor or creating debt", () => {
    const liquidShare = (p("one") + 0.5) / p("monthsPerYear");
    const result = build(incomeFixture(), {
      parameters: registry(data.parameters.openingLiquidShare, liquidShare),
    });
    const group = result.receipt.groups[p("zero")]!;
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core),
      total = cash(core);
    const openingStock = core.organizations.get(
      group.contributorId,
    )!.liquidMinor;
    advanceDate(core, "2021-02-01");
    const first = api.settleFinanceContract(group.contractId);
    advanceDate(core, "2021-03-01");
    const second = api.settleFinanceContract(group.contractId);
    advanceDate(core, "2021-04-01");
    const third = api.settleFinanceContract(group.contractId);
    expect(first.paidMinor).toBe(group.monthlyFundingMinor);
    expect(second.paidMinor).toBe(openingStock - first.paidMinor);
    expect(second.paidMinor).toBeGreaterThan(p("zero"));
    expect(second.unfundedMinor).toBe(second.requestedMinor - second.paidMinor);
    expect(third.paidMinor).toBe(p("zero"));
    expect(third.unfundedMinor).toBe(third.requestedMinor);
    for (const receipt of [first, second, third]) {
      expect(receipt.arrearsMinor).toBe(p("zero"));
      expect(receipt.creditReceiptId).toBeUndefined();
    }
    expect(core.finance.contracts.get(group.contractId)!.arrearsMinor).toBe(
      p("zero"),
    );
    expect(core.organizations.get(group.contributorId)!.liquidMinor).toBe(
      p("zero"),
    );
    expect(cash(core)).toBe(total);
    expect(core.finance.paidIncomeByPlaceMonth.size).toBe(p("zero"));
  });

  it("settles the DATA funding phase before recipient income when a supplied original retirement account starts with no cash", () => {
    const raw = rawFixture();
    const payer: OrganizationInput = {
      id: "organization:recorded-zero-retirement-payer",
      placeId: home.id,
      name: "Recorded zero-cash retirement paying account",
      kind: "public-institution",
      classification: "sector:recorded-retirement-paying-account",
      liquidMinor: p("zero"),
      source: {
        ...source,
        estimatedFrom:
          "Explicit technical opening zero-stock boundary; no runtime cash drain or shock.",
      },
    };
    raw.organizations = [...raw.organizations, payer];
    const input = buildOpeningRetirementIncome(raw, {
      places: [home],
      payerIdByPlace: { [home.id]: payer.id },
    }).input;
    const result = build(input),
      group = result.receipt.groups[p("zero")]!;
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core),
      total = cash(core);
    expect(core.organizations.get(payer.id)!.liquidMinor).toBe(p("zero"));
    advanceDate(core, group.dueAt);
    FINANCE_MODULE.onDay!(
      api,
      () => {
        throw new Error("Funding settlement must not request a decision.");
      },
      () => undefined,
    );
    const funding = core.finance.latestReceiptsByContract.get(
      group.contractId,
    )!;
    const incomeContract = input.finance!.contracts.find(
      (row) => row.recipientIncome?.personId === retiredId,
    )!;
    const income = core.finance.latestReceiptsByContract.get(
      incomeContract.id,
    )!;
    expect(funding.payeeBeforeMinor).toBe(p("zero"));
    expect(income.payments[p("zero")]!.payerBeforeMinor).toBe(
      funding.paidMinor,
    );
    expect(income.paidMinor).toBe(income.requestedMinor);
    expect(core.people.get(retiredId)!.liquidMinor).toBe(
      raw.people.find((row) => row.id === retiredId)!.liquidMinor +
        income.paidMinor,
    );
    expect(cash(core)).toBe(total);
  });

  it("funds a classified payer's recorded generic cash retirement award and preserves conservation", () => {
    const opening = incomeFixture();
    const contract = opening.finance!.contracts.find(
      (row) => row.recipientIncome?.personId === retiredId,
    )!;
    const awardId = contract.recipientIncome!.sourceFactId;
    const input = {
      ...opening,
      people: opening.people.map((row) =>
        row.id !== retiredId
          ? row
          : {
              ...row,
              pastFacts: row.pastFacts!.map((fact) =>
                fact.id !== awardId
                  ? fact
                  : {
                      ...fact,
                      kind: "income:monthly-award",
                      facts: {
                        ...fact.facts,
                        basis:
                          DEFAULT_OPENING_INCOME_DATA.recordedStandingBasis,
                        paymentMedium:
                          DEFAULT_OPENING_INCOME_DATA.recordedPaymentMedium,
                      },
                    },
              ),
            },
      ),
    };
    const result = build(input);
    const group = result.receipt.groups[p("zero")]!;
    expect(group.sourceAwardIds).toEqual([awardId]);
    expect(group.personIds).toEqual([retiredId]);
    expect(group.nominalRecipientMonthlyMinor).toBe(contract.amountMinor);
    expect(build(result.input).input).toEqual(result.input);
    const core = createCore(result.input, { modules: [] });
    const api = coreAPI(core),
      total = cash(core);
    advanceDate(core, group.dueAt);
    FINANCE_MODULE.onDay!(
      api,
      () => {
        throw new Error("Funding settlement must not request a decision.");
      },
      () => undefined,
    );
    expect(
      core.finance.latestReceiptsByContract.get(contract.id)!.paidMinor,
    ).toBe(contract.amountMinor);
    expect(cash(core)).toBe(total);
    for (const invalid of [
      { basis: "earned-work", paymentMedium: "cash" },
      { basis: "standing-entitlement", paymentMedium: "restricted-credit" },
    ]) {
      const bad = {
        ...input,
        people: input.people.map((row) =>
          row.id !== retiredId
            ? row
            : {
                ...row,
                pastFacts: row.pastFacts!.map((fact) =>
                  fact.id !== awardId
                    ? fact
                    : {
                        ...fact,
                        facts: { ...fact.facts, ...invalid },
                      },
                ),
              },
        ),
      };
      expect(() => build(bad)).toThrow(/cash standing-entitlement/);
    }
  });

  it("discloses a supplied new finite contributor once, ignores unused accounts and rejects same-day payment replay", () => {
    const input = incomeFixture();
    const payerId = input.finance!.contracts.find((row) => row.recipientIncome)!
      .payerIds[p("zero")]!;
    const contributor = recordedContributor(101);
    const unused = {
      ...recordedContributor(303),
      id: "organization:unused-contributor",
      name: "Unused recorded account",
    };
    const result = build(input, {
      recordedContributors: [contributor, unused],
      contributorIdByPayer: { [payerId]: contributor.id },
    });
    expect(result.receipt.addedOpeningLiquidMinor).toBe(
      contributor.liquidMinor,
    );
    expect(
      result.input.organizations.filter((row) => row.id === contributor.id),
    ).toHaveLength(p("one"));
    expect(result.input.organizations.some((row) => row.id === unused.id)).toBe(
      false,
    );
    const group = result.receipt.groups[p("zero")]!;
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core),
      total = cash(core);
    advanceDate(core, group.dueAt);
    const first = api.settleFinanceContract(group.contractId);
    expect(first.paidMinor).toBe(contributor.liquidMinor);
    const payerAfter = core.organizations.get(payerId)!.liquidMinor;
    expect(() => api.settleFinanceContract(group.contractId)).toThrow();
    expect(core.organizations.get(payerId)!.liquidMinor).toBe(payerAfter);
    expect(core.organizations.get(contributor.id)!.liquidMinor).toBe(p("zero"));
    expect(cash(core)).toBe(total);
  });

  it("uses an existing finite contributor once across distinct payer portfolios, respecting its shared cash limit", () => {
    const input = incomeFixture(
      rawFixture([
        person(retiredId),
        person("person:other-place", "place:other"),
      ]),
    );
    const contributor = recordedContributor(100);
    input.organizations = [...input.organizations, contributor];
    const payerIds = input.finance!.contracts.map(
      (row) => row.payerIds[p("zero")]!,
    );
    const result = build(input, {
      contributorIdByPayer: Object.fromEntries(
        payerIds.map((id) => [id, contributor.id]),
      ),
    });
    expect(result.receipt.groups).toHaveLength(2);
    expect(result.receipt.contributorAccounts).toHaveLength(p("one"));
    expect(result.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core),
      total = cash(core);
    advanceDate(core, "2021-02-01");
    const receipts = result.receipt.groups.map((row) =>
      api.settleFinanceContract(row.contractId),
    );
    expect(
      receipts.reduce((sum, receipt) => sum + receipt.paidMinor, p("zero")),
    ).toBe(contributor.liquidMinor);
    expect(core.organizations.get(contributor.id)!.liquidMinor).toBe(p("zero"));
    expect(receipts[p("one")]!.paidMinor).toBe(p("zero"));
    expect(cash(core)).toBe(total);
  });

  it("ends its one-year funding terms and removes future due work without refilling or expiring debt", () => {
    const result = build();
    const group = result.receipt.groups[p("zero")]!;
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core),
      total = cash(core);
    const [year, month, day] = group.dueAt.split("-").map(Number);
    let paid = p("zero");
    for (
      let offset = p("zero");
      offset < p("monthsPerYear");
      offset += p("one")
    ) {
      const monthIndex = month! - p("one") + offset;
      advanceDate(
        core,
        isoDateFromParts(
          year! + Math.floor(monthIndex / p("monthsPerYear")),
          (monthIndex % p("monthsPerYear")) + p("one"),
          day!,
        ),
      );
      const receipt = api.settleFinanceContract(group.contractId);
      paid += receipt.paidMinor;
      expect(receipt.arrearsMinor).toBe(p("zero"));
    }
    expect(paid).toBe(group.monthlyFundingMinor * p("monthsPerYear"));
    expect(
      [...core.finance.contractsDueAt.values()].some((ids) =>
        ids.has(group.contractId),
      ),
    ).toBe(false);
    advanceDate(core, group.endsAt);
    expect(() => api.settleFinanceContract(group.contractId)).toThrow();
    expect(cash(core)).toBe(total);
    expect(core.finance.contracts.has(group.contractId)).toBe(true);
  });

  it("caps the combined represented portfolios once, allocates integer budgets deterministically and never copies a full national flow into each place", () => {
    const input = incomeFixture(
      rawFixture([
        person(retiredId),
        person("person:other-place", "place:other"),
      ]),
    );
    const parameters = registry(
      data.parameters.nationalAnnualOutlayMinor,
      10_001,
    );
    const first = build(input, { parameters });
    const reversed = build(
      {
        ...input,
        people: [...input.people].reverse(),
        organizations: [...input.organizations].reverse(),
        finance: {
          ...input.finance!,
          contracts: [...input.finance!.contracts].reverse(),
        },
      },
      { parameters },
    );
    expect(first.receipt.boundedAnnualEnvelopeMinor).toBe(10_001);
    expect(first.receipt.allocatedAnnualEnvelopeMinor).toBeLessThanOrEqual(
      first.receipt.boundedAnnualEnvelopeMinor,
    );
    expect(first.receipt.scheduledFundingMinor).toBeLessThanOrEqual(
      first.receipt.allocatedAnnualEnvelopeMinor,
    );
    expect(first.receipt.addedOpeningLiquidMinor).toBe(
      first.receipt.allocatedAnnualEnvelopeMinor,
    );
    expect(first.receipt.unallocatedRoundingMinor).toBe(
      first.receipt.boundedAnnualEnvelopeMinor -
        first.receipt.allocatedAnnualEnvelopeMinor,
    );
    expect(reversed.receipt.groups).toEqual(first.receipt.groups);
    expect(reversed.receipt.contributorAccounts).toEqual(
      first.receipt.contributorAccounts,
    );
  });

  it("leaves birth-only/young inputs quiet and refuses to rescue an operating employer posing as a retirement payer", () => {
    const quietPerson = {
      ...person(retiredId),
      traits: {},
      traitSources: {},
      pastFacts: [],
    };
    const quietInput = incomeFixture(
      rawFixture([quietPerson, person("person:young", home.id, "1980-02-20")]),
    );
    const quiet = build(quietInput);
    expect(quiet.receipt.groups).toEqual([]);
    expect(quiet.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    const input = incomeFixture();
    const payee = input.finance!.contracts.find((row) => row.recipientIncome)!
      .payerIds[p("zero")]!;
    const wrong = {
      ...input,
      organizations: input.organizations.map((row) =>
        row.id === payee
          ? { ...row, classification: "enterprise:retail" }
          : row,
      ),
    };
    const result = build(wrong);
    expect(result.receipt.groups).toEqual([]);
    expect(result.receipt.ignoredIncomeContractIds).toHaveLength(p("one"));
    expect(result.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    const operating = {
      ...input,
      finance: {
        ...input.finance!,
        businesses: [
          {
            organizationId: payee,
            kindId: "fixture:operating-book",
            annualPayrollMinor: p("zero"),
            annualDemandMinor: p("one"),
            annualOtherCostsMinor: p("zero"),
            openingTownIncomeMinor: p("one"),
            capacityMinor: p("one"),
            price: p("one"),
            costContractIds: [],
            source,
          },
        ],
      },
    };
    expect(build(operating).receipt.groups).toEqual([]);
    expect(build(operating).receipt.addedOpeningLiquidMinor).toBe(p("zero"));
  });

  it("rejects contradictory award/covered-work references and contributor/contract ID reuse before returning an enriched input", () => {
    const income = incomeFixture();
    const recipient = income.finance!.contracts.find(
      (row) => row.recipientIncome,
    )!.recipientIncome!;
    const wrongPerson = income.people.map((row) =>
      row.id === recipient.personId
        ? {
            ...row,
            pastFacts: row.pastFacts!.map((fact) =>
              fact.id === recipient.sourceFactId
                ? {
                    ...fact,
                    facts: { ...fact.facts, payerId: "organization:absent" },
                  }
                : fact,
            ),
          }
        : row,
    );
    const bad = { ...income, people: wrongPerson };
    const snapshot = structuredClone(bad);
    expect(() => build(bad)).toThrow(/contradicts/);
    expect(bad).toEqual(snapshot);
    const wrongCovered = {
      ...income,
      people: income.people.map((row) => ({
        ...row,
        pastFacts: row.pastFacts?.map((fact) =>
          fact.kind === DEFAULT_OPENING_INCOME_DATA.generatedCoverageKind
            ? { ...fact, facts: { ...fact.facts, coveredMonths: "1" } }
            : fact,
        ),
      })),
    };
    expect(() => build(wrongCovered)).toThrow(/covered-work extent/);
    const first = build(income),
      contributorId = first.receipt.contributorAccounts[p("zero")]!.id,
      contractId = first.receipt.groups[p("zero")]!.contractId;
    const badContributor = {
      ...first.input,
      organizations: first.input.organizations.map((row) =>
        row.id === contributorId
          ? { ...row, liquidMinor: row.liquidMinor + p("one") }
          : row,
      ),
    };
    expect(() => build(badContributor)).toThrow(
      /Conflicting generated contributor ID/,
    );
    const badContract = {
      ...first.input,
      finance: {
        ...first.input.finance!,
        contracts: first.input.finance!.contracts.map((row) =>
          row.id === contractId ? { ...row, accruesArrears: true } : row,
        ),
      },
    };
    expect(() => build(badContract)).toThrow(
      /Conflicting retirement funding contract ID/,
    );
  });

  it("rejects unsafe totals, invalid liquidity and upper-calendar funding admission atomically", () => {
    const input = incomeFixture();
    const snapshot = structuredClone(input);
    expect(() =>
      build(input, {
        parameters: registry(data.parameters.openingLiquidShare, 1.1),
      }),
    ).toThrow(/allocation prior/);
    expect(input).toEqual(snapshot);
    const overflow = {
      ...input,
      organizations: input.organizations.map((row, index) => ({
        ...row,
        liquidMinor:
          index === p("zero") ? Number.MAX_SAFE_INTEGER : row.liquidMinor,
      })),
    };
    expect(() => build(overflow)).toThrow(/minor units/);
    const farFuture = {
      ...input,
      finance: {
        ...input.finance!,
        contracts: input.finance!.contracts.map((row) => ({
          ...row,
          dueAt: "9999-02-01",
        })),
      },
    };
    const farSnapshot = structuredClone(farFuture);
    expect(() => build(farFuture)).toThrow();
    expect(farFuture).toEqual(farSnapshot);
  });
});
