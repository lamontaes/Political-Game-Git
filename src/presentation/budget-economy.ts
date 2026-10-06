import { economicContextBindingForPlace } from "./economic-context-bindings";
import {
  fiscalRecordGraph,
  type EconomicGraphModel,
  type FiscalGraphRecord,
} from "./economic-graphs";
import {
  lifePlaceByJurisdictionId,
  worldMetricStateHistory,
  type EntityId,
  type MetricReferencePeriod,
  type World,
  type WorldMetricStateRecord,
} from "../simulation";
import economyVisibility from "../../data/content/economy-visibility.json" with { type: "json" };

export type EconomyVisibilityLevel =
  | "resident"
  | "town"
  | "county"
  | "state-legislature"
  | "state-executive"
  | "congress"
  | "federal-executive"
  | "judicial";
export type EconomyProjection =
  | "personal-money"
  | "home-town-conditions"
  | "home-town-budget-stories"
  | "government-budget"
  | "bill-fiscal-notes"
  | "program-lines"
  | "account-history"
  | "state-macro-series"
  | "federal-budget-categories"
  | "national-macro-series";
type EconomyVisibilityTable = {
  readonly defaultLevel: EconomyVisibilityLevel;
  readonly levels: Readonly<
    Record<
      EconomyVisibilityLevel,
      {
        readonly lookItUp: "full" | "summary" | "none";
        readonly projections: readonly EconomyProjection[];
      }
    >
  >;
};
const visibilityTable = economyVisibility as unknown as EconomyVisibilityTable;

/** Local contract matching the b22-p1 office reader until it lands. */
export interface PlayerOfficeScopeEntry {
  readonly officeKey: string;
  readonly title: string;
  readonly jurisdictionId: EntityId | null;
  readonly level: Exclude<EconomyVisibilityLevel, "resident">;
}

export interface EconomyVisibility {
  readonly projections: ReadonlySet<EconomyProjection>;
  readonly officeLevels: readonly EconomyVisibilityLevel[];
  readonly lookItUp: "full" | "summary" | "none";
}

/**
 * Temporary, typed seam for b22-p1. Replace this body with the shared reader
 * once that item lands; the interface is intentionally kept local here.
 */
export function playerOfficeScope(
  _world: World,
  _personId: EntityId,
): readonly PlayerOfficeScopeEntry[] {
  // STUB until b22-p1 lands: no guessed office or jurisdiction mapping.
  return [];
}

/** Resolve the table's union for offices whose jurisdiction covers the target. */
export function economyVisibilityForOfficeScope(
  officeScope: readonly PlayerOfficeScopeEntry[],
  jurisdictionId: EntityId | null,
): EconomyVisibility {
  const matching = officeScope.filter((office) =>
    office.level === "congress" || office.level === "federal-executive"
      ? jurisdictionId === null
      : office.jurisdictionId === jurisdictionId,
  );
  const matchingLevels = matching.map(
    (office): EconomyVisibilityLevel => office.level,
  );
  const levels: EconomyVisibilityLevel[] = matching.length
    ? [...new Set(matchingLevels)]
    : [visibilityTable.defaultLevel];
  const projections = new Set<EconomyProjection>();
  let lookItUp: EconomyVisibility["lookItUp"] = "none";
  for (const level of levels) {
    const row = visibilityTable.levels[level];
    row.projections.forEach((projection) => projections.add(projection));
    if (
      row.lookItUp === "full" ||
      (row.lookItUp === "summary" && lookItUp === "none")
    )
      lookItUp = row.lookItUp;
  }
  return { projections, officeLevels: levels, lookItUp };
}

const BUDGET_FLOW_METRICS = [
  "government.revenue",
  "government.outlays",
] as const;
const DEBT_METRICS = ["government.debt"] as const;

export interface BudgetEconomyReadModel {
  readonly jurisdictionId: EntityId;
  readonly jurisdictionLabel: string;
  readonly placeLabel: string;
  readonly simulationDate: string;
  readonly economicBinding: ReturnType<typeof economicContextBindingForPlace>;
  readonly fiscalGraphs: readonly EconomicGraphModel[];
  readonly fiscalAvailability:
    | { readonly status: "available"; readonly graphCount: number }
    | { readonly status: "unavailable"; readonly reason: string };
}

/**
 * Project the selected jurisdiction's public Budget and economy reading.
 *
 * The target is explicit so Observer Mode and ordinary players can inspect the
 * same public record. The projection neither checks officeholding nor exposes
 * a writer. Aggregate fiscal history is restricted to this exact jurisdiction
 * and to the unsegmented government scope; proposal scenarios are not silently
 * promoted into a government budget.
 */
export function projectBudgetEconomy(
  world: World,
  jurisdictionId: EntityId,
): BudgetEconomyReadModel {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  if (!jurisdiction) {
    throw new Error(
      `Budget/economy target jurisdiction is not in this World: ${jurisdictionId}`,
    );
  }
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  const fiscalGraphs = projectFiscalGraphs(
    world,
    jurisdictionId,
    jurisdiction.name,
  );
  return {
    jurisdictionId,
    jurisdictionLabel: jurisdiction.name,
    placeLabel: place?.displayName ?? jurisdiction.name,
    simulationDate: world.currentDate,
    economicBinding: place ? economicContextBindingForPlace(place.key) : null,
    fiscalGraphs,
    fiscalAvailability:
      fiscalGraphs.length > 0
        ? { status: "available", graphCount: fiscalGraphs.length }
        : {
            status: "unavailable",
            reason: `No aggregate budget-history or outturn records are available for ${jurisdiction.name} on ${world.currentDate}.`,
          },
  };
}

function projectFiscalGraphs(
  world: World,
  jurisdictionId: EntityId,
  jurisdictionLabel: string,
): readonly EconomicGraphModel[] {
  const flowRecords = fiscalRecords(
    world,
    jurisdictionId,
    jurisdictionLabel,
    BUDGET_FLOW_METRICS,
  );
  const debtRecords = fiscalRecords(
    world,
    jurisdictionId,
    jurisdictionLabel,
    DEBT_METRICS,
  );
  return [
    ...graphsByCurrency(
      "budget-history",
      "Recorded tax receipts and program outlays",
      flowRecords,
    ),
    ...graphsByCurrency("debt-history", "Government debt", debtRecords),
  ];
}

function fiscalRecords(
  world: World,
  jurisdictionId: EntityId,
  jurisdictionLabel: string,
  stableKeys: readonly string[],
): readonly FiscalGraphRecord[] {
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const records: FiscalGraphRecord[] = [];
  for (const stableKey of stableKeys) {
    const metric = Object.values(world.metricCatalog.definitions).find(
      (candidate) => candidate.stableKey === stableKey,
    );
    if (!metric) continue;
    const latestByPeriod = new Map<string, WorldMetricStateRecord>();
    for (const state of worldMetricStateHistory(
      world,
      metric.id,
      { jurisdictionId, segmentKey: null },
      cutoff,
    )) {
      if (!periodHasEnded(state.referencePeriod, world.currentDate)) continue;
      latestByPeriod.set(periodKey(state.referencePeriod), state);
    }
    for (const state of latestByPeriod.values()) {
      if (state.value.kind !== "money") continue;
      records.push({
        recordKey: state.id,
        seriesKey: metric.stableKey,
        seriesLabel: metric.name,
        period: periodLabel(state.referencePeriod),
        value: state.value.money.minorUnits,
        missingReason: null,
        unit: `${state.value.money.currency} minor units`,
        geographyKey: jurisdictionId,
        geographyLabel: jurisdictionLabel,
        recordClass: "simulated-history",
      });
    }
  }
  return records;
}

function graphsByCurrency(
  graphKey: string,
  title: string,
  records: readonly FiscalGraphRecord[],
): readonly EconomicGraphModel[] {
  const recordsByUnit = new Map<string, FiscalGraphRecord[]>();
  for (const record of records) {
    const unitRecords = recordsByUnit.get(record.unit) ?? [];
    unitRecords.push(record);
    recordsByUnit.set(record.unit, unitRecords);
  }
  return [...recordsByUnit.entries()].flatMap(([unit, unitRecords]) => {
    const graph = fiscalRecordGraph(
      `${graphKey}:${unit.toLowerCase().replaceAll(" ", "-")}`,
      title,
      unitRecords,
    );
    return graph ? [graph] : [];
  });
}

function periodHasEnded(
  period: MetricReferencePeriod,
  simulationDate: string,
): boolean {
  return period.kind === "point"
    ? period.at <= simulationDate
    : period.endsAt <= simulationDate;
}

function periodKey(period: MetricReferencePeriod): string {
  return period.kind === "point"
    ? `point:${period.at}`
    : `interval:${period.startsAt}:${period.endsAt}`;
}

function periodLabel(period: MetricReferencePeriod): string {
  return period.kind === "point"
    ? period.at
    : period.startsAt === period.endsAt
      ? period.startsAt
      : `${period.startsAt}–${period.endsAt}`;
}
