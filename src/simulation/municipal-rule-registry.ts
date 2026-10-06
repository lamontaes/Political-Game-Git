import { MUNICIPAL_RULE_PACKS_JSON } from "./municipal-rule-registry.generated";
import { localOrdinanceGameRulePackById } from "./local-ordinance-game-profile";
import { withMinorityPartyProcedureRows } from "./minority-party-procedure";
import type { LegislativeRulePack } from "./legislature-rules";

// This is the complete sourced admission result, available on a clean start.
// Disclosed game profiles resolve separately from stable catalog unit ids.
const packs = JSON.parse(MUNICIPAL_RULE_PACKS_JSON) as LegislativeRulePack[];

export function municipalRulePackById(
  packId: string,
): LegislativeRulePack | null {
  // Fixed sourced packs keep their saved identity. The catalog's fictional
  // profiles are resolved lazily by versioned unit id, not serialized as
  // 38,000 near-identical generated pack rows.
  const pack =
    packs.find((candidate) => candidate.packId === packId) ??
    (packId.startsWith("gus2025:")
      ? localOrdinanceGameRulePackById(packId)
      : null);
  return pack ? withMinorityPartyProcedureRows(pack) : null;
}
