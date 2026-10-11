/* global process, console */
import { readFileSync, writeFileSync } from "node:fs";
const [dir] = process.argv.slice(2);
function analyze(label) {
  const p = JSON.parse(readFileSync(`${dir}/${label}.cpuprofile`));
  const nodes = new Map(p.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of p.nodes)
    for (const id of n.children ?? []) parent.set(id, n.id);
  const clean = (u) =>
    u.includes("/src/") ? u.slice(u.indexOf("/src/") + 1) : u;
  const key = (n) =>
    `${n.callFrame.functionName || "(anonymous)"} ${clean(n.callFrame.url)}`;
  const match = (n) => {
    const f = n.callFrame.functionName,
      u = n.callFrame.url;
    if (f === "(garbage collector)") return "Garbage collection";
    if (f === "verify" && u.includes("/core2/finance-plan"))
      return "Read-log validation";
    if (
      [
        "field",
        "payload",
        "mapGet",
        "mapHas",
        "member",
        "members",
        "keys",
        "array",
        "size",
        "readSource",
      ].includes(f) &&
      u.includes("/core2/finance-plan")
    )
      return "Read recording";
    if (
      [
        "detach",
        "detached",
        "shallow",
        "copy",
        "copyResolved",
        "protectJournalObjects",
        "guardedRecord",
      ].includes(f) &&
      u.includes("/core2/")
    )
      return "Copying and freezing";
    return null;
  };
  const broad = (n) => {
    const f = n.callFrame.functionName,
      u = n.callFrame.url;
    if (u.includes("/core2/journal-state") || u.endsWith("/core2/journal.ts"))
      return "Journal posting and checks";
    if (u.includes("/core2/work-pay-period"))
      return "Pay-period calculations and guards";
    if (
      u.includes("/core2/finance-plan") ||
      u.includes("/core2/finance-cash") ||
      u.includes("/core2/act-cash")
    )
      return "Finance planning and authority";
    if (
      u.includes("/core2/work-attendance") ||
      (f === "settleWorkResult" && u.includes("/core2/work-state"))
    )
      return "Attendance and accrual remainder";
    if (u.includes("/core2/work-payroll"))
      return "Payroll settlement and dispatch remainder";
    if (f === "runScheduledWork" && u.includes("/core2/modules/work"))
      return "Work scheduling remainder";
    return null;
  };
  const self = {},
    inclusive = {},
    buckets = {},
    branchBuckets = {};
  let totalMs = 0,
    profilerControlMs = 0;
  for (let i = 0; i < p.samples.length; i++) {
    const dt = p.timeDeltas[i] / 1000;
    let id = p.samples[i];
    const stack = [];
    while (id !== undefined) {
      stack.push(nodes.get(id));
      id = parent.get(id);
    }
    // Profiler.stop serializes its snapshot before sampling ends. It is outside
    // the measured world window and is not simulation speed debt.
    if (
      stack.some(
        (n) =>
          n.callFrame.url === "node:inspector" &&
          n.callFrame.functionName === "post",
      )
    ) {
      profilerControlMs += dt;
      continue;
    }
    totalMs += dt;
    const sk = key(stack[0]);
    self[sk] = (self[sk] ?? 0) + dt;
    const seen = new Set();
    for (const n of stack) {
      const k = key(n);
      if (!seen.has(k)) {
        seen.add(k);
        inclusive[k] = (inclusive[k] ?? 0) + dt;
      }
    }
    const bucket =
      stack.map(match).find(Boolean) ??
      stack.map(broad).find(Boolean) ??
      "Other simulation and runtime";
    buckets[bucket] = (buckets[bucket] ?? 0) + dt;
    const branch = stack.find(
      (n) => n.callFrame.functionName === "recordWorkAttendance",
    )
      ? "attendance"
      : stack.find(
            (n) => n.callFrame.functionName === "settleWorkPayrollJournal",
          )
        ? "payday"
        : "outside";
    branchBuckets[branch] ??= {};
    branchBuckets[branch][bucket] = (branchBuckets[branch][bucket] ?? 0) + dt;
  }
  const rank = (o) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .map(([name, ms]) => ({ name, seconds: ms / 1000 }));
  return {
    label,
    totalSeconds: totalMs / 1000,
    excludedProfilerControlSeconds: profilerControlMs / 1000,
    profileDurationSeconds: (p.endTime - p.startTime) / 1e6,
    samples: p.samples.length,
    buckets,
    branchBuckets,
    self: rank(self),
    inclusive: rank(inclusive),
  };
}
const baseline = analyze("baseline"),
  candidate = analyze("candidate");
const gapSeconds = candidate.totalSeconds - baseline.totalSeconds;
const deltas = [
  ...new Set([
    ...Object.keys(baseline.buckets),
    ...Object.keys(candidate.buckets),
  ]),
]
  .map((name) => ({
    name,
    baselineSeconds: (baseline.buckets[name] ?? 0) / 1000,
    candidateSeconds: (candidate.buckets[name] ?? 0) / 1000,
    extraSeconds:
      ((candidate.buckets[name] ?? 0) - (baseline.buckets[name] ?? 0)) / 1000,
  }))
  .map((x) => ({ ...x, shareOfGap: (100 * x.extraSeconds) / gapSeconds }))
  .sort((a, b) => b.extraSeconds - a.extraSeconds);
const result = {
  schema: "speed-map-profile-analysis-v1",
  method:
    "Each sample uses timeDeltas[i]. Exclude node:inspector post stacks outside the measured world window. Attribute once to its nearest read validation, read recording, copy/freeze or GC frame; otherwise to its nearest semantic subsystem. Buckets partition retained sampled wall time. Inclusive functions count recursion once per sample and overlap. GC is separately sampled, not charged to an allocation site.",
  gapSeconds,
  baseline,
  candidate,
  deltas,
};
writeFileSync(`${dir}/analysis.json`, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      gapSeconds,
      deltas,
      baselineTop: baseline.inclusive.slice(0, 20),
      candidateTop: candidate.inclusive.slice(0, 35),
    },
    null,
    2,
  ),
);
