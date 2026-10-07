import { homeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import { sittingLocalOfficers } from "./living-world/local-government-seats";
import {
  officesHeldBy,
  OFFICE_EMPLOYMENT_KINDS,
} from "./governing/office-consequence";
import { activeWorkRelationshipsAt } from "./life-queries";
import { governingOfficeForPerson } from "./governing/state-governing";
import { recordById, recordByStableKey } from "./history-index";
import { recordWorldEvent } from "./world";
import type { EntityId, HistoricalEvent, World } from "./types";

export const OFFICE_CASE_OPENED_EVENT = "office.case-opened";

/** Current office records, including local participation-based seats. */
function holdsOffice(world: World, personId: EntityId): boolean {
  if (
    activeWorkRelationshipsAt(world, personId).some(
      ({ relationship }) =>
        OFFICE_EMPLOYMENT_KINDS.includes(relationship.kind) ||
        relationship.kind.startsWith("office:"),
    )
  )
    return true;
  const home = homeLocalGovernmentUnits(world, personId);
  if (
    [...home.municipal, ...home.counties].some((unit) =>
      sittingLocalOfficers(world, unit).some(
        (seat) => seat.personId === personId,
      ),
    )
  )
    return true;
  return (
    officesHeldBy(world, personId).length > 0 ||
    governingOfficeForPerson(world, personId) !== null
  );
}

/**
 * One case event per recorded contact, through the existing event writer.
 * A contact names the resident and recipient; its tags and context preserve
 * the actual reason, including a substantive message's proposition and stance.
 * This does not choose a handler, answer a case, or invent a new complaint.
 */
export function openConstituentCaseForContact(
  world: World,
  contact: HistoricalEvent,
): World {
  if (
    contact.type !== "life.contacted-official" ||
    contact.occurredAt !== world.currentDate ||
    contact.recordedAt !== world.currentDate ||
    contact.sequence >= world.history.nextSequence ||
    recordById(world.history.events, contact.id) !== contact
  )
    return world;
  const stableKey = `office-case-opened:${contact.id}`;
  if (recordByStableKey(world.history.events, stableKey)) return world;
  const residentId = contact.participants.find(
    (person) => person.role === "focus:subject",
  )?.personId;
  const officialId = contact.participants.find(
    (person) => person.role === "focus:object",
  )?.personId;
  if (
    !residentId ||
    !officialId ||
    residentId === officialId ||
    !world.people[residentId] ||
    !world.people[officialId] ||
    !holdsOffice(world, officialId)
  )
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: OFFICE_CASE_OPENED_EVENT,
    occurredAt: contact.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: contact.jurisdictionId,
    involvedEntityIds: [residentId, officialId],
    participants: [
      { personId: residentId, role: "focus:subject", detail: null },
      { personId: officialId, role: "focus:object", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "office.case",
      `contact:${contact.id}`,
      ...contact.tags.filter(
        (tag) =>
          tag.startsWith("reason:") ||
          tag.startsWith("source-record:") ||
          tag.startsWith("message-"),
      ),
    ],
    summary: contact.summary,
    context: contact.context,
  });
}
