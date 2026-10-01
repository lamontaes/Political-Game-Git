import { simulationMinutesBetween } from "../dates";
import { eventById } from "../event-index";
import { lawInForce } from "../governing/law-in-force";
import {
  hasStableKey,
  recordById,
  recordsWithFieldValue,
} from "../history-index";
import { standingCrisisAuthority } from "../crisis-standing-appropriations";
import {
  organizationParticipationStateAt,
  organizationProfileAt,
} from "../life-queries";
import { lawEffectStamp } from "../law-effect-stamp";
import { personName } from "../people";
import { publicProgramRecords } from "../public-program-integrity";
import { scheduledActivityState } from "../time-work";
import { recordWorldEvent } from "../world";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedAnyLawConsequence,
  ResolvedLawConsequence,
  ResolvedStandingServiceConsequence,
  StandingProgramAuthority,
} from "../law-consequence-types";
import type { EntityId, PublicProgramRecord, World } from "../types";

import {
  SERVICE_SELECTOR,
  SERVICE_ACTION,
  SERVICE_HOURS,
  FUNDED_SERVICE,
  SERVICE_RECIPIENT_KIND,
  SERVICE_DELIVERED_LAW_ROWS,
  standingServiceProgram,
} from "./service-delivered-data";

export {
  SERVICE_SELECTOR,
  SERVICE_ACTION,
  SERVICE_HOURS,
  FUNDED_SERVICE,
  SERVICE_RECIPIENT_KIND,
  SERVICE_DELIVERED_LAW_ROWS,
} from "./service-delivered-data";

/** Payment is funding evidence; only an actual completed participant activity is delivery. */
const programIndex = new WeakMap<
  readonly PublicProgramRecord[],
  {
    commitments: Map<
      EntityId,
      Extract<PublicProgramRecord, { kind: "commitment" }>
    >;
    installments: Map<
      EntityId,
      Extract<PublicProgramRecord, { kind: "installment" }>[]
    >;
  }
>();

function indexedPrograms(world: World) {
  const records = publicProgramRecords(world);
  let index = programIndex.get(records);
  if (!index) {
    index = { commitments: new Map(), installments: new Map() };
    for (const record of records) {
      if (record.kind === "commitment")
        index.commitments.set(record.eventId, record);
      if (record.kind === "installment") {
        const group = index.installments.get(record.commitmentId) ?? [];
        group.push(record);
        index.installments.set(record.commitmentId, group);
      }
    }
    programIndex.set(records, index);
  }
  return index;
}

function validServiceRow(row: LawConsequenceRow): boolean {
  if (
    row.kind !== "service-delivered" ||
    row.when !== "service" ||
    row.who.selector !== SERVICE_SELECTOR ||
    row.what !== SERVICE_ACTION ||
    row.decision ||
    row.lag.days !== 0 ||
    row.amount?.op !== "record" ||
    row.amount.key !== SERVICE_HOURS ||
    row.amount.unit !== "hours" ||
    row.who.predicates.length !== 0 ||
    row.conditions.length !== 1
  )
    return false;
  const condition = row.conditions[0]!;
  return (
    condition.capability === FUNDED_SERVICE &&
    Object.keys(condition.parameters).length === 0
  );
}

/** The saved completed activity, its completion event and its length. */
function completedServiceActivity(
  world: World,
  context: LawConsequenceContext,
) {
  const activity = recordById(
    world.history.scheduledActivities,
    context.activityId,
  );
  if (!activity || !activity.location.jurisdictionId) return null;
  const state = scheduledActivityState(world, activity.id);
  if (state.status !== "completed" || !state.outcomeEventId) return null;
  const completion = eventById(world, state.outcomeEventId);
  if (
    !completion ||
    completion.type !== "schedule.activity-completed" ||
    completion.occurredAt !== context.onDate ||
    completion.occurredAt > world.currentDate ||
    !completion.involvedEntityIds.includes(activity.id) ||
    completion.jurisdictionId !== activity.location.jurisdictionId
  )
    return null;
  const minutes = simulationMinutesBetween(state.start, state.end);
  if (!(minutes > 0) || !Number.isFinite(minutes)) return null;
  return {
    activity,
    state,
    completion,
    minutes,
    jurisdictionId: activity.location.jurisdictionId,
  };
}

type CompletedService = NonNullable<
  ReturnType<typeof completedServiceActivity>
>;
type AppropriationRecord = Extract<
  PublicProgramRecord,
  { kind: "appropriation" }
>;
type CommitmentRecord = Extract<PublicProgramRecord, { kind: "commitment" }>;

/**
 * The completed activity's named recipients, through the first commitment it
 * cites whose appropriation `accepts` and whose operating installment was
 * actually paid by the day of the activity. Shared by an enacted service law
 * and a standing service appropriation: payment and completion are the same
 * facts either way.
 */
function paidServiceRecipients(
  world: World,
  done: CompletedService,
  context: LawConsequenceContext,
  accepts: (
    appropriation: AppropriationRecord,
    commitment: CommitmentRecord,
  ) => boolean,
) {
  const { activity, state, completion, jurisdictionId } = done;
  const records = publicProgramRecords(world);
  const index = indexedPrograms(world);
  for (const sourceId of activity.sourceEntityIds) {
    const commitment = index.commitments.get(sourceId);
    if (
      !commitment ||
      commitment.jurisdictionId !== jurisdictionId ||
      !commitment.recipientOrganizationId
    )
      continue;
    const appropriation = recordById(records, commitment.appropriationId);
    if (
      !appropriation ||
      appropriation.kind !== "appropriation" ||
      appropriation.programKey !== commitment.programKey ||
      appropriation.jurisdictionId !== jurisdictionId ||
      appropriation.availableFrom > context.onDate ||
      appropriation.availableThrough < context.onDate ||
      !accepts(appropriation, commitment)
    )
      continue;
    for (const installment of index.installments.get(commitment.id) ?? []) {
      const plan = commitment.installments[installment.installmentIndex];
      if (
        installment.status !== "posted" ||
        !installment.resourceFlowId ||
        !plan ||
        plan.purpose !== "operating" ||
        installment.recordedAt > context.onDate
      )
        continue;
      const flow = recordById(
        world.history.resourceFlows,
        installment.resourceFlowId,
      );
      if (
        !flow ||
        flow.source.kind !== "organization" ||
        flow.source.organizationId !== appropriation.accountOrganizationId ||
        flow.recipient.kind !== "organization" ||
        flow.recipient.organizationId !== commitment.recipientOrganizationId ||
        flow.basisReference.kind !== "public-program" ||
        flow.basisReference.commitmentId !== commitment.id ||
        flow.basisReference.installmentIndex !== installment.installmentIndex
      )
        continue;
      const payment = recordsWithFieldValue(
        world.history.resourceTransferOutcomes,
        "resourceFlowId",
        flow.id,
      ).find(
        (outcome) =>
          outcome.resourceFlowId === flow.id &&
          (outcome.status === "completed" || outcome.status === "partial") &&
          outcome.transferredAmount.minorUnits > 0 &&
          outcome.transferredAmount.currency === plan.amount.currency &&
          outcome.occurredAt <= context.onDate,
      );
      if (!payment) continue;
      const participantIds = new Set(
        completion.participants
          .filter((participant) => participant.role === "presence:participant")
          .map((participant) => participant.personId),
      );
      const recipients = new Map(
        context.subjectIds.map((id) => [
          id,
          activity.sourceEntityIds
            .map((source) =>
              recordById(world.history.organizationParticipations, source),
            )
            .find(
              (recipient) =>
                recipient?.personId === id &&
                recipient.organizationId ===
                  commitment.recipientOrganizationId &&
                recipient.kind === SERVICE_RECIPIENT_KIND &&
                recipient.startedAt <= context.onDate &&
                organizationParticipationStateAt(world, recipient.id, {
                  asOfDate: context.onDate,
                  historySequenceExclusive: world.history.nextSequence,
                })?.status === "active",
            ),
        ]),
      );
      return [...new Set(context.subjectIds)]
        .filter(
          (id) =>
            !!world.people[id] &&
            activity.participantPersonIds.includes(id) &&
            participantIds.has(id) &&
            !!recipients.get(id),
        )
        .map((id) => ({
          subject: { kind: "person" as const, id },
          sourceRecordIds: [
            activity.id,
            state.id,
            completion.id,
            id,
            recipients.get(id)!.id,
            commitment.id,
            commitment.eventId,
            appropriation.id,
            appropriation.eventId,
            installment.id,
            flow.id,
            payment.id,
            commitment.recipientOrganizationId!,
          ],
          value: {
            type: "amount" as const,
            value: done.minutes / 60,
            unit: "hours" as const,
          },
        }));
    }
  }
  return [];
}

export function resolveLawServiceConsequence(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    !validServiceRow(row) ||
    context.activity !== "service" ||
    !context.questionKey
  )
    return [];
  const done = completedServiceActivity(world, context);
  if (!done) return [];
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === context.questionKey,
  );
  if (!proposition) return [];
  const jurisdictionId = done.jurisdictionId;
  const law = lawInForce(world, jurisdictionId, proposition.id, context.onDate);
  if (
    !law ||
    law.answer !== "yes" ||
    (context.governingLawId && context.governingLawId !== law.measureId)
  )
    return [];
  return paidServiceRecipients(
    world,
    done,
    context,
    (appropriation) => appropriation.sourceMeasureId === law.measureId,
  ).map((paid) => ({
    row,
    law,
    questionKey: context.questionKey!,
    jurisdictionId,
    activityId: done.activity.id,
    effectiveAt: context.onDate,
    ...paid,
  }));
}

/**
 * Standing authority: a completed visit paid for out of a standing, sourced
 * appropriation of a service program (988 crisis response). The operator must
 * be a kind of organization that can provide that service; the appropriation
 * is read through the program's own authority reader, never inferred.
 */
export function resolveStandingServiceConsequences(
  world: World,
  context: LawConsequenceContext,
): readonly ResolvedStandingServiceConsequence[] {
  if (context.activity !== "service" || context.questionKey) return [];
  const done = completedServiceActivity(world, context);
  if (!done) return [];
  let authority: StandingProgramAuthority | null = null;
  let row: LawConsequenceRow | null = null;
  const paid = paidServiceRecipients(
    world,
    done,
    context,
    (appropriation, commitment) => {
      if (appropriation.sourceMeasureId != null) return false;
      const program = standingServiceProgram(appropriation.programKey);
      const candidate = program
        ? SERVICE_DELIVERED_LAW_ROWS[program.questionKey]?.[0]
        : undefined;
      const read = program
        ? standingCrisisAuthority(world, appropriation.id, context.onDate)
        : null;
      const classification = organizationProfileAt(
        world,
        commitment.recipientOrganizationId!,
        {
          asOfDate: context.onDate,
          historySequenceExclusive: world.history.nextSequence,
        },
      )?.classification;
      if (
        !program ||
        !candidate ||
        !validServiceRow(candidate) ||
        !read ||
        !classification ||
        !program.operatorClassifications.includes(classification)
      )
        return false;
      authority = read;
      row = candidate;
      return true;
    },
  );
  if (!authority || !row) return [];
  const saved: StandingProgramAuthority = authority;
  const savedRow: LawConsequenceRow = row;
  return paid.map((entry) => ({
    row: savedRow,
    authority: saved,
    jurisdictionId: done.jurisdictionId,
    activityId: done.activity.id,
    effectiveAt: context.onDate,
    ...entry,
  }));
}

export function applyLawServiceConsequence(
  world: World,
  resolved: ResolvedAnyLawConsequence,
): World {
  if (resolved.subject.kind !== "person") return world;
  const context = {
    activity: "service" as const,
    activityId: resolved.activityId,
    onDate: resolved.effectiveAt,
    subjectIds: [resolved.subject.id],
  };
  const authority = "authority" in resolved ? resolved.authority : null;
  if (authority && authority.kind !== "standing-program-appropriation")
    return world;
  const appropriationId = authority?.appropriationId;
  const standing = "authority" in resolved;
  const canonical = standing
    ? resolveStandingServiceConsequences(world, context).find(
        (candidate) =>
          candidate.authority.appropriationId ===
          appropriationId,
      )
    : resolveLawServiceConsequence(world, resolved.row, {
        ...context,
        questionKey: resolved.questionKey,
        governingLawId: resolved.law.measureId,
      })[0];
  if (
    !canonical ||
    canonical.row.id !== resolved.row.id ||
    canonical.value.type !== "amount" ||
    resolved.value.type !== "amount" ||
    canonical.value.unit !== resolved.value.unit ||
    canonical.value.value !== resolved.value.value ||
    canonical.jurisdictionId !== resolved.jurisdictionId ||
    ("law" in canonical &&
      "law" in resolved &&
      canonical.law.origin !== resolved.law.origin) ||
    canonical.sourceRecordIds.length !== resolved.sourceRecordIds.length ||
    canonical.sourceRecordIds.some(
      (id, at) => id !== resolved.sourceRecordIds[at],
    )
  )
    return world;
  const key = `law-service:${resolved.activityId}:${resolved.subject.id}:${resolved.row.id}`;
  if (hasStableKey(world.history.events, key)) return world;
  const stamp = lawEffectStamp(
    "authority" in canonical ? canonical.authority : canonical.law,
    {
      effectKind: "service-delivered",
      questionKey: "authority" in canonical ? null : canonical.questionKey,
      jurisdictionId: canonical.jurisdictionId,
      appliedAt: canonical.effectiveAt,
      sourceRecordIds: canonical.sourceRecordIds,
    },
  );
  if (!stamp) return world;
  const activity = recordById(
    world.history.scheduledActivities,
    canonical.activityId,
  )!;
  return recordWorldEvent(world, {
    stableKey: key,
    type: "service.delivery-recorded",
    occurredAt: canonical.effectiveAt,
    recordedAt: world.currentDate,
    jurisdictionId: canonical.jurisdictionId,
    involvedEntityIds: [canonical.subject.id, activity.id],
    participants: [
      {
        personId: canonical.subject.id,
        role: "focus:service-recipient",
        detail: "Named participant in the saved completed service activity.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["service.delivered"],
    summary: `${personName(world.people[canonical.subject.id]!)} completed ${activity.title}; the saved service interval was ${canonical.value.value} hours.`,
    context: {
      location: {
        jurisdictionId: canonical.jurisdictionId,
        label: activity.location.label,
        setting: "Completed public service",
      },
      socialContext:
        "Recorded completion and positive operating payment are separate saved facts.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    lawEffectStamps: [stamp],
  });
}

export const SERVICE_DELIVERED_REGISTRATION: LawConsequenceKindRegistration<ResolvedAnyLawConsequence> =
  {
    kind: "service-delivered",
    owner: "Team5",
    selectors: [SERVICE_SELECTOR],
    actions: [SERVICE_ACTION],
    predicates: [FUNDED_SERVICE],
    units: ["hours"],
    resolve: resolveLawServiceConsequence,
    resolveSavedRules: resolveStandingServiceConsequences,
    apply: applyLawServiceConsequence,
  };
