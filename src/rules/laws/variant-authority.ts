/** KEEP authority math; compiled bank rows are raw input, including local narrowing. */
import type {
  ProgramVariant,
  NpcLawEligibility,
} from "../../simulation/legislation-content-contracts";
import type {
  EnactingGovernment,
  LocalAuthorityNarrowing,
  VariantAuthorityResult,
} from "../../simulation/legislation-program-families";
type DeclaredLevel = NpcLawEligibility["governmentLevel"];
export interface VariantAuthorityFacts {
  readonly variants: ReadonlyMap<string, ProgramVariant>;
}
function requireVariant(
  facts: VariantAuthorityFacts,
  familyKey: string,
  variantKey: string,
) {
  const variant = facts.variants.get(familyKey + ":" + variantKey);
  if (!variant)
    throw Error("Missing compiled variant: " + familyKey + "/" + variantKey);
  return { variant };
}
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

export function governmentMayEnactVariant(
  facts: VariantAuthorityFacts,
  government: EnactingGovernment,
  familyKey: string,
  variantKey: string,
  narrowing: readonly LocalAuthorityNarrowing[] = [],
): VariantAuthorityResult {
  const { variant } = requireVariant(facts, familyKey, variantKey);
  const levels = declaredLevels(variant);
  if (
    levels.size > 0 &&
    !GOVERNMENT_LEVELS[government].some((level) => levels.has(level))
  )
    return {
      ok: false,
      reason: `The ${variant.label} configuration is written for ${[...levels].join(" or ")} government.`,
    };
  const local = !(
    government === "federal" ||
    government === "state" ||
    government === "territory"
  );
  if (local) {
    const limit = narrowing.find((entry) =>
      entry.withheld.includes(variant.instrument),
    );
    if (limit) return { ok: false, reason: limit.reason };
  }
  return { ok: true };
}
