import { resourceFlowTermsAt } from "./resource-queries";
import { historicalWorldInputs } from "./historical-world-inputs";
import { distantHistoricalRoutine } from "./historical-past-mode";
import {
  settleTownCompensations,
  type TownCompensationPeriod,
} from "./living-world/town-pay";
import {
  growingIndex,
  withHistoryAppendTransaction,
  recordById,
  type GrowingIndexKind,
} from "./history-index";
import { addDays, daysBetween } from "./dates";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import {
  currentLifeCutoff,
  workStatusAt,
  workRoleAt,
  workRelationshipHistoryForPerson,
} from "./life-queries";
import { recordedWorkAnnualPay } from "./recorded-work-pay";
import { officePayInForce, paidOfficeOf } from "./office-pay";
import { stateJurisdictionForKey } from "./life-places";
import { publicTaxAccountForIdentity } from "./tax-policy";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { advanceWithWorldIntegrityAtEnd } from "./world";
import {
  townJobRate,
  townMinimumHourlyAt,
  townPayPercentile,
  weeklyHoursOf,
} from "./living-world/town-pay";
import {
  createResourceFlow,
  createResourceFlows,
  recordResourceFlowTerms,
  money,
  type CreateResourceFlowInput,
} from "./resources";
import type {
  EntityId,
  IsoDate,
  World,
  WorkRelationship,
  ResourceFlow,
  ResourceTransferOutcome,
} from "./types";

/**
 * Pay for holding a public office.
 *
 * Offices were recorded as paid work and nothing ever paid them. In the
 * corrupt-life replay Lucia's account held exactly $102,160 for her whole
 * time as governor. This pays the person being played a weekly salary for
 * each public office they hold that has no pay recorded, through the same
 * compensation records a shop job uses, so the money screen and the weekly
 * living costs read it with no extra code.
 *
 * Only offices are paid here. A job that already has pay terms keeps them,
 * and ordinary jobs from a generated past are not touched.
 */

/** The work kinds that are public offices. */
export const PAID_OFFICE_KINDS: readonly string[] = [
  "employment:executive-office",
  "employment:legislative-member",
  "employment:judicial-office-practice",
  "employment:state-agency-director",
  "employment:civil-service",
  "employment:executive-staff",
  "employment:congress-member",
];

const OFFICE_WORK: GrowingIndexKind<WorkRelationship[]> = {
  create: () => [],
  add: (works, record) => {
    const work = record as WorkRelationship;
    if (
      work.organizationId &&
      PAID_OFFICE_KINDS.includes(work.kind) &&
      (work.compensation === "paid" || work.compensation === "mixed")
    )
      works.push(work);
  },
};
const WORK_PAY_FLOWS: GrowingIndexKind<Map<EntityId, ResourceFlow>> = {
  create: () => new Map(),
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (
      flow.basisReference.kind === "work" &&
      !flows.has(flow.basisReference.workRelationshipId)
    )
      flows.set(flow.basisReference.workRelationshipId, flow);
  },
};
const OFFICE_PAY_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (
      flow.basisReference.kind === "work" &&
      flow.stableKey.startsWith("office-salary:")
    )
      flows.push(flow);
  },
};

// Every recorded outcome closes its period, regardless of payment status.
const LAST_RECORDED_PERIOD: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (periods, record) => {
    const outcome = record as ResourceTransferOutcome;
    const originalFlowId = outcome.stableKey.startsWith("past-office-summary:")
      ? (outcome.stableKey.split(":")[1] as EntityId)
      : outcome.resourceFlowId;
    const latest = periods.get(originalFlowId);
    const period = outcome.stableKey.startsWith("past-office-summary:")
      ? addDays(outcome.periodEndsAt, -(WEEK_DAYS - 1))
      : outcome.periodStartsAt;
    if (latest === undefined || period > latest)
      periods.set(originalFlowId, period);
  },
};

/** Opening prepares reads only; dated payment and eligibility stay on the clock. */
function prepareOfficeSalaryReads(world: World): World {
  growingIndex(OFFICE_WORK, world.history.workRelationships);
  growingIndex(WORK_PAY_FLOWS, world.history.resourceFlows);
  growingIndex(OFFICE_PAY_FLOWS, world.history.resourceFlows);
  growingIndex(LAST_RECORDED_PERIOD, world.history.resourceTransferOutcomes);
  return world;
}

const WEEK_DAYS = 7;

/**
 * The annual pay for an office on a date: what the state's pay law says if one
 * is in force, else the state's published figure, else comparable recorded pay or the recorded occupation’s published wage.
 */
function annualPay(
  world: World,
  work: WorkRelationship,
  onDate: IsoDate,
): { readonly annualMinor: number; readonly note: string } | null {
  const inForce = officePayInForce(world, work, onDate);
  if (inForce?.law)
    return {
      annualMinor: inForce.annualDollars * 100,
      note: `${inForce.law.designation} set this office's salary to $${inForce.annualDollars.toLocaleString("en-US")} a year.`,
    };
  const role = workRoleAt(world, work.id, {
    ...currentLifeCutoff(world),
    asOfDate: onDate,
  });
  if (!inForce) {
    const recorded = recordedWorkAnnualPay(world, {
      occupation: role?.occupationClassification ?? null,
      workKind: work.kind,
      jurisdictionId: role?.locationJurisdictionId ?? null,
      weeklyHours: role ? weeklyHoursOf(role) : 0,
      onDate,
      excludeWorkId: work.id,
    });
    if (recorded) return recorded;
    if (!role?.locationJurisdictionId) return null;
    const tenure = Math.max(0, daysBetween(work.startedAt, onDate) / 365.25);
    // Use the existing tenure mechanism's central position, with no person draw.
    // Credential sizing remains the separate A40 contract, not an invented step.
    const rate = townJobRate(
      role.occupationClassification,
      role.locationJurisdictionId,
      townPayPercentile(tenure),
      townMinimumHourlyAt(world, role.locationJurisdictionId, onDate),
    );
    const hours = weeklyHoursOf(role);
    if (!rate || hours <= 0) return null;
    return {
      annualMinor: Math.round(rate.hourlyMinor * hours * 52),
      note: `Recorded ${hours} hours a week at $${(rate.hourlyMinor / 100).toFixed(2)} an hour; SOC ${rate.soc}, OEWS area ${rate.area}, ${Math.round(rate.percentile)}th percentile from recorded tenure.`,
    };
  }
  return inForce
    ? {
        annualMinor: inForce.annualDollars * 100,
        note:
          inForce.estimatedBecause ??
          `Salary for this office, published (The Book of the States 2023; Congressional Research Service 97-1011 for Congress).`,
      }
    : null;
}

function weeklyMinor(annualMinor: number): number {
  return Math.round(annualMinor / 52);
}

function salaryKey(work: WorkRelationship): string {
  return `office-salary:${work.id}`;
}

function isActiveOn(world: World, workId: EntityId, date: IsoDate): boolean {
  return (
    workStatusAt(world, workId, {
      ...currentLifeCutoff(world),
      asOfDate: date,
    })?.status === "active"
  );
}

/**
 * Open missing office salary agreements at the actual current date only.
 * This creates no payment and leaves every existing agreement unchanged.
 * Opening and monthly scheduling callers share the settlement writer's
 * eligibility and amount calculation; old saves are never backdated.
 */
export function initializeOfficeSalaryFlows(
  world: World,
  personId: EntityId,
): World {
  let next = world;
  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    if (work.personId !== personId || !work.organizationId) continue;
    if (!PAID_OFFICE_KINDS.includes(work.kind)) continue;
    if (work.compensation !== "paid" && work.compensation !== "mixed") continue;
    next = initializeOneSalaryFlow(next, work);
  }
  return next;
}

function initializeOneSalaryFlow(world: World, work: WorkRelationship): World {
  if (
    world.history.resourceFlows.some(
      (flow) =>
        flow.basisReference.kind === "work" &&
        flow.basisReference.workRelationshipId === work.id,
    ) ||
    !isActiveOn(world, work.id, world.currentDate)
  )
    return world;
  const pay = annualPay(world, work, world.currentDate);
  if (!pay) return world;
  const next = ensureLifePathPersonalPosition(
    world,
    work.personId,
    money(0, "USD").currency,
  );
  return createResourceFlow(next, officeSalaryInput(next, work, pay));
}

/** The office's actual saved public account pays when its ownership is recorded. */
function officeSalaryInput(
  world: World,
  work: WorkRelationship,
  pay: { annualMinor: number; note: string },
  accounts?: Map<EntityId, EntityId | null>,
): CreateResourceFlowInput {
  const held = paidOfficeOf(world, work);
  const jurisdiction =
    held?.state === "US"
      ? NATIONAL_ELECTION_JURISDICTION
      : held
        ? stateJurisdictionForKey(`US-${held.state}`)
        : null;
  let accountId = jurisdiction ? accounts?.get(jurisdiction.id) : undefined;
  if (jurisdiction && accountId === undefined) {
    accountId =
      publicTaxAccountForIdentity(world, {
        kind: "jurisdiction",
        jurisdictionId: jurisdiction.id,
      })?.organizationId ?? null;
    accounts?.set(jurisdiction.id, accountId);
  }
  return {
    stableKey: salaryKey(work),
    source: {
      kind: "organization",
      organizationId: accountId ?? work.organizationId!,
    },
    recipient: { kind: "person", personId: work.personId },
    startsAt: world.currentDate,
    amount: money(weeklyMinor(pay.annualMinor), "USD"),
    cadenceKind: "schedule:weekly",
    basisKind: "compensation:work",
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: null,
    jurisdictionId: jurisdiction?.id ?? null,
    provenance: { kind: "authored", note: pay.note },
  };
}

/** All actually recorded paid offices, including NPCs, share the existing salary agreement writer. */
export function initializeAllOfficeSalaryFlows(world: World): World {
  const existing = growingIndex(WORK_PAY_FLOWS, world.history.resourceFlows);
  const missing = growingIndex(
    OFFICE_WORK,
    world.history.workRelationships,
  ).filter(
    (work) =>
      !existing.has(work.id) &&
      paidOfficeOf(world, work) &&
      isActiveOn(world, work.id, world.currentDate),
  );
  if (missing.length === 0) return prepareOfficeSalaryReads(world);
  return advanceWithWorldIntegrityAtEnd(() => {
    let next = world;
    const inputs: CreateResourceFlowInput[] = [];
    const accounts = new Map<EntityId, EntityId | null>();
    for (const work of missing) {
      const pay = annualPay(world, work, world.currentDate);
      if (!pay) continue;
      next = ensureLifePathPersonalPosition(
        next,
        work.personId,
        money(0, "USD").currency,
      );
      inputs.push(officeSalaryInput(next, work, pay, accounts));
    }
    return prepareOfficeSalaryReads(createResourceFlows(next, inputs));
  }, world);
}

/** Calendar adapter only; every transfer still uses settleTownCompensations. */
export function settleAllOfficeSalaries(world: World): World {
  return advanceWithWorldIntegrityAtEnd(
    () =>
      withHistoryAppendTransaction(
        world,
        ["resourceFlows", "resourceFlowTerms"],
        (initial) => {
          let next = initializeAllOfficeSalaryFlows(initial);
          const summaries: { flow: ResourceFlow; onDate: IsoDate }[] = [];
          const periods: TownCompensationPeriod[] = [];
          for (const flow of growingIndex(
            OFFICE_PAY_FLOWS,
            next.history.resourceFlows,
          )) {
            if (flow.basisReference.kind !== "work") continue;
            const work = recordById(
              next.history.workRelationships,
              flow.basisReference.workRelationshipId,
            );
            if (!work) continue;
            if (!distantHistoricalRoutine(next, work.personId)) {
              periods.push(...dueOfficePeriods(next, work, flow));
              continue;
            }
            const last = growingIndex(
              LAST_RECORDED_PERIOD,
              next.history.resourceTransferOutcomes,
            ).get(flow.id);
            // No weekly history is authored for a distant routine. Close its own
            // recorded earnings once a year, or at the explicit Begin boundary.
            const closing = next.currentDate >= next.pastMode!.throughDate;
            const firstUnpaidDue = addDays(
              last ?? flow.startsAt,
              last === undefined ? WEEK_DAYS : WEEK_DAYS + WEEK_DAYS,
            );
            if (
              !closing &&
              firstUnpaidDue.slice(0, 4) >= next.currentDate.slice(0, 4)
            )
              continue;
            const due = dueOfficePeriods(next, work, flow).filter(
              (period) =>
                closing ||
                period.onDate.slice(0, 4) < next.currentDate.slice(0, 4),
            );
            const years = new Map<string, TownCompensationPeriod[]>();
            for (const period of due) {
              const year = period.onDate.slice(0, 4);
              const list = years.get(year) ?? [];
              list.push(period);
              years.set(year, list);
            }
            for (const list of years.values()) {
              const first = list[0]!;
              const final = list.at(-1)!;
              if (!historicalWorldInputs(first.onDate).historical) {
                periods.push(...list);
                continue;
              }
              const ownTerms = list.map((period) =>
                resourceFlowTermsAt(next, flow.id, {
                  asOfDate: period.periodStartsAt,
                  historySequenceExclusive: next.history.nextSequence,
                }),
              );
              const currency = ownTerms[0]?.amount.currency;
              if (
                !currency ||
                ownTerms.some(
                  (terms) =>
                    !terms ||
                    terms.status !== "active" ||
                    terms.amount.currency !== currency,
                )
              )
                throw new Error(
                  "Historical routine summary requires its job's recorded active terms.",
                );
              const provenance = {
                kind: "authored" as const,
                note: "ESTIMATED FROM AVERAGE: distant historical routine salary summarized from this job's recorded period terms; private goals and nearby residents use ordinary payroll.",
              };
              next = createResourceFlow(next, {
                stableKey: `past-office-summary-flow:${flow.id}:${first.periodStartsAt}:${final.periodEndsAt}`,
                source: flow.source,
                recipient: flow.recipient,
                startsAt: first.periodStartsAt,
                amount: money(
                  ownTerms.reduce(
                    (sum, terms) => sum + terms!.amount.minorUnits,
                    0,
                  ),
                  currency,
                ),
                cadenceKind: "schedule:annual",
                basisKind: "custom:historical-office-summary",
                basisReference: flow.basisReference,
                restrictionKind: flow.restrictionKind,
                jurisdictionId: flow.jurisdictionId,
                provenance,
              });
              const summaryFlow = next.history.resourceFlows.at(-1)!;
              summaries.push({ flow: summaryFlow, onDate: final.onDate });
              periods.push({
                ...first,
                payFlowId: summaryFlow.id,
                activityId: summaryFlow.id,
                stableKey: `past-office-summary:${flow.id}:${first.periodStartsAt}:${final.periodEndsAt}`,
                periodEndsAt: final.periodEndsAt,
                onDate: final.onDate,
                note: "Salary for the period.",
                provenance,
              });
            }
          }
          let settled = periods.length
            ? settleTownCompensations(next, periods)
            : next;
          for (const { flow, onDate } of summaries) {
            const terms = resourceFlowTermsAt(settled, flow.id)!;
            settled = recordResourceFlowTerms(settled, {
              stableKey: `${flow.stableKey}:closed`,
              resourceFlowId: flow.id,
              supersedesTermsId: terms.id,
              effectiveAt: onDate,
              status: "ended",
              reason:
                "The historical salary statement covers a completed period.",
              amount: terms.amount,
              cadenceKind: terms.cadenceKind,
              provenance: flow.provenance,
            });
          }
          return settled;
        },
      ),
    world,
  );
}

/** Read each flow's latest recorded period before the one common batch settlement. */
function dueOfficePeriods(
  world: World,
  work: WorkRelationship,
  flow: ResourceFlow,
): TownCompensationPeriod[] {
  const lastPeriod = growingIndex(
    LAST_RECORDED_PERIOD,
    world.history.resourceTransferOutcomes,
  ).get(flow.id);
  const paidWeeks =
    lastPeriod === undefined
      ? 0
      : Math.max(0, daysBetween(flow.startsAt, lastPeriod) / WEEK_DAYS + 1);
  const periods: TownCompensationPeriod[] = [];
  const weeksDue = Math.floor(
    daysBetween(flow.startsAt, world.currentDate) / WEEK_DAYS,
  );
  for (let week = paidWeeks + 1; week <= weeksDue; week += 1) {
    const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
    const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
    if (!isActiveOn(world, work.id, addDays(dueOn, -1))) break;
    if (
      !paidOfficeOf(world, work, {
        asOfDate: periodStartsAt,
        historySequenceExclusive: world.history.nextSequence,
      })
    )
      continue;
    periods.push({
      stableKey: `${flow.stableKey}:${periodStartsAt}`,
      payFlowId: flow.id,
      activityId: flow.id,
      periodStartsAt,
      periodEndsAt: addDays(dueOn, -1),
      onDate: dueOn,
      note: "Salary for the week.",
      provenance: flow.provenance,
    });
  }
  return periods;
}

/**
 * Pays every whole week of office salary that has come due, and stops.
 *
 * Idempotent: each week is keyed by the day it began and resumes after the
 * last one paid, so a second call or a reload writes nothing new.
 */
export function settleOfficeSalaries(world: World, personId: EntityId): World {
  let next = world;
  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    if (work.personId !== personId || !work.organizationId) continue;
    if (!PAID_OFFICE_KINDS.includes(work.kind)) continue;
    if (work.compensation !== "paid" && work.compensation !== "mixed") continue;
    next = settleOne(next, work);
  }
  return next;
}

function settleOne(world: World, work: WorkRelationship): World {
  const existing = growingIndex(
    WORK_PAY_FLOWS,
    world.history.resourceFlows,
  ).get(work.id);
  // Pay terms somebody else recorded are theirs; this only fills the gap.
  if (existing && existing.stableKey !== salaryKey(work)) return world;
  let next = world;
  if (!existing) return initializeOneSalaryFlow(world, work);
  const flow = existing;
  for (const period of dueOfficePeriods(next, work, flow))
    next = settleTownCompensations(next, [period]);
  return next;
}
