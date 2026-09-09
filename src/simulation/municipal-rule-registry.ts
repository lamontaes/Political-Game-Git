import { MUNICIPAL_RULE_PACKS_JSON } from "./municipal-rule-registry.generated";
import type { LegislativeRulePack } from "./legislature-rules";

// This is the complete compiled admission result, available on a clean start.
// An empty registry means no supported packs, never data awaiting a screen visit.
const packs = JSON.parse(MUNICIPAL_RULE_PACKS_JSON) as LegislativeRulePack[];

export function municipalRulePackById(
  packId: string,
): LegislativeRulePack | null {
  return packs.find((pack) => pack.packId === packId) ?? null;
}
