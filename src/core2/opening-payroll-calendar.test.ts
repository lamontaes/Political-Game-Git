import { describe, expect, it } from "vitest";
import { FinanceReadGuard } from "./finance-plan";
import { parameter as p, PARAMETERS, type Parameter } from "./parameters";
import {
  workPayPeriodOnDate,
  type WorkPayrollCalendarInput,
} from "./work-pay-period";
import {
  DEFAULT_OPENING_PAYROLL_CALENDAR_DATA as DATA,
  openingPayrollEmployerPrior,
  openingPayrollFrequencyAtQuantile,
  openingWorkPayrollCalendars,
  type OpeningPayrollFrequency,
  type OpeningPayrollInput,
} from "./opening-payroll-calendar";
import type { Source } from "./types";

function fixture(
  organizationIds = ["fixture-employer"],
  startedAt = "2021-01-01",
): OpeningPayrollInput {
  const source: Source = {
    tag: "ESTIMATED",
    asOf: startedAt,
    citation:
      "Controlled opening payroll producer fixture; not an ordinary-world employer observation.",
    estimatedFrom:
      "Explicit fixture participants and attended-work terms; no empirical employer payroll phase claimed.",
  };
  const jobs = organizationIds.map((organizationId) => ({
    id: `job:${organizationId}`,
    personId: `person:${organizationId}`,
    organizationId,
    title: "Controlled owned worker",
    wageDailyMinor: p("minorPerDollar"),
    hourlyMinor: p("minorPerDollar"),
    hoursDaily: p("one"),
    source,
  }));
  return {
    seed: "opening-payroll-fixture",
    startedAt,
    people: jobs.map((job) => ({
      id: job.personId,
      givenName: job.personId,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: "fixture-place",
      householdId: `household:${job.personId}`,
      jobId: job.id,
      tier: "weekly",
      traits: {},
      liquidMinor: p("zero"),
      livingCostDailyMinor: p("minorPerDollar"),
      source,
      familyIds: [],
      knownIds: [],
    })),
    jobs,
    organizations: organizationIds.map((id) => ({
      id,
      placeId: "fixture-place",
      name: id,
      kind: "employer",
      classification: "enterprise:professional-services",
      liquidMinor: p("minorPerDollar"),
      source,
    })),
    workCommitments: jobs.map((job) => ({
      id: `commitment:${job.id}`,
      jobId: job.id,
      personId: job.personId,
      organizationId: job.organizationId,
      startsAt: startedAt,
      anchorDate: startedAt,
      periodDays: p("one"),
      slots: [
        {
          offsetDays: p("zero"),
          startMinute: p("zero"),
          minutes: p("minutesPerHour"),
        },
      ],
      expectedWeeklyMinutes: p("daysPerWeek") * p("minutesPerHour"),
      hourlyMinor: p("minorPerDollar"),
      paySource: source,
      scheduleSource: source,
    })),
  };
}
function forceFrequency(
  frequency: OpeningPayrollFrequency,
): Readonly<Record<string, Parameter>> {
  const registry: Record<string, Parameter> = { ...PARAMETERS };
  for (const group of Object.values(DATA.frequencyGroups))
    for (const row of group)
      registry[row.weightParameter] = {
        value: row.frequency === frequency ? p("one") : p("zero"),
        tag: "TUNABLE",
        citation:
          "Controlled exact option-selection fixture, not replacement BLS or education prevalence.",
        estimatedFrom:
          "This fixture isolates the specified calendar branch without a random outcome.",
        stopgapId: DATA.stopgapId,
        spread: {
          status: "unmeasured",
          reason: "Controlled fixture convention, not observed uncertainty.",
        },
        checkRange: { ref: DATA.targetRef },
      };
  return registry;
}
function callerCalendar(input: OpeningPayrollInput): WorkPayrollCalendarInput {
  return {
    id: "caller-payroll",
    organizationId: input.organizations[p("zero")]!.id,
    workCommitmentIds: input.workCommitments!.map((row) => row.id),
    basisRecordIds: ["caller-owned-pay-record"],
    rule: "fixed-days-after-inclusive-period-end",
    periodDays: p("daysPerWeek"),
    firstPeriodStartsAt: "2021-02-01",
    firstPaydayAt: "2021-02-12",
    effectiveFrom: "2021-02-01",
    effectiveUntil: "2021-03-01",
    nonbusinessDayRule: "no-adjustment",
    arrearsRule: "carry-to-next-recorded-payday",
    source: {
      tag: "ESTIMATED",
      asOf: input.startedAt,
      citation: "Actual supplied controlled employer calendar record.",
      estimatedFrom:
        "Supplied dated terms and custom provenance retain exact priority; no proxy replaces them.",
      generationPriorVintage: "caller-calendar-vintage",
    },
  };
}
const units = () => ({
  zero: p("zero"),
  one: p("one"),
  monthsPerYear: p("monthsPerYear"),
});

describe("estimated opening employer payroll calendars", () => {
  it("uses actual default DATA/PARAMETERS and preserves every participant and money/attendance field", () => {
    const input = fixture(),
      before = structuredClone(input),
      result = openingWorkPayrollCalendars(input);
    expect(input).toEqual(before);
    expect(result.calendars).toHaveLength(p("one"));
    expect(result.estimates[p("zero")]!.route).toBe("eligible-private");
    const linked = result.workCommitments[p("zero")]!,
      { payrollCalendarId, ...original } = linked;
    expect(original).toEqual(input.workCommitments![p("zero")]);
    expect(payrollCalendarId).toBe(result.calendars[p("zero")]!.id);
    expect(result.calendars[p("zero")]!.source.tag).toBe("ESTIMATED");
    expect(result.calendars[p("zero")]!.source.estimatedFrom).toContain(
      DATA.stopgapId,
    );
  });
  it("uses all four actual observed national business options and their normalized weight anchors", () => {
    const group = DATA.frequencyGroups["all-private"]!,
      weights = group.map((row) => p(row.weightParameter));
    const total = weights.reduce((sum, value) => sum + value, p("zero"));
    let cumulative = p("zero");
    for (let index = p("zero"); index < group.length; index += p("one")) {
      const quantile = (cumulative + weights[index]! / p("two")) / total;
      const selected = openingPayrollFrequencyAtQuantile(
        "all-private",
        quantile,
      );
      expect(selected.frequency).toBe(group[index]!.frequency);
      expect(selected.parameterRefs).toEqual(
        group.map((row) => row.weightParameter),
      );
      cumulative += weights[index]!;
    }
    expect(group.map((row) => row.frequency)).toEqual([
      "weekly",
      "biweekly",
      "semimonthly",
      "monthly",
    ]);
  });
  it("keeps the same seed/firm startup state stable and varies actual firm calendars", () => {
    const ids = [
      "amber",
      "birch",
      "cedar",
      "dahlia",
      "elm",
      "fern",
      "granite",
      "hazel",
      "iris",
      "juniper",
      "kelp",
      "linden",
      "maple",
      "nettle",
      "oak",
      "pine",
      "quartz",
      "reed",
      "spruce",
      "thistle",
      "umber",
      "violet",
      "willow",
      "yarrow",
    ];
    const input = fixture(ids),
      a = openingWorkPayrollCalendars(input),
      b = openingWorkPayrollCalendars(input);
    expect(a).toEqual(b);
    const prior = ids.map((id) =>
      openingPayrollEmployerPrior(input.seed, id, "frequency"),
    );
    expect(new Set(prior).size).toBeGreaterThan(p("one"));
    expect(
      new Set(
        a.calendars.map(
          (row) =>
            `${row.rule}:${row.firstPeriodStartsAt}:${row.firstPaydayAt}`,
        ),
      ).size,
    ).toBeGreaterThan(p("one"));
    expect(a.workCommitments.every((row) => row.payrollCalendarId)).toBe(true);
  });
  it("shares one employer calendar across its actual owned workers, not independent worker frequency draws", () => {
    const input = fixture(["employer-a", "employer-b"]),
      owner = input.organizations[p("zero")]!.id;
    const joined = {
      ...input,
      organizations: input.organizations.slice(p("zero"), p("one")),
      jobs: input.jobs.map((row) => ({ ...row, organizationId: owner })),
      workCommitments: input.workCommitments!.map((row) => ({
        ...row,
        organizationId: owner,
      })),
    };
    const result = openingWorkPayrollCalendars(joined);
    expect(result.calendars).toHaveLength(p("one"));
    expect(result.calendars[p("zero")]!.workCommitmentIds).toEqual(
      joined.workCommitments.map((row) => row.id),
    );
    expect(
      new Set(result.workCommitments.map((row) => row.payrollCalendarId)).size,
    ).toBe(p("one"));
  });
  it("has no cash/deficit/future-year dependency and never predicts or creates opening earned pay", () => {
    const input = fixture(),
      baseline = openingWorkPayrollCalendars(input);
    const changed = {
      ...input,
      requestedFutureYears: p("monthsPerYear"),
      simulatedDeficitMinor: p("minorPerDollar"),
      organizations: input.organizations.map((row) => ({
        ...row,
        liquidMinor: p("zero"),
      })),
      jobs: input.jobs.map((row) => ({
        ...row,
        wageDailyMinor: row.wageDailyMinor * p("two"),
        hourlyMinor: row.hourlyMinor! * p("two"),
      })),
    };
    const result = openingWorkPayrollCalendars(changed);
    expect(result.calendars).toEqual(baseline.calendars);
    expect(Object.keys(result).sort()).toEqual([
      "calendars",
      "estimates",
      "gaps",
      "workCommitments",
    ]);
    expect(result.calendars[p("zero")]!.source.estimatedFrom).toContain(
      "No pre-opening earned pay",
    );
    expect(changed.people).toBe(input.people);
  });
  it("declares eligible national fallback and keeps farm/unknown owners outside the BLS cohort", () => {
    const input = fixture(["known", "farm", "unknown"]);
    const classifications = [
      "enterprise:recorded-unmapped-private",
      "enterprise:agriculture:crop",
      "unclassified:owner",
    ];
    const result = openingWorkPayrollCalendars({
      ...input,
      organizations: input.organizations.map((row, index) => ({
        ...row,
        classification: classifications[index],
      })),
    });
    expect(result.estimates.map((row) => row.route)).toEqual([
      "eligible-private",
      "farm-extrapolation",
      "unqualified-owner-extrapolation",
    ]);
    expect(result.gaps).toContain(
      "opening-payroll:private-industry-national-fallback:known",
    );
    expect(result.gaps).toContain("opening-payroll:farm-extrapolation:farm");
    expect(result.estimates[p("one")]!.source.estimatedFrom).toContain(
      "outside the CES nonfarm cohort",
    );
    expect(result.estimates[p("two")]!.source.estimatedFrom).toContain(
      "not an eligible BLS observation",
    );
  });
  it("uses separate government and education proxy options with no private-cohort claim", () => {
    const input = fixture(["public-owner", "private-school", "public-school"]);
    const result = openingWorkPayrollCalendars({
      ...input,
      organizations: input.organizations.map((row, index) =>
        index === p("zero")
          ? {
              ...row,
              governmentFacts: {
                governmentKind: "local-government",
                governmentKey: "recorded-government",
                governmentJurisdictionId: "fixture-jurisdiction",
              },
            }
          : {
              ...row,
              classification:
                index === p("one")
                  ? "service:private-school"
                  : "service:school",
              kind: "employer",
            },
      ),
    });
    expect(result.estimates.map((row) => row.route)).toEqual([
      "government-proxy",
      "education-proxy",
      "education-proxy",
    ]);
    const publicCalendar = result.calendars[p("zero")]!;
    expect(publicCalendar.firstPeriodStartsAt).toBe("2020-12-14");
    expect(publicCalendar.firstPaydayAt).toBe("2021-01-07");
    expect(publicCalendar.nonbusinessDayRule).toBe("no-adjustment");
    expect(publicCalendar.source.estimatedFrom).toContain("holiday exceptions");
    for (const row of result.estimates.slice(p("one"))) {
      expect(["biweekly", "monthly"]).toContain(row.frequency);
      expect(row.source.estimatedFrom).toContain(
        "Education is excluded from BLS",
      );
      expect(row.source.estimatedFrom).toContain("equal mix");
    }
    expect(
      input.organizations.every(
        (row) => row.liquidMinor === p("minorPerDollar"),
      ),
    ).toBe(true);
  });
  it("does not turn unrelated qualification metadata into a public employer", () => {
    const input = fixture(),
      result = openingWorkPayrollCalendars({
        ...input,
        organizations: input.organizations.map((row) => ({
          ...row,
          governmentFacts: {
            "openingCustomers.qualification:fixture": "recorded qualification",
          },
        })),
      });
    expect(result.estimates[p("zero")]!.route).toBe("eligible-private");
  });
  it("preserves supplied future dates, custom Source, terms and object identity without invoking startup assumptions", () => {
    const input = fixture(),
      calendar = callerCalendar(input),
      before = structuredClone(calendar);
    const registry: Record<string, Parameter> = { ...PARAMETERS };
    Object.defineProperty(registry, DATA.parameterRefs.lagDays, {
      get() {
        throw new Error("Supplied calendar must not consume generated lag");
      },
    });
    const result = openingWorkPayrollCalendars(
      {
        ...input,
        workPayrollCalendars: [calendar],
        workCommitments: input.workCommitments!.map((row) => ({
          ...row,
          startsAt: calendar.effectiveFrom,
        })),
      },
      { parameters: registry },
    );
    expect(result.calendars[p("zero")]).toBe(calendar);
    expect(result.calendars[p("zero")]!.source).toBe(calendar.source);
    expect(calendar).toEqual(before);
    expect(result.estimates).toEqual([]);
    expect(result.gaps).toEqual([]);
    expect(result.workCommitments[p("zero")]!.payrollCalendarId).toBe(
      calendar.id,
    );
  });
  it("preserves separately supplied payroll groups at one employer and every full Source", () => {
    const initial = fixture(["supplied-group-a", "supplied-group-b"]),
      owner = initial.organizations[p("zero")]!.id;
    const input = {
      ...initial,
      organizations: initial.organizations.slice(p("zero"), p("one")),
      jobs: initial.jobs.map((row) => ({ ...row, organizationId: owner })),
      workCommitments: initial.workCommitments!.map((row) => ({
        ...row,
        organizationId: owner,
        startsAt: "2021-02-01",
      })),
    };
    const a = {
      ...callerCalendar(input),
      id: "supplied-a",
      workCommitmentIds: [input.workCommitments[p("zero")]!.id],
    };
    const b = {
      ...callerCalendar(input),
      id: "supplied-b",
      workCommitmentIds: [input.workCommitments[p("one")]!.id],
      firstPaydayAt: "2021-02-15",
      source: {
        ...a.source,
        citation: "Separate supplied second payroll-group provenance.",
      },
    };
    const before = structuredClone([a, b]),
      result = openingWorkPayrollCalendars({
        ...input,
        workPayrollCalendars: [a, b],
      });
    expect(result.calendars).toEqual(before);
    expect(result.calendars[p("zero")]).toBe(a);
    expect(result.calendars[p("one")]).toBe(b);
    expect(result.calendars[p("one")]!.source).toBe(b.source);
    expect(result.workCommitments.map((row) => row.payrollCalendarId)).toEqual([
      a.id,
      b.id,
    ]);
    expect(result.estimates).toEqual([]);
    expect(result.gaps).toEqual([]);
  });
  it("requires dated prior evidence for historical starts and never backdates a future proxy Source", () => {
    expect(() =>
      openingWorkPayrollCalendars(fixture(undefined, "2013-01-01")),
    ).toThrow(/source is unavailable/);
    const input = fixture(undefined, "2020-11-01");
    const publicInput = {
      ...input,
      organizations: input.organizations.map((row) => ({
        ...row,
        kind: "government",
      })),
    };
    expect(() => openingWorkPayrollCalendars(publicInput)).toThrow(
      /source is unavailable/,
    );
    const supplied = {
      ...callerCalendar(input),
      firstPeriodStartsAt: "2020-10-25",
      firstPaydayAt: "2020-11-06",
      effectiveFrom: "2020-11-01",
      effectiveUntil: "2021-01-01",
    };
    expect(
      openingWorkPayrollCalendars({
        ...publicInput,
        workPayrollCalendars: [supplied],
      }).calendars[p("zero")],
    ).toBe(supplied);
    const school = fixture(undefined, "2020-12-01");
    expect(() =>
      openingWorkPayrollCalendars({
        ...school,
        organizations: school.organizations.map((row) => ({
          ...row,
          classification: "service:school",
        })),
      }),
    ).toThrow(/source is unavailable/);
  });
  it("uses distinct fixed week cycles and true leap-year monthly and semimonthly periods", () => {
    const input = fixture(undefined, "2024-02-01");
    for (const frequency of ["weekly", "biweekly"] as const) {
      const calendar = openingWorkPayrollCalendars(input, {
        parameters: forceFrequency(frequency),
      }).calendars[p("zero")]!;
      expect(calendar.periodDays).toBe(
        p("daysPerWeek") * (frequency === "weekly" ? p("one") : p("two")),
      );
      expect(calendar.nominalBoundaryDays).toBeUndefined();
    }
    const monthly = openingWorkPayrollCalendars(input, {
      parameters: forceFrequency("monthly"),
    }).calendars[p("zero")]!;
    expect(monthly.periodDays).toBeUndefined();
    expect(monthly.periodMonths).toBe(p("one"));
    const february = workPayPeriodOnDate(
      new FinanceReadGuard(),
      monthly,
      "2024-02-29",
      units(),
    );
    expect(february.fromAt).toBe("2024-02-01");
    expect(february.throughAt).toBe("2024-02-29");
    expect(february.dueAt).toBe("2024-03-05");
    const semi = openingWorkPayrollCalendars(input, {
      parameters: forceFrequency("semimonthly"),
    }).calendars[p("zero")]!;
    expect(semi.periodDays).toBeUndefined();
    expect(semi.periodMonths).toBeUndefined();
    expect(semi.nominalBoundaryDays).toEqual([
      p(DATA.parameterRefs.semimonthlyFirstBoundary),
      p(DATA.parameterRefs.semimonthlySecondBoundary),
    ]);
    const secondHalf = workPayPeriodOnDate(
      new FinanceReadGuard(),
      semi,
      "2024-02-16",
      units(),
    );
    expect(secondHalf.fromAt).toBe("2024-02-16");
    expect(secondHalf.throughAt).toBe("2024-02-29");
    expect(secondHalf.dueAt).toBe("2024-03-05");
  });
  it("retains an original monthly nominal day across short months instead of drifting", () => {
    const input = fixture(undefined, "2024-01-31"),
      registry = {
        ...forceFrequency("monthly"),
        [DATA.parameterRefs.monthlyBoundary]: {
          ...PARAMETERS[DATA.parameterRefs.monthlyBoundary]!,
          value: new Date("2024-01-31T00:00:00.000Z").getUTCDate(),
        },
      };
    const calendar = openingWorkPayrollCalendars(input, {
      parameters: registry,
    }).calendars[p("zero")]!;
    const short = workPayPeriodOnDate(
      new FinanceReadGuard(),
      calendar,
      "2024-03-01",
      units(),
    );
    expect(short.fromAt).toBe("2024-02-29");
    expect(short.throughAt).toBe("2024-03-30");
    const following = workPayPeriodOnDate(
      new FinanceReadGuard(),
      calendar,
      "2024-03-31",
      units(),
    );
    expect(following.fromAt).toBe("2024-03-31");
    expect(calendar.nominalBoundaryDays).toEqual([
      new Date("2024-01-31T00:00:00.000Z").getUTCDate(),
    ]);
  });
  it("retains same-value custom assumption provenance and rejects missing actual TUNABLE metadata", () => {
    const input = fixture(),
      base = forceFrequency("weekly"),
      key = DATA.parameterRefs.lagDays;
    const custom = {
      ...base,
      [key]: {
        ...base[key]!,
        citation:
          "Controlled custom lag provenance with the same recorded numeric value.",
      },
    };
    const before = openingWorkPayrollCalendars(input, { parameters: base }),
      after = openingWorkPayrollCalendars(input, { parameters: custom });
    expect(after.calendars[p("zero")]!.firstPaydayAt).toBe(
      before.calendars[p("zero")]!.firstPaydayAt,
    );
    expect(after.calendars[p("zero")]!.source.estimatedFrom).toContain(
      custom[key]!.citation,
    );
    expect(after.calendars[p("zero")]!.source).not.toEqual(
      before.calendars[p("zero")]!.source,
    );
    expect(() =>
      openingWorkPayrollCalendars(input, {
        parameters: {
          ...base,
          [key]: { ...base[key]!, checkRange: undefined },
        },
      }),
    ).toThrow(/qualified metadata/);
    expect(() =>
      openingWorkPayrollCalendars(input, {
        parameters: { ...base, [key]: { ...base[key]!, value: -p("one") } },
      }),
    ).toThrow(/lag/);
  });
  it("rejects wrong supplied ownership, duplicate membership and unsupported holiday rules without input effects", () => {
    const input = fixture(),
      calendar = callerCalendar(input),
      before = structuredClone(input);
    expect(() =>
      openingWorkPayrollCalendars({
        ...input,
        workPayrollCalendars: [
          { ...calendar, organizationId: "other-employer" },
        ],
      }),
    ).toThrow(/employer/);
    expect(() =>
      openingWorkPayrollCalendars({
        ...input,
        workPayrollCalendars: [
          {
            ...calendar,
            workCommitmentIds: [
              ...calendar.workCommitmentIds,
              ...calendar.workCommitmentIds,
            ],
          },
        ],
      }),
    ).toThrow(/membership/);
    expect(() =>
      openingWorkPayrollCalendars({
        ...input,
        workPayrollCalendars: [
          {
            ...calendar,
            nonbusinessDayRule:
              "caller-recorded-holiday-policy" as "no-adjustment",
          },
        ],
      }),
    ).toThrow(/unsupported/);
    expect(() =>
      openingWorkPayrollCalendars({
        ...input,
        workPayrollCalendars: [
          { ...calendar, source: { ...calendar.source, asOf: "2021-01-02" } },
        ],
      }),
    ).toThrow(/available qualified Source/);
    expect(input).toEqual(before);
  });
  it("rejects malformed startup identities, bounded quantiles and collapsing monthly parameters", () => {
    expect(() => openingPayrollEmployerPrior(" ", "firm", "frequency")).toThrow(
      /identity/,
    );
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -p("one"),
      p("one"),
    ])
      expect(() =>
        openingPayrollFrequencyAtQuantile("all-private", value),
      ).toThrow(/quantile/);
    const registry = {
      ...forceFrequency("semimonthly"),
      [DATA.parameterRefs.semimonthlySecondBoundary]: {
        ...PARAMETERS[DATA.parameterRefs.semimonthlySecondBoundary]!,
        value: p(DATA.parameterRefs.semimonthlyFirstBoundary),
      },
    };
    expect(() =>
      openingWorkPayrollCalendars(fixture(), { parameters: registry }),
    ).toThrow(/boundaries/);
  });
});
