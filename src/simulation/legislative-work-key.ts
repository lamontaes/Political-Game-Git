import type { LegislativeRulePack } from "./legislature-rules";
import legacyAliases from "../../data/research/legislature/legacy-work-key-aliases.json" with { type: "json" };

/** Compatibility names describe work availability, not authored bill presence. */
export function legislativeWorkKey(pack: LegislativeRulePack): string {
  return (
    legacyAliases[pack.jurisdictionKey as keyof typeof legacyAliases] ??
    `institution:${pack.packId}`
  );
}
