import { createOrganization } from "./life";
import type { EntityId, World } from "./types";

export const BUSINESS_REVENUE_BASIS = "custom:business-revenue" as const;

export function aggregateCustomers(
  world: World,
  jurisdictionId: EntityId,
  formedAt: string = world.currentDate,
): { world: World; organizationId: EntityId } {
  const stableKey = `local-customers:${jurisdictionId}`;
  const existing = world.history.organizations.find(
    (organization) => organization.stableKey === stableKey,
  );
  if (existing) return { world, organizationId: existing.id };
  const next = createOrganization(world, {
    stableKey,
    formedAt,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "An aggregate counterparty for what a town's customers spend at its businesses. The game has no individual shoppers and does not pretend to model them.",
    },
    initialProfile: {
      name: "Local customers",
      classification: "custom:aggregate-customers",
      locationJurisdictionId: jurisdictionId,
    },
  });
  return { world: next, organizationId: next.history.organizations.at(-1)!.id };
}
