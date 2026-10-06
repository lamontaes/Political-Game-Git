import { recordedRoomPresence } from "./recorded-room-presence";
import { currentHistoricalCutoff } from "../simulation/queries";
import { measureActions } from "../simulation/legislation";
import {
  BILL_RETURN,
  BILL_SIGN,
} from "../simulation/governing/governor-bill-decision";
import {
  executiveItemVetoOptions,
  itemVetoReaching,
} from "../simulation/governing/item-veto";
import {
  governingMatters,
  governingOfficeForPerson,
} from "../simulation/governing/state-governing";
import type { EntityId, World } from "../simulation/types";

/** Data for the central played-scene consumer. This neither opens a scene nor
 * composes English, assumes attendance, writes knowledge, or executes a choice. */
export function executiveBillSceneOffers(
  world: World,
  viewerPersonId: EntityId,
) {
  const office = governingOfficeForPerson(world, viewerPersonId);
  if (!office?.controlledByPlayer) return [];
  const presence = recordedRoomPresence(world, viewerPersonId);
  return governingMatters(world, office.officeKey)
    .filter(
      (matter) =>
        matter.family === "bill" &&
        matter.status === "open" &&
        matter.measureId &&
        matter.holderPersonId === viewerPersonId,
    )
    .map((matter) => {
      const measureId = matter.measureId!;
      const action = measureActions(world, measureId).at(-1);
      const items = executiveItemVetoOptions(world, measureId);
      return {
        kind: "executive:bill" as const,
        currentMoment: world.currentMoment,
        cutoff: currentHistoricalCutoff(world),
        sourceEventId: matter.openedEvent.id,
        matterId: matter.id,
        measureId,
        officeKey: office.officeKey,
        organizationId: office.organizationId,
        jurisdictionId: office.jurisdictionId,
        location: presence?.location ?? null,
        recordedPresenceEventId: presence?.eventId ?? null,
        presentPersonIds: presence?.personIds ?? [],
        sourceParticipants: matter.openedEvent.participants,
        actorPersonId: office.holderPersonId,
        authorityRecordId: office.termId,
        knownSourceEventIds: [matter.openedEvent.id],
        unknowns: presence ? [] : ["current-room-presence" as const],
        facts: {
          openedAt: matter.openedEvent.occurredAt,
          openedEventId: matter.openedEvent.id,
          latestAction: action
            ? {
                id: action.id,
                eventId: action.eventId,
                occurredAt: action.occurredAt,
                sequence: action.sequence,
                kind: action.kind,
              }
            : null,
          itemVetoPower: itemVetoReaching(world, measureId),
          eligibleItems: items.map((item) => ({
            provisionId: item.id,
            sourceEventId: item.eventId,
            recordedAt: item.recordedAt,
            heading: item.heading,
            originAmendmentId: item.originAmendmentId,
          })),
          itemScopeBasis: "game-assumption:floor-added-section" as const,
        },
        actions: [BILL_SIGN, BILL_RETURN].map((optionKey) => ({
          kind: "executive:decide-bill" as const,
          writer: "decideGoverningMatter" as const,
          matterId: matter.id,
          optionKey,
          itemSelectionSnapshot:
            optionKey === BILL_SIGN && action && items.length
              ? {
                  matterId: matter.id,
                  measureActionSequence: action.sequence,
                  eligibleProvisionIds: items.map((item) => item.id),
                }
              : null,
        })),
      };
    });
}
