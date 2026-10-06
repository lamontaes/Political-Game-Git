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
  dailySeconds: Array.from({ length: 30 }, () => 1),
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
  events: [{ key: "result", hash: "event", sequence: 4 }],
};
const faster = (patch: Partial<MonthReceipt>): MonthReceipt => ({
  ...baseline,
  dailySeconds: Array.from({ length: 30 }, () => 0.9),
  ...patch,
});
describe("batch month semantic proof", () => {
  it("requires exact accepted-action sequence and cutoff while reporting day means", () => {
    const after = {
      ...baseline,
      fingerprint: "after",
      dailySeconds: Array.from({ length: 30 }, () => 0.9),
      decisions: [
        { ...baseline.decisions[0]!, sequence: 4, cutoffSequence: 4 },
      ],
    };
    const result = compareMonth(baseline, after);
    expect(result.errors).toContain(
      "Decision choice differs in facts, order, or cutoff",
    );
    expect(result.fingerprintsIdentical).toBe(false);
    expect(result.baselineMeanSecondsPerDay).toBe(1);
    expect(result.candidateMeanSecondsPerDay).toBeCloseTo(0.9);
    expect(result.meanReductionPercent).toBeCloseTo(10);
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
      compareMonth(
        baseline,
        faster({
          people: [{ id: "p1", hash: "different" }],
        }),
      ).errors,
    ).toHaveLength(1);
    expect(
      compareMonth(
        baseline,
        faster({
          decisions: [{ ...baseline.decisions[0]!, choice: "step-down" }],
        }),
      ).errors,
    ).toHaveLength(1);
    expect(
      compareMonth(
        baseline,
        faster({
          decisions: [{ ...baseline.decisions[0]!, hash: "different" }],
        }),
      ).errors,
    ).toHaveLength(1);
    expect(
      compareMonth(
        baseline,
        faster({
          events: [{ key: "result", hash: "different", sequence: 4 }],
        }),
      ).errors,
    ).toHaveLength(1);
  });
  it("requires the candidate mean per day to improve", () => {
    const slower = {
      ...baseline,
      dailySeconds: Array.from({ length: 30 }, () => 1.01),
    };
    expect(compareMonth(baseline, slower).errors).toContain(
      "Days 2–31 mean 1.010000s/day is not below main 1.000000s/day",
    );
  });
});
