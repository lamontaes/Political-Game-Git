import { describe, expect, it } from "vitest";
import {
  compareMonth,
  withoutHistoryPositions,
  type MonthReceipt,
} from "./month";
const baseline: MonthReceipt = {
  seed: "one",
  place: "same",
  days: 30,
  head: "before",
  seconds: 100,
  date: "2026-02-04",
  fingerprint: "before",
  people: [{ id: "p1", hash: "person" }],
  decisions: [
    {
      key: "choice",
      choice: "seek",
      hash: "facts",
      sequence: 3,
      cutoffSequence: 3,
    },
  ],
  events: [{ key: "result", hash: "event" }],
};
describe("batch month semantic proof", () => {
  it("allows only history-position changes while showing the exact decision diff", () => {
    const after = {
      ...baseline,
      fingerprint: "after",
      decisions: [
        { ...baseline.decisions[0]!, sequence: 4, cutoffSequence: 4 },
      ],
    };
    const result = compareMonth(baseline, after);
    expect(result.errors).toEqual([]);
    expect(result.fingerprintsIdentical).toBe(false);
    expect(result.positions).toEqual([
      {
        key: "choice",
        sequenceBefore: 3,
        sequenceAfter: 4,
        cutoffBefore: 3,
        cutoffAfter: 4,
        choice: "seek",
      },
    ]);
    expect(
      withoutHistoryPositions({
        sequence: 3,
        context: { cutoff: { historySequenceExclusive: 3, asOfDate: "today" } },
        choice: "seek",
      }),
    ).toEqual({ context: { cutoff: { asOfDate: "today" } }, choice: "seek" });
  });
  it("rejects changed people, choices, decision facts and recorded results", () => {
    expect(
      compareMonth(baseline, {
        ...baseline,
        people: [{ id: "p1", hash: "different" }],
      }).errors,
    ).toHaveLength(1);
    expect(
      compareMonth(baseline, {
        ...baseline,
        decisions: [{ ...baseline.decisions[0]!, choice: "step-down" }],
      }).errors,
    ).toHaveLength(1);
    expect(
      compareMonth(baseline, {
        ...baseline,
        decisions: [{ ...baseline.decisions[0]!, hash: "different" }],
      }).errors,
    ).toHaveLength(1);
    expect(
      compareMonth(baseline, {
        ...baseline,
        events: [{ key: "result", hash: "different" }],
      }).errors,
    ).toHaveLength(1);
  });
});
