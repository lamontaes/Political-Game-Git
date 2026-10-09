import { isoDateFromParts, makeIsoDate } from "../simulation/dates";
import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
} from "../simulation/life-places";
import {
  estimatedMonthlyHouseholdLivingCosts,
  livingCostsRegionForState,
  LIVING_COSTS_SOURCE,
  REPRESENTATIVE_LIVING_COSTS,
  type LivingCostsRegion,
} from "../simulation/living-costs-data";
import { LIVING_COSTS_CATEGORY_SOURCES } from "../simulation/living-costs-category-data";
import type { EntityId } from "../simulation/types";
import {
  DEFAULT_BUSINESS_BOOKS_DATA,
  projectOpeningBusiness,
  type BusinessBooksOptions,
} from "./business-books";
import dataJson from "./data/opening-finance.json" with { type: "json" };
import type {
  BusinessBooksInput,
  CreditFacilityInput,
  FinanceConditionInput,
  FinanceContractInput,
  FinanceInput,
} from "./finance-types";
import { parameter, PARAMETERS } from "./parameters";
import { stopgap } from "./stopgaps";
import type {
  CoreInput,
  HouseholdInput,
  OrganizationInput,
  Source,
} from "./types";

export interface OpeningFinanceData {
  version: string;
  periodMonthsParameter: string;
  cadenceStopgap: { stopgapId: string };
  marketAdjustedHouseholdBudgets: boolean;
  excludedOrganizationKinds: readonly string[];
  stopgapIds: readonly string[];
  categories: readonly {
    key: string;
    contractKind: string;
    supplierClassifications: readonly string[];
    citation: string;
    stopgapId: string;
  }[];
  supplierRules: readonly {
    buyerClassifications: readonly string[];
    contractKind: string;
    supplierClassifications: readonly string[];
    citation: string;
    stopgapId: string;
    salesReceiptBudget: boolean;
  }[];
}

export const DEFAULT_OPENING_FINANCE_DATA: OpeningFinanceData = dataJson;

const cexGenerationPriorVintage = [
  ...new Set(
    Object.values(LIVING_COSTS_CATEGORY_SOURCES).map((row) => row.vintage),
  ),
].join("; ");
const laterVintageGenerationPriorGap =
  "opening-finance:later-vintage-generation-priors-are-not-date-available-actor-facts";

export interface OpeningFinanceOptions {
  data?: OpeningFinanceData;
  books?: BusinessBooksOptions;
  /** Recorded terms, not a request to invent a vendor, loan, or approval. */
  recordedContracts?: readonly FinanceContractInput[];
  recordedFacilities?: readonly CreditFacilityInput[];
  conditions?: readonly FinanceConditionInput[];
  /** Required when more than one recorded facility could serve the firm. */
  creditFacilityIdByOrganization?: Readonly<Record<string, string>>;
  /** Actual adapter context can avoid a geography lookup or national fallback. */
  regionByPlace?: Readonly<Record<string, LivingCostsRegion>>;
  /** Recorded annual plans can override an inherited schedule/wage proxy. */
  recordedAnnualPay?: readonly {
    jobId: string;
    annualMinor: number;
    source: Source;
  }[];
}

/** Opening binding only. No input mutation, cash writer, approval, or receipt. */
export function createOpeningFinance(
  input: CoreInput,
  options: OpeningFinanceOptions = {},
): FinanceInput {
  const data = options.data ?? DEFAULT_OPENING_FINANCE_DATA;
  const booksOptions = options.books ?? {};
  const bookData = booksOptions.data ?? DEFAULT_BUSINESS_BOOKS_DATA;
  const registry = booksOptions.parameters ?? PARAMETERS;
  const p = (key: string) => parameter(key, registry);
  const zero = p("zero"),
    one = p("one");
  const startedAt = makeIsoDate(input.startedAt);
  const gaps = new Set<string>(input.finance?.gaps ?? []);
  const cexPriorPublishedAfterOpening =
    REPRESENTATIVE_LIVING_COSTS.sourceAvailableBy > startedAt;
  stopgap(data.cadenceStopgap.stopgapId);

  const minor = (value: number, field: string) => {
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(
        `Opening finance requires nonnegative integer minor units: ${field}`,
      );
  };
  const sumMinor = (values: readonly number[], field: string) => {
    const total = values.reduce((sum, value) => sum + value, zero);
    minor(total, field);
    return total;
  };
  const validSource = (source: Source, field: string) => {
    if (
      !["SOURCED", "ESTIMATED"].includes(source.tag) ||
      !source.citation.trim() ||
      makeIsoDate(source.asOf) > startedAt
    )
      throw new Error(
        `Opening finance requires a dated, nonfuture source: ${field}`,
      );
  };
  const unique = <T extends { id: string }>(
    rows: readonly T[],
    field: string,
  ) => {
    const result = new Map<string, T>();
    for (const row of rows) {
      if (!row.id || result.has(row.id))
        throw new Error(`Duplicate opening ${field}: ${row.id}`);
      result.set(row.id, row);
    }
    return result;
  };
  const people = unique(input.people, "person");
  const households = unique(input.households, "household");
  const organizations = unique(input.organizations, "organization");
  const jobs = unique(input.jobs, "job");
  const isCurrentOwnedJob = (job: CoreInput["jobs"][number]) =>
    job.endsAt === undefined && people.get(job.personId)?.jobId === job.id;
  for (const actor of people.values()) {
    if (organizations.has(actor.id))
      throw new Error(`Ambiguous cash entity: ${actor.id}`);
    minor(actor.liquidMinor, `person cash ${actor.id}`);
    minor(actor.livingCostDailyMinor, `person living-cost plan ${actor.id}`);
  }
  for (const organization of organizations.values())
    minor(organization.liquidMinor, `organization cash ${organization.id}`);
  for (const household of households.values()) {
    if (new Set(household.memberIds).size !== household.memberIds.length)
      throw new Error(`Duplicate household member: ${household.id}`);
    for (const id of household.memberIds) {
      const actor = people.get(id);
      if (!actor || actor.householdId !== household.id)
        throw new Error(
          `Household membership does not match the input: ${household.id}/${id}`,
        );
    }
  }

  const periodMonths = p(data.periodMonthsParameter);
  if (!Number.isSafeInteger(periodMonths) || periodMonths <= zero)
    throw new Error(
      "Opening finance requires a positive whole calendar-month period.",
    );
  const [yearText, monthText] = startedAt.split("-");
  const nextMonthIndex = Number(monthText) - one + periodMonths;
  const dueAt = isoDateFromParts(
    Number(yearText) + Math.floor(nextMonthIndex / p("monthsPerYear")),
    (nextMonthIndex % p("monthsPerYear")) + one,
    one,
  );

  const conditions = [
    ...unique(
      [...(input.finance?.conditions ?? []), ...(options.conditions ?? [])],
      "condition",
    ).values(),
  ].map((condition) => {
    const at = makeIsoDate(condition.at);
    if (
      !condition.placeId ||
      !["SOURCED", "ESTIMATED"].includes(condition.source.tag) ||
      !condition.source.citation.trim() ||
      makeIsoDate(condition.source.asOf) > at
    )
      throw new Error(
        `Economic condition requires an actual place and source available on its dated input: ${condition.id}`,
      );
    for (const factor of [
      condition.generalPriceFactor,
      condition.wagePriceFactor,
      condition.macroDemandFactor,
    ]) {
      if (!Number.isFinite(factor) || factor <= zero)
        throw new Error(
          `Economic condition factors must be finite and positive: ${condition.id}`,
        );
    }
    return { ...condition, at, source: { ...condition.source } };
  });
  if (!conditions.length)
    gaps.add(
      "opening-finance:no-supplied-dated-price-wage-or-macro-condition-series",
    );

  const facilities = [
    ...unique(
      [
        ...(input.finance?.facilities ?? []),
        ...(options.recordedFacilities ?? []),
      ],
      "facility",
    ).values(),
  ].map((facility) => {
    if (
      !organizations.has(facility.borrowerId) ||
      (!organizations.has(facility.lenderId) &&
        !people.has(facility.lenderId)) ||
      facility.borrowerId === facility.lenderId
    )
      throw new Error(
        `Recorded facility requires an actual firm borrower and distinct existing cash lender: ${facility.id}`,
      );
    minor(facility.limitMinor, `recorded facility limit ${facility.id}`);
    if (p(facility.annualInterestParameter) < zero)
      throw new Error(
        `Recorded facility requires a nonnegative registered interest rate: ${facility.id}`,
      );
    validSource(facility.source, facility.id);
    if (
      facility.interestDayCountParameter &&
      p(facility.interestDayCountParameter) <= zero
    )
      throw new Error(
        `Recorded day-count terms must bind a positive registered denominator: ${facility.id}`,
      );
    if (people.has(facility.lenderId))
      gaps.add(
        "opening-finance:recorded-nonbank-lender-uses-only-existing-person-cash",
      );
    return { ...facility, source: { ...facility.source } };
  });
  const facilityById = new Map(facilities.map((row) => [row.id, row]));
  const facilitiesByBorrower = new Map<string, CreditFacilityInput[]>();
  for (const facility of facilities) {
    const rows = facilitiesByBorrower.get(facility.borrowerId) ?? [];
    rows.push(facility);
    facilitiesByBorrower.set(facility.borrowerId, rows);
  }
  if (!facilities.length)
    gaps.add("opening-finance:no-recorded-credit-facility-or-bank-funding");
  else
    gaps.add(
      "opening-finance:facility-input-has-no-opening-principal-or-existing-interest-arrears-field",
    );

  const contracts: FinanceContractInput[] = [
    ...unique(
      [
        ...(input.finance?.contracts ?? []),
        ...(options.recordedContracts ?? []),
      ],
      "contract",
    ).values(),
  ].map((contract) => {
    if (!contract.kind)
      throw new Error(`Recorded contract kind is missing: ${contract.id}`);
    minor(contract.amountMinor, `recorded contract ${contract.id}`);
    if (
      !Number.isSafeInteger(contract.periodMonths) ||
      contract.periodMonths <= zero
    )
      throw new Error(`Invalid recorded contract period: ${contract.id}`);
    if (makeIsoDate(contract.dueAt) < startedAt)
      throw new Error(
        `Past-due terms require an explicit opening-arrears adapter: ${contract.id}`,
      );
    validSource(contract.source, contract.id);
    if (
      !contract.payerIds.length ||
      new Set(contract.payerIds).size !== contract.payerIds.length ||
      (!people.has(contract.payeeId) && !organizations.has(contract.payeeId))
    )
      throw new Error(
        `Recorded contract requires existing distinct cash participants: ${contract.id}`,
      );
    const household = contract.householdId
      ? households.get(contract.householdId)
      : undefined;
    if (contract.householdId && !household)
      throw new Error(`Recorded contract household is missing: ${contract.id}`);
    for (const payerId of contract.payerIds) {
      if (
        (!people.has(payerId) && !organizations.has(payerId)) ||
        payerId === contract.payeeId ||
        (household && !household.memberIds.includes(payerId))
      )
        throw new Error(
          `Recorded contract payer is not an actual eligible participant: ${contract.id}/${payerId}`,
        );
    }
    if (contract.creditFacilityId) {
      const facility = facilityById.get(contract.creditFacilityId);
      if (
        !facility ||
        contract.payerIds.length !== one ||
        !contract.payerIds.includes(facility.borrowerId)
      )
        throw new Error(
          `Recorded contract has no matching actual facility: ${contract.id}`,
        );
    }
    if (contract.interestFacilityId)
      throw new Error(
        `Interest terms are owned by the recorded facility writer, not a second opening contract: ${contract.id}`,
      );
    return {
      ...contract,
      payerIds: [...contract.payerIds],
      source: { ...contract.source },
    };
  });
  const contractIds = new Set(contracts.map((row) => row.id));
  const contractById = new Map(contracts.map((row) => [row.id, row]));
  const appendContract = (contract: FinanceContractInput) => {
    if (contractIds.has(contract.id))
      throw new Error(`Duplicate bound contract: ${contract.id}`);
    contractIds.add(contract.id);
    contractById.set(contract.id, contract);
    contracts.push(contract);
  };
  const monthlyEquivalent = (contract: FinanceContractInput) =>
    contract.amountMinor / contract.periodMonths;
  const recordedByHousehold = new Map<string, FinanceContractInput[]>();
  const costByOrganization = new Map<string, FinanceContractInput[]>();
  for (const contract of contracts) {
    if (contract.householdId) {
      const rows = recordedByHousehold.get(contract.householdId) ?? [];
      rows.push(contract);
      recordedByHousehold.set(contract.householdId, rows);
    } else {
      for (const payerId of contract.payerIds) {
        if (!organizations.has(payerId)) continue;
        if (contract.payerIds.length !== one)
          throw new Error(
            `Shared organization cost terms require recorded cost attribution: ${contract.id}`,
          );
        const rows = costByOrganization.get(payerId) ?? [];
        rows.push(contract);
        costByOrganization.set(payerId, rows);
      }
    }
  }

  const recordedPlans = new Map<
    string,
    { annualMinor: number; source: Source }
  >();
  const seenRecordedPlans = new Set<string>();
  for (const row of options.recordedAnnualPay ?? []) {
    const job = jobs.get(row.jobId);
    if (!job || seenRecordedPlans.has(row.jobId))
      throw new Error(`Invalid or duplicated recorded job plan: ${row.jobId}`);
    seenRecordedPlans.add(row.jobId);
    if (!isCurrentOwnedJob(job)) {
      gaps.add(
        `opening-finance:historical-or-unowned-job-excluded-from-opening-payroll:${job.organizationId}`,
      );
      continue;
    }
    minor(row.annualMinor, `recorded annual pay ${row.jobId}`);
    validSource(row.source, row.jobId);
    recordedPlans.set(row.jobId, row);
  }
  const activeCommitments = new Map<
    string,
    NonNullable<CoreInput["workCommitments"]>[number]
  >();
  const jobsWithRecordedCommitments = new Set<string>();
  for (const commitment of input.workCommitments ?? []) {
    const job = jobs.get(commitment.jobId);
    if (
      !job ||
      commitment.personId !== job.personId ||
      commitment.organizationId !== job.organizationId
    )
      throw new Error(
        `Opening payroll commitment has no matching owned job: ${commitment.jobId}`,
      );
    if (!isCurrentOwnedJob(job))
      throw new Error(
        `Opening payroll commitment requires a current owned job: ${commitment.jobId}`,
      );
    jobsWithRecordedCommitments.add(commitment.jobId);
    const startsAt = makeIsoDate(commitment.startsAt);
    const endsAt = commitment.endsAt
      ? makeIsoDate(commitment.endsAt)
      : undefined;
    if (
      startsAt < makeIsoDate(people.get(job.personId)!.birthDate) ||
      (endsAt && endsAt < startsAt)
    )
      throw new Error(`Invalid work commitment interval: ${commitment.id}`);
    if (startsAt > startedAt || (endsAt && endsAt < startedAt)) continue;
    if (activeCommitments.has(commitment.jobId))
      throw new Error(
        `Opening payroll requires one owned active commitment per job: ${commitment.jobId}`,
      );
    if (
      !Number.isSafeInteger(commitment.periodDays) ||
      commitment.periodDays <= zero ||
      !Number.isSafeInteger(commitment.hourlyMinor) ||
      commitment.hourlyMinor < zero ||
      !Number.isFinite(commitment.expectedWeeklyMinutes) ||
      commitment.expectedWeeklyMinutes <= zero ||
      commitment.slots.length <= zero
    )
      throw new Error(`Invalid opening work plan: ${commitment.id}`);
    const dayMinutes = p("hoursPerDay") * p("minutesPerHour");
    const spans = commitment.slots
      .map((slot) => {
        if (
          !Number.isSafeInteger(slot.offsetDays) ||
          slot.offsetDays < zero ||
          slot.offsetDays >= commitment.periodDays ||
          !Number.isFinite(slot.startMinute) ||
          slot.startMinute < zero ||
          slot.startMinute >= dayMinutes ||
          !Number.isFinite(slot.minutes) ||
          slot.minutes <= zero ||
          slot.minutes > dayMinutes
        )
          throw new Error(`Invalid opening work minutes: ${commitment.id}`);
        return {
          start: slot.offsetDays * dayMinutes + slot.startMinute,
          minutes: slot.minutes,
        };
      })
      .sort((left, right) => left.start - right.start);
    for (const [index, span] of spans.entries()) {
      const next =
        spans[index + p("one")]?.start ??
        spans[p("zero")]!.start + commitment.periodDays * dayMinutes;
      if (span.start + span.minutes > next)
        throw new Error(`Periodic job slots overlap: ${commitment.id}`);
    }
    validSource(commitment.scheduleSource, commitment.id);
    validSource(commitment.paySource, commitment.id);
    activeCommitments.set(commitment.jobId, commitment);
  }
  const payrollByOrganization = new Map<string, number>();
  const incomeByPlace = new Map<string, number>();
  const payrollSourcesByOrganization = new Map<string, Set<string>>();
  for (const job of jobs.values()) {
    const person = people.get(job.personId);
    if (!person || !organizations.has(job.organizationId))
      throw new Error(`Opening job has no actual worker/employer: ${job.id}`);
    if (!isCurrentOwnedJob(job)) {
      gaps.add(
        `opening-finance:historical-or-unowned-job-excluded-from-opening-payroll:${job.organizationId}`,
      );
      continue;
    }
    if (!Number.isFinite(job.wageDailyMinor) || job.wageDailyMinor < zero)
      throw new Error(`Invalid finite nonnegative job wage proxy: ${job.id}`);
    validSource(job.source, job.id);
    const recorded = recordedPlans.get(job.id),
      commitment = activeCommitments.get(job.id);
    const hasInactiveSchedule =
      !commitment && jobsWithRecordedCommitments.has(job.id);
    const annualMinor =
      recorded?.annualMinor ??
      Math.round(
        commitment
          ? ((commitment.slots.reduce((sum, slot) => sum + slot.minutes, zero) /
              p("minutesPerHour")) *
              commitment.hourlyMinor *
              p("daysPerMeanYear")) /
              commitment.periodDays
          : hasInactiveSchedule
            ? zero
            : job.wageDailyMinor * p("daysPerMeanYear"),
      );
    minor(annualMinor, `planned annual pay ${job.id}`);
    if (!recorded && !commitment)
      gaps.add(
        hasInactiveSchedule
          ? `opening-finance:no-active-recorded-work-plan:${job.organizationId}`
          : `opening-finance:calendar-wage-proxy-without-recorded-schedule:${job.organizationId}`,
      );
    const sources =
      payrollSourcesByOrganization.get(job.organizationId) ?? new Set<string>();
    sources.add(
      recorded?.source.citation ??
        commitment?.paySource.citation ??
        job.source.citation,
    );
    if (commitment) sources.add(commitment.scheduleSource.citation);
    payrollSourcesByOrganization.set(job.organizationId, sources);
    payrollByOrganization.set(
      job.organizationId,
      sumMinor(
        [payrollByOrganization.get(job.organizationId) ?? zero, annualMinor],
        "firm annual plan",
      ),
    );
    incomeByPlace.set(
      person.placeId,
      sumMinor(
        [incomeByPlace.get(person.placeId) ?? zero, annualMinor],
        "resident annual income plan",
      ),
    );
  }
  gaps.add(
    "opening-finance:opening-income-is-planned-local-job-pay-not-observed-income-or-transfer-receipts",
  );

  const businesses: BusinessBooksInput[] = [];
  const businessById = new Map<string, BusinessBooksInput>();
  const existingBooks = unique(
    (input.finance?.businesses ?? []).map((row) => ({
      id: row.organizationId,
      books: row,
    })),
    "business book",
  );
  for (const id of existingBooks.keys()) {
    if (!organizations.has(id))
      throw new Error(`Recorded business has no actual organization: ${id}`);
  }
  for (const organization of organizations.values()) {
    if (
      data.excludedOrganizationKinds.includes(organization.kind) ||
      (organization.governmentFacts &&
        Object.keys(organization.governmentFacts).length)
    ) {
      if (existingBooks.has(organization.id))
        throw new Error(
          `Recorded institutional books require their own finance route: ${organization.id}`,
        );
      gaps.add(
        `opening-finance:actual-institution-budget-required:${organization.id}`,
      );
      continue;
    }
    validSource(organization.source, organization.id);
    const existing = existingBooks.get(organization.id)?.books;
    if (existing) {
      validSource(existing.source, organization.id);
      if (existing.source.generationPriorVintage)
        gaps.add(
          "opening-finance:generation-prior-vintage-is-not-actor-knowledge-or-an-observed-opening-term",
        );
      if (
        !bookData.kinds.some((row) => row.id === existing.kindId) ||
        !Number.isFinite(existing.price) ||
        existing.price <= zero
      )
        throw new Error(
          `Recorded books require a registered industry and positive price: ${organization.id}`,
        );
      for (const value of [
        existing.annualPayrollMinor,
        existing.annualDemandMinor,
        existing.annualOtherCostsMinor,
        existing.openingTownIncomeMinor,
        existing.capacityMinor,
      ]) {
        if (!Number.isFinite(value) || value < zero)
          throw new Error(
            `Recorded business projection is invalid: ${organization.id}`,
          );
      }
      if (existing.annualDemandMinor > zero && existing.capacityMinor === zero)
        throw new Error(
          `Recorded positive demand requires a positive capacity: ${organization.id}`,
        );
      if (
        new Set(existing.costContractIds).size !==
        existing.costContractIds.length
      )
        throw new Error(
          `Duplicate recorded business cost term: ${organization.id}`,
        );
      for (const id of existing.costContractIds) {
        const contract = contractById.get(id);
        if (
          !contract ||
          contract.householdId ||
          contract.payerIds.length !== one ||
          !contract.payerIds.includes(organization.id)
        )
          throw new Error(
            `Recorded books require actual sole-payer cost terms: ${organization.id}/${id}`,
          );
      }
      const existingFacilityId =
        options.creditFacilityIdByOrganization?.[organization.id] ??
        existing.creditFacilityId;
      if (
        options.creditFacilityIdByOrganization?.[organization.id] &&
        existing.creditFacilityId &&
        options.creditFacilityIdByOrganization[organization.id] !==
          existing.creditFacilityId
      )
        throw new Error(
          `Explicit business facility conflicts with recorded book binding: ${organization.id}`,
        );
      if (
        existingFacilityId &&
        facilityById.get(existingFacilityId)?.borrowerId !== organization.id
      )
        throw new Error(
          `Recorded book credit has no matching facility: ${organization.id}`,
        );
      if (
        options.creditFacilityIdByOrganization?.[organization.id] &&
        !facilityById.get(existingFacilityId!)?.active
      )
        throw new Error(
          `Explicit business facility does not match recorded terms: ${organization.id}`,
        );
      const activeFacilities =
        facilitiesByBorrower
          .get(organization.id)
          ?.filter((row) => row.active) ?? [];
      let facilityId = existingFacilityId;
      if (!facilityId && activeFacilities.length === one)
        facilityId = activeFacilities.find(() => true)?.id;
      if (!facilityId && activeFacilities.length > one)
        gaps.add(
          `opening-finance:multiple-recorded-facilities-need-explicit-primary-binding:${organization.id}`,
        );
      if (!facilityId)
        gaps.add(`opening-finance:no-recorded-facility:${organization.id}`);
      if (facilityId && !facilityById.get(facilityId)?.active)
        gaps.add(
          `opening-finance:recorded-primary-facility-is-inactive:${organization.id}`,
        );
      const business = {
        ...existing,
        ...(facilityId ? { creditFacilityId: facilityId } : {}),
        costContractIds: [
          ...new Set([
            ...existing.costContractIds,
            ...(costByOrganization.get(organization.id) ?? []).map(
              (row) => row.id,
            ),
          ]),
        ],
        source: { ...existing.source },
      };
      businesses.push(business);
      businessById.set(organization.id, business);
      continue;
    }
    const projected = projectOpeningBusiness(
      {
        organizationId: organization.id,
        classification: organization.classification ?? "",
        at: startedAt,
        annualPlannedPayMinor:
          payrollByOrganization.get(organization.id) ?? zero,
        existingCashMinor: organization.liquidMinor,
        source: {
          ...organization.source,
          citation: [
            organization.source.citation,
            ...(payrollSourcesByOrganization.get(organization.id) ?? []),
          ].join(" "),
        },
      },
      booksOptions,
    );
    if (!projected.books) {
      gaps.add(
        `${projected.gap ?? "opening-finance:business-books-unbound"}:${organization.id}`,
      );
      continue;
    }
    const books = projected.books;
    if (books.source.generationPriorVintage)
      gaps.add(
        "opening-finance:generation-prior-vintage-is-not-actor-knowledge-or-an-observed-opening-term",
      );
    const admitted =
      facilitiesByBorrower.get(organization.id)?.filter((row) => row.active) ??
      [];
    let facilityId = options.creditFacilityIdByOrganization?.[organization.id];
    if (
      facilityId &&
      (!facilityById.get(facilityId)?.active ||
        facilityById.get(facilityId)?.borrowerId !== organization.id)
    )
      throw new Error(
        `Explicit business facility does not match recorded terms: ${organization.id}`,
      );
    if (!facilityId && admitted.length === one)
      facilityId = admitted.find(() => true)?.id;
    if (!facilityId && admitted.length > one)
      gaps.add(
        `opening-finance:multiple-recorded-facilities-need-explicit-binding:${organization.id}`,
      );
    if (!facilityId)
      gaps.add(`opening-finance:no-recorded-facility:${organization.id}`);
    const business: BusinessBooksInput = {
      organizationId: organization.id,
      kindId: books.kindId,
      annualPayrollMinor: books.annualPlannedPayMinor,
      annualDemandMinor: books.annualDemandMinor,
      annualOtherCostsMinor: books.annualOtherCostsMinor,
      openingTownIncomeMinor: incomeByPlace.get(organization.placeId) ?? zero,
      capacityMinor: books.capacityMinor,
      price: one,
      costContractIds: (costByOrganization.get(organization.id) ?? []).map(
        (row) => row.id,
      ),
      ...(facilityId ? { creditFacilityId: facilityId } : {}),
      source: {
        ...books.source,
        estimatedFrom: `${books.source.estimatedFrom} Opening payroll annualizes active recorded slots/hourly terms, or the declared calendar-wage proxy; town income is the resident job-pay plan. Normalized opening price is a reference index. No money is created.`,
      },
    };
    if (business.openingTownIncomeMinor <= zero)
      gaps.add(
        `opening-finance:positive-resident-income-anchor-missing:${organization.placeId}`,
      );
    businesses.push(business);
    businessById.set(organization.id, business);
  }

  const suppliersByPlaceAndClassification = new Map<
    string,
    Map<string, OrganizationInput[]>
  >();
  for (const organization of organizations.values()) {
    const business = businessById.get(organization.id);
    if (!business || business.capacityMinor <= zero) continue;
    const classes =
      suppliersByPlaceAndClassification.get(organization.placeId) ??
      new Map<string, OrganizationInput[]>();
    const rows = classes.get(organization.classification ?? "") ?? [];
    rows.push(organization);
    classes.set(organization.classification ?? "", rows);
    suppliersByPlaceAndClassification.set(organization.placeId, classes);
  }
  const eligibleSuppliers = (
    placeId: string,
    classes: readonly string[],
    excludeId?: string,
  ) => {
    const result = new Map<string, OrganizationInput>();
    const indexed = suppliersByPlaceAndClassification.get(placeId);
    for (const classification of classes) {
      for (const organization of indexed?.get(classification) ?? []) {
        if (organization.id !== excludeId)
          result.set(organization.id, organization);
      }
    }
    return [...result.values()];
  };

  /** Largest-remainder apportionment preserves the assigned integer budget. */
  const allocate = (
    total: number,
    weights: readonly { id: string; weight: number }[],
  ) => {
    minor(total, "apportioned purchase budget");
    const totalWeight = weights.reduce((sum, row) => sum + row.weight, zero);
    if (!Number.isFinite(totalWeight) || totalWeight < zero)
      throw new Error("Invalid opening supplier/category weights.");
    if (totalWeight === zero) return [];
    const rows = weights.map((row, order) => {
      if (!Number.isFinite(row.weight) || row.weight < zero)
        throw new Error(`Invalid opening budget weight: ${row.id}`);
      const exact = total * (row.weight / totalWeight),
        amount = Math.floor(exact);
      return { id: row.id, amount, remainder: exact - amount, order };
    });
    let remainder =
      total -
      sumMinor(
        rows.map((row) => row.amount),
        "budget floor sum",
      );
    for (const row of [...rows].sort(
      (left, right) =>
        right.remainder - left.remainder || left.order - right.order,
    )) {
      if (remainder <= zero) break;
      row.amount += one;
      remainder -= one;
    }
    if (
      remainder !== zero ||
      sumMinor(
        rows.map((row) => row.amount),
        "budget allocations",
      ) !== total
    )
      throw new Error("Opening finance budget apportionment lost minor units.");
    return rows.map(({ id, amount }) => ({ id, amount }));
  };
  const supplierWeights = (rows: readonly OrganizationInput[]) =>
    rows.map((row) => ({
      id: row.id,
      weight: businessById.get(row.id)?.capacityMinor ?? zero,
    }));
  const regions = new Map<string, LivingCostsRegion>();
  const baskets = new Map<
    string,
    ReturnType<typeof estimatedMonthlyHouseholdLivingCosts>
  >();
  const unboundHouseholdMonthlyByPlace = new Map<string, number>();
  const regionFor = (household: HouseholdInput): LivingCostsRegion => {
    const prior = regions.get(household.placeId);
    if (prior) return prior;
    const supplied = options.regionByPlace?.[household.placeId];
    // CoreInput records the canonical jurisdiction ID as a string; lookup does
    // not establish any place fact until the accepted provider returns a match.
    const place = supplied
      ? undefined
      : (lifePlaceByJurisdictionId(household.placeId as EntityId) ??
        (input.placeMetadata?.placeKey
          ? lifePlaceByKey(input.placeMetadata.placeKey)
          : null));
    const region =
      supplied ??
      livingCostsRegionForState(
        place?.context.jurisdiction.id === household.placeId
          ? place.stateJurisdictionKey
          : null,
      );
    if (region === "national")
      gaps.add(
        `opening-finance:CEX-national-fallback-not-local-category-observations:${household.placeId}`,
      );
    regions.set(household.placeId, region);
    return region;
  };
  const categoryByKey = new Map(data.categories.map((row) => [row.key, row]));
  if (categoryByKey.size !== data.categories.length)
    throw new Error("Duplicated opening household category crosswalk.");
  const kindKeys = new Set(data.categories.map((row) => row.contractKind));
  if (
    kindKeys.size !== data.categories.length ||
    data.categories.some((row) => !row.key || !row.contractKind)
  )
    throw new Error(
      "Opening household categories require distinct nonempty contract kinds.",
    );
  const supplierBuyerKeys = new Set<string>();
  for (const rule of data.supplierRules) {
    if (!rule.contractKind)
      throw new Error(
        "Opening supplier rule requires a nonempty contract kind.",
      );
    if (typeof rule.salesReceiptBudget !== "boolean")
      throw new Error(
        "Opening supplier rules must declare receipt-linked budget semantics.",
      );
    for (const classification of rule.buyerClassifications) {
      if (supplierBuyerKeys.has(classification))
        throw new Error(
          `Ambiguous opening supplier crosswalk: ${classification}`,
        );
      supplierBuyerKeys.add(classification);
    }
  }
  for (const row of data.categories) stopgap(row.stopgapId);

  for (const household of households.values()) {
    const members = household.memberIds.map((id) => people.get(id)!);
    const payers = members.filter((row) => row.livingCostDailyMinor > zero);
    if (!members.length || !payers.length) {
      gaps.add(
        `opening-finance:no-recorded-household-cost-payer:${household.placeId}`,
      );
      continue;
    }
    const existing = recordedByHousehold.get(household.id) ?? [];
    const assignedMonthly = Math.round(
      (sumMinor(
        payers.map((row) => row.livingCostDailyMinor),
        "household daily plan",
      ) *
        p("daysPerMeanYear")) /
        p("monthsPerYear"),
    );
    minor(assignedMonthly, `household monthly plan ${household.id}`);
    const existingMonthly = existing.reduce(
      (sum, row) => sum + monthlyEquivalent(row),
      zero,
    );
    const availableMonthly = Math.max(
      zero,
      Math.floor(assignedMonthly - existingMonthly),
    );
    const region = regionFor(household),
      basketKey = JSON.stringify([region, members.length]);
    let basket = baskets.get(basketKey);
    if (!basket) {
      basket = estimatedMonthlyHouseholdLivingCosts(region, members.length);
      baskets.set(basketKey, basket);
    }
    const categories = basket.categories.filter(
      (row) =>
        !existing.some(
          (contract) =>
            contract.kind === categoryByKey.get(row.key)?.contractKind,
        ),
    );
    if (categories.length > zero && cexPriorPublishedAfterOpening)
      gaps.add(laterVintageGenerationPriorGap);
    const sourceMonthly = categories.reduce(
      (sum, row) =>
        sum + (row.annualMeanUsd * p("minorPerDollar")) / p("monthsPerYear"),
      zero,
    );
    const categoryBudget = Math.min(
      availableMonthly,
      Math.round(sourceMonthly),
    );
    const budgets = allocate(
      categoryBudget,
      categories.map((row) => ({ id: row.key, weight: row.annualMeanUsd })),
    );
    let boundMonthly = zero;
    for (const budget of budgets) {
      if (budget.amount <= zero) continue;
      const crosswalk = categoryByKey.get(budget.id);
      const suppliers = crosswalk
        ? eligibleSuppliers(
            household.placeId,
            crosswalk.supplierClassifications,
          )
        : [];
      if (!crosswalk || !suppliers.length) {
        gaps.add(
          `opening-finance:household-category-has-no-supported-actual-provider:${household.placeId}:${budget.id}`,
        );
        continue;
      }
      for (const share of allocate(budget.amount, supplierWeights(suppliers))) {
        if (share.amount <= zero) continue;
        appendContract({
          id: JSON.stringify([
            "opening-household-purchase",
            household.id,
            budget.id,
            share.id,
          ]),
          householdId: household.id,
          payerIds: payers.map((row) => row.id),
          payeeId: share.id,
          kind: crosswalk.contractKind,
          amountMinor: share.amount * periodMonths,
          dueAt,
          periodMonths,
          accruesArrears: false,
          salesReceipt: true,
          marketAdjusted: data.marketAdjustedHouseholdBudgets,
          source: {
            tag: "ESTIMATED",
            asOf: startedAt,
            generationPriorVintage: cexGenerationPriorVintage,
            citation: `${household.source.citation} ${LIVING_COSTS_SOURCE} ${Object.values(
              LIVING_COSTS_CATEGORY_SOURCES,
            )
              .map((row) => row.url)
              .join(" ")} ${crosswalk.citation}`,
            estimatedFrom: `Later-vintage CEX household-size/region category prior (${basket.sizeColumn}, ${basket.region}); capped by existing assigned livingCostDailyMinor after supplied terms. Opening standing counterparties use actual local classified firms weighted by projected payroll capacity, not observed customer choices. ${basket.uncertainty} ${data.stopgapIds.join(", ")}`,
          },
        });
        boundMonthly += share.amount;
      }
    }
    if (existingMonthly + boundMonthly < assignedMonthly)
      gaps.add(
        `opening-finance:unbound-household-costs-not-converted-to-untracked-payments:${household.placeId}`,
      );
    const unboundMinor = Math.max(
      zero,
      Math.floor(assignedMonthly - existingMonthly - boundMonthly),
    );
    unboundHouseholdMonthlyByPlace.set(
      household.placeId,
      sumMinor(
        [
          unboundHouseholdMonthlyByPlace.get(household.placeId) ?? zero,
          unboundMinor,
        ],
        "unbound estimated household plans",
      ),
    );
  }
  for (const [placeId, amount] of unboundHouseholdMonthlyByPlace) {
    if (amount > zero)
      gaps.add(
        `opening-finance:unbound-estimated-household-monthly-minor:${placeId}:${amount}`,
      );
  }

  for (const rule of data.supplierRules) stopgap(rule.stopgapId);
  for (const business of businesses) {
    const organization = organizations.get(business.organizationId)!;
    const kind = bookData.kinds.find((row) => row.id === business.kindId);
    if (!kind)
      throw new Error(
        `Unregistered projected business kind: ${business.kindId}`,
      );
    const rule = data.supplierRules.find((row) =>
      row.buyerClassifications.includes(organization.classification ?? ""),
    );
    const recorded = costByOrganization.get(organization.id) ?? [];
    const totalMonthlyCost =
      business.annualOtherCostsMinor / p("monthsPerYear");
    const recordedMonthly = recorded.reduce(
      (sum, row) => sum + monthlyEquivalent(row),
      zero,
    );
    const salesCostShare = p(kind.salesCostShareParameter);
    if (salesCostShare < zero || salesCostShare > one)
      throw new Error(
        `Invalid source sales-sensitive cost share: ${business.kindId}`,
      );
    const recordedSalesMonthly = rule
      ? recorded
          .filter((row) => row.kind === rule.contractKind)
          .reduce((sum, row) => sum + monthlyEquivalent(row), zero)
      : zero;
    const supplierBudget = Math.max(
      zero,
      Math.floor(
        Math.min(
          totalMonthlyCost - recordedMonthly,
          totalMonthlyCost * salesCostShare - recordedSalesMonthly,
        ),
      ),
    );
    const suppliers = rule
      ? eligibleSuppliers(
          organization.placeId,
          rule.supplierClassifications,
          organization.id,
        )
      : [];
    let boundMonthly = zero;
    if (rule && suppliers.length && supplierBudget > zero) {
      const additional: FinanceContractInput[] = [];
      for (const share of allocate(
        supplierBudget,
        supplierWeights(suppliers),
      )) {
        if (share.amount <= zero) continue;
        const contract: FinanceContractInput = {
          id: JSON.stringify([
            "opening-business-purchase",
            organization.id,
            rule.contractKind,
            share.id,
          ]),
          payerIds: [organization.id],
          payeeId: share.id,
          kind: rule.contractKind,
          amountMinor: share.amount * periodMonths,
          dueAt,
          periodMonths,
          accruesArrears: false,
          salesReceiptBudget: rule.salesReceiptBudget,
          salesReceipt: true,
          ...(business.creditFacilityId
            ? { creditFacilityId: business.creditFacilityId }
            : {}),
          source: {
            tag: "ESTIMATED",
            asOf: startedAt,
            ...(business.source.generationPriorVintage
              ? {
                  generationPriorVintage:
                    business.source.generationPriorVintage,
                }
              : {}),
            citation: `${business.source.citation} ${rule.citation}`,
            estimatedFrom: `Reference input-cost/revenue ratio from source sales-sensitive cost fraction ${kind.salesCostShareParameter}; suppressed-cost estimated flag is ${String(kind.salesCostEstimated)}. At settlement the ratio is applied only to the frozen pool of actual received sales since the prior cutoff. Only actual mapped non-self local suppliers are bound. No actual delivery, invoice, payment, or supplier capacity observation is asserted. ${rule.stopgapId}`,
          },
        };
        appendContract(contract);
        additional.push(contract);
        boundMonthly += share.amount;
      }
      business.costContractIds = [
        ...business.costContractIds,
        ...additional.map((row) => row.id),
      ];
    }
    if (recordedMonthly + boundMonthly < totalMonthlyCost)
      gaps.add(
        `opening-finance:unbound-firm-costs-require-actual-fixed-cost-or-input-provider-terms:${organization.id}`,
      );
  }

  for (const contract of contracts)
    minor(contract.amountMinor, `bound contract ${contract.id}`);
  gaps.add(
    "opening-finance:HUD-housing-estimate-does-not-establish-landlord-or-lease",
  );
  gaps.add(
    "opening-finance:standing-purchases-are-opening-estimates-not-discretionary-consumption-decisions-or-delivery-records",
  );
  gaps.add(
    "opening-finance:monthly-aggregation-due-phase-category-crosswalk-and-capacity-share-are-open-stopgaps",
  );
  return { contracts, facilities, businesses, conditions, gaps: [...gaps] };
}
