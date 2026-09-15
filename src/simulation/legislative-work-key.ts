import type { LegislativeRulePack } from "./legislature-rules";

/** Compatibility names describe work availability, not authored bill presence. */
export function legislativeWorkKey(pack: LegislativeRulePack): string {
  const legacy: Readonly<Record<string, string>> = {
    "US-KY": "kentucky",
    "US-NE": "nebraska",
    "US-AK": "alaska",
  };
  return legacy[pack.jurisdictionKey] ?? `institution:${pack.packId}`;
}
