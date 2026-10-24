// The M1-03 and M1-04 checks' measures: counted records count their heads,
// and a state's opening unemployment must match its published rate even when
// its rest-of-state region carries the state's own rate.
import { describe, expect, it } from "vitest";
import {
  eventTimeHeads,
  openingRateMatches,
  represented,
  unemployedHeads,
  weightedRate,
} from "./m1-measures";

describe("the M1 checks' measures", () => {
  it("count a counted record as the people it stands for", () => {
    const jobs = [
      { personId: "full", heads: 1 },
      { personId: "counted", heads: 3 },
    ];
    expect(represented(jobs, (j) => j.heads)).toBe(4);
    expect(represented([], () => 5)).toBe(0);
  });
  it("weight a state's rate by its regions' people", () => {
    expect(
      weightedRate([
        { pct: 11, people: 1 },
        { pct: 5, people: 1 },
      ]),
    ).toBe(8);
  });
  it("fail a state whose rest region equals its rate but whose weighted rate doesn't", () => {
    // State 5%, its rest-of-state region 5%, a metro at 11%: weighted 8%.
    const rows = [
      { pct: 11, people: 1 },
      { pct: 5, people: 1 },
    ];
    expect(openingRateMatches(rows, 5)).toBe(false);
    expect(openingRateMatches([{ pct: 5, people: 2 }], 5)).toBe(true);
  });
  it("count only seekers without a job, in both tiers", () => {
    const heads = (id: string) => (id === "household" ? 3 : 1);
    const full = [
      { placeId: "town", personId: "a", employed: false },
      { placeId: "town", personId: "b", employed: true },
      { placeId: "elsewhere", personId: "c", employed: false },
    ];
    const counted = [
      { placeId: "town", personId: "household", employed: false },
      { placeId: "town", personId: "household", employed: true },
    ];
    // One jobless full seeker and one jobless household of three.
    expect(unemployedHeads(full, counted, "town", heads)).toBe(4);
  });
  it("keep a change's people as they stood on its day after a fill-in", () => {
    let weight = 3;
    const atEvent = eventTimeHeads(() => weight);
    const hire = { id: "job-change:2025-03-01:j:hire", personId: "worker" };
    atEvent.see([hire]);
    // The worker is filled in: they now stand for one person.
    weight = 1;
    atEvent.see([
      hire,
      { id: "job-change:2025-04-01:k:hire", personId: "worker" },
    ]);
    expect(atEvent.heads(hire)).toBe(3);
    expect(atEvent.heads({ id: "job-change:2025-04-01:k:hire" })).toBe(1);
  });
});
