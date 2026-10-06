import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import {
  openSync,
  readSync,
  closeSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { Buffer } from "node:buffer";
import {
  createWorldSnapshot,
  readWorldSnapshot,
} from "../../src/simulation/serialization.ts";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life.ts";

const expected = JSON.parse(
  readFileSync("test-results/session5/final-receipt.json", "utf8"),
);
function* savedChunks() {
  const fd = openSync("test-results/session5/final.world.json", "r");
  const decoder = new StringDecoder("utf8");
  const buffer = Buffer.alloc(1048576);
  try {
    let bytes;
    while ((bytes = readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      const text = decoder.write(buffer.subarray(0, bytes));
      if (text) yield text;
    }
    const final = decoder.end();
    if (final) yield final;
  } finally {
    closeSync(fd);
  }
}
const reopened = readWorldSnapshot(savedChunks()).world;
assert.equal(createWorldSnapshot(reopened).snapshotId, expected.snapshotId);
assert.equal(reopened.id, expected.worldId);
assert.equal(reopened.control.kind, "person");
assert.equal(reopened.control.personId, expected.personId);
assert.deepEqual(reopened.currentMoment, expected.moment);
assert.equal(reopened.pastMode, undefined);
assert.equal(reopened.preStartLife, undefined);
const continued = passOrdinaryDays(reopened, 7);
assert.equal(continued.id, reopened.id);
assert.ok(continued.currentDate > reopened.currentDate);
assert.deepEqual(continued.control, reopened.control);
for (const [kind, records] of Object.entries(reopened.history)) {
  if (!Array.isArray(records)) continue;
  const after = continued.history[kind];
  assert.ok(Array.isArray(after));
  for (let index = 0; index < records.length; index++)
    assert.deepEqual(after[index], records[index]);
}
const result = {
  savedSource: expected.sourceHead,
  savedWorldId: reopened.id,
  snapshotId: expected.snapshotId,
  entireSavedContentMatches: true,
  continuedTo: continued.currentDate,
  historyPrefixesKept: true,
  payloadInput: "one-shot canonical reader iterable; no retained text array",
  heap: process.memoryUsage(),
};
writeFileSync(
  "test-results/session5/save-continue-proof.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
