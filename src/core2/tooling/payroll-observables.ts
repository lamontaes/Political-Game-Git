/** Read current earned/due/pay/arrears stocks. This query creates no facts or cash. */
import type {
  SingleWorkPayrollCashSourceState,
  WorkPayrollGroupSourceState,
  WorkPayrollJobReceipt,
} from "../work-payroll-cash";
import { parameter } from "../parameters";
import type { CoreState } from "../types";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { FinanceReadGuard } from "../finance-plan";
import { admittedWorkPayrollCalendarMatches } from "../work-attendance";
import {
  nextWorkPayrollPeriod,
  workPayPeriodAtIndex,
  workPayPeriodOnDate,
} from "../work-pay-period";
import type {
  WorkPayrollCalendarInput,
  WorkPayrollLedger,
} from "../work-pay-period";

export function payrollStockObservables(core: Readonly<CoreState>) {
  const zero = parameter("zero", core.data.parameters),
    one = parameter("one", core.data.parameters),
    units = {
      zero,
      one,
      monthsPerYear: parameter("monthsPerYear", core.data.parameters),
    },
    reads = new FinanceReadGuard(),
    work = reads.field(core, "work"),
    at = makeIsoDate(reads.field(core, "date"));
  const minor = (value: number, name: string): number => {
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(`Payroll observer has invalid minor units: ${name}`);
    return value;
  };
  const sum = (left: number, right: number, name: string) =>
    minor(Number(BigInt(minor(left, name)) + BigInt(minor(right, name))), name);
  const minutes = (value: number): number => {
    if (!Number.isFinite(value) || value < zero)
      throw new Error("Payroll observer has invalid recorded minutes.");
    return value;
  };
  const calendarByCommitment = new Map<string, WorkPayrollCalendarInput>();
  const owningCalendar = (
    ledger: WorkPayrollLedger,
  ): WorkPayrollCalendarInput => {
    const id = reads.field(ledger, "commitmentId"),
      cached = calendarByCommitment.get(id);
    if (cached) return cached;
    const calendarId = reads.field(ledger, "calendarId"),
      jobId = reads.field(ledger, "jobId"),
      personId = reads.field(ledger, "personId"),
      organizationId = reads.field(ledger, "organizationId"),
      commitment = reads.mapGet(reads.field(work, "commitments"), id),
      job = reads.mapGet(reads.field(core, "jobs"), jobId),
      person = reads.mapGet(reads.field(core, "people"), personId),
      employer = reads.mapGet(
        reads.field(core, "organizations"),
        organizationId,
      ),
      calendar = reads.mapGet(
        reads.field(work, "payrollCalendars"),
        calendarId,
      );
    if (
      !commitment ||
      !job ||
      !person ||
      !employer ||
      !calendar ||
      reads.field(commitment, "id") !== id ||
      reads.field(commitment, "jobId") !== jobId ||
      reads.field(commitment, "personId") !== personId ||
      reads.field(commitment, "organizationId") !== organizationId ||
      reads.field(commitment, "payrollCalendarId") !== calendarId ||
      reads.field(job, "id") !== jobId ||
      reads.field(job, "personId") !== personId ||
      reads.field(job, "organizationId") !== organizationId ||
      reads.field(person, "id") !== personId ||
      reads.field(employer, "id") !== organizationId ||
      reads.field(calendar, "id") !== calendarId ||
      reads.field(calendar, "organizationId") !== organizationId ||
      reads.mapGet(reads.field(work, "payrollCalendarByCommitment"), id) !==
        calendarId ||
      reads.mapGet(reads.field(work, "payrollCalendarByJob"), jobId) !==
        calendarId ||
      !admittedWorkPayrollCalendarMatches(core, calendarId, calendar) ||
      !reads
        .array(reads.field(calendar, "workCommitmentIds"), zero, one)
        .includes(id)
    )
      throw new Error(
        "Payroll observer lost its actual admitted retained calendar ownership.",
      );
    calendarByCommitment.set(id, calendar);
    return calendar;
  };
  // Enrollment and actual attendance never become old per-shift cash when stocks are lost.
  const enrolledJobs = new Set<string>();
  for (const [jobId] of work.payrollCalendarByJob) enrolledJobs.add(jobId);
  for (const [id, commitment] of work.commitments)
    if (
      reads.field(commitment, "payrollCalendarId") !== undefined ||
      reads.mapGet(reads.field(work, "payrollCalendarByCommitment"), id) !==
        undefined
    )
      enrolledJobs.add(reads.field(commitment, "jobId"));
  for (const [jobId] of work.lastAttendanceByJob) enrolledJobs.add(jobId);
  const retryByCommitment = new Map<string, string>();
  const byJob = new Map<
    string,
    {
      earnedMinor: number;
      dueRecognizedMinor: number;
      paidMinor: number;
      accruedMinor: number;
      arrearsMinor: number;
    }
  >();
  const accruedByCommitment = new Map<string, number>();
  for (const [id, period] of core.work.earnedPayPeriods) {
    const ledger = core.work.payrollLedgerByCommitment.get(period.commitmentId);
    if (
      !ledger ||
      id !== period.id ||
      period.jobId !== ledger.jobId ||
      period.calendarId !== ledger.calendarId ||
      period.personId !== ledger.personId ||
      period.organizationId !== ledger.organizationId ||
      core.work.earnedPayPeriodByCommitmentIndex
        .get(period.commitmentId)
        ?.get(period.index) !== id ||
      !core.work.payrollPeriodsByDue.get(period.dueAt)?.has(id) ||
      !Number.isSafeInteger(period.index) ||
      period.index < zero ||
      !Number.isSafeInteger(period.segmentCount) ||
      period.segmentCount <= zero ||
      makeIsoDate(period.fromAt) > makeIsoDate(period.firstEarnedAt) ||
      makeIsoDate(period.firstEarnedAt) > makeIsoDate(period.lastEarnedAt) ||
      makeIsoDate(period.lastEarnedAt) > makeIsoDate(period.throughAt) ||
      makeIsoDate(period.lastEarnedAt) > makeIsoDate(core.date) ||
      makeIsoDate(period.dueAt) < makeIsoDate(period.throughAt) ||
      !period.source ||
      !["SOURCED", "ESTIMATED"].includes(period.source.tag) ||
      !period.source.citation?.trim() ||
      makeIsoDate(period.source.asOf) > makeIsoDate(period.lastEarnedAt) ||
      minutes(period.attendedMinutes) > minutes(period.plannedMinutes)
    )
      throw new Error(
        "Payroll observer lost the actual open earned period, dates or owning indexes.",
      );
    const calendar = owningCalendar(ledger),
      expected = workPayPeriodAtIndex(reads, calendar, period.index, at, units),
      first = workPayPeriodOnDate(reads, calendar, period.firstEarnedAt, units),
      last = workPayPeriodOnDate(reads, calendar, period.lastEarnedAt, units);
    if (
      period.fromAt !== expected.fromAt ||
      period.throughAt !== expected.throughAt ||
      period.dueAt !== expected.dueAt ||
      first.index !== expected.index ||
      last.index !== expected.index
    )
      throw new Error(
        "Payroll observer open earned dates differ from the actual recorded payday period.",
      );
    accruedByCommitment.set(
      period.commitmentId,
      sum(
        accruedByCommitment.get(period.commitmentId) ?? zero,
        period.earnedMinor,
        "open earned periods",
      ),
    );
  }
  for (const [commitmentId, indices] of core.work
    .earnedPayPeriodByCommitmentIndex) {
    for (const [index, id] of indices) {
      const period = core.work.earnedPayPeriods.get(id);
      if (
        !period ||
        period.commitmentId !== commitmentId ||
        period.index !== index
      )
        throw new Error(
          "Payroll observer has a spent or foreign open-period index.",
        );
    }
  }
  for (const [dueAt, ids] of core.work.payrollPeriodsByDue) {
    for (const id of ids) {
      if (core.work.earnedPayPeriods.get(id)?.dueAt !== dueAt)
        throw new Error(
          "Payroll observer has a spent or foreign payday index.",
        );
    }
  }
  for (const [id, ledger] of core.work.payrollLedgerByCommitment) {
    const commitment = core.work.commitments.get(id),
      job = core.jobs.get(ledger.jobId),
      calendar = owningCalendar(ledger);
    if (
      id !== ledger.commitmentId ||
      !commitment ||
      !job ||
      !calendar ||
      commitment.jobId !== ledger.jobId ||
      commitment.personId !== ledger.personId ||
      commitment.organizationId !== ledger.organizationId ||
      job.personId !== ledger.personId ||
      job.organizationId !== ledger.organizationId ||
      calendar.organizationId !== ledger.organizationId ||
      commitment.payrollCalendarId !== ledger.calendarId ||
      core.work.payrollCalendarByCommitment.get(id) !== ledger.calendarId
    )
      throw new Error(
        "Payroll observer lost the retained actual worker/job/calendar ownership.",
      );
    const row = {
      earnedMinor: minor(ledger.earnedMinor, "earned"),
      dueRecognizedMinor: minor(ledger.dueRecognizedMinor, "due recognized"),
      paidMinor: minor(ledger.paidMinor, "paid"),
      accruedMinor: minor(ledger.accruedMinor, "accrued"),
      arrearsMinor: minor(ledger.arrearsMinor, "arrears"),
    };
    const lastIndex = reads.field(ledger, "lastSettledPeriodIndex"),
      lastAt = reads.field(ledger, "lastSettledAt"),
      receiptId = reads.field(ledger, "lastPayrollReceiptId"),
      settled = [lastIndex, lastAt, receiptId].some(
        (value) => value !== undefined,
      );
    if (settled) {
      if (
        !Number.isSafeInteger(lastIndex) ||
        lastIndex! < zero ||
        lastAt === undefined ||
        typeof receiptId !== "string" ||
        !receiptId.trim() ||
        makeIsoDate(lastAt) > at ||
        workPayPeriodAtIndex(reads, calendar, lastIndex!, at, units).dueAt !==
          lastAt
      )
        throw new Error(
          "Payroll observer has an incomplete or noncalendar actual settlement marker.",
        );
      const canonical = reads.mapGet(
        reads.field(work, "payrollCashSources"),
        receiptId,
      );
      let receipt: WorkPayrollJobReceipt | undefined,
        after: WorkPayrollLedger | undefined;
      if (canonical && reads.field(canonical, "group") === true) {
        const group = canonical as WorkPayrollGroupSourceState,
          aggregate = reads.field(group, "result"),
          states = reads.array(
            reads.field(group, "componentStates"),
            zero,
            one,
          ),
          matching = states.filter(
            (state) =>
              reads.field(reads.field(state, "result"), "commitmentId") === id,
          );
        reads.payload(aggregate, zero, one);
        reads.payload(states, zero, one);
        if (
          reads.field(aggregate, "group") !== true ||
          reads.field(aggregate, "id") !== receiptId ||
          reads.field(aggregate, "date") !== lastAt ||
          reads.field(aggregate, "calendarId") !== ledger.calendarId ||
          reads.field(aggregate, "personId") !== ledger.personId ||
          reads.field(aggregate, "organizationId") !== ledger.organizationId ||
          matching.length !== one
        )
          throw new Error(
            "Payroll observer group lost its exact actual owning component.",
          );
        const state = matching[zero]!;
        receipt = reads.field(state, "result");
        after = reads.field(state, "ledgerAfter");
        const views = reads
          .array(reads.field(aggregate, "components"), zero, one)
          .filter((view) => reads.field(view, "commitmentId") === id);
        if (
          views.length !== one ||
          views[zero] !== receipt ||
          reads.field(receipt, "groupReceiptId") !== receiptId ||
          reads.mapGet(
            reads.field(work, "latestPayrollByJob"),
            ledger.jobId,
          ) !== receipt
        )
          throw new Error(
            "Payroll observer group differs from its actual latest job view.",
          );
      } else if (canonical) {
        const single = canonical as SingleWorkPayrollCashSourceState;
        receipt = reads.field(single, "result");
        after = reads.field(single, "ledgerAfter");
      }
      if (
        !canonical ||
        !receipt ||
        !after ||
        reads.field(canonical, "id") !== receiptId ||
        reads.field(canonical, "date") !== lastAt ||
        reads.field(receipt, "id") !== receiptId ||
        reads.field(receipt, "date") !== lastAt ||
        (reads.field(canonical, "postedJournalSequence") === undefined &&
          reads.field(canonical, "completedAt") === undefined)
      )
        throw new Error(
          "Payroll observer lost its genuine completed actual payday source.",
        );
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
        if (reads.field(after, key) !== reads.field(ledger, key))
          throw new Error(
            "Payroll observer current stocks differ from the retained completed payday source.",
          );
      for (const key of [
        "calendarId",
        "commitmentId",
        "jobId",
        "personId",
        "organizationId",
      ] as const)
        if (reads.field(receipt, key) !== reads.field(ledger, key))
          throw new Error(
            "Payroll observer completed payday has a foreign owner.",
          );
    }
    if (row.arrearsMinor > zero) {
      if (!settled || lastAt === undefined)
        throw new Error(
          "Payroll observer arrears have no genuine dated recognition.",
        );
      const retry = nextWorkPayrollPeriod(
          reads,
          calendar,
          addDays(makeIsoDate(lastAt), one),
          at,
          units,
        ),
        members = reads.mapGet(
          reads.field(work, "payrollArrearsByDue"),
          retry.dueAt,
        );
      if (!members || !reads.member(members, id))
        throw new Error(
          "Payroll observer lost the actual recorded arrears retry payday index.",
        );
      retryByCommitment.set(id, retry.dueAt);
    }
    if (
      row.earnedMinor !==
        sum(row.dueRecognizedMinor, row.accruedMinor, "earned identity") ||
      row.dueRecognizedMinor !==
        sum(row.paidMinor, row.arrearsMinor, "due identity") ||
      row.accruedMinor !== (accruedByCommitment.get(id) ?? zero)
    )
      throw new Error(
        "Payroll observer does not conserve earned, due, paid, accrued and arrears.",
      );
    const prior = byJob.get(ledger.jobId);
    if (prior) {
      for (const key of Object.keys(row) as (keyof typeof row)[])
        prior[key] = sum(prior[key], row[key], key);
    } else byJob.set(ledger.jobId, row);
  }
  for (const [dueAt, ids] of reads.field(work, "payrollArrearsByDue"))
    for (const id of reads.members(ids))
      if (retryByCommitment.get(id) !== dueAt)
        throw new Error(
          "Payroll observer has a spent, foreign or shifted arrears retry index.",
        );
  const result = {
    earnedMinor: zero,
    dueRecognizedMinor: zero,
    paidMinor: zero,
    accruedMinor: zero,
    arrearsMinor: zero,
    legacyUnpaidMinor: zero,
    retainedPayrollLedgers: core.work.payrollLedgerByCommitment.size,
  };
  for (const [jobId, total] of core.work.totalsByJob) {
    const earned = minor(total.requestedMinor, "dated earned total"),
      paid = minor(total.paidMinor, "dated paid total"),
      row = byJob.get(jobId);
    if (
      !row &&
      (enrolledJobs.has(jobId) ||
        total.earnedMinor !== undefined ||
        total.accruedMinor !== undefined ||
        total.dueRecognizedMinor !== undefined ||
        total.arrearsMinor !== undefined)
    )
      throw new Error(
        "Payroll observer lost an enrolled actual earned ledger; legacy cash fallback is unavailable.",
      );
    if (
      paid > earned ||
      (row && (row.earnedMinor !== earned || row.paidMinor !== paid))
    )
      throw new Error(
        "Payroll stocks disagree with cumulative actual dated work totals.",
      );
    result.earnedMinor = sum(result.earnedMinor, earned, "all earned");
    result.paidMinor = sum(result.paidMinor, paid, "all paid");
    result.dueRecognizedMinor = sum(
      result.dueRecognizedMinor,
      row?.dueRecognizedMinor ?? earned,
      "all due",
    );
    result.accruedMinor = sum(
      result.accruedMinor,
      row?.accruedMinor ?? zero,
      "all accrued",
    );
    result.arrearsMinor = sum(
      result.arrearsMinor,
      row?.arrearsMinor ?? earned - paid,
      "all arrears",
    );
    if (!row)
      result.legacyUnpaidMinor = sum(
        result.legacyUnpaidMinor,
        earned - paid,
        "legacy unpaid",
      );
    byJob.delete(jobId);
  }
  if (
    byJob.size ||
    result.earnedMinor !==
      sum(
        result.dueRecognizedMinor,
        result.accruedMinor,
        "all earned identity",
      ) ||
    result.dueRecognizedMinor !==
      sum(result.paidMinor, result.arrearsMinor, "all due identity")
  )
    throw new Error(
      "Payroll observer has an uncounted or incoherent cumulative obligation.",
    );
  reads.verify();
  return result;
}
