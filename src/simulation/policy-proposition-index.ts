import type { PolicyCatalog, PolicyPropositionDefinition } from "./types";

const BY_KEY = new WeakMap<
  PolicyCatalog["propositions"],
  ReadonlyMap<string, PolicyPropositionDefinition>
>();

/** Index the immutable catalog once, preserving the first saved key binding. */
export function policyPropositionsByKey(
  propositions: PolicyCatalog["propositions"],
): ReadonlyMap<string, PolicyPropositionDefinition> {
  let index = BY_KEY.get(propositions);
  if (!index) {
    const byKey = new Map<string, PolicyPropositionDefinition>();
    for (const proposition of Object.values(propositions)) {
      if (!byKey.has(proposition.stableKey))
        byKey.set(proposition.stableKey, proposition);
    }
    index = byKey;
    BY_KEY.set(propositions, index);
  }
  return index;
}
