/** The exact local game grant presented to the shared bill compiler. */
import type { LocalFiscalAuthorityGranted } from "./local-fiscal-authority";
import type { LocalFiscalGameAuthority } from "./local-ordinance-game-profile";
import { makeCurrencyCode } from "./resources";
import type { CurrencyCode, EntityId } from "./types";

export interface LocalFiscalPredicateAuthority {
  readonly kind: "game-profile";
  readonly authorityKey: string;
  readonly authorityVersion: string;
  readonly profileVersion: string;
  readonly rulePackId: string;
  readonly publicGovernmentIdentity: {
    readonly kind: "local-government";
    readonly jurisdictionId: EntityId;
    readonly governmentKey: string;
  };
  readonly governmentLevel: "municipality" | "county";
  readonly permittedEffects: LocalFiscalGameAuthority["permittedEffects"];
  readonly citationLabel: string;
  readonly programLabel: string;
  readonly authorizedCeilingMinorUnits: null;
  readonly currency: CurrencyCode;
  readonly basis: "game-profile";
}

export function localFiscalPredicateAuthority(
  grant: LocalFiscalAuthorityGranted,
): LocalFiscalPredicateAuthority {
  return {
    kind: "game-profile",
    authorityKey: grant.authority.authorityKey,
    authorityVersion: grant.authority.authorityVersion,
    profileVersion: grant.authority.profileVersion,
    rulePackId: grant.authority.rulePackId,
    publicGovernmentIdentity: {
      kind: "local-government",
      jurisdictionId: grant.jurisdictionId,
      governmentKey: grant.governmentKey,
    },
    governmentLevel: grant.authority.level,
    permittedEffects: grant.authority.permittedEffects,
    citationLabel: "Our Civic Duty local ordinance game profile",
    programLabel: "local public-works maintenance program",
    authorizedCeilingMinorUnits: null,
    currency: makeCurrencyCode("USD"),
    basis: "game-profile",
  };
}
