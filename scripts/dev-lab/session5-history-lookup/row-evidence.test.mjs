import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFamilyDigest,
  createPacketBudget,
  captureRowPacket,
  stableRecordJson,
} from "./row-evidence.mjs";
const digest = (rows) => {
  const collector = createFamilyDigest("events");
  for (const row of rows) collector.add(JSON.stringify(row));
  return collector.finish().sha256;
};
test("key insertion order is stable but IDs, dates, sequence and content remain evidence", () => {
  const row = {
    id: "event-a",
    recordedAt: "2026-01-08",
    sequence: 12,
    summary: "Recorded reason",
    refs: ["a", "b"],
  };
  assert.equal(
    digest([row]),
    digest([
      {
        refs: ["a", "b"],
        summary: row.summary,
        sequence: 12,
        recordedAt: row.recordedAt,
        id: row.id,
      },
    ]),
  );
  for (const patch of [
    { id: "event-b" },
    { recordedAt: "2026-01-09" },
    { sequence: 13 },
    { summary: "Different reason" },
    { refs: ["b", "a"] },
  ])
    assert.notEqual(digest([row]), digest([{ ...row, ...patch }]));
  assert.notEqual(
    digest([row, { id: "second" }]),
    digest([{ id: "second" }, row]),
  );
  assert.equal(
    stableRecordJson(JSON.stringify({ z: null, a: false })),
    '{"a":false,"z":null}',
  );
});
test("packet budget captures full rows and fails explicitly without accepting truncation", () => {
  const budget = createPacketBudget(512),
    lines = [];
  captureRowPacket(
    budget,
    lines,
    "decisionTraces",
    4,
    JSON.stringify({ id: "decision-a", reason: "Actual reason", sequence: 19 }),
  );
  assert.deepEqual(JSON.parse(lines[0]), {
    family: "decisionTraces",
    index: 4,
    row: { id: "decision-a", reason: "Actual reason", sequence: 19 },
  });
  const before = budget.usedBytes;
  assert.throws(
    () =>
      captureRowPacket(
        budget,
        lines,
        "events",
        5,
        JSON.stringify({ summary: "x".repeat(512) }),
      ),
    /parity capture incomplete/,
  );
  assert.equal(budget.usedBytes, before);
  assert.equal(lines.length, 1);
});
