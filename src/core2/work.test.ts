import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { advanceDate } from "./calendar";
import { ensureWorkCashModule } from "./work-cash";
import { ensureFinanceCashModule } from "./finance-cash";
import { advanceCore, createLifeCore, chooseAct, availableActs } from "./life";
import { coreAPI } from "./state";
import { parameter as p } from "./parameters";
import { plannedWorkMinutesBetween, runScheduledWork } from "./modules/work";
import {
  residentEmploymentRate,
  DEFAULT_RESIDENT_EMPLOYMENT,
} from "./opening-employment";
import type {
  CoreInput,
  CoreState,
  Source,
  WorkCommitmentInput,
} from "./types";

const startedAt = "2021-01-01",
  nextDay = "2021-01-02";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Controlled work/time contract fixture; not an ordinary generated-world outcome.",
};

function fixture(): CoreInput {
  const people = ["worker-a", "worker-b"].map((id) => ({
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId: "fixture-place",
    householdId: `household:${id}`,
    tier: "weekly",
    traits: {},
    liquidMinor: p("zero"),
    livingCostDailyMinor: p("minorPerDollar"),
    source,
    familyIds: [],
    knownIds: [],
    jobId: `job:${id}`,
  }));
  const jobs = people.map((person) => ({
    id: person.jobId,
    personId: person.id,
    organizationId: "fixture-employer",
    title: "Recorded fixture worker",
    hoursDaily: p("one"),
    hourlyMinor: p("minorPerDollar"),
    wageDailyMinor: p("minorPerDollar"),
    source,
  }));
  const workCommitments: WorkCommitmentInput[] = jobs.map((job) => ({
    id: `work-commitment:${job.id}`,
    jobId: job.id,
    personId: job.personId,
    organizationId: job.organizationId,
    startsAt: startedAt,
    anchorDate: startedAt,
    periodDays: p("one"),
    expectedWeeklyMinutes: p("daysPerWeek") * p("minutesPerHour"),
    hourlyMinor: job.hourlyMinor,
    slots: [
      {
        offsetDays: p("zero"),
        startMinute: p("zero"),
        minutes: p("minutesPerHour"),
      },
    ],
    scheduleSource: source,
    paySource: source,
  }));
  return {
    seed: "work-contract",
    startedAt,
    people,
    jobs,
    workCommitments,
    organizations: [
      {
        id: "fixture-employer",
        placeId: "fixture-place",
        name: "Recorded fixture employer",
        kind: "employer",
        liquidMinor: p("minorPerDollar"),
        source,
      },
    ],
    households: people.map((person) => ({
      id: person.householdId,
      placeId: person.placeId,
      memberIds: [person.id],
      source,
    })),
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function cashWorkSnapshot(core: CoreState) {
  return structuredClone({
    people: core.people,
    jobs: core.jobs,
    organizations: core.organizations,
    work: core.work,
    finance: core.finance,
    knowledge: core.knowledgeByPerson,
    durableLog: core.durableLog,
    logByPerson: core.logByPerson,
    logByKind: core.logByKind,
    logByPlace: core.logByPlace,
    actCounters: core.actCounters,
    actCountersByMonth: core.actCountersByMonth,
    actsByMonthKind: core.actsByMonthKind,
    journal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
  });
}

describe("recorded opening work boundary", () => {
  it("uses actual age resident denominators below full employment and source labels", () => {
    for (const row of DEFAULT_RESIDENT_EMPLOYMENT.nationalAgeRows) {
      const result = residentEmploymentRate(
        p(row.minimumAgeParameter),
        undefined,
      )!;
      expect(result.rate).toBeGreaterThan(p("zero"));
      expect(result.rate).toBeLessThan(p("one"));
      expect(result.basis).toContain("tunable-missing-county");
    }
    const ageRow = DEFAULT_RESIDENT_EMPLOYMENT.countyAgeRows[p("zero")]!;
    const local = residentEmploymentRate(
      p(ageRow.minimumAgeParameter),
      "fixture-geoid",
      {
        ...DEFAULT_RESIDENT_EMPLOYMENT,
        countyCounts: {
          "fixture-geoid": {
            [ageRow.id]: {
              civilianPopulation: String(p("percent")),
              employed: String(p("percent") / p("two")),
            },
          },
        },
      },
    )!;
    expect(local.rate).toBe(p("one") / p("two"));
    expect(local.basis).toBe("county-ACS-civilian-age");
  });

  it("counts periodic overnight date portions without calling them whole shifts", () => {
    const row = {
      ...fixture().workCommitments![p("zero")]!,
      startsAt: nextDay,
      anchorDate: nextDay,
      periodDays: p("daysPerWeek"),
      slots: [
        {
          offsetDays: p("zero"),
          startMinute: p("workNightStartMinute"),
          minutes: p("workHours") * p("minutesPerHour"),
        },
      ],
    };
    const start = plannedWorkMinutesBetween(row, nextDay, nextDay);
    const continuation = plannedWorkMinutesBetween(
      row,
      "2021-01-03",
      "2021-01-03",
    );
    expect(start).toBe(
      (p("hoursPerDay") - p("workNightStartMinute") / p("minutesPerHour")) *
        p("minutesPerHour"),
    );
    expect(continuation).toBeGreaterThan(p("zero"));
    expect(start + continuation).toBe(row.slots[p("zero")]!.minutes);
    expect(plannedWorkMinutesBetween(row, nextDay, "2021-01-15")).toBe(
      plannedWorkMinutesBetween(row, nextDay, "2021-01-07") +
        plannedWorkMinutesBetween(row, "2021-01-08", "2021-01-15"),
    );
  });

  it("settles real paid returns once, retains actual committed IDs, and keeps outsiders quiet", () => {
    const core = createLifeCore(fixture());
    advanceCore(core, nextDay);
    const receipts = [...core.work.lastResultByJob.values()];
    expect(receipts).toHaveLength(fixture().jobs.length);
    expect(receipts.reduce((sum, row) => sum + row.paidMinor, p("zero"))).toBe(
      p("minorPerDollar"),
    );
    for (const row of receipts) {
      expect(row.payerCashBeforeMinor - row.payerCashAfterMinor).toBe(
        row.paidMinor,
      );
      expect(row.payeeCashAfterMinor - row.payeeCashBeforeMinor).toBe(
        row.paidMinor,
      );
      expect(row.shortfallMinor).toBe(row.requestedMinor - row.paidMinor);
      expect(row.sourceActId).toBe(
        `act:${row.date}:${row.personId}:${core.people.get(row.personId)!.actCount}`,
      );
      expect(row.decision).toBeUndefined();
      expect(
        core.knowledgeByPerson
          .get(row.personId)!
          .has(`job:${row.jobId}:latest-work-result`),
      ).toBe(false);
    }
    expect(core.durableLog.size).toBe(p("zero"));
    expect(core.eventIds.size).toBe(p("zero"));
    const cash = [...core.people.values()].map((row) => row.liquidMinor);
    runScheduledWork(
      coreAPI(core),
      (id, offers, context) => chooseAct(core, id, offers, context),
      () => undefined,
    );
    expect([...core.people.values()].map((row) => row.liquidMinor)).toEqual(
      cash,
    );
  });

  it("treats place-only refresh as routine result retention, without full act traces", () => {
    const input = fixture();
    const core = createLifeCore({ ...input, focusPlaceIds: ["fixture-place"] });
    advanceCore(core, nextDay);
    expect(core.work.lastResultByJob.size).toBe(input.jobs.length);
    expect(core.work.detailedResults.size).toBe(p("zero"));
    for (const row of core.work.lastResultByJob.values()) {
      expect(row.decision).toBeUndefined();
      expect(row.sourceActId).toContain(`act:${nextDay}:${row.personId}:`);
      expect(core.durableLog.has(row.sourceActId)).toBe(false);
    }
  });

  it("can disable scheduled work independently of the opening owned jobs", () => {
    const core = createLifeCore(fixture(), { scheduledWork: false });
    advanceCore(core, nextDay);
    expect(core.jobs.size).toBe(fixture().jobs.length);
    expect(core.work.commitments.size).toBe(p("zero"));
    expect(core.work.lastResultByJob.size).toBe(p("zero"));
  });

  it("keeps work/pay results identical across equivalent advance partitions", () => {
    const whole = createLifeCore(fixture()),
      split = createLifeCore(fixture());
    advanceCore(whole, "2021-01-10");
    advanceCore(split, "2021-01-05");
    advanceCore(split, "2021-01-10");
    expect([...split.work.lastResultByJob]).toEqual([
      ...whole.work.lastResultByJob,
    ]);
    expect([...split.work.totalsByJob]).toEqual([...whole.work.totalsByJob]);
    expect([...split.people.values()].map((row) => row.liquidMinor)).toEqual(
      [...whole.people.values()].map((row) => row.liquidMinor),
    );
  });

  it("allows current affect to cause actual absence without a forced action", () => {
    const core = createLifeCore(fixture());
    for (const actor of core.people.values())
      coreAPI(core).updatePerson(actor.id, {
        affect: {
          ...actor.affect,
          stress: p("percent"),
          stressBaseline: p("percent"),
        },
      });
    advanceCore(core, nextDay);
    for (const row of core.work.lastResultByJob.values()) {
      expect(row.attendedMinutes).toBe(p("zero"));
      expect(row.requestedMinor).toBe(p("zero"));
      expect(row.absentMinutes).toBe(row.plannedMinutes);
      expect(core.people.get(row.personId)!.jobId).toBe(row.jobId);
    }
  });

  it("rejects act-admission failure before payment or act-counter mutation", () => {
    const parameters = Object.fromEntries(
      Object.entries(DEFAULT_DATA.parameters).filter(
        ([key]) => key !== "isoMonthCharacters",
      ),
    );
    const core = createLifeCore(fixture(), {
      data: { ...DEFAULT_DATA, parameters },
    });
    const cash = [...core.people.values()].map((row) => row.liquidMinor);
    const payer = core.organizations.get("fixture-employer")!.liquidMinor;
    expect(() => advanceCore(core, nextDay)).toThrow(
      "Untagged numeric parameter: isoMonthCharacters",
    );
    expect(core.organizations.get("fixture-employer")!.liquidMinor).toBe(payer);
    expect([...core.people.values()].map((row) => row.liquidMinor)).toEqual(
      cash,
    );
    expect(
      [...core.people.values()].every((row) => row.actCount === p("zero")),
    ).toBe(true);
    expect(core.work.lastResultByJob.size).toBe(p("zero"));
  });
});

describe("actual owned-job cash admission", () => {
  for (const zeroAttendance of [false, true]) {
    it.each(["worker", "employer", "ended"] as const)(
      `rejects a changed current job %s before cash and all work consequences (${zeroAttendance ? "absence" : "attendance"})`,
      (change) => {
        const core = createLifeCore(fixture()),
          api = coreAPI(core);
        if (zeroAttendance)
          api.updatePerson("worker-a", {
            affect: {
              ...core.people.get("worker-a")!.affect,
              stress: p("percent"),
              stressBaseline: p("percent"),
            },
          });
        advanceDate(core, nextDay);
        ensureWorkCashModule(core);
        ensureFinanceCashModule(core);
        let before: ReturnType<typeof cashWorkSnapshot> | undefined;
        expect(() =>
          runScheduledWork(
            api,
            (id, offers, context) => {
              const decision = chooseAct(core, id, offers, context);
              expect(id).toBe("worker-a");
              expect(decision.selected!.definition.effect).toBe(
                zeroAttendance
                  ? core.data.work!.absenceAction.effect
                  : core.data.work!.attendanceAction.effect,
              );
              const job = core.jobs.get("job:worker-a")!;
              if (change === "worker") job.personId = "worker-b";
              else if (change === "employer")
                job.organizationId = "changed-actual-employer";
              else job.endsAt = nextDay;
              before = cashWorkSnapshot(core);
              return decision;
            },
            () => undefined,
          ),
        ).toThrow("Invalid or duplicate dated work result");
        expect(before).toBeDefined();
        expect(cashWorkSnapshot(core)).toEqual(before);
        expect(core.work.cashSources.size).toBe(p("zero"));
        expect(core.work.cashActSelections.size).toBe(p("zero"));
      },
    );
  }

  it.each([false, true])(
    "uses the final inclusive scheduled date once and rejects duplicate legacy pay (%s absence)",
    (zeroAttendance) => {
      const opening = fixture();
      opening.workCommitments = opening.workCommitments!.map((row) => ({
        ...row,
        endsAt: nextDay,
      }));
      const core = createLifeCore(opening),
        api = coreAPI(core);
      if (zeroAttendance)
        api.updatePerson("worker-a", {
          affect: {
            ...core.people.get("worker-a")!.affect,
            stress: p("percent"),
            stressBaseline: p("percent"),
          },
        });
      advanceCore(core, nextDay);
      const worker = core.people.get("worker-a")!,
        result = core.work.lastResultByJob.get(worker.jobId!)!;
      expect(result.date).toBe(nextDay);
      expect(result.attendedMinutes).toBe(
        zeroAttendance ? p("zero") : p("minutesPerHour"),
      );
      expect(
        availableActs(core, worker.id).some(
          (offer) => offer.definition.effect === "paid-work",
        ),
      ).toBe(false);
      const definition = core.data.actions.find(
        (row) => row.effect === "paid-work",
      )!;
      const offer = {
        definition,
        targetId: worker.jobId!,
        availableHours: p("hoursPerDay"),
      };
      const decision = chooseAct(core, worker.id, [offer]);
      expect(decision.selected).toBe(offer);
      const before = cashWorkSnapshot(core);
      expect(() =>
        api.settleLegacyWorkResult({
          personId: worker.id,
          offer,
          decision,
          date: core.date,
          days: p("one"),
        }),
      ).toThrow("scheduled job");
      expect(cashWorkSnapshot(core)).toEqual(before);
      expect(core.people.get(worker.id)!.actCount).toBe(p("one"));
      expect(core.work.cashActSelections.has(result.sourceActId)).toBe(true);
    },
  );
});
