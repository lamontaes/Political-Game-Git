// Usage: node scripts/speed-years/profile-diff.mjs <a.cpuprofile> <b.cpuprofile>: growth by outermost engine and by inclusive function (measurement only).
import { readFileSync } from "node:fs";
const short = (u) =>
  u.replace(/^.*(Political-Game-Git|scratchpad\/[a-z]+)\//, "");
function summarize(file) {
  const p = JSON.parse(readFileSync(file, "utf8"));
  const node = new Map(),
    parent = new Map();
  for (const n of p.nodes) {
    node.set(n.id, n);
    for (const c of n.children ?? []) parent.set(c, n.id);
  }
  const mod = new Map(),
    incl = new Map();
  let total = 0;
  for (let i = 0; i < p.samples.length; i++) {
    const ms = (p.timeDeltas[i] ?? 0) / 1000;
    total += ms;
    let id = p.samples[i];
    let outer = null;
    const seen = new Set();
    const leaf = node.get(id).callFrame;
    while (id !== undefined) {
      const f = node.get(id).callFrame;
      const u = short(f.url);
      const m = u.match(/src\/core2\/modules\/([^/.]+)/);
      if (m) outer = m[1];
      const k = `${f.functionName || "(anon)"} ${u}`;
      if (!seen.has(k)) {
        seen.add(k);
        incl.set(k, (incl.get(k) ?? 0) + ms);
      }
      id = parent.get(id);
    }
    const b =
      outer ??
      (leaf.functionName.startsWith("(")
        ? leaf.functionName
        : "core:" + short(leaf.url).replace(/^src\/core2\//, ""));
    mod.set(b, (mod.get(b) ?? 0) + ms);
  }
  return { mod, incl, total };
}
const [a, b] = process.argv.slice(2).map(summarize);
console.log(
  `total ${(a.total / 1000).toFixed(1)} -> ${(b.total / 1000).toFixed(1)} s`,
);
const show = (title, x, y, n) => {
  console.log("== " + title);
  const keys = new Set([...x.keys(), ...y.keys()]);
  const rows = [...keys]
    .map((k) => [k, (x.get(k) ?? 0) / 1000, (y.get(k) ?? 0) / 1000])
    .sort((p, q) => q[2] - q[1] - (p[2] - p[1]));
  for (const [k, u, v] of rows.slice(0, n))
    console.log(
      `${u.toFixed(1).padStart(7)} -> ${v.toFixed(1).padStart(7)}  (+${(v - u).toFixed(1)})  ${k}`,
    );
};
show("by outermost module", a.mod, b.mod, 25);
show("by inclusive function", a.incl, b.incl, 45);
