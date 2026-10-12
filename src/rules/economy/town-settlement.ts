/** Complete retained catch-up/pay-period/work/earned/absence/leave/gross/cash-order settlement requests. No World writer. */
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import { money } from "./cost-money";
import {
  growingIndex,
  recordById,
  recordsWithFieldValue,
  type GrowingIndexKind,
} from "./raw-record-index";
import { resourceFlowTermsAt } from "./credential-pay";
import { payPeriodEndingOn } from "./payday-and-shift";
import {
  completedPayShift,
  type PayLawFacts,
  payLawSourceKey,
} from "./law-pay-effects";
import { createDatedCashPaymentReader } from "./dated-cash";
import {
  paidLeaveBenefitFromFacts,
  paidLeaveCoveredDaysFromFacts,
} from "../laws/paid-leave";
import type {
  PaidLeaveClaim,
  paidLeaveBenefitRate as nativeRate,
  payPaidLeaveClaims,
} from "../../simulation/paid-leave-benefits";
import type { WorkAbsence } from "../../simulation/crisis/epidemic";
import type { applyLawConsequences } from "../../simulation/enacted-law-effects";
import type { ensureLifePathPersonalPosition } from "../../simulation/life-paths2-resources";
import type {
  recordResourceTransferOutcomes,
  RecordResourceTransferOutcomeInput,
} from "../../simulation/resources";
import type {
  assessPaychecksTaxes,
  residenceStateKey as nativeState,
} from "../../simulation/statutory-tax";
import type { recordLocalPayrollTaxBases } from "../../simulation/payroll-tax-bases";
import type { recordPaycheckTaxBases } from "../../simulation/paycheck-tax-bases";
import type {
  EntityId,
  MoneyAmount,
  IsoDate,
  ResourceFlow,
  ResourceFlowTermsRecord,
  EarnedLawPayAssessmentRecord,
} from "../../simulation/types";
// STOPGAP: economy.town-tax-benefit-common-dispatch
export interface TownSettlementFacts extends PayLawFacts {
  readonly absences: ReadonlyMap<string, ReadonlyMap<EntityId, WorkAbsence>>;
  readonly residenceStates: ReadonlyMap<
    EntityId,
    ReturnType<typeof nativeState>
  >;
  readonly leaveRates: ReadonlyMap<string, ReturnType<typeof nativeRate>>;
}
export type TownSettlementRequest =
  | {
      readonly kind: "applyLawConsequences";
      readonly input: Parameters<typeof applyLawConsequences>[1];
    }
  | {
      readonly kind: "ensureLifePathPersonalPosition";
      readonly input: readonly [
        EntityId,
        Parameters<typeof ensureLifePathPersonalPosition>[2],
      ];
    }
  | {
      readonly kind: "recordResourceTransferOutcomes";
      readonly input: Parameters<typeof recordResourceTransferOutcomes>[1];
    }
  | {
      readonly kind: "assessPaychecksTaxes";
      readonly input: Parameters<typeof assessPaychecksTaxes>[1];
    }
  | {
      readonly kind: "recordLocalPayrollTaxBases";
      readonly input: Parameters<typeof recordLocalPayrollTaxBases>[1];
    }
  | {
      readonly kind: "recordPaycheckTaxBases";
      readonly input: Parameters<typeof recordPaycheckTaxBases>[1];
    }
  | {
      readonly kind: "payPaidLeaveClaims";
      readonly input: Parameters<typeof payPaidLeaveClaims>[1];
    };
export const townSettlementSourceKey = (...keys: unknown[]) =>
  JSON.stringify(keys);
function hasStableKey(rows: readonly { stableKey: string }[], key: string) {
  return rows.some((r) => r.stableKey === key);
}
function workStatusAt(
  facts: TownSettlementFacts,
  id: EntityId,
  cutoff: { asOfDate: IsoDate; historySequenceExclusive: number },
) {
  const row = facts.life.get(payLawSourceKey(id, cutoff));
  if (!row) throw Error("Missing raw dated payroll life receipt");
  return row.status;
}
function currentLifeCutoff(facts: TownSettlementFacts) {
  return {
    asOfDate: facts.currentDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
function payPayerAt(
  facts: TownSettlementFacts,
  id: EntityId,
  cutoff: Parameters<typeof workStatusAt>[2],
) {
  const key = JSON.stringify([id, cutoff]);
  if (!facts.payers.has(key)) throw Error("Missing raw payroll payer");
  return facts.payers.get(key)!;
}
function epidemicWorkAbsences(
  facts: TownSettlementFacts,
  from: IsoDate,
  to: IsoDate,
) {
  const key = townSettlementSourceKey(from, to);
  if (!facts.absences.has(key))
    throw Error("Missing raw illness/care absence source");
  return facts.absences.get(key)!;
}
function jobPaysSickLeave(facts: TownSettlementFacts, id: EntityId) {
  const row = facts.life.get(payLawSourceKey(id, currentLifeCutoff(facts)));
  if (!row) throw Error("Missing raw sick-leave role");
  const role = row.role;
  if (!role) return false;
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2 >= 30;
}
function workdaysBetween(from: IsoDate, to: IsoDate) {
  let count = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = new Date(day + "T00:00:00Z").getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}
function paidLeaveCoveredDays(absence: WorkAbsence, unpaid: number) {
  return paidLeaveCoveredDaysFromFacts(absence, unpaid, 7);
}
// STOPGAP: economy.town-absence-leave-policy
function paidLeaveBenefitMinor(
  rate: PaidLeaveClaim["rate"],
  gross: number,
  days: number,
  covered: number,
) {
  return paidLeaveBenefitFromFacts(rate, gross, days, covered);
}
function residenceStateKey(facts: TownSettlementFacts, id: EntityId) {
  if (!facts.residenceStates.has(id))
    throw Error("Missing raw payroll residence");
  return facts.residenceStates.get(id)!;
}
function paidLeaveBenefitRate(
  facts: TownSettlementFacts,
  state: string,
  onDate: IsoDate,
) {
  const key = townSettlementSourceKey(state, onDate);
  if (!facts.leaveRates.has(key))
    throw Error("Missing separately owned legal benefit source");
  return facts.leaveRates.get(key)!;
}
export const TOWN_PAY_VERSION = "town-pay-v2";
const PAY_KEY_PREFIX = `${TOWN_PAY_VERSION}:job-pay:`;
const CATCH_UP_LIMIT_DAYS = 400;
export type TownPayPeriod = "weekly" | "biweekly" | "semimonthly" | "monthly";
function statusOn(facts: TownSettlementFacts, workId: EntityId, date: IsoDate) {
  return workStatusAt(facts, workId, {
    ...currentLifeCutoff(facts),
    asOfDate: date,
  });
}
function lastDayWorked(
  facts: TownSettlementFacts,
  workId: EntityId,
): IsoDate | null {
  const status = statusOn(facts, workId, facts.currentDate);
  if (!status || status.status === "active") return null;
  return addDays(status.effectiveAt, -1);
}
const DEATH_DATES: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (dates, record) => {
    const death =
      record as TownSettlementFacts["records"]["personDeaths"][number];
    dates.set(death.personId, death.diedAt);
  },
};
function deathDates(
  facts: TownSettlementFacts,
): ReadonlyMap<EntityId, IsoDate> {
  return growingIndex(DEATH_DATES, facts.records.personDeaths);
}
const PAY_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (flow.stableKey.startsWith(PAY_KEY_PREFIX)) flows.push(flow);
  },
};
function townPayFlows(facts: TownSettlementFacts): readonly ResourceFlow[] {
  return growingIndex(PAY_FLOWS, facts.records.resourceFlows);
}
// STOPGAP: economy.town-cash-pay-order
function termsByPayFlow(
  facts: TownSettlementFacts,
): ReadonlyMap<EntityId, readonly ResourceFlowTermsRecord[]> {
  const byFlow = new Map<EntityId, readonly ResourceFlowTermsRecord[]>();
  for (const flow of townPayFlows(facts)) {
    const terms = recordsWithFieldValue(
      facts.records.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    );
    if (terms.length > 0) byFlow.set(flow.id, terms);
  }
  return byFlow;
}
function termsOn(
  history: readonly ResourceFlowTermsRecord[],
  date: IsoDate,
): ResourceFlowTermsRecord | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1)
    if (history[index]!.effectiveAt <= date) return history[index];
  return undefined;
}
interface PayNote {
  readonly period: TownPayPeriod;
  readonly phase: number;
}
function payNoteOf(cadenceKind: string): PayNote | null {
  const match =
    /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-(\d))?$/.exec(
      cadenceKind,
    );
  if (!match) return null;
  return {
    period: match[1] as TownPayPeriod,
    phase: Number(match[2] ?? 0),
  };
}
// STOPGAP: economy.town-pay-period-400-frontier
export function* payTownPaydays(
  facts: TownSettlementFacts,
  since: IsoDate,
  exceptPersonId: EntityId | null,
): Generator<TownSettlementRequest, TownSettlementFacts, TownSettlementFacts> {
  const flows = townPayFlows(facts).filter(
    (flow) =>
      flow.recipient.kind === "person" &&
      flow.recipient.personId !== exceptPersonId,
  );
  if (flows.length === 0) return facts;
  const outcomes = facts.records.resourceTransferOutcomes;
  const earliest =
    daysBetween(since, facts.currentDate) > CATCH_UP_LIMIT_DAYS
      ? addDays(facts.currentDate, -CATCH_UP_LIMIT_DAYS)
      : since;
  const dead = deathDates(facts);
  const termsByFlow = termsByPayFlow(facts);
  const periods: TownCompensationPeriod[] = [];
  for (const flow of flows) {
    if (flow.basisReference.kind !== "work") continue;
    const history = termsByFlow.get(flow.id) ?? [];
    const current = termsOn(history, facts.currentDate);
    const note = current ? payNoteOf(current.cadenceKind) : null;
    if (!current || current.status !== "active" || !note) continue;
    const workId = flow.basisReference.workRelationshipId;
    const worked = lastDayWorked(facts, workId);
    const died = dead.get(
      (
        flow.recipient as {
          personId: EntityId;
        }
      ).personId,
    );
    const lastDay =
      died !== undefined && (worked === null || addDays(died, -1) < worked)
        ? addDays(died, -1)
        : worked;
    for (
      let payday = addDays(earliest, 1);
      payday <= facts.currentDate;
      payday = addDays(payday, 1)
    ) {
      const window = payPeriodEndingOn(note.period, payday, note.phase);
      if (!window) continue;
      if (window.startsAt < flow.startsAt) continue;
      if (lastDay !== null && lastDay < window.endsAt) continue;
      const stableKey = `${flow.stableKey}:${window.startsAt}`;
      if (hasStableKey(outcomes, stableKey)) continue;
      periods.push({
        payFlowId: flow.id,
        activityId: flow.id,
        stableKey,
        periodStartsAt: window.startsAt,
        periodEndsAt: window.endsAt,
        onDate: payday,
      });
    }
  }
  return yield* settleTownCompensations(facts, periods);
}
export interface TownCompensationPeriod {
  readonly payFlowId: EntityId;
  readonly activityId: EntityId;
  readonly stableKey: string;
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly onDate: IsoDate;
  readonly note?: string;
  readonly provenance?: RecordResourceTransferOutcomeInput["provenance"];
  readonly completedShift?: {
    readonly eventId: EntityId;
    readonly termsId: EntityId;
    readonly amount: MoneyAmount;
  };
}
// STOPGAP: economy.town-earned-law-target-binding
export function* settleTownCompensations(
  facts: TownSettlementFacts,
  periods: readonly TownCompensationPeriod[],
): Generator<TownSettlementRequest, TownSettlementFacts, TownSettlementFacts> {
  const inputs: RecordResourceTransferOutcomeInput[] = [];
  const claims: PaidLeaveClaim[] = [];
  const recipients = new Set<EntityId>();
  let next = facts;
  const absencesByWindow = new Map<
    string,
    ReadonlyMap<EntityId, WorkAbsence>
  >();
  const absencesIn = (from: IsoDate, to: IsoDate) => {
    const key = `${from}|${to}`;
    let found = absencesByWindow.get(key);
    if (!found) {
      found = epidemicWorkAbsences(facts, from, to);
      absencesByWindow.set(key, found);
    }
    return found;
  };
  const pending = new Set<string>();
  for (const period of periods) {
    if (
      pending.has(period.stableKey) ||
      hasStableKey(next.records.resourceTransferOutcomes, period.stableKey)
    )
      continue;
    const flow = recordById(next.records.resourceFlows, period.payFlowId);
    if (
      !flow ||
      flow.basisReference.kind !== "work" ||
      flow.recipient.kind !== "person"
    )
      throw new Error(
        "Pay period requires an actual worker's compensation flow.",
      );
    const workId = flow.basisReference.workRelationshipId;
    const work = recordById(next.records.workRelationships, workId);
    const payerCutoff = {
      asOfDate: period.periodStartsAt,
      historySequenceExclusive: next.records.nextSequence,
    };
    const payerId = work ? payPayerAt(next, work.id, payerCutoff) : null;
    if (
      !work ||
      work.personId !== flow.recipient.personId ||
      flow.source.kind !== "organization" ||
      flow.source.organizationId !== payerId
    )
      throw new Error("Pay period must bind the recorded worker and employer.");
    if (period.activityId !== flow.id && period.activityId !== work.id)
      throw new Error(
        "Pay period requires its saved pay-flow or work identity.",
      );
    const completion = period.completedShift
      ? recordById(next.records.events, period.completedShift.eventId)
      : null;
    const earnedTerms = completion
      ? resourceFlowTermsAt(next, flow.id, {
          asOfDate: completion.occurredAt,
          historySequenceExclusive: completion.sequence + 1,
        })
      : null;
    if (
      period.completedShift &&
      (!completion ||
        completion.type !== "life-paths2.work-session" ||
        !completion.involvedEntityIds.includes(work.id) ||
        !completion.involvedEntityIds.includes(work.personId) ||
        completion.occurredAt !== period.periodStartsAt ||
        completion.occurredAt !== period.periodEndsAt ||
        earnedTerms?.id !== period.completedShift.termsId ||
        earnedTerms.status !== "active" ||
        period.completedShift.amount.currency !== earnedTerms.amount.currency ||
        !Number.isSafeInteger(period.completedShift.amount.minorUnits) ||
        period.completedShift.amount.minorUnits !==
          earnedTerms.amount.minorUnits)
    )
      throw new Error(
        "Completed shift pay must bind its saved work and earned terms.",
      );
    if (period.completedShift)
      completedPayShift(
        next,
        flow,
        period.completedShift,
        period.periodStartsAt,
      );
    const window = {
      startsAt: period.periodStartsAt,
      endsAt: period.periodEndsAt,
    };
    const payday = period.onDate;
    const stableKey = period.stableKey;
    if (window.startsAt < flow.startsAt) continue;
    const recipientId = (
      flow.recipient as {
        personId: EntityId;
      }
    ).personId;
    next = yield {
      kind: "applyLawConsequences",
      input: {
        onDate: window.startsAt,
        activity: "payroll",
        activityId: period.activityId,
        subjectIds: [recipientId],
        ...(period.completedShift
          ? {
              completedShift: {
                eventId: period.completedShift.eventId,
                termsId: period.completedShift.termsId,
              },
            }
          : {}),
      },
    };
    const terms =
      earnedTerms ??
      resourceFlowTermsAt(next, flow.id, {
        asOfDate: window.startsAt,
        historySequenceExclusive: next.records.nextSequence,
      });
    if (!terms || terms.status !== "active") continue;
    const absence = completion
      ? undefined
      : absencesIn(window.startsAt, window.endsAt).get(recipientId);
    const workdays = workdaysBetween(window.startsAt, window.endsAt);
    const unpaidDays =
      absence && workdays > 0 && !jobPaysSickLeave(facts, workId)
        ? Math.min(absence.missedDays, workdays)
        : 0;
    const assessment = completion
      ? recordsWithFieldValue(
          next.records.earnedLawPayAssessments ?? [],
          "resourceFlowId",
          flow.id,
        )
          .filter(
            (record) =>
              record.earnedTermsId === earnedTerms?.id &&
              record.completionEventId === completion.id &&
              record.workRelationshipId === work.id &&
              record.periodStartsAt === window.startsAt &&
              record.periodEndsAt === window.endsAt,
          )
          .reduce<EarnedLawPayAssessmentRecord | null>(
            (highest, record) =>
              !highest ||
              record.assessedGross.minorUnits > highest.assessedGross.minorUnits
                ? record
                : highest,
            null,
          )
      : null;
    const gross =
      assessment?.assessedGross ??
      period.completedShift?.amount ??
      terms.amount;
    const amount =
      unpaidDays === 0
        ? gross
        : money(
            Math.round(
              (terms.amount.minorUnits * (workdays - unpaidDays)) / workdays,
            ),
            terms.amount.currency,
          );
    const caring =
      !!absence && absence.caringDays > 0 && absence.sickDays === 0;
    const coveredDays =
      absence && unpaidDays > 0 ? paidLeaveCoveredDays(absence, unpaidDays) : 0;
    const stateKey =
      coveredDays > 0 ? residenceStateKey(facts, recipientId) : null;
    const rate = stateKey
      ? paidLeaveBenefitRate(facts, stateKey, payday)
      : null;
    if (stateKey && rate)
      claims.push({
        paycheckKey: stableKey,
        personId: recipientId,
        stateKey,
        coveredDays,
        caring: absence!.seriousOwnDaysSinceOnset.length === 0,
        amountMinor: paidLeaveBenefitMinor(
          rate,
          terms.amount.minorUnits,
          workdays,
          coveredDays,
        ),
        rate,
      });
    inputs.push({
      stableKey,
      resourceFlowId: flow.id,
      periodStartsAt: window.startsAt,
      periodEndsAt: window.endsAt,
      occurredAt: payday,
      status:
        unpaidDays === 0
          ? "completed"
          : amount.minorUnits > 0
            ? "partial"
            : "missed",
      attemptedAmount: gross,
      transferredAmount: amount,
      ...(assessment ? { earnedLawPayAssessmentId: assessment.id } : {}),
      reasonKind:
        unpaidDays === 0
          ? null
          : caring
            ? "custom:unpaid-days-home-with-sick-child"
            : "custom:unpaid-sick-days",
      note:
        unpaidDays === 0
          ? (period.note ?? "Pay for the period.")
          : `Pay for the period, less ${unpaidDays} unpaid ${unpaidDays === 1 ? "day" : "days"} ${caring ? "home with a sick child" : "out sick"}.`,
      provenance: completion
        ? { kind: "simulated-event", eventId: completion.id }
        : (period.provenance ?? flow.provenance),
    });
    recipients.add(
      (
        flow.recipient as {
          personId: EntityId;
        }
      ).personId,
    );
    pending.add(stableKey);
  }
  if (inputs.length === 0) return next;
  for (const personId of recipients)
    next = yield {
      kind: "ensureLifePathPersonalPosition",
      input: [personId, money(0, "USD").currency],
    };
  const first = next.records.resourceTransferOutcomes.length;
  const assessCash = createDatedCashPaymentReader(next);
  for (const input of inputs.sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  )) {
    const flow = recordById(next.records.resourceFlows, input.resourceFlowId)!;
    const payment = assessCash(
      next,
      flow.source,
      input.transferredAmount,
      makeIsoDate(input.occurredAt),
    );
    next = yield {
      kind: "recordResourceTransferOutcomes",
      input: [
        {
          ...input,
          status:
            payment.availableMinor === null
              ? "blocked"
              : payment.status === "completed"
                ? input.status
                : payment.status,
          transferredAmount: payment.transferredAmount,
          reasonKind:
            payment.availableMinor === null
              ? "capacity:unrecorded-employer-cash"
              : payment.status === "completed"
                ? input.reasonKind
                : "capacity:insufficient-employer-cash",
        },
      ],
    };
  }
  const ids = next.records.resourceTransferOutcomes
    .slice(first)
    .map((outcome) => outcome.id);
  next = yield {
    kind: "assessPaychecksTaxes",
    input: ids,
  };
  next = yield {
    kind: "recordLocalPayrollTaxBases",
    input: ids,
  };
  next = yield {
    kind: "recordPaycheckTaxBases",
    input: ids,
  };
  return yield {
    kind: "payPaidLeaveClaims",
    input: claims,
  };
}
