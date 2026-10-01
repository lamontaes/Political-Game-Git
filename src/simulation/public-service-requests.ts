import { compareSimulationMoments, simulationMinutesBetween } from "./dates";
import { lawInForce, type LawInForce } from "./governing/law-in-force";
import { hasStableKey, recordById } from "./history-index";
import { createOrganizationParticipation } from "./life";
import { stateKeyForJurisdiction } from "./life-places";
import {
  activeOrganizationParticipationsAt,
  organizationProfileAt,
} from "./life-queries";
import { publicProgramRecords } from "./public-program-integrity";
import { residenceStateKey } from "./statutory-tax";
import { createScheduledActivity } from "./time-work";
import { recordWorldEvent } from "./world";
import { SERVICE_RECIPIENT_KIND } from "./law-consequences/service-delivered-data";
import type {
  EntityId,
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  SimulationMoment,
  World,
} from "./types";

/**
 * A person's own request for one trip, visit or call from a funded public
 * service. The request is saved first, then the person's rider (or patron, or
 * caller) membership with the paid operator, then the scheduled trip itself.
 * Nothing here records delivery: the completed activity does that through the
 * service-delivered consequence, and only if the person actually takes it.
 *
 * One rule for every service law and every place. The law is found from the
 * commitment's own appropriation and the catalog's service rows, never by name.
 */
export type PublicServiceRequestResult =
  | {
      readonly kind: "scheduled";
      readonly world: World;
      readonly questionKey: string;
      readonly requestEventId: EntityId;
      readonly participationId: EntityId;
      readonly activityId: EntityId;
    }
  | {
      readonly kind: "unsupported";
      readonly world: World;
      readonly reason: string;
    };

export interface PublicServiceRequestInput {
  readonly personId: EntityId;
  /** The saved public-program commitment that pays the operator. */
  readonly commitmentId: EntityId;
  /** The pickup and drop-off the person asked for. */
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
}

/** The service law in force that this commitment's money was appropriated under. */
export function serviceLawForCommitment(
  world: World,
  commitment: PublicProgramCommitmentRecord,
  onDate: World["currentDate"],
): {
  readonly appropriation: PublicProgramAppropriationRecord;
  readonly questionKey: string;
  readonly law: LawInForce;
} | null {
  const appropriation = recordById(
    publicProgramRecords(world),
    commitment.appropriationId,
  );
  if (
    !appropriation ||
    appropriation.kind !== "appropriation" ||
    !appropriation.sourceMeasureId ||
    appropriation.jurisdictionId !== commitment.jurisdictionId
  )
    return null;
  for (const id of world.policyCatalog.propositionOrder) {
    const proposition = world.policyCatalog.propositions[id];
    if (
      !proposition ||
      !(proposition.consequences ?? []).some(
        (row) => row.kind === "service-delivered" && row.when === "service",
      )
    )
      continue;
    const law = lawInForce(world, commitment.jurisdictionId, id, onDate);
    if (
      law &&
      law.answer === "yes" &&
      law.measureId === appropriation.sourceMeasureId
    )
      return { appropriation, questionKey: proposition.stableKey, law };
  }
  return null;
}

/** The person's recorded home is in the place the program serves. */
function livesInServiceArea(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
): boolean {
  const person = world.people[personId];
  if (!person) return false;
  if (person.homeJurisdictionId === jurisdictionId) return true;
  const served = world.jurisdictions[jurisdictionId];
  const servedState = served ? stateKeyForJurisdiction(served) : null;
  return !!servedState && residenceStateKey(world, personId) === servedState;
}

function operatingPaymentPosted(
  world: World,
  commitment: PublicProgramCommitmentRecord,
): boolean {
  return publicProgramRecords(world).some(
    (record) =>
      record.kind === "installment" &&
      record.commitmentId === commitment.id &&
      record.status === "posted" &&
      !!record.resourceFlowId &&
      commitment.installments[record.installmentIndex]?.purpose ===
        "operating" &&
      record.recordedAt <= world.currentDate &&
      world.history.resourceTransferOutcomes.some(
        (outcome) =>
          outcome.resourceFlowId === record.resourceFlowId &&
          (outcome.status === "completed" || outcome.status === "partial") &&
          outcome.transferredAmount.minorUnits > 0,
      ),
  );
}

export function requestPublicServiceTrip(
  world: World,
  input: PublicServiceRequestInput,
): PublicServiceRequestResult {
  const unsupported = (reason: string): PublicServiceRequestResult => ({
    kind: "unsupported",
    world,
    reason,
  });
  const person = world.people[input.personId];
  if (!person) return unsupported("No such person is recorded.");
  const commitment = recordById(
    publicProgramRecords(world),
    input.commitmentId,
  );
  if (!commitment || commitment.kind !== "commitment")
    return unsupported("No such program commitment is recorded.");
  const operatorId = commitment.recipientOrganizationId;
  if (!operatorId)
    return unsupported("This commitment pays no operator, so no trip can run.");
  const served = serviceLawForCommitment(world, commitment, world.currentDate);
  if (!served)
    return unsupported(
      "No service law in force appropriated the money behind this commitment.",
    );
  if (!operatingPaymentPosted(world, commitment))
    return unsupported(
      "The operator has not been paid for operating service yet.",
    );
  if (!livesInServiceArea(world, person.id, commitment.jurisdictionId))
    return unsupported(
      "This person's recorded home is outside the service area.",
    );
  if (
    compareSimulationMoments(input.start, world.currentMoment) < 0 ||
    !(simulationMinutesBetween(input.start, input.end) > 0)
  )
    return unsupported(
      "A trip needs a pickup that is still ahead and a later drop-off.",
    );
  if (
    input.start.date < served.appropriation.availableFrom ||
    input.end.date > served.appropriation.availableThrough
  )
    return unsupported("The trip falls outside the appropriation's dates.");
  const requestKey = `public-service-request:${commitment.id}:${person.id}:${input.start.date}:${input.start.minuteOfDay}`;
  if (hasStableKey(world.history.events, requestKey))
    return unsupported("This trip has already been requested.");
  const operatorName =
    organizationProfileAt(world, operatorId)?.name ?? "the service operator";
  const placeName =
    world.jurisdictions[commitment.jurisdictionId]?.name ?? "the service area";

  // 1. The person's own saved request.
  let next = recordWorldEvent(world, {
    stableKey: requestKey,
    type: "service.trip-requested",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: commitment.jurisdictionId,
    involvedEntityIds: [person.id, operatorId],
    participants: [
      {
        personId: person.id,
        role: "agency:service-request",
        detail: `Asked ${operatorName} for a trip.`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["service.request"],
    summary: `Asked ${operatorName} for a trip on ${input.start.date}.`,
    context: {
      location: {
        jurisdictionId: commitment.jurisdictionId,
        label: placeName,
        setting: "Service request",
      },
      socialContext: commitment.alternativeTitle,
      pressure: null,
      choice: "Request a trip from the funded public service.",
      motivation: null,
      immediateReaction: null,
    },
  });
  const requestEventId = next.history.events.at(-1)!.id;

  // 2. Membership: reuse an active one with this operator, else register now.
  let participation = activeOrganizationParticipationsAt(next, person.id).find(
    ({ participation }) =>
      participation.organizationId === operatorId &&
      participation.kind === SERVICE_RECIPIENT_KIND,
  )?.participation;
  if (!participation) {
    next = createOrganizationParticipation(next, {
      stableKey: `public-service-recipient:${operatorId}:${person.id}`,
      personId: person.id,
      organizationId: operatorId,
      startedAt: next.currentDate,
      kind: SERVICE_RECIPIENT_KIND,
      roleKind: "participant:service-recipient",
      context: `Registered with ${operatorName} on asking for a trip; home is in ${placeName}.`,
      provenance: { kind: "simulated-event", eventId: requestEventId },
    });
    participation = next.history.organizationParticipations.at(-1)!;
  }

  // 3. The scheduled trip, tied to the request, the membership and the
  // commitment that pays for it. Completion is the person's own act.
  next = createScheduledActivity(next, {
    stableKey: `${requestKey}:trip`,
    title: `Ride with ${operatorName}`,
    summary: `A requested trip on ${operatorName}, paid for under ${commitment.alternativeTitle}.`,
    kind: "travel",
    start: input.start,
    end: input.end,
    participantPersonIds: [person.id],
    responsiblePersonId: person.id,
    location: {
      locationKey: `public-service:${operatorId}`,
      label: placeName,
      jurisdictionId: commitment.jurisdictionId,
    },
    sourceEntityIds: [commitment.eventId, participation.id, requestEventId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [person.id] },
  });
  return {
    kind: "scheduled",
    world: next,
    questionKey: served.questionKey,
    requestEventId,
    participationId: participation.id,
    activityId: next.history.scheduledActivities.at(-1)!.id,
  };
}
