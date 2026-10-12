/** Supporting saved-record identity, exact key semantics; no catalog adapter. */
import type {
  EntityId,
  PublicGovernmentIdentity,
} from "../../simulation/types";
export interface PublicGovernmentIdentityCarrier {
  readonly jurisdictionId: EntityId;
  readonly publicGovernmentIdentity?: PublicGovernmentIdentity;
}

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
