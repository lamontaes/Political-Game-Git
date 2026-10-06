import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
} from "./life-queries";
import { lifeOpportunityTag } from "./life-opportunities";
import type { EntityId, HistoricalEvent, World } from "./types";
import { recordWorldEvent } from "./world";

const OFFICE_WORK_KINDS = new Set([
  "employment:executive-office",
  "employment:executive-officeholder",
  "employment:vice-presidential-officeholder",
  "employment:legislative-member",
  "employment:state-agency-director",
  "employment:judicial-office",
  "employment:judicial-office-practice",
]);

function officeBinding(
  world: World,
  officialId: EntityId,
): { readonly id: EntityId; readonly organizationId: EntityId | null } | null {
  const employment = activeWorkRelationshipsAt(world, officialId).find(
    ({ relationship }) => OFFICE_WORK_KINDS.has(relationship.kind),
  )?.relationship;
  if (employment)
    return { id: employment.id, organizationId: employment.organizationId };
  const seat = activeOrganizationParticipationsAt(world, officialId).find(
    ({ participation, state }) =>
      participation.kind === "leadership:municipal-office" &&
      state.roleKind?.startsWith("leader:municipal-") === true,
  )?.participation;
  return seat ? { id: seat.id, organizationId: seat.organizationId } : null;
}

/** Project a recorded constituent contact into the event history as a case. */
export function openCaseForContact(
  world: World,
  contact: HistoricalEvent,
): World {
  if (contact.type !== "life.contacted-official") return world;
  const resident = contact.participants.find(
    ({ role }) => role === "focus:subject",
  )?.personId;
  const official = contact.participants.find(
    ({ role }) => role === "focus:object",
  )?.personId;
  if (!resident || !official) return world;
  const binding = officeBinding(world, official);
  if (!binding) return world;
  const stableKey = `office.case-opened:${contact.id}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: "office.case-opened",
    occurredAt: contact.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: contact.jurisdictionId,
    involvedEntityIds: [official, resident, binding.id],
    participants: [
      { personId: official, role: "focus:object", detail: null },
      { personId: resident, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "office.casework",
      `contact:${contact.id}`,
      `office-relationship:${binding.id}`,
      lifeOpportunityTag("constituent-case"),
      ...contact.tags.filter(
        (tag) => tag.startsWith("reason:") || tag.startsWith("source-record:"),
      ),
    ],
    summary: contact.tags.includes("reason:law-cost")
      ? "They contacted the office about a law that cost them something."
      : contact.tags.includes("reason:lived-outcome")
        ? "They contacted the office after something happened to them."
        : contact.tags.includes("reason:official-view")
          ? "They contacted the official whose actions they have a strong view of."
          : contact.tags.includes("reason:organized-opposition")
            ? "They contacted the office about a law they organized against."
            : "They made a general opinion call to the office.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
