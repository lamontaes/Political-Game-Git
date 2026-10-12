/** Complete retained hourly law binding, earned assessment, replay equality and prospective period/terms/stamp requests. */
import {
  addDays,
  daysBetween,
  makeIsoDate,
  simulationMinutesBetween,
} from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import { recordById, recordsWithFieldValue } from "./raw-record-index";
import { money } from "./cost-money";
import { lawEffectStamp } from "../laws/effect-stamp";
import { lawInForce as lawFromFacts } from "../laws/dated-law";
import {
  enactedRuleChangeAt as ruleFromFacts,
  type RuleChangeFacts,
} from "../laws/recorded-rule-changes";
import { laborLawOfficeKey } from "../laws/minimum-authority";
import { assessedCompletedHourlyGrossMinor } from "../laws/earned-pay-integrity";
import { resourceFlowTermsAt } from "./credential-pay";
import {
  resourceTransferTermsCutoff,
  type ResourceSettlementFacts,
} from "./resource-settlement";
import { stateKeyForJurisdiction } from "../../simulation/state-jurisdiction-id";
import type * as life from "../../simulation/life-queries";
import type * as pay from "../../simulation/pay-coverage-predicates";
import type {
  lifePlaceByJurisdictionId as nativePlace,
  stateJurisdictionForKey as nativeState,
} from "../../simulation/life-places";
import type { recordResourceFlowTerms } from "../../simulation/resources";
import type {
  ResolvedHourlyLawPayConsequence,
  ResolvedSavedHourlyPayConsequence,
} from "../../simulation/law-consequence-types";
import type {
  World,
  EntityId,
  IsoDate,
  ResourceFlow,
  HistoricalCutoff,
  WorkRoleRecord,
  EarnedLawPayAssessmentRecord,
} from "../../simulation/types";
// STOPGAP: economy.earned-pay-assessment-dto
export interface PayLawFacts extends ResourceSettlementFacts {
  readonly people: World["people"];
  readonly jurisdictions: World["jurisdictions"];
  readonly policyCatalog: World["policyCatalog"];
  readonly legal: RuleChangeFacts;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly states: ReadonlyMap<string, ReturnType<typeof nativeState>>;
  readonly life: ReadonlyMap<
    string,
    {
      readonly role: ReturnType<typeof life.workRoleAt>;
      readonly status: ReturnType<typeof life.workStatusAt>;
      readonly workplace: ReturnType<typeof pay.payWorkplaceAt>;
    }
  >;
}
export type PayLawRequest =
  | {
      readonly kind: "recordResourceFlowTerms";
      readonly input: Parameters<typeof recordResourceFlowTerms>[1];
    }
  | {
      readonly kind: "recordEarnedAssessment";
      readonly row: EarnedLawPayAssessmentRecord;
    };
export type PayLawInput =
  ResolvedHourlyLawPayConsequence | ResolvedSavedHourlyPayConsequence;
export const payLawSourceKey = (...keys: unknown[]) => JSON.stringify(keys);
function lifeReceipt(
  facts: PayLawFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  const row = facts.life.get(payLawSourceKey(id, cutoff));
  if (!row) throw Error("Missing raw dated pay life receipt");
  return row;
}
function workRoleAt(
  facts: PayLawFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  return lifeReceipt(facts, id, cutoff).role;
}
function workStatusAt(
  facts: PayLawFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  return lifeReceipt(facts, id, cutoff).status;
}
function payPayerAt(
  facts: PayLawFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  const key = JSON.stringify([id, cutoff]);
  if (!facts.payers.has(key)) throw Error("Missing raw dated pay payer");
  return facts.payers.get(key)!;
}
function payWorkplaceAt(
  facts: PayLawFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  return lifeReceipt(facts, id, cutoff).workplace;
}
function lifePlaceByJurisdictionId(facts: PayLawFacts, id: EntityId) {
  return facts.places.get(id) ?? null;
}
function stateJurisdictionForKey(facts: PayLawFacts, key: string) {
  return facts.states.get(key) ?? null;
}
function lawInForce(
  facts: PayLawFacts,
  ...args: Parameters<typeof lawFromFacts> extends [unknown, ...infer A]
    ? A
    : never
) {
  return lawFromFacts(facts.legal, ...args);
}
function enactedRuleChangeAt(
  facts: PayLawFacts,
  input: Parameters<typeof ruleFromFacts>[1],
) {
  return ruleFromFacts(facts.legal, input);
}
export type TownPayPeriod = "weekly" | "biweekly" | "semimonthly" | "monthly";
const PERIODS_PER_YEAR: Readonly<Record<TownPayPeriod, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
function weekday(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
function lastDayOfMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  );
}
export // STOPGAP: economy.prospective-weekly-floor-cadence
function payPeriodEndingOn(
  period: TownPayPeriod,
  date: IsoDate,
  phase: number,
): {
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
} | null {
  if (period === "weekly" || period === "biweekly") {
    if (weekday(date) !== 5) return null;
    if (period === "biweekly") {
      const weeks = Math.floor(
        daysBetween(makeIsoDate("2000-01-07"), date) / 7,
      );
      if ((weeks + phase) % 2 !== 0) return null;
    }
    return {
      startsAt: addDays(date, period === "weekly" ? -6 : -13),
      endsAt: date,
    };
  }
  const last = lastDayOfMonth(date);
  const day = Number(date.slice(8, 10));
  if (period === "semimonthly" && day === 15)
    return { startsAt: makeIsoDate(`${date.slice(0, 8)}01`), endsAt: date };
  if (date !== last) return null;
  return {
    startsAt:
      period === "semimonthly"
        ? makeIsoDate(`${date.slice(0, 8)}16`)
        : makeIsoDate(`${date.slice(0, 8)}01`),
    endsAt: date,
  };
}
export function weeklyHoursOf(role: WorkRoleRecord): number {
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2;
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
export // STOPGAP: economy.earned-pay-immutable-guard-order
function completedPayShift(
  facts: PayLawFacts,
  flow: ResourceFlow,
  shift: NonNullable<ResolvedHourlyLawPayConsequence["completedShift"]>,
  onDate: IsoDate,
) {
  const completion = recordById(facts.records.events, shift.eventId);
  if (
    !completion ||
    completion.type !== "life-paths2.work-session" ||
    completion.occurredAt !== onDate
  )
    throw new Error("Completed pay requires its actual work-session event.");
  const cutoff = resourceTransferTermsCutoff(facts, flow, onDate, onDate, {
    kind: "simulated-event",
    eventId: completion.id,
  });
  const terms = resourceFlowTermsAt(facts, flow.id, cutoff);
  if (!terms || terms.id !== shift.termsId || terms.status !== "active")
    throw new Error("Completed pay requires its actual earned terms.");
  const workId =
    flow.basisReference.kind === "work"
      ? flow.basisReference.workRelationshipId
      : null;
  const activities = completion.involvedEntityIds.flatMap((id) => {
    const activity = recordById(facts.records.scheduledActivities, id);
    return activity ? [activity] : [];
  });
  if (activities.length !== 1)
    throw new Error("Completed pay requires exactly one saved work activity.");
  const activity = activities[0]!;
  const state = recordsWithFieldValue(
    facts.records.scheduledActivityStates,
    "activityId",
    activity.id,
  )
    .filter((row) => row.sequence < cutoff.historySequenceExclusive)
    .at(-1);
  if (
    !workId ||
    flow.recipient.kind !== "person" ||
    activity.sequence >= completion.sequence ||
    !activity.sourceEntityIds.includes(workId) ||
    !activity.participantPersonIds.includes(flow.recipient.personId) ||
    !state ||
    state.status !== "completed"
  )
    throw new Error(
      "Completed pay must bind the worker and performed activity.",
    );
  const minutes = simulationMinutesBetween(state.start, state.end);
  if (!Number.isSafeInteger(minutes) || minutes <= 0)
    throw new Error("Completed pay requires a positive actual work interval.");
  return { completion, cutoff, terms, activity, state, minutes };
}
// STOPGAP: economy.hourly-floor-resolved-amount-trust
export function* applyLawPayConsequence(
  facts: PayLawFacts,
  resolved: ResolvedHourlyLawPayConsequence | ResolvedSavedHourlyPayConsequence,
): Generator<PayLawRequest, PayLawFacts, PayLawFacts> {
  const refuse = (capability: string): never => {
    throw new Error(`Law pay consequence requires capability: ${capability}`);
  };
  if (!resolved.rowId.trim() || !resolved.activityId.trim())
    refuse("pay.row-and-activity-identity");
  if (
    resolved.amount.unit !== "minor/hour" ||
    resolved.amount.currency !== "USD"
  )
    refuse("pay.amount.minor-per-hour-USD");
  if (!Number.isFinite(resolved.amount.value) || resolved.amount.value < 0)
    refuse("pay.amount.finite-nonnegative");
  const effectiveAt = makeIsoDate(resolved.effectiveAt);
  if (effectiveAt > facts.currentDate) refuse("pay.activity.current-or-past");
  let governing: Parameters<typeof lawEffectStamp>[0] = null;
  const work = recordById(facts.records.workRelationships, resolved.workId);
  const flow = recordById(facts.records.resourceFlows, resolved.payFlowId);
  const payerId = work
    ? payPayerAt(facts, work.id, {
        asOfDate: effectiveAt,
        historySequenceExclusive: facts.records.nextSequence,
      })
    : null;
  if (!facts.people[resolved.personId] || work?.personId !== resolved.personId)
    refuse("pay.worker-and-job.binding");
  if (
    !flow ||
    flow.recipient.kind !== "person" ||
    flow.recipient.personId !== resolved.personId ||
    flow.basisReference.kind !== "work" ||
    flow.basisReference.workRelationshipId !== resolved.workId ||
    flow.source.kind !== "organization" ||
    flow.source.organizationId !== payerId
  )
    refuse("pay.flow-worker-employer.binding");
  const completed = resolved.completedShift
    ? completedPayShift(facts, flow!, resolved.completedShift, effectiveAt)
    : null;
  const cutoff = completed?.cutoff ?? {
    asOfDate: effectiveAt,
    historySequenceExclusive: facts.records.nextSequence,
  };
  if (resolved.action === "raise-hourly-floor") {
    const question = Object.values(facts.policyCatalog.propositions).find(
      (row) => row.stableKey === resolved.questionKey,
    );
    if (!question) refuse("pay.question.canonical");
    const law = lawInForce(
      facts,
      resolved.jurisdictionId,
      question!.id,
      effectiveAt,
      "all",
      cutoff,
    );
    if (
      !law ||
      law.measureId !== resolved.law.measureId ||
      law.origin !== resolved.law.origin ||
      law.operativeAt !== resolved.law.operativeAt ||
      law.answer !== resolved.law.answer
    )
      refuse("pay.law.operative");
    governing = law;
  }
  const role = workRoleAt(facts, resolved.workId, cutoff);
  if (
    !role ||
    work!.startedAt > effectiveAt ||
    workStatusAt(facts, resolved.workId, cutoff)?.status !== "active"
  )
    refuse("pay.job.active-with-recorded-hours");
  if (resolved.action === "raise-saved-rule-hourly-floor") {
    const authority = resolved.authority;
    const workplace = payWorkplaceAt(facts, work!.id, cutoff);
    const jurisdiction = workplace.jurisdictionId
      ? facts.jurisdictions[workplace.jurisdictionId]
      : null;
    const stateKey =
      (workplace.jurisdictionId
        ? lifePlaceByJurisdictionId(facts, workplace.jurisdictionId)
            ?.stateJurisdictionKey
        : null) ??
      (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null);
    const clause = recordById(
      facts.records.ruleChangeProvisions ?? [],
      authority.ruleChangeProvisionId,
    );
    const enactment = recordById(
      facts.records.legislativeEnactments ?? [],
      authority.enactmentId,
    );
    const change = enactedRuleChangeAt(facts, {
      stateUsps: authority.stateUsps,
      officeKey: authority.officeKey,
      field: authority.field,
      onDate: effectiveAt,
      cutoff,
    });
    if (
      authority.kind !== "enacted-hourly-pay-rule" ||
      stateKey !== `US-${authority.stateUsps}` ||
      authority.officeKey !== laborLawOfficeKey(authority.stateUsps) ||
      authority.field !== "labor.minimumWage.hourlyCents" ||
      stateJurisdictionForKey(facts, stateKey!)?.id !==
        resolved.jurisdictionId ||
      (resolved.activityId !== work!.id && resolved.activityId !== flow!.id) ||
      !clause ||
      resolved.rowId !== `pay:hourly-rule:${clause.id}` ||
      clause.measureId !== authority.measureId ||
      clause.stateUsps !== authority.stateUsps ||
      clause.officeKey !== authority.officeKey ||
      clause.field !== authority.field ||
      clause.filedAt > effectiveAt ||
      !enactment ||
      enactment.outcome !== "enacted" ||
      enactment.measureId !== clause.measureId ||
      enactment.resolvedAt > effectiveAt ||
      clause.sequence >= enactment.sequence ||
      !change ||
      change.instrument !== "statute" ||
      change.measureId !== clause.measureId ||
      change.operativeAt !== authority.operativeAt ||
      change.value !== clause.value ||
      change.value !== resolved.amount.value ||
      change.applicability.appliesTo !== authority.applicability.appliesTo ||
      change.applicability.countsPriorService !==
        authority.applicability.countsPriorService ||
      (change.applicability.appliesTo === "terms-beginning-after" &&
        work!.startedAt < change.operativeAt) ||
      !resolved.sourceRecordIds.includes(clause.id) ||
      !resolved.sourceRecordIds.includes(enactment.id)
    )
      refuse("pay.hourly-rule.actual-operative-binding");
    governing = {
      measureId: change!.measureId,
      origin: "enacted",
      operativeAt: change!.operativeAt,
    };
  }
  if (!governing) refuse("pay.law.operative");
  const current = completed?.terms ?? resourceFlowTermsAt(facts, flow!.id);
  if (!current || current.status !== "active") refuse("pay.flow.active-terms");
  if (current!.amount.currency !== resolved.amount.currency)
    refuse("pay.flow.currency-matches-amount");
  if (completed) {
    if (current!.cadenceKind !== "work:completed-shift")
      refuse("pay.completed-shift.hourly-earned-cadence");
    if (governing!.origin === "enacted") {
      const enactment = recordsWithFieldValue(
        facts.records.legislativeEnactments ?? [],
        "measureId",
        governing!.measureId,
      ).at(-1);
      if (!enactment || enactment.sequence >= cutoff.historySequenceExclusive)
        refuse("pay.completed-shift.authority-at-earned-sequence");
    }
    const floor = assessedCompletedHourlyGrossMinor(
      resolved.amount.value,
      completed.minutes,
      current!.amount.minorUnits,
    );
    if (floor <= current!.amount.minorUnits) return facts;
    const stableKey = `earned-law-pay:${flow!.id}:${completed.completion.id}:${current!.id}:${resolved.rowId}:${governing!.measureId}`;
    const id = createStableId(
      "earned-law-pay-assessment",
      `${facts.id}:${stableKey}`,
    );
    const prior = recordsWithFieldValue(
      facts.records.earnedLawPayAssessments ?? [],
      "stableKey",
      stableKey,
    ).at(-1);
    if (prior) {
      if (
        prior.id !== id ||
        prior.personId !== work!.personId ||
        prior.organizationId !== work!.organizationId ||
        prior.workRelationshipId !== work!.id ||
        prior.resourceFlowId !== flow!.id ||
        prior.completionEventId !== completed.completion.id ||
        prior.scheduledActivityId !== completed.activity.id ||
        prior.scheduledActivityStateId !== completed.state.id ||
        prior.earnedCutoff.asOfDate !== cutoff.asOfDate ||
        prior.earnedCutoff.historySequenceExclusive !==
          cutoff.historySequenceExclusive ||
        prior.periodStartsAt !== completed.completion.occurredAt ||
        prior.periodEndsAt !== completed.completion.occurredAt ||
        prior.contractualGross.minorUnits !== current!.amount.minorUnits ||
        prior.contractualGross.currency !== current!.amount.currency ||
        prior.assessedGross.minorUnits !== floor ||
        prior.assessedGross.currency !== current!.amount.currency ||
        prior.workedMinutes !== completed.minutes ||
        prior.earnedTermsId !== current!.id
      )
        refuse("pay.completed-shift.assessment-replay-equality");
      return facts;
    }
    const sourceRecordIds = [
      ...new Set([
        ...resolved.sourceRecordIds,
        id,
        resolved.activityId,
        work!.id,
        role!.id,
        flow!.id,
        current!.id,
        completed.completion.id,
        completed.activity.id,
        completed.state.id,
      ]),
    ];
    const stamp = lawEffectStamp(governing, {
      effectKind: "pay",
      questionKey:
        resolved.action === "raise-hourly-floor" ? resolved.questionKey : null,
      ...(resolved.action === "raise-saved-rule-hourly-floor"
        ? {
            ruleAuthority: {
              ruleChangeProvisionId: resolved.authority.ruleChangeProvisionId,
              enactmentId: resolved.authority.enactmentId,
              field: resolved.authority.field,
            },
          }
        : {}),
      jurisdictionId: resolved.jurisdictionId,
      appliedAt: facts.currentDate,
      sourceRecordIds,
    });
    if (!stamp) refuse("pay.attribution.canonical");
    const assessment: EarnedLawPayAssessmentRecord = {
      id,
      stableKey,
      sequence: facts.records.nextSequence,
      recordedAt: facts.currentDate,
      personId: work!.personId,
      organizationId: work!.organizationId!,
      workRelationshipId: work!.id,
      resourceFlowId: flow!.id,
      earnedTermsId: current!.id,
      completionEventId: completed.completion.id,
      scheduledActivityId: completed.activity.id,
      scheduledActivityStateId: completed.state.id,
      earnedCutoff: { ...completed.cutoff },
      periodStartsAt: completed.completion.occurredAt,
      periodEndsAt: completed.completion.occurredAt,
      workedMinutes: completed.minutes,
      contractualGross: { ...current!.amount },
      assessedGross: money(floor, current!.amount.currency),
      resolvedConsequence:
        resolved.action === "raise-hourly-floor"
          ? {
              ...resolved,
              law: { ...resolved.law },
              amount: { ...resolved.amount },
              completedShift: { ...resolved.completedShift! },
              sourceRecordIds: [...resolved.sourceRecordIds],
            }
          : {
              ...resolved,
              authority: {
                ...resolved.authority,
                applicability: { ...resolved.authority.applicability },
              },
              amount: { ...resolved.amount },
              completedShift: { ...resolved.completedShift! },
              sourceRecordIds: [...resolved.sourceRecordIds],
            },
      lawEffectStamps: [stamp!],
    };
    return yield {
      kind: "recordEarnedAssessment",
      row: assessment,
    };
  }
  const note = payNoteOf(current!.cadenceKind);
  const weekly = current!.cadenceKind === "schedule:weekly";
  if (!note && !weekly) refuse("pay.cadence.recorded-pay-period");
  const weeklyHours = weeklyHoursOf(role!);
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0)
    refuse("pay.job.positive-recorded-hours");
  const amount = Math.round(
    weekly
      ? resolved.amount.value * weeklyHours
      : (resolved.amount.value * weeklyHours * 52) /
          PERIODS_PER_YEAR[note!.period],
  );
  if (!Number.isSafeInteger(amount)) refuse("pay.period.amount-safe-integer");
  if (amount <= current!.amount.minorUnits) return facts;
  if (effectiveAt < current!.effectiveAt || effectiveAt < flow!.startsAt)
    refuse("pay.terms.prospective");
  if (
    effectiveAt !== flow!.startsAt &&
    (weekly
      ? daysBetween(flow!.startsAt, effectiveAt) % 7 !== 0
      : !payPeriodEndingOn(note!.period, addDays(effectiveAt, -1), note!.phase))
  )
    refuse("pay.period.starts-on-effective-date");
  if (
    recordsWithFieldValue(
      facts.records.resourceTransferOutcomes,
      "resourceFlowId",
      flow!.id,
    ).some(
      (paid) =>
        paid.transferredAmount.minorUnits > 0 &&
        paid.periodStartsAt <= effectiveAt &&
        effectiveAt <= paid.periodEndsAt,
    )
  )
    refuse("pay.period.unpaid");
  const revision = createStableId(
    "resource-flow-terms",
    `law-pay-revision:${JSON.stringify([
      governing!.measureId,
      governing!.operativeAt,
      [...new Set(resolved.sourceRecordIds)].sort(),
    ])}`,
  );
  const stableKey = `law-pay:${resolved.rowId}:${revision}:${flow!.id}:${resolved.activityId}:${effectiveAt}`;
  if (hasStableKey(facts.records.resourceFlowTerms, stableKey))
    refuse("pay.revision.unique-amount");
  const enactment =
    governing!.origin === "enacted"
      ? recordsWithFieldValue(
          facts.records.legislativeEnactments ?? [],
          "measureId",
          governing!.measureId,
        ).at(-1)
      : undefined;
  if (
    governing!.origin === "enacted" &&
    (!enactment || enactment.resolvedAt > effectiveAt)
  )
    refuse("pay.law.recorded-enactment");
  const sourceRecordIds = [
    ...new Set([
      ...resolved.sourceRecordIds,
      resolved.activityId,
      work!.id,
      role!.id,
      flow!.id,
      current!.id,
      ...(enactment ? [enactment.id] : []),
    ]),
  ];
  const stamp = lawEffectStamp(governing, {
    effectKind: "pay",
    questionKey:
      resolved.action === "raise-hourly-floor" ? resolved.questionKey : null,
    ...(resolved.action === "raise-saved-rule-hourly-floor"
      ? {
          ruleAuthority: {
            ruleChangeProvisionId: resolved.authority.ruleChangeProvisionId,
            enactmentId: resolved.authority.enactmentId,
            field: resolved.authority.field,
          },
        }
      : {}),
    jurisdictionId: resolved.jurisdictionId,
    appliedAt: effectiveAt,
    sourceRecordIds,
  });
  if (!stamp) refuse("pay.attribution.canonical");
  return yield {
    kind: "recordResourceFlowTerms",
    input: {
      stableKey,
      resourceFlowId: flow!.id,
      effectiveAt,
      status: "active",
      amount: money(amount, current!.amount.currency),
      cadenceKind: current!.cadenceKind,
      reason: `The operative law's pay floor applies through ${resolved.rowId}.`,
      provenance: enactment
        ? { kind: "simulated-event", eventId: enactment.outcomeEventId }
        : {
            kind: "authored",
            note: `Starting law ${governing!.measureId}; resolved pay row ${resolved.rowId}.`,
          },
      supersedesTermsId: current!.id,
      lawEffectStamps: [stamp!],
    },
  };
}

function hasStableKey<T extends { stableKey: string }>(
  rows: readonly T[],
  key: string,
) {
  return rows.some((row) => row.stableKey === key);
}
