// Usage: node summarize.mjs <file.cpuprofile> [topN] -> JSON {totalMs, self:[], total:[]}
// Self time from sample deltas; total time = inclusive time per unique function (recursion counted once per sample).
import { readFileSync } from "node:fs";
const [file, topArg] = process.argv.slice(2);
const top = Number(topArg ?? 40);
const prof = JSON.parse(readFileSync(file, "utf8"));
const nodes = new Map(prof.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of prof.nodes)
  for (const c of n.children ?? []) parent.set(c, n.id);
const key = (n) => {
  const f = n.callFrame;
  const url = f.url.replace(
    /^file:\/\/.*?\/(wt-(?:before|after)|Political-Game-Git)\//,
    "",
  );
  return `${f.functionName || "(anonymous)"} ${url}:${f.lineNumber + 1}`;
};
const self = new Map(),
  total = new Map();
let all = 0;
const dts = prof.timeDeltas;
for (let i = 0; i < prof.samples.length; i++) {
  const dt = (dts[i + 1] ?? dts[i]) / 1000; // ms attributed to this sample
  all += dt;
  let id = prof.samples[i];
  const sk = key(nodes.get(id));
  self.set(sk, (self.get(sk) ?? 0) + dt);
  const seen = new Set();
  while (id !== undefined) {
    const k = key(nodes.get(id));
    if (!seen.has(k)) {
      seen.add(k);
      total.set(k, (total.get(k) ?? 0) + dt);
    }
    id = parent.get(id);
  }
}
const rank = (m) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name, ms]) => ({
      name,
      ms: Math.round(ms),
      pct: +((ms / all) * 100).toFixed(1),
    }));
console.log(
  JSON.stringify({
    totalMs: Math.round(all),
    self: rank(self),
    total: rank(total),
    selfAll: Object.fromEntries([...self].map(([k, v]) => [k, v])),
    totalAll: Object.fromEntries([...total]),
  }),
);
