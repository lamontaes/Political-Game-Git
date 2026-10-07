import type { PolicyCatalog, PolicyPropositionDefinition } from "./types";

interface PropositionIndex {
  byKey: ReadonlyMap<string, PolicyPropositionDefinition>;
  byConsequenceRowId: ReadonlyMap<string, PolicyPropositionDefinition>;
}

const INDEXES = new WeakMap<PolicyCatalog["propositions"], PropositionIndex>();

function propositionIndex(
  propositions: PolicyCatalog["propositions"],
): PropositionIndex {
  let index = INDEXES.get(propositions);
  if (!index) {
    const byKey = new Map<string, PolicyPropositionDefinition>();
    const byConsequenceRowId = new Map<string, PolicyPropositionDefinition>();
    for (const proposition of Object.values(propositions)) {
      if (!byKey.has(proposition.stableKey))
        byKey.set(proposition.stableKey, proposition);
      for (const row of proposition.consequences ?? [])
        if (!byConsequenceRowId.has(row.id))
          byConsequenceRowId.set(row.id, proposition);
    }
    index = { byKey, byConsequenceRowId };
    INDEXES.set(propositions, index);
  }
  return index;
}

/** Index the immutable catalog once, preserving the first saved key binding. */
export function policyPropositionsByKey(
  propositions: PolicyCatalog["propositions"],
): ReadonlyMap<string, PolicyPropositionDefinition> {
  return propositionIndex(propositions).byKey;
}

/** Preserve the first Object.values binding for a canonical consequence row. */
export function policyPropositionsByConsequenceRowId(
  propositions: PolicyCatalog["propositions"],
): ReadonlyMap<string, PolicyPropositionDefinition> {
  return propositionIndex(propositions).byConsequenceRowId;
}
