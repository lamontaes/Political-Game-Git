import scope from "../../data/research/money/business-taxpayer-scope.json" with { type: "json" };
import { recordsByStringField } from "./history-index";
import { workStatusAt } from "./life-queries";
import type { EntityId, World } from "./types";

/** Recorded active ownership only; an employee or a title does not grant it. */
export function businessTaxOwnersAt(world: World, organizationId: EntityId) {
  return recordsByStringField(
    world.history.workRelationships,
    "organizationId",
    organizationId,
  ).filter(
    (relationship) =>
      relationship.kind === scope.ownerWorkKind &&
      workStatusAt(world, relationship.id)?.status === "active" &&
      Boolean(world.people[relationship.personId]),
  );
}
