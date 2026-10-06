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
import { globUnavailable, optionalGlob } from "../presentation/optional-glob";

type LawConsequenceModule = {
  registrations: readonly AnyLawConsequenceKindRegistration[];
};

// Every folder under modules owns its registration export. Vite eagerly
// collects them in browser builds and Vitest, so adding a kind does not edit
// this shared registry. Keep eager loading: resolve/apply are synchronous.
const viteLawConsequenceModuleFiles = optionalGlob(() =>
  import.meta.glob<LawConsequenceModule>(
    "./law-consequences/modules/*/index.ts",
    { eager: true },
  ),
);

async function nodeLawConsequenceModules(): Promise<
  Record<string, LawConsequenceModule>
> {
  // Keep Node-only discovery out of Vite's static module graph. The importer
  // is used only by headless TS/JS entrypoints where import.meta.glob is absent.
  const nativeImport = (specifier: string) =>
    import(/* @vite-ignore */ specifier) as Promise<
      {
        readdir: (
          path: URL,
          options: { withFileTypes: true },
        ) => Promise<Array<{ name: string; isDirectory(): boolean }>>;
        access: (path: URL) => Promise<void>;
      } & LawConsequenceModule
    >;
  const fs = await nativeImport("node:fs/promises");
  const root = new URL("./law-consequences/modules/", import.meta.url);
  let directories: Array<{ name: string; isDirectory(): boolean }>;
  try {
    directories = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }

  const modules: Record<string, LawConsequenceModule> = {};
  for (const directory of directories
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const moduleUrl = new URL(
      `${encodeURIComponent(directory.name)}/index.ts`,
      root,
    );
    try {
      await fs.access(moduleUrl);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    const loaded = await import(/* @vite-ignore */ moduleUrl.href);
    modules[`./law-consequences/modules/${directory.name}/index.ts`] = loaded;
  }
  return modules;
}

// `applyLawConsequences` is synchronous, so finish module discovery before the
// registry is exported in both browser/Vitest and headless Node processes.
const lawConsequenceModuleFiles = globUnavailable(viteLawConsequenceModuleFiles)
  ? await nodeLawConsequenceModules()
  : viteLawConsequenceModuleFiles;

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
