import { canonicalJson } from "./canonical-json";
import { stableHash } from "./ids";
import {
  stateJurisdictionForKey,
  stateKeyForJurisdictionSlug,
} from "./life-places";
import { US_STATE_USPS } from "./nationwide-world/state-executive-candidacy-packs";
import { rulePackById } from "./legislature-rule-packs";
import type { EntityId, PublicProgramBasis, World } from "./types";

export const STATE_TRANSIT_SERVICE_PROFILE_VERSION =
  "state-transit-service-profile/v1" as const;

type StateUsps = (typeof US_STATE_USPS)[number];

interface StateTransitServiceProfileDefinition {
  readonly profileId: string;
  readonly jurisdictionId: EntityId;
  readonly jurisdictionKey: `US-${StateUsps}`;
  readonly rulePackId: string;
  readonly rulePackBasis: "researched" | "game-profile";
  readonly programKey: `transit:${Lowercase<StateUsps>}`;
  readonly availabilityDays: 365;
  readonly basis: PublicProgramBasis;
}

export interface StateTransitServiceProfileRef {
  readonly profileId: string;
  readonly version: typeof STATE_TRANSIT_SERVICE_PROFILE_VERSION;
  readonly digest: string;
}

export interface StateTransitServiceProfile extends StateTransitServiceProfileDefinition {
  readonly version: typeof STATE_TRANSIT_SERVICE_PROFILE_VERSION;
  readonly digest: string;
  readonly ref: StateTransitServiceProfileRef;
}

function digestFor(definition: StateTransitServiceProfileDefinition): string {
  return stableHash(
    canonicalJson({
      version: STATE_TRANSIT_SERVICE_PROFILE_VERSION,
      profile: definition,
    }),
  );
}

/**
 * Resolves only the measure's saved state identity and its matching saved
 * legislative pack. It supplies a separate state transit program key and
 * availability window; the enactment record supplies the actual start date.
 */
export function stateTransitServiceProfileForMeasure(
  world: Pick<World, "jurisdictions">,
  measure: { readonly jurisdictionId: EntityId; readonly rulePackId: string },
): StateTransitServiceProfile | null {
  const savedJurisdiction = world.jurisdictions[measure.jurisdictionId];
  const jurisdictionKey = savedJurisdiction
    ? stateKeyForJurisdictionSlug(savedJurisdiction.slug)
    : null;
  if (!jurisdictionKey || !jurisdictionKey.startsWith("US-")) return null;
  const stateUsps = jurisdictionKey.slice(3) as StateUsps;
  if (
    !US_STATE_USPS.includes(stateUsps) ||
    stateJurisdictionForKey(jurisdictionKey)?.id !== measure.jurisdictionId
  )
    return null;

  let rulePack;
  try {
    rulePack = rulePackById(measure.rulePackId);
  } catch {
    return null;
  }
  if (rulePack.jurisdictionKey !== jurisdictionKey) return null;

  const profileId = `state-transit-service:${jurisdictionKey.toLowerCase()}`;
  const definition: StateTransitServiceProfileDefinition = {
    profileId,
    jurisdictionId: measure.jurisdictionId,
    jurisdictionKey: jurisdictionKey as `US-${StateUsps}`,
    rulePackId: measure.rulePackId,
    rulePackBasis: rulePack.basis,
    programKey:
      `transit:${stateUsps.toLowerCase()}` as `transit:${Lowercase<StateUsps>}`,
    availabilityDays: 365,
    basis: {
      kind: "game-profile",
      note: `Fictional ${jurisdictionKey} transit-service profile tied to the saved legislative pack ${measure.rulePackId} (${rulePack.basis}). The appropriation is available from its enactment record's effective date. This profile creates spending authority, not revenue or cash.`,
    },
  };
  const version = STATE_TRANSIT_SERVICE_PROFILE_VERSION;
  const digest = digestFor(definition);
  const ref = { profileId, version, digest };
  return { ...definition, version, digest, ref };
}
