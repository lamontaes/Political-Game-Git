/** Controlled actual admission/query cases; author has executed NONE of them. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { advanceDate } from "./calendar";
import { coreAPI, createCore } from "./state";
import { parameter as p } from "./parameters";
import {
  plannedWorkMinutesBetween,
  plannedWorkMinutesOnDate,
} from "./modules/work";
import { workSpansOnDateV1 } from "./work-spans-v1";
import type {
  CoreInput,
  CoreState,
  Source,
  WorkCommitmentInput,
  WorkScheduleSlot,
} from "./types";

const at = "2021-01-01",
  personId = "controlled-worker";
const source: Source & {
  savedDetails: { basisIds: readonly string[]; note: string };
} = {
  tag: "SOURCED",
  asOf: "2020-12-01",
  citation:
    "Controlled independently recorded work-span owning evidence; no ordinary-world proof.",
  generationPriorVintage: "controlled-original-vintage",
  savedDetails: {
    basisIds: ["actual-job", "actual-employer"],
    note: "Full original Source child, not a reconstructed citation.",
  },
};
function fixture(
  slots: readonly WorkScheduleSlot[],
  terms: Partial<WorkCommitmentInput> = {},
): CoreInput {
  return {
    seed: "controlled-exact-work-spans",
    startedAt: at,
    people: [
      {
        id: personId,
        givenName: "Controlled",
        familyName: "Worker",
        birthDate: "1980-01-01",
        placeId: "actual-place",
        householdId: "actual-home",
        tier: "weekly",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        source,
        familyIds: [],
        knownIds: [],
        jobId: "actual-job",
      },
    ],
    households: [
      {
        id: "actual-home",
        placeId: "actual-place",
        memberIds: [personId],
        source,
      },
    ],
    organizations: [
      {
        id: "actual-employer",
        placeId: "actual-place",
        name: "Actual controlled employer",
        kind: "employer",
        liquidMinor: p("minorPerDollar"),
        source,
      },
    ],
    jobs: [
      {
        id: "actual-job",
        personId,
        organizationId: "actual-employer",
        title: "Actual saved job",
        wageDailyMinor: p("minorPerDollar"),
        hoursDaily: p("one"),
        hourlyMinor: p("minorPerDollar"),
        source,
      },
    ],
    workCommitments: [
      {
        id: "actual-work",
        personId,
        jobId: "actual-job",
        organizationId: "actual-employer",
        startsAt: at,
        anchorDate: at,
        periodDays: p("one"),
        slots,
        hourlyMinor: p("minorPerDollar"),
        expectedWeeklyMinutes: p("daysPerWeek") * p("minutesPerHour"),
        paySource: source,
        scheduleSource: source,
        ...terms,
      },
    ],
    workPayrollCalendars: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
const hour = p("minutesPerHour");
function slot(startHour: number, minutes: number): WorkScheduleSlot {
  return { offsetDays: p("zero"), startMinute: startHour * hour, minutes };
}
function evidence(core: CoreState) {
  return structuredClone({
    date: core.date,
    sequence: core.sequence,
    people: core.people,
    jobs: core.jobs,
    organizations: core.organizations,
    work: core.work,
    finance: core.finance,
    knowledge: core.knowledgeByPerson,
    log: core.durableLog,
    counters: core.actCounters,
    monthCounters: core.actCountersByMonth,
    monthKinds: core.actsByMonthKind,
    focusPeople: core.focusPersonIds,
    focusPlaces: core.focusPlaceIds,
    stopgaps: core.stopgapHits,
    calendar: core.calendarDates,
    callbacks: core.pendingCallbacks,
    journal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
  });
}
function query(core: CoreState, date = at) {
  return workSpansOnDateV1(coreAPI(core), {
    controlledPersonId: personId,
    date,
  });
}
describe("recorded exact work spans v1 (SOURCE-ONLY author fixtures)", () => {
  it("rejects a missing own Source citation without invoking an inherited getter", () => {
    const core = createCore(fixture([slot(9, hour)])),
      row = core.work.commitments.get("actual-work")!,
      original = row.scheduleSource;
    row.scheduleSource = { ...original };
    Reflect.deleteProperty(row.scheduleSource, "citation");
    let calls = 0;
    const prior = Object.getOwnPropertyDescriptor(Object.prototype, "citation");
    Object.defineProperty(Object.prototype, "citation", {
      configurable: true,
      get() {
        calls++;
        throw new Error("Inherited Source getter executed.");
      },
    });
    try {
      expect(() => query(core)).toThrow(/Source is undated or unavailable/);
      expect(calls).toBe(0);
    } finally {
      if (prior) Object.defineProperty(Object.prototype, "citation", prior);
      else Reflect.deleteProperty(Object.prototype, "citation");
      row.scheduleSource = original;
    }
  });

  it("retains split 9–12/14–17 slots and full original evidence without any quiet actor effects", () => {
    const core = createCore(fixture([slot(9, 3 * hour), slot(14, 3 * hour)])),
      api = coreAPI(core),
      before = evidence(core),
      result = query(core),
      owner = result.owners[p("zero")]!,
      row = core.work.commitments.get("actual-work")!;
    expect(
      owner.spans.map((span) => [
        span.slotIndex,
        span.originDate,
        span.startMinute,
        span.endMinute,
        span.minutes,
      ]),
    ).toEqual([
      [0, at, 9 * hour, 12 * hour, 3 * hour],
      [1, at, 14 * hour, 17 * hour, 3 * hour],
    ]);
    expect(owner.plannedMinutes).toBe(plannedWorkMinutesOnDate(api, row, at));
    expect(owner.plannedMinutes).toBe(
      plannedWorkMinutesBetween(row, at, at, core.data.parameters),
    );
    expect(result.totalPlannedMinutes).toBe(6 * hour);
    expect(owner.commitment.scheduleSource).toEqual(row.scheduleSource);
    expect(owner.commitment.scheduleSource).not.toBe(row.scheduleSource);
    expect(Object.isFrozen(owner.commitment.scheduleSource)).toBe(true);
    expect(
      Object.isFrozen(
        (owner.commitment.scheduleSource as typeof source).savedDetails
          .basisIds,
      ),
    ).toBe(true);
    expect(Reflect.set(owner.spans[0]!, "minutes", p("zero"))).toBe(false);
    expect(evidence(core)).toEqual(before);
    expect(core.focusPersonIds.size).toBe(p("zero"));
  });

  it("keeps original slot order with exact unclamped duration evidence", () => {
    const core = createCore(fixture([slot(12, hour), slot(9, 3 * hour)])),
      result = query(core);
    expect(result.owners[0]!.spans.map((span) => span.startMinute)).toEqual([
      12 * hour,
      9 * hour,
    ]);
    expect(
      result.owners[0]!.spans.map((span) => [
        span.slotIndex,
        span.durationEvidence.minutes,
      ]),
    ).toEqual([
      [0, hour],
      [1, 3 * hour],
    ]);
    expect(
      result.owners[0]!.spans.every((span) =>
        span.durationEvidence.recordRefs.some(
          (ref) => ref.id === "actual-work",
        ),
      ),
    ).toBe(true);
  });

  it("suppresses pre-opening overnight origins, preserves inclusive commitment end and excludes completed-job end", () => {
    const core = createCore(
      fixture([slot(22, 4 * hour)], {
        anchorDate: "2020-12-31",
        periodDays: p("two"),
        endsAt: "2021-01-03",
      }),
    );
    expect(query(core).totalPlannedMinutes).toBe(p("zero"));
    const original = core.work.commitments.get("actual-work")!;
    for (const date of ["2021-01-02", "2021-01-03", "2021-01-04"]) {
      const projected = query(core, date);
      expect(projected.totalPlannedMinutes).toBe(
        plannedWorkMinutesBetween(original, date, date, core.data.parameters),
      );
    }
    expect(query(core, "2021-01-02").owners[0]!.spans[0]!.originDate).toBe(
      "2021-01-02",
    );
    expect(query(core, "2021-01-03").owners[0]!.spans[0]!).toMatchObject({
      originDate: "2021-01-02",
      startMinute: 0,
      minutes: 2 * hour,
    });
    expect(query(core, "2021-01-04").totalPlannedMinutes).toBe(p("zero"));
    advanceDate(core, "2021-01-03");
    core.jobs.get("actual-job")!.endsAt = core.date; // Genuine completed date, exclusive for new work.
    const before = evidence(core);
    expect(query(core, core.date).totalPlannedMinutes).toBe(p("zero"));
    expect(evidence(core)).toEqual(before);
  });

  it("keeps exact midnight spill segments and the next weekly recurrence without expanding dates", () => {
    const core = createCore(fixture([slot(22, 4 * hour)])),
      before = evidence(core);
    expect(
      query(core, "2021-01-02").owners[0]!.spans.map((span) => [
        span.originDate,
        span.startMinute,
        span.minutes,
      ]),
    ).toEqual([
      [at, p("zero"), 2 * hour],
      ["2021-01-02", 22 * hour, 2 * hour],
    ]);
    const periodic = createCore(
      fixture([slot(9, hour)], { periodDays: p("daysPerWeek") }),
    );
    expect(query(periodic, "2021-01-03").totalPlannedMinutes).toBe(p("zero"));
    expect(query(periodic, "2021-01-08").owners[0]!.spans[0]!).toMatchObject({
      startMinute: 9 * hour,
      minutes: hour,
    });
    expect(evidence(core)).toEqual(before);
  });

  it("preserves finite fractional starts/minutes and rejects a tampered raw slot overlap", () => {
    const core = createCore(
        fixture([
          {
            offsetDays: p("zero"),
            startMinute: 9 * hour + 0.25,
            minutes: hour + 0.5,
          },
        ]),
      ),
      result = query(core),
      span = result.owners[0]!.spans[0]!;
    expect(span.startMinute).toBe(9 * hour + 0.25);
    expect(span.endMinute).toBe(10 * hour + 0.75);
    expect(span.minutes).toBe(hour + 0.5);
    expect(result.totalPlannedMinutes).toBe(
      plannedWorkMinutesOnDate(
        coreAPI(core),
        core.work.commitments.get("actual-work")!,
        at,
      ),
    );
    const bad = createCore(fixture([slot(9, 3 * hour), slot(14, 3 * hour)])),
      row = bad.work.commitments.get("actual-work")!;
    bad.work.commitments.set(row.id, {
      ...row,
      slots: [slot(9, 3 * hour), slot(11, hour)],
    });
    const before = evidence(bad);
    expect(() => query(bad)).toThrow(/Periodic job slots overlap/);
    expect(evidence(bad)).toEqual(before);
  });

  it.each(["future-job", "wrong-person", "wrong-employer", "cache"])(
    "rejects actual current owner/cache tampering without effects (%s)",
    (change) => {
      const core = createCore(fixture([slot(9, hour)])),
        job = core.jobs.get("actual-job")!;
      if (change === "future-job") job.endsAt = "2021-01-02";
      else if (change === "wrong-person")
        job.personId = "different-actual-person";
      else if (change === "wrong-employer")
        job.organizationId = "different-actual-employer";
      else
        core.work.plannedByCommitmentResidue
          .get("actual-work")!
          .set(p("zero"), hour + p("one"));
      const before = evidence(core);
      expect(() => query(core, change === "cache" ? "2021-01-02" : at)).toThrow(
        /future completed job|actual job\/employer links|original actual planned-minute/,
      );
      expect(evidence(core)).toEqual(before);
    },
  );

  it("uses captured finite parameter rows without live numeric/provider/module callbacks or stopgap writes", () => {
    const data = {
        ...DEFAULT_DATA,
        parameters: {
          ...DEFAULT_DATA.parameters,
          minutesPerHour: {
            ...DEFAULT_DATA.parameters.minutesPerHour!,
            stopgapId: "SG-P8-life-utility",
          },
        },
      },
      core = createCore(fixture([slot(9, hour)]), { data }),
      api = coreAPI(core),
      before = evidence(core),
      descriptor = Object.getOwnPropertyDescriptor(api, "parameter")!;
    let calls = p("zero");
    Object.defineProperty(api, "parameter", {
      configurable: true,
      get() {
        calls++;
        throw new Error("Live numeric getter executed.");
      },
    });
    try {
      expect(query(core).totalPlannedMinutes).toBe(hour);
      expect(calls).toBe(p("zero"));
      expect(evidence(core)).toEqual(before);
    } finally {
      Object.defineProperty(api, "parameter", descriptor);
    }
    core.data.parameters.minutesPerHour!.value = Number.POSITIVE_INFINITY;
    const malformed = evidence(core);
    expect(() => query(core)).toThrow(/non-finite/);
    expect(evidence(core)).toEqual(malformed);
  });

  it("rejects original Source accessors without executing them and full Source late drift before returning", () => {
    const core = createCore(fixture([slot(9, hour)])),
      row = core.work.commitments.get("actual-work")!,
      original = row.scheduleSource,
      before = evidence(core);
    let getters = p("zero");
    const getterSource = { ...original };
    Object.defineProperty(getterSource, "citation", {
      enumerable: true,
      get() {
        getters++;
        throw new Error("Source getter executed.");
      },
    });
    row.scheduleSource = getterSource;
    expect(() => query(core)).toThrow(/direct own data/);
    expect(getters).toBe(p("zero"));
    row.scheduleSource = original;
    expect(evidence(core)).toEqual(before);
    let keys = p("zero");
    const target = { ...original },
      citation = target.citation,
      drifting = new Proxy(target, {
        ownKeys(value) {
          keys++;
          if (keys === p("two"))
            value.citation = "Changed original evidence during final guard.";
          return Reflect.ownKeys(value);
        },
      });
    row.scheduleSource = drifting;
    expect(() => query(core)).toThrow(/Stale finance/);
    expect(keys).toBe(p("two"));
    expect(target.citation).not.toBe(citation); // Caller trap mutation is not a query-owned effect or rollback promise.
    row.scheduleSource = original;
    expect(evidence(core)).toEqual(before);
  });

  it("uses only the controlled person's native current index without whole-table iteration or supplied iterator hooks", () => {
    const core = createCore(fixture([slot(9, hour)])),
      index = core.work.commitmentsByPerson.get(personId)!;
    let calls = p("zero");
    const forbidden = () => {
      calls++;
      throw new Error("Whole-table or caller iterator executed.");
    };
    for (const table of [
      core.people,
      core.jobs,
      core.organizations,
      core.work.commitments,
    ])
      for (const key of ["values", "entries", Symbol.iterator])
        Object.defineProperty(table, key, {
          configurable: true,
          value: forbidden,
        });
    Object.defineProperty(index, Symbol.iterator, {
      configurable: true,
      get: forbidden,
    });
    try {
      expect(query(core).totalPlannedMinutes).toBe(hour);
      expect(calls).toBe(p("zero"));
    } finally {
      for (const table of [
        core.people,
        core.jobs,
        core.organizations,
        core.work.commitments,
      ])
        for (const key of ["values", "entries", Symbol.iterator])
          Reflect.deleteProperty(table, key);
      Reflect.deleteProperty(index, Symbol.iterator);
    }
  });

  it("rejects a late selected-person index change and an undated Source without creating work", () => {
    const core = createCore(fixture([slot(9, hour)])),
      index = core.work.commitmentsByPerson.get(personId)!,
      request = { controlledPersonId: personId, date: at },
      before = evidence(core);
    let keys = p("zero");
    const proxy = new Proxy(request, {
      ownKeys(value) {
        keys++;
        if (keys === p("two")) index.add("missing-new-commitment");
        return Reflect.ownKeys(value);
      },
    });
    expect(() => workSpansOnDateV1(coreAPI(core), proxy)).toThrow(
      /Stale finance set/,
    );
    index.delete("missing-new-commitment");
    expect(evidence(core)).toEqual(before);
    const row = core.work.commitments.get("actual-work")!;
    row.scheduleSource = { ...row.scheduleSource, asOf: "2021-01-02" };
    const undated = evidence(core);
    expect(() => query(core)).toThrow(/Source is undated or unavailable/);
    expect(evidence(core)).toEqual(undated);
  });
});
