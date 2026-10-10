/** Developer-only snapshots of retained authoritative ledgers; never an engine target. */
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { parameter } from "../parameters";
import type { FinanceTotals } from "../finance-types";
import type { CoreState, Source, WorkCommitmentInput } from "../types";
import { WORK_OBSERVABLE_CONFIG } from "./work-observables";
import { externalFlowObservables } from "./external-flow-observables";

export interface FinanceAgeSnapshot {
  ageId: string;
  minimumAge: number | null;
  maximumAgeExclusive: number | null;
  livingResidents: number;
  liveOwnedJobs: number;
  liveJobHolders: number;
  holdersWithCompleteRecordedSchedules: number;
  holdersWithMissingSchedules: number;
  usualFullTimeProxyHolders: number;
  usualPartTimeProxyHolders: number;
  completeHolderExpectedWeeklyMinutes: number;
  completeHolderMeanExpectedWeeklyHours: number | null;
}

export interface FinanceObservableSnapshot {
  schema: string;
  apiVersion: string;
  schemaVersion: string;
  seed: string;
  startedAt: string;
  throughDate: string;
  ledgerScope: string;
  cash: {
    peopleCount: number;
    organizationCount: number;
    peopleLiquidMinor: number;
    organizationLiquidMinor: number;
    totalLiquidMinor: number;
    externalFlows: ReturnType<typeof externalFlowObservables>;
    conservationStatus: string;
  };
  wages: {
    scheduledWorkEnabled: boolean;
    retainedJobsWithCumulativeResults: number;
    requestedMinor: number;
    paidMinor: number;
    unpaidMinor: number;
    plannedMinutes: number;
    attendedMinutes: number;
    attendedDatedSegments: number;
    absentDatedSegments: number;
    unit: string;
  };
  employment: {
    retainedJobs: number;
    liveJobs: number;
    liveOwnedJobs: number;
    liveUnownedJobRecords: number;
    endedJobs: number;
    liveJobsOfNonlivingHolders: number;
    livingResidents: number;
    liveJobHolders: number;
    livingResidentsWithoutLiveOwnedJob: number;
    liveJobsWithActiveSchedule: number;
    liveJobsWithoutActiveSchedule: number;
    inactiveRetainedCommitments: number;
    retainedCommitmentsWithoutCurrentOwnership: number;
    expectedSlotWeeklyMismatchJobs: number;
    ageRowsSource: string;
    byAge: readonly FinanceAgeSnapshot[];
    bySchedulePeriod: readonly {
      periodDays: number;
      jobs: number;
      expectedWeeklyMinutes: number;
      slotMeanWeeklyMinutes: number;
      minimumExpectedWeeklyHours: number;
      maximumExpectedWeeklyHours: number;
      meanExpectedWeeklyHours: number;
    }[];
    usualHoursProxy: {
      fullTimeMinimumHours: number;
      parameter: string;
      citation: string;
      status: string;
    };
  };
  firms: readonly {
    organizationId: string;
    kindId: string;
    liquidMinor: number;
    receivedMinor: number;
    salesReceivedMinor: number;
    operatingPaidMinor: number;
    wagesRequestedMinor: number;
    wagesPaidMinor: number;
    wagesUnpaidMinor: number;
    closedAt: string | null;
    source: Source;
  }[];
  firmTotals: {
    bookedOrganizations: number;
    receivedMinor: number;
    salesReceivedMinor: number;
    operatingPaidMinor: number;
    wagesRequestedMinor: number;
    wagesPaidMinor: number;
    wagesUnpaidMinor: number;
  };
  contractFlows: {
    cumulativeRequestedMinor: number;
    cumulativePaidMinor: number;
    cumulativeUnfundedMinor: number;
    classifiedPurchaseBudgetRequestedMinor: number;
    classifiedPurchaseBudgetPaidMinor: number;
    classifiedPurchaseBudgetUnfilledMinor: number;
    unattributedRequestedMinor: number;
    unattributedPaidMinor: number;
    unattributedUnfundedMinor: number;
    attributionComplete: boolean;
    byKind: readonly (FinanceTotals & {
      kind: string;
      retainedContracts: number;
      attribution: string;
    })[];
    scope: string;
  };
  debt: {
    principalMinor: number;
    contractArrearsMinor: number;
    nonInterestContractArrearsMinor: number;
    interestContractArrearsMinor: number;
    facilityInterestArrearsMinor: number;
    recordedUnbilledInterestMinor: number;
    recordedInterestRemainderMinor: number;
    borrowedMinor: number;
    repaidMinor: number;
    interestMirrorMismatchFacilities: number;
    facilities: readonly {
      id: string;
      borrowerId: string;
      lenderId: string;
      active: boolean;
      principalMinor: number;
      interestArrearsMinor: number;
      recordedUnbilledInterestMinor: number;
      recordedInterestRemainderMinor: number;
      lastAccruedAt: string;
      interestContractIds: readonly string[];
      linkedInterestContractArrearsMinor: number;
      source: Source;
    }[];
    scope: string;
  };
  receipts: {
    latestWorkResults: number;
    latestFinanceReceipts: number;
    latestCreditReceipts: number;
    detailedFinanceReceipts: number;
    closurePins: number;
    scope: string;
  };
  closures: readonly {
    organizationId: string;
    date: string;
    reasonKey: string;
    sourceReceiptId: string;
    endedJobIds: readonly string[];
    affectedPersonIds: readonly string[];
    cause: {
      id: string;
      date: string;
      kind: "work-result" | "finance-receipt";
      requestedMinor: number;
      paidMinor: number;
      unfundedMinor: number;
      sourceActId: string | null;
      jobId: string | null;
      contractId: string | null;
      stillLatestInOwnIndex: boolean;
      source: Source;
    };
    source: Source;
  }[];
  gaps: readonly string[];
}

/**
 * Cumulative flows plus stocks at core.date. No writes, elapsed accrual, daily
 * replay, history scan, forecast receipts, or reconstruction of compacted rows.
 * This does not replace summarizeWorkObservables(input, core): only that
 * separate original-roster observer has a verified diary-day denominator.
 */
export function financeObservables(
  core: Readonly<CoreState>,
): FinanceObservableSnapshot {
  const p = (key: string) => parameter(key, core.data.parameters);
  const zero = p("zero"),
    one = p("one"),
    minutesPerHour = p("minutesPerHour");
  const date = makeIsoDate(core.date);
  const fullTimeParameter = "financeObservableFullTimeHours";
  const fullTimeHours = p(fullTimeParameter);
  if (
    fullTimeHours <= zero ||
    minutesPerHour <= zero ||
    p("daysPerWeek") <= zero
  )
    throw new Error(
      "Finance observation units and full-time definition must be positive.",
    );
  const amount = (value: number, label: string): number => {
    if (!Number.isFinite(value) || value < zero)
      throw new Error(`Invalid recorded finance observable: ${label}`);
    return value;
  };
  const minor = (value: number, label: string): number => {
    amount(value, label);
    if (!Number.isSafeInteger(value))
      throw new Error(`Invalid minor-unit finance observable: ${label}`);
    return value;
  };
  const sumMinor = (left: number, right: number, label: string) =>
    minor(left + minor(right, label), label);
  const pastDate = (value: string, label: string): string => {
    if (makeIsoDate(value) > date)
      throw new Error(`Future completed finance fact: ${label}`);
    return value;
  };
  const source = (row: Source): Source => ({ ...row });

  let peopleCash = zero,
    organizationCash = zero;
  for (const [id, row] of core.people) {
    if (id !== row.id || core.organizations.has(id))
      throw new Error(
        "Authoritative cash accounts must have unique consistent IDs.",
      );
    peopleCash = sumMinor(peopleCash, row.liquidMinor, `person cash:${id}`);
  }
  for (const [id, row] of core.organizations) {
    if (id !== row.id)
      throw new Error("Organization cash index disagrees with its record.");
    organizationCash = sumMinor(
      organizationCash,
      row.liquidMinor,
      `organization cash:${id}`,
    );
  }

  const configuredAges =
    core.data.work?.activityAgeRows.map((row) => ({
      id: row.id,
      minimumAgeParameter: row.minimumAgeParameter,
      maximumAgeParameter: row.maximumAgeParameter,
    })) ??
    WORK_OBSERVABLE_CONFIG.ageRows.map((row) => ({
      id: row.runtimeAgeId,
      minimumAgeParameter: row.minimumAgeParameter,
      maximumAgeParameter: row.maximumAgeParameter,
    }));
  const ageRows: FinanceAgeSnapshot[] = configuredAges
    .map((row) => ({
      ageId: row.id,
      minimumAge: p(row.minimumAgeParameter),
      maximumAgeExclusive: row.maximumAgeParameter
        ? p(row.maximumAgeParameter)
        : null,
      livingResidents: zero,
      liveOwnedJobs: zero,
      liveJobHolders: zero,
      holdersWithCompleteRecordedSchedules: zero,
      holdersWithMissingSchedules: zero,
      usualFullTimeProxyHolders: zero,
      usualPartTimeProxyHolders: zero,
      completeHolderExpectedWeeklyMinutes: zero,
      completeHolderMeanExpectedWeeklyHours: null,
    }))
    .sort((a, b) => a.minimumAge! - b.minimumAge!);
  const ageIds = new Set<string>();
  let priorMaximum: number | null = zero;
  for (const row of ageRows) {
    if (
      !row.ageId ||
      ageIds.has(row.ageId) ||
      row.ageId === "outside-configured-age-cohorts" ||
      !Number.isSafeInteger(row.minimumAge) ||
      row.minimumAge! < zero ||
      priorMaximum === null ||
      row.minimumAge! < priorMaximum ||
      (row.maximumAgeExclusive !== null &&
        (!Number.isSafeInteger(row.maximumAgeExclusive) ||
          row.maximumAgeExclusive <= row.minimumAge!))
    )
      throw new Error(
        "Current-age observation rows must be unique nonoverlapping completed-year intervals.",
      );
    ageIds.add(row.ageId);
    priorMaximum = row.maximumAgeExclusive;
  }
  const outside: FinanceAgeSnapshot = {
    ageId: "outside-configured-age-cohorts",
    minimumAge: null,
    maximumAgeExclusive: null,
    livingResidents: zero,
    liveOwnedJobs: zero,
    liveJobHolders: zero,
    holdersWithCompleteRecordedSchedules: zero,
    holdersWithMissingSchedules: zero,
    usualFullTimeProxyHolders: zero,
    usualPartTimeProxyHolders: zero,
    completeHolderExpectedWeeklyMinutes: zero,
    completeHolderMeanExpectedWeeklyHours: null,
  };
  ageRows.push(outside);
  const ageByPerson = new Map<string, FinanceAgeSnapshot>();
  let livingResidents = zero;
  for (const actor of core.people.values()) {
    if (!actor.alive) continue;
    const age = ageOnDate(makeIsoDate(actor.birthDate), date);
    if (age < zero)
      throw new Error("A living resident has a future birth date.");
    const row =
      ageRows.find(
        (candidate) =>
          candidate.minimumAge !== null &&
          age >= candidate.minimumAge &&
          (candidate.maximumAgeExclusive === null ||
            age < candidate.maximumAgeExclusive),
      ) ?? outside;
    row.livingResidents += one;
    livingResidents += one;
    ageByPerson.set(actor.id, row);
  }

  const activeByJob = new Map<string, WorkCommitmentInput>();
  let inactiveCommitments = zero,
    unownedCommitments = zero;
  for (const [id, term] of core.work.commitments) {
    const job = core.jobs.get(term.jobId);
    if (
      id !== term.id ||
      !job ||
      job.personId !== term.personId ||
      job.organizationId !== term.organizationId
    )
      throw new Error("Retained work schedule has no matching owned job.");
    if (
      job.endsAt === undefined &&
      core.people.get(job.personId)?.jobId !== job.id
    ) {
      unownedCommitments += one;
      continue;
    }
    const active =
      makeIsoDate(term.startsAt) <= date &&
      (term.endsAt === undefined || makeIsoDate(term.endsAt) >= date) &&
      job.endsAt === undefined;
    if (!active) {
      inactiveCommitments += one;
      continue;
    }
    if (activeByJob.has(term.jobId))
      throw new Error(
        "Multiple active schedules for one owned job are not attributable.",
      );
    activeByJob.set(term.jobId, term);
  }
  const holder = new Map<
    string,
    { jobs: number; missing: number; minutes: number }
  >();
  const periods = new Map<
    number,
    {
      jobs: number;
      expected: number;
      slots: number;
      minimum: number;
      maximum: number;
    }
  >();
  let liveJobs = zero,
    liveOwnedJobs = zero,
    unownedJobs = zero,
    endedJobs = zero,
    nonlivingJobs = zero,
    withSchedule = zero,
    withoutSchedule = zero,
    mismatchJobs = zero;
  for (const [id, job] of core.jobs) {
    if (
      id !== job.id ||
      !core.people.has(job.personId) ||
      !core.organizations.has(job.organizationId)
    )
      throw new Error(
        "Recorded job ownership/employer is missing or inconsistent.",
      );
    if (job.endsAt !== undefined) {
      pastDate(job.endsAt, `ended job:${id}`);
      endedJobs += one;
      continue;
    }
    liveJobs += one;
    if (core.people.get(job.personId)!.jobId !== id) {
      unownedJobs += one;
      continue;
    }
    liveOwnedJobs += one;
    const age = ageByPerson.get(job.personId);
    if (age) age.liveOwnedJobs += one;
    else nonlivingJobs += one;
    const total = holder.get(job.personId) ?? {
      jobs: zero,
      missing: zero,
      minutes: zero,
    };
    total.jobs += one;
    const term = activeByJob.get(id);
    if (!term) {
      withoutSchedule += one;
      total.missing += one;
    } else {
      withSchedule += one;
      const expected = amount(
        term.expectedWeeklyMinutes,
        `expected weekly minutes:${term.id}`,
      );
      if (!Number.isSafeInteger(term.periodDays) || term.periodDays <= zero)
        throw new Error(
          "Recorded schedule period must be positive whole days.",
        );
      const slotMinutes = term.slots.reduce(
        (sum, slot) => sum + amount(slot.minutes, `slot:${term.id}`),
        zero,
      );
      const slotWeekly = (slotMinutes / term.periodDays) * p("daysPerWeek");
      total.minutes = amount(
        total.minutes + expected,
        "holder expected weekly minutes",
      );
      if (slotWeekly !== expected) mismatchJobs += one;
      const period = periods.get(term.periodDays) ?? {
        jobs: zero,
        expected: zero,
        slots: zero,
        minimum: expected,
        maximum: expected,
      };
      period.jobs += one;
      period.expected = amount(
        period.expected + expected,
        "period expected minutes",
      );
      period.slots = amount(
        period.slots + slotWeekly,
        "period slot weekly minutes",
      );
      period.minimum = Math.min(period.minimum, expected);
      period.maximum = Math.max(period.maximum, expected);
      periods.set(term.periodDays, period);
    }
    holder.set(job.personId, total);
  }
  let liveHolders = zero;
  for (const [id, total] of holder) {
    const age = ageByPerson.get(id);
    if (!age) continue;
    liveHolders += one;
    age.liveJobHolders += one;
    if (total.missing > zero) age.holdersWithMissingSchedules += one;
    else {
      age.holdersWithCompleteRecordedSchedules += one;
      age.completeHolderExpectedWeeklyMinutes = amount(
        age.completeHolderExpectedWeeklyMinutes + total.minutes,
        "age holder minutes",
      );
      if (total.minutes / minutesPerHour >= fullTimeHours)
        age.usualFullTimeProxyHolders += one;
      else age.usualPartTimeProxyHolders += one;
    }
  }
  for (const age of ageRows)
    age.completeHolderMeanExpectedWeeklyHours =
      age.holdersWithCompleteRecordedSchedules > zero
        ? age.completeHolderExpectedWeeklyMinutes /
          minutesPerHour /
          age.holdersWithCompleteRecordedSchedules
        : null;

  const wages = {
    scheduledWorkEnabled: core.data.work !== undefined,
    retainedJobsWithCumulativeResults: core.work.totalsByJob.size,
    requestedMinor: zero,
    paidMinor: zero,
    unpaidMinor: zero,
    plannedMinutes: zero,
    attendedMinutes: zero,
    attendedDatedSegments: zero,
    absentDatedSegments: zero,
    unit: "Cumulative actual dated work segments, not completed shifts or usual weekly hours; requested minus paid is unpaid arithmetic, not a legal arrears determination.",
  };
  for (const [id, total] of core.work.totalsByJob) {
    if (!core.jobs.has(id))
      throw new Error("Cumulative wages have no retained job.");
    const requested = minor(total.requestedMinor, `work requested:${id}`),
      paid = minor(total.paidMinor, `work paid:${id}`);
    if (paid > requested || total.attendedMinutes > total.plannedMinutes)
      throw new Error(
        "Cumulative work totals exceed their actual requested/planned amounts.",
      );
    wages.requestedMinor = sumMinor(
      wages.requestedMinor,
      requested,
      "requested wages",
    );
    wages.paidMinor = sumMinor(wages.paidMinor, paid, "paid wages");
    wages.plannedMinutes = amount(
      wages.plannedMinutes + amount(total.plannedMinutes, "planned minutes"),
      "planned minutes total",
    );
    wages.attendedMinutes = amount(
      wages.attendedMinutes + amount(total.attendedMinutes, "attended minutes"),
      "attended minutes total",
    );
    wages.attendedDatedSegments = sumMinor(
      wages.attendedDatedSegments,
      total.workedDays,
      "attended dated segments",
    );
    wages.absentDatedSegments = sumMinor(
      wages.absentDatedSegments,
      total.missedDays,
      "absent dated segments",
    );
  }
  wages.unpaidMinor = wages.requestedMinor - wages.paidMinor;

  const firms = [...core.finance.businesses]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, book]) => {
      const organization = core.organizations.get(id);
      if (!organization || book.organizationId !== id)
        throw new Error(
          "Firm books have no authoritative organization cash record.",
        );
      const requested = minor(book.wagesRequestedMinor, "firm requested wages"),
        paid = minor(book.wagesPaidMinor, "firm paid wages");
      if (
        requested - paid !==
        minor(book.wagesUnpaidMinor, "firm unpaid wages")
      )
        throw new Error("Firm wage totals do not reconcile.");
      const received = minor(book.receivedMinor, "actual firm receipts"),
        salesReceived = minor(
          book.salesReceivedMinor,
          "actual firm sales receipts",
        );
      if (salesReceived > received)
        throw new Error(
          "Firm sales receipts exceed actual received transfers.",
        );
      return {
        organizationId: id,
        kindId: book.kindId,
        liquidMinor: organization.liquidMinor,
        receivedMinor: received,
        salesReceivedMinor: salesReceived,
        operatingPaidMinor: minor(
          book.operatingPaidMinor,
          "actual operating payments",
        ),
        wagesRequestedMinor: requested,
        wagesPaidMinor: paid,
        wagesUnpaidMinor: book.wagesUnpaidMinor,
        closedAt: book.closedAt
          ? pastDate(book.closedAt, "firm closure")
          : null,
        source: source(book.source),
      };
    });
  const firmTotals = {
    bookedOrganizations: firms.length,
    receivedMinor: zero,
    salesReceivedMinor: zero,
    operatingPaidMinor: zero,
    wagesRequestedMinor: zero,
    wagesPaidMinor: zero,
    wagesUnpaidMinor: zero,
  };
  for (const row of firms)
    for (const key of [
      "receivedMinor",
      "salesReceivedMinor",
      "operatingPaidMinor",
      "wagesRequestedMinor",
      "wagesPaidMinor",
      "wagesUnpaidMinor",
    ] as const)
      firmTotals[key] = sumMinor(
        firmTotals[key],
        row[key],
        `firm total:${key}`,
      );

  const kindTerms = new Map<string, { count: number; budgets: number }>();
  const interestByFacility = new Map<
    string,
    { ids: string[]; arrears: number }
  >();
  let contractArrears = zero,
    interestArrears = zero;
  for (const [id, term] of core.finance.contracts) {
    if (id !== term.id)
      throw new Error("Contract index disagrees with its record.");
    const arrears = minor(term.arrearsMinor, "actual contract arrears");
    contractArrears = sumMinor(
      contractArrears,
      arrears,
      "contract arrears total",
    );
    const kinds = kindTerms.get(term.kind) ?? { count: zero, budgets: zero };
    kinds.count += one;
    if (!term.accruesArrears && term.interestFacilityId === undefined)
      kinds.budgets += one;
    kindTerms.set(term.kind, kinds);
    if (term.interestFacilityId !== undefined) {
      if (!core.finance.facilities.has(term.interestFacilityId))
        throw new Error("Interest contract has no recorded facility.");
      interestArrears = sumMinor(
        interestArrears,
        arrears,
        "interest contract arrears total",
      );
      const linked = interestByFacility.get(term.interestFacilityId) ?? {
        ids: [],
        arrears: zero,
      };
      linked.ids.push(id);
      linked.arrears = sumMinor(
        linked.arrears,
        arrears,
        "facility linked arrears",
      );
      interestByFacility.set(term.interestFacilityId, linked);
    }
  }
  const flows = {
    cumulativeRequestedMinor: zero,
    cumulativePaidMinor: zero,
    cumulativeUnfundedMinor: zero,
    classifiedPurchaseBudgetRequestedMinor: zero,
    classifiedPurchaseBudgetPaidMinor: zero,
    classifiedPurchaseBudgetUnfilledMinor: zero,
    unattributedRequestedMinor: zero,
    unattributedPaidMinor: zero,
    unattributedUnfundedMinor: zero,
    attributionComplete: true,
  };
  let borrowed = zero,
    repaid = zero;
  const byKind = [...core.finance.totalsByKind]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, total]) => {
      for (const [key, value] of Object.entries(total))
        minor(value, `contract total:${kind}:${key}`);
      if (total.requestedMinor - total.paidMinor !== total.unfundedMinor)
        throw new Error("Cumulative contract flows do not reconcile.");
      const terms = kindTerms.get(kind);
      const attribution =
        terms && terms.budgets === terms.count
          ? "purchase-budget"
          : terms && terms.budgets === zero
            ? "arrears-obligation"
            : "mixed-or-unattributed";
      flows.cumulativeRequestedMinor = sumMinor(
        flows.cumulativeRequestedMinor,
        total.requestedMinor,
        "contract requested total",
      );
      flows.cumulativePaidMinor = sumMinor(
        flows.cumulativePaidMinor,
        total.paidMinor,
        "contract paid total",
      );
      flows.cumulativeUnfundedMinor = sumMinor(
        flows.cumulativeUnfundedMinor,
        total.unfundedMinor,
        "contract unfunded total",
      );
      borrowed = sumMinor(borrowed, total.borrowedMinor, "actual credit drawn");
      repaid = sumMinor(repaid, total.repaidMinor, "actual principal repaid");
      if (attribution === "purchase-budget") {
        flows.classifiedPurchaseBudgetRequestedMinor = sumMinor(
          flows.classifiedPurchaseBudgetRequestedMinor,
          total.requestedMinor,
          "budget requested",
        );
        flows.classifiedPurchaseBudgetPaidMinor = sumMinor(
          flows.classifiedPurchaseBudgetPaidMinor,
          total.paidMinor,
          "budget paid",
        );
        flows.classifiedPurchaseBudgetUnfilledMinor = sumMinor(
          flows.classifiedPurchaseBudgetUnfilledMinor,
          total.unfundedMinor,
          "budget unfilled",
        );
      } else if (
        attribution === "mixed-or-unattributed" &&
        total.requestedMinor > zero
      ) {
        flows.attributionComplete = false;
        flows.unattributedRequestedMinor = sumMinor(
          flows.unattributedRequestedMinor,
          total.requestedMinor,
          "unattributed requested",
        );
        flows.unattributedPaidMinor = sumMinor(
          flows.unattributedPaidMinor,
          total.paidMinor,
          "unattributed paid",
        );
        flows.unattributedUnfundedMinor = sumMinor(
          flows.unattributedUnfundedMinor,
          total.unfundedMinor,
          "unattributed unfunded",
        );
      }
      return {
        kind,
        ...total,
        retainedContracts: terms?.count ?? zero,
        attribution,
      };
    });

  let principal = zero,
    facilityArrears = zero,
    unbilled = zero,
    remainders = zero,
    mirrorMismatch = zero;
  const facilities = [...core.finance.facilities]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, row]) => {
      if (id !== row.id)
        throw new Error("Facility index disagrees with its record.");
      const linked = interestByFacility.get(id);
      principal = sumMinor(
        principal,
        row.principalMinor,
        "actual outstanding principal",
      );
      facilityArrears = sumMinor(
        facilityArrears,
        row.interestArrearsMinor,
        "facility interest arrears",
      );
      unbilled = amount(
        unbilled +
          amount(row.unbilledInterestMinor, "recorded unbilled interest"),
        "recorded unbilled interest total",
      );
      remainders = amount(
        remainders +
          amount(row.interestRemainderMinor, "recorded interest remainder"),
        "recorded interest remainder total",
      );
      if (row.interestArrearsMinor !== (linked?.arrears ?? zero))
        mirrorMismatch += one;
      return {
        id,
        borrowerId: row.borrowerId,
        lenderId: row.lenderId,
        active: row.active,
        principalMinor: row.principalMinor,
        interestArrearsMinor: row.interestArrearsMinor,
        recordedUnbilledInterestMinor: row.unbilledInterestMinor,
        recordedInterestRemainderMinor: row.interestRemainderMinor,
        lastAccruedAt: pastDate(row.lastAccruedAt, "interest accrual"),
        interestContractIds: [...(linked?.ids ?? [])].sort(),
        linkedInterestContractArrearsMinor: linked?.arrears ?? zero,
        source: source(row.source),
      };
    });

  const closures = [...core.finance.closures]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, row]) => {
      const cause = row.cause;
      if (
        !cause ||
        id !== row.organizationId ||
        cause.id !== row.sourceReceiptId ||
        cause.date !== row.date ||
        core.finance.businesses.get(id)?.closedAt !== row.date
      )
        throw new Error(
          "Closure lacks its actual matching pinned cause/book record.",
        );
      pastDate(row.date, "closure cause");
      const requested = minor(cause.requestedMinor, "closure requested amount"),
        paid = minor(cause.paidMinor, "closure paid amount");
      const isWork = "jobId" in cause;
      const unfunded = isWork ? cause.shortfallMinor : cause.unfundedMinor;
      if (
        minor(unfunded, "closure unfunded amount") <= zero ||
        requested - paid !== unfunded
      )
        throw new Error(
          "Closure cause is not an actual positive unpaid obligation.",
        );
      if (
        isWork
          ? cause.organizationId !== id || !cause.sourceActId
          : !core.finance.contracts.get(cause.contractId)?.accruesArrears ||
            !cause.payments.some((payment) => payment.payerId === id)
      )
        throw new Error(
          "Closure cause does not belong to this employer obligation.",
        );
      for (const jobId of row.endedJobIds) {
        const job = core.jobs.get(jobId);
        if (
          !job ||
          job.organizationId !== id ||
          job.endsAt !== row.date ||
          !row.affectedPersonIds.includes(job.personId)
        )
          throw new Error(
            "Closure ended-job facts disagree with their retained ownership.",
          );
      }
      return {
        organizationId: id,
        date: row.date,
        reasonKey: row.reasonKey,
        sourceReceiptId: row.sourceReceiptId,
        endedJobIds: [...row.endedJobIds].sort(),
        affectedPersonIds: [...row.affectedPersonIds].sort(),
        cause: {
          id: cause.id,
          date: cause.date,
          kind: isWork
            ? ("work-result" as const)
            : ("finance-receipt" as const),
          requestedMinor: requested,
          paidMinor: paid,
          unfundedMinor: unfunded,
          sourceActId: isWork ? cause.sourceActId : null,
          jobId: isWork ? cause.jobId : null,
          contractId: isWork ? null : cause.contractId,
          stillLatestInOwnIndex: isWork
            ? core.work.lastResultByJob.get(cause.jobId)?.id === cause.id
            : core.finance.latestReceiptsByContract.get(cause.contractId)
                ?.id === cause.id,
          source: source(cause.source),
        },
        source: source(row.source),
      };
    });

  return {
    schema: "p8-finance-observables-v1",
    apiVersion: core.apiVersion,
    schemaVersion: core.schemaVersion,
    seed: core.seed,
    startedAt: core.startedAt,
    throughDate: date,
    ledgerScope:
      "Stocks at throughDate and cumulative recorded flows since initialization; consecutive flow differences are interval amounts. Current holder ages are not retrospective diary exposure.",
    cash: {
      peopleCount: core.people.size,
      organizationCount: core.organizations.size,
      peopleLiquidMinor: peopleCash,
      organizationLiquidMinor: organizationCash,
      totalLiquidMinor: sumMinor(
        peopleCash,
        organizationCash,
        "total authoritative liquid cash",
      ),
      conservationStatus:
        "Single-date stock plus cumulative outside-owner flows; compare stock plus outside net flow with the same opening accounts or prior snapshot. Debt, forecasts and book subtotals are not liquid cash.",
      externalFlows: externalFlowObservables(core),
    },
    wages,
    employment: {
      retainedJobs: core.jobs.size,
      liveJobs,
      liveOwnedJobs,
      liveUnownedJobRecords: unownedJobs,
      endedJobs,
      liveJobsOfNonlivingHolders: nonlivingJobs,
      livingResidents,
      liveJobHolders: liveHolders,
      livingResidentsWithoutLiveOwnedJob: livingResidents - liveHolders,
      liveJobsWithActiveSchedule: withSchedule,
      liveJobsWithoutActiveSchedule: withoutSchedule,
      inactiveRetainedCommitments: inactiveCommitments,
      expectedSlotWeeklyMismatchJobs: mismatchJobs,
      retainedCommitmentsWithoutCurrentOwnership: unownedCommitments,
      ageRowsSource: core.data.work
        ? "core.data.work.activityAgeRows (active registry)"
        : "WORK_OBSERVABLE_CONFIG.ageRows (observation crosswalk; scheduled work disabled)",
      byAge: ageRows,
      bySchedulePeriod: [...periods]
        .sort(([a], [b]) => a - b)
        .map(([periodDays, row]) => ({
          periodDays,
          jobs: row.jobs,
          expectedWeeklyMinutes: row.expected,
          slotMeanWeeklyMinutes: row.slots,
          minimumExpectedWeeklyHours: row.minimum / minutesPerHour,
          maximumExpectedWeeklyHours: row.maximum / minutesPerHour,
          meanExpectedWeeklyHours: row.expected / minutesPerHour / row.jobs,
        })),
      usualHoursProxy: {
        fullTimeMinimumHours: fullTimeHours,
        parameter: fullTimeParameter,
        citation: core.data.parameters[fullTimeParameter]!.citation,
        status:
          "BLS usual-hours proxy: holder-summed live expectedWeeklyMinutes across currently owned jobs with complete recorded schedules. This API proves only primary person.jobId ownership, not secondary-job ownership. Scheduled hours are not surveyed usual all-job hours, attendance, or calibration evidence.",
      },
    },
    firms,
    firmTotals,
    contractFlows: {
      ...flows,
      byKind,
      scope:
        "Cumulative requested/paid/unfunded due amounts. Repeated arrears requests can recur; unfunded flows are not outstanding debt. Purchase-budget attribution uses all retained terms sharing each open kind; mixed kinds remain unallocated.",
    },
    debt: {
      principalMinor: principal,
      contractArrearsMinor: contractArrears,
      nonInterestContractArrearsMinor: contractArrears - interestArrears,
      interestContractArrearsMinor: interestArrears,
      facilityInterestArrearsMinor: facilityArrears,
      recordedUnbilledInterestMinor: unbilled,
      recordedInterestRemainderMinor: remainders,
      borrowedMinor: borrowed,
      repaidMinor: repaid,
      interestMirrorMismatchFacilities: mirrorMismatch,
      facilities,
      scope:
        "Principal is actual outstanding loan principal. Interest contract arrears and facility interest arrears are mirror views, never added together. Recorded unbilled/remainder interest is read without accruing elapsed time.",
    },
    receipts: {
      latestWorkResults: core.work.lastResultByJob.size,
      latestFinanceReceipts: core.finance.latestReceiptsByContract.size,
      latestCreditReceipts: core.finance.latestCreditByFacility.size,
      detailedFinanceReceipts: core.finance.detailedReceipts.size,
      closurePins: closures.length,
      scope:
        "Retention counts only. Latest/detailed receipt indexes do not establish full historical receipt coverage; cumulative totals are read from their authoritative counters.",
    },
    closures,
    gaps: [
      ...new Set([
        ...core.gaps,
        "Current living-resident/job-holder age counts are dated completed years, not a fixed-roster diary denominator or CPS civilian/noninstitutional employment-rate estimate.",
        "Retain summarizeWorkObservables(originalInput, core) separately for exact original-roster paid-work exposure; ATUS work-related time is broader and is not an equality/calibration pass.",
        "People without a live owned job are not asserted unemployed; labor-force eligibility, job search and nonpayroll employment are not inferred.",
        "Expected schedule hours proxy BLS usual all-job weekly hours; actual paid work and dated participation remain separate cumulative measures.",
        "This API exposes primary person.jobId ownership only. Live-looking retained rows without that link are counted separately, not treated as employed holders or secondary jobs; the BLS all-job ownership crosswalk remains incomplete.",
        "Book receipts cover recorded-counterparty payments, not all economic sales; book wages cover booked organizations, not every employer.",
        "No full historical source receipt stream, forecast funding, new cash, credit approval, or simulated outcome is reconstructed by this observer.",
      ]),
    ].sort(),
  };
}
