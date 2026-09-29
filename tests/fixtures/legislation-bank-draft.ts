import { US_CONGRESS_PACK_ID } from "../../src/simulation/congress-rule-pack";
import { makeIsoDate } from "../../src/simulation/dates";
import { createStableId } from "../../src/simulation/ids";
import {
  compileBillDraft,
  type CompiledBillDraft,
} from "../../src/simulation/legislation-drafting";
import {
  legalInstrumentRule,
  programVariant,
  standingAuthorities,
  type PredicateAuthority,
} from "../../src/simulation/legislation-program-families";
import { TRANSIT_PROGRAM_KEY } from "../../src/simulation/legislation-transit-families";
import { localFiscalAuthorityScopeForRulePackId } from "../../src/simulation/municipal-government";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import type { EntityId } from "../../src/simulation/types";

const KENTUCKY = createStableId("jurisdiction", "us-ky");
const KENTUCKY_PACK = "us-ky-general-assembly-v1";
const LOCAL_PACK = "us-dc-washington-council-v1";
const FILED_ON = makeIsoDate("2026-01-14");

/**
 * Compile one bank variant under a legislature that can actually enact it.
 * Every level-bound game profile has an explicit authority fixture. A new one
 * fails here until its exact government and authority have been recorded.
 */
export function compileBankConfigurationForTest(
  familyKey: string,
  variantKey: string,
  designation = "HB 900",
): CompiledBillDraft {
  const { variant } = programVariant(familyKey, variantKey);
  function compile(
    scenarioKey: string,
    jurisdictionId: EntityId,
    rulePackId: string,
    predicateAuthority?: PredicateAuthority,
  ): CompiledBillDraft {
    return compileBillDraft({
      familyKey,
      variantKey,
      scenarioKey,
      jurisdictionId,
      rulePackId,
      designation,
      filedOn: FILED_ON,
      ...(predicateAuthority ? { predicateAuthority } : {}),
    });
  }

  if (variantKey === "federal-passenger-rail-v1") {
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    return compile(
      `institution:${US_CONGRESS_PACK_ID}`,
      jurisdictionId,
      US_CONGRESS_PACK_ID,
      {
        kind: "game-profile",
        authorityKey: "game-profile:federal-passenger-rail/v1",
        authorityVersion: "test-federal-rail-authority/v1",
        profileVersion: "federal-passenger-rail-service:us",
        rulePackId: US_CONGRESS_PACK_ID,
        governmentLevel: "federal",
        publicGovernmentIdentity: { kind: "jurisdiction", jurisdictionId },
        permittedEffects: ["public-program-appropriation"],
        citationLabel: "Federal passenger-rail game profile",
        programLabel: "modeled passenger-rail service",
        authorizedCeilingMinorUnits: null,
        currency: "USD",
        basis: "game-profile",
      },
    );
  }

  if (variantKey === "local-fix-it-first-v1") {
    const scope = localFiscalAuthorityScopeForRulePackId(LOCAL_PACK);
    if (!scope)
      throw new Error(`Missing local fiscal fixture for ${LOCAL_PACK}.`);
    return compile(
      `institution:${LOCAL_PACK}`,
      scope.jurisdictionId,
      LOCAL_PACK,
      {
        kind: "game-profile",
        authorityKey: scope.authority.authorityKey,
        authorityVersion: scope.authority.authorityVersion,
        profileVersion: scope.authority.profileVersion,
        rulePackId: LOCAL_PACK,
        governmentLevel: "municipality",
        publicGovernmentIdentity: {
          kind: "local-government",
          jurisdictionId: scope.jurisdictionId,
          governmentKey: scope.unit.id,
        },
        permittedEffects: scope.authority.permittedEffects,
        citationLabel: "Washington council ordinary fiscal authority",
        programLabel: "modeled local public works",
        authorizedCeilingMinorUnits: null,
        currency: "USD",
        basis: "game-profile",
      },
    );
  }

  if (variantKey === "transit-staged-service-v2") {
    return compile("kentucky", KENTUCKY, KENTUCKY_PACK, {
      kind: "game-profile",
      authorityKey: TRANSIT_PROGRAM_KEY,
      authorityVersion: "test-state-transit-authority/v1",
      profileVersion: "test-state-transit-service/v1",
      rulePackId: KENTUCKY_PACK,
      governmentLevel: "state",
      publicGovernmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: KENTUCKY,
      },
      permittedEffects: ["public-program-appropriation"],
      citationLabel: "Kentucky transit game profile",
      programLabel: "modeled rural transit service",
      authorizedCeilingMinorUnits: null,
      currency: "USD",
      basis: "game-profile",
    });
  }

  if (variant.npcEligibility?.length)
    throw new Error(
      `Add an exact government and authority fixture for ${familyKey}/${variantKey}.`,
    );
  const rule = legalInstrumentRule(variant.instrument);
  if (!rule.requiresPredicateAuthority)
    return compile("kentucky", KENTUCKY, KENTUCKY_PACK);
  const authority = standingAuthorities().find((candidate) =>
    rule.predicateMustAuthorizeSpending ? candidate.authorizesSpending : true,
  );
  if (!authority)
    throw new Error(
      `Missing standing authority fixture for ${familyKey}/${variantKey}.`,
    );
  return compile("kentucky", KENTUCKY, KENTUCKY_PACK, authority);
}
