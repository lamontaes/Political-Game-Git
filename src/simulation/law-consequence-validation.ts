import type {
  LawConsequenceKind,
  LawConsequenceRow,
} from "./law-consequence-types";

export interface LawConsequenceCapabilities {
  kinds: ReadonlySet<LawConsequenceKind>;
  selectors: ReadonlySet<string>;
  selectorsByKind?: ReadonlyMap<LawConsequenceKind, ReadonlySet<string>>;
  actions: ReadonlyMap<LawConsequenceKind, ReadonlySet<string>>;
  predicates: ReadonlySet<string>;
}
/** Admission rejects unavailable capabilities instead of silently dropping rows. */
export function validateLawConsequences(
  rows: readonly LawConsequenceRow[],
  capabilities: LawConsequenceCapabilities,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const visit = (row: LawConsequenceRow): void => {
    const missing = (kind: string, key: string): void => {
      errors.push(`Consequence ${row.id}: missing ${kind} capability '${key}'`);
    };
    if (!row.id || seen.has(row.id))
      errors.push(`Consequence ${row.id}: missing or duplicate row ID`);
    seen.add(row.id);
    if (Boolean(row.amount) === Boolean(row.decision))
      errors.push(
        `Consequence ${row.id}: exactly one amount or decision binding is required`,
      );
    if (row.decision && !row.decision.key.trim())
      errors.push(`Consequence ${row.id}: decision binding key is required`);
    if (!capabilities.kinds.has(row.kind)) missing("kind", row.kind);
    if (
      !(
        capabilities.selectorsByKind?.get(row.kind) ?? capabilities.selectors
      ).has(row.who.selector)
    )
      missing("selector", row.who.selector);
    if (!capabilities.actions.get(row.kind)?.has(row.what))
      missing(`${row.kind} action`, row.what);
    for (const condition of [...row.who.predicates, ...row.conditions]) {
      if (!capabilities.predicates.has(condition.capability))
        missing("predicate", condition.capability);
    }
    if (!Number.isSafeInteger(row.lag.days) || row.lag.days < 0)
      errors.push(`Consequence ${row.id}: lag must be nonnegative whole days`);
    if (row.lag.days > 0 && !row.lag.sourceIds.length)
      errors.push(`Consequence ${row.id}: lag requires source evidence`);
    if (!row.evidence.sourceIds.length || !row.evidence.why.trim())
      errors.push(
        `Consequence ${row.id}: source evidence and why are required`,
      );
    for (const delegation of row.delegations ?? []) {
      if (!delegation.key.trim() || !delegation.questionKey.trim())
        errors.push(
          `Consequence ${row.id}: delegation needs a key and question`,
        );
      if (
        (delegation.minimum !== null && !Number.isFinite(delegation.minimum)) ||
        (delegation.maximum !== null && !Number.isFinite(delegation.maximum)) ||
        (delegation.minimum !== null &&
          delegation.maximum !== null &&
          delegation.minimum > delegation.maximum)
      )
        errors.push(`Consequence ${row.id}: delegation has invalid bounds`);
      if (!delegation.sourceIds.length)
        errors.push(
          `Consequence ${row.id}: delegation requires source evidence`,
        );
    }
    for (const onward of row.onward ?? []) visit(onward);
  };
  rows.forEach(visit);
  return errors;
}
