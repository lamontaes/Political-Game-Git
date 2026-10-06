import { readFileSync, writeFileSync, existsSync } from "node:fs";
const root = process.argv[2];
if (!root) throw new Error("Profile output directory required");
const data = JSON.parse(readFileSync(root + "/days.json", "utf8"));
const self = new Map(),
  inclusive = new Map(),
  growth = new Map();
let totalUs = 0;
for (const day of data.days) {
  const prefix = root + "/day-" + String(day.day).padStart(2, "0") + ".json";
  const p = JSON.parse(readFileSync(prefix + ".cpuprofile", "utf8"));
  const nodes = new Map(p.nodes.map((n) => [n.id, n])),
    parent = new Map();
  for (const n of p.nodes)
    for (const c of n.children ?? []) parent.set(c, n.id);
  for (let i = 0; i < (p.samples ?? []).length; i++) {
    const us = p.timeDeltas[i] ?? 0;
    totalUs += us;
    const id = p.samples[i];
    const key = (n) =>
      JSON.stringify([n.callFrame.url, n.callFrame.functionName]);
    const k = key(nodes.get(id));
    self.set(k, (self.get(k) ?? 0) + us);
    let at = id;
    const seen = new Set();
    while (at !== undefined) {
      const q = key(nodes.get(at));
      if (!seen.has(q)) {
        inclusive.set(q, (inclusive.get(q) ?? 0) + us);
        seen.add(q);
      }
      at = parent.get(at);
    }
  }
  for (const g of day.appendFamilies) {
    const old = growth.get(g.family) ?? {
      family: g.family,
      rows: 0,
      bodyBytes: 0,
    };
    old.rows += g.rows;
    old.bodyBytes += g.bodyBytes;
    growth.set(g.family, old);
  }
}
const top = (m) =>
  [...m]
    .map(([k, us]) => ({
      url: JSON.parse(k)[0],
      function: JSON.parse(k)[1],
      sampledMs: us / 1000,
      share: us / totalUs,
    }))
    .sort((a, b) => b.sampledMs - a.sampledMs);
const report = {
  source: data.input.source,
  input: data.input,
  worldId: data.worldId,
  personId: data.personId,
  completedDays: data.days.length,
  lastDate: data.days.at(-1)?.to,
  wallMs: data.days.reduce((s, d) => s + d.wallMs, 0),
  cpuUserMs: data.days.reduce((s, d) => s + d.cpuUserMs, 0),
  cpuSystemMs: data.days.reduce((s, d) => s + d.cpuSystemMs, 0),
  sampledTotalMs: totalUs / 1000,
  firstHeap: data.days[0]?.heapBefore,
  lastHeap: data.days.at(-1)?.heapAfter,
  peakHeapUsed: Math.max(...data.days.map((d) => d.heapAfter.heapUsed)),
  peakRss: Math.max(...data.days.map((d) => d.heapAfter.rss)),
  topSelf: top(self).slice(0, 35),
  topInclusive: top(inclusive).filter((r) => r.url.includes("/src/")),
  growth: [...growth.values()].sort((a, b) => b.bodyBytes - a.bodyBytes),
  terminal: existsSync(root + "/terminal.json"),
  limitations: data.input.limitations,
};
writeFileSync(root + "/summary.json", JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      ...report,
      input: undefined,
      topSelf: report.topSelf.slice(0, 8),
      topInclusive: report.topInclusive.slice(0, 18),
      growth: report.growth.slice(0, 8),
    },
    null,
    2,
  ),
);
