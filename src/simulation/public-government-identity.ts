import { municipalGovernmentByKey } from "./municipal-government";
import { lifePlaceByKey } from "./life-places";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "./government-units";
import type { EntityId, PublicGovernmentIdentity, World } from "./types";

export interface PublicGovernmentIdentityCarrier {
  readonly jurisdictionId: EntityId;
  readonly publicGovernmentIdentity?: PublicGovernmentIdentity;
}

/** Interpret old records as jurisdiction-scoped without rewriting their bytes. */
export function publicGovernmentIdentityForRecord(
  record: PublicGovernmentIdentityCarrier,
): PublicGovernmentIdentity {
  const identity =
    record.publicGovernmentIdentity ??
    ({
      kind: "jurisdiction",
      jurisdictionId: record.jurisdictionId,
    } as const);
  if (identity.jurisdictionId !== record.jurisdictionId)
    throw new Error(
      "A public-government identity must name the record's geographic jurisdiction.",
    );
  if (identity.kind === "local-government" && !identity.governmentKey.trim())
    throw new Error(
      "A local public-government identity needs a government key.",
    );
  return identity;
}

/** Stable identity for resource accounts. Existing jurisdiction keys stay put. */
export function publicGovernmentOrganizationKey(
  identity: PublicGovernmentIdentity,
): string {
  return identity.kind === "jurisdiction"
    ? `public-government:${identity.jurisdictionId}`
    : `public-government:local:${encodeURIComponent(identity.governmentKey)}`;
}

/** Stable comparison key for records and scoped program readers. */
export function publicGovernmentIdentityKey(
  identity: PublicGovernmentIdentity,
): string {
  return identity.kind === "jurisdiction"
    ? `jurisdiction:${identity.jurisdictionId}`
    : `local-government:${encodeURIComponent(identity.governmentKey)}:${identity.jurisdictionId}`;
}

export function samePublicGovernmentIdentity(
  left: PublicGovernmentIdentity,
  right: PublicGovernmentIdentity,
): boolean {
  return (
    publicGovernmentIdentityKey(left) === publicGovernmentIdentityKey(right)
  );
}

/**
 * Checks identity against the compiled government catalog and its canonical
 * place. A valid local key still carries no source authority by itself.
 */
export function assertPublicGovernmentIdentity(
  world: World,
  identity: PublicGovernmentIdentity,
): void {
  if (!world.jurisdictions[identity.jurisdictionId])
    throw new Error(
      "A public-government identity names a missing jurisdiction.",
    );
  if (identity.kind === "jurisdiction") return;

  const unit = governmentUnit(identity.governmentKey);
  if (
    unit?.functionalActive &&
    (unit.unitType === "municipality" || unit.unitType === "county") &&
    governmentUnitJurisdictionId(unit) === identity.jurisdictionId
  )
    return;

  const government = municipalGovernmentByKey(identity.governmentKey);
  const place = government?.placeGeoid
    ? lifePlaceByKey(government.placeGeoid)
    : null;
  if (!government || place?.context.jurisdiction.id !== identity.jurisdictionId)
    throw new Error(
      "A local public-government identity must match a compiled government's canonical place.",
    );

  const organization = world.history.organizations.find(
    (row) => row.stableKey === `municipal-government:${identity.governmentKey}`,
  );
  if (!organization) return;
  const profile = world.history.organizationProfiles
    .filter(
      (row) =>
        row.organizationId === organization.id &&
        row.effectiveAt <= world.currentDate,
    )
    .at(-1);
  if (profile && profile.locationJurisdictionId !== identity.jurisdictionId)
    throw new Error(
      "A local public-government account cannot move away from its canonical government place.",
    );
}
