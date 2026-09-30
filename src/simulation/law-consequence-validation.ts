import type {
  LawConsequenceKind,
  LawConsequenceRow,
} from "./law-consequence-types";

export interface LawConsequenceCapabilities {
  kinds: ReadonlySet<LawConsequenceKind>;
  selectors: ReadonlySet<string>;
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
    if (!capabilities.kinds.has(row.kind)) missing("kind", row.kind);
    if (!capabilities.selectors.has(row.who.selector))
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
    for (const onward of row.onward ?? []) visit(onward);
  };
  rows.forEach(visit);
  return errors;
}
