/* global process, console */
/** Summarizes V8 --cpu-prof samples by function, including descendants. */
import { readFileSync } from "node:fs";
const profile = JSON.parse(readFileSync(process.argv[2], "utf8"));
const parents = new Map();
const functions = new Map();
for (const node of profile.nodes) {
  const frame = node.callFrame;
  functions.set(
    node.id,
    `${frame.functionName || "(anonymous)"}\t${frame.url}:${frame.lineNumber + 1}`,
  );
  for (const child of node.children ?? []) parents.set(child, node.id);
}
const self = new Map(),
  inclusive = new Map();
for (let at = 0; at < (profile.samples ?? []).length; at += 1) {
  let id = profile.samples[at];
  const milliseconds = (profile.timeDeltas?.[at] ?? 0) / 1000;
  const current = functions.get(id);
  if (current === undefined)
    throw new Error(`Profile sample refers to missing node ${id}`);
  self.set(current, (self.get(current) ?? 0) + milliseconds);
  // A recursive function gets one inclusive contribution per sample.
  const visited = new Set();
  while (id !== undefined) {
    const key = functions.get(id);
    if (key !== undefined && !visited.has(key)) {
      inclusive.set(key, (inclusive.get(key) ?? 0) + milliseconds);
      visited.add(key);
    }
    id = parents.get(id);
  }
}
for (const [label, times] of [
  ["Inclusive", inclusive],
  ["Self", self],
]) {
  console.log(`${label} milliseconds`);
  for (const [key, milliseconds] of [...times]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25))
    console.log(`${milliseconds.toFixed(1)}\t${key}`);
}
