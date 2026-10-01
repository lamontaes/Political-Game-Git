import { governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { municipalRulePackFor } from "../municipal-government";
import { ensureJurisdiction } from "../national-election-geography";
import { localGoverningBodyIdentity } from "../nationwide-world/local-governing-body-candidacy-packs";
import { localGovernmentJurisdiction } from "../nationwide-world/local-governments";
import { municipioUnit } from "../nationwide-world/county-governing-body-rules";
import { boardGoverningBodyRules } from "../nationwide-world/township-governing-body-rules";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { townCouncilProfilePackId } from "../town-council-profile";
import type { EntityId, World } from "../types";

export interface CouncilRules {
  readonly packId: string;
  /** Set when the town's compiled charter runs the procedure. */
  readonly governmentKey: string | null;
}

export function councilRules(
  unit: GovernmentUnitIdentity,
): CouncilRules | null {
  const compiled = municipalGovernmentForUnit(unit);
  if (compiled) {
    const pack = municipalRulePackFor(compiled);
    if (pack.ok)
      return {
        // The pack the charter resolved to: its sourced pack, or the labeled
        // game profile where the charter's procedure was not read.
        packId: pack.pack.packId,
        governmentKey: compiled.key,
      };
  }
  if (!localGoverningBodyIdentity(unit) && !boardGoverningBodyRules(unit))
    return null;
  return { packId: townCouncilProfilePackId(unit), governmentKey: null };
}

/**
 * Where the body's ordinances are recorded: the town, or the town, township
 * or county a place with no town government lives under (`law-in-force.ts`
 * reads their ordinances for it). That jurisdiction is registered in the
 * world the first time its board acts.
 */
export function lawJurisdiction(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
): { readonly world: World; readonly jurisdictionId: EntityId } {
  if (unit.unitType === "municipality") return { world, jurisdictionId: town };
  const county = localGovernmentJurisdiction(unit);
  if (!county) return { world, jurisdictionId: town };
  return {
    world: ensureJurisdiction(world, county),
    jurisdictionId: county.id,
  };
}

/** A government unit by the id a meeting was scheduled under. */
export function unitById(id: string): GovernmentUnitIdentity | null {
  return (
    governmentUnit(id) ??
    (id.startsWith("municipio:")
      ? municipioUnit(id.slice("municipio:".length))
      : null)
  );
}
