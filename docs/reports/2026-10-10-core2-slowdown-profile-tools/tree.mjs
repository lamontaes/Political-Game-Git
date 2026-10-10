// Usage: node tree.mjs file depth rootFnName  -> inclusive-time tree (merged by function name) under all nodes named rootFnName
import { readFileSync } from "node:fs";
const [file, depthArg, rootName, minArg] = process.argv.slice(2);
const depth = Number(depthArg),
  minMs = Number(minArg ?? 300);
const prof = JSON.parse(readFileSync(file, "utf8"));
const nodes = new Map(
  prof.nodes.map((n) => [n.id, { ...n, self: 0, total: 0 }]),
);
const dts = prof.timeDeltas;
for (let i = 0; i < prof.samples.length; i++)
  nodes.get(prof.samples[i]).self += (dts[i + 1] ?? dts[i]) / 1000;
const tot = (n) =>
  (n.total =
    n.self + (n.children ?? []).reduce((s, c) => s + tot(nodes.get(c)), 0));
tot(nodes.get(prof.nodes[0].id));
const name = (n) =>
  `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.replace(/^.*\/(src\/)/, "$1")}`;
// merge roots by name
const roots = [...nodes.values()].filter(
  (n) => n.callFrame.functionName === rootName,
);
function merge(ns, d, indent) {
  const groups = new Map();
  for (const n of ns)
    for (const c of n.children ?? []) {
      const cn = nodes.get(c),
        k = name(cn);
      (groups.get(k) ?? groups.set(k, []).get(k)).push(cn);
    }
  const rows = [...groups.entries()]
    .map(([k, g]) => [
      k,
      g.reduce((s, x) => s + x.total, 0),
      g.reduce((s, x) => s + x.self, 0),
      g,
    ])
    .sort((a, b) => b[1] - a[1]);
  for (const [k, t, s, g] of rows) {
    if (t < minMs) continue;
    console.log(`${indent}${Math.round(t)}ms (self ${Math.round(s)}) ${k}`);
    if (d > 1) merge(g, d - 1, indent + "  ");
  }
}
console.log(
  `ROOT ${rootName}: ${Math.round(roots.reduce((s, r) => s + r.total, 0))}ms self ${Math.round(roots.reduce((s, r) => s + r.self, 0))}`,
);
merge(roots, depth, "  ");
