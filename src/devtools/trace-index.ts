import { worldContentId } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  compareTraceNodes,
  type TraceLink,
  type TraceNode,
  type TraceRecordClass,
} from "./trace-model";
import { defaultTraceSourceRegistry } from "./trace-adapters";
import type { TraceSourceRegistry } from "./trace-sources";

/**
 * A read-only index over one world, built at inspection time and thrown away.
 *
 * Two things here need saying plainly. The first is that this index is
 * derived: nothing it computes is written back, and building it twice from the
 * same world produces the same index. The second is that the *downstream*
 * direction exists only here. The world records parents; it does not record
 * children. Reversing the recorded parent edges at inspection time is the only
 * honest way to answer "what followed from this", and doing it in a persisted
 * structure would turn a convenience into a second source of truth.
 */

export interface TraceIdentity {
  readonly worldId: EntityId;
  readonly seed: string;
  readonly schemaVersion: number;
  readonly generatorVersion: string;
  readonly startedAt: IsoDate;
  readonly currentDate: IsoDate;
  /**
   * The exclusive append frontier. Two traces taken at the same frontier of
   * the same world are traces of the same history.
   */
  readonly historyFrontier: number;
  /** Content hash of the whole world, so an export can prove which world it read. */
  readonly worldContentId: EntityId;
}

export interface TraceIndex {
  readonly identity: TraceIdentity;
  readonly sourceKeys: readonly string[];
  /** Every projected record, in deterministic order. */
  readonly nodes: readonly TraceNode[];
  readonly byId: ReadonlyMap<EntityId, TraceNode>;
  /** Derived at inspection time by reversing recorded parent edges. */
  readonly childIdsByTargetId: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly nodeIdsByEntityId: ReadonlyMap<EntityId, readonly EntityId[]>;
}

export function traceIdentityOf(world: World): TraceIdentity {
  return {
    worldId: world.id,
    seed: world.seed,
    schemaVersion: world.schemaVersion,
    generatorVersion: world.generatorVersion,
    startedAt: world.startedAt,
    currentDate: world.currentDate,
    historyFrontier: world.history.nextSequence,
    worldContentId: worldContentId(world),
  };
}

/**
 * Collects every registered source and links what they produced.
 *
 * A source claiming a record id another source already claimed is an error
 * rather than a merge. Two projections of the same record would disagree
 * somewhere, and the disagreement would surface as a trace that changes
 * meaning depending on registration order.
 */
export function buildTraceIndex(
  world: World,
  registry: TraceSourceRegistry = defaultTraceSourceRegistry(),
): TraceIndex {
  const byId = new Map<EntityId, TraceNode>();
  for (const source of registry.sources) {
    for (const node of source.collect(world)) {
      if (byId.has(node.id)) {
        const existing = byId.get(node.id);
        throw new Error(
          `Trace sources ${existing?.sourceKey ?? "unknown"} and ${source.key} both claim record ${node.id}.`,
        );
      }
      byId.set(node.id, { ...node, sourceKey: source.key });
    }
  }

  const nodes = [...byId.values()].sort(compareTraceNodes);

  const childIds = new Map<EntityId, EntityId[]>();
  const entityIds = new Map<EntityId, EntityId[]>();
  for (const node of nodes) {
    for (const link of node.links) {
      const existing = childIds.get(link.targetId);
      if (existing) {
        if (!existing.includes(node.id)) existing.push(node.id);
      } else {
        childIds.set(link.targetId, [node.id]);
      }
    }
    for (const ref of node.entityRefs) {
      const existing = entityIds.get(ref.entityId);
      if (existing) {
        if (!existing.includes(node.id)) existing.push(node.id);
      } else {
        entityIds.set(ref.entityId, [node.id]);
      }
    }
  }

  const order = new Map<EntityId, number>();
  nodes.forEach((node, index) => order.set(node.id, index));
  const sortIds = (ids: readonly EntityId[]): readonly EntityId[] =>
    [...ids].sort(
      (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
    );

  return {
    identity: traceIdentityOf(world),
    sourceKeys: registry.sources.map((source) => source.key),
    nodes,
    byId,
    childIdsByTargetId: new Map(
      [...childIds.entries()].map(([targetId, ids]) => [
        targetId,
        sortIds(ids),
      ]),
    ),
    nodeIdsByEntityId: new Map(
      [...entityIds.entries()].map(([entityId, ids]) => [
        entityId,
        sortIds(ids),
      ]),
    ),
  };
}

export function traceNodeById(
  index: TraceIndex,
  id: EntityId,
): TraceNode | null {
  return index.byId.get(id) ?? null;
}

export function traceNodesForEntity(
  index: TraceIndex,
  entityId: EntityId,
): readonly TraceNode[] {
  const ids = index.nodeIdsByEntityId.get(entityId) ?? [];
  return ids.flatMap((id) => {
    const node = index.byId.get(id);
    return node ? [node] : [];
  });
}

export function traceNodesOfClass(
  index: TraceIndex,
  recordClass: TraceRecordClass,
): readonly TraceNode[] {
  return index.nodes.filter((node) => node.recordClass === recordClass);
}

export interface UnresolvedTraceLink {
  readonly nodeId: EntityId;
  readonly link: TraceLink;
}

/**
 * Recorded edges whose target no registered source produced.
 *
 * This is a real finding, not an error: a record can legitimately point at a
 * family nobody has registered yet. It is reported so a trace can say
 * "unresolved" instead of quietly dropping the edge and looking complete.
 */
export function unresolvedTraceLinks(
  index: TraceIndex,
): readonly UnresolvedTraceLink[] {
  const unresolved: UnresolvedTraceLink[] = [];
  for (const node of index.nodes) {
    for (const link of node.links) {
      if (!index.byId.has(link.targetId)) {
        unresolved.push({ nodeId: node.id, link });
      }
    }
  }
  return unresolved;
}
