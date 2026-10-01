import type {
  LawConsequenceKind,
  LawConsequenceKindRegistration,
} from "./law-consequence-types";
import type { LawConsequenceCapabilities } from "./law-consequence-validation";

/** Sole registration surface. Coordinator appends reviewed kind exports here. */
export const LAW_CONSEQUENCE_REGISTRATIONS: readonly LawConsequenceKindRegistration[] =
  [
    // pay: Team2
    // legal-outcome: Team9
    // coverage-eligibility: Team8
    // tax: Team3
    // price-cost: Team4
    // service-delivered: Team5 (Team6 transit contributor)
    // right-permission: Team1
    // institution-rule: Team1
  ];

export function createLawConsequenceRegistry(
  registrations: readonly LawConsequenceKindRegistration[] = LAW_CONSEQUENCE_REGISTRATIONS,
) {
  const handlers = new Map<
    LawConsequenceKind,
    LawConsequenceKindRegistration
  >();
  const selectors = new Set<string>();
  const selectorsByKind = new Map<LawConsequenceKind, ReadonlySet<string>>();
  const predicates = new Set<string>();
  const actions = new Map<LawConsequenceKind, ReadonlySet<string>>();
  for (const entry of registrations) {
    if (handlers.has(entry.kind))
      throw new Error(`Duplicate law consequence kind owner: ${entry.kind}`);
    handlers.set(entry.kind, entry);
    selectorsByKind.set(entry.kind, new Set(entry.selectors));
    entry.selectors.forEach((key) => selectors.add(key));
    entry.predicates.forEach((key) => predicates.add(key));
    actions.set(entry.kind, new Set(entry.actions));
  }
  const capabilities: LawConsequenceCapabilities = {
    kinds: new Set(handlers.keys()),
    selectors,
    selectorsByKind,
    predicates,
    actions,
  };
  return { handlers, capabilities };
}
