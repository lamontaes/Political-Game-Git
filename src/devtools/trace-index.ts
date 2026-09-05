import { worldContentId } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  compareTraceNodes,
  TRACE_LINK_KINDS,
  TRACE_RECORD_CLASSES,
  TRACE_TRUTH_ORIGINS,
  type TraceLink,
  type TraceNode,
  type TraceRecordClass,
} from "./trace-model";
import { defaultTraceSourceRegistry } from "./trace-adapters";
import type { TraceSource, TraceSourceRegistry } from "./trace-sources";

const TRACE_LINK_KIND_SET: ReadonlySet<string> = new Set(TRACE_LINK_KINDS);
const TRACE_RECORD_CLASS_SET: ReadonlySet<string> = new Set(
  TRACE_RECORD_CLASSES,
);
const TRACE_TRUTH_ORIGIN_SET: ReadonlySet<string> = new Set(
  TRACE_TRUTH_ORIGINS,
);

/**
 * A private, throwaway copy of the world for one collector to read.
 *
 * A registered source is extension code: a later packet, or in a test a
 * deliberately hostile one. It is handed this snapshot, never the world the
 * caller holds, so nothing it does — assigning a field, pushing to an array —
 * can reach the canonical state the rest of the program runs on. The snapshot
 * is discarded the moment the collector returns.
 */
function snapshotWorldForCollector(world: World): World {
  return structuredClone(world);
}

/**
 * Structural gate for one projected record before it enters the index.
 *
 * `createTraceNode` already enforces this for records built through it, but a
 * source is free to hand back a hand-rolled object, and a malformed one must
 * not slip in looking canonical. Anything structurally wrong is refused rather
 * than repaired: an unknown link kind, a link with no target, a record with no
 * id are not causal facts the tool can honestly carry. A link that is
 * well-formed but names a target no source produced is a different thing — that
 * stays a legitimate unresolved edge, judged later against what was collected.
 */
function assertWellFormedCollectedNode(
  node: TraceNode,
  source: TraceSource,
): void {
  const refuse = (why: string): never => {
    throw new Error(
      `Trace source ${source.key} produced a malformed record: ${why}.`,
    );
  };
  if (typeof node.id !== "string" || node.id.length === 0) {
    refuse("a record carries no stable id");
  }
  if (!TRACE_RECORD_CLASS_SET.has(node.recordClass)) {
    refuse(`record ${node.id} declares an unknown record class`);
  }
  if (!TRACE_TRUTH_ORIGIN_SET.has(node.truthOrigin)) {
    refuse(`record ${node.id} declares an unknown truth origin`);
  }
  if (!Array.isArray(node.links)) {
    refuse(`record ${node.id} has a link list that is not an array`);
  }
  for (const link of node.links) {
    if (!link || typeof link !== "object") {
      refuse(`record ${node.id} carries a link that is not an object`);
    }
    if (!TRACE_LINK_KIND_SET.has(link.kind)) {
      refuse(`record ${node.id} names an unsupported link kind`);
    }
    if (typeof link.role !== "string") {
      refuse(`record ${node.id} carries a link with a non-string role`);
    }
    if (typeof link.targetId !== "string" || link.targetId.length === 0) {
      refuse(`record ${node.id} carries a link with no target id`);
    }
  }
  if (!Array.isArray(node.unrecordedLinks)) {
    refuse(
      `record ${node.id} has an unrecorded-link list that is not an array`,
    );
  }
  for (const unrecorded of node.unrecordedLinks) {
    if (!TRACE_LINK_KIND_SET.has(unrecorded.kind)) {
      refuse(`record ${node.id} names an unsupported unrecorded-link kind`);
    }
  }
}

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
  // The identity — and its content hash — are taken from the caller's world
  // before any collector runs, and checked again after. Collectors only ever
  // see a private snapshot, so this equality is a guarantee the code keeps, not
  // a hope: if it ever fails, a source found a way to reach canonical state and
  // the whole inspection is refused rather than reported against a world that
  // changed underneath it.
  const identity = traceIdentityOf(world);

  const byId = new Map<EntityId, TraceNode>();
  for (const source of registry.sources) {
    const snapshot = snapshotWorldForCollector(world);
    for (const node of source.collect(snapshot)) {
      assertWellFormedCollectedNode(node, source);
      if (byId.has(node.id)) {
        const existing = byId.get(node.id);
        throw new Error(
          `Trace sources ${existing?.sourceKey ?? "unknown"} and ${source.key} both claim record ${node.id}.`,
        );
      }
      byId.set(node.id, { ...node, sourceKey: source.key });
    }
  }

  if (worldContentId(world) !== identity.worldContentId) {
    throw new Error(
      "A trace source altered the world during collection; the inspection is refused.",
    );
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
    identity,
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
