/** UNEXECUTED conditional fixtures. No ordinary-world, payroll or empirical proof. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { cashJournalParameters } from "./cash-host";
import financeData from "./data/finance.json" with { type: "json" };
import { settleFinanceContractJournal } from "./finance-cash";
import { FinancePlanningSession, prepareFinanceContract } from "./finance-plan";
import type { FinanceContractInput } from "./finance-types";
import {
  createHouseholdPurchaseCalendarMarker,
  validateHouseholdPurchaseCalendarAdmission,
} from "./household-purchase-calendar";
import { DEFAULT_OPENING_PURCHASE_CALENDAR_DATA } from "./opening-purchase-calendar";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import type {
  CoreAPI,
  CoreInput,
  CoreState,
  Source,
  WorkCommitmentInput,
} from "./types";

const openingDate = "2021-01-01",
  home = "household:recurring-fixture",
  worker = "person:recurring-fixture",
  employer = "organization:recurring-employer",
  supplier = "organization:recurring-supplier",
  pensionPayer = "organization:recurring-pension",
  job = "job:recurring-fixture",
  commitment = "commitment:recurring-fixture",
  purchase = "contract:recurring-purchase",
  income = "contract:recurring-income",
  award = "award:recurring-income",
  place = "place:recurring-fixture";
const unit = p("minorPerDollar"),
  zero = p("zero"),
  one = p("one");
const source: Source = {
  tag: "ESTIMATED",
  asOf: openingDate,
  citation:
    "Explicit recorded conditional calendar fixture; no observed invoice, payroll cadence or award is asserted.",
  estimatedFrom:
    "Technical fixture terms only, with existing exact registered time and currency units.",
};

function opening(
  options: {
    firstDueAt?: string;
    anchorAt?: string;
    openingAt?: string;
    noWork?: boolean;
    actualIncomeAt?: string;
    supplied?: boolean;
    zeroAmount?: boolean;
    endsAt?: string;
    commitmentStartsAt?: string;
  } = {},
): CoreInput {
  const dueAt = options.firstDueAt ?? "2021-01-04",
    choice = {
      dueAt,
      basisIds: options.noWork ? [] : [job, commitment],
      gaps: [],
      source,
    },
    purchaseTerms: FinanceContractInput = {
      id: purchase,
      householdId: home,
      payerIds: [worker],
      payeeId: supplier,
      kind: financeData.kinds.purchase,
      amountMinor: options.zeroAmount ? zero : unit,
      dueAt,
      periodMonths: one,
      accruesArrears: false,
      salesReceipt: true,
      source,
      ...(options.supplied
        ? {}
        : {
            householdPurchaseCalendar: createHouseholdPurchaseCalendarMarker(
              home,
              choice,
              DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
            ),
          }),
      ...(options.endsAt ? { endsAt: options.endsAt } : {}),
    },
    incomeTerms: FinanceContractInput = {
      id: income,
      payerIds: [pensionPayer],
      payeeId: worker,
      kind: "income.retirement",
      amountMinor: unit,
      dueAt: options.actualIncomeAt ?? "2021-01-19",
      periodMonths: one,
      accruesArrears: false,
      source,
      recipientIncome: {
        personId: worker,
        householdId: home,
        kindId: "retirement",
        sourceFactId: award,
      },
    };
  return {
    seed: "explicit-source-only-recurring-calendar-fixture",
    startedAt: options.openingAt ?? openingDate,
    people: [
      {
        id: worker,
        givenName: "Calendar",
        familyName: "Fixture",
        birthDate: "1980-01-01",
        placeId: place,
        householdId: home,
        tier: "weekly",
        traits: {},
        liquidMinor: unit * p("monthsPerYear"),
        livingCostDailyMinor: zero,
        source,
        familyIds: [],
        knownIds: [],
        ...(options.noWork ? {} : { jobId: job }),
        ...(options.actualIncomeAt
          ? {
              pastFacts: [
                {
                  id: award,
                  date: options.openingAt ?? openingDate,
                  kind: "income:monthly-award",
                  summary:
                    "Actual fixture standing award supplied before opening; the calendar does not invent it.",
                  source,
                  facts: {
                    status: "in-payment",
                    basis: "standing-entitlement",
                    paymentMedium: "cash",
                    payerId: pensionPayer,
                    monthlyMinor: String(unit),
                    kindId: "retirement",
                    householdId: home,
                  },
                },
              ],
            }
          : {}),
      },
    ],
    households: [{ id: home, placeId: place, memberIds: [worker], source }],
    organizations: [employer, supplier, pensionPayer].map((id) => ({
      id,
      name: id,
      placeId: place,
      kind: "employer",
      source,
      liquidMinor: id === supplier ? zero : unit * p("monthsPerYear"),
    })),
    jobs: options.noWork
      ? []
      : [
          {
            id: job,
            personId: worker,
            organizationId: employer,
            title: "Recorded calendar fixture",
            wageDailyMinor: unit,
            hoursDaily: one,
            hourlyMinor: unit,
            source,
          },
        ],
    workCommitments: options.noWork
      ? []
      : [
          {
            id: commitment,
            jobId: job,
            personId: worker,
            organizationId: employer,
            startsAt:
              options.commitmentStartsAt ?? options.openingAt ?? openingDate,
            anchorDate: options.anchorAt ?? dueAt,
            periodDays: p("daysPerWeek"),
            slots: [
              {
                offsetDays: zero,
                startMinute: zero,
                minutes: p("minutesPerHour"),
              },
            ],
            expectedWeeklyMinutes: p("minutesPerHour"),
            hourlyMinor: unit,
            scheduleSource: source,
            paySource: source,
          },
        ],
    finance: {
      contracts: [
        ...(options.actualIncomeAt ? [incomeTerms] : []),
        purchaseTerms,
      ],
      facilities: [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function fixture(options: Parameters<typeof opening>[0] = {}): CoreState {
  return createCore(opening(options));
}
function totalCash(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    zero,
  );
}
function writerState(core: CoreState): string {
  return JSON.stringify(
    {
      balances: [...core.people.values(), ...core.organizations.values()].map(
        (row) => [row.id, row.liquidMinor],
      ),
      progress: [...core.finance.contracts.values()].map((row) => [
        row.id,
        row.dueAt,
        row.nominalDueAt,
        row.householdPurchaseCalendarBasis,
        row.lastSettledAt,
        row.arrearsMinor,
        row.firstUnpaidAt,
      ]),
      due: core.finance.contractsDueAt,
      totals: core.finance.totalsByKind,
      latest: core.finance.latestReceiptsByContract,
      journalSequence: core.cashJournal.nextSequence,
      journalTotals: core.cashJournal.totals,
      external: core.cashJournal.externalFlowsByOwner,
      cashSources: [...core.finance.cashSources.keys()],
    },
    (_key, value: unknown) =>
      value instanceof Map
        ? [...value]
        : value instanceof Set
          ? [...value]
          : value,
  );
}
function settle(core: CoreState, date: string) {
  advanceDate(core, date);
  return coreAPI(core).settleFinanceContract(purchase);
}
function dueMember(core: CoreState, date: string): boolean {
  return core.finance.contractsDueAt.get(date)?.has(purchase) ?? false;
}
function afterFirstLookup(
  core: CoreState,
  api: CoreAPI,
  mutate: () => void,
): CoreAPI {
  const wrapped = <T>(kind: string, action: () => T): T => {
    const provider = core.cashJournal.sourceProviders.get(kind)!;
    let calls = zero;
    core.cashJournal.sourceProviders.set(kind, (ref) => {
      const resolved = provider(ref);
      calls += one;
      if (calls === one) mutate();
      return resolved;
    });
    try {
      return action();
    } finally {
      core.cashJournal.sourceProviders.set(kind, provider);
    }
  };
  return {
    ...api,
    postJournal(input) {
      return wrapped(input.sourceRef.kind, () => api.postJournal(input));
    },
    completeJournalSource(reference) {
      return wrapped(reference.kind, () =>
        api.completeJournalSource(reference),
      );
    },
  };
}

describe("generated household recurring income calendar (UNEXECUTED)", () => {
  it("moves Sunday April 4 to actual Monday April 5 and retains nominal May 4", () => {
    const core = fixture(),
      cash = totalCash(core),
      terms = core.finance.contracts.get(purchase)!;
    for (const [date, nominal, effective] of [
      ["2021-01-04", "2021-02-04", "2021-02-08"],
      ["2021-02-08", "2021-03-04", "2021-03-08"],
      ["2021-03-08", "2021-04-04", "2021-04-05"],
      ["2021-04-05", "2021-05-04", "2021-05-10"],
    ] as const) {
      const receipt = settle(core, date);
      expect(receipt.paidMinor).toBe(unit);
      expect(receipt.householdPurchaseCalendarBasis?.effectiveDueAt).toBe(date);
      expect(receipt.nextHouseholdPurchaseCalendarBasis).toMatchObject({
        nominalDueAt: nominal,
        effectiveDueAt: effective,
        mode: "work",
      });
      expect(terms.nominalDueAt).toBe(nominal);
      expect(terms.dueAt).toBe(effective);
      expect(dueMember(core, date)).toBe(false);
      expect(dueMember(core, effective)).toBe(true);
      expect(terms.amountMinor).toBe(unit);
      expect(terms.periodMonths).toBe(one);
      expect(totalCash(core)).toBe(cash);
    }
    expect(dueMember(core, "2021-04-04")).toBe(false);
    expect(terms.firstDueAt).toBe("2021-01-04");
    expect(terms.billingDay).toBe(new Date("2021-01-04").getUTCDate());
    expect(core.work.lastResultByJob.size).toBe(zero);
  });

  it("uses differing actual employer calendars instead of a synchronized monthly date", () => {
    const monday = fixture(),
      wednesday = fixture({ firstDueAt: "2021-01-06" });
    settle(monday, "2021-01-04");
    settle(wednesday, "2021-01-06");
    expect(monday.finance.contracts.get(purchase)!.dueAt).toBe("2021-02-08");
    expect(wednesday.finance.contracts.get(purchase)!.dueAt).toBe("2021-02-10");
    expect(monday.finance.contracts.get(purchase)!.amountMinor).toBe(
      wednesday.finance.contracts.get(purchase)!.amountMinor,
    );
  });

  it("keeps January 31's nominal billing day through a short month and leap February", () => {
    for (const [year, openingAt, first, february, effective, march] of [
      [
        "common",
        "2021-01-01",
        "2021-01-31",
        "2021-02-28",
        "2021-02-28",
        "2021-03-31",
      ],
      [
        "leap",
        "2024-01-01",
        "2024-01-31",
        "2024-02-29",
        "2024-03-06",
        "2024-03-31",
      ],
    ] as const) {
      const core = fixture({ openingAt, firstDueAt: first });
      settle(core, first);
      const row = core.finance.contracts.get(purchase)!;
      expect({ year, nominal: row.nominalDueAt, effective: row.dueAt }).toEqual(
        { year, nominal: february, effective },
      );
      settle(core, effective);
      expect(row.nominalDueAt).toBe(march);
      expect(row.billingDay).toBe(new Date(first).getUTCDate());
    }
  });

  it("uses a no-wage household's admitted qualified recipient-income contract and award", () => {
    const core = fixture({
        noWork: true,
        actualIncomeAt: "2021-01-19",
        firstDueAt: "2021-01-19",
      }),
      incomeRow = core.finance.contracts.get(income)!,
      originalIncome = JSON.stringify(incomeRow);
    const receipt = settle(core, "2021-01-19"),
      basis = receipt.nextHouseholdPurchaseCalendarBasis!;
    expect(basis).toMatchObject({
      nominalDueAt: "2021-02-19",
      effectiveDueAt: "2021-02-19",
      mode: "recipient-income",
    });
    expect(basis.references.map((ref) => [ref.kind, ref.id])).toEqual([
      ["income-contract", income],
      ["income-award", award],
    ]);
    expect(JSON.stringify(incomeRow)).toBe(originalIncome);
    expect(core.finance.incomeContractsByPerson.get(worker)).toEqual(
      new Set([income]),
    );
    expect(core.work.commitmentsByPerson.has(worker)).toBe(false);
    expect(core.finance.latestReceiptsByContract.has(income)).toBe(false);
  });

  it("does not invent an award or paycheck when no household income calendar exists", () => {
    const core = fixture({ noWork: true }),
      receipt = settle(core, "2021-01-04"),
      basis = receipt.nextHouseholdPurchaseCalendarBasis!;
    expect(basis).toMatchObject({
      nominalDueAt: "2021-02-04",
      effectiveDueAt: "2021-02-04",
      mode: "missing-income",
      references: [],
    });
    expect(basis.source.tag).toBe("ESTIMATED");
    expect(basis.source.estimatedFrom).toContain(
      "No eligible positive income opportunity",
    );
    expect(core.people.get(worker)!.pastFacts ?? []).toEqual([]);
    expect(core.finance.incomeContractsByPerson.size).toBe(zero);
    expect(core.jobs.size).toBe(zero);
  });

  it("does not move six monthly budgets onto a known distant future start", () => {
    const core = fixture({ commitmentStartsAt: "2021-07-01" }),
      before = totalCash(core),
      receipt = settle(core, "2021-01-04");
    expect(receipt.nextHouseholdPurchaseCalendarBasis).toMatchObject({
      nominalDueAt: "2021-02-04",
      effectiveDueAt: "2021-02-04",
      mode: "missing-income",
    });
    expect(core.finance.contracts.get(purchase)!.amountMinor).toBe(unit);
    expect(totalCash(core)).toBe(before);
    expect(core.work.lastResultByJob.size).toBe(zero);
  });

  it("uses actual ended ownership rather than retaining an old job's pay calendar", () => {
    const core = fixture();
    advanceDate(core, "2021-01-04");
    core.jobs.get(job)!.endsAt = core.date;
    const receipt = coreAPI(core).settleFinanceContract(purchase);
    expect(receipt.nextHouseholdPurchaseCalendarBasis).toMatchObject({
      effectiveDueAt: "2021-02-04",
      mode: "missing-income",
      references: [],
    });
    expect(core.jobs.get(job)!.endsAt).toBe("2021-01-04");
  });

  it("follows a replacement owned job while a captured old basis keeps its exact Sources", () => {
    const core = fixture();
    settle(core, "2021-01-04");
    const first = core.finance.latestReceiptsByContract.get(purchase)!,
      retained = JSON.stringify(first.nextHouseholdPurchaseCalendarBasis),
      old = core.work.commitments.get(commitment)!,
      nextJob = `${job}:replacement`,
      nextCommitment = `${commitment}:replacement`,
      replacementSource: Source = {
        ...source,
        asOf: "2021-02-08",
        citation:
          "Explicit actual fixture replacement owned job and Wednesday schedule.",
      };
    advanceDate(core, "2021-02-08");
    core.jobs.get(job)!.endsAt = core.date;
    old.endsAt = core.date;
    // Controlled actual replacement fixture records; no project API invents a job.
    core.jobs.set(nextJob, {
      ...core.jobs.get(job)!,
      id: nextJob,
      endsAt: undefined,
      source: replacementSource,
    });
    core.finance.jobsByOrganization.get(employer)!.add(nextJob);
    core.people.get(worker)!.jobId = nextJob;
    const replacement: WorkCommitmentInput = {
      ...old,
      id: nextCommitment,
      jobId: nextJob,
      endsAt: undefined,
      startsAt: core.date,
      anchorDate: "2021-02-10",
      scheduleSource: replacementSource,
      paySource: replacementSource,
    };
    coreAPI(core).addWorkCommitment(replacement);
    old.scheduleSource.citation =
      "The historical schedule Source was subsequently superseded.";
    old.paySource.citation =
      "The historical pay Source was subsequently superseded.";
    const second = coreAPI(core).settleFinanceContract(purchase);
    expect(second.nextHouseholdPurchaseCalendarBasis?.effectiveDueAt).toBe(
      "2021-03-10",
    );
    expect(
      second.nextHouseholdPurchaseCalendarBasis?.references.map(
        (ref) => ref.id,
      ),
    ).toEqual([nextJob, nextCommitment]);
    expect(JSON.stringify(first.nextHouseholdPurchaseCalendarBasis)).toBe(
      retained,
    );
    expect(
      first.nextHouseholdPurchaseCalendarBasis?.references.find(
        (ref) => ref.kind === "commitment",
      )?.paySource?.citation,
    ).toBe(source.citation);
  });

  it("leaves actual supplied monthly invoices on their original dated cadence", () => {
    const core = fixture({ supplied: true });
    for (const [date, next] of [
      ["2021-01-04", "2021-02-04"],
      ["2021-02-04", "2021-03-04"],
      ["2021-03-04", "2021-04-04"],
    ] as const) {
      const receipt = settle(core, date),
        row = core.finance.contracts.get(purchase)!;
      expect(row.dueAt).toBe(next);
      expect(row.householdPurchaseCalendar).toBeUndefined();
      expect(row.nominalDueAt).toBeUndefined();
      expect(receipt.nextHouseholdPurchaseCalendarBasis).toBeUndefined();
      expect(row.amountMinor).toBe(unit);
      expect(row.periodMonths).toBe(one);
    }
  });

  it("preserves a supplied end even if the next owned pay date falls after it", () => {
    const core = fixture({ endsAt: "2021-04-04" });
    settle(core, "2021-01-04");
    settle(core, "2021-02-08");
    settle(core, "2021-03-08");
    const row = core.finance.contracts.get(purchase)!;
    expect(row.endsAt).toBe("2021-04-04");
    expect(row.dueAt).toBe("2021-04-05");
    expect(dueMember(core, row.dueAt)).toBe(false);
    const beforeRejectedSettlement = writerState(core);
    expect(() => settle(core, row.dueAt)).toThrow(
      "Actual standing finance terms are not currently due.",
    );
    expect(writerState(core)).toBe(beforeRejectedSettlement);
    expect(core.finance.latestReceiptsByContract.get(purchase)!.date).toBe(
      "2021-03-08",
    );
  });

  it("rejects malformed marker admission before writing a contract, index or gap", () => {
    const core = fixture({ supplied: true }),
      base = opening().finance!.contracts[zero]!,
      before = JSON.stringify([writerState(core), [...core.gaps]]),
      marker = base.householdPurchaseCalendar!;
    for (const invalid of [
      { ...marker, ruleId: "not-the-declared-rule" },
      { ...marker, householdId: "household:not-the-owner" },
      { ...marker, firstNominalDueAt: "2021-01-05" },
      { ...marker, source: { ...marker.source, tag: "SOURCED" as const } },
    ]) {
      const terms = {
        ...base,
        id: `${purchase}:malformed`,
        householdPurchaseCalendar: invalid,
      };
      expect(() =>
        validateHouseholdPurchaseCalendarAdmission(terms, core.date),
      ).toThrow();
      expect(() => coreAPI(core).addFinanceContract(terms)).toThrow();
      expect(JSON.stringify([writerState(core), [...core.gaps]])).toBe(before);
    }
  });

  it("prepares a renewal without writing cash, dates, indexes or a work occurrence", () => {
    const core = fixture();
    advanceDate(core, "2021-01-04");
    const before = writerState(core),
      session = new FinancePlanningSession(
        core,
        core.cashJournal,
        cashJournalParameters(core),
      ),
      result = prepareFinanceContract(session, purchase),
      plan = session.seal(result);
    expect(plan.result.nextHouseholdPurchaseCalendarBasis?.effectiveDueAt).toBe(
      "2021-02-08",
    );
    expect(writerState(core)).toBe(before);
    expect(core.work.lastResultByJob.size).toBe(zero);
    core.work.commitments.get(commitment)!.scheduleSource.citation =
      "Changed actual schedule evidence after original preparation.";
    expect(() =>
      plan.preflight.verify(
        core,
        core.cashJournal,
        cashJournalParameters(core),
      ),
    ).toThrow();
    expect(writerState(core)).toBe(before);
  });

  it("completes a zero monthly budget once without a fake zero journal line", () => {
    const core = fixture({ zeroAmount: true }),
      cash = totalCash(core),
      journalSequence = core.cashJournal.nextSequence,
      journalTotals = JSON.stringify(core.cashJournal.totals),
      receipt = settle(core, "2021-01-04");
    expect(receipt.paidMinor).toBe(zero);
    expect(core.finance.contracts.get(purchase)!.nominalDueAt).toBe(
      "2021-02-04",
    );
    expect(core.finance.contracts.get(purchase)!.dueAt).toBe("2021-02-08");
    expect(core.cashJournal.nextSequence).toBe(journalSequence);
    expect(JSON.stringify(core.cashJournal.totals)).toBe(journalTotals);
    expect(totalCash(core)).toBe(cash);
    const committed = writerState(core);
    expect(() => coreAPI(core).settleFinanceContract(purchase)).toThrow();
    expect(writerState(core)).toBe(committed);
  });

  for (const zeroAmount of [false, true]) {
    for (const change of [
      "schedule",
      "job-ownership",
      "membership",
      "source",
      "source-descriptor",
    ] as const) {
      it(`rejects changed actual ${change} between lookups on the ${zeroAmount ? "zero completion" : "cash"} path atomically`, () => {
        const core = fixture({ zeroAmount });
        advanceDate(core, "2021-01-04");
        const before = writerState(core),
          api = afterFirstLookup(core, coreAPI(core), () => {
            if (change === "schedule")
              core.work.commitments.get(commitment)!.anchorDate = "2021-01-06";
            if (change === "job-ownership")
              core.people.get(worker)!.jobId = undefined;
            if (change === "membership")
              core.work.commitmentsByPerson.get(worker)!.delete(commitment);
            if (change === "source")
              core.work.commitments.get(commitment)!.paySource.citation =
                "Changed actual pay Source between returns.";
            if (change === "source-descriptor")
              Object.defineProperty(
                core.work.commitments.get(commitment)!.paySource,
                "citation",
                {
                  value: source.citation,
                  enumerable: false,
                  configurable: true,
                  writable: true,
                },
              );
          });
        expect(() =>
          settleFinanceContractJournal(core, api, purchase),
        ).toThrow();
        expect(writerState(core)).toBe(before);
        expect(core.work.lastResultByJob.size).toBe(zero);
      });
    }
    it(`rejects changed actual award qualification between lookups on the ${zeroAmount ? "zero completion" : "cash"} path`, () => {
      const core = fixture({
        noWork: true,
        actualIncomeAt: "2021-01-19",
        firstDueAt: "2021-01-19",
        zeroAmount,
      });
      advanceDate(core, "2021-01-19");
      const before = writerState(core),
        api = afterFirstLookup(core, coreAPI(core), () => {
          core.people.get(worker)!.pastFacts = core.people
            .get(worker)!
            .pastFacts!.map((fact) => ({
              ...fact,
              facts: { ...fact.facts, paymentMedium: "in-kind" },
            }));
        });
      expect(() => settleFinanceContractJournal(core, api, purchase)).toThrow();
      expect(writerState(core)).toBe(before);
    });
  }
});
