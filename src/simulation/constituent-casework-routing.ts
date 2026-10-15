import { currentOfficeWorkflowPreference } from "./office-workflow";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  workStatusAt,
} from "./life-queries";
import { peopleKnownTo } from "./living-world/official-views";
import {
  viewOfOfficial,
  OFFICIAL_VIEW_BASE_POINTS,
} from "./official-view-reads";
import {
  officeStaffIncumbencyRecords,
  officeStaffPositionRecords,
} from "./governing/office-staffing";
import { OFFICE_EMPLOYMENT_KINDS } from "./governing/office-consequence";
import { publicOfficesHeldBy } from "./crisis/offices";
import { reporterRoleForPerson } from "./press/outlets";
import { favorRecords } from "./favors";
import { measurePosition } from "./legislation";
import type { EntityId, OfficeCaseworkWorkflowMode, World } from "./types";

export interface OfficeCaseEventReference {
  readonly type: string;
  readonly tags: readonly string[];
  readonly jurisdictionId?: EntityId;
  readonly participants: readonly {
    readonly personId: EntityId;
    readonly role: string;
  }[];
}

export type ConstituentCaseRoute =
  | {
      readonly kind: "player";
      readonly officeholderId: EntityId;
      readonly officeRelationshipId: EntityId;
      readonly mode: OfficeCaseworkWorkflowMode;
    }
  | {
      readonly kind: "office";
      readonly officeholderId: EntityId;
      readonly officeRelationshipId: EntityId;
      readonly handlerPersonId: EntityId;
      readonly mode: OfficeCaseworkWorkflowMode;
    }
  | { readonly kind: "unassigned"; readonly officeRelationshipId: EntityId }
  | { readonly kind: "unconfigured" }
  | null;

/** Route a saved office case using that office's current recorded preference. */
export function routeConstituentCase(
  world: World,
  event: OfficeCaseEventReference,
  playerPersonId: EntityId,
): ConstituentCaseRoute {
  if (event.type !== "office.case-opened") return null;
  const officeholderId = event.participants.find(
    (participant) => participant.role === "focus:object",
  )?.personId;
  const relationshipTag = event.tags.find((tag) =>
    tag.startsWith("office-relationship:"),
  );
  const officeRelationshipId = relationshipTag?.slice(
    "office-relationship:".length,
  ) as EntityId | undefined;
  if (
    !officeholderId ||
    officeholderId !== playerPersonId ||
    !officeRelationshipId
  )
    return null;

  const preference = currentOfficeWorkflowPreference(
    world,
    officeholderId,
    officeRelationshipId,
  );
  if (!preference) return { kind: "unconfigured" };

  const kind = routeForMode(
    preference.caseworkMode,
    isConstituentCaseException(world, event, playerPersonId),
  );
  if (kind === "player")
    return {
      kind,
      officeholderId,
      officeRelationshipId,
      mode: preference.caseworkMode,
    };
  const handlerPersonId = officeHandler(
    world,
    officeholderId,
    officeRelationshipId,
  );
  if (!handlerPersonId) return { kind: "unassigned", officeRelationshipId };
  return {
    kind,
    officeholderId,
    officeRelationshipId,
    handlerPersonId,
    mode: preference.caseworkMode,
  };
}

/** Record-backed exception rules from the b06 constituent-case assignment. */
export function isConstituentCaseException(
  world: World,
  event: OfficeCaseEventReference,
  playerPersonId: EntityId,
): boolean {
  const residentId = event.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  if (!residentId) return false;
  if (peopleKnownTo(world, playerPersonId).includes(residentId)) return true;
  if (reporterRoleForPerson(world, residentId)) return true;
  if (holdsPublicOffice(world, residentId)) return true;
  if (
    favorRecords(world).some(
      (favor) =>
        favor.kind === "political:campaign-donation" &&
        favor.giverPersonId === residentId &&
        favor.receiverPersonId === playerPersonId,
    )
  )
    return true;
  if (hasPendingMeasureForContact(world, event)) return true;
  return (
    viewOfOfficial(world, residentId, playerPersonId).points <=
    -OFFICIAL_VIEW_BASE_POINTS
  );
}

function holdsPublicOffice(world: World, personId: EntityId): boolean {
  if (publicOfficesHeldBy(world, personId).length > 0) return true;
  if (
    activeOrganizationParticipationsAt(world, personId).some(
      ({ participation, state }) =>
        participation.kind === "leadership:municipal-office" &&
        state.roleKind !== null,
    )
  )
    return true;
  return activeWorkRelationshipsAt(world, personId).some(({ relationship }) =>
    OFFICE_EMPLOYMENT_KINDS.includes(relationship.kind),
  );
}

function hasPendingMeasureForContact(
  world: World,
  event: OfficeCaseEventReference,
): boolean {
  const propositionTag = event.tags.find((tag) =>
    tag.startsWith("message-proposition-id:"),
  );
  const propositionId = propositionTag?.slice(
    "message-proposition-id:".length,
  ) as EntityId | undefined;
  if (!propositionId) return false;
  return (world.history.legislativeMeasures ?? []).some(
    (measure) =>
      measure.propositionIds?.includes(propositionId) &&
      !measurePosition(world, measure.id).terminal,
  );
}

function officeHandler(
  world: World,
  officeholderId: EntityId,
  officeRelationshipId: EntityId,
): EntityId | null {
  const workRelationship = world.history.workRelationships.find(
    (relationship) => relationship.id === officeRelationshipId,
  );
  const participation = world.history.organizationParticipations.find(
    (record) => record.id === officeRelationshipId,
  );
  const organizationId =
    workRelationship?.organizationId ?? participation?.organizationId;
  if (!organizationId) return null;
  if (
    (workRelationship &&
      workStatusAt(world, workRelationship.id)?.status !== "active") ||
    (participation &&
      !activeOrganizationParticipationsAt(world, officeholderId).some(
        ({ participation: active }) => active.id === participation.id,
      ))
  )
    return null;

  const caseworkerPositions = officeStaffPositionRecords(world).filter(
    (position) =>
      position.organizationId === organizationId &&
      position.classKey === "office-constituent-services",
  );
  for (const position of caseworkerPositions) {
    const incumbency = officeStaffIncumbencyRecords(world)
      .filter((record) => record.positionId === position.id)
      .sort((left, right) => right.sequence - left.sequence)
      .find(
        (record) =>
          workStatusAt(world, record.workRelationshipId)?.status === "active",
      );
    if (incumbency) return incumbency.personId;
  }

  if (!participation) return null;
  const councilHandlers = world.personOrder.flatMap((personId) =>
    activeOrganizationParticipationsAt(world, personId)
      .filter(
        ({ participation: active, state }) =>
          active.organizationId === organizationId &&
          (state.roleKind === "leader:municipal-clerk" ||
            state.roleKind === "leader:municipal-manager"),
      )
      .map(({ participation: active, state }) => ({
        personId,
        roleKind: state.roleKind,
        sequence: active.sequence,
      })),
  );
  return (
    councilHandlers.find(
      (handler) => handler.roleKind === "leader:municipal-clerk",
    )?.personId ??
    councilHandlers.find(
      (handler) => handler.roleKind === "leader:municipal-manager",
    )?.personId ??
    null
  );
}

function routeForMode(
  mode: OfficeCaseworkWorkflowMode,
  isException: boolean,
): "player" | "office" {
  switch (mode) {
    case "player-handles-all":
      return "player";
    case "staff-routine-player-exceptions":
      return isException ? "player" : "office";
    case "staff-handles-and-briefs":
      return "office";
  }
}
