import assert from "node:assert/strict";
import test from "node:test";
import {
  recordsByStringField,
  releaseHistoryReadIndexes,
} from "../../../src/simulation/history-index.ts";

test("read-only census distinguishes source revisions without changing held views", () => {
  const old = [{ personId: "a" }];
  const held = recordsByStringField(old, "personId", "a");
  const next = [...old, { personId: "a" }];
  const current = recordsByStringField(next, "personId", "a");
  const read = globalThis[Symbol.for("session5.cacheCensus")];
  const census = read({ membership: next });
  assert.equal(census.counters.currentSourceArrays, 1);
  assert.equal(census.counters.currentSourceSlots, 2);
  assert.deepEqual(held, old);
  assert.strictEqual(recordsByStringField(next, "personId", "a"), current);
  const noCurrent = read({});
  assert.equal(noCurrent.counters.priorSourceArrays, 1);
  assert.equal(noCurrent.counters.priorSourceSlots, 2);
  releaseHistoryReadIndexes(next);
  assert.equal(read({}).counters.priorSourceArrays, 0);
  assert.deepEqual(held, old);
});
