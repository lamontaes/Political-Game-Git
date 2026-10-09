import { describe, expect, it } from "vitest";
import {
  buildOpeningRetirementIncome,
  DEFAULT_OPENING_INCOME_DATA as data,
  type OpeningIncomeBuild,
  type OpeningIncomeContract,
  type OpeningIncomeOptions,
} from "./opening-income";
import { PARAMETERS, parameter as p, type Parameter } from "./parameters";
import { stableHash } from "../simulation/ids";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import type {
  CoreInput,
  OrganizationInput,
  PersonInput,
  Source,
} from "./types";

type PastFact = NonNullable<PersonInput["pastFacts"]>[number];
const startedAt = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Small authored opening-income boundary fixture; not an observed person, award or account.",
  estimatedFrom: "Technical fixture identity, trait and school-cohort context.",
};
const place = { id: "place:fixture", name: "Recorded Fixture Place", source };
const options: OpeningIncomeOptions = { places: [place] };
const firstId = "person:retirement-fixture";

function person(id = firstId, birthDate = "1950-02-20"): PersonInput {
  const schoolYear = Number(birthDate.slice(0, 4)) + 14;
  return {
    id,
    givenName: "Preserved",
    familyName: id,
    birthDate,
    placeId: place.id,
    householdId: `${id}:household`,
    tier: "weekly",
    traits: { [data.contextTrait]: p("zero") },
    traitSources: { [data.contextTrait]: source },
    liquidMinor: p("minorPerDollar"),
    livingCostDailyMinor: p("one"),
    source,
    familyIds: [],
    knownIds: [],
    looks: { hair: "saved fixture appearance" },
    said: ["Saved fixture statement"],
    pastFacts: [
      {
        id: `${id}:school`,
        date: `${schoolYear}-08-26`,
        kind: data.contextKinds[p("zero")]!,
        summary: "Saved estimated high-school cohort; no graduation is implied",
        source,
        facts: {
          stage: data.contextStage,
          schoolName: "Recorded Fixture School",
          placeId: place.id,
          attendance: "cohort-estimate",
        },
      },
    ],
  };
}

function fixture(people: readonly PersonInput[] = [person()]): CoreInput {
  return {
    seed: "opening-income-source-boundary",
    startedAt,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: [],
    workCommitments: [],
    organizations: [
      {
        id: "organization:original",
        placeId: place.id,
        name: "Preserved fixture employer",
        kind: "employer",
        liquidMinor: p("minorPerDollar"),
        source,
      },
    ],
    focusPersonIds: [people[p("zero")]!.id],
    focusPlaceIds: [],
    visiblePlaceIds: [place.id],
    calendarDates: [],
    gaps: ["Preserved fixture gap"],
  };
}

function build(
  input = fixture(),
  extra: OpeningIncomeOptions = {},
): OpeningIncomeBuild {
  return buildOpeningRetirementIncome(input, { ...options, ...extra });
}

function qualifiedHistory(row: PersonInput): readonly PastFact[] {
  return [
    {
      id: `${row.id}:saved-coverage`,
      date: "1999-12-31",
      kind: data.coverageKinds[p("zero")]!,
      summary: "Saved covered-work context",
      source,
      facts: {
        status: data.coveredStatus,
        startedAt: "1968-01-01",
        endedAt: "1999-12-31",
        coveredMonths: "300",
      },
    },
    {
      id: `${row.id}:saved-claim`,
      date: "2000-01-01",
      kind: data.claimKinds[p("zero")]!,
      summary: "Saved qualified claim",
      source,
      facts: {
        status: data.claimStatus,
        coverageFactId: `${row.id}:saved-coverage`,
      },
    },
  ];
}

function savedPayer(): OrganizationInput {
  return {
    id: "organization:saved-retirement-payer",
    placeId: place.id,
    name: "Recorded monthly-income payer",
    kind: "public-institution",
    liquidMinor: 700_000,
    source,
  };
}

function savedAward(row: PersonInput, generic = false): PastFact {
  return {
    id: `${row.id}:saved-award`,
    date: "2000-01-01",
    kind: generic ? "income:monthly-award" : data.awardKinds[p("zero")]!,
    summary: "Saved cash monthly-income award",
    source,
    facts: {
      status: data.awardStatus,
      payerId: savedPayer().id,
      monthlyMinor: "12345",
      kindId: data.incomeKindId,
      householdId: row.householdId,
      placeId: row.placeId,
      ...(generic
        ? {
            basis: data.recordedStandingBasis,
            paymentMedium: data.recordedPaymentMedium,
          }
        : {}),
    },
  };
}

function factByKind(
  result: OpeningIncomeBuild,
  kind: string,
  personId = firstId,
): PastFact {
  return result.input.people
    .find((row) => row.id === personId)!
    .pastFacts!.find((row) => row.kind === kind)!;
}

function parameterRegistry(
  key: string,
  value: number,
): Readonly<Record<string, Parameter>> {
  return { ...PARAMETERS, [key]: { ...PARAMETERS[key]!, value } };
}

describe("pure qualified opening retirement-income records", () => {
  it("builds career, qualified claim and award from an ordinary generated-record shape without preseeded income", () => {
    const input = fixture();
    const result = build(input);
    const coverage = factByKind(result, data.generatedCoverageKind);
    const claim = factByKind(result, data.generatedClaimKind);
    const award = factByKind(result, data.generatedAwardKind);
    expect(coverage.facts?.contextFactId).toBe(
      input.people[p("zero")]!.pastFacts![p("zero")]!.id,
    );
    expect(Number(coverage.facts?.coveredMonths)).toBeGreaterThanOrEqual(
      p(data.parameters.minimumCoveredMonths),
    );
    expect(claim.facts?.coverageFactId).toBe(coverage.id);
    expect(award.facts?.claimFactId).toBe(claim.id);
    expect(award.facts?.coverageFactId).toBe(coverage.id);
    expect(claim.date < input.startedAt).toBe(true);
    expect(
      coverage.facts!.startedAt! >= input.people[p("zero")]!.birthDate,
    ).toBe(true);
    const contract = result.input.finance!.contracts[p("zero")]!;
    expect(contract.recipientIncome).toEqual({
      personId: firstId,
      householdId: input.people[p("zero")]!.householdId,
      kindId: data.incomeKindId,
      sourceFactId: award.id,
    });
    expect(contract.payeeId).toBe(firstId);
    expect(contract.payerIds).toEqual([award.facts!.payerId]);
    expect(contract.amountMinor).toBe(Number(award.facts!.monthlyMinor));
    expect(contract.accruesArrears).toBe(false);
    expect(contract.salesReceiptBudget).toBe(false);
    expect(contract.settlementPhaseId).toBe(data.settlementPhaseId);
    expect(contract.dueAt).toBe("2021-02-01");
    expect(contract.source.tag).toBe("ESTIMATED");
    expect(contract.source.generationPriorVintage).toBe(
      data.generationPriorVintage,
    );
    expect(result.receipt.recipients[p("zero")]!.status).toBe("generated");
  });

  it("preserves original people, faces, jobs, cash, household and timetable records without paying anyone", () => {
    const retired = person();
    const worker = { ...person("person:worker"), jobId: "job:original" };
    const input: CoreInput = {
      ...fixture([retired, worker]),
      jobs: [
        {
          id: worker.jobId,
          personId: worker.id,
          organizationId: "organization:original",
          title: "Preserved owned job",
          wageDailyMinor: 1200,
          hoursDaily: 3,
          hourlyMinor: 400,
          source,
        },
      ],
      workCommitments: [
        {
          id: "commitment:original",
          jobId: worker.jobId,
          personId: worker.id,
          organizationId: "organization:original",
          startsAt: startedAt,
          anchorDate: startedAt,
          periodDays: 7,
          slots: [{ offsetDays: 1, startMinute: 480, minutes: 180 }],
          expectedWeeklyMinutes: 180,
          hourlyMinor: 400,
          scheduleSource: source,
          paySource: source,
        },
      ],
    };
    const before = structuredClone(input);
    const result = build(input);
    expect(input).toEqual(before);
    expect(result.input.jobs).toBe(input.jobs);
    expect(result.input.workCommitments).toBe(input.workCommitments);
    expect(result.input.households).toBe(input.households);
    expect(result.input.focusPersonIds).toBe(input.focusPersonIds);
    expect(result.input.focusPlaceIds).toBe(input.focusPlaceIds);
    expect(result.input.visiblePlaceIds).toBe(input.visiblePlaceIds);
    expect(result.input.calendarDates).toBe(input.calendarDates);
    expect(result.input.organizations[p("zero")]).toBe(
      input.organizations[p("zero")],
    );
    for (const original of input.people) {
      const next = result.input.people.find((row) => row.id === original.id)!;
      const nextIdentity = { ...next };
      delete nextIdentity.pastFacts;
      const originalIdentity = { ...original };
      delete originalIdentity.pastFacts;
      expect(nextIdentity).toEqual(originalIdentity);
      for (const fact of original.pastFacts!)
        expect(next.pastFacts).toContain(fact);
    }
    expect(result.input.people.find((row) => row.id === worker.id)).toBe(
      worker,
    );
    expect(
      result.receipt.recipients.find((row) => row.personId === worker.id)
        ?.reason,
    ).toBe(data.reasons.currentWork);
  });

  it("does not award from age alone or create future claims", () => {
    const birthOnly = {
      ...person(),
      traits: {},
      traitSources: {},
      pastFacts: [],
    };
    const young = person("person:young", "1980-02-20");
    const result = build(fixture([birthOnly, young]));
    expect(result.receipt.addedPersonFactIds).toEqual([]);
    expect(result.receipt.addedContractIds).toEqual([]);
    expect(result.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(
      result.receipt.recipients.find((row) => row.personId === birthOnly.id)
        ?.reason,
    ).toBe(data.reasons.missingContext);
    expect(
      result.receipt.recipients.find((row) => row.personId === young.id)
        ?.reason,
    ).toBe(data.reasons.tooEarly);
  });

  it("can use sourced canonical trait context when school history is absent, without treating an unread trait as observed", () => {
    const row = { ...person(), pastFacts: [] };
    const result = build(fixture([row]));
    expect(result.receipt.addedContractIds).toHaveLength(p("one"));
    const coverage = factByKind(result, data.generatedCoverageKind);
    expect(coverage.facts?.traitContext).toBe(
      String(row.traits[data.contextTrait]),
    );
    expect(coverage.facts?.contextFactId).toBe("");
    const schoolOnly = { ...person(), traits: {}, traitSources: {} };
    const schoolResult = build(fixture([schoolOnly]));
    expect(
      factByKind(schoolResult, data.generatedCoverageKind).facts?.traitContext,
    ).toBe("not-recorded");
  });

  it("uses saved qualified career and claim without any generated context", () => {
    const base = person();
    const row = {
      ...base,
      traits: {},
      traitSources: {},
      pastFacts: qualifiedHistory(base),
    };
    const result = build(fixture([row]), { allowPastGeneration: false });
    expect(result.receipt.addedPersonFactIds).toHaveLength(p("one"));
    expect(factByKind(result, data.generatedAwardKind).facts?.claimFactId).toBe(
      `${row.id}:saved-claim`,
    );
    expect(
      result.input.people[p("zero")]!.pastFacts!.slice(
        p("zero"),
        row.pastFacts.length,
      ),
    ).toEqual(row.pastFacts);
  });

  it("preserves insufficient or denied saved histories instead of replacing them with a generated entitlement", () => {
    const row = person();
    const saved = qualifiedHistory(row);
    const insufficient = {
      ...row,
      pastFacts: [
        {
          ...saved[p("zero")]!,
          facts: { ...saved[p("zero")]!.facts, coveredMonths: "1" },
        },
        saved[p("one")]!,
      ],
    };
    const denied = {
      ...row,
      pastFacts: [
        saved[p("zero")]!,
        {
          ...saved[p("one")]!,
          facts: { ...saved[p("one")]!.facts, status: "denied" },
        },
      ],
    };
    for (const quiet of [insufficient, denied]) {
      const input = fixture([quiet]);
      const result = build(input);
      expect(result.receipt.addedPersonFactIds).toEqual([]);
      expect(result.receipt.addedContractIds).toEqual([]);
      expect(result.input.people[p("zero")]).toBe(quiet);
    }
  });

  it("rejects contradictory covered-work chronology before returning any enriched input", () => {
    const row = person();
    const saved = qualifiedHistory(row);
    const input = fixture([
      {
        ...row,
        pastFacts: [
          {
            ...saved[p("zero")]!,
            facts: { ...saved[p("zero")]!.facts, endedAt: "2001-01-01" },
          },
          saved[p("one")]!,
        ],
      },
    ]);
    const snapshot = structuredClone(input);
    expect(() => build(input)).toThrow(/Contradictory/);
    expect(input).toEqual(snapshot);
  });

  it("preserves recorded award amount and its real finite account instead of generating another payer stock", () => {
    const base = person();
    const award = savedAward(base);
    const row = { ...base, pastFacts: [...base.pastFacts!, award] };
    const input = fixture([row]);
    input.organizations = [...input.organizations, savedPayer()];
    const result = build(input);
    expect(result.receipt.addedPersonFactIds).toEqual([]);
    expect(result.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(result.input.finance!.contracts[p("zero")]!.amountMinor).toBe(12345);
    expect(result.receipt.payerAccounts[p("zero")]!.openingLiquidMinor).toBe(
      savedPayer().liquidMinor,
    );
    expect(result.input.organizations).toBe(input.organizations);
  });

  it("appends income terms without replacing existing finance contracts, facilities, books or dated conditions", () => {
    const input = fixture();
    input.finance = {
      contracts: [
        {
          id: "contract:original",
          payerIds: [firstId],
          payeeId: "organization:original",
          kind: "fixture:existing-purchase",
          amountMinor: p("one"),
          dueAt: "2021-02-01",
          periodMonths: p("one"),
          accruesArrears: false,
          source,
        },
      ],
      facilities: [],
      businesses: [],
      conditions: [
        {
          id: "condition:original",
          placeId: place.id,
          at: startedAt,
          generalPriceFactor: p("one"),
          wagePriceFactor: p("one"),
          macroDemandFactor: p("one"),
          source,
        },
      ],
      gaps: ["Saved finance gap"],
    };
    const snapshot = structuredClone(input);
    const result = build(input);
    expect(input).toEqual(snapshot);
    expect(result.input.finance!.contracts[p("zero")]).toBe(
      input.finance.contracts[p("zero")],
    );
    expect(result.input.finance!.facilities).toBe(input.finance.facilities);
    expect(result.input.finance!.businesses).toBe(input.finance.businesses);
    expect(result.input.finance!.conditions).toBe(input.finance.conditions);
    expect(result.input.finance!.gaps).toContain("Saved finance gap");
    expect(result.receipt.addedContractIds).toHaveLength(p("one"));
  });

  it("leaves a saved award with an absent payer quiet rather than inventing cash or a counterparty", () => {
    const base = person();
    const row = { ...base, pastFacts: [...base.pastFacts!, savedAward(base)] };
    const result = build(fixture([row]));
    expect(result.input.people[p("zero")]).toBe(row);
    expect(result.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(result.receipt.addedContractIds).toEqual([]);
    expect(result.receipt.recipients[p("zero")]!.reason).toBe(
      data.reasons.missingPayer,
    );
  });

  it("binds an explicitly recorded cash standing entitlement and rejects work or restricted-benefit substitution", () => {
    const base = person();
    const award = savedAward(base, true);
    const row = { ...base, pastFacts: [award] };
    const input = fixture([row]);
    const recorded = {
      personId: row.id,
      householdId: row.householdId,
      payerId: savedPayer().id,
      kindId: data.incomeKindId,
      sourceFactId: award.id,
      amountMinor: 12345,
      source,
    };
    const result = build(input, {
      recordedPayers: [savedPayer()],
      recordedMonthlyIncomes: [recorded],
    });
    expect(result.receipt.addedPersonFactIds).toEqual([]);
    expect(
      result.input.finance!.contracts[p("zero")]!.recipientIncome?.sourceFactId,
    ).toBe(award.id);
    const mismatches: Readonly<Record<string, string>>[] = [
      { basis: "work" },
      { paymentMedium: "restricted-benefit" },
    ];
    for (const changed of mismatches) {
      const wrongAward = { ...award, facts: { ...award.facts, ...changed } };
      expect(() =>
        build(fixture([{ ...row, pastFacts: [wrongAward] }]), {
          recordedPayers: [savedPayer()],
          recordedMonthlyIncomes: [recorded],
        }),
      ).toThrow(/cash standing-entitlement/);
    }
    expect(() =>
      build(input, {
        recordedPayers: [savedPayer()],
        recordedMonthlyIncomes: [
          { ...recorded, householdId: "household:wrong" },
        ],
      }),
    ).toThrow(/contradicts/);
    expect(() =>
      build(input, {
        recordedPayers: [savedPayer()],
        recordedMonthlyIncomes: [{ ...recorded, amountMinor: 12346 }],
      }),
    ).toThrow(/contradicts/);
  });

  it("adds exactly one disclosed finite account for a shared place and preserves original cash totals", () => {
    const input = fixture([person(), person("person:second", "1952-02-20")]);
    const result = build(input);
    expect(result.receipt.payerAccounts).toHaveLength(p("one"));
    expect(result.receipt.addedContractIds).toHaveLength(input.people.length);
    const reserve = p(data.parameters.payerReserveMonths);
    expect(result.receipt.addedOpeningLiquidMinor).toBe(
      Math.floor(result.receipt.plannedMonthlyIncomeMinor * reserve),
    );
    expect(result.receipt.originalPeopleCashMinor).toBe(
      input.people.reduce((total, row) => total + row.liquidMinor, p("zero")),
    );
    expect(result.receipt.originalOrganizationCashMinor).toBe(
      input.organizations.reduce(
        (total, row) => total + row.liquidMinor,
        p("zero"),
      ),
    );
    const originalTotal =
      result.receipt.originalPeopleCashMinor +
      result.receipt.originalOrganizationCashMinor;
    const nextTotal =
      result.input.people.reduce(
        (total, row) => total + row.liquidMinor,
        p("zero"),
      ) +
      result.input.organizations.reduce(
        (total, row) => total + row.liquidMinor,
        p("zero"),
      );
    expect(nextTotal).toBe(
      originalTotal + result.receipt.addedOpeningLiquidMinor,
    );
    expect(result.receipt.payerAccounts[p("zero")]!.name).toBe(
      data.payer.nameTemplate.replace("{placeName}", place.name),
    );
    expect(
      result.receipt.payerAccounts[p("zero")]!.source.estimatedFrom,
    ).toContain("independent of firms");
  });

  it("does not use existing employer cash to set the new payer stock", () => {
    const low = fixture();
    const high = fixture();
    high.organizations = high.organizations.map((row) => ({
      ...row,
      liquidMinor: 10_000_000,
    }));
    expect(build(low).receipt.addedOpeningLiquidMinor).toBe(
      build(high).receipt.addedOpeningLiquidMinor,
    );
    expect(build(low).input.finance!.contracts).toEqual(
      build(high).input.finance!.contracts,
    );
  });

  it("is idempotent over its enriched opening input including sources, contracts and account stock", () => {
    const first = build();
    const second = build(first.input);
    expect(second.input).toEqual(first.input);
    expect(second.receipt.addedPersonFactIds).toEqual([]);
    expect(second.receipt.addedContractIds).toEqual([]);
    expect(second.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(second.receipt.plannedMonthlyIncomeMinor).toBe(
      first.receipt.plannedMonthlyIncomeMinor,
    );
  });

  it("reuses an existing generated account without a refill when later opening backgeneration admits another recipient", () => {
    const first = build();
    const later = person("person:later", "1952-02-20");
    const input: CoreInput = {
      ...first.input,
      people: [...first.input.people, later],
      households: [
        ...first.input.households,
        {
          id: later.householdId,
          placeId: later.placeId,
          memberIds: [later.id],
          source,
        },
      ],
    };
    const result = build(input);
    expect(result.input.organizations).toBe(input.organizations);
    expect(result.receipt.addedOpeningLiquidMinor).toBe(p("zero"));
    expect(result.receipt.addedContractIds).toHaveLength(p("one"));
    expect(result.receipt.payerAccounts[p("zero")]!.openingLiquidMinor).toBe(
      first.receipt.payerAccounts[p("zero")]!.openingLiquidMinor,
    );
    expect(result.receipt.plannedMonthlyIncomeMinor).toBeGreaterThan(
      first.receipt.plannedMonthlyIncomeMinor,
    );
  });

  it("rejects conflicting fact IDs and generated-ID collisions without changing the caller input", () => {
    const row = person();
    const school = row.pastFacts![p("zero")]!;
    const duplicate = fixture([
      {
        ...row,
        pastFacts: [
          school,
          { ...school, summary: "Contradictory existing evidence" },
        ],
      },
    ]);
    const duplicateSnapshot = structuredClone(duplicate);
    expect(() => build(duplicate)).toThrow(/Conflicting past fact ID/);
    expect(duplicate).toEqual(duplicateSnapshot);
    const coverageId = `${data.coverageIdPrefix}:${stableHash(JSON.stringify([data.version, fixture().seed, row.id]))}`;
    const collision = fixture([
      {
        ...row,
        pastFacts: [
          ...row.pastFacts!,
          {
            id: coverageId,
            date: "2000-01-01",
            kind: "fixture:unrelated",
            summary: "Conflicting stable ID",
            source,
          },
        ],
      },
    ]);
    const snapshot = structuredClone(collision);
    expect(() => build(collision)).toThrow(
      /Conflicting generated past fact ID/,
    );
    expect(collision).toEqual(snapshot);
  });

  it("rejects contradictory contract and payer identities on repeated enrichment", () => {
    const first = build();
    const contract = first.input.finance!.contracts[p("zero")]!;
    const wrongContract: OpeningIncomeContract = {
      ...contract,
      amountMinor: contract.amountMinor + p("one"),
    };
    const input: CoreInput = {
      ...first.input,
      finance: { ...first.input.finance!, contracts: [wrongContract] },
    };
    expect(() => build(input)).toThrow(/Conflicting income contract ID/);
    const payerId = first.receipt.payerAccounts[p("zero")]!.id;
    const wrongName: CoreInput = {
      ...first.input,
      organizations: first.input.organizations.map((row) =>
        row.id === payerId ? { ...row, name: "Different identity" } : row,
      ),
    };
    expect(() => build(wrongName)).toThrow(/Conflicting generated payer ID/);
    const wrongStock: CoreInput = {
      ...first.input,
      organizations: first.input.organizations.map((row) =>
        row.id === payerId
          ? { ...row, liquidMinor: row.liquidMinor + p("one") }
          : row,
      ),
    };
    expect(() => build(wrongStock)).toThrow(
      /Conflicting generated payer opening stock/,
    );
  });

  it("clamps a generated leap-day anniversary to the actual calendar", () => {
    const input = {
      ...fixture([person(firstId, "1952-02-29")]),
      startedAt: "2029-01-01",
    };
    const result = build(input);
    expect(factByKind(result, data.generatedClaimKind).date).toBe("2018-02-28");
  });

  it("rejects a monthly successor beyond the ISO calendar atomically, while an all-quiet upper-year opening needs no bill", () => {
    const base = person();
    const award = savedAward(base);
    const input: CoreInput = {
      ...fixture([{ ...base, pastFacts: [award] }]),
      startedAt: "9999-11-30",
      organizations: [...fixture().organizations, savedPayer()],
    };
    const snapshot = structuredClone(input);
    expect(() => build(input)).toThrow();
    expect(input).toEqual(snapshot);
    const quiet = { ...base, traits: {}, traitSources: {}, pastFacts: [] };
    const noIncome = build({ ...fixture([quiet]), startedAt: "9999-12-31" });
    expect(noIncome.receipt.addedContractIds).toEqual([]);
  });

  it("rejects unsafe monetary totals and invalid priors rather than returning a partially enriched input", () => {
    const input = fixture();
    const snapshot = structuredClone(input);
    const reserve = parameterRegistry(
      data.parameters.payerReserveMonths,
      Number.MAX_SAFE_INTEGER,
    );
    expect(() => build(input, { parameters: reserve })).toThrow(/minor units/);
    expect(input).toEqual(snapshot);
    expect(() =>
      build(input, {
        parameters: parameterRegistry(
          data.parameters.coveredFraction,
          Number.NaN,
        ),
      }),
    ).toThrow(/Non-finite/);
    expect(() =>
      build(input, {
        parameters: parameterRegistry(data.parameters.periodMonths, 2),
      }),
    ).toThrow(/monthly cadence/);
  });

  it("uses one generic named-place route for all canonical state/territory identities without requiring a county", () => {
    const identities = lifePlaceStateIdentities();
    expect(identities).toHaveLength(56);
    const seen = new Set<string>();
    for (const identity of identities) {
      const actual = stateJurisdictionForKey(identity.jurisdictionKey);
      expect(actual).not.toBeNull();
      const recordedPlace = {
        id: actual!.id,
        name: actual!.name,
        source: {
          ...source,
          citation:
            "Canonical state/territory identity only; public paying-account authority is fictional.",
        },
      };
      const row = { ...person(), placeId: recordedPlace.id };
      const input = {
        ...fixture([row]),
        organizations: fixture([row]).organizations.map((record) => ({
          ...record,
          placeId: recordedPlace.id,
        })),
        visiblePlaceIds: [recordedPlace.id],
      };
      const result = build(input, { places: [recordedPlace] });
      expect(result.receipt.addedContractIds).toHaveLength(p("one"));
      expect(result.receipt.payerAccounts[p("zero")]!.name).toBe(
        data.payer.nameTemplate.replace("{placeName}", actual!.name),
      );
      expect(result.receipt.payerAccounts[p("zero")]!.placeId).toBe(actual!.id);
      seen.add(result.receipt.payerAccounts[p("zero")]!.id);
    }
    expect(seen.size).toBe(identities.length);
  });
});
