import process from "node:process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { stableRecordJson } from "./row-evidence.mjs";
const [baseline, candidate, destination] = process.argv.slice(2);
if (!baseline || !candidate || !destination)
  throw new Error(
    "Supply baseline directory, candidate directory and output JSON",
  );
const digests = [],
  packets = [];
const rowKey = (packet) =>
  JSON.stringify([
    packet.family,
    packet.row.stableKey ??
      packet.row.id ??
      packet.row.personId ??
      packet.index,
  ]);
function differences(a, b, path = "$") {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    Array.isArray(a) === Array.isArray(b)
  )
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) =>
      differences(a[key], b[key], `${path}.${key}`),
    );
  return [
    {
      path,
      baseline: a === undefined ? { missing: true } : a,
      candidate: b === undefined ? { missing: true } : b,
    },
  ];
}
for (let action = 0; action < 32; action++) {
  const filename = `day-${String(action).padStart(2, "0")}.json`;
  const left = JSON.parse(readFileSync(resolve(baseline, filename))),
    right = JSON.parse(readFileSync(resolve(candidate, filename)));
  if (!left.recordDigests || !right.recordDigests)
    throw new Error(`Missing full-field digest capture for action ${action}`);
  const a = new Map(left.recordDigests.map((r) => [r.family, r])),
    b = new Map(right.recordDigests.map((r) => [r.family, r]));
  for (const family of new Set([...a.keys(), ...b.keys()]))
    if (a.get(family)?.sha256 !== b.get(family)?.sha256)
      digests.push({
        action,
        from: left.from,
        to: left.to,
        family,
        baseline: a.get(family) ?? null,
        candidate: b.get(family) ?? null,
      });
  if (action !== 4 && action !== 5) continue;
  const paths = [
    resolve(baseline, filename + ".rows.jsonl"),
    resolve(candidate, filename + ".rows.jsonl"),
  ];
  if (paths.some((p) => !existsSync(p)))
    throw new Error(`Missing bounded record packet for action ${action}`);
  const rows = paths.map((p) =>
    readFileSync(p, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
  );
  const maps = rows.map((list) => {
    const map = new Map();
    for (const row of list) {
      const key = rowKey(row);
      if (map.has(key)) throw new Error(`Duplicate packet identity ${key}`);
      map.set(key, row);
    }
    return map;
  });
  const changed = [];
  for (const key of new Set([...maps[0].keys(), ...maps[1].keys()])) {
    const l = maps[0].get(key),
      r = maps[1].get(key);
    if (!l || !r) {
      changed.push({
        key,
        kind: "missing-record",
        baseline: l ?? null,
        candidate: r ?? null,
      });
      continue;
    }
    if (
      stableRecordJson(JSON.stringify(l.row)) !==
      stableRecordJson(JSON.stringify(r.row))
    )
      changed.push({
        key,
        kind: "changed-fields",
        baselineIndex: l.index,
        candidateIndex: r.index,
        fields: differences(l.row, r.row),
      });
  }
  packets.push({
    action,
    changed,
    orderedIdentitiesEqual:
      JSON.stringify(rows[0].map(rowKey)) ===
      JSON.stringify(rows[1].map(rowKey)),
  });
}
writeFileSync(
  destination,
  JSON.stringify(
    {
      baseline,
      candidate,
      digests,
      packets,
      automaticAcceptance: false,
      limitations: [
        "Digests cover appended history rows only; earlier prefix revisions and uncaptured state dictionaries are not proven",
        "No IDs, dates, sequence, provenance or content fields are normalized or waived",
        "Different hashes and payload fields require source/semantic review; this tool never approves parity",
      ],
    },
    null,
    2,
  ) + "\n",
);
