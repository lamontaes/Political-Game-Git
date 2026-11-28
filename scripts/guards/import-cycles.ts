import { transformSync } from "esbuild";
import path from "node:path";

/**
 * The runtime import graph of the source files, and its cycles.
 *
 * An edge is an import that survives the transform the game runs under
 * (esbuild drops an import whose names are only used as types), so a type-only
 * import is not an edge. A cycle is a strongly connected group of files: each
 * reaches the others through imports, so which of them loads first changes what
 * the others find already built (the "Cannot access ... before initialization"
 * failures that npm run tests:load and the test loader show). The guard counts
 * the imports that lie on a cycle and the files in one; neither may grow.
 */
export type Graph = Map<string, Set<string>>;
export type CycleStats = {
  readonly files: number;
  readonly edges: number;
  readonly cycles: number;
  readonly largest: readonly number[];
  readonly filesInCycles: number;
  readonly edgesInCycles: number;
};

/** Edges from the sources, keyed by repository path; only paths in `sources` count. */
export function runtimeGraph(sources: ReadonlyMap<string, string>): Graph {
  const known = new Set(sources.keys());
  const resolve = (from: string, spec: string): string | null => {
    if (!spec.startsWith(".")) return null;
    const base = path.posix.normalize(
      path.posix.join(path.posix.dirname(from), spec),
    );
    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      base.replace(/\.js$/, ".ts"),
    ])
      if (known.has(candidate)) return candidate;
    return null;
  };
  const graph: Graph = new Map();
  for (const [file, source] of sources) {
    let code: string;
    try {
      code = transformSync(source, {
        loader: file.endsWith("x") ? "tsx" : "ts",
        format: "esm",
        target: "esnext",
      }).code;
    } catch {
      continue;
    }
    const to = new Set<string>();
    for (const m of code.matchAll(
      /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    )) {
      const target = resolve(file, (m[1] ?? m[2])!);
      if (target && target !== file) to.add(target);
    }
    graph.set(file, to);
  }
  return graph;
}

/** The cycles in a graph: strongly connected groups of two or more files (Tarjan, no recursion). */
export function cycleStats(graph: Graph): CycleStats {
  let next = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const component = new Map<string, number>();
  let components = 0;
  for (const start of graph.keys()) {
    if (index.has(start)) continue;
    const work: { v: string; out: string[]; i: number }[] = [];
    const open = (v: string) => {
      index.set(v, next);
      low.set(v, next);
      next++;
      stack.push(v);
      onStack.add(v);
      work.push({ v, out: [...(graph.get(v) ?? [])], i: 0 });
    };
    open(start);
    while (work.length) {
      const frame = work[work.length - 1]!;
      if (frame.i < frame.out.length) {
        const w = frame.out[frame.i++]!;
        if (!graph.has(w)) continue;
        if (!index.has(w)) open(w);
        else if (onStack.has(w))
          low.set(frame.v, Math.min(low.get(frame.v)!, index.get(w)!));
      } else {
        work.pop();
        const parent = work[work.length - 1];
        if (parent)
          low.set(parent.v, Math.min(low.get(parent.v)!, low.get(frame.v)!));
        if (low.get(frame.v) === index.get(frame.v)) {
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            component.set(w, components);
          } while (w !== frame.v);
          components++;
        }
      }
    }
  }
  const size = new Map<number, number>();
  for (const c of component.values()) size.set(c, (size.get(c) ?? 0) + 1);
  let filesInCycles = 0;
  let edgesInCycles = 0;
  let edges = 0;
  for (const [file, targets] of graph) {
    const c = component.get(file)!;
    const inCycle = (size.get(c) ?? 0) > 1;
    if (inCycle) filesInCycles++;
    for (const t of targets) {
      edges++;
      if (inCycle && component.get(t) === c) edgesInCycles++;
    }
  }
  const sizes = [...size.values()].filter((n) => n > 1).sort((a, b) => b - a);
  return {
    files: graph.size,
    edges,
    cycles: sizes.length,
    largest: sizes.slice(0, 5),
    filesInCycles,
    edgesInCycles,
  };
}
