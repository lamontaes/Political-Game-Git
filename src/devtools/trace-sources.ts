import type { World } from "../simulation";
import type { TraceNode, TraceRecordClass } from "./trace-model";

/**
 * The seam a record family uses to become traceable.
 *
 * The inspector deliberately knows nothing about which families exist. It
 * knows how to walk edges and how to render boundaries; which records supply
 * those edges is a registration, not a hard-coded list. A later system — the
 * narrative and Pennywise sources Packet 60 owns, a campaign record family, a
 * legislative bargaining family — becomes visible in the trace by registering
 * a source here, and needs no change to the graph logic at all.
 *
 * The one thing a source may not do is manufacture an edge. `collect` reads a
 * world and projects records; every link it emits must be a field the record
 * itself carries. That rule is not decorative — a fabricated parent is
 * indistinguishable from a real one once it is in an exported trace, and the
 * export is what ends up in a bug report.
 */
export interface TraceSource {
  /** Unique and stable. Two sources may not claim the same key. */
  readonly key: string;
  /** Where the records live, e.g. `history.claims`. */
  readonly family: string;
  /**
   * The class this source produces, declared up front so a filtered inspection
   * can skip collection entirely. A source that genuinely produces more than
   * one class declares `"unknown"` here and classifies per record.
   */
  readonly declaredClass: TraceRecordClass;
  /** Reads the world. Must not mutate it and must not invent links. */
  readonly collect: (world: World) => readonly TraceNode[];
}

export interface TraceSourceRegistry {
  /** Ordered by key, so collection order never depends on registration order. */
  readonly sources: readonly TraceSource[];
}

function assertUsableSource(source: TraceSource): void {
  if (source.key.trim().length === 0) {
    throw new Error("A trace source needs a stable key.");
  }
  if (source.family.trim().length === 0) {
    throw new Error(`Trace source ${source.key} needs a record family.`);
  }
}

/**
 * Builds a registry, refusing a duplicate key rather than letting one source
 * quietly shadow another.
 *
 * Shadowing is the failure mode that matters here: a later-registered source
 * silently replacing a built-in family would change what a trace means without
 * changing anything visible about the trace.
 */
export function createTraceSourceRegistry(
  sources: readonly TraceSource[],
): TraceSourceRegistry {
  const byKey = new Map<string, TraceSource>();
  for (const source of sources) {
    assertUsableSource(source);
    if (byKey.has(source.key)) {
      throw new Error(`Duplicate trace source key: ${source.key}`);
    }
    byKey.set(source.key, source);
  }
  return {
    sources: [...byKey.values()].sort((left, right) =>
      left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
    ),
  };
}

/**
 * Adds sources to an existing registry.
 *
 * This is the call a later packet makes. It returns a new registry rather than
 * mutating the one it was given, so a caller holding the default registry
 * still holds the default registry.
 */
export function extendTraceSourceRegistry(
  registry: TraceSourceRegistry,
  additions: readonly TraceSource[],
): TraceSourceRegistry {
  return createTraceSourceRegistry([...registry.sources, ...additions]);
}

export function traceSourceKeys(
  registry: TraceSourceRegistry,
): readonly string[] {
  return registry.sources.map((source) => source.key);
}
