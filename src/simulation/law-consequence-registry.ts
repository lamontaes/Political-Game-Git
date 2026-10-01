import { INSTITUTION_RULE_REGISTRATION } from "./law-consequences/institution-rule";
import { legalOutcomeRegistration } from "./law-consequences/legal-outcome";
import { SERVICE_DELIVERED_REGISTRATION } from "./law-consequences/service-delivered";
import { COVERAGE_ELIGIBILITY_REGISTRATION } from "./law-consequences/coverage-eligibility";
import { TEAM_4_PRICE_COST_REGISTRATION } from "./law-consequences/price-cost";
import type {
  LawConsequenceKind,
  LawConsequenceKindRegistration,
} from "./law-consequence-types";
import type { LawConsequenceCapabilities } from "./law-consequence-validation";

/** Sole registration surface. Coordinator appends reviewed kind exports here. */
export const LAW_CONSEQUENCE_REGISTRATIONS: readonly LawConsequenceKindRegistration[] =
  [
    // pay: Team2
    legalOutcomeRegistration,
    COVERAGE_ELIGIBILITY_REGISTRATION,
    // tax: Team3
    TEAM_4_PRICE_COST_REGISTRATION,
    SERVICE_DELIVERED_REGISTRATION,
    // right-permission: Team1
    INSTITUTION_RULE_REGISTRATION,
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
