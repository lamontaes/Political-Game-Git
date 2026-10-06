import { recordLawExposure } from "../law-exposure";
import type { EntityId, HistoricalEvent, World } from "../types";

/** LW-28 service laws whose completed delivery has an existing named person. */
export const CIVIL_FAMILY_SERVICE_QUESTIONS = new Set([
  "us-policy-positions:civil-family-community.dedicated-parks-funding",
  "us-policy-positions:civil-family-community.fund-public-libraries",
]);

export const CIVIL_FAMILY_SERVICE_NOTICE_VERSION =
  "civil-family-service-noticed/v1";

/**
 * Turn one saved library or parks delivery into the recipient's own saved law
 * exposure. The shared consequence dispatcher can call this after the
 * service-delivered writer; this adapter does not register or dispatch laws.
 */
export function noticeCivilFamilyServiceDelivery(
  world: World,
  event: HistoricalEvent,
): World {
  if (
    event.type !== "service.delivery-recorded" ||
    event.occurredAt !== world.currentDate ||
    !world.history.events.some((saved) => saved.id === event.id)
  )
    return world;

  const stamp = event.lawEffectStamps?.find(
    (candidate) =>
      candidate.effectKind === "service-delivered" &&
      candidate.questionKey !== null &&
      CIVIL_FAMILY_SERVICE_QUESTIONS.has(candidate.questionKey) &&
      candidate.appliedAt === event.occurredAt &&
      candidate.jurisdictionId === event.jurisdictionId,
  );
  const recipient = event.participants.find(
    (participant) => participant.role === "focus:service-recipient",
  );
  if (!stamp || !recipient || !world.people[recipient.personId]) return world;

  const stableKey = `${CIVIL_FAMILY_SERVICE_NOTICE_VERSION}:${event.id}:${recipient.personId}`;
  if (world.history.lawExposures?.some((row) => row.stableKey === stableKey))
    return world;

  return recordLawExposure(world, {
    stableKey,
    personId: recipient.personId as EntityId,
    measureId: stamp.governingLawKey,
    channel: "public-service",
    direction: "none",
    amount: null,
    cadence: null,
    sourceRecordId: event.id,
  });
}
