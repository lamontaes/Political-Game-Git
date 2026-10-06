import { eventById } from "../../../event-index";
import { lawInForce } from "../../../governing/law-in-force";
import { hasStableKey, recordById } from "../../../history-index";
import {
  organizationParticipationStateAt,
  organizationProfileAt,
} from "../../../life-queries";
import { lawEffectStamp } from "../../../law-effect-stamp";
import { recordLawExposure } from "../../../law-exposure";
import { personName } from "../../../people";
import { publicProgramRecords } from "../../../public-program-integrity";
import { scheduledActivityState } from "../../../time-work";
import { recordWorldEvent } from "../../../world";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import type {
  EntityId,
  PublicProgramCommitmentRecord,
  World,
} from "../../../types";
import { serviceRequestFormForCommitment } from "../../../public-service-producer";
import {
  LW08_LIBRARY_MATERIALS_QUESTION,
  LW08_LIBRARY_MATERIALS_ROW,
  LW08_LIBRARY_VISIT_ACTION,
  LW08_LIBRARY_VISIT_EVIDENCE,
  LW08_LIBRARY_VISIT_SELECTOR,
} from "./data";

export {
  LW08_LIBRARY_MATERIALS_QUESTION,
  LW08_LIBRARY_MATERIALS_ROW,
  LW08_LIBRARY_VISIT_ACTION,
  LW08_LIBRARY_VISIT_COUNT,
  LW08_LIBRARY_VISIT_EVIDENCE,
  LW08_LIBRARY_VISIT_SELECTOR,
} from "./data";

function canonicalRow(row: LawConsequenceRow, world: World): boolean {
  if (
    row.id !== LW08_LIBRARY_MATERIALS_ROW.id ||
    JSON.stringify(row) !== JSON.stringify(LW08_LIBRARY_MATERIALS_ROW)
  )
    return false;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === LW08_LIBRARY_MATERIALS_QUESTION,
  );
  return (
    !!proposition &&
    JSON.stringify(
      proposition.consequences?.find((entry) => entry.id === row.id),
    ) === JSON.stringify(LW08_LIBRARY_MATERIALS_ROW)
  );
}

/** A completed visit with its actual requester, library membership and funder. */
function recordedLibraryVisit(
  world: World,
  activityId: EntityId,
  personId: EntityId,
  onDate: World["currentDate"],
) {
  const activity = recordById(world.history.scheduledActivities, activityId);
  if (!activity || !activity.location.jurisdictionId) return null;
  const state = scheduledActivityState(world, activity.id);
  if (state.status !== "completed" || !state.outcomeEventId) return null;
  const completion = eventById(world, state.outcomeEventId);
  if (
    !completion ||
    completion.type !== "schedule.activity-completed" ||
    completion.occurredAt !== onDate ||
    !completion.involvedEntityIds.includes(activity.id) ||
    !activity.participantPersonIds.includes(personId) ||
    !completion.participants.some(
      (participant) =>
        participant.personId === personId &&
        participant.role === "presence:participant",
    )
  )
    return null;

  const records = publicProgramRecords(world);
  const commitment = records.find(
    (record): record is PublicProgramCommitmentRecord =>
      record.kind === "commitment" &&
      activity.sourceEntityIds.includes(record.eventId) &&
      record.jurisdictionId === activity.location.jurisdictionId &&
      !!record.recipientOrganizationId,
  );
  if (!commitment || !commitment.recipientOrganizationId) return null;
  const form = serviceRequestFormForCommitment(world, commitment);
  const operator = organizationProfileAt(
    world,
    commitment.recipientOrganizationId,
    {
      asOfDate: onDate,
      historySequenceExclusive: world.history.nextSequence,
    },
  );
  if (
    form?.asked !== "a library visit" ||
    !operator ||
    activity.title !==
      form.activityTitle.replaceAll("{operator}", operator.name)
  )
    return null;

  const participation = activity.sourceEntityIds
    .map((id) => recordById(world.history.organizationParticipations, id))
    .find(
      (record) =>
        !!record &&
        record.personId === personId &&
        record.organizationId === commitment.recipientOrganizationId &&
        record.kind === "activity:public-service" &&
        record.startedAt <= onDate &&
        organizationParticipationStateAt(world, record.id, {
          asOfDate: onDate,
          historySequenceExclusive: world.history.nextSequence,
        })?.status === "active",
    );
  if (!participation) return null;

  const request = activity.sourceEntityIds
    .map((id) => eventById(world, id))
    .find(
      (event) =>
        !!event &&
        event.type === "service.requested" &&
        event.occurredAt <= onDate &&
        event.involvedEntityIds.includes(personId) &&
        event.involvedEntityIds.includes(commitment.recipientOrganizationId!) &&
        event.participants.some(
          (participant) =>
            participant.personId === personId &&
            participant.role === "agency:service-request" &&
            participant.detail?.includes("a library visit"),
        ),
    );
  if (!request) return null;

  return {
    activity,
    completion,
    commitment,
    participation,
    request,
    jurisdictionId: activity.location.jurisdictionId,
    sourceRecordIds: [
      activity.id,
      state.id,
      completion.id,
      request.id,
      participation.id,
      commitment.id,
      commitment.eventId,
      commitment.recipientOrganizationId,
    ],
  };
}

export function resolveLw08LibraryMaterialsConsequences(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    !canonicalRow(row, world) ||
    context.activity !== "service" ||
    context.questionKey !== LW08_LIBRARY_MATERIALS_QUESTION ||
    context.onDate !== world.currentDate ||
    context.onDate > world.currentDate
  )
    return [];

  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === LW08_LIBRARY_MATERIALS_QUESTION,
  )!;
  return [...new Set(context.subjectIds)].flatMap((personId) => {
    const visit = recordedLibraryVisit(
      world,
      context.activityId,
      personId,
      context.onDate,
    );
    if (!visit) return [];
    const law = lawInForce(
      world,
      visit.jurisdictionId,
      proposition.id,
      context.onDate,
    );
    if (
      !law ||
      law.answer !== "yes" ||
      (context.governingLawId && context.governingLawId !== law.measureId)
    )
      return [];
    return [
      {
        row,
        law,
        questionKey: LW08_LIBRARY_MATERIALS_QUESTION,
        jurisdictionId: visit.jurisdictionId,
        subject: { kind: "person" as const, id: personId },
        activityId: visit.activity.id,
        effectiveAt: context.onDate,
        sourceRecordIds: visit.sourceRecordIds,
        value: { type: "amount" as const, value: 1, unit: "count" as const },
      },
    ];
  });
}

export function applyLw08LibraryMaterialsConsequence(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (resolved.subject.kind !== "person") return world;
  const canonical = resolveLw08LibraryMaterialsConsequences(
    world,
    resolved.row,
    {
      activity: "service",
      activityId: resolved.activityId,
      onDate: resolved.effectiveAt,
      subjectIds: [resolved.subject.id],
      questionKey: resolved.questionKey,
      governingLawId: resolved.law.measureId,
    },
  ).find(
    (candidate) =>
      candidate.subject.id === resolved.subject.id &&
      candidate.law.measureId === resolved.law.measureId &&
      candidate.sourceRecordIds.length === resolved.sourceRecordIds.length &&
      candidate.sourceRecordIds.every(
        (sourceId, index) => sourceId === resolved.sourceRecordIds[index],
      ),
  );
  if (!canonical || resolved.value.type !== "amount") return world;
  const stableKey = `law-library-materials:${canonical.law.measureId}:${resolved.subject.id}`;
  if (
    (world.history.lawExposures ?? []).some(
      (exposure) => exposure.stableKey === `${stableKey}:exposure`,
    ) ||
    hasStableKey(world.history.events, stableKey)
  )
    return world;
  const stamp = lawEffectStamp(canonical.law, {
    effectKind: "public-library-service",
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
  let next = recordWorldEvent(world, {
    stableKey,
    type: "library.materials-governance-exposure",
    occurredAt: canonical.effectiveAt,
    recordedAt: world.currentDate,
    jurisdictionId: canonical.jurisdictionId,
    involvedEntityIds: [...canonical.sourceRecordIds],
    participants: [
      {
        personId: resolved.subject.id,
        role: "focus:library-service-user",
        detail: "Named participant in a saved completed public-library visit.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["law.consequence", "library.materials-governance"],
    summary: `${personName(world.people[resolved.subject.id]!)} completed ${activity.title} while local boards held the recorded materials-selection authority. No title read or access outcome is recorded.`,
    context: {
      location: {
        jurisdictionId: canonical.jurisdictionId,
        label: activity.location.label,
        setting: "Completed public-library visit",
      },
      socialContext:
        "The completed visit, request, active library membership and funded service record are the evidence for this neutral policy exposure.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    lawEffectStamps: [stamp],
  });
  const sourceRecordId = next.history.events.at(-1)!.id;
  next = recordLawExposure(next, {
    stableKey: `${stableKey}:exposure`,
    personId: resolved.subject.id,
    measureId: canonical.law.measureId,
    channel: "public-service",
    direction: "none",
    amount: null,
    cadence: null,
    sourceRecordId,
    includeFamily: false,
  });
  return next;
}

export const LW08_LIBRARY_MATERIALS_REGISTRATION: LawConsequenceKindRegistration =
  {
    kind: "public-library-service",
    owner: "Session26",
    selectors: [LW08_LIBRARY_VISIT_SELECTOR],
    actions: [LW08_LIBRARY_VISIT_ACTION],
    predicates: [LW08_LIBRARY_VISIT_EVIDENCE],
    units: ["count"],
    resolve: resolveLw08LibraryMaterialsConsequences,
    apply: applyLw08LibraryMaterialsConsequence,
  };

export const registrations = [LW08_LIBRARY_MATERIALS_REGISTRATION] as const;
