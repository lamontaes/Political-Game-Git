import { currentOfficeWorkflowPreference } from "./office-workflow";
import {
  activeOrganizationParticipationsAt,
  workStatusAt,
} from "./life-queries";
import {
  officeStaffIncumbencyRecords,
  officeStaffPositionRecords,
} from "./governing/office-staffing";
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
  isException: boolean,
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

  const kind = routeForMode(preference.caseworkMode, isException);
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
