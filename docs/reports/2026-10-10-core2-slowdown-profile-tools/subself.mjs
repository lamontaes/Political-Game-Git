import { readFileSync } from "node:fs";
const [file, rootName] = process.argv.slice(2);
const prof = JSON.parse(readFileSync(file, "utf8"));
const nodes = new Map(prof.nodes.map((n) => [n.id, { ...n, self: 0 }]));
const dts = prof.timeDeltas;
for (let i = 0; i < prof.samples.length; i++)
  nodes.get(prof.samples[i]).self += (dts[i + 1] ?? dts[i]) / 1000;
const out = new Map();
let sum = 0;
const walk = (n) => {
  const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.replace(/^.*\/(src\/)/, "$1")}`;
  out.set(k, (out.get(k) ?? 0) + n.self);
  sum += n.self;
  for (const c of n.children ?? []) walk(nodes.get(c));
};
for (const n of nodes.values())
  if (n.callFrame.functionName === rootName) walk(n);
console.log("subtree self sum ms", Math.round(sum));
[...out.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 22)
  .forEach(([k, v]) =>
    console.log(Math.round(v), ((v / sum) * 100).toFixed(1) + "%", k),
  );
