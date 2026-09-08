import { INFRASTRUCTURE_FAMILIES } from "./legislation-infrastructure-families";
import { FISCAL_INSTRUMENT_FAMILIES } from "./legislation-fiscal-families";
import { PUBLIC_ADMINISTRATION_FAMILIES } from "./legislation-administration-families";
import { RESILIENCE_FAMILIES } from "./legislation-resilience-families";
import type {
  PredicateAuthority,
  ProgramFamily,
  ProgramVariant,
} from "./legislation-content-contracts";

/**
 * The content bank the game reads.
 *
 * This module is a registry and nothing else. The contracts a bill is written
 * against live in `legislation-content-contracts.ts`; the bills themselves live
 * in the banks imported above, grouped by what they are rather than by who
 * wrote them. Splitting them was not tidiness — a single file holding both the
 * rules and every bill written under them stops being readable at exactly the
 * point the bank becomes worth having.
 *
 * The contracts are re-exported here so that consumers keep importing one
 * module. Nothing about a family's meaning depends on which file it sits in.
 */

export * from "./legislation-content-contracts";

const FAMILIES: readonly ProgramFamily[] = [
  ...INFRASTRUCTURE_FAMILIES,
  ...FISCAL_INSTRUMENT_FAMILIES,
  ...PUBLIC_ADMINISTRATION_FAMILIES,
  ...RESILIENCE_FAMILIES,
];

export function programFamilies(): readonly ProgramFamily[] {
  return FAMILIES;
}

export function programFamilyKeys(): readonly string[] {
  return FAMILIES.map((family) => family.familyKey);
}

export function programFamily(familyKey: string): ProgramFamily {
  const family = FAMILIES.find((entry) => entry.familyKey === familyKey);
  if (!family) {
    throw new Error(`No programme family is defined for '${familyKey}'.`);
  }
  return family;
}

export function programVariant(
  familyKey: string,
  variantKey: string,
): { readonly family: ProgramFamily; readonly variant: ProgramVariant } {
  const family = programFamily(familyKey);
  const variant = family.variants.find(
    (entry) => entry.variantKey === variantKey,
  );
  if (!variant) {
    throw new Error(
      `The ${family.title} family has no '${variantKey}' configuration.`,
    );
  }
  return { family, variant };
}

/** Every family/variant pair the bank offers, in declaration order. */
export function programConfigurations(): readonly {
  readonly familyKey: string;
  readonly variantKey: string;
}[] {
  return FAMILIES.flatMap((family) =>
    family.variants.map((variant) => ({
      familyKey: family.familyKey,
      variantKey: variant.variantKey,
    })),
  );
}

/**
 * Every standing authority the bank declares, across all families.
 *
 * These are the programmes this state is fictionally assumed already to run.
 * They are what makes an appropriation or a repeal playable before the player
 * has authorized anything themselves, and they are read from the bank rather
 * than invented by whichever surface needed one.
 */
export function standingAuthorities(): readonly PredicateAuthority[] {
  return FAMILIES.flatMap((family) => family.standingAuthorities ?? []);
}

export function standingAuthority(
  authorityKey: string,
): PredicateAuthority | null {
  return (
    standingAuthorities().find(
      (authority) => authority.authorityKey === authorityKey,
    ) ?? null
  );
}
