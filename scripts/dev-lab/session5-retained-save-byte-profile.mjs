import {
  createReadStream,
  writeFileSync,
  statSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
// Read-only diagnostic bound to retained immutable source34, never a World loader.
const file = process.argv[2],
  out = process.argv[3];
assert.ok(
  file && out,
  "Provide the retained canonical save and diagnostic output path.",
);
assert.equal(
  statSync(file).size,
  1640898649,
  "This diagnostic is bound to the retained source34 save.",
);
const fd = openSync(file, "r");
const header = Buffer.alloc(512);
try {
  readSync(fd, header, 0, header.length, 0);
} finally {
  closeSync(fd);
}
assert.ok(
  header.toString("utf8").includes('"snapshotId":"snapshot_020d90140cb565cd"'),
  "Unexpected retained snapshot.",
);
const stack = [],
  sections = {},
  groups = {};
let offset = 0,
  inString = false,
  slash = false,
  stringParts = [],
  keyString = false;
let capture = null,
  captureStart = 0;
const schemas = {};
const label = (r) =>
  r.type ??
  r.kind ??
  r.basis?.kind ??
  r.basisKind ??
  r.status ??
  "unclassified";
function record(f, parts) {
  const text = Buffer.concat(parts).toString("utf8");
  const r = JSON.parse(text);
  const k = f.path[2],
    g = (groups[k] ??= {});
  const l = String(label(r));
  const row = (g[l] ??= { count: 0, bytes: 0, dates: {} });
  row.count++;
  row.bytes += Buffer.byteLength(text);
  if (!schemas[k])
    schemas[k] = {
      keys: Object.keys(r),
      dateFields: Object.entries(r)
        .filter(
          ([, val]) =>
            (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) ||
            (val &&
              typeof val === "object" &&
              !Array.isArray(val) &&
              typeof val.date === "string"),
        )
        .map(([key]) => key),
    };
  const date =
    typeof r.recordedAt === "string"
      ? r.recordedAt
      : (r.recordedAt?.date ?? r.effectiveAt ?? r.occurredAt ?? r.onDate);
  if (typeof date === "string") {
    const day = (row.dates[date] ??= { count: 0, bytes: 0 });
    day.count++;
    day.bytes += Buffer.byteLength(text);
  }
}
for await (const b of createReadStream(file, { highWaterMark: 1048576 })) {
  let i = 0;
  captureStart = 0;
  while (i < b.length) {
    if (inString) {
      const end = b.indexOf(34, i);
      const limit = end < 0 ? b.length : end;
      let escaped = false;
      if (end >= 0) {
        let n = end - 1;
        while (n >= i && b[n] === 92) {
          escaped = !escaped;
          n--;
        }
        if (n < i) escaped = escaped !== slash;
      }
      if (keyString) stringParts.push(b.subarray(i, limit));
      if (end < 0) {
        let n = b.length - 1,
          parity = false;
        while (n >= i && b[n] === 92) {
          parity = !parity;
          n--;
        }
        slash = n < i ? parity !== slash : parity;
        i = b.length;
        continue;
      }
      if (escaped) {
        if (keyString) stringParts.push(b.subarray(end, end + 1));
        i = end + 1;
        slash = false;
        continue;
      }
      if (keyString) {
        const top = stack.at(-1);
        top.key = JSON.parse(
          '"' + Buffer.concat(stringParts).toString("utf8") + '"',
        );
        top.expectKey = false;
      }
      inString = false;
      slash = false;
      stringParts = [];
      i = end + 1;
      continue;
    }
    const c = b[i],
      top = stack.at(-1);
    if (c === 34) {
      inString = true;
      keyString = !!top && top.kind === "object" && top.expectKey;
      stringParts = [];
      i++;
      continue;
    }
    if (c === 123 || c === 91) {
      const path = top
        ? [...top.path, top.kind === "object" ? top.key : "*"]
        : [];
      const f = {
        kind: c === 123 ? "object" : "array",
        path,
        start: offset + i,
        expectKey: c === 123,
        key: null,
      };
      stack.push(f);
      if (
        path.length === 4 &&
        path[0] === "world" &&
        path[1] === "history" &&
        path[3] === "*" &&
        c === 123
      ) {
        assert.equal(capture, null);
        capture = { frame: f, parts: [] };
        captureStart = i;
      }
    } else if (c === 125 || c === 93) {
      const f = stack.pop();
      assert.ok(f);
      assert.equal(c === 125 ? "object" : "array", f.kind);
      if (f.path.length <= 3 && f.path.length > 0)
        sections[f.path.join(".")] =
          (sections[f.path.join(".")] ?? 0) + (offset + i + 1 - f.start);
      if (capture?.frame === f) {
        capture.parts.push(b.subarray(captureStart, i + 1));
        assert.ok(
          capture.parts.reduce((n, x) => n + x.length, 0) < 16 * 1048576,
          "bounded record",
        );
        record(f, capture.parts);
        capture = null;
        captureStart = i + 1;
      }
    } else if (c === 44 && top?.kind === "object") top.expectKey = true;
    i++;
  }
  if (capture) capture.parts.push(b.subarray(captureStart));
  offset += b.length;
}
assert.equal(stack.length, 0);
assert.equal(inString, false);
assert.equal(offset, statSync(file).size);
const result = {
  source: "34dcc8b6814d64dec99e74362a4429d427b5d097",
  snapshotId: "snapshot_020d90140cb565cd",
  fileBytes: offset,
  method:
    "read-only streaming byte spans; history record bodies excluding commas; no World loaded or advanced",
  schemas,
  sections: Object.entries(sections).sort((a, b) => b[1] - a[1]),
  groups,
  heap: process.memoryUsage(),
};
writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    fileBytes: offset,
    topHistory: result.sections
      .filter(([k]) => k.startsWith("world.history."))
      .slice(0, 12),
    heap: result.heap,
  }),
);
