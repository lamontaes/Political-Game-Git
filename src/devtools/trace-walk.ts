import type { EntityId } from "../simulation";
import type { TraceIndex } from "./trace-index";
import type { TraceLinkKind, TraceNode } from "./trace-model";

/**
 * Walking the graph the records already describe.
 *
 * Upstream follows recorded pointers. Downstream follows the same pointers
 * backwards through the derived index. Neither direction ever adds a hop that
 * no record asked for, so a walk that returns one node is a real answer — this
 * record cites nothing and nothing cites it — rather than a failure.
 *
 * Every place a walk stops is reported, and the reasons are kept apart on
 * purpose. A record that cites nothing, a citation nobody produced, the depth
 * limit, an edge that genuinely closes a loop, and an edge that merely arrives
 * somewhere already reached by another path are five different findings. The
 * last two are the ones cheap implementations conflate: a shared ancestor is
 * not a cycle, and reporting it as one would invent a loop the world does not
 * have.
 */

export type TraceDirection = "upstream" | "downstream" | "both";

export const TRACE_DIRECTIONS: readonly TraceDirection[] = [
  "upstream",
  "downstream",
  "both",
];

export const DEFAULT_TRACE_DEPTH = 8;

export interface TraceWalkRequest {
  readonly rootId: EntityId;
  readonly direction: TraceDirection;
  readonly maxDepth?: number;
  /** Null means every kind; a list restricts the walk without hiding boundaries. */
  readonly linkKinds?: readonly TraceLinkKind[] | null;
}

export interface NormalizedTraceWalkRequest {
  readonly rootId: EntityId;
  readonly direction: TraceDirection;
  readonly maxDepth: number;
  readonly linkKinds: readonly TraceLinkKind[] | null;
}

export interface TraceWalkStep {
  readonly nodeId: EntityId;
  readonly depth: number;
  readonly direction: "root" | "upstream" | "downstream";
  readonly fromNodeId: EntityId | null;
  readonly viaLinkKind: TraceLinkKind | null;
  readonly viaRole: string | null;
}

export type TraceBoundaryKind =
  | "no-recorded-link"
  | "unresolved-target"
  | "depth-limit"
  | "cycle"
  | "already-reached";

export interface TraceBoundary {
  readonly kind: TraceBoundaryKind;
  readonly nodeId: EntityId;
  readonly direction: "upstream" | "downstream";
  /** The field that produced the boundary, or a plain marker when there is none. */
  readonly role: string;
  readonly fromNodeId: EntityId | null;
  readonly targetId: EntityId | null;
  readonly note: string;
}

export interface TraceWalkResult {
  readonly request: NormalizedTraceWalkRequest;
  readonly rootFound: boolean;
  readonly steps: readonly TraceWalkStep[];
  readonly nodes: readonly TraceNode[];
  readonly boundaries: readonly TraceBoundary[];
}

interface QueueEntry {
  readonly nodeId: EntityId;
  readonly depth: number;
}

function allowed(
  kind: TraceLinkKind,
  linkKinds: readonly TraceLinkKind[] | null,
): boolean {
  return linkKinds === null || linkKinds.includes(kind);
}

interface OutgoingEdge {
  readonly targetId: EntityId;
  readonly kind: TraceLinkKind;
  readonly role: string;
}

/**
 * The directed edges the walk follows out of one node, in the direction and
 * under the kind filter it was asked for. Upstream follows the record's own
 * recorded pointers; downstream follows the derived reverse index. Both the
 * traversal and the cycle test read edges through here, so a loop is judged
 * against exactly the graph the walk itself moves over — never a larger one.
 */
function outgoingEdges(
  index: TraceIndex,
  node: TraceNode,
  direction: "upstream" | "downstream",
  linkKinds: readonly TraceLinkKind[] | null,
): OutgoingEdge[] {
  if (direction === "upstream") {
    return node.links
      .filter((link) => allowed(link.kind, linkKinds))
      .map((link) => ({
        targetId: link.targetId,
        kind: link.kind,
        role: link.role,
      }));
  }
  return (index.childIdsByTargetId.get(node.id) ?? []).flatMap((childId) => {
    const child = index.byId.get(childId);
    if (!child) return [];
    return child.links
      .filter(
        (link) => link.targetId === node.id && allowed(link.kind, linkKinds),
      )
      .map((link) => ({
        targetId: child.id,
        kind: link.kind,
        role: link.role,
      }));
  });
}

/**
 * True when an edge `fromId -> targetId` closes a genuine directed cycle:
 * that is, when `targetId` can reach `fromId` again by following the same
 * directed, kind-filtered edges the walk follows. This is stronger than asking
 * whether `targetId` is an ancestor on one spanning-tree path — two records
 * discovered as breadth-first siblings can still point back at each other, and
 * only a reachability test over the real edges catches that loop.
 *
 * A convergent DAG path can never satisfy it: if `targetId` could reach
 * `fromId` while `fromId` points at `targetId`, the graph would already
 * contain the loop. So a shared ancestor or a second path to the same record
 * stays a plain `already-reached` boundary and is never mistaken for a cycle.
 * The visited guard keeps the search finite, and its boolean answer does not
 * depend on visit order, so the walk stays deterministic.
 */
function closesDirectedCycle(
  index: TraceIndex,
  fromId: EntityId,
  targetId: EntityId,
  direction: "upstream" | "downstream",
  linkKinds: readonly TraceLinkKind[] | null,
): boolean {
  if (targetId === fromId) return true;
  const visited = new Set<EntityId>([targetId]);
  const stack: EntityId[] = [targetId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId === undefined) break;
    const current = index.byId.get(currentId);
    if (!current) continue;
    for (const edge of outgoingEdges(index, current, direction, linkKinds)) {
      if (edge.targetId === fromId) return true;
      if (visited.has(edge.targetId)) continue;
      visited.add(edge.targetId);
      stack.push(edge.targetId);
    }
  }
  return false;
}

/**
 * Breadth-first in both senses of the word: it visits nearer records first,
 * and within a depth it visits them in the index's own append order, so the
 * same request against the same world always produces the same step list.
 */
export function walkTrace(
  index: TraceIndex,
  request: TraceWalkRequest,
): TraceWalkResult {
  const maxDepth = request.maxDepth ?? DEFAULT_TRACE_DEPTH;
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) {
    throw new Error("A trace walk depth must be a non-negative integer.");
  }
  const linkKinds = request.linkKinds ?? null;
  const normalized: NormalizedTraceWalkRequest = {
    rootId: request.rootId,
    direction: request.direction,
    maxDepth,
    linkKinds,
  };

  const root = index.byId.get(request.rootId);
  if (!root) {
    return {
      request: normalized,
      rootFound: false,
      steps: [],
      nodes: [],
      boundaries: [],
    };
  }

  const order = new Map<EntityId, number>();
  index.nodes.forEach((node, position) => order.set(node.id, position));

  const steps: TraceWalkStep[] = [
    {
      nodeId: root.id,
      depth: 0,
      direction: "root",
      fromNodeId: null,
      viaLinkKind: null,
      viaRole: null,
    },
  ];
  const boundaries: TraceBoundary[] = [];
  const reached = new Set<EntityId>([root.id]);

  const directions: readonly ("upstream" | "downstream")[] =
    request.direction === "both"
      ? ["upstream", "downstream"]
      : [request.direction];

  for (const direction of directions) {
    // Each direction keeps its own visited set, so a record reachable both
    // ways is walked once per direction rather than being swallowed by the
    // other direction's bookkeeping.
    const seen = new Set<EntityId>([root.id]);
    const queue: QueueEntry[] = [{ nodeId: root.id, depth: 0 }];

    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;
      const node = index.byId.get(entry.nodeId);
      if (!node) continue;

      const outgoing = outgoingEdges(index, node, direction, linkKinds);

      if (entry.depth >= maxDepth) {
        if (outgoing.length > 0) {
          boundaries.push({
            kind: "depth-limit",
            nodeId: node.id,
            direction,
            role: "(depth limit)",
            fromNodeId: null,
            targetId: null,
            note: `The walk stopped at its depth limit of ${maxDepth}, not at the end of the chain.`,
          });
        }
        continue;
      }

      if (direction === "upstream") {
        for (const unrecorded of node.unrecordedLinks) {
          if (!allowed(unrecorded.kind, linkKinds)) continue;
          boundaries.push({
            kind: "no-recorded-link",
            nodeId: node.id,
            direction,
            role: unrecorded.role,
            fromNodeId: null,
            targetId: null,
            note: unrecorded.note,
          });
        }
      } else if (outgoing.length === 0) {
        boundaries.push({
          kind: "no-recorded-link",
          nodeId: node.id,
          direction,
          role: "(no citing record)",
          fromNodeId: null,
          targetId: null,
          note: "No registered record cites this one, so nothing followed from it in the recorded history.",
        });
      }

      for (const edge of outgoing) {
        const target = index.byId.get(edge.targetId);
        if (!target) {
          boundaries.push({
            kind: "unresolved-target",
            nodeId: node.id,
            direction,
            role: edge.role,
            fromNodeId: null,
            targetId: edge.targetId,
            note: "The record names this link, but no registered trace source produced its target.",
          });
          continue;
        }
        if (seen.has(target.id)) {
          const closesLoop = closesDirectedCycle(
            index,
            node.id,
            target.id,
            direction,
            linkKinds,
          );
          boundaries.push({
            kind: closesLoop ? "cycle" : "already-reached",
            nodeId: target.id,
            direction,
            role: edge.role,
            fromNodeId: node.id,
            targetId: target.id,
            note: closesLoop
              ? "This edge returns to a record already on the path, so the walk stops rather than looping."
              : "This record was already reached by another recorded path; the edge is real and the walk does not expand it twice.",
          });
          continue;
        }
        seen.add(target.id);
        reached.add(target.id);
        steps.push({
          nodeId: target.id,
          depth: entry.depth + 1,
          direction,
          fromNodeId: node.id,
          viaLinkKind: edge.kind,
          viaRole: edge.role,
        });
        queue.push({ nodeId: target.id, depth: entry.depth + 1 });
      }
    }
  }

  const nodes = [...reached]
    .flatMap((id) => {
      const node = index.byId.get(id);
      return node ? [node] : [];
    })
    .sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
    );

  return {
    request: normalized,
    rootFound: true,
    steps,
    nodes,
    boundaries,
  };
}
