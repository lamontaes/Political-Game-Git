/** M1-05 checks on a recorded fixture: eviction only from unpaid rent, through the place's steps. */
import { describe, expect, it } from "vitest";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE, setRightToCounsel } from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { transferCash } from "./world-transfer";
import type { CoreInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:housing-fixture",
  landlord = "organization:landlord";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Housing fixture only.",
};
function input(usps: string): CoreInput {
  const people = [
    ["payer", 10_000_000],
    ["broke", 0],
  ] as const;
  return {
    seed: "housing-fixture",
    startedAt: start,
    people: people.map(([id, cash]) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: place,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: cash,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
    })),
    households: people.map(([id]) => ({
      id: `household:${id}`,
      placeId: place,
      memberIds: [id],
      source: src,
    })),
    jobs: [],
    organizations: [
      {
        id: landlord,
        placeId: place,
        name: "Rentals",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
    ],
    finance: {
      contracts: people.map(([id]) => ({
        id: `lease:household:${id}`,
        householdId: `household:${id}`,
        payerIds: [id],
        payeeId: landlord,
        kind: "household-purchase",
        amountMinor: 100_000,
        dueAt: "2021-02-01",
        periodMonths: 1,
        accruesArrears: true,
        source: src,
      })),
      facilities: [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    placeMetadata: { housingState: usps },
  };
}

describe("eviction follows the place's steps", () => {
  it("serves notice once rent owed outweighs the landlord's patience after the grace period, files after the cure deadline, and removes only after judgment", () => {
    const usps = "TX",
      law = housingData.eviction[usps];
    const core = createLifeCore(input(usps), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-08-31");
    const cases = api.moduleState("housing").snapshot().tables
      .cases as unknown as Record<string, string | number | boolean>[];
    expect(cases.every((row) => row.leaseId === "lease:household:broke")).toBe(
      true,
    );
    const first = cases[0]!;
    expect(first).toMatchObject({ stage: "removed" });
    const days = (a: unknown, b: unknown) =>
      (Date.parse(String(b)) - Date.parse(String(a))) / 86_400_000;
    // Rent first went unpaid February 1; notice only after the grace period, with rent still owed.
    expect(days("2021-02-01", first.noticeAt)).toBeGreaterThan(
      law.gracePeriodDays,
    );
    expect(Number(first.owedAtNoticeMinor)).toBeGreaterThan(0);
    expect(days(first.noticeAt, first.filedAt)).toBe(law.noticeDays);
    expect(days(first.filedAt, first.judgmentAt)).toBe(law.hearingDays);
    expect(days(first.judgmentAt, first.removedAt)).toBe(law.stayDays);
    expect(core.eventIds.has(`event:housing.eviction:${first.id}`)).toBe(true);
    expect(core.finance.contracts.get("lease:household:broke")!.endedAt).toBe(
      first.removedAt,
    );
    expect(
      core.finance.contracts.get("lease:household:payer")!.endedAt,
    ).toBeUndefined();
  });
});

describe("a tenancy that ends before removal", () => {
  it("closes the case when the household leaves mid-case, with the rent still owed on the lease and no removal", () => {
    const core = createLifeCore(input("TX"), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    const cases = () =>
      api.moduleState("housing").snapshot().tables.cases as unknown as Record<
        string,
        string | number | boolean
      >[];
    // Day by day until notice is served, then the household leaves (as the moves engine ends a leaving household's lease).
    let day = "2021-02-01";
    while (!cases().length) {
      day = new Date(Date.parse(day) + 86_400_000).toISOString().slice(0, 10);
      advanceCore(core, day);
    }
    api.endStandingContract("lease:household:broke");
    const owed = core.finance.contracts.get(
      "lease:household:broke",
    )!.arrearsMinor;
    expect(() => advanceCore(core, "2021-08-31")).not.toThrow();
    const [row] = cases();
    expect(row).toMatchObject({
      open: false,
      stage: "vacated",
      reasonKey: housingData.reasons.vacated,
      owedAtCloseMinor: owed,
    });
    expect(owed).toBeGreaterThan(0);
    expect(core.eventIds.has(`event:housing.eviction:${row!.id}`)).toBe(false);
  });
});

describe("paying within the notice period", () => {
  it("in South Carolina, whose statute lets a tenant cure, cures the case when the household pays what it owes before the deadline", () => {
    const core = createLifeCore(input("SC"), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    // Month by month until the landlord serves notice.
    const noticed = () =>
      (
        api.moduleState("housing").snapshot().tables.cases as unknown as {
          noticeAt: string;
        }[]
      ).length > 0;
    for (const month of ["02", "03", "04", "05", "06", "07"]) {
      advanceCore(core, `2021-${month}-07`);
      if (noticed()) break;
    }
    expect(noticed()).toBe(true);
    // The broke household is paid after the notice (a payday), from the landlord-unrelated payer.
    transferCash(api, "fixture:payday", "payer", "broke", 1_000_000, src);
    advanceCore(
      core,
      new Date(Date.parse(`${core.date}T00:00:00Z`) + 21 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    const cases = api.moduleState("housing").snapshot().tables
      .cases as unknown as { stage: string; leaseId: string }[];
    expect(
      cases.find((row) => row.leaseId === "lease:household:broke"),
    ).toMatchObject({ stage: "cured" });
    expect(
      core.finance.contracts.get("lease:household:broke")!.arrearsMinor,
    ).toBe(0);
  });
});

describe("buying a home", () => {
  it("a renter whose rent outruns what a mortgage would cost buys with the down payment from savings and a loan from the town bank; the lease ends; money balances", async () => {
    const { CREDIT_MODULE } = await import("./modules/credit");
    const { MACRO_MODULE, withCentralBank } = await import("./modules/macro");
    const base = input("TX");
    const buyer = {
      ...base.people[0]!,
      liquidMinor: 10_000_000,
      // What the household spends a day, its rent among it: the bank keeps this
      // many months of it in the wallet when it sweeps savings into deposits.
      livingCostDailyMinor: 10_000,
      jobId: "job:payer",
    };
    const fixture = withCentralBank({
      ...base,
      people: [buyer, base.people[1]!],
      jobs: [
        {
          id: "job:payer",
          personId: "payer",
          organizationId: "organization:shop",
          title: "Clerk",
          hourlyMinor: 1_875,
          hoursDaily: 8,
          wageDailyMinor: 15_000,
          source: src,
        },
      ],
      organizations: [
        ...base.organizations,
        {
          id: "organization:shop",
          placeId: place,
          name: "Shop",
          kind: "employer",
          liquidMinor: 100_000_000,
          source: src,
        },
        {
          id: "organization:bank:fixture",
          placeId: place,
          name: "Bank",
          kind: "bank",
          liquidMinor: 500_000_000,
          source: src,
        },
        {
          id: "outside-market:fixture",
          placeId: place,
          name: "Outside",
          kind: "outside-market",
          liquidMinor: 0,
          outsideFlow: src,
          source: src,
        },
      ],
      finance: {
        ...base.finance!,
        contracts: base.finance!.contracts.map((row) =>
          row.id === "lease:household:payer"
            ? { ...row, amountMinor: 200_000 }
            : row,
        ),
      },
      placeMetadata: { housingState: "TX", housingCounty: "01001" },
    });
    const core = createLifeCore(fixture, {
        data: worldCoreData(),
        modules: [MACRO_MODULE, CREDIT_MODULE, HOUSING_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core);
    const cash = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const outsideNet = () =>
      [...core.cashJournal.externalFlowsByOwner.values()].reduce(
        (n, row) => n + row.netMinor,
        0,
      );
    const opening = cash();
    advanceCore(core, "2021-03-10");
    const purchases = api.moduleState("housing").snapshot().tables
      .purchases as unknown as {
      householdId: string;
      downMinor: number;
      loanMinor: number;
    }[];
    expect(purchases[0]).toMatchObject({ householdId: "household:payer" });
    expect(purchases[0]!.downMinor).toBeGreaterThan(0);
    expect(purchases[0]!.loanMinor).toBeGreaterThan(0);
    // The loan never exceeds what the down payment actually paid supports at the lender's loan-to-value rule.
    const share = housingData.mortgage.downPayment.firstTime;
    expect(purchases[0]!.loanMinor).toBeLessThanOrEqual(
      Math.floor((purchases[0]!.downMinor * (1 - share)) / share),
    );
    expect(
      core.finance.contracts.get("lease:household:payer")!.endedAt,
    ).toBeDefined();
    const loans = api.moduleState("credit").snapshot().tables
      .loans as unknown as { kind: string; householdId: string }[];
    expect(
      loans.some(
        (row) =>
          row.kind === "mortgage" && row.householdId === "household:payer",
      ),
    ).toBe(true);
    expect(
      api
        .moduleState("housing")
        .table("dwellings")
        .get("dwelling:household:payer"),
    ).toMatchObject({ tenure: "own", basis: "purchase" });
    expect(cash()).toBe(opening - outsideNet());
  });
});

describe("right to counsel in eviction", () => {
  it.each([true, false])(
    "a lawyer-assisted plan requires funded counsel (funded=%s)",
    (funded) => {
      const opening = input("TX");
      const core = createLifeCore(
          {
            ...opening,
            people: opening.people.map((row) =>
              row.id === "broke" ? { ...row, jobId: "job:broke" } : row,
            ),
            organizations: [
              ...opening.organizations,
              {
                id: "organization:treasury",
                placeId: place,
                name: "Treasury",
                kind: "government",
                liquidMinor: funded ? 100_000_000 : 0,
                source: src,
              },
              {
                id: "organization:legal-services",
                placeId: place,
                name: "Legal services",
                kind: "outside",
                liquidMinor: 0,
                outsideFlow: src,
                source: src,
              },
              {
                id: "organization:struggling-shop",
                placeId: place,
                name: "Struggling shop",
                kind: "employer",
                liquidMinor: 0,
                source: src,
              },
            ],
            jobs: [
              {
                id: "job:broke",
                personId: "broke",
                organizationId: "organization:struggling-shop",
                title: "Clerk",
                wageDailyMinor: 15_000,
                hoursDaily: 8,
                source: src,
              },
            ],
          },
          { data: worldCoreData(), modules: [HOUSING_MODULE] },
        ),
        api = coreAPI(core);
      advanceCore(core, "2021-01-01");
      setRightToCounsel(api, place, true, "organization:treasury");
      // Month by month until the hearing settles the case.
      for (const day of [
        "03-01",
        "04-01",
        "04-16",
        "05-01",
        "05-16",
        "06-01",
      ]) {
        advanceCore(core, `2021-${day}`);
        const open = (
          api.moduleState("housing").snapshot().tables.cases as unknown as {
            stage: string;
          }[]
        ).some((row) => row.stage === "settled");
        if (open) break;
      }
      const cases = () =>
        api.moduleState("housing").snapshot().tables.cases as unknown as Record<
          string,
          string | number | boolean
        >[];
      const settled = cases().find((row) => row.stage === "settled")!;
      if (!funded) {
        expect(settled).toBeUndefined();
        expect(
          cases().some(
            (row) => row.stage === "removed" || row.stage === "judgment",
          ),
        ).toBe(true);
        expect(cases().some((row) => row.counselPaidMinor === 0)).toBe(true);
        return;
      }
      // Its pay goes unpaid while the shop has no cash; a tenth of the $4,500 a month it's owed carries the arrears inside a year.
      expect(settled).toMatchObject({
        leaseId: "lease:household:broke",
        reasonKey: "counsel-negotiated-payment-plan",
        counselPayerId: "organization:treasury",
        counselProviderId: "organization:legal-services",
        counselPaidMinor: api.parameter("housingCounselCostPerCaseMinor"),
      });
      expect(Number(settled.planMonths)).toBeLessThanOrEqual(12);
      // The household's pay arrives; it keeps up rent and the plan.
      transferCash(api, "fixture:pay", "payer", "broke", 2_000_000, src);
      advanceCore(core, "2022-03-01");
      const done = cases().find((row) => row.id === settled.id)!;
      expect(done).toMatchObject({ stage: "plan-paid", open: false });
      expect(core.finance.contracts.get("lease:household:broke")!.endedAt).toBe(
        undefined,
      );
      expect(core.eventIds.has(`event:housing.eviction:${settled.id}`)).toBe(
        false,
      );
    },
  );
});

describe("a counted household's mortgage", () => {
  it("falls only by the principal actually paid: an unpaid month leaves the principal where it was, a paid month amortizes", () => {
    const core = createLifeCore(input("TX"), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const table = api.moduleState("housing").table("mortgages");
    const row = {
      id: "mortgage:fixture",
      householdId: "household:payer",
      holderId: landlord,
      boughtYear: 2015,
      rate: 0.06,
      originalMinor: 20_000_000,
      balanceMinor: 10_000_000,
      paymentMinor: 120_000,
      monthsLeft: 200,
    };
    table.put(row);
    const interest = Math.round((row.balanceMinor * row.rate) / 12);
    // Nothing of the month's mortgage payments posted: the balance doesn't fall.
    core.finance.totalsByKind.set("household.mortgage", {
      requestedMinor: 120_000,
      paidMinor: 0,
      unfundedMinor: 120_000,
      borrowedMinor: 0,
      repaidMinor: 0,
    });
    advanceCore(core, "2021-02-10");
    const unpaid = table.get("mortgage:fixture") as unknown as typeof row;
    expect(unpaid.balanceMinor).toBeGreaterThanOrEqual(row.balanceMinor);
    expect(unpaid.balanceMinor).toBe(row.balanceMinor + interest);
    expect(unpaid.monthsLeft).toBe(200);
    // The next month's payment posted in full: the balance falls by the principal in it.
    core.finance.totalsByKind.set("household.mortgage", {
      requestedMinor: 240_000,
      paidMinor: 120_000,
      unfundedMinor: 120_000,
      borrowedMinor: 0,
      repaidMinor: 0,
    });
    advanceCore(core, "2021-03-10");
    const paid = table.get("mortgage:fixture") as unknown as typeof row;
    const interest2 = Math.round((unpaid.balanceMinor * 0.06) / 12);
    expect(paid.balanceMinor).toBe(unpaid.balanceMinor - (120_000 - interest2));
    expect(paid.monthsLeft).toBe(199);
  });
});
