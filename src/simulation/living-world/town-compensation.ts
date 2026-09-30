import { LIFE_PATHS2_CATALOG } from "../life-paths2-catalog";
import {
  teacherSalaryFloorAt,
  TEACHER_FLOOR_OCCUPATION,
  TEACHER_FLOOR_EMPLOYER,
} from "../teacher-salary-floor";
import { stateMedianAnnualWage } from "./town-pay";
import { organizationProfileAt } from "../life-queries";
import { addDays } from "../dates";
import { recordById, recordByStableKey, hasStableKey } from "../history-index";
import { workRoleAt, workStatusAt } from "../life-queries";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
  resourceTransferOutcomesOfFlows,
} from "../resource-queries";
import {
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcomes,
  type RecordResourceTransferOutcomeInput,
} from "../resources";
import { ensureLifePathPersonalPosition } from "../life-paths2-resources";
import { assessPaychecksTaxes, residenceStateKey } from "../statutory-tax";
import {
  paidLeaveBenefitMinor,
  paidLeaveBenefitRate,
  paidLeaveCoveredDays,
  payPaidLeaveClaims,
  type PaidLeaveClaim,
} from "../paid-leave-benefits";
import {
  epidemicWorkAbsences,
  jobPaysSickLeave,
  workdaysBetween,
} from "../crisis/epidemic";
import { jailTermOn, heldBeforeTrialOn } from "../justice/jail-terms";
import { isPayFlow, payPeriodsPerYear } from "../resource-income";
import { minimumWageSettingAt } from "../minimum-wage";
import { isPersonAliveAt } from "../vitality";
import { writeWithWorldIntegrityOnce, worldIntegrityDeferred } from "../world";
import type { EntityId, IsoDate, World } from "../types";

export interface TownCompensationPeriod {
  readonly flowId: EntityId;
  readonly onDate: IsoDate;
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
}
interface CompensationPlan {
  readonly outcome: RecordResourceTransferOutcomeInput;
  readonly claim: PaidLeaveClaim | null;
}

/** One period is posted once, regardless of which clock route reaches it. */
export function settleTownCompensation(
  world: World,
  period: TownCompensationPeriod,
): World {
  return settleTownCompensations(world, [period]);
}

/** Preserve town batching: all pay and premiums reach their accounts before
 * the same batch's paid-leave claims draw on those recorded balances. */
export function settleTownCompensations(
  world: World,
  periods: readonly TownCompensationPeriod[],
): World {
  if (!periods.length) return world;
  const settle = () => {
    let next = world;
    const plans: CompensationPlan[] = [];
    const selected = new Set<string>();
    for (const period of periods) {
      const key = `${period.flowId}:${period.periodStart}:${period.periodEnd}`;
      if (selected.has(key)) continue;
      selected.add(key);
      if (
        resourceTransferOutcomesOfFlows(next, new Set([period.flowId])).some(
          (row) =>
            row.periodStartsAt === period.periodStart &&
            row.periodEndsAt === period.periodEnd,
        )
      )
        continue;
      next = applyMinimumAtPeriod(next, period);
      const plan = compensationPlan(next, period);
      if (!plan) continue;
      const flow = recordById(next.history.resourceFlows, period.flowId)!;
      if (flow.recipient.kind === "person")
        next = ensureLifePathPersonalPosition(
          next,
          flow.recipient.personId,
          plan.outcome.transferredAmount.currency,
        );
      // Stage transfers sequentially so each funded source sees earlier debits.
      const balance = resourcePositionAt(
        next,
        flow.source,
        plan.outcome.transferredAmount.currency,
        {
          asOfDate: period.onDate,
          historySequenceExclusive: next.history.nextSequence,
        },
      )?.liquidBalance.minorUnits;
      const due = plan.outcome.transferredAmount.minorUnits;
      const moved =
        balance === undefined ? due : Math.min(due, Math.max(0, balance));
      const outcome =
        moved === due
          ? plan.outcome
          : {
              ...plan.outcome,
              transferredAmount: money(
                moved,
                plan.outcome.transferredAmount.currency,
              ),
              status: moved > 0 ? ("partial" as const) : ("missed" as const),
              reasonKind: "custom:employer-funds-short" as const,
              note: "The employer could not pay the full amount.",
            };
      next = recordResourceTransferOutcomes(next, [outcome]);
      plans.push({ ...plan, outcome });
    }
    if (!plans.length) return next;
    const ids = plans.map(
      (plan) =>
        recordByStableKey(
          next.history.resourceTransferOutcomes,
          plan.outcome.stableKey,
        )!.id,
    );
    next = assessPaychecksTaxes(next, ids);
    return payPaidLeaveClaims(
      next,
      plans.flatMap((plan) => (plan.claim ? [plan.claim] : [])),
    );
  };
  return worldIntegrityDeferred()
    ? settle()
    : writeWithWorldIntegrityOnce(world, settle);
}

function applyMinimumAtPeriod(
  world: World,
  period: TownCompensationPeriod,
): World {
  const flow = recordById(world.history.resourceFlows, period.flowId);
  if (!flow || flow.basisReference.kind !== "work") return world;
  // Existing completed-shift producer supplies earned duration and law terms.
  const cutoff = {
    asOfDate: period.periodStart,
    historySequenceExclusive: world.history.nextSequence,
  };
  const terms = resourceFlowTermsAt(world, flow.id, cutoff);
  const role = workRoleAt(
    world,
    flow.basisReference.workRelationshipId,
    cutoff,
  );
  const periods = terms ? payPeriodsPerYear(terms.cadenceKind) : null;
  if (
    !terms ||
    terms.status !== "active" ||
    terms.amount.currency !== "USD" ||
    !role ||
    !periods
  )
    return world;
  const setting = minimumWageSettingAt(
    world,
    role.locationJurisdictionId,
    period.periodStart,
  );
  if (!setting) return world;
  const hours =
    (role.timeDemand.expectedWeekly.minimumHours +
      role.timeDemand.expectedWeekly.maximumHours) /
    2;
  let amount = Math.round((setting.hourlyMinor * hours * 52) / periods);
  const work = recordById(
    world.history.workRelationships,
    flow.basisReference.workRelationshipId,
  );
  if (
    work?.organizationId &&
    role.occupationClassification === TEACHER_FLOOR_OCCUPATION &&
    organizationProfileAt(world, work.organizationId)?.classification ===
      TEACHER_FLOOR_EMPLOYER
  ) {
    const floor = teacherSalaryFloorAt(
      world,
      role.locationJurisdictionId,
      period.periodStart,
      stateMedianAnnualWage(
        TEACHER_FLOOR_OCCUPATION,
        role.locationJurisdictionId,
      ),
    );
    if (floor)
      amount = Math.max(
        amount,
        Math.round((floor.annual * 100 * hours) / (40 * periods)),
      );
  }
  if (amount <= terms.amount.minorUnits) return world;
  const latest = resourceFlowTermsAt(world, flow.id);
  if (
    !latest ||
    latest.effectiveAt > period.periodStart ||
    latest.amount.minorUnits >= amount
  )
    return world;
  return recordResourceFlowTerms(world, {
    stableKey: `${flow.stableKey}:minimum-wage:${period.periodStart}`,
    resourceFlowId: flow.id,
    effectiveAt: period.periodStart,
    status: "active",
    amount: money(amount, terms.amount.currency),
    cadenceKind: terms.cadenceKind,
    reason: "Pay raised to the minimum wage in force for this period.",
    supersedesTermsId: latest.id,
    provenance: flow.provenance,
  });
}

function compensationPlan(
  world: World,
  { flowId, onDate, periodStart, periodEnd }: TownCompensationPeriod,
): CompensationPlan | null {
  if (
    periodStart > periodEnd ||
    periodEnd > onDate ||
    onDate > world.currentDate
  )
    throw new Error("Compensation period must be completed before payment.");
  const flow = recordById(world.history.resourceFlows, flowId);
  if (
    !flow ||
    !isPayFlow(flow) ||
    flow.recipient.kind !== "person" ||
    periodStart < flow.startsAt
  )
    return null;
  const existing = resourceTransferOutcomesOfFlows(world, new Set([flowId]));
  if (
    existing.some(
      (row) =>
        row.periodStartsAt === periodStart && row.periodEndsAt === periodEnd,
    )
  )
    return null;
  let stableKey = `${flow.stableKey}:${periodStart}`;
  if (hasStableKey(world.history.resourceTransferOutcomes, stableKey))
    return null;
  const cutoff = {
    asOfDate: periodStart,
    historySequenceExclusive: world.history.nextSequence,
  };
  const terms = resourceFlowTermsAt(world, flowId, cutoff);
  if (!terms || terms.status !== "active") return null;
  const personId = flow.recipient.personId;
  const workId =
    flow.basisReference.kind === "work"
      ? flow.basisReference.workRelationshipId
      : null;
  const role = workId ? workRoleAt(world, workId, cutoff) : undefined;
  const weeklyHours = role
    ? (role.timeDemand.expectedWeekly.minimumHours +
        role.timeDemand.expectedWeekly.maximumHours) /
      2
    : 0;
  if (
    workId &&
    workStatusAt(world, workId, { ...cutoff, asOfDate: periodEnd })?.status !==
      "active"
  )
    return null;
  if (!isPersonAliveAt(world, personId, { ...cutoff, asOfDate: periodEnd }))
    return null;
  if (terms.cadenceKind === "work:completed-shift") {
    if (!workId || periodStart !== periodEnd) return null;
    const worked = world.history.events.find(
      (e) =>
        e.type === "life-paths2.work-session" &&
        e.occurredAt === periodStart &&
        e.involvedEntityIds.includes(workId) &&
        e.involvedEntityIds.includes(personId),
    );
    const due = worked
      ? world.history.futureDueItems.find(
          (item) =>
            item.transitionKey === "life-paths2:pay" &&
            item.dueAt <= onDate &&
            item.entityIds.includes(flowId) &&
            item.entityIds.includes(worked.id),
        )
      : undefined;
    if (!worked || !due) return null;
    stableKey = `${due.stableKey}:paid`;
    const earned = resourceFlowTermsAt(world, flowId, {
      asOfDate: worked.occurredAt,
      historySequenceExclusive: worked.sequence + 1,
    });
    if (!earned) throw new Error("Earned pay terms are missing.");
    const work = recordById(world.history.workRelationships, workId);
    const path = LIFE_PATHS2_CATALOG.find(
      (p) => work?.kind === `employment:life-paths2-${p.id}`,
    );
    const setting = minimumWageSettingAt(
      world,
      role?.locationJurisdictionId ??
        world.people[personId]?.homeJurisdictionId ??
        null,
      periodStart,
    );
    const floor =
      path && setting?.measureId
        ? Math.round((setting.hourlyMinor * path.sessionMinutes) / 60)
        : 0;
    const amount = money(
      Math.max(earned.amount.minorUnits, floor),
      earned.amount.currency,
    );
    return {
      claim: null,
      outcome: {
        stableKey,
        resourceFlowId: flow.id,
        periodStartsAt: periodStart,
        periodEndsAt: periodEnd,
        occurredAt: onDate,
        status: "completed",
        attemptedAmount: amount,
        transferredAmount: amount,
        reasonKind: null,
        note: "Payment for the completed shift.",
        provenance: flow.provenance,
      },
    };
  }

  let claim: PaidLeaveClaim | null = null;
  const defendants = new Set(
    world.history.events
      .filter(
        (e) =>
          e.type === "justice.sentenced" ||
          e.type === "justice.held-before-trial",
      )
      .flatMap((e) =>
        e.participants
          .filter((p) => p.role === "focus:defendant")
          .map((p) => p.personId),
      ),
  );
  if (!workId)
    return {
      claim: null,
      outcome: {
        stableKey,
        resourceFlowId: flow.id,
        periodStartsAt: periodStart,
        periodEndsAt: periodEnd,
        occurredAt: onDate,
        status: "completed",
        attemptedAmount: terms.amount,
        transferredAmount: terms.amount,
        reasonKind: null,
        note: "Pay for the period.",
        provenance: flow.provenance,
      },
    };
  const recipientId = personId;
  const absence = epidemicWorkAbsences(world, periodStart, periodEnd).get(
    recipientId,
  );
  const workdays = workdaysBetween(periodStart, periodEnd);
  let jailedDays = 0;
  if (defendants.has(recipientId))
    for (let date = periodStart; date <= periodEnd; date = addDays(date, 1)) {
      if (
        workdaysBetween(date, date) > 0 &&
        (jailTermOn(world, recipientId, date) ||
          heldBeforeTrialOn(world, recipientId, date))
      )
        jailedDays += 1;
    }
  const sickUnpaidDays =
    absence && workdays > 0 && !jobPaysSickLeave(world, workId)
      ? Math.min(absence.missedDays, workdays)
      : 0;
  const unpaidDays = Math.min(workdays, jailedDays + sickUnpaidDays);
  const hiringStep = (world.history.jobApplicationSteps ?? []).find(
    (s) => s.workRelationshipId === workId,
  );
  const application = hiringStep
    ? (world.history.jobApplications ?? []).find(
        (a) => a.id === hiringStep.applicationId,
      )
    : null;
  const opening = application
    ? (world.history.jobOpenings ?? []).find(
        (o) => o.id === application.openingId,
      )
    : null;
  const hourly = opening
    ? opening.pay.basis === "hourly"
    : flow.stableKey.startsWith("town-pay-v2:job-pay:") &&
      "note" in flow.provenance &&
      flow.provenance.note?.includes("an hour") === true;
  const idTripMinutes = (hourly ? (world.voterIdentification?.trips ?? []) : [])
    .filter((trip) => trip.on >= periodStart && trip.on <= periodEnd)
    .flatMap((trip) => trip.missedWork)
    .filter((missed) => missed.workRelationshipId === workId)
    .reduce((sum, missed) => sum + missed.minutes, 0);
  const paidMinutes = role ? (weeklyHours * 60 * workdays) / 5 : null;
  const idTripFraction =
    paidMinutes && paidMinutes > 0
      ? Math.min(
          (workdays - unpaidDays) / workdays,
          idTripMinutes / paidMinutes,
        )
      : 0;
  const amount =
    unpaidDays === 0 && idTripFraction === 0
      ? terms.amount
      : money(
          Math.round(
            terms.amount.minorUnits *
              ((workdays - unpaidDays) / workdays - idTripFraction),
          ),
          terms.amount.currency,
        );
  const caring = !!absence && absence.caringDays > 0 && absence.sickDays === 0;
  // A state paid leave program in force replaces part of the pay lost
  // to a serious illness, the worker's own or a child's.
  const coveredDays =
    absence && sickUnpaidDays > 0
      ? paidLeaveCoveredDays(
          absence,
          Math.min(sickUnpaidDays, workdays - jailedDays),
        )
      : 0;
  const stateKey =
    coveredDays > 0 ? residenceStateKey(world, recipientId) : null;
  const rate = stateKey ? paidLeaveBenefitRate(world, stateKey, onDate) : null;
  if (stateKey && rate)
    claim = {
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
    };
  const outcome: RecordResourceTransferOutcomeInput = {
    stableKey,
    resourceFlowId: flow.id,
    periodStartsAt: periodStart,
    periodEndsAt: periodEnd,
    occurredAt: onDate,
    status:
      unpaidDays === 0 && idTripFraction === 0
        ? "completed"
        : amount.minorUnits > 0
          ? "partial"
          : "missed",
    attemptedAmount: terms.amount,
    transferredAmount: amount,
    reasonKind:
      unpaidDays === 0 && idTripFraction === 0
        ? null
        : idTripFraction > 0
          ? "custom:unpaid-voter-id-trip"
          : jailedDays > 0
            ? "custom:unpaid-days-in-custody"
            : caring
              ? "custom:unpaid-days-home-with-sick-child"
              : "custom:unpaid-sick-days",
    note:
      unpaidDays === 0 && idTripFraction === 0
        ? "Pay for the period."
        : idTripFraction > 0
          ? `Pay less ${idTripMinutes} recorded minutes spent obtaining voter identification and ${unpaidDays} other unpaid days.`
          : `Pay for the period, less ${unpaidDays} unpaid ${unpaidDays === 1 ? "day" : "days"} ${jailedDays > 0 ? "in custody or otherwise absent" : caring ? "home with a sick child" : "out sick"}.`,
    provenance: flow.provenance,
  };

  return { outcome, claim };
}
