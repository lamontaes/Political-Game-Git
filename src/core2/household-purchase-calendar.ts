/** Estimated calendar phase only; this module neither creates income nor writes cash. */
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import type {
  FinanceContractInput,
  FinanceContractState,
  HouseholdPurchaseCalendarBasis,
  HouseholdPurchaseCalendarInput,
} from "./finance-types";
import type { FinancePlanningSession } from "./finance-plan";
import type {
  OpeningPurchaseCalendarChoice,
  OpeningPurchaseCalendarData,
} from "./opening-purchase-calendar";
import { stopgap } from "./stopgaps";
import { admittedWorkPayrollCalendarMatches } from "./work-attendance";
import {
  nextWorkPayrollPeriod,
  validateRetainedWorkPayrollObligation,
  workPayPeriodAtIndex,
} from "./work-pay-period";
import type { WorkPayrollBasis, WorkPayrollLedger } from "./work-pay-period";
import type {
  WorkPayrollCashSourceState,
  WorkPayrollGroupSourceState,
  SingleWorkPayrollCashSourceState,
  WorkPayrollJobReceipt,
} from "./work-payroll-cash";
import type { IsoDate } from "../simulation/types";
import type { Source } from "./types";

const ruleId = "generated-household-income-calendar-at-or-after-nominal";

/** Preserve complete actual Source data, including optional typed household basis children. */
function copyPurchaseCalendarSource(
  r: FinancePlanningSession["reads"],
  source: Source,
  availableAt: IsoDate,
  zero: number,
  one: number,
): Source {
  const active = new Set<object>(),
    copied = new WeakMap<object, object>();
  const copy = (value: unknown): unknown => {
    if (value === null || typeof value !== "object") {
      if (
        typeof value === "function" ||
        typeof value === "symbol" ||
        typeof value === "bigint" ||
        (typeof value === "number" && !Number.isFinite(value))
      )
        throw new Error(
          "Purchase calendar Source requires nonexecutable finite data.",
        );
      return value;
    }
    if (active.has(value))
      throw new Error("Purchase calendar Source cannot contain a cycle.");
    const prior = copied.get(value);
    if (prior) return prior;
    const array = Array.isArray(value),
      prototype = Object.getPrototypeOf(value);
    if (
      array
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    )
      throw new Error(
        "Purchase calendar Source requires ordinary owned records or arrays.",
      );
    const result = array ? [] : Object.create(null);
    active.add(value);
    copied.set(value, result);
    try {
      if (array) r.array(value as readonly unknown[], zero, one);
      for (const key of r.keys(value)) {
        if (typeof key !== "string")
          throw new Error(
            "Purchase calendar Source requires named own data fields.",
          );
        if (array && key === "length") continue;
        const field = r.field(value as Record<string, unknown>, key),
          descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          !descriptor ||
          !("value" in descriptor) ||
          !Object.is(descriptor.value, field)
        )
          throw new Error(
            "Purchase calendar Source descriptor changed during copying.",
          );
        Object.defineProperty(result, key, {
          value: copy(field),
          enumerable: descriptor.enumerable,
          writable: false,
          configurable: false,
        });
      }
      return Object.freeze(result);
    } finally {
      active.delete(value);
    }
  };
  // Keep the original scalar Source envelope; the public optional typed basis is the sole structured exception.
  for (const key of r.keys(source)) {
    if (typeof key !== "string")
      throw new Error(
        "Purchase calendar Source requires named own data fields.",
      );
    const value = r.field(source as unknown as Record<string, unknown>, key);
    if (key === "generatedHouseholdBasis") {
      if (
        value !== undefined &&
        (value === null || typeof value !== "object" || Array.isArray(value))
      )
        throw new Error(
          "Purchase calendar typed Source basis requires an owned record.",
        );
    } else if (value !== undefined && typeof value !== "string")
      throw new Error(
        "Purchase calendar Source requires scalar provenance outside its optional typed basis.",
      );
  }
  const result = copy(source) as Source,
    basis = result.generatedHouseholdBasis;
  if (basis !== undefined) {
    const keys = [
      "schema",
      "domain",
      "catalogVersion",
      "householdId",
      "ownerSourceDigest",
      "key",
      "region",
      "sizeColumn",
      "parameterRefs",
      "calendarDueAt",
      "calendarBasisIds",
      "missingIncome",
    ];
    if (
      Reflect.ownKeys(basis).length !== keys.length ||
      keys.some((key) => !Object.hasOwn(basis, key)) ||
      basis.schema !== "p8-hh-source-basis/v1" ||
      !["category", "service"].includes(basis.domain) ||
      [
        basis.catalogVersion,
        basis.householdId,
        basis.ownerSourceDigest,
        basis.key,
        basis.region,
        basis.sizeColumn,
      ].some((value) => typeof value !== "string" || !value.trim()) ||
      typeof basis.missingIncome !== "boolean" ||
      typeof basis.calendarDueAt !== "string" ||
      makeIsoDate(basis.calendarDueAt) !== basis.calendarDueAt ||
      ![basis.parameterRefs, basis.calendarBasisIds].every(
        (value) =>
          Array.isArray(value) &&
          Array.prototype.every.call(
            value,
            (id: unknown) => typeof id === "string" && id.trim(),
          ),
      )
    )
      throw new Error(
        "Purchase calendar typed Source basis has an unsupported shape.",
      );
  }
  if (
    !["SOURCED", "ESTIMATED"].includes(result.tag) ||
    !result.citation?.trim() ||
    makeIsoDate(result.asOf) > availableAt
  )
    throw new Error(
      "Purchase renewal requires actual available source evidence.",
    );
  return result;
}

/** Only fresh generated household budgets call this factory; supplied bills omit it. */
export function createHouseholdPurchaseCalendarMarker(
  householdId: string,
  choice: OpeningPurchaseCalendarChoice,
  data: OpeningPurchaseCalendarData,
): HouseholdPurchaseCalendarInput {
  if (
    !householdId.trim() ||
    data.recurringHouseholdDueRule !== ruleId ||
    !data.stopgapId.trim() ||
    choice.source.tag !== "ESTIMATED"
  )
    throw new Error(
      "Generated household purchases require the declared estimated recurrence rule.",
    );
  stopgap(data.stopgapId);
  return {
    ruleId: data.recurringHouseholdDueRule,
    stopgapId: data.stopgapId,
    householdId,
    firstNominalDueAt: makeIsoDate(choice.dueAt),
    openingBasisIds: [...choice.basisIds],
    source: { ...choice.source },
  };
}

/** Called by admission before its first contract/index mutation; no old-save adapter. */
export function validateHouseholdPurchaseCalendarAdmission(
  input: FinanceContractInput,
  date: string,
): HouseholdPurchaseCalendarInput | undefined {
  const marker = input.householdPurchaseCalendar;
  if (!marker) return undefined;
  if (
    marker.ruleId !== ruleId ||
    !marker.stopgapId?.trim() ||
    !marker.householdId?.trim() ||
    marker.householdId !== input.householdId ||
    input.accruesArrears ||
    !input.salesReceipt ||
    input.salesReceiptBudget ||
    input.recipientIncome ||
    input.externalInflow ||
    input.interestFacilityId ||
    input.source.tag !== "ESTIMATED" ||
    marker.source?.tag !== "ESTIMATED" ||
    !marker.source.citation?.trim() ||
    !marker.source.estimatedFrom?.trim() ||
    makeIsoDate(marker.source.asOf) > makeIsoDate(date) ||
    makeIsoDate(marker.firstNominalDueAt) !== makeIsoDate(input.dueAt) ||
    !Array.isArray(marker.openingBasisIds) ||
    marker.openingBasisIds.some((id) => !id.trim()) ||
    new Set(marker.openingBasisIds).size !== marker.openingBasisIds.length
  )
    throw new Error(
      "Generated household calendar metadata requires matching estimated nondebt purchase terms.",
    );
  stopgap(marker.stopgapId);
  return {
    ...marker,
    openingBasisIds: [...marker.openingBasisIds],
    source: { ...marker.source },
  };
}

/** Caller passes the unshifted next AND following nominal dates from existing month arithmetic. */
export function nextHouseholdPurchaseDate(
  session: FinancePlanningSession,
  row: FinanceContractState,
  nextNominalDueAt: string,
  followingNominalDueAt: string,
): HouseholdPurchaseCalendarBasis | undefined {
  const r = session.reads,
    m = session.metadata,
    zero = session.zero,
    one = session.one,
    marker = r.field(row, "householdPurchaseCalendar");
  if (!marker) return undefined;
  r.keys(marker);
  const selectedRule = r.field(marker, "ruleId"),
    gap = r.field(marker, "stopgapId"),
    homeId = r.field(marker, "householdId"),
    firstNominal = makeIsoDate(r.field(marker, "firstNominalDueAt")),
    nominal = makeIsoDate(nextNominalDueAt),
    following = makeIsoDate(followingNominalDueAt),
    previousNominal = m.field(row, "nominalDueAt");
  const copySource = (source: Source, availableAt = session.date): Source =>
    copyPurchaseCalendarSource(r, source, makeIsoDate(availableAt), zero, one);
  const originalSource = copySource(r.field(marker, "source")),
    openingIds = r.array(r.field(marker, "openingBasisIds"), zero, one);
  if (
    selectedRule !== ruleId ||
    !gap.trim() ||
    homeId !== r.field(row, "householdId") ||
    r.field(row, "accruesArrears") ||
    !r.field(row, "salesReceipt") ||
    r.field(row, "salesReceiptBudget") ||
    r.field(row, "recipientIncome") ||
    r.field(row, "externalInflow") ||
    r.field(row, "interestFacilityId") ||
    r.field(r.field(row, "source"), "tag") !== "ESTIMATED" ||
    originalSource.tag !== "ESTIMATED" ||
    !originalSource.estimatedFrom?.trim() ||
    openingIds.some((id) => !id.trim()) ||
    new Set(openingIds).size !== openingIds.length ||
    !previousNominal ||
    makeIsoDate(previousNominal) < firstNominal ||
    firstNominal !== r.field(row, "firstDueAt") ||
    r.field(row, "billingDay") !==
      new Date(`${firstNominal}T00:00:00.000Z`).getUTCDate() ||
    makeIsoDate(previousNominal) > m.field(row, "dueAt") ||
    nominal <= previousNominal ||
    following <= nominal
  )
    throw new Error(
      "Purchase renewal requires the actual generated household marker and separate nominal cadence.",
    );
  stopgap(gap);
  const home = r.mapGet(r.field(session.core, "households"), homeId);
  if (!home || r.field(home, "id") !== homeId)
    throw new Error("Purchase renewal household is missing.");
  const memberIds = r.array(r.field(home, "memberIds"), zero, one);
  if (new Set(memberIds).size !== memberIds.length)
    throw new Error("Purchase renewal household members repeat.");
  type Reference = HouseholdPurchaseCalendarBasis["references"][number];
  type Anchor = { date: string; references: readonly Reference[] };
  const wages: Anchor[] = [],
    incomes: Anchor[] = [];
  const day =
    session.parameter("hoursPerDay") * session.parameter("minutesPerHour");
  if (!Number.isSafeInteger(day) || day <= zero)
    throw new Error("Purchase renewal requires exact positive day units.");
  const work = r.field(session.core, "work"),
    commitments = r.field(work, "commitments"),
    commitmentIndex = r.field(work, "commitmentsByPerson"),
    incomeIndex = session.map("incomeContractsByPerson");
  const monthDate = (
    from: string,
    months: number,
    billingDay: number,
  ): string => {
    const date = new Date(`${makeIsoDate(from)}T00:00:00.000Z`),
      month = date.getUTCMonth() + months,
      last = new Date(
        Date.UTC(date.getUTCFullYear(), month + one, zero),
      ).getUTCDate();
    return makeIsoDate(
      new Date(
        Date.UTC(date.getUTCFullYear(), month, Math.min(billingDay, last)),
      )
        .toISOString()
        .split("T")[zero]!,
    );
  };
  const incomeDate = (
    from: string,
    period: number,
    billingDay: number,
  ): string => {
    const base = new Date(`${makeIsoDate(from)}T00:00:00.000Z`),
      target = new Date(`${nominal}T00:00:00.000Z`),
      months =
        (target.getUTCFullYear() - base.getUTCFullYear()) *
          session.parameter("monthsPerYear") +
        target.getUTCMonth() -
        base.getUTCMonth(),
      periods = Math.max(zero, Math.floor(months / period));
    const candidate = monthDate(from, periods * period, billingDay);
    return candidate >= nominal
      ? candidate
      : monthDate(from, (periods + one) * period, billingDay);
  };
  const policy = session.policy()!;
  for (const personId of memberIds) {
    const person = r.mapGet(r.field(session.core, "people"), personId);
    if (
      !person ||
      r.field(person, "id") !== personId ||
      r.field(person, "householdId") !== homeId
    )
      throw new Error(
        "Purchase renewal requires current actual household membership.",
      );
    const jobId = r.field(person, "jobId"),
      job = jobId ? r.mapGet(r.field(session.core, "jobs"), jobId) : undefined,
      indexed = r.mapGet(commitmentIndex, personId);
    if (
      jobId &&
      (!job ||
        r.field(job, "id") !== jobId ||
        r.field(job, "personId") !== personId)
    )
      throw new Error("Purchase renewal owned job identity is stale.");
    if (r.field(person, "alive")) {
      // Only this household member's retained current commitments/periods, never a world or history scan.
      const retainedTotals = new Map<
        string,
        {
          earned: bigint;
          paid: bigint;
          accrued: bigint;
          due: bigint;
          arrears: bigint;
        }
      >();
      for (const id of indexed ? r.members(indexed) : []) {
        const commitment = r.mapGet(commitments, id);
        if (
          !commitment ||
          r.field(commitment, "id") !== id ||
          r.field(commitment, "personId") !== personId
        )
          throw new Error(
            "Purchase renewal retained commitment index is stale.",
          );
        const ledger = r.mapGet(r.field(work, "payrollLedgerByCommitment"), id),
          indices = r.mapGet(
            r.field(work, "earnedPayPeriodByCommitmentIndex"),
            id,
          );
        // Snapshot only the bounded current index, as the original payroll owning path does.
        if (indices) r.payload(indices, zero, one);
        if (!ledger) {
          const latest = r.mapGet(
            r.field(work, "lastAttendanceByJob"),
            r.field(commitment, "jobId"),
          );
          if (
            (indices &&
              Map.prototype.entries.call(indices).next().done !== true) ||
            (latest && r.field(latest, "commitmentId") === id)
          )
            throw new Error(
              "Purchase renewal retained earned index or actual attendance lost its owning ledger.",
            );
          continue;
        }
        const retainedJobId = r.field(commitment, "jobId"),
          employerId = r.field(commitment, "organizationId"),
          retainedJob = r.mapGet(r.field(session.core, "jobs"), retainedJobId),
          employer = r.mapGet(
            r.field(session.core, "organizations"),
            employerId,
          ),
          calendarId = r.field(commitment, "payrollCalendarId"),
          calendar = calendarId
            ? r.mapGet(r.field(work, "payrollCalendars"), calendarId)
            : undefined;
        if (
          !retainedJob ||
          !employer ||
          !calendar ||
          r.field(retainedJob, "id") !== retainedJobId ||
          r.field(retainedJob, "personId") !== personId ||
          r.field(retainedJob, "organizationId") !== employerId ||
          r.field(employer, "id") !== employerId ||
          r.field(calendar, "id") !== calendarId ||
          r.field(calendar, "organizationId") !== employerId ||
          r.mapGet(r.field(work, "payrollCalendarByCommitment"), id) !==
            calendarId ||
          r.mapGet(r.field(work, "payrollCalendarByJob"), retainedJobId) !==
            calendarId ||
          !admittedWorkPayrollCalendarMatches(
            session.core,
            calendarId!,
            calendar,
          ) ||
          !r
            .array(r.field(calendar, "workCommitmentIds"), zero, one)
            .includes(id)
        )
          throw new Error(
            "Purchase renewal retained wage requires its genuinely admitted actual calendar ownership.",
          );
        const jobSource = copySource(r.field(retainedJob, "source")),
          paySource = copySource(r.field(commitment, "paySource")),
          scheduleSource = copySource(r.field(commitment, "scheduleSource")),
          calendarSource = copySource(r.field(calendar, "source")),
          basis: WorkPayrollBasis = {
            calendarId: calendarId!,
            commitmentId: id,
            jobId: retainedJobId,
            personId,
            organizationId: employerId,
            jobSource,
            paySource,
            scheduleSource,
          },
          units = {
            zero,
            one,
            monthsPerYear: session.parameter("monthsPerYear"),
          };
        copySource(r.field(employer, "source"));
        validateRetainedWorkPayrollObligation(
          r,
          calendar,
          basis,
          ledger,
          undefined,
          session.date,
          units,
        );
        const cohort = retainedTotals.get(retainedJobId) ?? {
          earned: BigInt(zero),
          paid: BigInt(zero),
          accrued: BigInt(zero),
          due: BigInt(zero),
          arrears: BigInt(zero),
        };
        cohort.earned += BigInt(r.field(ledger, "earnedMinor"));
        cohort.paid += BigInt(r.field(ledger, "paidMinor"));
        cohort.accrued += BigInt(r.field(ledger, "accruedMinor"));
        cohort.due += BigInt(r.field(ledger, "dueRecognizedMinor"));
        cohort.arrears += BigInt(r.field(ledger, "arrearsMinor"));
        retainedTotals.set(retainedJobId, cohort);
        const latestAt = r.field(ledger, "lastEarnedAt"),
          latestId = r.field(ledger, "lastWorkResultId"),
          actualAttendance = r.mapGet(
            r.field(work, "lastAttendanceByJob"),
            retainedJobId,
          );
        if (
          latestAt !== undefined &&
          (!actualAttendance ||
            r.field(actualAttendance, "id") !== latestId ||
            r.field(actualAttendance, "date") !== latestAt ||
            r.field(actualAttendance, "commitmentId") !== id ||
            r.field(actualAttendance, "jobId") !== retainedJobId ||
            r.field(actualAttendance, "personId") !== personId ||
            r.field(actualAttendance, "organizationId") !== employerId ||
            r.field(actualAttendance, "payrollCalendarId") !== calendarId)
        )
          throw new Error(
            "Purchase renewal retained earned ledger lost its actual latest owned attendance.",
          );
        if (actualAttendance) {
          const amount = r.field(actualAttendance, "earnedMinor");
          if (
            !Number.isSafeInteger(amount) ||
            amount < zero ||
            amount > r.field(ledger, "earnedMinor")
          )
            throw new Error(
              "Purchase renewal actual latest attendance exceeds its retained earned stock.",
            );
          copySource(
            r.field(actualAttendance, "source"),
            makeIsoDate(r.field(actualAttendance, "date")),
          );
        }
        const references: Reference[] = [
          { kind: "job", id: retainedJobId, source: jobSource },
          { kind: "commitment", id, source: scheduleSource, paySource },
          { kind: "payroll-calendar", id: calendarId!, source: calendarSource },
        ];
        let accrued = BigInt(zero);
        for (const [index, periodId] of indices
          ? (Map.prototype.entries.call(indices) as IterableIterator<
              [number, string]
            >)
          : []) {
          if (r.mapGet(indices!, index) !== periodId)
            throw new Error("Purchase renewal retained period index changed.");
          const period = r.mapGet(r.field(work, "earnedPayPeriods"), periodId);
          if (
            !period ||
            r.field(period, "id") !== periodId ||
            r.field(period, "index") !== index
          )
            throw new Error(
              "Purchase renewal retained period index is absent or foreign.",
            );
          validateRetainedWorkPayrollObligation(
            r,
            calendar,
            basis,
            ledger,
            period,
            session.date,
            units,
          );
          const due = makeIsoDate(r.field(period, "dueAt")),
            dueIds = r.mapGet(r.field(work, "payrollPeriodsByDue"), due),
            first = makeIsoDate(r.field(period, "firstEarnedAt")),
            last = makeIsoDate(r.field(period, "lastEarnedAt")),
            start = makeIsoDate(r.field(commitment, "startsAt")),
            end = r.field(commitment, "endsAt"),
            jobEnd = r.field(retainedJob, "endsAt"),
            amount = r.field(period, "earnedMinor");
          if (
            !dueIds ||
            !r.member(dueIds, periodId) ||
            first < start ||
            (end !== undefined && last > makeIsoDate(end)) ||
            (jobEnd !== undefined && last > makeIsoDate(jobEnd))
          )
            throw new Error(
              "Purchase renewal retained earning bounds or actual due membership changed.",
            );
          accrued += BigInt(amount);
          if (amount > zero && due >= nominal && due < following)
            wages.push({
              date: due,
              references: [
                ...references,
                {
                  kind: "earned-pay-period",
                  id: periodId,
                  source: copySource(r.field(period, "source"), last),
                },
              ],
            });
        }
        if (accrued !== BigInt(r.field(ledger, "accruedMinor")))
          throw new Error(
            "Purchase renewal retained open periods disagree with actual accrued wages.",
          );
        const arrears = r.field(ledger, "arrearsMinor"),
          priorId = r.field(ledger, "lastPayrollReceiptId");
        if (priorId !== undefined) {
          const canonical = r.mapGet(
              r.field(work, "payrollCashSources"),
              priorId,
            ),
            aggregate = canonical && r.field(canonical, "result"),
            lastSettledAt = r.field(ledger, "lastSettledAt"),
            latest = r.mapGet(
              r.field(work, "latestPayrollByJob"),
              retainedJobId,
            );
          if (
            !canonical ||
            !aggregate ||
            !latest ||
            lastSettledAt === undefined ||
            r.field(canonical, "id") !== priorId ||
            r.field(canonical, "date") !== lastSettledAt ||
            r.field(aggregate, "id") !== priorId ||
            r.field(aggregate, "date") !== lastSettledAt ||
            (r.field(canonical, "postedJournalSequence") === undefined &&
              r.field(canonical, "completedAt") === undefined)
          )
            throw new Error(
              "Purchase renewal retained arrears lost its actual completed payday Source.",
            );
          r.payload(aggregate, zero, one);
          const grouped = r.field(
            canonical as WorkPayrollCashSourceState,
            "group",
          );
          let receipt: WorkPayrollJobReceipt, after: WorkPayrollLedger;
          if (grouped === true) {
            const group = canonical as WorkPayrollGroupSourceState,
              result = r.field(group, "result"),
              states = r.array(r.field(group, "componentStates"), zero, one),
              components = r.array(r.field(result, "components"), zero, one);
            r.payload(states, zero, one);
            if (
              r.field(result, "group") !== true ||
              states.length <= one ||
              states.length !== components.length ||
              r.field(result, "calendarId") !== calendarId ||
              r.field(result, "personId") !== personId ||
              r.field(result, "organizationId") !== employerId
            )
              throw new Error(
                "Purchase renewal retained group has changed its actual aggregate ownership.",
              );
            const seenCommitments = new Set<string>(),
              seenJobs = new Set<string>();
            let selected: (typeof states)[number] | undefined;
            for (
              let position = zero;
              position < states.length;
              position += one
            ) {
              const state = states[position]!,
                component = r.field(state, "result"),
                componentId = r.field(component, "commitmentId"),
                componentJobId = r.field(component, "jobId");
              if (
                !componentId?.trim() ||
                !componentJobId?.trim() ||
                seenCommitments.has(componentId) ||
                seenJobs.has(componentJobId) ||
                components[position] !== component ||
                r.field(component, "id") !== priorId ||
                r.field(component, "groupReceiptId") !== priorId ||
                r.field(component, "date") !== lastSettledAt ||
                r.field(component, "calendarId") !== calendarId ||
                r.field(component, "personId") !== personId ||
                r.field(component, "organizationId") !== employerId
              )
                throw new Error(
                  "Purchase renewal retained group lost its unique actual component identities.",
                );
              seenCommitments.add(componentId);
              seenJobs.add(componentJobId);
              if (componentId === id) selected = state;
            }
            if (
              !selected ||
              r.field(r.field(selected, "result"), "jobId") !== retainedJobId
            )
              throw new Error(
                "Purchase renewal retained group lost its exact owned job component.",
              );
            receipt = r.field(selected, "result");
            after = r.field(selected, "ledgerAfter");
          } else {
            if (grouped !== undefined && grouped !== false)
              throw new Error(
                "Purchase renewal retained payday has an invalid owning shape.",
              );
            const single = canonical as SingleWorkPayrollCashSourceState;
            receipt = r.field(single, "result");
            after = r.field(single, "ledgerAfter");
          }
          if (
            !receipt ||
            !after ||
            receipt !== latest ||
            r.field(receipt, "id") !== priorId ||
            r.field(receipt, "date") !== lastSettledAt
          )
            throw new Error(
              "Purchase renewal retained payday lost its genuine latest job view.",
            );
          r.payload(after, zero, one);
          for (const key of [
            "calendarId",
            "commitmentId",
            "jobId",
            "personId",
            "organizationId",
            "dueRecognizedMinor",
            "paidMinor",
            "arrearsMinor",
            "lastSettledPeriodIndex",
            "lastSettledAt",
            "lastPayrollReceiptId",
          ] as const)
            if (r.field(after, key) !== r.field(ledger, key))
              throw new Error(
                "Purchase renewal retained stocks changed from actual payday recognition.",
              );
          for (const key of [
            "calendarId",
            "commitmentId",
            "jobId",
            "personId",
            "organizationId",
          ] as const)
            if (r.field(receipt, key) !== r.field(ledger, key))
              throw new Error(
                "Purchase renewal retained payday receipt has a foreign owner.",
              );
          // The component keeps its full Source; the owning reference ID names the canonical aggregate.
          copySource(r.field(receipt, "source"), makeIsoDate(lastSettledAt));
          const receiptSource = copySource(
            r.field(aggregate, "source"),
            makeIsoDate(lastSettledAt),
          );
          if (arrears > zero) {
            const retry = nextWorkPayrollPeriod(
                r,
                calendar,
                addDays(makeIsoDate(lastSettledAt), one),
                session.date,
                units,
              ),
              retryIds = r.mapGet(
                r.field(work, "payrollArrearsByDue"),
                makeIsoDate(retry.dueAt),
              );
            if (!retryIds || !r.member(retryIds, id))
              throw new Error(
                "Purchase renewal retained arrears lost its exact recorded retry index.",
              );
            if (retry.dueAt >= nominal && retry.dueAt < following)
              wages.push({
                date: retry.dueAt,
                references: [
                  ...references,
                  {
                    kind: "payroll-receipt",
                    id: priorId,
                    source: receiptSource,
                  },
                ],
              });
          }
        } else if (arrears > zero)
          throw new Error(
            "Purchase renewal cannot invent unrecognized wage debt.",
          );
      }
      for (const [retainedJobId, cohort] of retainedTotals) {
        const totals = r.mapGet(r.field(work, "totalsByJob"), retainedJobId);
        if (
          !totals ||
          !Number.isSafeInteger(r.field(totals, "requestedMinor")) ||
          !Number.isSafeInteger(r.field(totals, "paidMinor")) ||
          BigInt(r.field(totals, "requestedMinor")) !== cohort.earned ||
          BigInt(r.field(totals, "paidMinor")) !== cohort.paid
        )
          throw new Error(
            "Purchase renewal retained wages disagree with actual cumulative earned/paid work totals.",
          );
        for (const [key, value] of [
          ["earnedMinor", cohort.earned],
          ["accruedMinor", cohort.accrued],
          ["dueRecognizedMinor", cohort.due],
          ["arrearsMinor", cohort.arrears],
        ] as const) {
          const amount = r.field(totals, key);
          if (
            amount !== undefined &&
            (!Number.isSafeInteger(amount) || BigInt(amount) !== value)
          )
            throw new Error(
              "Purchase renewal retained stock fields disagree with actual work totals.",
            );
        }
      }
    }
    if (job && r.field(person, "alive")) {
      const employerId = r.field(job, "organizationId"),
        employer = r.mapGet(r.field(session.core, "organizations"), employerId);
      if (!employer || r.field(employer, "id") !== employerId)
        throw new Error("Purchase renewal actual employer is missing.");
      const jobSource = copySource(r.field(job, "source")),
        jobEnd = r.field(job, "endsAt");
      for (const id of indexed ? r.members(indexed) : []) {
        const commitment = r.mapGet(commitments, id);
        if (
          !commitment ||
          r.field(commitment, "id") !== id ||
          r.field(commitment, "personId") !== personId
        )
          throw new Error("Purchase renewal commitment index is stale.");
        if (r.field(commitment, "jobId") !== jobId) continue;
        if (r.field(commitment, "organizationId") !== employerId)
          throw new Error("Purchase renewal commitment employer is stale.");
        const start = makeIsoDate(r.field(commitment, "startsAt")),
          anchor = makeIsoDate(r.field(commitment, "anchorDate")),
          end = r.field(commitment, "endsAt"),
          period = r.field(commitment, "periodDays"),
          rate = r.field(commitment, "hourlyMinor"),
          expected = r.field(commitment, "expectedWeeklyMinutes"),
          slots = r.array(r.field(commitment, "slots"), zero, one),
          scheduleSource = copySource(r.field(commitment, "scheduleSource")),
          paySource = copySource(r.field(commitment, "paySource"));
        if (
          !Number.isSafeInteger(period) ||
          period <= zero ||
          !Number.isSafeInteger(rate) ||
          rate < zero ||
          !Number.isFinite(expected) ||
          expected <= zero ||
          !slots.length ||
          start < r.field(person, "birthDate") ||
          (end && makeIsoDate(end) < start)
        )
          throw new Error("Purchase renewal periodic work terms are invalid.");
        const calendarId = r.field(commitment, "payrollCalendarId"),
          calendars = r.field(work, "payrollCalendars"),
          binding = r.mapGet(r.field(work, "payrollCalendarByCommitment"), id),
          jobBinding = r.mapGet(r.field(work, "payrollCalendarByJob"), jobId!),
          calendar = calendarId ? r.mapGet(calendars, calendarId) : undefined;
        if (
          !calendar ||
          calendarId !== binding ||
          calendarId !== jobBinding ||
          r.field(calendar, "id") !== calendarId ||
          !admittedWorkPayrollCalendarMatches(
            session.core,
            calendarId!,
            calendar,
          ) ||
          r.field(calendar, "organizationId") !== employerId ||
          !r
            .array(r.field(calendar, "workCommitmentIds"), zero, one)
            .includes(id)
        )
          throw new Error(
            "Purchase renewal requires the owning admitted employer payday calendar.",
          );
        const calendarSource = copySource(r.field(calendar, "source")),
          units = {
            zero,
            one,
            monthsPerYear: session.parameter("monthsPerYear"),
          },
          firstAdvancedAt = addDays(
            makeIsoDate(r.field(session.core, "startedAt")),
            one,
          ),
          earningFrom = [
            firstAdvancedAt,
            makeIsoDate(r.field(calendar, "effectiveFrom")),
            makeIsoDate(r.field(calendar, "firstPeriodStartsAt")),
          ]
            .sort()
            .at(-one)!,
          earningUntil = r.field(calendar, "effectiveUntil"),
          spans: { start: number; minutes: number }[] = [],
          segments: { offset: number; notBefore: string }[] = [];
        // Validate every original slot and overlap before considering any payday.
        for (const slot of slots) {
          const offset = r.field(slot, "offsetDays"),
            minute = r.field(slot, "startMinute"),
            minutes = r.field(slot, "minutes");
          if (
            !Number.isSafeInteger(offset) ||
            offset < zero ||
            offset >= period ||
            !Number.isFinite(minute) ||
            minute < zero ||
            minute >= day ||
            !Number.isFinite(minutes) ||
            minutes <= zero ||
            minutes > day
          )
            throw new Error("Purchase renewal periodic work slot is invalid.");
          spans.push({ start: offset * day + minute, minutes });
          const same = Math.min(minutes, day - minute),
            overflow = minutes - same;
          for (const segment of [
            { offset, minutes: same },
            ...(overflow > zero
              ? [{ offset: offset + one, minutes: overflow }]
              : []),
          ]) {
            if (segment.minutes <= zero || rate <= zero) continue;
            segments.push({
              offset: segment.offset,
              notBefore: addDays(start, segment.offset - offset),
            });
          }
        }
        spans.sort((left, right) => left.start - right.start);
        for (const [position, span] of spans.entries())
          if (
            span.start + span.minutes >
            (spans[position + one]?.start ?? spans[zero]!.start + period * day)
          )
            throw new Error("Purchase renewal work slots overlap.");
        let payPeriod = nextWorkPayrollPeriod(
          r,
          calendar,
          nominal,
          session.date,
          units,
        );
        // Only this cadence window is searched; no yearly attendance/invoice rows are created.
        while (payPeriod.dueAt < following) {
          let earliest: string | undefined;
          for (const segment of segments) {
            const from = [payPeriod.fromAt, earningFrom, segment.notBefore]
                .sort()
                .at(-one)!,
              residue =
                ((daysBetween(anchor, makeIsoDate(from)) % period) + period) %
                period,
              delay = ((segment.offset % period) - residue + period) % period,
              date = addDays(makeIsoDate(from), delay);
            if (
              date <= payPeriod.throughAt &&
              (!earningUntil || date < makeIsoDate(earningUntil)) &&
              (!end || date <= makeIsoDate(end)) &&
              (!jobEnd || date < makeIsoDate(jobEnd)) &&
              (!earliest || date < earliest)
            )
              earliest = date;
          }
          if (earliest) {
            wages.push({
              date: payPeriod.dueAt,
              references: [
                { kind: "job", id: jobId!, source: jobSource },
                { kind: "commitment", id, source: scheduleSource, paySource },
                {
                  kind: "payroll-calendar",
                  id: calendarId!,
                  source: calendarSource,
                },
              ],
            });
            break;
          }
          const next = workPayPeriodAtIndex(
            r,
            calendar,
            payPeriod.index + one,
            session.date,
            units,
          );
          if (next.dueAt <= payPeriod.dueAt)
            throw new Error(
              "Recorded payday periods must advance within the purchase cadence window.",
            );
          payPeriod = next;
        }
      }
    }
    const incomeIds = r.mapGet(incomeIndex, personId);
    for (const id of incomeIds ? r.members(incomeIds) : []) {
      const income = m.mapGet(session.map("contracts"), id),
        term = income && r.field(income, "recipientIncome");
      if (
        !income ||
        r.field(income, "id") !== id ||
        !term ||
        r.field(term, "personId") !== personId ||
        r.field(term, "householdId") !== homeId
      )
        throw new Error("Purchase renewal income index is stale.");
      if (r.field(income, "endedAt")) continue;
      const kind = r.field(term, "kindId"),
        awardId = r.field(term, "sourceFactId"),
        rules = r.array(r.field(policy, "recipientIncomeKinds"), zero, one),
        rule = rules.find((value) => r.field(value, "id") === kind),
        facts = r.field(person, "pastFacts"),
        award = facts
          ? r
              .array(facts, zero, one)
              .find((value) => r.field(value, "id") === awardId)
          : undefined,
        values = award && r.field(award, "facts"),
        payers = r.array(r.field(income, "payerIds"), zero, one),
        amount = r.field(income, "amountMinor"),
        period = r.field(income, "periodMonths"),
        end = r.field(income, "endsAt");
      if (
        !rule ||
        !award ||
        !values ||
        !r
          .array(r.field(rule, "sourceKinds"), zero, one)
          .includes(r.field(award, "kind")) ||
        makeIsoDate(r.field(award, "date")) > session.date ||
        r.field(values, "status") !== r.field(rule, "status") ||
        r.field(income, "kind") !== r.field(rule, "contractKind") ||
        r.field(income, "payeeId") !== personId ||
        r.field(income, "householdId") ||
        r.field(income, "salesReceipt") ||
        r.field(income, "salesReceiptBudget") ||
        r.field(income, "marketAdjusted") ||
        r.field(income, "accruesArrears") ||
        r.field(income, "creditFacilityId") ||
        r.field(income, "interestFacilityId") ||
        period !== one ||
        !Number.isSafeInteger(amount) ||
        amount < zero ||
        payers.length !== one ||
        payers[zero] === personId ||
        r.field(values, "payerId") !== payers[zero] ||
        Number(r.field(values, "monthlyMinor")) !== amount ||
        (r.field(values, "kindId") && r.field(values, "kindId") !== kind) ||
        (r.field(values, "householdId") &&
          r.field(values, "householdId") !== homeId)
      )
        throw new Error(
          "Purchase renewal requires the actual qualified recipient-income award and compatible terms.",
        );
      const payer =
        r.mapGet(r.field(session.core, "organizations"), payers[zero]!) ??
        r.mapGet(r.field(session.core, "people"), payers[zero]!);
      if (!payer) throw new Error("Purchase renewal income payer is missing.");
      copySource(r.field(payer, "source"));
      const qualification = r.field(rule, "qualifyingFactsBySourceKind"),
        required =
          qualification && r.field(qualification, r.field(award, "kind"));
      for (const key of required ? r.keys(required) : []) {
        if (
          typeof key !== "string" ||
          r.field(values, key) !== r.field(required!, key)
        )
          throw new Error("Purchase renewal award qualifications changed.");
      }
      const termSource = copySource(r.field(income, "source")),
        awardSource = copySource(
          r.field(award, "source"),
          makeIsoDate(r.field(award, "date")),
        ),
        billingDay = r.field(income, "billingDay");
      if (
        billingDay !==
        new Date(
          `${makeIsoDate(r.field(income, "firstDueAt"))}T00:00:00.000Z`,
        ).getUTCDate()
      )
        throw new Error(
          "Purchase renewal income billing day contradicts its admitted calendar.",
        );
      const date = incomeDate(m.field(income, "dueAt"), period, billingDay);
      if (
        amount > zero &&
        date < following &&
        (!end || date < makeIsoDate(end))
      )
        incomes.push({
          date,
          references: [
            { kind: "income-contract", id, source: termSource },
            { kind: "income-award", id: awardId, source: awardSource },
          ],
        });
    }
  }
  // Prioritize this household's owned wage calendar; no-wage periods use actual income terms.
  const anchors = wages.length ? wages : incomes,
    selected = [...anchors].sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.references
          .map((ref) => ref.id)
          .join()
          .localeCompare(right.references.map((ref) => ref.id).join()),
    )[zero],
    mode = selected
      ? wages.length
        ? "work"
        : "recipient-income"
      : "missing-income",
    effectiveDueAt = selected?.date ?? nominal;
  return {
    nominalDueAt: nominal,
    effectiveDueAt,
    mode,
    references: selected?.references ?? [],
    source: {
      ...originalSource,
      tag: "ESTIMATED",
      asOf: session.date,
      estimatedFrom: `${originalSource.estimatedFrom} Renewal rule ${selectedRule}; household ${homeId}; nominal ${nominal}, following nominal ${following}, effective ${effectiveDueAt}, mode ${mode}. Relevant current record IDs: ${selected?.references.map((ref) => ref.id).join(", ") || "none in this cadence window"}. ${selected ? "An owned recorded payday or qualified income calendar opportunity predicts neither attendance nor payment." : "No eligible positive income opportunity exists in [nominal, following nominal); retain nominal with an explicit missing-income basis, not an invented job, award or paycheck."} This estimated bounded phase preserves the original amount and monthly cadence without weekend/short-month drift. ${gap}`,
    },
  };
}

/** Guard and detach the bounded current basis before putting it in a completed receipt. */
export function currentHouseholdPurchaseCalendarBasis(
  session: FinancePlanningSession,
  row: FinanceContractState,
): HouseholdPurchaseCalendarBasis | undefined {
  const r = session.reads,
    m = session.metadata,
    basis = m.field(row, "householdPurchaseCalendarBasis");
  if (!r.field(row, "householdPurchaseCalendar")) return undefined;
  if (!basis)
    throw new Error(
      "Generated household purchase lacks its admitted current calendar basis.",
    );
  r.keys(basis);
  const nominalDueAt = makeIsoDate(r.field(basis, "nominalDueAt")),
    effectiveDueAt = makeIsoDate(r.field(basis, "effectiveDueAt")),
    mode = r.field(basis, "mode");
  if (
    nominalDueAt !== m.field(row, "nominalDueAt") ||
    effectiveDueAt !== m.field(row, "dueAt") ||
    !["opening", "work", "recipient-income", "missing-income"].includes(mode)
  )
    throw new Error(
      "Current household calendar basis contradicts actual nominal/effective dates.",
    );
  const source = (value: Source): Source =>
    copyPurchaseCalendarSource(
      r,
      value,
      makeIsoDate(session.date),
      session.zero,
      session.one,
    );
  const basisSource = source(r.field(basis, "source"));
  if (basisSource.tag !== "ESTIMATED" || !basisSource.estimatedFrom?.trim())
    throw new Error(
      "The recurring purchase phase remains an explicit estimate.",
    );
  return {
    nominalDueAt,
    effectiveDueAt,
    mode,
    references: r
      .array(r.field(basis, "references"), session.zero, session.one)
      .map((ref) => {
        r.keys(ref);
        const id = r.field(ref, "id"),
          kind = r.field(ref, "kind"),
          paySource = r.field(ref, "paySource");
        if (
          !id.trim() ||
          ![
            "opening-basis",
            "job",
            "commitment",
            "payroll-calendar",
            "earned-pay-period",
            "payroll-receipt",
            "income-contract",
            "income-award",
          ].includes(kind)
        )
          throw new Error("Current household calendar reference is invalid.");
        return {
          id,
          kind,
          source: source(r.field(ref, "source")),
          ...(paySource ? { paySource: source(paySource) } : {}),
        };
      }),
    source: basisSource,
  };
}
