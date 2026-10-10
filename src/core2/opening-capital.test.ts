import { describe, expect, it } from "vitest";
import {
  createOpeningFinance,
  DEFAULT_OPENING_FINANCE_DATA,
} from "./opening-finance";
import {
  createOpeningEmployerCapital,
  DEFAULT_OPENING_CAPITAL_DATA,
  openingEmployerCashBufferAtQuantile,
  openingEmployerCashBufferPrior,
} from "./opening-capital";
import reference from "./data/opening-employer-cash-reference.json" with { type: "json" };
import originalContext from "../../data/research/money/opening-employer-cash-buffers.json" with { type: "json" };
import { PARAMETERS, parameter as p, type Parameter } from "./parameters";
import { buildPopulation } from "./population";
import { createCore } from "./state";
import type { CoreInput, Source, WorkCommitmentInput } from "./types";

const at = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: at,
  citation:
    "Controlled opening-capital boundary fixture; no observed firm, bank, owner contribution, appropriation, receipt or survival result.",
  estimatedFrom:
    "A saved one-hour Monday shift at one dollar per hour; calendar-average job wage intentionally differs from the saved payment terms.",
};

function fixture(): CoreInput {
  const personId = "capital:worker";
  const jobId = "capital:job";
  const organizationId = "capital:firm";
  const person = {
    id: personId,
    givenName: "Capital",
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId: "capital:place",
    householdId: "capital:household",
    tier: "weekly",
    traits: {},
    liquidMinor: 37,
    livingCostDailyMinor: p("minorPerDollar"),
    source,
    familyIds: [],
    knownIds: [],
    jobId,
  };
  const job = {
    id: jobId,
    personId,
    organizationId,
    title: "One-hour Monday worker",
    hoursDaily: p("one"),
    hourlyMinor: p("minorPerDollar"),
    wageDailyMinor: p("minorPerDollar") * p("minorPerDollar"),
    source,
  };
  const commitment: WorkCommitmentInput = {
    id: "capital:commitment",
    jobId,
    personId,
    organizationId,
    startsAt: at,
    anchorDate: "2021-01-04",
    periodDays: p("daysPerWeek"),
    slots: [
      {
        offsetDays: p("zero"),
        startMinute: p("zero"),
        minutes: p("minutesPerHour"),
      },
    ],
    expectedWeeklyMinutes: p("minutesPerHour"),
    hourlyMinor: p("minorPerDollar"),
    scheduleSource: source,
    paySource: source,
  };
  return {
    seed: "capital:no-dice",
    startedAt: at,
    people: [person],
    households: [
      {
        id: person.householdId,
        placeId: person.placeId,
        memberIds: [person.id],
        source,
      },
    ],
    jobs: [job],
    workCommitments: [commitment],
    organizations: [
      {
        id: organizationId,
        placeId: person.placeId,
        name: "Opening capital fixture restaurant",
        kind: "employer",
        classification: "enterprise:food-service",
        liquidMinor: 41,
        source,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function estimate(input: CoreInput = fixture()) {
  return createOpeningEmployerCapital(
    input,
    new Set(input.organizations.map((row) => row.id)),
  );
}

describe("fresh sourced private-employer opening stocks (source-only fixtures)", () => {
  it("uses the 52 saved Monday shifts and actual 365 calendar days with default PARAMETERS", () => {
    const input = fixture();
    const before = structuredClone(input);
    const result = estimate(input);
    const row = result.estimates[0]!;
    expect(row.status).toBe("estimated-private-buffer");
    expect(row.industry).toBe("restaurants");
    expect(row.bufferDays).toBe(33.06130356295034);
    expect(row.startupQuantile).toBe(0.7843550593825057);
    expect(row.observedBufferDays).toEqual({
      percentile25: 9,
      median: 16,
      percentile75: 31,
    });
    expect(row.estimatedBufferEndpoints).toEqual({ low: 2, high: 46 });
    expect(row.calendarDays).toBe(365);
    expect(row.plannedPayrollMinor).toBe(5200);
    expect(row.plannedOtherCostsMinor).toBeCloseTo(
      17188.49315068493,
      p("emotionComparisonDigits"),
    );
    expect(row.liquidMinor).toBe(2028);
    expect(row.commitmentIds).toEqual(["capital:commitment"]);
    expect(row.source.citation).toContain("JPMorgan Chase Institute");
    expect(row.source.citation).toContain("IRS");
    expect(row.source.estimatedFrom).toContain("ALL cash debits");
    expect(row.source.estimatedFrom).toContain("owner capital");
    expect(row.parameterRefs).not.toContain("organizationReserveMonths");
    expect(input).toEqual(before);
    expect(result.organizations[0]!.id).toBe(input.organizations[0]!.id);
    expect(result.organizations[0]!.placeId).toBe(
      input.organizations[0]!.placeId,
    );
    expect(result.organizations[0]!.name).toBe(input.organizations[0]!.name);
    expect(result).not.toHaveProperty("receipts");
    expect(result).not.toHaveProperty("contracts");
  });

  it("follows saved hourly rates and actual slot minutes instead of calendar wageDailyMinor", () => {
    const input = fixture();
    const changedProxy = {
      ...input,
      jobs: input.jobs.map((row) => ({
        ...row,
        wageDailyMinor: Number.MAX_SAFE_INTEGER,
      })),
    };
    expect(estimate(changedProxy).estimates).toEqual(estimate(input).estimates);
    const hourly = {
      ...input,
      workCommitments: input.workCommitments!.map((row) => ({
        ...row,
        hourlyMinor: row.hourlyMinor * p("two"),
      })),
    };
    expect(estimate(hourly).estimates[0]!.plannedPayrollMinor).toBe(10400);
    expect(estimate(hourly).estimates[0]!.liquidMinor).toBe(4056);
    const shorter = {
      ...input,
      workCommitments: input.workCommitments!.map((row) => ({
        ...row,
        slots: row.slots.map((slot) => ({
          ...slot,
          minutes: slot.minutes / p("two"),
        })),
      })),
    };
    expect(estimate(shorter).estimates[0]!.plannedPayrollMinor).toBe(2600);
    expect(estimate(shorter).estimates[0]!.liquidMinor).toBe(1014);
  });

  it("counts a leap-year calendar and its 53 Mondays without a mean-year shortcut", () => {
    const input = fixture();
    const leap = {
      ...input,
      startedAt: "2024-01-01",
      workCommitments: input.workCommitments!.map((row) => ({
        ...row,
        startsAt: "2024-01-01",
        anchorDate: "2024-01-01",
      })),
    };
    const row = estimate(leap).estimates[0]!;
    expect(row.calendarDays).toBe(366);
    expect(row.plannedPayrollMinor).toBe(5300);
    expect(row.liquidMinor).toBe(2061);
    expect(row.bufferDays).toBe(estimate(input).estimates[0]!.bufferDays);
    expect(row.from).toBe("2024-01-01");
    expect(row.through).toBe("2024-12-31");
  });

  it("uses only the 184-day remaining calendar window for a midyear opening", () => {
    const input = fixture();
    const midyear = {
      ...input,
      startedAt: "2021-07-01",
      workCommitments: input.workCommitments!.map((row) => ({
        ...row,
        startsAt: "2021-07-01",
        anchorDate: "2021-07-05",
      })),
    };
    const row = estimate(midyear).estimates[0]!;
    expect(row.calendarDays).toBe(184);
    expect(row.plannedPayrollMinor).toBe(2600);
    expect(row.liquidMinor).toBe(2011);
    expect(row.startupQuantile).toBe(
      estimate(input).estimates[0]!.startupQuantile,
    );
    expect(row.from).toBe("2021-07-01");
  });

  it("counts midnight overflow only inside the recorded calendar window", () => {
    const input = fixture();
    const overnight = {
      ...input,
      workCommitments: input.workCommitments!.map((row) => ({
        ...row,
        anchorDate: at,
        periodDays: p("one"),
        slots: [
          {
            offsetDays: p("zero"),
            startMinute:
              p("hoursPerDay") * p("minutesPerHour") -
              p("minutesPerHour") / p("two"),
            minutes: p("minutesPerHour"),
          },
        ],
      })),
    };
    expect(estimate(overnight).estimates[0]!.plannedPayrollMinor).toBe(36450);
    expect(estimate(overnight).estimates[0]!.calendarDays).toBe(365);
  });

  it("honors an inclusive recorded schedule end instead of inventing work after it", () => {
    const input = fixture();
    const endsOnOpening = {
      ...input,
      workCommitments: input.workCommitments!.map((row) => ({
        ...row,
        anchorDate: at,
        periodDays: p("one"),
        endsAt: at,
      })),
    };
    expect(estimate(endsOnOpening).estimates[0]!.plannedPayrollMinor).toBe(100);
    expect(estimate(endsOnOpening).estimates[0]!.liquidMinor).toBe(39);
  });

  it.each([
    "enterprise:manufacturing",
    "enterprise:telecommunications",
    "enterprise:insurance",
    "enterprise:building-services",
    "service:private-school",
    "enterprise:lodging",
  ])(
    "uses the approved overall fallback for %s without guessing a narrower source industry",
    (classification) => {
      const input = fixture();
      const row = estimate({
        ...input,
        organizations: input.organizations.map((organization) => ({
          ...organization,
          classification,
        })),
      }).estimates[0]!;
      expect(row.status).toBe("estimated-private-buffer");
      expect(row.overallFallback).toBe(true);
      expect(row.industry).toBe("all-small-businesses");
      expect(row.observedBufferDays!.median).toBe(27);
      expect(row.bufferDays).toBe(66.8097083135508);
      expect(row.parameterRefs).toContain("openingEmployerCashBufferDaysAll");
    },
  );

  it.each([
    {
      classification: "enterprise:food-service",
      industry: "restaurants",
      days: 16,
    },
    { classification: "enterprise:retail", industry: "retail", days: 19 },
    {
      classification: "enterprise:construction",
      industry: "construction",
      days: 20,
    },
    {
      classification: "enterprise:wholesale",
      industry: "wholesalers",
      days: 23,
    },
    {
      classification: "service:clinic",
      industry: "health-care-services",
      days: 30,
    },
    {
      classification: "enterprise:real-estate",
      industry: "real-estate",
      days: 47,
    },
  ])(
    "uses the exact saved classification for $classification",
    ({ classification, industry, days }) => {
      const input = fixture();
      const row = estimate({
        ...input,
        organizations: input.organizations.map((organization) => ({
          ...organization,
          classification,
        })),
      }).estimates[0]!;
      expect(row.status).toBe("estimated-private-buffer");
      expect(row.overallFallback).toBe(false);
      expect(row.industry).toBe(industry);
      expect(row.observedBufferDays!.median).toBe(days);
      expect(
        openingEmployerCashBufferAtQuantile(industry, p("one") / p("two"))
          .bufferDays,
      ).toBe(days);
    },
  );

  it.each([
    { classification: "sector:local-government-office", kind: "employer" },
    { classification: "service:school", kind: "employer" },
    { classification: "service:hospital", kind: "employer" },
    { classification: "enterprise:banking", kind: "employer" },
    { classification: "enterprise:utility", kind: "employer" },
    { classification: "enterprise:fixture-unbound", kind: "employer" },
    { classification: "enterprise:food-service", kind: "public-institution" },
    { classification: "enterprise:food-service", kind: "government" },
    { classification: "enterprise:food-service", kind: "nonprofit" },
  ])(
    "models an explicitly zero-funded unsupported $kind/$classification opening",
    ({ classification, kind }) => {
      const input = fixture();
      const unsupported = {
        ...input,
        organizations: input.organizations.map((organization) => ({
          ...organization,
          classification,
          kind,
        })),
      };
      const forbiddenParameters = new Set([
        "organizationReserveMonths",
        ...Object.values(
          DEFAULT_OPENING_CAPITAL_DATA.medianDaysParameterByIndustry,
        ),
        DEFAULT_OPENING_CAPITAL_DATA.tailSpanParameter,
      ]);
      const forbiddenPrivateData = new Set([
        "source",
        "overallIndustry",
        "medianDaysParameterByIndustry",
        "industryByClassification",
        "stopgapId",
        "openingPriorNamespace",
        "tailSpanParameter",
        "spreadStopgapId",
        "spreadTargetRef",
      ]);
      const parameters = new Proxy(PARAMETERS, {
        get(target, key, receiver) {
          if (forbiddenParameters.has(String(key)))
            throw new Error(
              "Unsupported owner invoked a reserve or JPMC parameter",
            );
          return Reflect.get(target, key, receiver);
        },
      });
      const data = new Proxy(DEFAULT_OPENING_CAPITAL_DATA, {
        get(target, key, receiver) {
          if (forbiddenPrivateData.has(String(key)))
            throw new Error(
              "Unsupported owner invoked private JPMC capital evidence",
            );
          return Reflect.get(target, key, receiver);
        },
      });
      const result = createOpeningEmployerCapital(
        unsupported,
        new Set([input.organizations[0]!.id]),
        { parameters, data },
      );
      const row = result.estimates[0]!;
      const core = createCore({
        ...unsupported,
        organizations: result.organizations,
      });
      const residualId = core.cashJournal.residualAccountByOwner.get(
        row.organizationId,
      )!;
      const account = core.cashJournal.accounts.get(residualId);
      expect({ status: row.status, tag: row.source.tag }).toEqual({
        status: "modeled-zero-funded-opening-pending-dated-funding",
        tag: "ESTIMATED",
      });
      expect({
        stock: row.liquidMinor,
        ownerCash: core.organizations.get(row.organizationId)?.liquidMinor,
        accountOwner: account?.ownerId,
        accountSource: account?.source,
        partition: account?.allocatedMinor,
        accountCount: core.cashJournal.accountCountByOwner.get(
          row.organizationId,
        ),
      }).toEqual({
        stock: p("zero"),
        ownerCash: p("zero"),
        accountOwner: row.organizationId,
        accountSource: row.source,
        partition: undefined,
        accountCount: p("one"),
      });
      expect(row.parameterRefs).toEqual(["zero"]);
      expect(row.startupQuantile).toBeUndefined();
      expect(row.parameterRefs).not.toContain(
        "openingEmployerCashBufferTailSpan",
      );
      expect(row.bufferDays).toBeUndefined();
      expect(row.source.citation).not.toContain("JPMorgan");
      expect(row.source.estimatedFrom).toContain(
        "Not an observed zero balance",
      );
      expect(result.gaps).toContain(
        `opening-capital:modeled-zero-funded-pending-dated-funding:${input.organizations[0]!.id}`,
      );
    },
  );

  it("excludes a recorded government owner even when the classification looks private", () => {
    const input = fixture();
    const publicOwner = {
      ...input,
      organizations: input.organizations.map((organization) => ({
        ...organization,
        governmentFacts: {
          governmentKind: "municipality",
          governmentKey: "recorded:fixture-owner",
          governmentJurisdictionId: "recorded:fixture-jurisdiction",
        },
      })),
    };
    expect(estimate(publicOwner).estimates[0]).toMatchObject({
      status: "modeled-zero-funded-opening-pending-dated-funding",
      liquidMinor: p("zero"),
      source: { tag: "ESTIMATED" },
    });
    expect(estimate(publicOwner).estimates[0]!.bufferDays).toBeUndefined();
  });

  it("preserves recorded positive and zero balances and sources when they are not fresh", () => {
    for (const liquidMinor of [p("zero"), 41]) {
      const input = fixture();
      input.organizations = input.organizations.map((row) => ({
        ...row,
        liquidMinor,
      }));
      const before = structuredClone(input);
      const result = createOpeningEmployerCapital(input, new Set());
      expect(result.organizations).toBe(input.organizations);
      expect(result.organizations[0]!.source).toBe(
        input.organizations[0]!.source,
      );
      expect(result.organizations[0]!.liquidMinor).toBe(liquidMinor);
      expect(result.estimates).toEqual([]);
      expect(input).toEqual(before);
      const finance = createOpeningFinance(input);
      expect(input.organizations[0]!.liquidMinor).toBe(liquidMinor);
      expect(finance).not.toHaveProperty("openingCreditMinor");
    }
  });

  it("has no survival floor, future deficit rescue or refill", () => {
    const input = fixture();
    const noStaff = {
      ...input,
      jobs: [],
      workCommitments: [],
      people: input.people.map((row) => ({ ...row, jobId: undefined })),
    };
    expect(estimate(noStaff).estimates[0]!.plannedPayrollMinor).toBe(0);
    expect(estimate(noStaff).estimates[0]!.plannedOtherCostsMinor).toBe(0);
    expect(estimate(noStaff).estimates[0]!.liquidMinor).toBe(0);
    const withFutureDeficit: CoreInput = {
      ...input,
      finance: {
        facilities: [],
        businesses: [],
        gaps: [],
        contracts: [
          {
            id: "capital:future-large-cost",
            payerIds: [input.organizations[0]!.id],
            payeeId: input.people[0]!.id,
            kind: "fixture:future-cost",
            amountMinor: Number.MAX_SAFE_INTEGER,
            dueAt: "2021-12-31",
            periodMonths: p("monthsPerYear"),
            accruesArrears: true,
            source,
          },
        ],
      },
    };
    expect(estimate(withFutureDeficit).estimates).toEqual(
      estimate(input).estimates,
    );
    const recordedAfterOpening = {
      ...input,
      startedAt: "2021-04-02",
      organizations: input.organizations.map((row) => ({
        ...row,
        liquidMinor: p("zero"),
      })),
    };
    expect(
      createOpeningEmployerCapital(recordedAfterOpening, new Set())
        .organizations[0]!.liquidMinor,
    ).toBe(0);
  });

  it("requires an actual owned active schedule and rejects malformed inputs without mutation", () => {
    const input = fixture();
    const commitment = input.workCommitments![0]!;
    const invalid: CoreInput[] = [
      { ...input, workCommitments: [] },
      {
        ...input,
        workCommitments: [
          commitment,
          { ...commitment, id: "capital:second-active-plan" },
        ],
      },
      {
        ...input,
        workCommitments: [{ ...commitment, personId: "capital:wrong-worker" }],
      },
      { ...input, workCommitments: [{ ...commitment, periodDays: p("zero") }] },
      {
        ...input,
        workCommitments: [{ ...commitment, hourlyMinor: Number.NaN }],
      },
      {
        ...input,
        workCommitments: [{ ...commitment, anchorDate: "2021-02-30" }],
      },
      {
        ...input,
        workCommitments: [{ ...commitment, startsAt: "2021-01-02" }],
      },
      { ...input, workCommitments: [{ ...commitment, endsAt: "2020-12-31" }] },
      {
        ...input,
        workCommitments: [
          { ...commitment, paySource: { ...source, asOf: "2021-01-02" } },
        ],
      },
      {
        ...input,
        workCommitments: [
          {
            ...commitment,
            slots: [{ ...commitment.slots[0]!, offsetDays: p("daysPerWeek") }],
          },
        ],
      },
      {
        ...input,
        workCommitments: [
          {
            ...commitment,
            slots: [
              commitment.slots[0]!,
              { ...commitment.slots[0]!, startMinute: p("one") },
            ],
          },
        ],
      },
    ];
    for (const row of invalid) {
      const before = structuredClone(row);
      expect(() => estimate(row)).toThrow();
      expect(row).toEqual(before);
    }
    expect(() =>
      createOpeningEmployerCapital(
        input,
        new Set(["capital:absent-organization"]),
      ),
    ).toThrow("missing");
  });

  it("rejects nonfinite or mislabeled estimated medians and fabricated spreads", () => {
    const input = fixture();
    const key = "openingEmployerCashBufferDaysRestaurants";
    const row = PARAMETERS[key]!;
    const invalid: Parameter[] = [
      { ...row, value: Number.NaN },
      { ...row, tag: "TUNABLE" },
      { ...row, spread: undefined },
      {
        ...row,
        spread: {
          low: 17,
          high: 31,
          unit: "cash buffer days",
          citation: source.citation,
        },
      },
      { ...row, stopgapId: undefined },
    ];
    for (const value of invalid)
      expect(() =>
        createOpeningEmployerCapital(
          input,
          new Set([input.organizations[0]!.id]),
          { parameters: { ...PARAMETERS, [key]: value } },
        ),
      ).toThrow();
  });

  it("preserves every sourced median and actual industry-specific interquartile range", () => {
    expect(reference.observations).toHaveLength(13);
    const original = originalContext.medianDaysByIndustry as Readonly<
      Record<string, number>
    >;
    for (const observation of reference.observations) {
      const key =
        DEFAULT_OPENING_CAPITAL_DATA.medianDaysParameterByIndustry[
          observation.industry
        ]!;
      const row = PARAMETERS[key]!;
      expect(row.tag).toBe("ESTIMATED");
      expect(row.value).toBe(original[observation.industry]);
      expect(row.value).toBe(observation.observedValue);
      expect(row.spread).toMatchObject({
        low: observation.observedCounts.percentile25,
        high: observation.observedCounts.percentile75,
      });
      expect(row.checkRange).toBeUndefined();
      expect(row.citation).toContain(reference.source.pdfSha256);
    }
    expect(
      PARAMETERS.openingEmployerCashBufferDaysProfessionalServices!.spread,
    ).toMatchObject({ low: 15, high: 72 });
    expect(
      PARAMETERS.openingEmployerCashBufferDaysHighTechServices!.spread,
    ).toMatchObject({ low: 15, high: 77 });
    expect(DEFAULT_OPENING_CAPITAL_DATA.industryByClassification).toEqual(
      originalContext.industryByClassification,
    );
    expect(DEFAULT_OPENING_CAPITAL_DATA.excludedOrganizationKinds).toEqual(
      DEFAULT_OPENING_FINANCE_DATA.excludedOrganizationKinds,
    );
    expect(PARAMETERS.organizationReserveMonths!.value).toBe(6);
    expect(PARAMETERS.organizationReserveMonths!.tag).toBe("TUNABLE");
  });

  it("wires fresh generation once and keeps canonical jobs, households and person cash", () => {
    const options = {
      seed: "capital:population-route",
      startedAt: at,
      minimumPeople: p("populationTestMinimum"),
    };
    const enabled = buildPopulation(options);
    const disabled = buildPopulation({ ...options, scheduledWork: false });
    expect(disabled.people).toEqual(enabled.people);
    expect(disabled.households).toEqual(enabled.households);
    expect(disabled.jobs).toEqual(enabled.jobs);
    // Disabling runtime schedules removes only their public authority membership.
    // Full organization records still preserve IDs, cash, Sources, owners and facts.
    expect(disabled.organizations).toEqual(
      enabled.organizations.map((organization) =>
        organization.publicPayAuthority
          ? {
              ...organization,
              publicPayAuthority: {
                ...organization.publicPayAuthority,
                workCommitmentIds: [],
              },
            }
          : organization,
      ),
    );
    for (const organization of enabled.organizations) {
      const authority = organization.publicPayAuthority;
      if (!authority) continue;
      expect([...authority.workCommitmentIds].sort()).toEqual(
        enabled
          .workCommitments!.filter(
            (commitment) =>
              commitment.organizationId === organization.id &&
              commitment.publicPayAuthorityId === authority.id,
          )
          .map((commitment) => commitment.id)
          .sort(),
      );
    }
    expect(disabled.workCommitments).toEqual([]);
    expect(enabled.workCommitments!.length).toBeGreaterThan(p("zero"));
    const receipt = JSON.parse(
      enabled.placeMetadata!.openingEmployerCashReceipt!,
    ) as {
      estimates: readonly {
        organizationId: string;
        status: string;
        liquidMinor: number;
        source: Source;
      }[];
    };
    const disabledReceipt = JSON.parse(
      disabled.placeMetadata!.openingEmployerCashReceipt!,
    ) as typeof receipt;
    expect(disabledReceipt.estimates).toEqual(receipt.estimates);
    expect(
      receipt.estimates.some(
        (row) => row.status === "estimated-private-buffer",
      ),
    ).toBe(true);
    expect(
      receipt.estimates.some(
        (row) =>
          row.status === "modeled-zero-funded-opening-pending-dated-funding",
      ),
    ).toBe(true);
    for (const row of receipt.estimates) {
      const organization = enabled.organizations.find(
        (organization) => organization.id === row.organizationId,
      )!;
      expect(organization.liquidMinor).toBe(row.liquidMinor);
      expect(organization.source).toEqual(row.source);
    }
    for (const organization of enabled.organizations) {
      expect(Number.isSafeInteger(organization.liquidMinor)).toBe(true);
      expect(organization.liquidMinor).toBeGreaterThanOrEqual(p("zero"));
    }
    expect(enabled.placeMetadata?.openingEmployerCashReceipt).toContain(
      "estimated-private-buffer",
    );
    expect(enabled.placeMetadata?.openingEmployerCashReceipt).toContain(
      "modeled-zero-funded-opening-pending-dated-funding",
    );
  });

  it("keeps the same seed and firm WHO state stable without depending on array order", () => {
    const input = fixture();
    const first = estimate(input);
    expect(estimate(structuredClone(input))).toEqual(first);
    expect(
      estimate({
        ...input,
        people: [...input.people].reverse(),
        jobs: [...input.jobs].reverse(),
        organizations: [...input.organizations].reverse(),
        workCommitments: [...input.workCommitments!].reverse(),
      }),
    ).toEqual(first);
    const prior = openingEmployerCashBufferPrior(
      input.seed,
      input.organizations[0]!.id,
      "restaurants",
    );
    expect(prior.startupQuantile).toBe(0.7843550593825057);
    expect(prior.bufferDays).toBe(33.06130356295034);
    expect(prior.startupQuantile).toBeGreaterThan(0);
    expect(prior.startupQuantile).toBeLessThan(1);
    expect(
      openingEmployerCashBufferPrior(
        "capital:another-world",
        input.organizations[0]!.id,
        "restaurants",
      ).startupQuantile,
    ).not.toBe(prior.startupQuantile);
    expect(input).toEqual(fixture());
  });

  it("assigns genuinely different initial stocks to five same-outflow firms in one world", () => {
    const ids = [
      "firm:alpha",
      "firm:beta",
      "firm:gamma",
      "firm:delta",
      "firm:epsilon",
    ];
    const copies = ids.map((organizationId) => {
      const base = fixture();
      const personId = `${organizationId}:worker`,
        jobId = `${organizationId}:job`,
        householdId = `${organizationId}:household`;
      return {
        organization: { ...base.organizations[0]!, id: organizationId },
        person: { ...base.people[0]!, id: personId, jobId, householdId },
        job: { ...base.jobs[0]!, id: jobId, personId, organizationId },
        household: {
          ...base.households[0]!,
          id: householdId,
          memberIds: [personId],
        },
        commitment: {
          ...base.workCommitments![0]!,
          id: `${organizationId}:commitment`,
          jobId,
          personId,
          organizationId,
        },
      };
    });
    const input: CoreInput = {
      ...fixture(),
      organizations: copies.map((row) => row.organization),
      people: copies.map((row) => row.person),
      jobs: copies.map((row) => row.job),
      households: copies.map((row) => row.household),
      workCommitments: copies.map((row) => row.commitment),
    };
    const rows = estimate(input).estimates;
    expect(rows.map((row) => row.bufferDays)).toEqual([
      14.458679203409702, 36.500725691672415, 3.870147920679301,
      20.640802482608706, 38.743178338278085,
    ]);
    expect(new Set(rows.map((row) => row.startupQuantile)).size).toBe(5);
    expect(new Set(rows.map((row) => row.liquidMinor)).size).toBe(5);
    expect(new Set(rows.map((row) => row.plannedPayrollMinor))).toEqual(
      new Set([5200]),
    );
    expect(new Set(rows.map((row) => row.plannedDailyOutflowMinor)).size).toBe(
      1,
    );
    const shuffled = estimate({
      ...input,
      organizations: [...input.organizations].reverse(),
    }).estimates;
    expect(new Map(shuffled.map((row) => [row.organizationId, row]))).toEqual(
      new Map(rows.map((row) => [row.organizationId, row])),
    );
  });

  it.each(reference.observations)(
    "retains the actual q25/median/q75 anchors for $industry",
    (observation) => {
      const quarter = p("one") / (p("two") * p("two"));
      const counts = observation.observedCounts;
      for (const [quantile, expected] of [
        [quarter, counts.percentile25],
        [p("one") / p("two"), counts.median],
        [p("one") - quarter, counts.percentile75],
      ]) {
        expect(
          openingEmployerCashBufferAtQuantile(observation.industry, quantile!)
            .bufferDays,
        ).toBe(expected);
        const tailSpanParameter =
          DEFAULT_OPENING_CAPITAL_DATA.tailSpanParameter;
        const changedTail = {
          parameters: {
            ...PARAMETERS,
            [tailSpanParameter]: {
              ...PARAMETERS[tailSpanParameter]!,
              value: p("two"),
            },
          },
        };
        expect(
          openingEmployerCashBufferAtQuantile(
            observation.industry,
            quantile!,
            changedTail,
          ).bufferDays,
        ).toBe(expected);
      }
    },
  );

  it("is continuous at the observed anchors and permits startup values outside the empirical IQR", () => {
    const epsilon = Number.EPSILON * 1024;
    for (const quantile of [0.25, 0.5, 0.75]) {
      const atAnchor = openingEmployerCashBufferAtQuantile(
        "restaurants",
        quantile,
      ).bufferDays;
      expect(
        openingEmployerCashBufferAtQuantile("restaurants", quantile - epsilon)
          .bufferDays,
      ).toBeCloseTo(atAnchor, 9);
      expect(
        openingEmployerCashBufferAtQuantile("restaurants", quantile + epsilon)
          .bufferDays,
      ).toBeCloseTo(atAnchor, 9);
    }
    expect(
      openingEmployerCashBufferAtQuantile("restaurants", 0).bufferDays,
    ).toBe(2);
    expect(
      openingEmployerCashBufferAtQuantile("restaurants", 1).bufferDays,
    ).toBe(46);
    expect(
      openingEmployerCashBufferAtQuantile("all-small-businesses", 0).bufferDays,
    ).toBe(0);
    expect(
      openingEmployerCashBufferAtQuantile("all-small-businesses", 1).bufferDays,
    ).toBe(97);
    expect(
      openingEmployerCashBufferAtQuantile("restaurants", 0.125).bufferDays,
    ).toBeLessThan(9);
    expect(
      openingEmployerCashBufferAtQuantile("restaurants", 0.875).bufferDays,
    ).toBeGreaterThan(31);
  });

  it("labels the tails and shape as unmeasured while retaining the real IQR separately", () => {
    const row = PARAMETERS.openingEmployerCashBufferTailSpan!;
    expect(row.tag).toBe("TUNABLE");
    expect(row.value).toBe(1);
    expect(row.spread).toMatchObject({ status: "unmeasured" });
    expect(row.spread).not.toHaveProperty("low");
    expect(row.checkRange).toEqual({
      ref: "EMPIRICAL-OPENING-EMPLOYER-CASH-BUFFER-SPREAD",
    });
    const estimateRow = estimate().estimates[0]!;
    expect(estimateRow.source.tag).toBe("ESTIMATED");
    expect(estimateRow.source.generationPriorVintage).toContain("2015");
    expect(estimateRow.source.estimatedFrom).toContain("Uniform");
    expect(estimateRow.source.estimatedFrom).toContain(
      "not observed minima/maxima",
    );
    expect(estimateRow.source.estimatedFrom).toContain(
      "employer and nonemployer",
    );
    expect(estimateRow.source.estimatedFrom).toContain("legal form");
    expect(estimateRow.parameterRefs).toContain(
      "openingEmployerCashBufferTailSpan",
    );
    expect(estimate().gaps).toContain(
      "opening-capital:startup-quantile-shape-and-tails-unmeasured:capital:firm",
    );
  });

  it("has no requested future-year or deficit input and does not consult the six-month private prior", () => {
    const input = fixture();
    const requestedFuture: CoreInput & {
      requestedFutureYear: number;
      projectedDeficitMinor: number;
    } = {
      ...input,
      requestedFutureYear: 2199,
      projectedDeficitMinor: Number.MAX_SAFE_INTEGER,
    };
    expect(estimate(requestedFuture)).toEqual(estimate(input));
    const changedReserve = {
      ...PARAMETERS,
      organizationReserveMonths: {
        ...PARAMETERS.organizationReserveMonths!,
        value: Number.NaN,
      },
    };
    expect(
      createOpeningEmployerCapital(input, new Set(["capital:firm"]), {
        parameters: changedReserve,
      }),
    ).toEqual(estimate(input));
    const tailSpanParameter = DEFAULT_OPENING_CAPITAL_DATA.tailSpanParameter;
    const withLongerTail = {
      parameters: {
        ...PARAMETERS,
        [tailSpanParameter]: { ...PARAMETERS[tailSpanParameter]!, value: 2 },
      },
    };
    const original = openingEmployerCashBufferPrior(
      input.seed,
      "capital:firm",
      "restaurants",
    );
    const changed = openingEmployerCashBufferPrior(
      input.seed,
      "capital:firm",
      "restaurants",
      withLongerTail,
    );
    expect(changed.startupQuantile).toBe(original.startupQuantile);
    expect(changed.observedBufferDays).toEqual(original.observedBufferDays);
    expect(changed.estimatedBufferEndpoints).not.toEqual(
      original.estimatedBufferEndpoints,
    );
  });

  it("rejects malformed quantiles, tail metadata and technical hash units before any input mutation", () => {
    for (const quantile of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01])
      expect(() =>
        openingEmployerCashBufferAtQuantile("restaurants", quantile),
      ).toThrow();
    const input = fixture(),
      before = structuredClone(input);
    const key = DEFAULT_OPENING_CAPITAL_DATA.tailSpanParameter;
    const tail = PARAMETERS[key]!;
    const invalid: Parameter[] = [
      { ...tail, value: Number.NaN },
      { ...tail, value: -1 },
      { ...tail, value: Number.MAX_VALUE },
      { ...tail, tag: "ESTIMATED" },
      { ...tail, checkRange: undefined },
      { ...tail, checkRange: { ref: "EMPIRICAL-WRONG-TARGET" } },
      {
        ...tail,
        spread: {
          low: 0,
          high: 2,
          unit: "tail span",
          citation: "Fabricated coefficient range",
        },
      },
      { ...tail, stopgapId: undefined },
    ];
    for (const value of invalid) {
      expect(() =>
        createOpeningEmployerCapital(input, new Set(["capital:firm"]), {
          parameters: { ...PARAMETERS, [key]: value },
        }),
      ).toThrow();
      expect(input).toEqual(before);
    }
    for (const [name, value] of [
      ["zero", 1],
      ["one", 2],
      ["two", 3],
      ["seedPlaceHashRadix", 10],
      ["seedHashDigits", 0],
      ["seedHashDigits", 14],
      ["seedHashDigits", 1.5],
    ])
      expect(() =>
        openingEmployerCashBufferPrior(
          input.seed,
          "capital:firm",
          "restaurants",
          {
            parameters: {
              ...PARAMETERS,
              [name!]: { ...PARAMETERS[name!]!, value: value as number },
            },
          },
        ),
      ).toThrow();
    expect(() =>
      openingEmployerCashBufferPrior("", "capital:firm", "restaurants"),
    ).toThrow();
    expect(() =>
      openingEmployerCashBufferPrior(input.seed, "", "restaurants"),
    ).toThrow();
    expect(() =>
      openingEmployerCashBufferAtQuantile("source:unbound", 0.5),
    ).toThrow();
    expect(input).toEqual(before);
  });
});
