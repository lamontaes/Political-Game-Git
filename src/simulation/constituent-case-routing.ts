import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
} from "./life-queries";
import { peopleKnownTo, viewOfOfficial } from "./living-world/official-views";
import { measurePosition } from "./legislation";
import { currentOfficeWorkflowPreference } from "./office-workflow";
import { reporterRoleForPerson } from "./press/outlets";
import type {
  EntityId,
  HistoricalEvent,
  OfficeCaseworkWorkflowMode,
  World,
} from "./types";

const CONSTITUENT_CASE_OPENED = "office.case-opened";
const CONSTITUENT_CASE_CLOSED = "office.case-closed";
const STRONGLY_NEGATIVE_VIEW = -20;
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

function tagValue(event: HistoricalEvent, prefix: string): string | undefined {
  return event.tags
    .find((tag) => tag.startsWith(`${prefix}:`))
    ?.slice(prefix.length + 1);
}

/** Finds the recorded staff caseworker, then a municipal clerk/manager, then
 * the officeholder. The municipal fallback is an estimated default where no
 * town role is recorded. */
export function defaultCaseHandlerRole(
  world: World,
  officeHolderId: EntityId,
): { readonly personId: EntityId; readonly role: string } {
  const binding = officeBinding(world, officeHolderId);
  if (binding?.organizationId) {
    for (const personId of world.personOrder) {
      if (personId === officeHolderId) continue;
      const caseworker = activeWorkRelationshipsAt(world, personId).find(
        ({ relationship, role }) =>
          relationship.organizationId === binding.organizationId &&
          (role.title.toLowerCase().includes("caseworker") ||
            role.occupationClassification ===
              "profession:constituent-casework"),
      );
      if (caseworker) return { personId, role: "caseworker" };
    }
    const municipalRole = new Map([
      ["leader:municipal-clerk", "clerk"],
      ["leader:municipal-manager", "manager"],
    ]);
    for (const personId of world.personOrder) {
      const participation = activeOrganizationParticipationsAt(
        world,
        personId,
      ).find(
        ({ participation, state }) =>
          participation.organizationId === binding.organizationId &&
          state.roleKind !== null &&
          municipalRole.has(state.roleKind),
      );
      if (participation?.state.roleKind)
        return {
          personId,
          role: municipalRole.get(participation.state.roleKind)!,
        };
    }
  }
  return { personId: officeHolderId, role: "officeholder (estimated default)" };
}

export function constituentCasesForOffice(
  world: World,
  officeRelationshipId: EntityId,
): readonly HistoricalEvent[] {
  const opened = world.history.events.filter(
    (event) =>
      event.type === CONSTITUENT_CASE_OPENED &&
      event.tags.includes(`office-relationship:${officeRelationshipId}`),
  );
  const closedContacts = new Set(
    world.history.events
      .filter((event) => event.type === CONSTITUENT_CASE_CLOSED)
      .flatMap((event) =>
        event.tags.flatMap((tag) =>
          tag.startsWith("case:") ? [tag.slice("case:".length)] : [],
        ),
      ),
  );
  return opened.filter((event) => !closedContacts.has(event.id));
}

/** The one rule for the recorded exceptions in routine casework mode. */
export function isExceptionCase(
  world: World,
  caseEvent: HistoricalEvent,
  officeHolderId: EntityId,
): boolean {
  const residentId = caseEvent.participants.find(
    ({ role }) => role === "focus:subject",
  )?.personId;
  if (!residentId) return false;
  if (peopleKnownTo(world, officeHolderId).includes(residentId)) return true;
  if (reporterRoleForPerson(world, residentId)) return true;
  if (
    activeWorkRelationshipsAt(world, residentId).some(({ relationship }) =>
      OFFICE_WORK_KINDS.has(relationship.kind),
    )
  )
    return true;
  const pendingMeasure = caseEvent.tags
    .filter((tag) => tag.startsWith("source-record:"))
    .map((tag) => tag.slice("source-record:".length))
    .flatMap((id) =>
      (world.history.legislativeMeasures ?? []).filter((row) => row.id === id),
    )
    .some((measure) => !measurePosition(world, measure.id).terminal);
  if (pendingMeasure) return true;
  if (
    world.history.events.some(
      (event) =>
        event.involvedEntityIds.includes(residentId) &&
        event.involvedEntityIds.includes(officeHolderId) &&
        event.tags.includes("campaign-finance:contribution"),
    )
  )
    return true;
  return (
    viewOfOfficial(world, residentId, officeHolderId).points <=
    STRONGLY_NEGATIVE_VIEW
  );
}

export type ConstituentCaseRoute =
  | { readonly kind: "unconfigured" }
  | { readonly kind: "player" }
  | { readonly kind: "handler" };

/** Routes by the selected mode; the player scene consumer owns player cases. */
export function routeConstituentCase(
  world: World,
  caseEvent: HistoricalEvent,
  officeHolderId: EntityId,
  playerPersonId: EntityId | null,
  mode: OfficeCaseworkWorkflowMode | null,
): ConstituentCaseRoute {
  if (!mode) return { kind: "unconfigured" };
  const isPlayerOffice = playerPersonId === officeHolderId;
  if (!isPlayerOffice) return { kind: "handler" };
  if (mode === "player-handles-all") return { kind: "player" };
  if (
    mode === "staff-routine-player-exceptions" &&
    isExceptionCase(world, caseEvent, officeHolderId)
  )
    return { kind: "player" };
  return { kind: "handler" };
}

/** The next case the adult situation reader may offer to this officeholder. */
export function playerRoutedConstituentCase(
  world: World,
  playerPersonId: EntityId,
): HistoricalEvent | null {
  return (
    world.history.events.find((event) => {
      if (event.type !== CONSTITUENT_CASE_OPENED) return false;
      const officialId = event.participants.find(
        ({ role }) => role === "focus:object",
      )?.personId;
      if (officialId !== playerPersonId) return false;
      const relationshipId = tagValue(event, "office-relationship");
      const relationship = world.history.workRelationships.find(
        (row) => row.id === relationshipId,
      );
      const municipalSeat = world.history.organizationParticipations.find(
        (row) => row.id === relationshipId,
      );
      const bindingId = relationship?.id ?? municipalSeat?.id;
      const preference = relationship
        ? currentOfficeWorkflowPreference(
            world,
            playerPersonId,
            relationship.id,
          )
        : municipalSeat
          ? currentOfficeWorkflowPreference(
              world,
              playerPersonId,
              municipalSeat.id,
            )
          : null;
      return (
        bindingId !== undefined &&
        preference !== null &&
        routeConstituentCase(
          world,
          event,
          playerPersonId,
          playerPersonId,
          preference.caseworkMode,
        ).kind === "player" &&
        constituentCasesForOffice(world, bindingId).some(
          (open) => open.id === event.id,
        )
      );
    }) ?? null
  );
}
