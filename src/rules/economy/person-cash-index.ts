/** Supporting immutable raw person-money indexes retained with opening-cash math. */
import {
  growingIndex,
  recordById,
  type GrowingIndexKind,
} from "./raw-record-index";
import type {
  EntityId,
  ResourceFlow,
  ResourcePosition,
  ResourceTransferOutcome,
} from "../../simulation/types";
const USD_POSITION_HOLDERS: GrowingIndexKind<Set<EntityId>> = {
  create: () => new Set(),
  add: (holders, record) => {
    const position = record as ResourcePosition;
    if (
      position.owner.kind === "person" &&
      position.openingBalance.currency === "USD"
    )
      holders.add(position.owner.personId);
  },
};
export function holdsUsdPosition(
  positions: readonly ResourcePosition[],
  personId: EntityId,
): boolean {
  return growingIndex(USD_POSITION_HOLDERS, positions).has(personId);
}
const FLOWS_BY_PERSON: GrowingIndexKind<Map<EntityId, ResourceFlow[]>> = {
  create: () => new Map(),
  add: (index, record) => {
    const flow = record as ResourceFlow;
    const people = new Set<EntityId>();
    if (flow.source.kind === "person") people.add(flow.source.personId);
    if (flow.recipient.kind === "person") people.add(flow.recipient.personId);
    for (const personId of people) {
      const group = index.get(personId);
      if (group) group.push(flow);
      else index.set(personId, [flow]);
    }
  },
};
export function flowsOfPerson(
  flows: readonly ResourceFlow[],
  personId: EntityId,
): readonly ResourceFlow[] {
  return growingIndex(FLOWS_BY_PERSON, flows).get(personId) ?? [];
}
const OUTCOME_POSITIONS_BY_FLOW: GrowingIndexKind<Map<EntityId, number[]>> = {
  create: () => new Map(),
  add: (index, record, position) => {
    const flowId = (record as ResourceTransferOutcome).resourceFlowId;
    const group = index.get(flowId);
    if (group) group.push(position);
    else index.set(flowId, [position]);
  },
};
export function transferOutcomesOfPerson(
  flows: readonly ResourceFlow[],
  outcomes: readonly ResourceTransferOutcome[],
  personId: EntityId,
): readonly ResourceTransferOutcome[] {
  const byFlow = growingIndex(OUTCOME_POSITIONS_BY_FLOW, outcomes);
  const seen = new Set<EntityId>();
  const positions: number[] = [];
  for (const flow of flowsOfPerson(flows, personId)) {
    if (seen.has(flow.id) || recordById(flows, flow.id) !== flow) continue;
    seen.add(flow.id);
    for (const position of byFlow.get(flow.id) ?? []) positions.push(position);
  }
  positions.sort((left, right) => left - right);
  return positions.map((position) => outcomes[position]!);
}
