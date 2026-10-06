import inspector from "node:inspector";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";

// Read-only instrumentation. The caller supplies its exact canonical action.
// This module never creates, advances, reloads, or serializes a World itself.
export async function measureAction({ source, route, world, action, output }) {
  if (!source || !route || typeof action !== "function")
    throw new Error("Pinned source, route and canonical action required");
  const session = new inspector.Session();
  session.connect();
  const post = (method, params = {}) =>
    new Promise((resolve, reject) =>
      session.post(method, params, (e, r) => (e ? reject(e) : resolve(r))),
    );
  const startedAt = new Date().toISOString();
  const phases = [];
  const phase = async (name, run) => {
    const start = performance.now();
    try {
      return await run();
    } finally {
      phases.push({ name, milliseconds: performance.now() - start });
    }
  };
  let result, failure, profile, coverage;
  await post("Profiler.enable");
  await post("Profiler.setSamplingInterval", { interval: 1000 });

  await post("Profiler.start");
  const start = performance.now();
  try {
    result = await action(world, phase);
  } catch (error) {
    failure = { name: error.name, message: error.message, stack: error.stack };
  } finally {
    profile = (await post("Profiler.stop")).profile;
    coverage = [];
    session.disconnect();
  }
  const elapsedMs = performance.now() - start;
  const next = result?.world ?? result;
  const growth = [];
  if (next?.history)
    for (const [family, rows] of Object.entries(next.history)) {
      if (!Array.isArray(rows)) continue;
      const old = world.history[family] ?? [];
      if (rows.length < old.length)
        throw new Error(`History shrank: ${family}`);
      const groups = new Map();
      for (let i = old.length; i < rows.length; i++) {
        const row = rows[i];
        const kind = row.kind ?? row.type ?? row.status ?? row.state ?? null;
        const date =
          row.recordedAt ??
          row.date ??
          row.assessedAt ??
          row.effectiveAt ??
          null;
        const key = JSON.stringify([kind, date]);
        const group = groups.get(key) ?? { kind, date, count: 0, bodyBytes: 0 };
        group.count++;
        group.bodyBytes += Buffer.byteLength(JSON.stringify(row));
        groups.set(key, group);
      }
      if (groups.size)
        growth.push({
          family,
          before: old.length,
          after: rows.length,
          groups: [...groups.values()],
        });
    }
  const counts = coverage
    .filter((s) => /\/src\//.test(s.url))
    .flatMap((s) =>
      s.functions
        .filter((f) => f.ranges[0]?.count > 0)
        .map((f) => ({
          url: s.url,
          function: f.functionName,
          startOffset: f.ranges[0].startOffset,
          calls: f.ranges[0].count,
        })),
    );
  const report = {
    source,
    route,
    pid: process.pid,
    startedAt,
    from: world.currentMoment ?? world.currentDate,
    to: next?.currentMoment ?? next?.currentDate ?? null,
    elapsedMs,
    phases,
    failure: failure ?? null,
    growth,
    counts,
    heap: process.memoryUsage(),
    limitations: [
      "New bounded diagnostic, not annual acceptance or original browser trace",
      "CPU samples and call counts are nested; phase times must not be summed across nesting",
      "Appended row body bytes exclude containers and do not attribute shared batches to an individual writer",
      "Profile includes Inspector overhead; no canonical full-save size is measured",
    ],
  };
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  writeFileSync(output + ".cpuprofile", JSON.stringify(profile));
  if (failure)
    throw new Error(`Canonical action failed; retained evidence: ${output}`);
  return { world: next, report };
}

export function timedRegistry(registry, rows) {
  return {
    ...registry,
    get(key) {
      const handler = registry.get(key);
      if (!handler) return handler;
      return (...args) => {
        const start = performance.now();
        try {
          return handler(...args);
        } finally {
          rows.push({
            key,
            milliseconds: performance.now() - start,
            dueAt: args[1]?.dueAt ?? null,
          });
        }
      };
    },
  };
}
