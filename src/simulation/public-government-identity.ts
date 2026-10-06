import {
  municipalGovernmentByKey,
  municipalGovernments,
} from "./municipal-government";
import { lifePlaceByKey } from "./life-places";
import {
  allGovernmentUnits,
  governmentUnit,
  governmentUnitJurisdictionId,
} from "./government-units";
import {
  currentLifeCutoff,
  organizationsAt,
  organizationProfileAt,
} from "./life-queries";
import type {
  EntityId,
  HistoricalCutoff,
  PublicGovernmentIdentity,
  World,
} from "./types";

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

/** Compiled government identities, never geographic proximity, join old account keys. */
let accountKeys: Map<EntityId, Set<string>> | undefined;
function compiledAccountKeys(): Map<EntityId, Set<string>> {
  if (accountKeys) return accountKeys;
  const keys = new Map<EntityId, Set<string>>();
  const add = (jurisdictionId: EntityId, governmentKey: string) => {
    const entries = keys.get(jurisdictionId) ?? new Set<string>();
    entries.add(`public-government:local:${encodeURIComponent(governmentKey)}`);
    keys.set(jurisdictionId, entries);
  };
  for (const unit of allGovernmentUnits()) {
    if (
      !unit.functionalActive ||
      !["county", "municipality", "township"].includes(unit.unitType)
    )
      continue;
    const municipal =
      unit.unitType === "municipality"
        ? municipalGovernmentByKey(unit.id)
        : null;
    add(governmentUnitJurisdictionId(unit), municipal?.key ?? unit.id);
  }
  for (const municipal of municipalGovernments()) {
    const place = municipal.placeGeoid
      ? lifePlaceByKey(municipal.placeGeoid)
      : null;
    if (place) add(place.context.jurisdiction.id, municipal.key);
  }
  accountKeys = keys;
  return keys;
}

/** Resolve a legacy geographic key only when the compiled crosswalk names one government. */
export function canonicalPublicGovernmentAccountKey(
  identity: PublicGovernmentIdentity,
): string {
  if (identity.kind === "local-government") {
    const unit = governmentUnit(identity.governmentKey);
    const municipal =
      unit?.unitType === "municipality"
        ? municipalGovernmentByKey(unit.id)
        : null;
    return publicGovernmentOrganizationKey({
      ...identity,
      governmentKey: municipal?.key ?? identity.governmentKey,
    });
  }
  const keys = compiledAccountKeys().get(identity.jurisdictionId);
  return keys?.size === 1
    ? [...keys][0]!
    : publicGovernmentOrganizationKey(identity);
}

/** Old stable keys remain saved verbatim; only their account lookup key is migrated. */
export function canonicalSavedPublicGovernmentAccountKey(
  stableKey: string,
): string | null {
  const prefix = "public-government:";
  if (!stableKey.startsWith(prefix)) return null;
  const local = `${prefix}local:`;
  if (stableKey.startsWith(local)) {
    try {
      const governmentKey = decodeURIComponent(stableKey.slice(local.length));
      const unit = governmentUnit(governmentKey);
      const municipal = municipalGovernmentByKey(governmentKey);
      const jurisdictionId = unit
        ? governmentUnitJurisdictionId(unit)
        : municipal?.placeGeoid
          ? lifePlaceByKey(municipal.placeGeoid)?.context.jurisdiction.id
          : null;
      return jurisdictionId
        ? canonicalPublicGovernmentAccountKey({
            kind: "local-government",
            governmentKey,
            jurisdictionId,
          })
        : stableKey;
    } catch {
      return null;
    }
  }
  return canonicalPublicGovernmentAccountKey({
    kind: "jurisdiction",
    jurisdictionId: stableKey.slice(prefix.length) as EntityId,
  });
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
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): void {
  if (!world.jurisdictions[identity.jurisdictionId])
    throw new Error(
      "A public-government identity names a missing jurisdiction.",
    );
  if (identity.kind === "jurisdiction") return;

  const unit = governmentUnit(identity.governmentKey);
  if (
    unit?.functionalActive &&
    (unit.unitType === "municipality" ||
      unit.unitType === "county" ||
      unit.unitType === "township") &&
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

  const organization = organizationsAt(world, cutoff).find(
    (row) => row.stableKey === `municipal-government:${identity.governmentKey}`,
  );
  if (!organization) return;
  const profile = organizationProfileAt(world, organization.id, cutoff);
  if (profile && profile.locationJurisdictionId !== identity.jurisdictionId)
    throw new Error(
      "A local public-government account cannot move away from its canonical government place.",
    );
}
