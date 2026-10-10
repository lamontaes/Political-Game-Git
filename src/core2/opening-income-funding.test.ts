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
  type OpeningRetirementFundingContract,
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
    "Small authored due-flow boundary fixture, not observed public accounts or actual 2021 awards.",
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

/** REVIEW15 invariant: local stock plus signed outside net flow stays constant. */
function cash(core: CoreState): number {
  const stock = [
    ...core.people.values(),
    ...core.organizations.values(),
  ].reduce((sum, row) => sum + row.liquidMinor, p("zero"));
  return [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (sum, row) => sum + row.netMinor,
    stock,
  );
}

function outsideNet(core: CoreState, ownerId: string): number {
  return core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor;
}

function recordedContributor(): OrganizationInput & { outsideFlow: Source } {
  return {
    id: "organization:recorded-contributor",
    placeId: external.id,
    name: "Recorded outside retirement payment flow",
    kind: "government",
    classification: data.contributorClassification,
    liquidMinor: p("zero"),
    source,
    outsideFlow: source,
    governmentFacts: {
      externalFlowKind: data.externalFlow.kind,
      externalFlowOwnerSubject: data.externalFlow.ownerSubject,
      openingCashBasis: data.externalFlow.openingCashBasis,
    },
  };
}

describe("source-qualified due retirement flows with zero opening stock", () => {
  it("links exact saved obligations to one zero-stock outside owner without changing original WHO/PAST/work", () => {
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
    expect(result.receipt.nominalMonthlyAwardsMinor).toBe(income.amountMinor);
    expect(result.receipt.scheduledMonthlyFundingMinor).toBe(
      result.receipt.nominalMonthlyAwardsMinor,
    );
    expect(group.incomeContractIds).toEqual([income.id]);
    const contributor = result.receipt.contributorAccounts[p("zero")]!;
    expect(contributor.name).toBe(data.contributorNameTemplate);
    expect(contributor.placeId).toBe(external.id);
    expect(contributor.source.tag).toBe("ESTIMATED");
    expect(contributor.source.generationPriorVintage).toBe(
      data.externalFlow.identityVintage,
    );
    expect(contributor.source.estimatedFrom).toContain(
      "supply no opening stock",
    );
    expect(contributor.openingLiquidMinor).toBe(p("zero"));
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
    expect(Object.hasOwn(term, "endsAt")).toBe(false);
    const inflow = (term as OpeningRetirementFundingContract).externalInflow;
    expect(inflow.ownerId).toBe(contributor.id);
    expect(inflow.sourceAwardIds).toEqual(group.sourceAwardIds);
    expect(inflow.incomeContractIds).toEqual(group.incomeContractIds);
    expect(inflow.source).toBe(term.source);
  });

  it("adds no retirement cash stock and preserves every original account exactly", () => {
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
      contributorBefore,
    );
    expect(outsideNet(core, group.contributorId)).toBe(-funding.paidMinor);
    expect(core.organizations.get(group.contributorId)!.liquidMinor).toBe(
      p("zero"),
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

  it("pays every genuine due obligation through signed outside flows while keeping outside stock zero", () => {
    const result = build();
    const group = result.receipt.groups[p("zero")]!;
    const income = result.input.finance!.contracts.find(
      (row) => row.recipientIncome,
    )!;
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core);
    const total = cash(core);
    const receipts = [];
    for (const at of ["2021-02-01", "2021-03-01", "2021-04-01"]) {
      advanceDate(core, at);
      receipts.push(api.settleFinanceContract(group.contractId));
      api.settleFinanceContract(income.id);
    }
    const [first, second, third] = receipts;
    expect(first!.paidMinor).toBe(group.monthlyFundingMinor);
    expect(second!.paidMinor).toBe(group.monthlyFundingMinor);
    expect(second!.paidMinor).toBeGreaterThan(p("zero"));
    expect(second!.unfundedMinor).toBe(
      second!.requestedMinor - second!.paidMinor,
    );
    expect(third!.paidMinor).toBe(group.monthlyFundingMinor);
    expect(third!.unfundedMinor).toBe(p("zero"));
    for (const receipt of receipts) {
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
    expect(core.finance.paidIncomeByPlaceMonth.size).toBe(receipts.length);
    expect(outsideNet(core, group.contributorId)).toBe(
      -receipts.reduce((sum, receipt) => sum + receipt.paidMinor, p("zero")),
    );
    expect(
      Object.hasOwn(
        result.input.finance!.contracts.find(
          (row) => row.id === group.contractId,
        )!,
        "endsAt",
      ),
    ).toBe(false);
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

  it("discloses a supplied zero-stock outside owner once, ignores unused rows and rejects same-day flow replay", () => {
    const input = incomeFixture();
    const payerId = input.finance!.contracts.find((row) => row.recipientIncome)!
      .payerIds[p("zero")]!;
    const contributor = recordedContributor();
    const unused = {
      ...recordedContributor(),
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
    expect(first.paidMinor).toBe(group.monthlyFundingMinor);
    expect(outsideNet(core, contributor.id)).toBe(-first.paidMinor);
    const payerAfter = core.organizations.get(payerId)!.liquidMinor;
    expect(() => api.settleFinanceContract(group.contractId)).toThrow();
    expect(core.organizations.get(payerId)!.liquidMinor).toBe(payerAfter);
    expect(core.organizations.get(contributor.id)!.liquidMinor).toBe(p("zero"));
    expect(cash(core)).toBe(total);
  });

  it("deduplicates one existing zero-stock outside owner across distinct due payer portfolios", () => {
    const input = incomeFixture(
      rawFixture([
        person(retiredId),
        person("person:other-place", "place:other"),
      ]),
    );
    const contributor = recordedContributor();
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
      api = coreAPI(core);
    const total = cash(core);
    advanceDate(core, "2021-02-01");
    const receipts = result.receipt.groups.map((row) =>
      api.settleFinanceContract(row.contractId),
    );
    const paid = receipts.reduce(
      (sum, receipt) => sum + receipt.paidMinor,
      p("zero"),
    );
    expect(paid).toBe(result.receipt.nominalMonthlyAwardsMinor);
    expect(core.organizations.get(contributor.id)!.liquidMinor).toBe(p("zero"));
    expect(receipts[p("one")]!.paidMinor).toBe(
      receipts[p("one")]!.requestedMinor,
    );
    expect(cash(core)).toBe(total);
    expect(outsideNet(core, contributor.id)).toBe(-paid);
    expect(
      new Set(result.receipt.groups.map((row) => row.contributorId)).size,
    ).toBe(p("one"));
  });

  it("continues genuine due funding beyond one year without an invented end or prepaid stock", () => {
    const result = build();
    const group = result.receipt.groups[p("zero")]!;
    const income = result.input.finance!.contracts.find(
      (row) => row.recipientIncome,
    )!;
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core);
    const total = cash(core);
    const [year, month, day] = group.dueAt.split("-").map(Number);
    let paid = p("zero");
    for (
      let offset = p("zero");
      offset <= p("monthsPerYear");
      offset += p("one")
    ) {
      const index = month! - p("one") + offset;
      advanceDate(
        core,
        isoDateFromParts(
          year! + Math.floor(index / p("monthsPerYear")),
          (index % p("monthsPerYear")) + p("one"),
          day!,
        ),
      );
      const receipt = api.settleFinanceContract(group.contractId);
      paid += receipt.paidMinor;
      api.settleFinanceContract(income.id);
      expect(receipt.arrearsMinor).toBe(p("zero"));
      expect(receipt.paidMinor).toBe(group.monthlyFundingMinor);
    }
    expect(paid).toBe(
      group.monthlyFundingMinor * (p("monthsPerYear") + p("one")),
    );
    expect(
      [...core.finance.contractsDueAt.values()].some((ids) =>
        ids.has(group.contractId),
      ),
    ).toBe(true);
    expect(
      core.finance.contracts.get(group.contractId)!.endsAt,
    ).toBeUndefined();
    expect(cash(core)).toBe(total);
    expect(core.finance.contracts.has(group.contractId)).toBe(true);
    expect(core.organizations.get(group.contributorId)!.liquidMinor).toBe(
      p("zero"),
    );
    expect(outsideNet(core, group.contributorId)).toBe(-paid);
  });

  it("sizes each flow from exact saved terms and ignores historical annual-flow and capital parameters", () => {
    const input = incomeFixture(
      rawFixture([
        person(retiredId),
        person("person:other-place", "place:other"),
      ]),
    );
    const parameters = {
      ...registry("openingRetirementFundingPublicAnnualOutlayMinor", p("one")),
      openingRetirementFundingEnvelopeShare: {
        ...PARAMETERS.openingRetirementFundingEnvelopeShare!,
        value: p("zero"),
      },
      openingRetirementFundingLiquidShare: {
        ...PARAMETERS.openingRetirementFundingLiquidShare!,
        value: p("one"),
      },
    };
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
    const due = input.finance!.contracts.reduce(
      (sum, row) => sum + row.amountMinor,
      p("zero"),
    );
    expect(first.receipt.nominalMonthlyAwardsMinor).toBe(due);
    expect(first.receipt.scheduledMonthlyFundingMinor).toBe(due);
    expect(
      first.receipt.groups.reduce(
        (sum, row) => sum + row.monthlyFundingMinor,
        p("zero"),
      ),
    ).toBe(due);
    expect(first.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(
      first.receipt.groups.every((row) => !Object.hasOwn(row, "endsAt")),
    ).toBe(true);
    expect(reversed.receipt.groups).toEqual(first.receipt.groups);
    expect(reversed.receipt.contributorAccounts).toEqual(
      first.receipt.contributorAccounts,
    );
    expect(first.receipt.parameterKeys).toEqual([data.parameters.periodMonths]);
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
      /Conflicting generated outside-flow owner ID/,
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

  it("rejects unsafe totals, wrong flow evidence and upper-calendar due admission atomically", () => {
    const input = incomeFixture();
    const snapshot = structuredClone(input);
    expect(() =>
      build(input, {
        data: {
          ...data,
          flowEvidence: { ...data.flowEvidence, financialKind: "CASH_STOCK" },
        },
      }),
    ).toThrow(/dated typed evidence/);
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
          dueAt: "9999-12-01",
        })),
      },
    };
    const farSnapshot = structuredClone(farFuture);
    expect(() => build(farFuture)).toThrow();
    expect(farFuture).toEqual(farSnapshot);
  });
  it("keeps one payer's distinct due schedules separate and refuses early outside funding", () => {
    const opening = incomeFixture(
      rawFixture([person(retiredId), person("person:later-schedule", home.id)]),
    );
    const input = {
      ...opening,
      finance: {
        ...opening.finance!,
        contracts: opening.finance!.contracts.map((row) =>
          row.recipientIncome?.personId === "person:later-schedule"
            ? { ...row, dueAt: "2021-02-10" }
            : row,
        ),
      },
    };
    const result = build(input);
    const first = result.receipt.groups.find(
      (row) => row.dueAt === "2021-02-01",
    )!;
    const later = result.receipt.groups.find(
      (row) => row.dueAt === "2021-02-10",
    )!;
    expect(result.receipt.groups).toHaveLength(2);
    expect(result.receipt.contributorAccounts).toHaveLength(p("one"));
    expect(first.retirementPayerId).toBe(later.retirementPayerId);
    expect(first.incomeContractIds).not.toEqual(later.incomeContractIds);
    for (const group of result.receipt.groups) {
      const matched = input.finance.contracts.filter((row) =>
        group.incomeContractIds.includes(row.id),
      );
      expect(group.monthlyFundingMinor).toBe(
        matched.reduce((sum, row) => sum + row.amountMinor, p("zero")),
      );
      expect(matched.every((row) => row.dueAt === group.dueAt)).toBe(true);
    }
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core);
    advanceDate(core, first.dueAt);
    const before = cash(core),
      netBefore = outsideNet(core, later.contributorId);
    expect(() => api.settleFinanceContract(later.contractId)).toThrow();
    expect(cash(core)).toBe(before);
    expect(outsideNet(core, later.contributorId)).toBe(netBefore);
    expect(core.organizations.get(first.retirementPayerId)!.liquidMinor).toBe(
      p("zero"),
    );
    const paid = api.settleFinanceContract(first.contractId);
    expect(paid.paidMinor).toBe(first.monthlyFundingMinor);
    expect(
      core.finance.contracts.get(later.contractId)!.lastSettledAt,
    ).toBeUndefined();
    expect(cash(core)).toBe(before);
  });

  it("copies only actual income ends and keeps another same-date award continuing", () => {
    const opening = incomeFixture(
      rawFixture([person(retiredId), person("person:continuing", home.id)]),
    );
    const input = {
      ...opening,
      finance: {
        ...opening.finance!,
        contracts: opening.finance!.contracts.map((row) =>
          row.recipientIncome?.personId === retiredId
            ? { ...row, endsAt: "2021-03-01" }
            : row,
        ),
      },
    };
    const result = build(input);
    const ended = result.receipt.groups.find((row) => row.endsAt)!;
    const continuing = result.receipt.groups.find((row) => !row.endsAt)!;
    expect(result.receipt.groups).toHaveLength(2);
    expect(ended.endsAt).toBe("2021-03-01");
    expect(Object.hasOwn(continuing, "endsAt")).toBe(false);
    expect(ended.retirementPayerId).toBe(continuing.retirementPayerId);
    const core = createCore(result.input, { modules: [] }),
      api = coreAPI(core);
    const total = cash(core);
    advanceDate(core, "2021-02-01");
    for (const group of result.receipt.groups)
      api.settleFinanceContract(group.contractId);
    for (const row of input.finance.contracts)
      api.settleFinanceContract(row.id);
    advanceDate(core, "2021-03-01");
    const netBefore = outsideNet(core, ended.contributorId);
    expect(() => api.settleFinanceContract(ended.contractId)).toThrow();
    expect(outsideNet(core, ended.contributorId)).toBe(netBefore);
    const paid = api.settleFinanceContract(continuing.contractId);
    expect(paid.paidMinor).toBe(continuing.monthlyFundingMinor);
    expect(core.organizations.get(continuing.contributorId)!.liquidMinor).toBe(
      p("zero"),
    );
    expect(cash(core)).toBe(total);
  });

  it("does not copy national cash or outgo into default outside stock across multiple payers", () => {
    const input = incomeFixture(
      rawFixture([
        person(retiredId),
        person("person:another-payer", "place:other"),
      ]),
    );
    const result = build(input);
    expect(result.receipt.groups).toHaveLength(2);
    expect(result.receipt.contributorAccounts).toHaveLength(p("one"));
    expect(
      result.receipt.contributorAccounts[p("zero")]!.openingLiquidMinor,
    ).toBe(p("zero"));
    expect(result.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(result.receipt.externalFlow.openingStockMinor).toBe(p("zero"));
    expect(
      result.receipt.groups.every(
        (row) => row.monthlyFundingMinor === row.nominalRecipientMonthlyMinor,
      ),
    ).toBe(true);
    expect(
      new Set(result.receipt.groups.map((row) => row.contributorId)).size,
    ).toBe(p("one"));
    expect(build(result.input).input).toEqual(result.input);
  });

  it("rejects stock-loaded or future-sourced outside owners before returning any enrichment", () => {
    const input = incomeFixture();
    const payerId = input.finance!.contracts[p("zero")]!.payerIds[p("zero")]!;
    for (const bad of [
      { ...recordedContributor(), liquidMinor: p("one") },
      {
        ...recordedContributor(),
        outsideFlow: { ...source, asOf: "2021-01-02" },
      },
      { ...recordedContributor(), governmentFacts: {} },
    ]) {
      const snapshot = structuredClone(input);
      expect(() =>
        build(input, {
          recordedContributors: [bad],
          contributorIdByPayer: { [payerId]: bad.id },
        }),
      ).toThrow();
      expect(input).toEqual(snapshot);
    }
    const doubled = incomeFixture(
      rawFixture([
        person(retiredId),
        person("person:another-payer", "place:other"),
      ]),
    );
    const owners = [
      recordedContributor(),
      { ...recordedContributor(), id: "organization:second-outside" },
    ];
    const ids = doubled.finance!.contracts.map(
      (row) => row.payerIds[p("zero")]!,
    );
    expect(() =>
      build(doubled, {
        recordedContributors: owners,
        contributorIdByPayer: {
          [ids[p("zero")]!]: owners[p("zero")]!.id,
          [ids[p("one")]!]: owners[p("one")]!.id,
        },
      }),
    ).toThrow(/one shared owner/);
  });
});
