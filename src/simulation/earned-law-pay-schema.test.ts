import { expect, it } from "vitest";
import { createHistoryStore } from "./history";
import { createStableId } from "./ids";
import type { HistoryStore } from "./types";

it("preserves histories without the optional assessment collection", () => {
  const current = createHistoryStore();
  const { earnedLawPayAssessments: _newCollection, ...legacy } = current;
  const older: HistoryStore = legacy;
  expect(older.earnedLawPayAssessments).toBeUndefined();
  expect(JSON.parse(JSON.stringify(older))).toEqual(legacy);
  expect(current.earnedLawPayAssessments).toEqual([]);
  expect(current.nextSequence).toBe(older.nextSequence);
});

it("uses the approved assessment identity without changing transfer identities", () => {
  const key = "world:earned-law-pay:flow:completion:terms:row:measure";
  const first = createStableId("earned-law-pay-assessment", key);
  expect(createStableId("earned-law-pay-assessment", key)).toBe(first);
  expect(
    createStableId(
      "earned-law-pay-assessment",
      key.replace(":completion:", ":another-completion:"),
    ),
  ).not.toBe(first);
  expect(createStableId("resource-transfer-outcome", key)).not.toBe(first);
});
