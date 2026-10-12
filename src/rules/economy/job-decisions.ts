/** Full retained application admission, applicant ordering, offers/lapse/missed start and event/step requests. */
import { addDays, ageOnDate, daysBetween } from "../../simulation/dates";
import { governmentUnit } from "../../simulation/government-units";
import { governmentUnitDisplayName } from "../../simulation/nationwide-world/government-unit-names";
import type * as life from "../../simulation/life-queries";
import type { recordWorldEvent } from "../../simulation/world";
import type { World, EntityId, IsoDate } from "../../simulation/types";
import type {
  JobOpeningRecord,
  JobApplicationRecord,
  JobApplicationStepRecord,
  JobApplicationStepKind,
  JobPayTerms,
} from "../../simulation/job-market-types";
export interface JobDecisionFacts {
  readonly id: EntityId;
  readonly currentDate: IsoDate;
  readonly records: World["history"];
  readonly people: World["people"];
  readonly control: World["control"];
  readonly work: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.activeWorkRelationshipsAt>
  >;
  readonly statuses: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.workStatusAt>
  >;
  readonly profiles: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.organizationProfileAt>
  >;
  readonly closings: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.organizationClosingAt>
  >;
  readonly alive: ReadonlyMap<EntityId, boolean>;
}
export type JobDecisionRequest =
  | {
      readonly kind: "recordWorldEvent";
      readonly input: Parameters<typeof recordWorldEvent>[1];
    }
  | {
      readonly kind: "appendApplicationStep";
      readonly input: Omit<JobApplicationStepRecord, "id" | "sequence">;
    };
function receipt<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key)) throw Error("Missing life application receipt: " + key);
  return map.get(key)!;
}
function activeWorkRelationshipsAt(facts: JobDecisionFacts, id: EntityId) {
  return receipt(facts.work, id);
}
function workStatusAt(facts: JobDecisionFacts, id: EntityId) {
  return receipt(facts.statuses, id);
}
function organizationProfileAt(facts: JobDecisionFacts, id: EntityId) {
  return receipt(facts.profiles, id);
}
function organizationClosingAt(facts: JobDecisionFacts, id: EntityId) {
  return receipt(facts.closings, id);
}
function currentLifeCutoff(facts: JobDecisionFacts) {
  return {
    asOfDate: facts.currentDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
function isPersonAliveAt(
  facts: JobDecisionFacts,
  id: EntityId,
  _cutoff: ReturnType<typeof currentLifeCutoff>,
) {
  void _cutoff;
  return receipt(facts.alive, id);
}
export const JOB_TIMING = {
  recruitmentWindowDays: { minimum: 7, maximum: 28 },
  offerReplyDays: { minimum: 3, maximum: 7 },
} as const;
export const JOB_MARKET_TIMING_ESTIMATE = {
  researchQuestionId: "job-market-calibration",
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "Bureau of Labor Statistics Job Openings and Labor Turnover Survey hiring timing; 30 full-time hours from the Affordable Care Act",
  offerSpread: 0.08,
  decisionDays: { minimum: 2, maximum: 7 },
  startLeadDays: { minimum: 1, maximum: 7 },
  missedStartGraceDays: 2,
  followUpStartDays: { minimum: 3, maximum: 7 },
  fullTimeHours: 30,
} as const;
export const MINIMUM_APPLICANT_AGE = 16;
const SPOKEN_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
export function spoken(date: IsoDate | null): string {
  return date ? SPOKEN_DATE.format(new Date(`${date}T00:00:00Z`)) : "";
}
export function employerDisplayName(
  facts: JobDecisionFacts,
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
  facts: JobDecisionFacts,
  organizationId: EntityId,
): string {
  return employerDisplayName(facts, organizationId);
}
function* note(
  facts: JobDecisionFacts,
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
  JobDecisionRequest,
  {
    facts: JobDecisionFacts;
    eventId: EntityId;
  },
  JobDecisionFacts
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
export function jobOpening(
  facts: JobDecisionFacts,
  openingId: EntityId,
): JobOpeningRecord | null {
  return facts.records.jobOpenings?.find((row) => row.id === openingId) ?? null;
}
export function applicationSteps(
  facts: JobDecisionFacts,
  applicationId: EntityId,
): readonly JobApplicationStepRecord[] {
  return (facts.records.jobApplicationSteps ?? []).filter(
    (row) => row.applicationId === applicationId,
  );
}
export function latestApplicationStep(
  facts: JobDecisionFacts,
  applicationId: EntityId,
): JobApplicationStepRecord | null {
  return applicationSteps(facts, applicationId).at(-1) ?? null;
}
export function openingFilled(
  facts: JobDecisionFacts,
  openingId: EntityId,
): boolean {
  return (facts.records.jobApplications ?? []).some(
    (application) =>
      application.openingId === openingId &&
      applicationSteps(facts, application.id).some(
        (step) => step.kind === "started",
      ),
  );
}
export function openingTakesApplications(
  facts: JobDecisionFacts,
  opening: JobOpeningRecord,
): boolean {
  return (
    opening.opensAt <= facts.currentDate &&
    facts.currentDate <= opening.closesAt &&
    !openingFilled(facts, opening.id) &&
    !organizationClosingAt(facts, opening.organizationId)
  );
}
export function applicationsFor(
  facts: JobDecisionFacts,
  personId: EntityId,
): readonly JobApplicationRecord[] {
  return (facts.records.jobApplications ?? []).filter(
    (application) => application.personId === personId,
  );
}
function isPlayed(facts: JobDecisionFacts, personId: EntityId): boolean {
  return facts.control.kind === "person" && facts.control.personId === personId;
}
// STOPGAP: economy.job-decision-admission-frontier
function applicantCanAct(
  facts: JobDecisionFacts,
  personId: EntityId,
): string | null {
  const person = facts.people[personId];
  if (!person) return "This person is not in the world.";
  if (!isPersonAliveAt(facts, personId, currentLifeCutoff(facts)))
    return "This person is no longer living.";
  if (ageOnDate(person.birthDate, facts.currentDate) < MINIMUM_APPLICANT_AGE)
    return `Employers here take applicants who are ${MINIMUM_APPLICANT_AGE} or older.`;
  return null;
}
function residentCanAct(
  facts: JobDecisionFacts,
  personId: EntityId,
): string | null {
  if (isPlayed(facts, personId))
    return "The person being played applies for themselves.";
  return applicantCanAct(facts, personId);
}
function residentName(facts: JobDecisionFacts, personId: EntityId): string {
  const person = facts.people[personId];
  return person ? `${person.givenName} ${person.familyName}` : "They";
}
function openingBlocked(
  facts: JobDecisionFacts,
  personId: EntityId,
  openingId: EntityId,
): string | null {
  const opening = jobOpening(facts, openingId);
  if (!opening || !openingTakesApplications(facts, opening)) return "Closed";
  if (
    applicationsFor(facts, personId).some(
      (application) => application.openingId === openingId,
    )
  )
    return "Already applied";
  if (
    activeWorkRelationshipsAt(facts, personId).some(
      (entry) => entry.relationship.organizationId === opening.organizationId,
    )
  )
    return "Works here";
  return null;
}
export function residentApplicationBlocked(
  facts: JobDecisionFacts,
  personId: EntityId,
  openingId: EntityId,
): string | null {
  return (
    residentCanAct(facts, personId) ??
    openingBlocked(facts, personId, openingId)
  );
}
// STOPGAP: economy.job-decision-event-step-receipts
function* addStep(
  facts: JobDecisionFacts,
  application: JobApplicationRecord,
  step: {
    readonly kind: JobApplicationStepKind;
    readonly occurredAt: IsoDate;
    readonly reason?: string | null;
    readonly replyBy?: IsoDate | null;
    readonly startAt?: IsoDate | null;
    readonly agreedWeeklyHours?: number | null;
    readonly workRelationshipId?: EntityId | null;
    readonly summary: string;
    readonly decisionTraceId?: EntityId;
  },
): Generator<JobDecisionRequest, JobDecisionFacts, JobDecisionFacts> {
  const index = applicationSteps(facts, application.id).length;
  const stableKey = `${application.stableKey}:step:${index}:${step.kind}`;
  const opening = jobOpening(facts, application.openingId)!;
  const noted = yield* note(facts, {
    key: stableKey,
    type: step.kind,
    occurredAt: step.occurredAt,
    personId: application.personId,
    involved: [
      opening.organizationId,
      ...(step.workRelationshipId ? [step.workRelationshipId] : []),
    ],
    jurisdictionId: opening.jurisdictionId,
    summary: step.summary,
    ...(step.decisionTraceId ? { decisionTraceId: step.decisionTraceId } : {}),
  });
  return yield {
    kind: "appendApplicationStep",
    input: {
      stableKey,
      applicationId: application.id,
      kind: step.kind,
      occurredAt: step.occurredAt,
      reason: step.reason ?? null,
      replyBy: step.replyBy ?? null,
      startAt: step.startAt ?? null,
      agreedWeeklyHours: step.agreedWeeklyHours ?? null,
      workRelationshipId: step.workRelationshipId ?? null,
      eventId: noted.eventId,
    },
  };
}
export function expectedStart(
  facts: JobDecisionFacts,
  applicationId: EntityId,
): IsoDate | null {
  const step = [...applicationSteps(facts, applicationId)]
    .reverse()
    .find((row) => row.kind === "offered" || row.kind === "followed-up");
  return step?.startAt ?? null;
}
export function payPhrase(pay: JobPayTerms): string {
  const dollars = pay.amount.minorUnits / 100;
  if (pay.basis === "annual-salary")
    return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })} a year`;
  const amount = `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return pay.basis === "per-shift" ? `${amount} a shift` : `${amount} an hour`;
}
function holdsFullTimeWork(
  facts: JobDecisionFacts,
  personId: EntityId,
): boolean {
  return activeWorkRelationshipsAt(facts, personId).some(
    (entry) =>
      entry.relationship.kind.startsWith("employment:") &&
      entry.relationship.kind !== "employment:education" &&
      entry.role.timeDemand.expectedWeekly.minimumHours >=
        JOB_MARKET_TIMING_ESTIMATE.fullTimeHours,
  );
}
export function holdsWork(
  facts: JobDecisionFacts,
  personId: EntityId,
): boolean {
  return activeWorkRelationshipsAt(facts, personId).some(
    (entry) =>
      entry.relationship.kind.startsWith("employment:") &&
      entry.relationship.kind !== "employment:education",
  );
}
export function daysInLine(
  facts: JobDecisionFacts,
  personId: EntityId,
  opening: Pick<JobOpeningRecord, "title" | "occupationClassification">,
  on: IsoDate,
): number {
  let days = 0;
  for (const work of facts.records.workRelationships) {
    if (work.personId !== personId || work.startedAt > on) continue;
    if (!work.kind.startsWith("employment:")) continue;
    const inLine = facts.records.workRoles.some(
      (role) =>
        role.workRelationshipId === work.id &&
        (role.title === opening.title ||
          (opening.occupationClassification !== null &&
            role.occupationClassification ===
              opening.occupationClassification)),
    );
    if (!inLine) continue;
    const status = workStatusAt(facts, work.id);
    const endedAt =
      status?.status === "ended" && status.effectiveAt < on
        ? status.effectiveAt
        : on;
    days += Math.max(0, daysBetween(work.startedAt, endedAt));
  }
  return days;
}
const OUT_OF_THE_RUNNING: ReadonlySet<JobApplicationStepKind> = new Set([
  "declined",
  "refused",
  "offer-lapsed",
  "withdrawn",
]);
// STOPGAP: economy.job-decision-ranking-window
function betterPlaced(
  facts: JobDecisionFacts,
  opening: JobOpeningRecord,
  on: IsoDate,
  a: JobApplicationRecord,
  b: JobApplicationRecord,
): boolean {
  const daysA = daysInLine(facts, a.personId, opening, on);
  const daysB = daysInLine(facts, b.personId, opening, on);
  if (daysA !== daysB) return daysA > daysB;
  if (a.route !== b.route) return a.route === "introduced";
  if (a.submittedAt !== b.submittedAt) return a.submittedAt < b.submittedAt;
  return a.personId < b.personId;
}
function rivalsFor(
  facts: JobDecisionFacts,
  application: JobApplicationRecord,
  on: IsoDate,
): readonly JobApplicationRecord[] {
  return (facts.records.jobApplications ?? []).filter(
    (other) =>
      other.openingId === application.openingId &&
      other.id !== application.id &&
      other.personId !== application.personId &&
      other.submittedAt <= on,
  );
}
// STOPGAP: economy.job-decision-native-English
function* decide(
  facts: JobDecisionFacts,
  application: JobApplicationRecord,
): Generator<JobDecisionRequest, JobDecisionFacts, JobDecisionFacts> {
  const opening = jobOpening(facts, application.openingId)!;
  const employer = organizationName(facts, opening.organizationId);
  const on = application.decisionAt;
  const played = isPlayed(facts, application.personId);
  const name = residentName(facts, application.personId);
  if (
    opening.weeklyHours.minimumHours >=
      JOB_MARKET_TIMING_ESTIMATE.fullTimeHours &&
    holdsFullTimeWork(facts, application.personId)
  )
    return yield* addStep(facts, application, {
      kind: "declined",
      occurredAt: on,
      reason: played
        ? "They wanted someone free to work these hours, and you already hold a full-time job."
        : `They wanted someone free to work these hours, and ${name} already holds a full-time job.`,
      summary: played
        ? `${employer} turned down your application: they wanted someone free for full-time hours, and you already work full time.`
        : `${employer} turned down ${name}'s application: they wanted someone free for full-time hours.`,
    });
  const rivals = rivalsFor(facts, application, on).filter((other) => {
    const latest = latestApplicationStep(facts, other.id);
    return !latest || !OUT_OF_THE_RUNNING.has(latest.kind);
  });
  const chosen =
    rivals.find((other) => latestApplicationStep(facts, other.id) !== null) ??
    rivals.find((other) =>
      betterPlaced(facts, opening, on, other, application),
    );
  if (chosen)
    return yield* addStep(facts, application, {
      kind: "declined",
      occurredAt: on,
      reason: "They chose another applicant.",
      summary: played
        ? `${employer} chose another applicant for the ${opening.title.toLowerCase()} job.`
        : `${employer} chose another applicant over ${name} for the ${opening.title.toLowerCase()} job.`,
    });
  const leaving = holdsWork(facts, application.personId);
  const replyBy = addDays(
    on,
    opening.pay.basis === "annual-salary"
      ? JOB_TIMING.offerReplyDays.maximum
      : JOB_TIMING.offerReplyDays.minimum,
  );
  const leadStart = addDays(
    replyBy,
    leaving
      ? JOB_MARKET_TIMING_ESTIMATE.startLeadDays.maximum
      : JOB_MARKET_TIMING_ESTIMATE.startLeadDays.minimum,
  );
  const startAt =
    opening.earliestStartAt && opening.earliestStartAt > leadStart
      ? opening.earliestStartAt
      : leadStart;
  const agreedWeeklyHours =
    opening.pay.basis === "hourly"
      ? leaving
        ? opening.weeklyHours.minimumHours
        : opening.weeklyHours.maximumHours
      : null;
  return yield* addStep(facts, application, {
    kind: "offered",
    occurredAt: on,
    replyBy,
    startAt,
    agreedWeeklyHours,
    summary: `${employer} offered ${played ? "you" : name} the ${opening.title.toLowerCase()} job at ${payPhrase(opening.pay)}${agreedWeeklyHours ? `, ${agreedWeeklyHours} hours a week` : ""}, starting ${spoken(startAt)}. They asked for an answer by ${spoken(replyBy)}.`,
  });
}
function* advanceApplication(
  facts: JobDecisionFacts,
  application: JobApplicationRecord,
): Generator<JobDecisionRequest, JobDecisionFacts, JobDecisionFacts> {
  let next = facts;
  for (let guard = 0; guard < 6; guard += 1) {
    const latest = latestApplicationStep(next, application.id);
    const opening = jobOpening(next, application.openingId)!;
    const employer = organizationName(next, opening.organizationId);
    const today = next.currentDate;
    const played = isPlayed(next, application.personId);
    const who = played ? "you" : residentName(next, application.personId);
    if (!latest) {
      if (today < application.decisionAt) return next;
      next = yield* decide(next, application);
      continue;
    }
    if (latest.kind === "offered") {
      if (today <= latest.replyBy!) return next;
      next = yield* addStep(next, application, {
        kind: "offer-lapsed",
        occurredAt: addDays(latest.replyBy!, 1),
        summary: `${employer}'s offer lapsed: ${who} did not answer by ${spoken(latest.replyBy)}.`,
      });
      continue;
    }
    if (latest.kind === "accepted" || latest.kind === "followed-up") {
      const startAt = expectedStart(next, application.id)!;
      const missedOn = addDays(
        startAt,
        JOB_MARKET_TIMING_ESTIMATE.missedStartGraceDays,
      );
      if (today <= missedOn) return next;
      const occurredAt = addDays(missedOn, 1);
      const followUp =
        latest.kind === "accepted" &&
        (application.route === "introduced" ||
          rivalsFor(next, application, occurredAt).length === 0);
      if (followUp) {
        const newStart = addDays(
          occurredAt,
          holdsWork(next, application.personId)
            ? JOB_MARKET_TIMING_ESTIMATE.followUpStartDays.maximum
            : JOB_MARKET_TIMING_ESTIMATE.followUpStartDays.minimum,
        );
        next = yield* addStep(next, application, {
          kind: "followed-up",
          occurredAt,
          startAt: newStart,
          reason: played
            ? `You did not come in on ${spoken(startAt)}.`
            : `${who} did not come in on ${spoken(startAt)}.`,
          summary: played
            ? `${employer} called when you did not come in on ${spoken(startAt)}. They still want you and asked you to start on ${spoken(newStart)}.`
            : `${employer} called when ${who} did not come in on ${spoken(startAt)} and asked them to start on ${spoken(newStart)}.`,
        });
        continue;
      }
      next = yield* addStep(next, application, {
        kind: "withdrawn",
        occurredAt,
        reason:
          latest.kind === "followed-up"
            ? `${played ? "You" : who} missed the second start date, ${spoken(startAt)}.`
            : `${played ? "You" : who} did not come in on ${spoken(startAt)}.`,
        summary:
          latest.kind === "followed-up"
            ? `${employer} withdrew the offer after ${who} missed the second start date, ${spoken(startAt)}.`
            : `${employer} withdrew the offer when ${who} did not come in on ${spoken(startAt)}.`,
      });
      continue;
    }
    return next;
  }
  return next;
}
export function* advanceApplications(
  facts: JobDecisionFacts,
  personId: EntityId,
): Generator<JobDecisionRequest, JobDecisionFacts, JobDecisionFacts> {
  let next = facts;
  for (const application of applicationsFor(next, personId))
    next = yield* advanceApplication(next, application);
  return next;
}
