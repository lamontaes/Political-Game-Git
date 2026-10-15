/* global process, console */
// Summarize a .cpuprofile: top functions by self time and by inclusive time.
// Usage: node scripts/core2-year/profile-top.mjs file.cpuprofile [top]
import { readFileSync } from "node:fs";

const profile = JSON.parse(readFileSync(process.argv[2], "utf8"));
const top = Number(process.argv[3] ?? 30);
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes)
  for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map();
for (let i = 0; i < profile.samples.length; i++)
  self.set(
    profile.samples[i],
    (self.get(profile.samples[i]) ?? 0) + (profile.timeDeltas[i] ?? 0),
  );
const label = (n) =>
  `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").slice(-1)[0]}:${n.callFrame.lineNumber + 1}`;
const selfBy = new Map(),
  inclBy = new Map();
let total = 0;
for (const [id, us] of self) {
  total += us;
  const n = nodes.get(id);
  selfBy.set(label(n), (selfBy.get(label(n)) ?? 0) + us);
  const seen = new Set();
  for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
    const l = label(nodes.get(cur));
    if (seen.has(l)) continue;
    seen.add(l);
    inclBy.set(l, (inclBy.get(l) ?? 0) + us);
  }
}
const show = (title, map) => {
  console.log(`\n${title} (total ${(total / 1e6).toFixed(2)} s)`);
  for (const [l, us] of [...map].sort((a, b) => b[1] - a[1]).slice(0, top))
    console.log(
      `${(us / 1e6).toFixed(2).padStart(7)} s ${((100 * us) / total).toFixed(1).padStart(5)}%  ${l}`,
    );
};
show("Self", selfBy);
show("Inclusive", inclBy);
// Optional: node profile-top.mjs file top functionName → that function's direct callees (inclusive).
const focus = process.argv[4];
if (focus) {
  const inclusive = (id) => {
    let total = self.get(id) ?? 0;
    for (const child of nodes.get(id).children ?? []) total += inclusive(child);
    return total;
  };
  const callees = new Map();
  for (const n of profile.nodes)
    if (n.callFrame.functionName === focus)
      for (const child of n.children ?? []) {
        const l = label(nodes.get(child));
        callees.set(l, (callees.get(l) ?? 0) + inclusive(child));
      }
  show(`Callees of ${focus}`, callees);
}
