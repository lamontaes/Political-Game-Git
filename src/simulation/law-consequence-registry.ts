import { PAY_REGISTRATION } from "./law-consequences/pay";
import { RIGHT_PERMISSION_REGISTRATION } from "./law-consequences/right-permission";
import { TAX_REGISTRATION } from "./law-consequences/tax";
import { INSTITUTION_RULE_REGISTRATION } from "./law-consequences/institution-rule";
import { legalOutcomeRegistration } from "./law-consequences/legal-outcome";
import { SERVICE_DELIVERED_REGISTRATION } from "./law-consequences/service-delivered";
import { COVERAGE_ELIGIBILITY_REGISTRATION } from "./law-consequences/coverage-eligibility";
import { TEAM_4_PRICE_COST_REGISTRATION } from "./law-consequences/price-cost";
import type {
  LawConsequenceKind,
  AnyLawConsequenceKindRegistration,
} from "./law-consequence-types";
import type { LawConsequenceCapabilities } from "./law-consequence-validation";
import { optionalGlob } from "../presentation/optional-glob";

type LawConsequenceModule = {
  registrations: readonly AnyLawConsequenceKindRegistration[];
};

// Every folder under modules owns its registration export. Vite eagerly
// collects them in browser builds and Vitest, so adding a kind does not edit
// this shared registry. Keep eager loading: resolve/apply are synchronous.
const lawConsequenceModuleFiles = optionalGlob(() =>
  import.meta.glob<LawConsequenceModule>(
    "./law-consequences/modules/*/index.ts",
    { eager: true },
  ),
);

const extensionRegistrations = Object.entries(lawConsequenceModuleFiles)
  .sort(([left], [right]) => left.localeCompare(right))
  .flatMap(([file, module]) => {
    const candidate = module as Partial<LawConsequenceModule>;
    if (!Array.isArray(candidate.registrations))
      throw new Error(
        `Law consequence module ${file} must export registrations.`,
      );
    return candidate.registrations;
  });

/** Sole registration surface. Coordinator appends reviewed kind exports here. */
export const LAW_CONSEQUENCE_REGISTRATIONS: readonly AnyLawConsequenceKindRegistration[] =
  [
    PAY_REGISTRATION,
    legalOutcomeRegistration,
    COVERAGE_ELIGIBILITY_REGISTRATION,
    TAX_REGISTRATION,
    TEAM_4_PRICE_COST_REGISTRATION,
    SERVICE_DELIVERED_REGISTRATION,
    RIGHT_PERMISSION_REGISTRATION,
    INSTITUTION_RULE_REGISTRATION,
    ...extensionRegistrations,
  ];

export function createLawConsequenceRegistry(
  registrations: readonly AnyLawConsequenceKindRegistration[] = LAW_CONSEQUENCE_REGISTRATIONS,
) {
  const handlers = new Map<
    LawConsequenceKind,
    AnyLawConsequenceKindRegistration
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
