import { readFileSync } from "node:fs";
const [file, rootName] = process.argv.slice(2);
const prof = JSON.parse(readFileSync(file, "utf8"));
const nodes = new Map(prof.nodes.map((n) => [n.id, { ...n, self: 0 }]));
const parent = new Map();
for (const n of prof.nodes)
  for (const c of n.children ?? []) parent.set(c, n.id);
const dts = prof.timeDeltas;
for (let i = 0; i < prof.samples.length; i++)
  nodes.get(prof.samples[i]).self += (dts[i + 1] ?? dts[i]) / 1000;
const fn = (n) => n.callFrame.functionName,
  url = (n) => n.callFrame.url;
const bucketOf = (n) => {
  const f = fn(n),
    u = url(n);
  if (f === "verify" && u.includes("finance-plan"))
    return "1 verify replay (guards re-checked)";
  if (f === "detach") return "3 detach (deep copy+freeze)";
  if (f === "structuredClone") return "4 structuredClone of result";
  if (f === "payload") return "2 payload/field/map read recording";
  if (
    [
      "field",
      "mapGet",
      "mapHas",
      "member",
      "members",
      "keys",
      "array",
      "readSource",
    ].includes(f) &&
    u.includes("finance-plan")
  )
    return "2 payload/field/map read recording";
  if (u.includes("journal-state") || u.includes("/journal.ts"))
    return "5 journal post/check (journal-state, journal)";
  return null;
};
const sums = new Map();
let sum = 0;
const walk = (id, inSub, stack) => {
  const n = nodes.get(id);
  const sub = inSub || fn(n) === rootName;
  const st = sub ? [...stack, n] : stack;
  if (sub) {
    let b = null;
    for (let i = st.length - 1; i >= 0 && !b; i--) b = bucketOf(st[i]);
    b ??= "6 other (settle plumbing, source refs, act admit, plan building)";
    sums.set(b, (sums.get(b) ?? 0) + n.self);
    sum += n.self;
  }
  for (const c of n.children ?? []) walk(c, sub, st);
};
walk(prof.nodes[0].id, false, []);
console.log("subtree ms", Math.round(sum));
[...sums.entries()]
  .sort()
  .forEach(([k, v]) =>
    console.log(Math.round(v), ((v / sum) * 100).toFixed(1) + "%", k),
  );
