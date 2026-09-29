/* global process, console */
/** Summarizes V8 --cpu-prof samples, including each frame's descendants. */
import { readFileSync } from "node:fs";
const profile = JSON.parse(readFileSync(process.argv[2], "utf8"));
const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
const parents = new Map();
for (const node of profile.nodes)
  for (const child of node.children ?? []) parents.set(child, node.id);
const self = new Map(),
  inclusive = new Map();
for (let at = 0; at < (profile.samples ?? []).length; at += 1) {
  let id = profile.samples[at];
  const milliseconds = (profile.timeDeltas?.[at] ?? 0) / 1000;
  self.set(id, (self.get(id) ?? 0) + milliseconds);
  while (id !== undefined) {
    inclusive.set(id, (inclusive.get(id) ?? 0) + milliseconds);
    id = parents.get(id);
  }
}
for (const [label, times] of [
  ["Inclusive", inclusive],
  ["Self", self],
]) {
  console.log(`${label} milliseconds`);
  for (const [id, milliseconds] of [...times]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)) {
    const frame = nodes.get(id).callFrame;
    console.log(
      `${milliseconds.toFixed(1)}\t${frame.functionName || "(anonymous)"}\t${frame.url}:${frame.lineNumber + 1}`,
    );
  }
}
