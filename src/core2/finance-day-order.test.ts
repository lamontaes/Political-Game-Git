import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { DEFAULT_DATA } from "./data";
import type { CoreInput, Source } from "./types";

const source: Source = {
  tag: "ESTIMATED",
  asOf: "2021-01-01",
  citation: "Controlled same-day wage and household purchase fixture.",
};

function fixture(): CoreInput {
  return {
    seed: "same-day-wage-purchase",
    startedAt: source.asOf,
    people: [
      {
        id: "worker",
        givenName: "Fixture",
        familyName: "Worker",
        birthDate: "1980-01-01",
        placeId: "town",
        householdId: "home",
        jobId: "job",
        tier: "weekly",
        traits: {},
        liquidMinor: 0,
        livingCostDailyMinor: 100,
        familyIds: [],
        knownIds: [],
        source,
      },
    ],
    households: [
      { id: "home", placeId: "town", memberIds: ["worker"], source },
    ],
    organizations: [
      {
        id: "employer",
        name: "Fixture employer",
        placeId: "town",
        kind: "employer",
        liquidMinor: 100,
        source,
      },
      {
        id: "seller",
        name: "Fixture seller",
        placeId: "town",
        kind: "employer",
        liquidMinor: 0,
        source,
      },
    ],
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Fixture work",
        hoursDaily: 1,
        hourlyMinor: 100,
        wageDailyMinor: 100,
        source,
      },
    ],
    workCommitments: [
      {
        id: "work",
        jobId: "job",
        personId: "worker",
        organizationId: "employer",
        startsAt: source.asOf,
        anchorDate: source.asOf,
        periodDays: 1,
        expectedWeeklyMinutes: 420,
        hourlyMinor: 100,
        slots: [{ offsetDays: 0, startMinute: 0, minutes: 60 }],
        scheduleSource: source,
        paySource: source,
      },
    ],
    finance: {
      contracts: [
        {
          id: "purchase",
          householdId: "home",
          payerIds: ["worker"],
          payeeId: "seller",
          kind: DEFAULT_DATA.finance!.kinds.purchase,
          amountMinor: 50,
          dueAt: "2021-01-02",
          periodMonths: 1,
          accruesArrears: false,
          salesReceipt: true,
          source,
        },
      ],
      facilities: [],
      businesses: [],
      conditions: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

describe("household spending on its actual modeled payday", () => {
  it("uses today's completed wage before consuming a due purchase budget", () => {
    const core = createLifeCore(fixture());
    advanceCore(core, "2021-01-02");
    const wage = core.work.lastResultByJob.get("job")!;
    const purchase = core.finance.latestReceiptsByContract.get("purchase")!;
    expect(wage.date).toBe("2021-01-02");
    expect(wage.attendedMinutes).toBe(60);
    expect(wage.paidMinor).toBe(100);
    expect(purchase.date).toBe(wage.date);
    expect(purchase.paidMinor).toBe(50);
    expect(purchase.unfundedMinor).toBe(0);
    expect(core.people.get("worker")!.liquidMinor).toBe(50);
    expect(core.organizations.get("employer")!.liquidMinor).toBe(0);
    expect(core.organizations.get("seller")!.liquidMinor).toBe(50);
    expect(core.finance.contracts.get("purchase")!.dueAt).toBe("2021-02-02");
  });
});
