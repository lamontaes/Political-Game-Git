import {
  compactGeneratedHouseholdSource,
  resolveGeneratedHouseholdSourceFromInput,
} from "./generated-household-source";
import { describe, expect, it } from "vitest";
import { estimatedMonthlyHouseholdLivingCosts } from "../simulation/living-costs-data";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "./business-books";
import type {
  CreditFacilityInput,
  FinanceContractInput,
} from "./finance-types";
import { advanceCore, createLifeCore } from "./life";
import { financeNextDate } from "./finance-state";
import {
  createOpeningFinance,
  DEFAULT_OPENING_FINANCE_DATA,
  type OpeningFinanceOptions,
} from "./opening-finance";
import { parameter as p, PARAMETERS } from "./parameters";
import { createOpeningPurchaseCalendar } from "./opening-purchase-calendar";
import { buildOpeningCustomers } from "./opening-customers";
import { OPENING_CUSTOMER_QUALIFICATION_PREFIX } from "./opening-customer-qualification";
import { coreAPI } from "./state";
import type { CoreInput, Source } from "./types";

const at = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: at,
  citation:
    "Controlled opening-binding fixture; not an observed firm, household bill, bank approval, or generated-world outcome.",
  estimatedFrom:
    "Fixture amounts use already registered unit constants; source priors and crosswalks remain marked estimates/open stopgaps.",
};

function fixture(): CoreInput {
  const firms = [
    { id: "store", classification: "enterprise:retail" },
    { id: "kitchen", classification: "enterprise:food-service" },
    { id: "supply", classification: "enterprise:wholesale" },
    { id: "auto", classification: "enterprise:repair" },
    { id: "bank", classification: "enterprise:banking" },
    { id: "school", classification: "service:school" },
    { id: "community", classification: "community:organizing-nonprofit" },
    { id: "unmapped", classification: "enterprise:fixture-unmapped" },
    {
      id: "nonprofit-retail",
      classification: "enterprise:retail",
      kind: "nonprofit",
    },
    {
      id: "public-retail",
      classification: "enterprise:retail",
      governmentFacts: { governmentKind: "municipal" },
    },
  ];
  const people = firms.map((firm) => ({
    id: `worker:${firm.id}`,
    givenName: "Fixture",
    familyName: firm.id,
    birthDate: "1980-01-01",
    placeId: "fixture-place",
    householdId: `household:${firm.id}`,
    tier: "weekly",
    traits: {},
    liquidMinor: p("minorPerDollar") * p("daysPerMeanYear"),
    livingCostDailyMinor: p("minorPerDollar") * p("daysPerWeek"),
    source,
    familyIds: [],
    knownIds: [],
    jobId: `job:${firm.id}`,
  }));
  // Cash is an integer in the fixture even though the registered mean year is not.
  for (const person of people)
    person.liquidMinor = Math.round(person.liquidMinor);
  const jobs = people.map((person, index) => ({
    id: person.jobId,
    personId: person.id,
    organizationId: firms[index]!.id,
    title: "Recorded fixture role",
    wageDailyMinor: p("minorPerDollar"),
    hoursDaily: p("one"),
    hourlyMinor: p("minorPerDollar"),
    source,
  }));
  return {
    seed: "controlled-opening-binding",
    startedAt: at,
    people,
    households: people.map((person) => ({
      id: person.householdId,
      placeId: person.placeId,
      memberIds: [person.id],
      source,
    })),
    organizations: firms.map((firm) => ({
      ...firm,
      placeId: "fixture-place",
      name: `Existing ${firm.id}`,
      kind: firm.kind ?? "employer",
      liquidMinor: p("minorPerDollar") * p("monthsPerYear"),
      source,
    })),
    jobs,
    workCommitments: jobs.map((job) => ({
      id: `commitment:${job.id}`,
      jobId: job.id,
      personId: job.personId,
      organizationId: job.organizationId,
      startsAt: at,
      anchorDate: at,
      periodDays: p("one"),
      slots: [
        {
          offsetDays: p("zero"),
          startMinute: p("zero"),
          minutes: p("minutesPerHour"),
        },
      ],
      expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
      hourlyMinor: p("minorPerDollar"),
      scheduleSource: source,
      paySource: source,
    })),
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function options(overrides: OpeningFinanceOptions = {}): OpeningFinanceOptions {
  return { regionByPlace: { "fixture-place": "national" }, ...overrides };
}

describe("opening finance bindings (fixtures only, no settlement writer)", () => {
  it("preserves every input identity/family/job/cash row and emits no loan, receipt, or phantom landlord", () => {
    const input = fixture(),
      before = structuredClone(input),
      result = createOpeningFinance(input, options());
    expect(input).toEqual(before);
    expect(result.facilities).toEqual([]);
    expect(result).not.toHaveProperty("receipts");
    expect(result.contracts.some((row) => row.kind.includes("housing"))).toBe(
      false,
    );
    expect(result.gaps.some((row) => row.includes("HUD-housing"))).toBe(true);
    for (const contract of result.contracts) {
      expect(contract.amountMinor).toBeGreaterThan(p("zero"));
      expect(Number.isSafeInteger(contract.amountMinor)).toBe(true);
      expect(contract.dueAt).toBe("2021-01-02");
      expect(contract.accruesArrears).toBe(false);
      expect(contract.source.tag).toBe("ESTIMATED");
      expect(
        input.organizations.some((row) => row.id === contract.payeeId),
      ).toBe(true);
      expect(contract.payerIds).not.toContain(contract.payeeId);
    }
  });

  it("does not put public, nonprofit, bank, or unknown organizations through corporate priors", () => {
    const result = createOpeningFinance(fixture(), options());
    const excluded = [
      "school",
      "community",
      "bank",
      "unmapped",
      "public-retail",
      "nonprofit-retail",
    ];
    for (const id of excluded) {
      expect(result.businesses.some((row) => row.organizationId === id)).toBe(
        false,
      );
      expect(result.contracts.some((row) => row.payeeId === id)).toBe(false);
    }
    expect(
      result.gaps.some((row) =>
        row.includes("actual-institution-budget-required:public-retail"),
      ),
    ).toBe(true);
  });

  it("binds only each admitted CEX component, caps the assigned household plan, and leaves missing supplier mass unbound", () => {
    const input = fixture(),
      result = createOpeningFinance(input, options());
    for (const household of input.households) {
      const members = input.people.filter(
        (row) => row.householdId === household.id,
      );
      const total = result.contracts
        .filter((row) => row.householdId === household.id)
        .reduce(
          (sum, row) => sum + row.amountMinor / row.periodMonths,
          p("zero"),
        );
      const assigned = Math.round(
        (members.reduce(
          (sum, row) => sum + row.livingCostDailyMinor,
          p("zero"),
        ) *
          p("daysPerMeanYear")) /
          p("monthsPerYear"),
      );
      expect(total).toBeLessThanOrEqual(assigned);
      expect(total).toBeLessThanOrEqual(
        estimatedMonthlyHouseholdLivingCosts("national", members.length)
          .monthlyMinor,
      );
    }
    expect(result.gaps.some((row) => row.endsWith(":gasoline"))).toBe(true);
    expect(
      result.contracts.some((row) => row.kind === "household.gasoline"),
    ).toBe(false);
    expect(result.contracts.some((row) => row.kind === "household.drugs")).toBe(
      false,
    );
    expect(
      result.contracts.some(
        (row) =>
          row.kind === "business.sales-input" && row.payeeId === "supply",
      ),
    ).toBe(true);
  });

  it("uses actual active slot/hourly terms for planned payroll and names a calendar-wage fallback", () => {
    const input = fixture(),
      commitments = input.workCommitments!;
    const store = commitments.find((row) => row.organizationId === "store")!;
    const changed = {
      ...input,
      workCommitments: commitments.map((row) =>
        row.id === store.id
          ? { ...row, hourlyMinor: row.hourlyMinor * p("two") }
          : row,
      ),
    };
    const original = createOpeningFinance(input, options()).businesses.find(
      (row) => row.organizationId === "store",
    )!;
    const higher = createOpeningFinance(changed, options()).businesses.find(
      (row) => row.organizationId === "store",
    )!;
    expect(original.annualPayrollMinor).toBe(
      Math.round(p("minorPerDollar") * p("daysPerMeanYear")),
    );
    expect(higher.annualPayrollMinor).toBe(
      Math.round(p("minorPerDollar") * p("two") * p("daysPerMeanYear")),
    );
    const ended = {
      ...input,
      workCommitments: commitments.map((row) =>
        row.id === store.id
          ? { ...row, startsAt: "2020-01-01", endsAt: "2020-12-31" }
          : row,
      ),
    };
    const endedResult = createOpeningFinance(ended, options());
    expect(endedResult.gaps).toContain(
      "opening-finance:no-active-recorded-work-plan:store",
    );
    expect(
      endedResult.businesses.find((row) => row.organizationId === "store")!
        .annualPayrollMinor,
    ).toBe(p("zero"));
    const noSchedule = createOpeningFinance(
      { ...input, workCommitments: undefined },
      options(),
    );
    expect(noSchedule.gaps).toContain(
      "opening-finance:calendar-wage-proxy-without-recorded-schedule:store",
    );
  });

  it("uses inclusive opening-day commitment end dates and rounds fractional calendar-wage estimates only once", () => {
    const input = fixture(),
      store = input.workCommitments!.find(
        (row) => row.organizationId === "store",
      )!;
    const oneDay = {
      ...input,
      workCommitments: input.workCommitments!.map((row) =>
        row.id === store.id ? { ...row, startsAt: at, endsAt: at } : row,
      ),
    };
    const sameDay = createOpeningFinance(oneDay, options()).businesses.find(
      (row) => row.organizationId === "store",
    )!;
    expect(sameDay.annualPayrollMinor).toBeGreaterThan(p("zero"));
    const fractional = {
      ...input,
      workCommitments: undefined,
      jobs: input.jobs.map((row) =>
        row.id === "job:store"
          ? { ...row, wageDailyMinor: p("one") + p("one") / p("two") }
          : row,
      ),
    };
    const fallback = createOpeningFinance(
      fractional,
      options(),
    ).businesses.find((row) => row.organizationId === "store")!;
    expect(fallback.annualPayrollMinor).toBe(
      Math.round((p("one") + p("one") / p("two")) * p("daysPerMeanYear")),
    );
  });

  it("excludes historical and unowned jobs from recorded, scheduled, and calendar-wage payroll", () => {
    const input = fixture(),
      storeJob = input.jobs.find((row) => row.id === "job:store")!;
    const withoutStoreSchedule = (value: CoreInput) => ({
      ...value,
      workCommitments: value.workCommitments?.filter(
        (row) => row.jobId !== storeJob.id,
      ),
    });
    const ended = withoutStoreSchedule({
      ...input,
      people: input.people.map((row) =>
        row.id === storeJob.personId ? { ...row, jobId: undefined } : row,
      ),
      jobs: input.jobs.map((row) =>
        row.id === storeJob.id ? { ...row, endsAt: "2020-12-31" } : row,
      ),
    });
    const endedResult = createOpeningFinance(
      ended,
      options({
        recordedAnnualPay: [
          { jobId: storeJob.id, annualMinor: p("minorPerDollar"), source },
        ],
      }),
    );
    expect(
      endedResult.businesses.find((row) => row.organizationId === "store")!
        .annualPayrollMinor,
    ).toBe(p("zero"));
    expect(endedResult.gaps).toContain(
      "opening-finance:historical-or-unowned-job-excluded-from-opening-payroll:store",
    );
    const unowned = withoutStoreSchedule({
      ...input,
      people: input.people.map((row) =>
        row.id === storeJob.personId ? { ...row, jobId: undefined } : row,
      ),
    });
    const unownedResult = createOpeningFinance(unowned, options());
    expect(
      unownedResult.businesses.find((row) => row.organizationId === "store")!
        .annualPayrollMinor,
    ).toBe(p("zero"));
    const unownedSchedule = {
      ...input,
      people: input.people.map((row) =>
        row.id === storeJob.personId ? { ...row, jobId: undefined } : row,
      ),
    };
    expect(() => createOpeningFinance(unownedSchedule, options())).toThrow(
      /current owned job/,
    );
  });

  it("validates active periodic work terms using the actual work-writer quantities and wrap overlap", () => {
    const input = fixture(),
      store = input.workCommitments!.find(
        (row) => row.organizationId === "store",
      )!;
    const replaceStore = (
      commitment: NonNullable<CoreInput["workCommitments"]>[number],
    ) => ({
      ...input,
      workCommitments: input.workCommitments!.map((row) =>
        row.id === store.id ? commitment : row,
      ),
    });
    const invalid = [
      { ...store, hourlyMinor: p("one") + p("one") / p("two") },
      { ...store, slots: [] },
      { ...store, slots: [{ ...store.slots[0]!, minutes: p("zero") }] },
      {
        ...store,
        slots: [
          {
            ...store.slots[0]!,
            minutes: p("hoursPerDay") * p("minutesPerHour") + p("one"),
          },
        ],
      },
      {
        ...store,
        periodDays: p("one"),
        slots: [
          {
            offsetDays: p("zero"),
            startMinute:
              p("hoursPerDay") * p("minutesPerHour") - p("minutesPerHour"),
            minutes: p("two") * p("minutesPerHour"),
          },
          {
            offsetDays: p("zero"),
            startMinute: p("minutesPerHour") / p("two"),
            minutes: p("minutesPerHour"),
          },
        ],
      },
    ];
    for (const commitment of invalid)
      expect(() =>
        createOpeningFinance(replaceStore(commitment), options()),
      ).toThrow();
  });

  it("retains a supplied real landlord and finite recorded loan without altering either participant's cash", () => {
    const input = fixture(),
      before = structuredClone(input);
    const housing: FinanceContractInput = {
      id: "recorded-lease",
      householdId: "household:store",
      payerIds: ["worker:store"],
      payeeId: "worker:auto",
      kind: "household.housing",
      amountMinor: p("minorPerDollar"),
      dueAt: "2021-02-01",
      periodMonths: p("one"),
      accruesArrears: true,
      source,
    };
    const facility: CreditFacilityInput = {
      id: "recorded-line",
      borrowerId: "store",
      lenderId: "bank",
      limitMinor: p("minorPerDollar") * p("daysPerWeek"),
      active: true,
      annualInterestParameter: "zero",
      source,
    };
    const result = createOpeningFinance(
      input,
      options({ recordedContracts: [housing], recordedFacilities: [facility] }),
    );
    expect(result.contracts.find((row) => row.id === housing.id)).toEqual(
      housing,
    );
    expect(result.facilities).toEqual([facility]);
    expect(
      result.businesses.find((row) => row.organizationId === "store")!
        .creditFacilityId,
    ).toBe(facility.id);
    expect(input).toEqual(before);
    expect(result).not.toHaveProperty("borrowedMinor");
  });

  it("keeps a primary credit preference on retained books and gaps an ambiguous primary across real lines", () => {
    const input = fixture();
    const facility: CreditFacilityInput = {
      id: "recorded-line",
      borrowerId: "store",
      lenderId: "bank",
      limitMinor: p("minorPerDollar") * p("daysPerWeek"),
      active: true,
      annualInterestParameter: "zero",
      source,
    };
    const first = createOpeningFinance(
      input,
      options({ recordedFacilities: [facility] }),
    );
    const retained = {
      ...input,
      finance: {
        ...first,
        businesses: first.businesses.map((row) =>
          row.organizationId === "store"
            ? { ...row, creditFacilityId: undefined }
            : row,
        ),
      },
    };
    const singleLine = createOpeningFinance(retained, options());
    expect(
      singleLine.businesses.find((row) => row.organizationId === "store")!
        .creditFacilityId,
    ).toBe(facility.id);

    const secondFacility: CreditFacilityInput = {
      ...facility,
      id: "recorded-line-2",
      lenderId: "supply",
    };
    const twoLines = {
      ...retained,
      finance: {
        ...retained.finance!,
        facilities: [...retained.finance!.facilities, secondFacility],
      },
    };
    const ambiguous = createOpeningFinance(twoLines, options());
    expect(
      ambiguous.businesses.find((row) => row.organizationId === "store")!
        .creditFacilityId,
    ).toBeUndefined();
    expect(ambiguous.gaps).toContain(
      "opening-finance:multiple-recorded-facilities-need-explicit-primary-binding:store",
    );
    const explicit = createOpeningFinance(
      twoLines,
      options({
        creditFacilityIdByOrganization: { store: secondFacility.id },
      }),
    );
    expect(
      explicit.businesses.find((row) => row.organizationId === "store")!
        .creditFacilityId,
    ).toBe(secondFacility.id);
  });

  it("requires actual participants and source dates rather than quietly inventing providers, approval, or back bills", () => {
    const input = fixture();
    const terms: FinanceContractInput = {
      id: "invalid-terms",
      payerIds: ["store"],
      payeeId: "missing-supplier",
      kind: "fixture-cost",
      amountMinor: p("minorPerDollar"),
      dueAt: "2021-02-01",
      periodMonths: p("one"),
      accruesArrears: false,
      source,
    };
    expect(() =>
      createOpeningFinance(input, options({ recordedContracts: [terms] })),
    ).toThrow(/existing distinct cash participants/);
    expect(() =>
      createOpeningFinance(
        input,
        options({ recordedContracts: [{ ...terms, payeeId: "store" }] }),
      ),
    ).toThrow(/actual eligible participant/);
    expect(() =>
      createOpeningFinance(
        input,
        options({
          recordedContracts: [
            { ...terms, payeeId: "supply", dueAt: "2020-12-01" },
          ],
        }),
      ),
    ).toThrow(/opening-arrears adapter/);
    expect(() =>
      createOpeningFinance(
        input,
        options({
          recordedContracts: [
            {
              ...terms,
              payeeId: "supply",
              source: { ...source, asOf: "2021-02-01" },
            },
          ],
        }),
      ),
    ).toThrow(/nonfuture source/);
  });

  it("admits a new classified supplier through data without inventing an organization or changing a place branch", () => {
    const input = fixture(),
      classification = "enterprise:fixture-new-food-provider";
    const changed = {
      ...input,
      organizations: input.organizations.map((row) =>
        row.id === "store" ? { ...row, classification } : row,
      ),
    };
    const modified = createOpeningFinance(
      changed,
      options({
        data: {
          ...DEFAULT_OPENING_FINANCE_DATA,
          categories: DEFAULT_OPENING_FINANCE_DATA.categories.map((row) =>
            row.key === "food"
              ? {
                  ...row,
                  supplierClassifications: [
                    ...row.supplierClassifications,
                    classification,
                  ],
                }
              : row,
          ),
        },
        books: {
          data: {
            ...DEFAULT_BUSINESS_BOOKS_DATA,
            classifications: [
              ...DEFAULT_BUSINESS_BOOKS_DATA.classifications,
              {
                classification,
                kindId: "retail",
                fundingRoute: "business",
                citation: "Explicit mod-data boundary fixture.",
                stopgapId: "SG-P8-business-books-classification",
              },
            ],
          },
        },
      }),
    );
    expect(
      modified.contracts.some(
        (row) => row.kind === "household.food" && row.payeeId === "store",
      ),
    ).toBe(true);
    expect(
      createOpeningFinance(changed, options()).contracts.some(
        (row) => row.payeeId === "store",
      ),
    ).toBe(false);
  });

  it("retains supplied category budgets without generating a duplicate component and starts a December opening on its next advanced day", () => {
    const input = fixture(),
      supplied: FinanceContractInput = {
        id: "known-food-budget",
        householdId: "household:store",
        payerIds: ["worker:store"],
        payeeId: "kitchen",
        kind: "household.food",
        amountMinor: p("minorPerDollar"),
        dueAt: "2021-02-01",
        periodMonths: p("one"),
        accruesArrears: false,
        source,
      };
    const result = createOpeningFinance(
      input,
      options({ recordedContracts: [supplied] }),
    );
    expect(
      result.contracts.filter(
        (row) =>
          row.householdId === supplied.householdId &&
          row.kind === supplied.kind,
      ),
    ).toEqual([supplied]);
    const december = createOpeningFinance(
      { ...input, startedAt: "2021-12-15" },
      options(),
    );
    expect(new Set(december.contracts.map((row) => row.dueAt))).toEqual(
      new Set(["2021-12-16"]),
    );
  });

  it("preserves supplied dated conditions without filling a trajectory or using a future condition at opening", () => {
    const input = fixture(),
      condition = {
        id: "recorded-later-condition",
        placeId: "fixture-place",
        at: "2021-03-01",
        generalPriceFactor: p("one"),
        wagePriceFactor: p("one"),
        macroDemandFactor: p("two"),
        source: { ...source, asOf: "2021-03-01" },
      };
    const before = structuredClone(input);
    const ordinary = createOpeningFinance(input, options());
    const result = createOpeningFinance(
      input,
      options({ conditions: [condition] }),
    );
    expect(result.conditions).toEqual([condition]);
    expect(result.businesses).toEqual(ordinary.businesses);
    expect(result.contracts).toEqual(ordinary.contracts);
    expect(input).toEqual(before);
    expect(() =>
      createOpeningFinance(
        input,
        options({
          conditions: [{ ...condition, generalPriceFactor: p("zero") }],
        }),
      ),
    ).toThrow(/finite and positive/);
    expect(() =>
      createOpeningFinance(
        input,
        options({
          conditions: [
            { ...condition, source: { ...source, asOf: "2021-03-02" } },
          ],
        }),
      ),
    ).toThrow(/source available/);
  });

  it("reuses already-bound opening contracts/books without replacing their source or accumulating new terms", () => {
    const input = fixture(),
      first = createOpeningFinance(input, options());
    const enriched = { ...input, finance: first },
      before = structuredClone(enriched);
    const again = createOpeningFinance(enriched, options());
    expect(again.contracts).toEqual(first.contracts);
    expect(again.businesses).toEqual(first.businesses);
    expect(again.facilities).toEqual(first.facilities);
    expect(enriched).toEqual(before);
  });
});

describe("estimated opening purchase calendar (controlled fixtures, no world evidence)", () => {
  it("gives fresh household and business budgets a positive within-January date with explicit estimated provenance and no source-year end", () => {
    const input = fixture(),
      before = structuredClone(input),
      result = createOpeningFinance(input, options()),
      calendar = DEFAULT_OPENING_FINANCE_DATA.openingPurchaseCalendar;
    expect(calendar.householdFirstDueRule).toBe(
      "first-recorded-income-calendar-date-after-opening",
    );
    expect(calendar.source.tag).toBe("ESTIMATED");
    expect(result.contracts.some((row) => row.householdId)).toBe(true);
    expect(
      result.contracts.some((row) => row.kind === "business.sales-input"),
    ).toBe(true);
    expect(result.gaps).toContain(calendar.stopgapId);
    for (const contract of result.contracts) {
      expect(contract.dueAt).toBe("2021-01-02");
      expect(contract.amountMinor).toBeGreaterThan(p("zero"));
      expect(contract.periodMonths).toBe(p("openingFinancePeriodMonths"));
      expect(contract).not.toHaveProperty("endsAt");
      expect(contract.source.asOf).toBe(input.startedAt);
      expect(contract.source.citation).toContain(
        "DATA openingPurchaseCalendar.source",
      );
      expect(contract.source.estimatedFrom).toContain(
        contract.householdId
          ? calendar.recurringHouseholdDueRule
          : calendar.businessFirstDueRule,
      );
      expect(contract.source.estimatedFrom).toContain(calendar.stopgapId);
    }
    expect(input).toEqual(before);
  });

  it("settles actual finite-cash household purchases on the first advanced January day exactly once", () => {
    const input = fixture(),
      finance = createOpeningFinance(input, options()),
      core = createLifeCore({ ...input, finance }, { scheduledWork: false }),
      totalCash = () =>
        [...core.people.values(), ...core.organizations.values()].reduce(
          (sum, row) => sum + row.liquidMinor,
          p("zero"),
        ),
      beforeMinor = totalCash();
    expect(core.date).toBe(at);
    expect(core.finance.latestReceiptsByContract.size).toBe(p("zero"));
    const firstAdvance = advanceCore(core, "2021-01-02");
    const householdReceipts = finance.contracts
      .filter((row) => row.householdId !== undefined)
      .map((row) => core.finance.latestReceiptsByContract.get(row.id)!);
    expect(firstAdvance.simulatedDays).toBe(p("one"));
    expect(firstAdvance.decisions).toBe(p("zero"));
    expect(householdReceipts.length).toBeGreaterThan(p("zero"));
    expect(
      householdReceipts.reduce((sum, row) => sum + row.paidMinor, p("zero")),
    ).toBeGreaterThan(p("zero"));
    for (const receipt of householdReceipts) {
      expect(receipt.date).toBe("2021-01-02");
      const term = core.finance.contracts.get(receipt.contractId)!;
      expect(term.firstDueAt).toBe("2021-01-02");
      expect(term.dueAt).toBe("2021-02-02");
      expect(term.lastSettledAt).toBe("2021-01-02");
      expect(term.arrearsMinor).toBe(p("zero"));
    }
    expect(totalCash()).toBe(beforeMinor);
    const settled = structuredClone([...core.finance.latestReceiptsByContract]);
    advanceCore(core, "2021-01-03");
    expect([...core.finance.latestReceiptsByContract]).toEqual(settled);
    expect(totalCash()).toBe(beforeMinor);
  });

  it("preserves a supplied future budget's actual due, end, amount, cadence, billing day and Source", () => {
    const input = fixture(),
      supplied: FinanceContractInput = {
        id: "recorded-future-food-term",
        householdId: "household:store",
        payerIds: ["worker:store"],
        payeeId: "kitchen",
        kind: "household.food",
        amountMinor: p("minorPerDollar"),
        dueAt: "2021-02-19",
        endsAt: "2021-11-19",
        periodMonths: p("two"),
        accruesArrears: false,
        salesReceipt: true,
        source,
      },
      finance = createOpeningFinance(
        input,
        options({ recordedContracts: [supplied] }),
      ),
      core = createLifeCore({ ...input, finance }, { scheduledWork: false }),
      term = core.finance.contracts.get(supplied.id)!;
    expect(finance.contracts.find((row) => row.id === supplied.id)).toEqual(
      supplied,
    );
    expect(term.firstDueAt).toBe(supplied.dueAt);
    expect(term.endsAt).toBe(supplied.endsAt);
    expect(term.billingDay).toBe(new Date(supplied.dueAt).getUTCDate());
    expect(
      financeNextDate(
        coreAPI(core),
        term.dueAt,
        term.periodMonths,
        term.billingDay,
      ),
    ).toBe("2021-04-19");
    advanceCore(core, "2021-01-02");
    expect(term.dueAt).toBe(supplied.dueAt);
    expect(term.lastSettledAt).toBeUndefined();
    expect(core.finance.latestReceiptsByContract.has(supplied.id)).toBe(false);
    expect(term.source).toEqual(supplied.source);
    expect(term.source.estimatedFrom).not.toContain(
      "opening purchase-calendar",
    );
  });

  it.each([
    ["2021-12-31", "2022-01-01"],
    ["2024-02-28", "2024-02-29"],
    ["2024-02-29", "2024-03-01"],
  ])(
    "uses the exact next calendar day for %s without generating a statistical-year expiry",
    (startedAt, dueAt) => {
      const input = { ...fixture(), startedAt },
        before = structuredClone(input),
        result = createOpeningFinance(input, options());
      expect(result.contracts.length).toBeGreaterThan(p("zero"));
      expect(new Set(result.contracts.map((row) => row.dueAt))).toEqual(
        new Set([dueAt]),
      );
      expect(result.contracts.every((row) => row.endsAt === undefined)).toBe(
        true,
      );
      expect(input).toEqual(before);
    },
  );

  it("retains the generated first-due billing day through a short month and returns to the original day", () => {
    const input = { ...fixture(), startedAt: "2021-01-30" },
      finance = createOpeningFinance(input, options()),
      core = createLifeCore({ ...input, finance }, { scheduledWork: false }),
      api = coreAPI(core),
      term = [...core.finance.contracts.values()][p("zero")]!;
    expect(term.firstDueAt).toBe("2021-01-31");
    expect(term.billingDay).toBe(new Date(term.firstDueAt).getUTCDate());
    const february = financeNextDate(
      api,
      term.firstDueAt,
      term.periodMonths,
      term.billingDay,
    );
    expect(february).toBe("2021-02-28");
    expect(
      financeNextDate(api, february, term.periodMonths, term.billingDay),
    ).toBe("2021-03-31");
  });

  it("keeps the existing multi-month amount and cadence while the generated first due remains the next day", () => {
    const input = fixture(),
      monthly = createOpeningFinance(input, options()),
      periodMonths = p("two"),
      registry = {
        ...PARAMETERS,
        openingFinancePeriodMonths: {
          ...PARAMETERS.openingFinancePeriodMonths!,
          value: periodMonths,
        },
      },
      multiple = createOpeningFinance(
        input,
        options({ books: { parameters: registry } }),
      );
    expect(multiple.contracts.map((row) => row.id)).toEqual(
      monthly.contracts.map((row) => row.id),
    );
    for (const term of multiple.contracts) {
      const prior = monthly.contracts.find((row) => row.id === term.id)!;
      expect(term.dueAt).toBe("2021-01-02");
      expect(term.periodMonths).toBe(periodMonths);
      expect(term.amountMinor).toBe(
        (prior.amountMinor * periodMonths) / prior.periodMonths,
      );
      expect(term.payerIds).toEqual(prior.payerIds);
      expect(term.payeeId).toBe(prior.payeeId);
      expect(term.accruesArrears).toBe(prior.accruesArrears);
    }
  });

  it("rejects missing, unsupported, unregistered or falsely sourced opening calendar metadata before altering input", () => {
    const input = fixture(),
      before = structuredClone(input),
      calendar = DEFAULT_OPENING_FINANCE_DATA.openingPurchaseCalendar;
    for (const change of [
      { householdFirstDueRule: "first-next-period-month" },
      { source: { ...calendar.source, tag: "SOURCED" } },
      { source: { ...calendar.source, citation: "" } },
      { source: { ...calendar.source, estimatedFrom: "" } },
    ]) {
      expect(() =>
        createOpeningFinance(
          input,
          options({
            data: {
              ...DEFAULT_OPENING_FINANCE_DATA,
              openingPurchaseCalendar: { ...calendar, ...change },
            },
          }),
        ),
      ).toThrow(/estimated first-due rule/);
    }
    expect(() =>
      createOpeningFinance(
        input,
        options({
          data: {
            ...DEFAULT_OPENING_FINANCE_DATA,
            openingPurchaseCalendar: undefined as unknown as typeof calendar,
          },
        }),
      ),
    ).toThrow(/estimated first-due rule/);
    expect(() =>
      createOpeningFinance(
        input,
        options({
          data: {
            ...DEFAULT_OPENING_FINANCE_DATA,
            openingPurchaseCalendar: {
              ...calendar,
              stopgapId: "SG-P8-unregistered-calendar-fixture",
            },
          },
        }),
      ),
    ).toThrow(/stopgap/i);
    expect(input).toEqual(before);
  });

  it("rejects a substituted delay in the exact simulation unit instead of sizing the due date from it", () => {
    const input = fixture(),
      before = structuredClone(input);
    for (const value of [p("zero"), p("two")]) {
      expect(() =>
        createOpeningFinance(
          input,
          options({
            books: {
              parameters: { ...PARAMETERS, one: { ...PARAMETERS.one!, value } },
            },
          }),
        ),
      ).toThrow(/exact one-day simulation step/);
    }
    expect(input).toEqual(before);
  });
});

describe("recorded household payday opening phase (source-only candidate fixtures)", () => {
  const forHousehold = (
    finance: ReturnType<typeof createOpeningFinance>,
    id: string,
  ) => finance.contracts.filter((row) => row.householdId === id);
  const scheduled = (
    input: CoreInput,
    jobId: string,
    offsetDays: number,
    anchorDate = at,
  ) => ({
    ...input,
    workCommitments: input.workCommitments!.map((row) =>
      row.jobId === jobId
        ? {
            ...row,
            periodDays: p("daysPerWeek"),
            anchorDate,
            slots: [
              {
                offsetDays,
                startMinute: p("zero"),
                minutes: p("minutesPerHour"),
              },
            ],
            expectedWeeklyMinutes: p("minutesPerHour"),
          }
        : row,
    ),
  });
  const noWage = (input: CoreInput, personId = "worker:store"): CoreInput => ({
    ...input,
    people: input.people.map((person) =>
      person.id === personId ? { ...person, jobId: undefined } : person,
    ),
    workCommitments: input.workCommitments?.filter(
      (commitment) => commitment.personId !== personId,
    ),
  });
  const awarded = (
    input: CoreInput,
    dueAt: string,
  ): { input: CoreInput; income: FinanceContractInput } => {
    const awardId = "calendar-fixture:actual-cash-award",
      personId = "worker:store",
      householdId = "household:store",
      income: FinanceContractInput = {
        id: "calendar-fixture:actual-income-terms",
        payerIds: ["bank"],
        payeeId: personId,
        kind: "income.retirement",
        amountMinor: p("minorPerDollar"),
        dueAt,
        periodMonths: p("one"),
        accruesArrears: false,
        recipientIncome: {
          personId,
          householdId,
          kindId: "retirement",
          sourceFactId: awardId,
        },
        source,
      };
    return {
      input: {
        ...noWage(input),
        people: noWage(input).people.map((person) =>
          person.id === personId
            ? {
                ...person,
                pastFacts: [
                  {
                    id: awardId,
                    date: at,
                    kind: "income:monthly-award",
                    summary:
                      "Controlled recorded cash entitlement; this fixture supplies it explicitly.",
                    source,
                    facts: {
                      status: "in-payment",
                      basis: "standing-entitlement",
                      paymentMedium: "cash",
                      payerId: "bank",
                      monthlyMinor: String(income.amountMinor),
                      kindId: "retirement",
                      householdId,
                    },
                  },
                ],
              }
            : person,
        ),
      },
      income,
    };
  };

  it("uses different actual employer anchors without synchronizing all household or business dates", () => {
    const input = scheduled(
        scheduled(fixture(), "job:store", p("zero"), "2021-01-04"),
        "job:kitchen",
        p("zero"),
        "2021-01-06",
      ),
      before = structuredClone(input),
      finance = createOpeningFinance(input, options());
    expect(
      new Set(forHousehold(finance, "household:store").map((row) => row.dueAt)),
    ).toEqual(new Set(["2021-01-04"]));
    expect(
      new Set(
        forHousehold(finance, "household:kitchen").map((row) => row.dueAt),
      ),
    ).toEqual(new Set(["2021-01-06"]));
    expect(
      finance.contracts
        .filter((row) => !row.householdId)
        .every((row) => row.dueAt === "2021-01-02"),
    ).toBe(true);
    expect(
      forHousehold(finance, "household:store").every((row) =>
        row.source.estimatedFrom?.includes("commitment:job:store"),
      ),
    ).toBe(true);
    expect(input).toEqual(before);
  });

  it("changes opening phase alone while preserving every generated monthly amount, participant and period", () => {
    const input = fixture(),
      // Hold the recorded annual plans fixed so changing a schedule does not
      // independently change the financial projection's supplier weights.
      fixedOptions = options({
        recordedAnnualPay: input.jobs.map((job) => ({
          jobId: job.id,
          annualMinor: Math.round(job.wageDailyMinor * p("daysPerMeanYear")),
          source,
        })),
      }),
      baseline = createOpeningFinance(input, fixedOptions),
      changed = createOpeningFinance(
        scheduled(input, "job:store", p("zero"), "2021-01-04"),
        fixedOptions,
      );
    expect(changed.contracts.map((row) => row.id)).toEqual(
      baseline.contracts.map((row) => row.id),
    );
    for (const row of changed.contracts) {
      const prior = baseline.contracts.find((term) => term.id === row.id)!;
      expect([
        row.amountMinor,
        row.periodMonths,
        row.payerIds,
        row.payeeId,
        row.accruesArrears,
        row.endsAt,
      ]).toEqual([
        prior.amountMinor,
        prior.periodMonths,
        prior.payerIds,
        prior.payeeId,
        prior.accruesArrears,
        prior.endsAt,
      ]);
    }
  });

  it("uses actual dated cash-benefit or pension terms only for the no-wage household and leaves those terms intact", () => {
    const recorded = awarded(fixture(), "2021-01-19"),
      before = structuredClone(recorded),
      finance = createOpeningFinance(
        recorded.input,
        options({ recordedContracts: [recorded.income] }),
      );
    expect(
      new Set(forHousehold(finance, "household:store").map((row) => row.dueAt)),
    ).toEqual(new Set([recorded.income.dueAt]));
    expect(
      finance.contracts.find((row) => row.id === recorded.income.id),
    ).toEqual(recorded.income);
    expect(
      forHousehold(finance, "household:store").every((row) =>
        row.source.estimatedFrom?.includes(
          recorded.income.recipientIncome!.sourceFactId,
        ),
      ),
    ).toBe(true);
    expect(finance.gaps).not.toContain(
      `${DEFAULT_OPENING_FINANCE_DATA.openingPurchaseCalendar.missingIncomeGap}:household:store`,
    );
    expect(recorded).toEqual(before);
  });

  it("preserves a supplied future award calendar without inventing an earlier January entitlement", () => {
    const recorded = awarded(fixture(), "2021-02-19"),
      finance = createOpeningFinance(
        recorded.input,
        options({ recordedContracts: [recorded.income] }),
      );
    expect(
      forHousehold(finance, "household:store").every(
        (row) => row.dueAt === "2021-02-19",
      ),
    ).toBe(true);
    expect(finance.contracts.filter((row) => row.recipientIncome)).toEqual([
      recorded.income,
    ]);
  });

  it("uses an existing expense date as a declared fallback, never converting it to income", () => {
    const input = noWage(fixture()),
      expense: FinanceContractInput = {
        id: "calendar-fixture:recorded-expense",
        householdId: "household:store",
        payerIds: ["worker:store"],
        payeeId: "kitchen",
        kind: "household.food",
        amountMinor: p("minorPerDollar"),
        dueAt: "2021-01-23",
        endsAt: "2021-12-23",
        periodMonths: p("two"),
        accruesArrears: false,
        source,
      },
      finance = createOpeningFinance(
        input,
        options({ recordedContracts: [expense] }),
      );
    expect(finance.contracts.find((row) => row.id === expense.id)).toEqual(
      expense,
    );
    expect(
      forHousehold(finance, "household:store").every(
        (row) => row.dueAt === expense.dueAt,
      ),
    ).toBe(true);
    expect(finance.gaps).toContain(
      `${DEFAULT_OPENING_FINANCE_DATA.openingPurchaseCalendar.missingIncomeGap}:household:store`,
    );
    expect(
      finance.contracts.some(
        (row) => row.recipientIncome?.personId === "worker:store",
      ),
    ).toBe(false);
  });

  it("declares missing income timing and a calendar-only fallback without manufacturing a job, award or balance", () => {
    const input = noWage(fixture()),
      before = structuredClone(input),
      finance = createOpeningFinance(input, options()),
      householdTerms = forHousehold(finance, "household:store");
    expect(householdTerms.length).toBeGreaterThan(p("zero"));
    expect(householdTerms.every((row) => row.dueAt === "2021-02-01")).toBe(
      true,
    );
    expect(
      householdTerms.every((row) =>
        row.source.estimatedFrom?.includes("explicit calendar-only fallback"),
      ),
    ).toBe(true);
    expect(finance.gaps).toContain(
      `${DEFAULT_OPENING_FINANCE_DATA.openingPurchaseCalendar.missingIncomeGap}:household:store`,
    );
    expect(finance.contracts.some((row) => row.recipientIncome)).toBe(false);
    expect(input).toEqual(before);
  });

  it("does not infer income timing from retirement age, title, liquid stock or unowned historical jobs", () => {
    const input = noWage(fixture()),
      altered = {
        ...input,
        people: input.people.map((person) =>
          person.id === "worker:store"
            ? {
                ...person,
                birthDate: "1930-01-01",
                liquidMinor: person.liquidMinor * p("two"),
              }
            : person,
        ),
        jobs: input.jobs.map((job) =>
          job.id === "job:store" ? { ...job, title: "Retired pensioner" } : job,
        ),
      },
      before = structuredClone(altered),
      finance = createOpeningFinance(altered, options());
    expect(
      forHousehold(finance, "household:store").every(
        (row) => row.dueAt === "2021-02-01",
      ),
    ).toBe(true);
    expect(finance.contracts.some((row) => row.recipientIncome)).toBe(false);
    expect(altered).toEqual(before);
  });

  it("keeps the purchase billing day across short months after selecting the actual January 31 work date", () => {
    const input = scheduled(
        { ...fixture(), startedAt: "2021-01-30" },
        "job:store",
        p("zero"),
        "2021-01-31",
      ),
      finance = createOpeningFinance(input, options()),
      core = createLifeCore({ ...input, finance }, { scheduledWork: false }),
      term = [...core.finance.contracts.values()].find(
        (row) => row.householdId === "household:store",
      )!,
      api = coreAPI(core),
      february = financeNextDate(
        api,
        term.dueAt,
        term.periodMonths,
        term.billingDay,
      );
    expect(term.firstDueAt).toBe("2021-01-31");
    expect(february).toBe("2021-02-28");
    expect(
      financeNextDate(api, february, term.periodMonths, term.billingDay),
    ).toBe("2021-03-31");
  });

  it("uses the actual overnight spill date while respecting an exclusive supplied job end", () => {
    const input = fixture(),
      overnight: CoreInput = {
        ...input,
        workCommitments: input.workCommitments!.map((row) =>
          row.jobId === "job:store"
            ? {
                ...row,
                periodDays: p("daysPerWeek"),
                slots: [
                  {
                    offsetDays: p("zero"),
                    startMinute:
                      p("hoursPerDay") * p("minutesPerHour") -
                      p("minutesPerHour"),
                    minutes: p("two") * p("minutesPerHour"),
                  },
                ],
                expectedWeeklyMinutes: p("two") * p("minutesPerHour"),
              }
            : row,
        ),
      },
      selected = createOpeningPurchaseCalendar(overnight, []).household(
        overnight.households.find((row) => row.id === "household:store")!,
      ),
      ended = {
        ...overnight,
        jobs: overnight.jobs.map((job) =>
          job.id === "job:store" ? { ...job, endsAt: "2021-01-02" } : job,
        ),
      },
      fallback = createOpeningPurchaseCalendar(ended, []).household(
        ended.households.find((row) => row.id === "household:store")!,
      );
    expect(selected.dueAt).toBe("2021-01-02");
    expect(selected.basisIds).toContain("commitment:job:store");
    expect(fallback.dueAt).toBe("2021-02-01");
    expect(fallback.basisIds).not.toContain("commitment:job:store");
  });

  it("respects a supplied future commitment start rather than inventing pay before its saved calendar begins", () => {
    const input = fixture(),
      future = {
        ...input,
        workCommitments: input.workCommitments!.map((row) =>
          row.jobId === "job:store"
            ? {
                ...row,
                startsAt: "2021-02-03",
                anchorDate: "2021-02-03",
                periodDays: p("daysPerWeek"),
              }
            : row,
        ),
      },
      choice = createOpeningPurchaseCalendar(future, []).household(
        future.households.find((row) => row.id === "household:store")!,
      );
    expect(choice.dueAt).toBe("2021-02-03");
    expect(choice.source.asOf).toBe(at);
    expect(choice.source.estimatedFrom).toContain(
      "predicts neither attendance nor a paycheck",
    );
  });

  it("does not treat a retirement label without an actual dated qualified award as an income calendar", () => {
    const recorded = awarded(fixture(), "2021-01-19"),
      withoutAward = {
        ...recorded.input,
        people: recorded.input.people.map((person) => ({
          ...person,
          pastFacts: [],
        })),
      },
      before = structuredClone(withoutAward);
    expect(() =>
      createOpeningPurchaseCalendar(withoutAward, [recorded.income]),
    ).toThrow(/actual dated qualified income award/);
    expect(withoutAward).toEqual(before);
  });

  it("rejects future source knowledge and contradictory award amounts before any generated binding", () => {
    const recorded = awarded(fixture(), "2021-01-19"),
      future = {
        ...recorded.income,
        source: { ...source, asOf: "2021-01-02" },
      },
      contradictory = {
        ...recorded.income,
        amountMinor: recorded.income.amountMinor + p("one"),
      },
      before = structuredClone(recorded.input);
    expect(() =>
      createOpeningPurchaseCalendar(recorded.input, [future]),
    ).toThrow(/available dated source/);
    expect(() =>
      createOpeningPurchaseCalendar(recorded.input, [contradictory]),
    ).toThrow(/actual dated qualified income award/);
    expect(recorded.input).toEqual(before);
  });

  it("rejects a malformed or mismatched owned work calendar without fabricating another schedule", () => {
    const input = fixture(),
      before = structuredClone(input);
    for (const override of [
      { periodDays: p("zero") },
      { organizationId: "missing-employer" },
      { paySource: { ...source, asOf: "2021-01-02" } },
    ]) {
      const changed = {
        ...input,
        workCommitments: input.workCommitments!.map((row) =>
          row.jobId === "job:store" ? { ...row, ...override } : row,
        ),
      };
      expect(() => createOpeningPurchaseCalendar(changed, [])).toThrow(
        /actual opening work calendar|owned job and employer|available dated source/,
      );
    }
    expect(input).toEqual(before);
  });

  it("has no seed, future simulated income, deficit or requested horizon input to the date convention", () => {
    const input = scheduled(fixture(), "job:store", p("zero"), "2021-01-04"),
      altered = {
        ...input,
        seed: "different-world-identity",
        organizations: input.organizations.map((row) => ({
          ...row,
          liquidMinor: p("zero"),
        })),
      },
      first = createOpeningPurchaseCalendar(input, []),
      second = createOpeningPurchaseCalendar(altered, []);
    expect(input.households.map((home) => first.household(home).dueAt)).toEqual(
      altered.households.map((home) => second.household(home).dueAt),
    );
    expect(first.business.dueAt).toBe(second.business.dueAt);
  });
});

/** Controlled generated Source preservation and tamper regressions. */
describe("fresh generated calendar Source references", () => {
  it("retains full shared/owning provenance and exact dates/basis/original terms while compacting fresh rows", () => {
    const original = fixture(),
      calendarData = DEFAULT_OPENING_FINANCE_DATA.openingPurchaseCalendar,
      sharedBefore = structuredClone(calendarData.source),
      scheduleSource: Source = {
        ...source,
        citation: "Full owning schedule citation. ".repeat(p("minorPerDollar")),
        estimatedFrom: "Independent actual schedule basis. ".repeat(
          p("minorPerDollar"),
        ),
      },
      paySource: Source = {
        ...source,
        citation: "Full owning pay citation. ".repeat(p("minorPerDollar")),
      },
      jobSource: Source = {
        ...source,
        citation: "Full owning job citation. ".repeat(p("minorPerDollar")),
      },
      awardSource: Source = {
        ...source,
        citation: "Full owning award citation. ".repeat(p("minorPerDollar")),
      },
      income: FinanceContractInput = {
        id: "actual-compaction-income",
        payerIds: ["bank"],
        payeeId: "worker:bank",
        kind: "income.retirement",
        amountMinor: p("minorPerDollar"),
        dueAt: "2021-01-21",
        periodMonths: p("one"),
        accruesArrears: false,
        recipientIncome: {
          personId: "worker:bank",
          householdId: "household:bank",
          kindId: "retirement",
          sourceFactId: "actual-compaction-award",
        },
        source: awardSource,
      },
      supplied: FinanceContractInput = {
        id: "actual-compaction-invoice",
        householdId: "household:store",
        payerIds: ["worker:store"],
        payeeId: "kitchen",
        kind: "household.fixture-invoice",
        amountMinor: p("minorPerDollar"),
        dueAt: "2021-01-23",
        endsAt: "2021-07-23",
        periodMonths: p("two"),
        accruesArrears: false,
        salesReceipt: true,
        source: jobSource,
      },
      input: CoreInput = {
        ...original,
        people: original.people.map((person) =>
          person.id === "worker:bank"
            ? {
                ...person,
                jobId: undefined,
                pastFacts: [
                  {
                    id: "actual-compaction-award",
                    date: at,
                    kind: "opening-income:retirement-award",
                    summary:
                      "Actual controlled award supplied before calendar generation.",
                    source: awardSource,
                    facts: {
                      status: "in-payment",
                      payerId: "bank",
                      monthlyMinor: String(income.amountMinor),
                      kindId: "retirement",
                      householdId: person.householdId,
                    },
                  },
                ],
              }
            : person,
        ),
        organizations: original.organizations.map((organization) =>
          organization.id === "store"
            ? {
                ...organization,
                classification: "enterprise:personal-services",
              }
            : organization,
        ),
        jobs: original.jobs.map((job) => ({
          ...job,
          source: jobSource,
          ...(job.id === "job:store"
            ? { occupationClassification: "service:barber" }
            : {}),
        })),
        workCommitments: original
          .workCommitments!.filter(
            (commitment) => commitment.personId !== "worker:bank",
          )
          .map((commitment) => ({
            ...commitment,
            periodDays: p("daysPerWeek"),
            slots: [
              {
                offsetDays:
                  commitment.jobId === "job:kitchen"
                    ? p("one") + p("two")
                    : p("one"),
                startMinute: p("zero"),
                minutes: p("minutesPerHour"),
              },
            ],
            scheduleSource,
            paySource,
          })),
        finance: {
          contracts: [income, supplied],
          facilities: [],
          businesses: [],
          gaps: [],
        },
      },
      before = structuredClone(input),
      choices = createOpeningPurchaseCalendar(input, input.finance!.contracts),
      finance = createOpeningFinance(input, options()),
      customerOptions = {
        geography: () => ({
          jurisdictionKey: "fixture-source-key",
          region: "national" as const,
          source,
          outsideMarkets: [],
        }),
        outsideMarkets: [],
      },
      customers = buildOpeningCustomers(input, customerOptions);
    expect(calendarData.source).toEqual(sharedBefore);
    expect(calendarData.source.citation).toContain(
      "jpmc-institute-volatility-2-report.pdf",
    );
    expect(calendarData.source.estimatedFrom).toContain(
      "one million Chase customers",
    );
    expect(calendarData.source.estimatedFrom).toContain(
      "[next nominal, following nominal)",
    );
    expect(calendarData.source.generationPriorVintage).toContain(
      "2012 through September 2015",
    );
    const customSource = {
        ...calendarData.source,
        citation:
          "Actual custom calendar citation supplied by this controlled DATA fixture.",
        estimatedFrom:
          "Complete custom calendar rationale supplied with actual controlled rule DATA.",
        generationPriorVintage:
          "Actual custom calendar generation vintage, retained in Source fields.",
      },
      customData = { ...calendarData, source: customSource },
      customChoice = createOpeningPurchaseCalendar(
        input,
        input.finance!.contracts,
        customData,
      ).business,
      customFinance = createOpeningFinance(
        input,
        options({
          data: {
            ...DEFAULT_OPENING_FINANCE_DATA,
            openingPurchaseCalendar: customData,
          },
        }),
      ),
      customBusiness = customFinance.contracts.filter(
        (term) => term.kind === "business.sales-input",
      );
    expect(customChoice.source.citation).toBe(customSource.citation);
    expect(customChoice.source.estimatedFrom).toContain(
      customSource.estimatedFrom,
    );
    expect(customChoice.source.generationPriorVintage).toBe(
      customSource.generationPriorVintage,
    );
    expect(customBusiness.length).toBeGreaterThan(p("zero"));
    for (const term of customBusiness) {
      expect(term.source.citation).toContain(customSource.citation);
      expect(term.source.estimatedFrom).toContain(customSource.estimatedFrom);
      expect(term.source.generationPriorVintage).toContain(
        customSource.generationPriorVintage,
      );
      const baseline = finance.contracts.find((row) => row.id === term.id)!;
      expect(term.dueAt).toBe(baseline.dueAt);
      expect(term.amountMinor).toBe(baseline.amountMinor);
      expect(term.periodMonths).toBe(baseline.periodMonths);
      expect(term.endsAt).toBe(baseline.endsAt);
      expect(term.settlementPhaseId).toBe(baseline.settlementPhaseId);
    }
    for (const [homeId, dueAt, basisIds] of [
      ["household:store", "2021-01-02", ["job:store", "commitment:job:store"]],
      [
        "household:kitchen",
        "2021-01-04",
        ["job:kitchen", "commitment:job:kitchen"],
      ],
      ["household:bank", "2021-01-21", [income.id, "actual-compaction-award"]],
    ] as const) {
      const choice = choices.household(
        input.households.find((home) => home.id === homeId)!,
      );
      expect(choice.dueAt).toBe(dueAt);
      expect(choice.basisIds).toEqual(basisIds);
      expect(choice.source.tag).toBe("ESTIMATED");
      expect(choice.source.asOf).toBe(at);
      expect(choice.source.citation).toContain(
        "DATA openingPurchaseCalendar.source",
      );
      expect(choice.source.generationPriorVintage).toBe(
        sharedBefore.generationPriorVintage,
      );
      expect(choice.source.estimatedFrom).toContain(
        calendarData.householdFirstDueRule,
      );
      expect(choice.source.estimatedFrom).toContain(dueAt);
      expect(choice.source.estimatedFrom!.length).toBeLessThan(
        sharedBefore.estimatedFrom.length,
      );
      expect(choice.source.estimatedFrom).not.toContain(
        sharedBefore.estimatedFrom,
      );
      expect(choice.source.estimatedFrom).not.toContain(
        scheduleSource.citation,
      );
      expect(choice.source.estimatedFrom).not.toContain(paySource.citation);
      expect(choice.source.estimatedFrom).not.toContain(awardSource.citation);
      for (const terms of [
        finance.contracts,
        customers.input.finance!.contracts,
      ]) {
        const generated = terms.filter(
          (term) =>
            term.householdId === homeId && term.householdPurchaseCalendar,
        );
        expect(generated.length).toBeGreaterThan(p("zero"));
        for (const term of generated) {
          expect(term.dueAt).toBe(dueAt);
          expect(term.householdPurchaseCalendar!.openingBasisIds).toEqual(
            basisIds,
          );
          expect(term.householdPurchaseCalendar!.source).toEqual(choice.source);
          expect(term.source.estimatedFrom).not.toContain(
            sharedBefore.estimatedFrom,
          );
          expect(term.source.estimatedFrom).toContain(
            calendarData.recurringHouseholdDueRule,
          );
          for (const id of basisIds)
            expect(term.source.estimatedFrom).toContain(id);
          expect(term.source.citation).toContain(
            "DATA openingPurchaseCalendar.source",
          );
          expect(term.endsAt).toBeUndefined();
          expect(term.periodMonths).toBe(p("one"));
        }
      }
    }
    for (const originalTerm of [income, supplied]) {
      expect(
        finance.contracts.find((term) => term.id === originalTerm.id),
      ).toEqual(originalTerm);
      expect(
        customers.input.finance!.contracts.find(
          (term) => term.id === originalTerm.id,
        ),
      ).toBe(originalTerm);
      expect(originalTerm.settlementPhaseId).toBeUndefined();
    }
    expect(customers.input.jobs).toBe(input.jobs);
    expect(customers.input.workCommitments).toBe(input.workCommitments);
    expect(
      customers.input.people.find((person) => person.id === "worker:bank")!
        .pastFacts![p("zero")]!.source,
    ).toEqual(awardSource);
    expect(input.jobs.find((job) => job.id === "job:store")!.source).toEqual(
      jobSource,
    );
    expect(input.workCommitments![p("zero")]!.scheduleSource).toEqual(
      scheduleSource,
    );
    expect(input.workCommitments![p("zero")]!.paySource).toEqual(paySource);
    expect(
      buildOpeningCustomers(customers.input, customerOptions).input,
    ).toEqual(customers.input);
    const missing = createOpeningPurchaseCalendar(input, [supplied]).household(
      input.households.find((home) => home.id === "household:bank")!,
    );
    expect(missing.dueAt).toBe("2021-02-01");
    expect(missing.basisIds).toEqual([]);
    expect(missing.gaps).toContain(
      `${calendarData.missingIncomeGap}:household:bank`,
    );
    expect(missing.source.estimatedFrom).toContain("Missing income timing");
    const endedPlan = customers.receipt.contractPlans.find(
        (plan) =>
          plan.serviceKey === "personal-care" &&
          plan.buyerIds.includes("worker:store"),
      )!,
      endSource: Source = {
        ...source,
        citation: "Independent supplied service end citation",
        estimatedFrom: "Full evidence for the owner's supplied exclusive end",
        generationPriorVintage: "Actual supplied end record vintage",
      },
      actualEnd = {
        id: endedPlan.agreementId,
        endsAt: "2021-08-01",
        basisRecordIds: ["actual-signed-service-end"],
        source: endSource,
      },
      ended = buildOpeningCustomers(input, {
        ...customerOptions,
        agreementEndsById: { [actualEnd.id]: actualEnd },
      }),
      endedContract = ended.input.finance!.contracts.find(
        (term) => term.id === endedPlan.contractId,
      )!;
    expect(endedContract.endsAt).toBe(actualEnd.endsAt);
    expect(endedContract.source.citation).toContain(endSource.citation);
    expect(endedContract.source.estimatedFrom).toContain(
      endSource.estimatedFrom,
    );
    expect(endedContract.source.generationPriorVintage).toContain(
      endSource.generationPriorVintage,
    );
    expect(
      JSON.parse(
        ended.input.placeMetadata![`openingCustomers.end:${actualEnd.id}`]!,
      ),
    ).toEqual(actualEnd);
    expect(buildOpeningCustomers(ended.input, customerOptions).input).toEqual(
      ended.input,
    );
    const target = customers.input.finance!.contracts.find(
      (term) =>
        term.householdId === "household:store" &&
        term.householdPurchaseCalendar,
    )!;
    for (const field of [
      "citation",
      "estimatedFrom",
      "generationPriorVintage",
    ] as const) {
      const changed: CoreInput = {
          ...customers.input,
          finance: {
            ...customers.input.finance!,
            contracts: customers.input.finance!.contracts.map((term) =>
              term.id === target.id
                ? {
                    ...term,
                    householdPurchaseCalendar: {
                      ...term.householdPurchaseCalendar!,
                      source: {
                        ...term.householdPurchaseCalendar!.source,
                        [field]: `Tampered marker-only ${field}`,
                      },
                    },
                  }
                : term,
            ),
          },
        },
        changedBefore = structuredClone(changed);
      expect(
        changed.finance!.contracts.find((term) => term.id === target.id)!
          .source,
      ).toEqual(target.source);
      expect(() => buildOpeningCustomers(changed, customerOptions)).toThrow(
        /Conflicting opening customer contract/,
      );
      expect(changed).toEqual(changedBefore);
    }
    expect(input).toEqual(before);
  });
});

describe("fresh default generated household Source basis", () => {
  it("keeps actual supplied terms and custom full provenance, while independently rebuilding compact default contracts", () => {
    const input = fixture(),
      before = JSON.stringify(input);
    const fresh = createOpeningFinance(input);
    const householdTerms = fresh.contracts.filter((row) => row.householdId);
    expect(householdTerms.length).toBeGreaterThan(0);
    const resolvedActual = resolveGeneratedHouseholdSourceFromInput(
      householdTerms[0]!.source,
      input,
    );
    expect(resolvedActual.householdSource).toBe(
      input.households.find((row) => row.id === householdTerms[0]!.householdId)!
        .source,
    );
    expect(
      householdTerms.every(
        (row) =>
          row.source.generatedHouseholdBasis?.schema ===
          "p8-hh-source-basis/v1",
      ),
    ).toBe(true);
    expect(createOpeningFinance({ ...input, finance: fresh })).toEqual(fresh);
    const customData = structuredClone(DEFAULT_OPENING_FINANCE_DATA);
    customData.categories[0]!.citation =
      "Exact actual custom complete crosswalk citation";
    const custom = createOpeningFinance(input, { data: customData });
    expect(
      custom.contracts
        .filter((row) => row.householdId)
        .every((row) => row.source.generatedHouseholdBasis === undefined),
    ).toBe(true);
    const supplied = structuredClone(householdTerms[0]!);
    supplied.id = "actual-original-recorded-term";
    supplied.source = {
      tag: "SOURCED",
      asOf: input.startedAt,
      citation: "Actual original supplied full Source",
      estimatedFrom: "Original supplied rationale",
      generationPriorVintage: "actual original vintage",
    };
    supplied.endsAt = "2022-01-01";
    const original = createOpeningFinance({
      ...input,
      finance: {
        ...fresh,
        contracts: [
          ...fresh.contracts.filter((row) => !row.householdId),
          supplied,
        ],
      },
    });
    expect(original.contracts.find((row) => row.id === supplied.id)).toEqual(
      supplied,
    );
    // This target is the untouched fresh generated term, independent of the
    // separately supplied original above; the Source claim must be admitted.
    const freshTarget = householdTerms[0]!;
    expect(freshTarget.id).not.toBe(supplied.id);
    const tampered = structuredClone(fresh);
    const changedTarget = tampered.contracts.find(
      (row) => row.id === freshTarget.id,
    )!;
    expect(changedTarget.source.generatedHouseholdBasis).toBeDefined();
    changedTarget.source.generatedHouseholdBasis!.ownerSourceDigest =
      "changed-original-owner-ref";
    expect(() =>
      createOpeningFinance({ ...input, finance: tampered }),
    ).toThrow();
    const tamperedBefore = structuredClone(tampered);
    expect(() => createOpeningFinance({ ...input, finance: tampered })).toThrow(
      /exact typed basis/,
    );
    expect(tampered).toEqual(tamperedBefore);

    // Refresh the compact representation as well: its own digest/text cannot
    // stand in for the independently retained actual household Source.
    const coordinated = structuredClone(fresh);
    const coordinatedTarget = coordinated.contracts.find(
      (row) => row.id === freshTarget.id,
    )!;
    coordinatedTarget.source = compactGeneratedHouseholdSource(
      {
        ...coordinatedTarget.source.generatedHouseholdBasis!,
        ownerSourceDigest: "changed-original-owner-ref",
      },
      coordinatedTarget.source.asOf,
      coordinatedTarget.source.generationPriorVintage,
    );
    const coordinatedBefore = structuredClone(coordinated);
    expect(() =>
      createOpeningFinance({ ...input, finance: coordinated }),
    ).toThrow(/actual full owner Source/);
    expect(coordinated).toEqual(coordinatedBefore);

    const changedOwner: CoreInput = {
      ...input,
      finance: fresh,
      households: input.households.map((household) =>
        household.id === freshTarget.householdId
          ? {
              ...household,
              source: {
                ...household.source,
                estimatedFrom: "Changed actual full household provenance",
              },
            }
          : household,
      ),
    };
    const changedOwnerBefore = structuredClone(changedOwner);
    expect(() => createOpeningFinance(changedOwner)).toThrow(
      /actual full owner Source/,
    );
    expect(changedOwner).toEqual(changedOwnerBefore);

    // Another valid compact Source resolves to a real different household,
    // but cannot relabel the original contract's actual household participants.
    const otherHouseholdTerm = householdTerms.find(
      (row) => row.householdId !== freshTarget.householdId,
    )!;
    const wrongScope = structuredClone(fresh);
    wrongScope.contracts.find((row) => row.id === freshTarget.id)!.source =
      structuredClone(otherHouseholdTerm.source);
    const wrongScopeBefore = structuredClone(wrongScope);
    expect(() =>
      createOpeningFinance({ ...input, finance: wrongScope }),
    ).toThrow(/actual contract household or kind/);
    expect(wrongScope).toEqual(wrongScopeBefore);

    const circular = structuredClone(fresh);
    const circularTarget = circular.contracts.find(
      (row) => row.id === freshTarget.id,
    )!;
    circularTarget.source = compactGeneratedHouseholdSource(
      {
        ...circularTarget.source.generatedHouseholdBasis!,
        calendarBasisIds: [circularTarget.id],
      },
      circularTarget.source.asOf,
      circularTarget.source.generationPriorVintage,
    );
    circularTarget.householdPurchaseCalendar!.openingBasisIds = [
      circularTarget.id,
    ];
    const circularBefore = structuredClone(circular);
    expect(() => createOpeningFinance({ ...input, finance: circular })).toThrow(
      /own contract as calendar evidence/,
    );
    expect(circular).toEqual(circularBefore);

    // Coherent Source-only and marker-only rewrites must disagree with the
    // independently saved original ordered calendar basis, despite valid IDs.
    const ids = freshTarget.source.generatedHouseholdBasis!.calendarBasisIds;
    expect(ids.length).toBeGreaterThan(1);
    for (const field of [
      "source-ids",
      "marker-ids",
      "source-date",
      "marker-date",
      "actual-due",
    ] as const) {
      const changed = structuredClone(fresh);
      const changedTarget = changed.contracts.find(
        (row) => row.id === freshTarget.id,
      )!;
      if (field === "source-ids" || field === "source-date") {
        changedTarget.source = compactGeneratedHouseholdSource(
          {
            ...changedTarget.source.generatedHouseholdBasis!,
            ...(field === "source-ids"
              ? { calendarBasisIds: [...ids].reverse() }
              : { calendarDueAt: "2021-02-01" }),
          },
          changedTarget.source.asOf,
          changedTarget.source.generationPriorVintage,
        );
        expect(changedTarget.householdPurchaseCalendar).toEqual(
          freshTarget.householdPurchaseCalendar,
        );
      } else if (field === "marker-ids") {
        changedTarget.householdPurchaseCalendar!.openingBasisIds = [
          ...ids,
        ].reverse();
        expect(changedTarget.source).toEqual(freshTarget.source);
      } else if (field === "marker-date") {
        changedTarget.householdPurchaseCalendar!.firstNominalDueAt =
          "2021-02-01";
        expect(changedTarget.source).toEqual(freshTarget.source);
      } else changedTarget.dueAt = "2021-02-01";
      const changedBefore = structuredClone(changed);
      expect(() =>
        createOpeningFinance({ ...input, finance: changed }),
      ).toThrow(/original calendar marker or due date/);
      expect(changed).toEqual(changedBefore);
    }

    // A compact Source never replaces the existing actual participant check.
    const missingPayee = structuredClone(fresh);
    missingPayee.contracts.find((row) => row.id === freshTarget.id)!.payeeId =
      "absent-actual-payee";
    expect(() =>
      createOpeningFinance({ ...input, finance: missingPayee }),
    ).toThrow(/existing distinct cash participants/);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("keeps a genuine no-income category-to-service calendar chain and rejects a coordinated cycle without changing terms", () => {
    const original = fixture();
    const input: CoreInput = {
      ...original,
      workCommitments: [],
      organizations: original.organizations.map((row) =>
        row.id === "store"
          ? { ...row, classification: "enterprise:personal-services" }
          : row,
      ),
      jobs: original.jobs.map((row) =>
        row.id === "job:store"
          ? { ...row, occupationClassification: "service:barber" }
          : row,
      ),
    };
    const finance = createOpeningFinance(input);
    const category = finance.contracts
      .filter(
        (row) =>
          row.householdId === "household:store" &&
          row.source.generatedHouseholdBasis,
      )
      .sort((left, right) => left.amountMinor - right.amountMinor)[0]!;
    expect(category.source.generatedHouseholdBasis!.calendarBasisIds).toEqual(
      [],
    );
    expect(category.source.generatedHouseholdBasis!.missingIncome).toBe(true);
    const seeded: CoreInput = {
      ...input,
      finance: {
        ...finance,
        contracts: [
          ...finance.contracts.filter((row) => !row.householdId),
          category,
        ],
      },
    };
    const seededBefore = structuredClone(seeded);
    const customers = buildOpeningCustomers(seeded, {
      geography: () => ({
        jurisdictionKey: "controlled-no-income-chain",
        region: "national",
        source,
        outsideMarkets: [],
      }),
      outsideMarkets: [],
    });
    expect(seeded).toEqual(seededBefore);
    const service = customers.input.finance!.contracts.find(
      (row) =>
        row.householdId === category.householdId &&
        row.source.generatedHouseholdBasis?.domain === "service",
    )!;
    expect(service).toBeDefined();
    expect(service.source.generatedHouseholdBasis!.calendarBasisIds).toEqual([
      category.id,
    ]);
    expect(service.householdPurchaseCalendar!.openingBasisIds).toEqual([
      category.id,
    ]);
    expect(service.dueAt).toBe(category.dueAt);
    const qualifiedOwner = customers.input.organizations.find(
      (row) => row.id === "store",
    )!;
    const qualificationKeys = Object.keys(qualifiedOwner.governmentFacts ?? {});
    expect(qualificationKeys.length).toBeGreaterThan(0);
    expect(
      qualificationKeys.every((key) =>
        key.startsWith(OPENING_CUSTOMER_QUALIFICATION_PREFIX),
      ),
    ).toBe(true);
    const before = structuredClone(customers.input);
    // Genuine government evidence keeps the institution exclusion even when
    // exactly the same owning product qualification is also present.
    const governmentOwner: CoreInput = {
      ...customers.input,
      organizations: customers.input.organizations.map((row) =>
        row.id === qualifiedOwner.id
          ? {
              ...row,
              governmentFacts: {
                ...row.governmentFacts,
                governmentKind: "municipality",
              },
            }
          : row,
      ),
    };
    expect(() => createOpeningFinance(governmentOwner)).toThrow(
      `Recorded institutional books require their own finance route: ${qualifiedOwner.id}`,
    );
    expect(customers.input).toEqual(before);
    const rebuilt = createOpeningFinance(customers.input);
    expect(rebuilt.contracts.find((row) => row.id === category.id)).toEqual(
      category,
    );
    expect(rebuilt.contracts.find((row) => row.id === service.id)).toEqual(
      service,
    );
    expect(customers.input).toEqual(before);

    // Source plus marker coherently reverse the genuine one-way edge. Neither
    // original owner, dates, cash amounts nor product qualifications change.
    const cycle = structuredClone(customers.input);
    const cycleCategory = cycle.finance!.contracts.find(
      (row) => row.id === category.id,
    )!;
    cycleCategory.source = compactGeneratedHouseholdSource(
      {
        ...cycleCategory.source.generatedHouseholdBasis!,
        calendarBasisIds: [service.id],
      },
      cycleCategory.source.asOf,
      cycleCategory.source.generationPriorVintage,
    );
    cycleCategory.householdPurchaseCalendar!.openingBasisIds = [service.id];
    expect(
      cycle.finance!.contracts.find((row) => row.id === service.id),
    ).toEqual(service);
    expect(cycleCategory.dueAt).toBe(category.dueAt);
    expect(cycleCategory.amountMinor).toBe(category.amountMinor);
    const cycleBefore = structuredClone(cycle);
    expect(() => createOpeningFinance(cycle)).toThrow(
      /Cyclic generated household calendar Source/,
    );
    expect(cycle).toEqual(cycleBefore);
    expect(customers.input).toEqual(before);
  });
});
