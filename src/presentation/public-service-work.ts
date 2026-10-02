import {
  eligibleServiceOperator,
  livesInServiceArea,
  operatingPaymentPosted,
  requestPublicService,
  serviceAuthorityForCommitment,
  type PublicServiceRequestInput,
  type PublicServiceRequestResult,
} from "../simulation/public-service-requests";
import { organizationProfileAt } from "../simulation/life-queries";
import { publicProgramRecords } from "../simulation/public-program-integrity";
import { SERVICE_REQUEST_FORMS } from "../simulation/law-consequences/service-delivered-data";
import type {
  EntityId,
  PublicProgramCommitmentRecord,
  World,
} from "../simulation/types";

export interface ResidentTransitOffer {
  readonly commitmentId: EntityId;
  readonly operatorId: EntityId;
  readonly operatorName: string;
  readonly title: string;
  readonly visitMinutes: number;
  readonly availableThrough: World["currentDate"];
}

/** Saved requests keep a resident's transit record reachable after a law lapses. */
export function residentTransitRecords(world: World, personId: EntityId) {
  const commitments = publicProgramRecords(world).filter(
    (record): record is PublicProgramCommitmentRecord =>
      record.kind === "commitment" && !!record.recipientOrganizationId,
  );
  const requests = new Set(
    world.history.events
      .filter(
        (event) =>
          event.type === "service.requested" &&
          event.participants.some(
            (participant) =>
              participant.personId === personId &&
              participant.role === "agency:service-request",
          ),
      )
      .map((event) => event.id),
  );
  return world.history.scheduledActivities.filter(
    (activity) =>
      activity.kind === "travel" &&
      activity.responsiblePersonId === personId &&
      activity.participantPersonIds.includes(personId) &&
      activity.sourceEntityIds.some((id) => requests.has(id)) &&
      commitments.some(
        (commitment) =>
          activity.sourceEntityIds.includes(commitment.eventId) &&
          activity.location?.locationKey ===
            `public-service:${commitment.recipientOrganizationId}`,
      ),
  );
}

/** Admission to the resident view grants no legislative or tax authority. */
export function residentTransitAccess(
  world: World,
  personId: EntityId,
): boolean {
  return (
    world.control.kind === "person" &&
    world.control.personId === personId &&
    (residentTransitOffers(world).length > 0 ||
      residentTransitRecords(world, personId).length > 0)
  );
}

/** A screen reads existing paid operating commitments; it creates no offers. */
export function residentTransitOffers(
  world: World,
): readonly ResidentTransitOffer[] {
  if (world.control.kind !== "person") return [];
  const personId = world.control.personId;
  return publicProgramRecords(world).flatMap((commitment) => {
    if (commitment.kind !== "commitment" || !commitment.recipientOrganizationId)
      return [];
    const authority = serviceAuthorityForCommitment(
      world,
      commitment,
      world.currentDate,
    );
    if (
      !authority ||
      authority.appropriation.availableFrom > world.currentDate ||
      authority.appropriation.availableThrough < world.currentDate ||
      !eligibleServiceOperator(
        world,
        authority,
        commitment.recipientOrganizationId,
      ) ||
      !livesInServiceArea(world, personId, commitment.jurisdictionId) ||
      !operatingPaymentPosted(world, commitment)
    )
      return [];
    const form = SERVICE_REQUEST_FORMS[authority.questionKey];
    if (!form || form.activityKind !== "travel") return [];
    const profile = organizationProfileAt(
      world,
      commitment.recipientOrganizationId,
    );
    if (!profile) return [];
    return [
      {
        commitmentId: commitment.id,
        operatorId: commitment.recipientOrganizationId,
        operatorName: profile.name,
        title: commitment.alternativeTitle,
        visitMinutes: form.visit.minutes,
        availableThrough: authority.appropriation.availableThrough,
      },
    ];
  });
}

/** A resident asks as the character actually controlled in this saved world.
 * Scheduling is the existing service writer's job; it does not record delivery.
 */
export function requestPublicServiceFromLife(
  world: World,
  input: Omit<PublicServiceRequestInput, "personId">,
): PublicServiceRequestResult {
  if (world.control.kind !== "person")
    return {
      kind: "unsupported",
      world,
      reason: "Choose a character before requesting this service.",
    };
  return requestPublicService(world, {
    ...input,
    personId: world.control.personId,
  });
}
