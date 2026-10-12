/** Retained dated position/ledger math over immutable raw records, including the native append cache and snapshot evidence. */
import type {
  CurrencyCode,
  EntityId,
  HistoricalCutoff,
  MoneyAmount,
  ResourceEndpoint,
  ResourceFlow,
  ResourcePosition,
  ResourcePositionOwner,
  ResourceTransferOutcome,
  World,
  IsoDate,
} from "../../simulation/types";
import {
  growingIndex,
  recordById,
  type GrowingIndexKind,
} from "./raw-record-index";
export interface CashFacts {
  readonly id: EntityId;
  readonly onDate: IsoDate;
  readonly records: Pick<
    World["history"],
    | "resourcePositions"
    | "resourceFlows"
    | "resourceTransferOutcomes"
    | "nextSequence"
  >;
}
export function currentResourceCutoff(facts: CashFacts): HistoricalCutoff {
  return {
    asOfDate: facts.onDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
export interface ResourcePositionSnapshot {
  readonly positionId: EntityId;
  readonly owner: ResourcePositionOwner;
  readonly cutoff: HistoricalCutoff;
  readonly openingBalance: MoneyAmount;
  readonly inflows: MoneyAmount;
  readonly outflows: MoneyAmount;
  readonly liquidBalance: MoneyAmount;
  readonly outcomeIds: readonly EntityId[];
}
export function resourcePositionAt(
  facts: CashFacts,
  owner: ResourcePositionOwner,
  currency: CurrencyCode,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): ResourcePositionSnapshot | undefined {
  const position = resourcePositionsOf(facts, owner).find(
    (record) =>
      record.openingBalance.currency === currency &&
      availableOn(record, record.openedAt, cutoff),
  );
  if (!position) return undefined;
  const endpoint = positionOwnerEndpoint(owner);
  const ledger = runningLedger(facts, endpoint, currency);
  if (
    !ledger ||
    (position.sequence < ledger.firstSequence &&
      ledger.lastSequence < cutoff.historySequenceExclusive &&
      position.openedAt <= ledger.earliestAt &&
      ledger.latestAt <= cutoff.asOfDate)
  ) {
    let recordedIds = ledger?.outcomeIds;
    const recordedCount = recordedIds?.length ?? 0;
    let outcomeIds: EntityId[] | undefined;
    return {
      positionId: position.id,
      owner: { ...owner },
      cutoff: { ...cutoff },
      openingBalance: { ...position.openingBalance },
      inflows: money(ledger?.inflows ?? 0, currency),
      outflows: money(ledger?.outflows ?? 0, currency),
      liquidBalance: money(
        addExact(
          addExact(position.openingBalance.minorUnits, ledger?.inflows ?? 0),
          -(ledger?.outflows ?? 0),
        ),
        currency,
      ),
      get outcomeIds(): EntityId[] {
        if (!outcomeIds) {
          outcomeIds = recordedIds ? recordedIds.slice(0, recordedCount) : [];
          recordedIds = undefined;
        }
        return outcomeIds;
      },
    };
  }
  let inflows = 0;
  let outflows = 0;
  const asOfDate = cutoff.asOfDate;
  const historySequenceExclusive = cutoff.historySequenceExclusive;
  const flows = new Map<
    EntityId,
    (typeof facts.records.resourceFlows)[number]
  >();
  for (const flow of resourceFlowsTouching(facts, endpoint))
    flows.set(flow.id, flow);
  const outcomes = resourceTransferOutcomesOfFlows(facts, flows.keys());
  for (const outcome of outcomes) {
    if (
      outcome.sequence <= position.sequence ||
      outcome.sequence >= historySequenceExclusive ||
      outcome.occurredAt < position.openedAt ||
      outcome.occurredAt > asOfDate ||
      outcome.transferredAmount.currency !== currency ||
      outcome.transferredAmount.minorUnits === 0
    ) {
      continue;
    }
    const flow = flows.get(outcome.resourceFlowId);
    if (!flow) continue;
    if (sameEndpoint(flow.recipient, endpoint)) {
      inflows = addExact(inflows, outcome.transferredAmount.minorUnits);
    }
    if (sameEndpoint(flow.source, endpoint)) {
      outflows = addExact(outflows, outcome.transferredAmount.minorUnits);
    }
  }
  const liquidMinorUnits = addExact(
    addExact(position.openingBalance.minorUnits, inflows),
    -outflows,
  );
  let evidenceOutcomes: typeof outcomes | undefined = outcomes;
  let evidenceFlows: typeof flows | undefined = flows;
  let outcomeIds: EntityId[] | undefined;
  return {
    positionId: position.id,
    owner: { ...owner },
    cutoff: { ...cutoff },
    openingBalance: { ...position.openingBalance },
    inflows: money(inflows, currency),
    outflows: money(outflows, currency),
    liquidBalance: money(liquidMinorUnits, currency),
    get outcomeIds(): EntityId[] {
      if (outcomeIds) return outcomeIds;
      outcomeIds = [];
      for (const outcome of evidenceOutcomes!) {
        if (
          outcome.sequence <= position.sequence ||
          outcome.sequence >= historySequenceExclusive ||
          outcome.occurredAt < position.openedAt ||
          outcome.occurredAt > asOfDate ||
          outcome.transferredAmount.currency !== currency ||
          outcome.transferredAmount.minorUnits === 0
        )
          continue;
        const flow = evidenceFlows!.get(outcome.resourceFlowId);
        if (
          flow &&
          (sameEndpoint(flow.recipient, endpoint) ||
            sameEndpoint(flow.source, endpoint))
        )
          outcomeIds.push(outcome.id);
      }
      evidenceOutcomes = undefined;
      evidenceFlows = undefined;
      return outcomeIds;
    },
  };
}
export function sameEndpoint(
  left: ResourceEndpoint,
  right: ResourceEndpoint,
): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "person":
      return right.kind === "person" && left.personId === right.personId;
    case "household":
      return (
        right.kind === "household" && left.householdId === right.householdId
      );
    case "organization":
      return (
        right.kind === "organization" &&
        left.organizationId === right.organizationId
      );
  }
}
export function positionOwnerEndpoint(
  owner: ResourcePositionOwner,
): ResourceEndpoint {
  switch (owner.kind) {
    case "person":
      return { kind: "person", personId: owner.personId };
    case "household":
      return { kind: "household", householdId: owner.householdId };
    case "organization":
      return { kind: "organization", organizationId: owner.organizationId };
  }
}
function availableOn(
  record: {
    readonly sequence: number;
  },
  date: string,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    date <= cutoff.asOfDate && record.sequence < cutoff.historySequenceExclusive
  );
}
function addExact(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Exact-money arithmetic exceeded the safe integer range.");
  }
  return result;
}
function money(minorUnits: number, currency: CurrencyCode): MoneyAmount {
  return { minorUnits, currency };
}
function endpointKey(endpoint: ResourceEndpoint): string | null {
  switch (endpoint.kind) {
    case "person":
      return `person:${endpoint.personId}`;
    case "household":
      return `household:${endpoint.householdId}`;
    case "organization":
      return `organization:${endpoint.organizationId}`;
  }
  return null;
}
function pushPosition(
  index: Map<string, number[]>,
  key: string,
  position: number,
): void {
  const positions = index.get(key);
  if (positions) positions.push(position);
  else index.set(key, [position]);
}
const FLOW_POSITIONS_BY_ENDPOINT: GrowingIndexKind<Map<string, number[]>> = {
  create: () => new Map(),
  add: (index, record, position) => {
    const flow = record as ResourceFlow;
    const recipient = endpointKey(flow.recipient);
    const source = endpointKey(flow.source);
    if (recipient !== null) pushPosition(index, recipient, position);
    if (source !== null && source !== recipient)
      pushPosition(index, source, position);
  },
};
const OUTCOME_POSITIONS_BY_FLOW: GrowingIndexKind<Map<string, number[]>> = {
  create: () => new Map(),
  add: (index, record, position) =>
    pushPosition(
      index,
      (record as ResourceTransferOutcome).resourceFlowId,
      position,
    ),
};
export function resourceFlowsTouching(
  facts: CashFacts,
  endpoint: ResourceEndpoint,
): ResourceFlow[] {
  const key = endpointKey(endpoint);
  if (key === null) return [];
  const flows = facts.records.resourceFlows;
  const positions =
    growingIndex(FLOW_POSITIONS_BY_ENDPOINT, flows).get(key) ?? [];
  return positions.map((position) => flows[position]!);
}
export function resourceTransferOutcomesOfFlows(
  facts: CashFacts,
  flowIds: Iterable<EntityId>,
): ResourceTransferOutcome[] {
  const outcomes = facts.records.resourceTransferOutcomes;
  const index = growingIndex(OUTCOME_POSITIONS_BY_FLOW, outcomes);
  const positions: number[] = [];
  for (const flowId of flowIds) {
    const found = index.get(flowId);
    if (found) positions.push(...found);
  }
  positions.sort((left, right) => left - right);
  return positions.map((position) => outcomes[position]!);
}
interface RunningLedger {
  inflows: number;
  outflows: number;
  readonly outcomeIds: EntityId[];
  firstSequence: number;
  lastSequence: number;
  earliestAt: string;
  latestAt: string;
}
interface LedgerIndex {
  readonly pending: number[];
  readonly ledgers: Map<string, Map<string, RunningLedger>>;
}
const LEDGERS: GrowingIndexKind<LedgerIndex> = {
  create: () => ({ pending: [], ledgers: new Map() }),
  add: (index, _record, position) => {
    index.pending.push(position);
  },
};
function runningLedger(
  facts: CashFacts,
  endpoint: ResourceEndpoint,
  currency: CurrencyCode,
): RunningLedger | undefined {
  const key = endpointKey(endpoint);
  if (key === null) return undefined;
  const outcomes = facts.records.resourceTransferOutcomes;
  const index = growingIndex(LEDGERS, outcomes);
  if (index.pending.length > 0) {
    for (const position of index.pending) {
      const outcome = outcomes[position]!;
      const amount = outcome.transferredAmount;
      if (amount.minorUnits === 0) continue;
      const flow = recordById(
        facts.records.resourceFlows,
        outcome.resourceFlowId,
      );
      if (!flow) continue;
      const recipient = endpointKey(flow.recipient);
      const source = endpointKey(flow.source);
      if (recipient !== null)
        enter(index, recipient, outcome, amount.minorUnits, 0);
      if (source !== null && source !== recipient)
        enter(index, source, outcome, 0, amount.minorUnits);
      else if (source !== null)
        enter(index, source, outcome, 0, amount.minorUnits, false);
    }
    index.pending.length = 0;
  }
  return index.ledgers.get(key)?.get(currency);
}
function enter(
  index: LedgerIndex,
  key: string,
  outcome: ResourceTransferOutcome,
  inflow: number,
  outflow: number,
  listed = true,
): void {
  let byCurrency = index.ledgers.get(key);
  if (!byCurrency) {
    byCurrency = new Map();
    index.ledgers.set(key, byCurrency);
  }
  const currency = outcome.transferredAmount.currency;
  const ledger = byCurrency.get(currency);
  if (!ledger) {
    byCurrency.set(currency, {
      inflows: inflow,
      outflows: outflow,
      outcomeIds: [outcome.id],
      firstSequence: outcome.sequence,
      lastSequence: outcome.sequence,
      earliestAt: outcome.occurredAt,
      latestAt: outcome.occurredAt,
    });
    return;
  }
  ledger.inflows = addExact(ledger.inflows, inflow);
  ledger.outflows = addExact(ledger.outflows, outflow);
  if (listed) ledger.outcomeIds.push(outcome.id);
  ledger.firstSequence = Math.min(ledger.firstSequence, outcome.sequence);
  ledger.lastSequence = Math.max(ledger.lastSequence, outcome.sequence);
  if (outcome.occurredAt < ledger.earliestAt)
    ledger.earliestAt = outcome.occurredAt;
  if (outcome.occurredAt > ledger.latestAt)
    ledger.latestAt = outcome.occurredAt;
}
const POSITION_POSITIONS_BY_OWNER: GrowingIndexKind<Map<string, number[]>> = {
  create: () => new Map(),
  add: (index, record, position) => {
    const key = endpointKey(
      positionOwnerEndpoint((record as ResourcePosition).owner),
    );
    if (key !== null) pushPosition(index, key, position);
  },
};
export function resourcePositionsOf(
  facts: CashFacts,
  owner: ResourcePositionOwner,
): ResourcePosition[] {
  const key = endpointKey(positionOwnerEndpoint(owner));
  if (key === null) return [];
  const positions = facts.records.resourcePositions;
  return (
    growingIndex(POSITION_POSITIONS_BY_OWNER, positions).get(key) ?? []
  ).map((at) => positions[at]!);
}
