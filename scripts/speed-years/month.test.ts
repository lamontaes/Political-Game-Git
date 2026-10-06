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
  dailyCpuSeconds: Array.from({ length: 30 }, () => 0.8),
  executionId: "baseline-run",
  initialAction: {
    actionNumber: 0,
    date: "2026-01-06",
    decisions: [],
    appendedPayloadDigest: "initial",
  },
  actionDays: Array.from({ length: 30 }, (_, index) => {
    const day = index + 2;
    return {
      day,
      date: new Date(Date.UTC(2026, 0, 6 + index)).toISOString().slice(0, 10),
      actionNumbers: day === 2 ? [1, 2] : [day],
      decisions: [],
      appendedPayloadDigest: "d",
    };
  }),
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
  dailyCpuSeconds: Array.from({ length: 30 }, () => 0.7),
  ...patch,
});
describe("batch month semantic proof", () => {
  it("requires exact accepted-action sequence and cutoff while reporting CPU and wall means", () => {
    const after = {
      ...baseline,
      fingerprint: "after",
      dailySeconds: Array.from({ length: 30 }, () => 0.9),
      dailyCpuSeconds: Array.from({ length: 30 }, () => 0.7),
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
    expect(result.baselineMeanCpuSecondsPerDay).toBeCloseTo(0.8);
    expect(result.candidateMeanCpuSecondsPerDay).toBeCloseTo(0.7);
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
  it("requires process CPU mean per day to improve", () => {
    const slower = {
      ...baseline,
      dailyCpuSeconds: Array.from({ length: 30 }, () => 0.81),
    };
    expect(compareMonth(baseline, slower).errors).toContain(
      "Days 2–31 process CPU mean 0.810000s/day is not below main 0.800000s/day",
    );
  });
});
