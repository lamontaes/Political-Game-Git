import { DEFAULT_WORK_DATA } from "./modules/work";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "./business-books";
import finance from "./data/finance.json" with { type: "json" };
import content from "./data/content.json" with { type: "json" };
import actKinds from "../../data/content/act-kinds.json" with { type: "json" };
import traitPulls from "../../data/content/trait-act-pulls.json" with { type: "json" };
import { PARAMETERS } from "./parameters";
import type { CoreData } from "./types";
import type { FinancePolicyData } from "./finance-types";

export const CORE_API_VERSION = "core2-api-v9";
export const CORE_SCHEMA_VERSION = "core2-schema-v9";

export const DEFAULT_DATA: CoreData = {
  ...content,
  work: DEFAULT_WORK_DATA,
  businessBooks: DEFAULT_BUSINESS_BOOKS_DATA,
  finance: finance as FinancePolicyData,
  needs: content.needs.map((row) => ({
    ...row,
    parameters: Object.fromEntries(
      Object.entries(row.parameters).filter(
        ([, value]) => typeof value === "string",
      ),
    ),
  })),
  parameters: PARAMETERS,
  actKinds: actKinds.kinds.map((row) => row.id),
  traitPulls: traitPulls.pulls,
};

/** Mods merge rows by identity; no new core switch or shadow engine. */
export function extendData(
  base: CoreData,
  extension: Partial<CoreData>,
): CoreData {
  const merge = <T extends { id: string }>(
    rows: readonly T[],
    added?: readonly T[],
  ) => [
    ...new Map(
      [...rows, ...(added ?? [])].map((row) => [row.id, row]),
    ).values(),
  ];
  return {
    ...base,
    ...extension,
    parameters: { ...base.parameters, ...extension.parameters },
    work: extension.work
      ? {
          ...(base.work ?? extension.work),
          ...extension.work,
          patterns: merge(base.work?.patterns ?? [], extension.work.patterns),
          classificationPatterns: [
            ...(base.work?.classificationPatterns ?? []),
            ...extension.work.classificationPatterns,
          ],
        }
      : base.work,
    needs: merge(base.needs, extension.needs),
    actions: merge(base.actions, extension.actions),
    tiers: merge(base.tiers, extension.tiers),
    situations: merge(base.situations, extension.situations),
    actKinds: [...new Set([...base.actKinds, ...(extension.actKinds ?? [])])],
    traitPulls: { ...base.traitPulls, ...extension.traitPulls },
    appraisalTraits: [
      ...new Map(
        [...base.appraisalTraits, ...(extension.appraisalTraits ?? [])].map(
          (row) => [row.traitId, row],
        ),
      ).values(),
    ],
  };
}
