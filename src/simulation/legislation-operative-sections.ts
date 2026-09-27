import { programVariant } from "./legislation-program-families";
import type { CompiledBillDraft } from "./legislation-drafting";
import { BillConfigurationError } from "./legislation-drafting";
import { stateJurisdictionForKey } from "./life-places";
import { US_STATE_USPS } from "./nationwide-world/state-executive-candidacy-packs";
import { PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY } from "./public-fiscal";
import {
  TRANSIT_FAMILY_KEY,
  TRANSIT_FAMILY_VERSION,
  TRANSIT_VARIANT_KEY,
} from "./legislation-transit-families";
import type { EntityId } from "./types";

/**
 * A section is offered for operative filing only where a canonical consumer
 * reads its exact terms. Catalog text remains available for research and old
 * saves; this gate applies to the ordinary player filing action.
 */
export interface OperativeSectionSupport {
  readonly provisionKey: string;
  readonly heading: string;
  readonly supported: boolean;
  readonly reason: string | null;
}

const stateKeyCache = new Map<EntityId, string | null>();

function stateKey(jurisdictionId: EntityId): string | null {
  if (stateKeyCache.has(jurisdictionId))
    return stateKeyCache.get(jurisdictionId)!;
  for (const usps of US_STATE_USPS) {
    if (stateJurisdictionForKey(`US-${usps}`)?.id === jurisdictionId) {
      const key = `US-${usps}`;
      stateKeyCache.set(jurisdictionId, key);
      return key;
    }
  }
  stateKeyCache.set(jurisdictionId, null);
  return null;
}

const GENERAL_APPROPRIATION_KEYS: Readonly<Record<string, readonly string[]>> =
  {
    "single-programme": ["authority-named", "amount-provided", "availability"],
    supplemental: ["authority-named", "amount-provided", "lapse"],
  };

export function operativeSectionSupport(
  familyKey: string,
  variantKey: string,
  jurisdictionId: EntityId,
): readonly OperativeSectionSupport[] {
  const { family, variant } = programVariant(familyKey, variantKey);
  const jurisdictionState = stateKey(jurisdictionId);
  const generalKeys =
    familyKey === TRANSIT_FAMILY_KEY
      ? GENERAL_APPROPRIATION_KEYS[variantKey]
      : undefined;
  const pinnedTransit =
    familyKey === TRANSIT_FAMILY_KEY && variantKey === TRANSIT_VARIANT_KEY;
  return variant.clauses.map((clause) => {
    let reason: string | null = null;
    if (familyKey !== TRANSIT_FAMILY_KEY)
      reason =
        "This section has no canonical enacted-rule or delivery consumer yet.";
    else if (family.familyVersion !== TRANSIT_FAMILY_VERSION)
      reason =
        "The enacted consumer has not been checked for this family version.";
    else if (jurisdictionState === null)
      reason =
        "No state appropriation consumer is compiled for this jurisdiction.";
    else if (pinnedTransit) {
      if (jurisdictionState !== PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY)
        reason =
          "The enacted service and availability rules for this transit program are compiled only for Alaska.";
    } else if (!generalKeys?.includes(clause.provisionKey))
      reason =
        "This section has no canonical enacted-rule or delivery consumer yet.";
    return {
      provisionKey: clause.provisionKey,
      heading: clause.heading,
      supported: reason === null,
      reason,
    };
  });
}

/** Refuses an effectless ordinary filing before a measure or provision is written. */
export function assertOperativeDraft(draft: CompiledBillDraft): void {
  if (
    draft.instrument === "appropriation" &&
    draft.predicateAuthority?.kind === "docket-measure" &&
    draft.predicateAuthority.legalStatus !== "enacted"
  )
    throw new BillConfigurationError(
      "The measure named as spending authority has not become law, so this appropriation cannot yet take effect.",
    );
  const support = operativeSectionSupport(
    draft.familyKey,
    draft.variantKey,
    draft.jurisdictionId,
  );
  for (const clause of draft.clauses) {
    const status = support.find(
      (entry) => entry.provisionKey === clause.provisionKey,
    );
    if (!status?.supported)
      throw new BillConfigurationError(
        `${clause.heading} cannot be filed as an operative section: ${status?.reason ?? "No enacted consumer is known."}`,
      );
  }
  if (
    draft.familyKey === TRANSIT_FAMILY_KEY &&
    draft.variantKey === TRANSIT_VARIANT_KEY &&
    draft.clauses.length !== support.length
  )
    throw new BillConfigurationError(
      "The supported transit service mandate requires all of its sections together.",
    );
  const generalKeys =
    draft.familyKey === TRANSIT_FAMILY_KEY
      ? GENERAL_APPROPRIATION_KEYS[draft.variantKey]
      : undefined;
  if (
    generalKeys &&
    generalKeys.some(
      (key) => !draft.clauses.some((clause) => clause.provisionKey === key),
    )
  )
    throw new BillConfigurationError(
      "This appropriation must retain its named authority, amount, and availability date together.",
    );
}
