import { describe, expect, it } from "vitest";
import { estimatedMonthlyHouseholdLivingCosts } from "../simulation/living-costs-data";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "./business-books";
import type {
  CreditFacilityInput,
  FinanceContractInput,
} from "./finance-types";
import {
  createOpeningFinance,
  DEFAULT_OPENING_FINANCE_DATA,
  type OpeningFinanceOptions,
} from "./opening-finance";
import { parameter as p } from "./parameters";
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
      expect(contract.dueAt).toBe("2021-02-01");
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

  it("retains supplied category budgets without generating a duplicate component and rolls a December opening into January", () => {
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
      new Set(["2022-01-01"]),
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
