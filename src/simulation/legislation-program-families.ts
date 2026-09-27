import { SERVICE_FAMILIES } from "./legislation-service-families";
import { INFRASTRUCTURE_FAMILIES } from "./legislation-infrastructure-families";
import { FISCAL_INSTRUMENT_FAMILIES } from "./legislation-fiscal-families";
import { PUBLIC_ADMINISTRATION_FAMILIES } from "./legislation-administration-families";
import { RESILIENCE_FAMILIES } from "./legislation-resilience-families";
import type {
  LegalInstrument,
  NpcLawEligibility,
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
  ...SERVICE_FAMILIES,
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
    throw new Error(`No program family is defined for '${familyKey}'.`);
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

export interface NpcEligibleProgramConfiguration extends NpcLawEligibility {
  readonly familyKey: string;
  readonly variantKey: string;
}

/**
 * Exact executable policy directions declared by the content bank. A variant
 * may be about many questions without being able to answer any of them in a
 * way the World can apply. The query deliberately reads only explicit NPC
 * eligibility, never subjects or titles.
 */
const NPC_ELIGIBLE_CONFIGURATIONS: readonly NpcEligibleProgramConfiguration[] =
  (() => {
    const rows: NpcEligibleProgramConfiguration[] = [];
    const declarationKeys = new Set<string>();
    for (const family of FAMILIES) {
      for (const variant of family.variants) {
        for (const eligibility of variant.npcEligibility ?? []) {
          if (!variant.propositionKeys?.includes(eligibility.propositionKey)) {
            throw new Error(
              `${family.familyKey}/${variant.variantKey} declares NPC eligibility for an unrelated policy question.`,
            );
          }
          if (
            eligibility.authorityKind === "standing-statute" &&
            eligibility.authorityKey === null
          ) {
            throw new Error(
              `${family.familyKey}/${variant.variantKey} needs an exact standing authority key.`,
            );
          }
          const effectClause = variant.clauses.find(
            (clause) => clause.provisionKey === eligibility.effectProvisionKey,
          );
          if (
            !effectClause ||
            effectClause.parameterKey !== eligibility.effectParameterKey ||
            !variant.parameters.some(
              (parameter) => parameter.key === eligibility.effectParameterKey,
            )
          ) {
            throw new Error(
              `${family.familyKey}/${variant.variantKey} has no declared parameterized effect clause for NPC filing.`,
            );
          }
          if (
            eligibility.operativeEffectKind === "public-program-appropriation"
          ) {
            const moneyParameter = variant.parameters.find(
              (parameter) =>
                parameter.key === eligibility.effectParameterKey &&
                parameter.kind === "money",
            );
            const defaultValue =
              variant.defaults[eligibility.effectParameterKey];
            if (
              variant.instrument !== "appropriation" ||
              !moneyParameter ||
              moneyParameter.kind !== "money" ||
              !defaultValue ||
              defaultValue.kind !== "money" ||
              defaultValue.minorUnits <= 0 ||
              defaultValue.minorUnits < moneyParameter.minMinorUnits ||
              defaultValue.minorUnits > moneyParameter.maxMinorUnits
            ) {
              throw new Error(
                `${family.familyKey}/${variant.variantKey} has no bounded positive appropriation for NPC filing.`,
              );
            }
          }
          const declarationKey = `${family.familyKey}\u0000${variant.variantKey}\u0000${eligibility.governmentLevel}\u0000${eligibility.propositionKey}\u0000${eligibility.answer}`;
          if (declarationKeys.has(declarationKey)) {
            throw new Error(
              `${family.familyKey}/${variant.variantKey} declares the same NPC policy answer twice.`,
            );
          }
          declarationKeys.add(declarationKey);
          rows.push({
            ...eligibility,
            familyKey: family.familyKey,
            variantKey: variant.variantKey,
          });
        }
      }
    }
    return rows;
  })();

export function npcEligibleProgramConfigurations(): readonly NpcEligibleProgramConfiguration[] {
  return NPC_ELIGIBLE_CONFIGURATIONS;
}

/** All distinct configurations for one question, in bank declaration order. */
export function npcEligibleProgramConfigurationsFor(
  propositionKey: string,
  answer: "yes" | "no",
  governmentLevel: NpcLawEligibility["governmentLevel"],
): readonly NpcEligibleProgramConfiguration[] {
  return NPC_ELIGIBLE_CONFIGURATIONS.filter(
    (entry) =>
      entry.propositionKey === propositionKey &&
      entry.answer === answer &&
      entry.governmentLevel === governmentLevel,
  );
}

/**
 * Every standing authority the bank declares, across all families.
 *
 * These are the programs this state is fictionally assumed already to run.
 * They are what makes an appropriation or a repeal playable before the player
 * has authorized anything themselves, and they are read from the bank rather
 * than invented by whichever surface needed one.
 */
export function standingAuthorities(): readonly Extract<
  PredicateAuthority,
  { kind: "standing-statute" }
>[] {
  return FAMILIES.flatMap((family) => family.standingAuthorities ?? []).filter(
    (
      authority,
    ): authority is Extract<PredicateAuthority, { kind: "standing-statute" }> =>
      authority.kind === "standing-statute",
  );
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

/* -------------------------------------------------------------------------- */
/* Who may enact what                                                          */
/* -------------------------------------------------------------------------- */

/** The kind of government a bill is filed in. */
export type EnactingGovernment =
  | "federal"
  | "state"
  | "territory"
  | "district-of-columbia"
  | "county"
  | "municipality";

/**
 * A recorded limit on a local government's ordinary authority: its own
 * charter, or a state law, withholding a kind of act. Only a recorded limit
 * narrows; silence leaves the ordinary authority in place.
 */
export interface LocalAuthorityNarrowing {
  readonly withheld: readonly LegalInstrument[];
  readonly reason: string;
}

export type VariantAuthorityResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

type DeclaredLevel = NpcLawEligibility["governmentLevel"];

/**
 * The levels a variant is written for, where the bank says. A variant with an
 * NPC eligibility row names its level exactly; a variant about a federal
 * policy question is a federal act. Every other variant is an ordinary act
 * any legislature may pass.
 */
function declaredLevels(variant: ProgramVariant): ReadonlySet<DeclaredLevel> {
  const levels = new Set<DeclaredLevel>(
    (variant.npcEligibility ?? []).map((row) => row.governmentLevel),
  );
  if (
    (variant.propositionKeys ?? []).some((key) =>
      key.startsWith("us-federal-positions:"),
    )
  )
    levels.add("federal");
  return levels;
}

/** Which declared levels a government stands in for. D.C. is both. */
const GOVERNMENT_LEVELS: Readonly<
  Record<EnactingGovernment, readonly DeclaredLevel[]>
> = {
  federal: ["federal"],
  state: ["state"],
  territory: ["state"],
  "district-of-columbia": ["state", "municipality"],
  county: ["county"],
  municipality: ["municipality"],
};

/**
 * The one authority rule: may this government enact this variant?
 *
 * Pure. Federal, state, territorial and D.C. legislatures may pass any
 * ordinary act and any variant written for their level. Cities and counties
 * hold ordinary authority by default (owner decision 2026-09-24/26): taxes,
 * spending and ordinary local rules, which is every instrument this bank
 * carries. A recorded charter or state law can narrow that, and only a
 * recorded one. The bank carries no constitutional amendment, so no local
 * government can reach one through it. A variant written for another level
 * (Congress's passenger rail money, a state's transit program, a council's
 * repair fund) belongs to that level only.
 */
export function governmentMayEnactVariant(
  government: EnactingGovernment,
  familyKey: string,
  variantKey: string,
  narrowing: readonly LocalAuthorityNarrowing[] = [],
): VariantAuthorityResult {
  const { variant } = programVariant(familyKey, variantKey);
  const levels = declaredLevels(variant);
  if (
    levels.size > 0 &&
    !GOVERNMENT_LEVELS[government].some((level) => levels.has(level))
  )
    return {
      ok: false,
      reason: `The ${variant.label} configuration is written for ${[...levels].join(" or ")} government.`,
    };
  const local =
    government === "county" ||
    government === "municipality" ||
    government === "district-of-columbia";
  if (local) {
    const limit = narrowing.find((entry) =>
      entry.withheld.includes(variant.instrument),
    );
    if (limit) return { ok: false, reason: limit.reason };
  }
  return { ok: true };
}
