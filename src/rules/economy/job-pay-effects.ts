/** Complete retained adult-start employer/pay selection, first-job pay and weekly settlement/catch-up requests. */
import {
  ageOnDate,
  dateAtAge,
  addDays,
  daysBetween,
} from "../../simulation/dates";
import { governmentUnit } from "../../simulation/government-units";
import { governmentUnitDisplayName } from "../../simulation/nationwide-world/government-unit-names";
import { money } from "./cost-money";
import {
  townBusinesses as readBusinesses,
  type BusinessReadingFacts,
} from "./business-readings";
import {
  localBusinessWageMinor as readWage,
  type EmployerWageFacts,
} from "./employer-wage";
import {
  payAtHire as fairnessPay,
  UNCOVERED_PAY_NOTE,
  type PayJobFacts,
} from "./pay-jobs";
import {
  resourceFlowTermsAt,
  resourceFlowTermsHistory,
} from "./credential-pay";
import {
  settleTownCompensations as settleTown,
  type TownSettlementFacts,
  type TownSettlementRequest,
  type TownCompensationPeriod,
} from "./town-settlement";
import { payLawSourceKey } from "./law-pay-effects";
import type { JobListingFacts } from "./job-listings";
import type * as life from "../../simulation/life-queries";
import type { minimumWageSettingAt as nativeMinimum } from "../../simulation/minimum-wage";
import type { recordWorldEvent } from "../../simulation/world";
import type {
  createWorkRelationship,
  recordWorkStatus,
} from "../../simulation/life";
import type { ensureLifePathPersonalPosition } from "../../simulation/life-paths2-resources";
import type { createWorkCompensation } from "../../simulation/resources";
import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  WorkRelationship,
  Organization,
  OccupationClassification,
} from "../../simulation/types";
// STOPGAP: economy.job-pay-request-transport
export interface JobPayFacts extends TownSettlementFacts {
  readonly business: BusinessReadingFacts;
  readonly employerWage: EmployerWageFacts;
  readonly listing: JobListingFacts;
  readonly payStart: PayJobFacts;
  readonly active: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.activeWorkRelationshipsAt>
  >;
  readonly kin: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.kinshipRelationshipsAt>
  >;
  readonly homes: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.householdMembershipsAt>
  >;
  readonly minimum: ReadonlyMap<string, ReturnType<typeof nativeMinimum>>;
}
export type JobPayRequest =
  | TownSettlementRequest
  | {
      readonly kind: "recordWorldEvent";
      readonly input: Parameters<typeof recordWorldEvent>[1];
    }
  | {
      readonly kind: "createWorkRelationship";
      readonly input: Parameters<typeof createWorkRelationship>[1];
    }
  | {
      readonly kind: "recordWorkStatus";
      readonly input: Parameters<typeof recordWorkStatus>[1];
    }
  | {
      readonly kind: "ensureLifePathPersonalPosition";
      readonly input: readonly [
        EntityId,
        Parameters<typeof ensureLifePathPersonalPosition>[2],
      ];
    }
  | {
      readonly kind: "createWorkCompensation";
      readonly input: Parameters<typeof createWorkCompensation>[1];
    };
export const jobPaySourceKey = (...keys: unknown[]) => JSON.stringify(keys);
function currentLifeCutoff(facts: JobPayFacts) {
  return {
    asOfDate: facts.currentDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
function workStatusAt(
  facts: JobPayFacts,
  id: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(facts),
) {
  const row = facts.life.get(payLawSourceKey(id, cutoff));
  if (!row) throw Error("Missing raw job status");
  return row.status;
}
function workRoleAt(facts: JobPayFacts, id: EntityId) {
  return facts.listing.roles.get(id) ?? null;
}
function organizationProfileAt(facts: JobPayFacts, id: EntityId) {
  return facts.listing.profiles.get(id) ?? null;
}
function activeWorkRelationshipsAt(facts: JobPayFacts, id: EntityId) {
  if (!facts.active.has(id)) throw Error("Missing raw active work");
  return facts.active.get(id)!;
}
function kinshipRelationshipsAt(facts: JobPayFacts, id: EntityId) {
  if (!facts.kin.has(id)) throw Error("Missing raw kin");
  return facts.kin.get(id)!;
}
function householdMembershipsAt(facts: JobPayFacts, id: EntityId) {
  if (!facts.homes.has(id)) throw Error("Missing raw households");
  return facts.homes.get(id)!;
}
function townBusinesses(facts: JobPayFacts, id: EntityId) {
  return readBusinesses(facts.business, id);
}
function localBusinessWageMinor(
  kind: Parameters<typeof readWage>[1],
  id: EntityId | null,
  facts: JobPayFacts,
  workId?: EntityId,
) {
  return readWage(facts.employerWage, kind, id, workId);
}
function payAtHire(
  facts: JobPayFacts,
  input: Parameters<typeof fairnessPay>[1],
) {
  return fairnessPay(facts.payStart, input);
}
const FEDERAL_MINIMUM_HOURLY_MINOR = 725;
function minimumWageSettingAt(
  facts: JobPayFacts,
  id: EntityId | null,
  onDate: IsoDate,
) {
  const key = jobPaySourceKey(id, onDate);
  if (!facts.minimum.has(key))
    throw Error("Missing compiled legal minimum source");
  return facts.minimum.get(key)!;
}
function* settleTownCompensations(
  facts: JobPayFacts,
  periods: readonly TownCompensationPeriod[],
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  const gen = settleTown(facts, periods);
  let step = gen.next();
  while (!step.done) {
    facts = yield step.value;
    step = gen.next(facts);
  }
  return facts;
}
const PROVENANCE_NOTE =
  "Opening, answer and start timing are drawn from the estimated profile in job-market.ts; pay is read from the employer's own pay for the role.";
export const LEGACY_FIRST_JOB_WORK_KEY = "formative-play:first-job:work";
export const JOB_MARKET_WORK_KIND = "employment:job-market" as const;
const PAY_KEY_PREFIX = "job-pay:";
const WEEK_DAYS = 7;
const CATCH_UP_LIMIT_WEEKS = 520;
function activeRole(facts: JobPayFacts, work: WorkRelationship) {
  const roles = facts.records.workRoles.filter(
    (role) => role.workRelationshipId === work.id,
  );
  return roles.at(-1) ?? null;
}
export function employerDisplayName(
  facts: JobPayFacts,
  organizationId: EntityId,
): string {
  const organization = facts.records.organizations.find(
    (record) => record.id === organizationId,
  );
  const prefix = "local-government:";
  if (organization?.stableKey.startsWith(prefix)) {
    const unit = governmentUnit(organization.stableKey.slice(prefix.length));
    if (unit) return governmentUnitDisplayName(unit);
  }
  return organizationProfileAt(facts, organizationId)?.name ?? "The employer";
}
function organizationName(
  facts: JobPayFacts,
  organizationId: EntityId,
): string {
  return employerDisplayName(facts, organizationId);
}
function* note(
  facts: JobPayFacts,
  input: {
    readonly key: string;
    readonly type: string;
    readonly occurredAt: IsoDate;
    readonly personId: EntityId;
    readonly involved: readonly EntityId[];
    readonly jurisdictionId: EntityId | null;
    readonly summary: string;
    readonly decisionTraceId?: EntityId;
  },
): Generator<
  JobPayRequest,
  {
    facts: JobPayFacts;
    eventId: EntityId;
  },
  JobPayFacts
> {
  const next = yield {
    kind: "recordWorldEvent",
    input: {
      stableKey: `job-market:${input.key}:event`,
      type: `job-market.${input.type}`,
      occurredAt: input.occurredAt,
      recordedAt: facts.currentDate,
      jurisdictionId: input.jurisdictionId,
      involvedEntityIds: [...new Set([input.personId, ...input.involved])],
      participants: [
        {
          personId: input.personId,
          role: "agency:participant",
          detail: input.summary,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        "job-market",
        ...(input.decisionTraceId
          ? [`decision-trace:${input.decisionTraceId}`]
          : []),
      ],
      summary: input.summary,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: input.summary,
        motivation: null,
        immediateReaction: null,
      },
    },
  };
  return { facts: next, eventId: next.records.events.at(-1)!.id };
}
function* payWeekly(
  facts: JobPayFacts,
  personId: EntityId,
  workRelationshipId: EntityId,
  weeklyMinor: number,
  currency: string,
  note: string,
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  const stableKey = `${PAY_KEY_PREFIX}${workRelationshipId}`;
  if (facts.records.resourceFlows.some((row) => row.stableKey === stableKey))
    return facts;
  const amount = money(weeklyMinor, currency);
  const next = yield {
    kind: "ensureLifePathPersonalPosition",
    input: [personId, amount.currency],
  };
  return yield {
    kind: "createWorkCompensation",
    input: {
      stableKey,
      workRelationshipId,
      startsAt: next.currentDate,
      amount,
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance: { kind: "authored", note },
    },
  };
}
// STOPGAP: economy.job-hire-age-history
export function* hireAtAdultStart(
  facts: JobPayFacts,
  input: {
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
  },
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  const key = `adult-start-work-v1:${input.personId}`;
  if (facts.records.workRelationships.some((work) => work.stableKey === key))
    return facts;
  const person = facts.people[input.personId];
  if (!person || ageOnDate(person.birthDate, facts.currentDate) < 19)
    return facts;
  if (activeWorkRelationshipsAt(facts, person.id).length > 0) return facts;
  const employer = recordedTownEmployer(facts, person.id, input.jurisdictionId);
  if (!employer) return facts;
  const lastEnded = facts.records.workRelationships
    .filter((work) => work.personId === person.id)
    .flatMap((work) => {
      const status = workStatusAt(facts, work.id);
      return status?.status === "ended" ? [status.effectiveAt] : [];
    })
    .sort()
    .at(-1);
  const startedAt = [
    dateAtAge(person.birthDate, 18),
    employer.organization.formedAt,
    ...(lastEnded ? [addDays(lastEnded, 1)] : []),
  ]
    .sort()
    .at(-1)!;
  if (startedAt > facts.currentDate) return facts;
  const note =
    "A grown-up new life's job at a local business, chosen from the people they know, the work they did before and the town's pay.";
  const next = yield {
    kind: "createWorkRelationship",
    input: {
      stableKey: key,
      personId: person.id,
      organizationId: employer.organization.id,
      startedAt,
      initialStatus: "active",
      kind: JOB_MARKET_WORK_KIND,
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note },
      initialRole: {
        title: employer.kind.workerTitle,
        occupationClassification: employer.kind.workerOccupation,
        locationJurisdictionId: input.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 45 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: input.jurisdictionId,
        },
      },
    },
  };
  const work = next.records.workRelationships.at(-1)!;
  const monthly = localBusinessWageMinor(
    employer.kind,
    input.jurisdictionId,
    next,
    work.id,
  ).monthlyMinor;
  const weekly = weeklyPayAtHire(
    next,
    person.id,
    input.jurisdictionId,
    Math.round((monthly * 12) / 52),
    40,
  );
  return yield* payWeekly(
    next,
    person.id,
    work.id,
    weekly.weeklyMinor,
    "USD",
    `${note}${weekly.note}`,
  );
}
// STOPGAP: economy.job-legacy-weekly-cap-minimum
function weeklyPayAtHire(
  facts: JobPayFacts,
  personId: EntityId,
  jurisdictionId: EntityId | null,
  weeklyMinor: number,
  hours: number,
): {
  readonly weeklyMinor: number;
  readonly note: string;
} {
  const paid = payAtHire(facts, {
    personId,
    jobJurisdictionId: jurisdictionId,
    date: facts.currentDate,
    amountMinor: weeklyMinor,
    floorMinor:
      minimumHourlyMinorFor(facts, jurisdictionId, facts.currentDate) * hours,
  });
  return {
    weeklyMinor: paid.amountMinor,
    note: paid.belowRate ? ` Paid ${UNCOVERED_PAY_NOTE}.` : "",
  };
}
export function* leaveFirstJobFor(
  facts: JobPayFacts,
  personId: EntityId,
  newTitle: string,
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  const work = facts.records.workRelationships.find(
    (row) =>
      row.personId === personId && row.stableKey === LEGACY_FIRST_JOB_WORK_KEY,
  );
  const status = work ? workStatusAt(facts, work.id) : null;
  if (!work || status?.status !== "active") return facts;
  const ended = yield {
    kind: "recordWorkStatus",
    input: {
      stableKey: `${work.stableKey}:left:${facts.currentDate}`,
      workRelationshipId: work.id,
      effectiveAt: facts.currentDate,
      status: "ended",
      reason: `Left for work as ${newTitle.toLowerCase()}.`,
      provenance: { kind: "authored", note: PROVENANCE_NOTE },
      supersedesStatusId: status.id,
    },
  };
  const title = activeRole(facts, work)?.title ?? "first job";
  return (yield* note(ended, {
    key: `${work.stableKey}:left:${facts.currentDate}`,
    type: "first-job-left",
    occurredAt: facts.currentDate,
    personId,
    involved: [work.id, ...(work.organizationId ? [work.organizationId] : [])],
    jurisdictionId: null,
    summary: `You left your ${title.toLowerCase()} job${work.organizationId ? ` at ${organizationName(facts, work.organizationId)}` : ""} to work as ${newTitle.toLowerCase()}.`,
  })).facts;
}
function* retireSupersededFirstJob(
  facts: JobPayFacts,
  personId: EntityId,
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  const person = facts.people[personId];
  if (!person || ageOnDate(person.birthDate, facts.currentDate) < 18)
    return facts;
  const first = facts.records.workRelationships.find(
    (row) =>
      row.personId === personId && row.stableKey === LEGACY_FIRST_JOB_WORK_KEY,
  );
  if (!first || workStatusAt(facts, first.id)?.status !== "active")
    return facts;
  const later = facts.records.workRelationships.find(
    (row) =>
      row.personId === personId &&
      row.id !== first.id &&
      row.kind.startsWith("employment:") &&
      workStatusAt(facts, row.id)?.status === "active",
  );
  if (!later) return facts;
  return yield* leaveFirstJobFor(
    facts,
    personId,
    activeRole(facts, later)?.title ?? "another job",
  );
}
function minimumHourlyMinorFor(
  facts: JobPayFacts,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number {
  return (
    minimumWageSettingAt(facts, jurisdictionId, onDate)?.hourlyMinor ??
    FEDERAL_MINIMUM_HOURLY_MINOR
  );
}
function workplaceJurisdictionId(
  facts: JobPayFacts,
  work: WorkRelationship,
): EntityId | null {
  const role = activeRole(facts, work);
  return (
    role?.locationJurisdictionId ??
    role?.timeDemand.locationJurisdictionId ??
    (work.organizationId
      ? (organizationProfileAt(facts, work.organizationId)
          ?.locationJurisdictionId ?? null)
      : null) ??
    facts.people[work.personId]?.homeJurisdictionId ??
    null
  );
}
export function* payFirstJob(
  facts: JobPayFacts,
  personId: EntityId,
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  const work = facts.records.workRelationships.find(
    (row) =>
      row.personId === personId &&
      row.stableKey === LEGACY_FIRST_JOB_WORK_KEY &&
      row.compensation === "paid",
  );
  if (!work || workStatusAt(facts, work.id)?.status !== "active") return facts;
  const weekly = activeRole(facts, work)?.timeDemand.expectedWeekly;
  if (!weekly) return facts;
  const hours = Math.round((weekly.minimumHours + weekly.maximumHours) / 2);
  const hourlyMinor = minimumHourlyMinorFor(
    facts,
    workplaceJurisdictionId(facts, work),
    facts.currentDate,
  );
  return yield* payWeekly(
    facts,
    personId,
    work.id,
    hourlyMinor * hours,
    "USD",
    `A first job, paid weekly from ${facts.currentDate} for ${hours} hours at the minimum wage where it is, $${(hourlyMinor / 100).toFixed(2)} an hour.`,
  );
}
function payKey(work: WorkRelationship): string {
  return `${PAY_KEY_PREFIX}${work.id}`;
}
function isActiveOn(
  facts: JobPayFacts,
  workId: EntityId,
  date: IsoDate,
): boolean {
  return (
    workStatusAt(facts, workId, {
      ...currentLifeCutoff(facts),
      asOfDate: date,
    })?.status === "active"
  );
}
export function* settleJobPay(
  facts: JobPayFacts,
  personId: EntityId,
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  return yield* settleRecordedJobPay(
    yield* payFirstJob(
      yield* retireSupersededFirstJob(facts, personId),
      personId,
    ),
    personId,
    (flow, work) => flow.stableKey === payKey(work),
  );
}
// STOPGAP: economy.job-weekly-outcomes-advance-paid-weeks
function* settleRecordedJobPay(
  facts: JobPayFacts,
  personId: EntityId,
  accepts: (
    flow: JobPayFacts["records"]["resourceFlows"][number],
    work: WorkRelationship,
  ) => boolean,
  earliestDueExclusive?: IsoDate,
  isDueAllowed?: (dueOn: IsoDate) => boolean,
): Generator<JobPayRequest, JobPayFacts, JobPayFacts> {
  let next = facts;
  for (const work of next.records.workRelationships) {
    if (work.personId !== personId) continue;
    const flow = next.records.resourceFlows.find(
      (row) =>
        row.basisReference.kind === "work" &&
        row.basisReference.workRelationshipId === work.id &&
        accepts(row, work),
    );
    if (!flow) continue;
    if (
      !resourceFlowTermsHistory(next, flow.id).some(
        (terms) => terms.cadenceKind === "schedule:weekly",
      )
    )
      continue;
    let paidWeeks = 0;
    for (const outcome of next.records.resourceTransferOutcomes) {
      if (outcome.resourceFlowId !== flow.id) continue;
      const week =
        daysBetween(flow.startsAt, outcome.periodStartsAt) / WEEK_DAYS + 1;
      if (week > paidWeeks) paidWeeks = week;
    }
    const firstNewWeek =
      earliestDueExclusive && earliestDueExclusive >= flow.startsAt
        ? Math.floor(
            daysBetween(flow.startsAt, earliestDueExclusive) / WEEK_DAYS,
          ) + 1
        : 1;
    const firstWeek = Math.max(paidWeeks + 1, firstNewWeek);
    for (
      let week = firstWeek;
      week < firstWeek + CATCH_UP_LIMIT_WEEKS;
      week += 1
    ) {
      const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
      const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
      if (dueOn > next.currentDate) break;
      if (isDueAllowed && !isDueAllowed(dueOn)) break;
      if (!isActiveOn(next, work.id, addDays(dueOn, -1))) break;
      const terms = resourceFlowTermsAt(next, flow.id, {
        asOfDate: periodStartsAt,
        historySequenceExclusive: next.records.nextSequence,
      });
      if (terms?.status !== "active" || terms.cadenceKind !== "schedule:weekly")
        break;
      next = yield* settleTownCompensations(next, [
        {
          stableKey: `${flow.stableKey}:${periodStartsAt}`,
          payFlowId: flow.id,
          activityId: flow.id,
          periodStartsAt,
          periodEndsAt: addDays(dueOn, -1),
          onDate: dueOn,
          note: "Pay for the week.",
        },
      ]);
    }
  }
  return next;
}
export // STOPGAP: economy.job-employer-source-ranking
function recordedTownEmployer(
  facts: JobPayFacts,
  personId: EntityId,
  jurisdictionId: EntityId,
): {
  organization: Organization;
  kind: {
    readonly workerTitle: string;
    readonly workerOccupation: OccupationClassification;
    readonly workerRelationshipId: EntityId;
  };
} | null {
  if (!facts.people[personId]) return null;
  const past = facts.records.workRelationships.filter(
    (work) => work.personId === personId,
  );
  const fit = townBusinesses(facts, jurisdictionId).flatMap((business) => {
    const organization = facts.records.organizations.find(
      (record) => record.id === business.organizationId,
    );
    if (!organization || organization.formedAt > facts.currentDate) return [];
    const seen = new Set<string>();
    return business.jobs.flatMap((job) => {
      const work = facts.records.workRelationships.find(
        (record) => record.id === job.relationshipId,
      );
      const role = workRoleAt(facts, job.relationshipId);
      if (
        !work ||
        work.startedAt > facts.currentDate ||
        work.compensation !== "paid" ||
        job.directsOthers ||
        !role ||
        !role.occupationClassification ||
        role.occupationClassification.startsWith("profession:") ||
        role.locationJurisdictionId !== jurisdictionId
      )
        return [];
      const kind = {
        workerTitle: role.title,
        workerOccupation: role.occupationClassification,
        workerRelationshipId: work.id,
      };
      if (!localBusinessWageMinor(kind, jurisdictionId, facts).sourced)
        return [];
      const key = JSON.stringify(kind);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ organization, kind }];
    });
  });
  if (fit.length === 0) return null;
  const known = new Set<EntityId>();
  for (const kin of kinshipRelationshipsAt(facts, personId))
    for (const id of kin.personIds) if (id !== personId) known.add(id);
  const homes = new Set(
    householdMembershipsAt(facts, personId).map((entry) => entry.household.id),
  );
  for (const record of facts.records.householdMemberships)
    if (record.personId !== personId && homes.has(record.householdId))
      known.add(record.personId);
  const vouched = fit.filter(({ organization }) =>
    [...known].some(
      (id) =>
        facts.people[id] &&
        activeWorkRelationshipsAt(facts, id).some(
          (entry) => entry.relationship.organizationId === organization.id,
        ),
    ),
  );
  const lines = new Set(
    past.flatMap((work) => {
      const occupation = workRoleAt(facts, work.id)?.occupationClassification;
      return occupation ? [occupation.split(":")[0]!] : [];
    }),
  );
  const experienced = fit.filter(({ kind }) =>
    lines.has(kind.workerOccupation.split(":")[0]!),
  );
  const pool =
    vouched.length > 0 ? vouched : experienced.length > 0 ? experienced : fit;
  const pay = (kind: { readonly workerOccupation: OccupationClassification }) =>
    localBusinessWageMinor(kind, jurisdictionId, facts).monthlyMinor;
  return [...pool].sort(
    (left, right) =>
      pay(right.kind) - pay(left.kind) ||
      left.organization.id.localeCompare(right.organization.id),
  )[0]!;
}
