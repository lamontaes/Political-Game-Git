import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "./compare.mjs";
const rows = (milliseconds, extra = {}) =>
  milliseconds.map((ms) => ({
    schema: "core2-month-v1",
    revision: "fixture",
    seed: "fixture",
    placeKey: "fixture",
    inputHash: "fixture",
    startedAt: "fixture",
    days: 365,
    settings: { fixture: true },
    host: { fixture: true },
    opening: { budget: { passed: true } },
    millisecondsPerDay: ms,
    peakRssMiB: 1,
    ...extra,
  }));
test("paired medians tolerate one outlier and enforce strict twenty-percent limit", () => {
  assert.equal(compare(rows([10, 10, 100]), rows([12, 12, 200])).passed, true);
  const result = compare(rows([10, 10, 100]), rows([12.01, 12.01, 200]));
  assert.equal(result.passed, false);
  assert.equal(result.ratio, 1.201);
});
test("unmatched worlds, hosts and revisions cannot produce green comparisons", () => {
  for (const extra of [
    { host: { fixture: false } },
    { seed: "different" },
    { days: 30 },
    { settings: { fixture: false } },
  ])
    assert.throws(() => compare(rows([10, 10, 10]), rows([10, 10, 10], extra)));
  const changed = rows([10, 10, 10]);
  changed[1].revision = "other";
  assert.throws(() => compare(changed, rows([10, 10, 10])));
});
test("a changed opening is timed and reported, not refused", () => {
  const result = compare(
    rows([10, 10, 10]),
    rows([11, 11, 11], { inputHash: "changed" }),
  );
  assert.equal(result.passed, true);
  assert.equal(result.ratio, 1.1);
  assert.deepEqual(result.inputHash, {
    base: "fixture",
    head: "changed",
    changed: true,
  });
  assert.equal(
    compare(rows([10, 10, 10]), rows([10, 10, 10])).inputHash.changed,
    false,
  );
  const mixed = rows([10, 10, 10]);
  mixed[2].inputHash = "changed";
  assert.throws(
    () => compare(rows([10, 10, 10]), mixed),
    /inputHash inside a revision/,
  );
});
test("incomplete or invalid receipts fail closed", () => {
  assert.throws(() => compare(rows([10]), rows([10, 10, 10])));
  for (const extra of [
    { millisecondsPerDay: NaN },
    { peakRssMiB: 0 },
    { opening: { budget: {} } },
  ])
    assert.throws(() => compare(rows([10, 10, 10]), rows([10, 10, 10], extra)));
});

test("input-budget failure stays red independently of timing", () => {
  const result = compare(
    rows([10, 10, 10]),
    rows([10, 10, 10], {
      opening: { budget: { passed: false, violations: ["oversized fixture"] } },
    }),
  );
  assert.equal(result.passed, false);
  assert.equal(result.speedPassed, true);
  assert.equal(result.openingBudgetPassed, false);
});

test("fewer measured pairs compare when both sides have the same count", () => {
  // A large drawn town whose time budget allowed one or two pairs.
  assert.equal(compare(rows([10]), rows([12])).ratio, 1.2);
  assert.equal(compare(rows([10]), rows([12])).measuredPairs, 1);
  const two = compare(rows([10, 20]), rows([12, 24]));
  assert.equal(two.baseMillisecondsPerDay, 15);
  assert.equal(two.headMillisecondsPerDay, 18);
  assert.equal(two.measuredPairs, 2);
  for (const [base, head] of [
    [[10, 10], [10]],
    [[], []],
    [
      [10, 10, 10, 10],
      [10, 10, 10, 10],
    ],
  ])
    assert.throws(() => compare(rows(base), rows(head)));
});
