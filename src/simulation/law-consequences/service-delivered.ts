import { simulationMinutesBetween } from "../dates";
import { eventById } from "../event-index";
import { lawInForce } from "../governing/law-in-force";
import {
  hasStableKey,
  recordById,
  recordsWithFieldValue,
} from "../history-index";
import { organizationParticipationStateAt } from "../life-queries";
import { lawEffectStamp } from "../law-effect-stamp";
import { personName } from "../people";
import { publicProgramRecords } from "../public-program-integrity";
import { scheduledActivityState } from "../time-work";
import { recordWorldEvent } from "../world";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import type { EntityId, PublicProgramRecord, World } from "../types";

export const SERVICE_SELECTOR = "service.completed-activity-participants";
export const SERVICE_ACTION = "record-delivered-service";
export const SERVICE_HOURS = "service.completed-activity-hours";
export const FUNDED_SERVICE = "service.funded-by-governing-law";
export const SERVICE_RECIPIENT_KIND = "activity:public-service";

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

export function resolveLawServiceConsequence(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.kind !== "service-delivered" ||
    row.when !== "service" ||
    context.activity !== "service" ||
    row.who.selector !== SERVICE_SELECTOR ||
    row.what !== SERVICE_ACTION ||
    row.decision ||
    row.lag.days !== 0 ||
    row.amount?.op !== "record" ||
    row.amount.key !== SERVICE_HOURS ||
    row.amount.unit !== "hours" ||
    row.who.predicates.length !== 0 ||
    row.conditions.length !== 1 ||
    !context.questionKey
  )
    return [];
  const condition = row.conditions[0]!;
  if (
    condition.capability !== FUNDED_SERVICE ||
    Object.keys(condition.parameters).length !== 0
  )
    return [];
  const activity = recordById(
    world.history.scheduledActivities,
    context.activityId,
  );
  if (!activity || !activity.location.jurisdictionId) return [];
  const state = scheduledActivityState(world, activity.id);
  if (state.status !== "completed" || !state.outcomeEventId) return [];
  const completion = eventById(world, state.outcomeEventId);
  if (
    !completion ||
    completion.type !== "schedule.activity-completed" ||
    completion.occurredAt !== context.onDate ||
    completion.occurredAt > world.currentDate ||
    !completion.involvedEntityIds.includes(activity.id) ||
    completion.jurisdictionId !== activity.location.jurisdictionId
  )
    return [];
  const minutes = simulationMinutesBetween(state.start, state.end);
  if (!(minutes > 0) || !Number.isFinite(minutes)) return [];
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === context.questionKey,
  );
  if (!proposition) return [];
  const jurisdictionId = activity.location.jurisdictionId;
  const law = lawInForce(world, jurisdictionId, proposition.id, context.onDate);
  if (
    !law ||
    law.answer !== "yes" ||
    (context.governingLawId && context.governingLawId !== law.measureId)
  )
    return [];
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
      appropriation.sourceMeasureId !== law.measureId ||
      appropriation.jurisdictionId !== jurisdictionId ||
      appropriation.availableFrom > context.onDate ||
      appropriation.availableThrough < context.onDate
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
          row,
          law,
          questionKey: context.questionKey!,
          jurisdictionId,
          subject: { kind: "person" as const, id },
          activityId: activity.id,
          effectiveAt: context.onDate,
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
            value: minutes / 60,
            unit: "hours" as const,
          },
        }));
    }
  }
  return [];
}

export function applyLawServiceConsequence(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (resolved.subject.kind !== "person") return world;
  const canonical = resolveLawServiceConsequence(world, resolved.row, {
    activity: "service",
    activityId: resolved.activityId,
    onDate: resolved.effectiveAt,
    subjectIds: [resolved.subject.id],
    questionKey: resolved.questionKey,
    governingLawId: resolved.law.measureId,
  })[0];
  if (
    !canonical ||
    canonical.value.type !== "amount" ||
    resolved.value.type !== "amount" ||
    canonical.value.unit !== resolved.value.unit ||
    canonical.value.value !== resolved.value.value ||
    canonical.jurisdictionId !== resolved.jurisdictionId ||
    canonical.law.origin !== resolved.law.origin ||
    canonical.sourceRecordIds.length !== resolved.sourceRecordIds.length ||
    canonical.sourceRecordIds.some(
      (id, at) => id !== resolved.sourceRecordIds[at],
    )
  )
    return world;
  const key = `law-service:${resolved.activityId}:${resolved.subject.id}:${resolved.row.id}`;
  if (hasStableKey(world.history.events, key)) return world;
  const stamp = lawEffectStamp(canonical.law, {
    effectKind: "service-delivered",
    questionKey: canonical.questionKey,
    jurisdictionId: canonical.jurisdictionId,
    appliedAt: canonical.effectiveAt,
    sourceRecordIds: canonical.sourceRecordIds,
  });
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

export const SERVICE_DELIVERED_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "service-delivered",
  owner: "Team5",
  selectors: [SERVICE_SELECTOR],
  actions: [SERVICE_ACTION],
  predicates: [FUNDED_SERVICE],
  units: ["hours"],
  resolve: resolveLawServiceConsequence,
  apply: applyLawServiceConsequence,
};

/** Catalog data for completed, funded service; fare pricing is a separate consequence. */
export const SERVICE_DELIVERED_LAW_ROWS: Readonly<
  Record<string, readonly LawConsequenceRow[]>
> = Object.fromEntries(
  [
    "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
    "us-policy-positions:transportation-infrastructure.fare-free-transit",
  ].map((questionKey) => [
    questionKey,
    [
      {
        id: `${questionKey}:recorded-funded-service`,
        kind: "service-delivered",
        when: "service",
        who: { selector: SERVICE_SELECTOR, predicates: [] },
        what: SERVICE_ACTION,
        amount: { op: "record", key: SERVICE_HOURS, unit: "hours" },
        conditions: [{ capability: FUNDED_SERVICE, parameters: {} }],
        lag: { days: 0, sourceIds: [] },
        onRepeal: "preserve-completed",
        evidence: {
          sourceIds: [
            "src/simulation/time-work.ts:completeActivity",
            "src/simulation/public-program-integrity.ts",
            "src/simulation/resources.ts:recordResourceTransferOutcome",
          ],
          population:
            "Existing recorded service recipients who completed an activity tied to the law's funded commitment.",
          scope:
            "Actual completed recipient-hours only; not vehicle-hours, added ridership, free-fare pricing or population access.",
          why: "The saved activity interval establishes time delivered to its recorded recipient. The commitment, appropriation and positive operating transfer establish the governing law's funding lineage. Neither payment nor legislation establishes attendance.",
          uncertainty:
            "No delivery is inferred without these records. An authored service record is not observational research or proof of a live caller.",
        },
      } satisfies LawConsequenceRow,
    ],
  ]),
);
