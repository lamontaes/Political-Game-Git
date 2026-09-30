import { addDays, daysBetween } from "./dates";
import {
  resourceFlowsTouching,
  resourceTransferOutcomesOfFlows,
} from "./resource-queries";
import { growingIndex, type GrowingIndexKind } from "./history-index";
import type {
  EntityId,
  IsoDate,
  ResourceFlow,
  ResourceFlowTermsRecord,
  World,
} from "./types";

/** Pay is a money-flow classification, independent of the work relationship
 * used to create it. Includes wages, salaries and an owner's draw. */
export function isPayFlow(flow: ResourceFlow): boolean {
  return flow.basisKind.startsWith("compensation:");
}

const PERIODS: Readonly<Record<string, number>> = {
  daily: 260,
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};
export function payPeriodsPerYear(cadence: string): number | null {
  const period =
    /(?:^|:|-)(biweekly|semimonthly|weekly|monthly|quarterly|annually|daily)(?:$|-)/.exec(
      cadence,
    )?.[1];
  return period ? (PERIODS[period] ?? null) : null;
}

interface TermsIndex {
  rows: Map<EntityId, ResourceFlowTermsRecord[]>;
}
const TERMS: GrowingIndexKind<TermsIndex> = {
  create: () => ({ rows: new Map() }),
  add: (index, value) => {
    const row = value as ResourceFlowTermsRecord;
    const rows = index.rows.get(row.resourceFlowId) ?? [];
    rows.push(row);
    index.rows.set(row.resourceFlowId, rows);
  },
};

const INCOME = new WeakMap<World, Map<string, ReadonlyMap<EntityId, number>>>();

/** One reader for income from all recorded pay. `terms` reads recurring gross
 * pay entitlement plus a trailing-month estimate of irregular pay actually
 * received; `received` reads actual transferred pay over a dated window.
 * No loan principal, gifts, business revenue or outbound payments are wages. */
export function monthlyIncomeByPerson(
  world: World,
  onDate: IsoDate,
  options: {
    readonly mode?: "terms" | "received";
    readonly since?: IsoDate;
  } = {},
): ReadonlyMap<EntityId, number> {
  let cache = INCOME.get(world);
  if (!cache) {
    cache = new Map();
    INCOME.set(world, cache);
  }
  const key = `${onDate}:${options.mode ?? "terms"}:${options.since ?? ""}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const flows = world.history.resourceFlows.filter(
    (flow) =>
      isPayFlow(flow) &&
      flow.recipient.kind === "person" &&
      flow.startsAt <= onDate &&
      flow.recordedAt <= onDate,
  );
  const amounts = new Map<EntityId, number>();
  const add = (flow: ResourceFlow, amount: number) => {
    if (flow.recipient.kind !== "person") return;
    const person = flow.recipient.personId;
    amounts.set(person, (amounts.get(person) ?? 0) + amount);
  };
  if (options.mode === "received") {
    if (!options.since || options.since >= onDate)
      throw new Error("Received income requires an earlier window start.");
    const byId = new Map(flows.map((flow) => [flow.id, flow]));
    for (const outcome of resourceTransferOutcomesOfFlows(world, byId.keys())) {
      const flow = byId.get(outcome.resourceFlowId)!;
      if (
        outcome.occurredAt > options.since &&
        outcome.occurredAt <= onDate &&
        outcome.transferredAmount.currency === "USD"
      )
        add(
          flow,
          (outcome.transferredAmount.minorUnits * 365.25) /
            (12 * daysBetween(options.since, onDate)),
        );
    }
  } else {
    const index = growingIndex(TERMS, world.history.resourceFlowTerms);
    const irregular = new Map<EntityId, ResourceFlow>();
    for (const flow of flows) {
      const rows = index.rows.get(flow.id) ?? [];
      let latest: ResourceFlowTermsRecord | undefined;
      for (const row of rows) {
        if (row.effectiveAt > onDate) continue;
        if (
          !latest ||
          row.effectiveAt > latest.effectiveAt ||
          (row.effectiveAt === latest.effectiveAt &&
            row.sequence > latest.sequence)
        )
          latest = row;
      }
      const periods = latest ? payPeriodsPerYear(latest.cadenceKind) : null;
      if (periods === null) {
        irregular.set(flow.id, flow);
        continue;
      }
      if (latest!.status === "active" && latest!.amount.currency === "USD")
        add(flow, (latest!.amount.minorUnits * periods) / 12);
    }
    // A completed shift or bonus has no recurring cadence to annualize.
    // Count its actual pay in the last 30 days, without forecasting a shift.
    const since = addDays(onDate, -30);
    for (const outcome of resourceTransferOutcomesOfFlows(
      world,
      irregular.keys(),
    )) {
      if (
        outcome.occurredAt > since &&
        outcome.occurredAt <= onDate &&
        outcome.transferredAmount.currency === "USD"
      )
        add(
          irregular.get(outcome.resourceFlowId)!,
          (outcome.transferredAmount.minorUnits * 365.25) / (12 * 30),
        );
    }
  }
  cache.set(key, amounts);
  return amounts;
}

/** Indexed check for a pay relationship, including an owner's draw. */
export function personHasRecordedPay(
  world: World,
  personId: EntityId,
): boolean {
  return resourceFlowsTouching(world, { kind: "person", personId }).some(
    (flow) =>
      flow.recipient.kind === "person" &&
      flow.recipient.personId === personId &&
      isPayFlow(flow),
  );
}
