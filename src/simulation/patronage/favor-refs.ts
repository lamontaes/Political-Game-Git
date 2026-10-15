import { favorRecords } from "../favors";
import type {
  EntityId,
  FavorRecord,
  MindSourceReference,
  World,
} from "../types";

/** Every favor this person has given, oldest first. */
export function favorsGivenBy(
  world: World,
  personId: EntityId,
): readonly FavorRecord[] {
  return favorRecords(world).filter(
    (record) => record.giverPersonId === personId,
  );
}

/** Every favor this person has received, oldest first. */
export function favorsReceivedBy(
  world: World,
  personId: EntityId,
): readonly FavorRecord[] {
  return favorRecords(world).filter(
    (record) => record.receiverPersonId === personId,
  );
}

/**
 * The recorded moments behind what one person owes another: the events of the
 * favors the giver did the receiver, latest three. Both people are named on
 * each of those events, so either can cite it as something they know.
 */
export function favorEventRefs(
  world: World,
  receiverPersonId: EntityId,
  giverPersonId: EntityId,
): MindSourceReference[] {
  return favorsReceivedBy(world, receiverPersonId)
    .filter((favor) => favor.giverPersonId === giverPersonId)
    .slice(-3)
    .map((favor) => ({
      kind: "historical-event" as const,
      eventId: favor.eventId,
    }));
}
