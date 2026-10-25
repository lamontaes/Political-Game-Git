// The M1-11 check reads whether an event happened from the event itself, so a
// kind whose responses were all lost fails instead of reading as not exercised.
import { describe, expect, it } from "vitest";
import { occurrence, type OccurredEvent } from "./m1-11-occurred";

const KINDS = ["work.job-lost", "organization.closed", "housing.eviction"];
const year: OccurredEvent[] = [
  { id: "event:work.job-lost:a", kind: "work.job-lost", named: ["worker"] },
  { id: "event:work.job-lost:b", kind: "work.job-lost", named: ["counted-1"] },
  {
    id: "event:organization.closed:c",
    kind: "organization.closed",
    named: ["owner"],
  },
  {
    id: "event:housing.eviction:d",
    kind: "housing.eviction",
    named: ["tenant", "child"],
  },
  { id: "event:housing.eviction:e", kind: "housing.eviction", named: [] },
];
const all = new Set(year.filter((e) => e.named.length).map((e) => e.id));

describe("which events had to be answered", () => {
  it("passes a year where every event that named someone was answered", () => {
    const report = occurrence(KINDS, year, all);
    expect(report.notExercised).toEqual([]);
    expect(report.unanswered).toEqual([]);
    expect(report.namedNoOne.map((e) => e.id)).toEqual([
      "event:housing.eviction:e",
    ]);
  });

  it("fails an occurring kind whose every response was lost, while another kind still answers", () => {
    // Every eviction response dropped; job losses and the closure still answered.
    const answered = new Set(
      [...all].filter((id) => !id.startsWith("event:housing.eviction")),
    );
    const report = occurrence(KINDS, year, answered);
    expect(report.notExercised).toEqual([]);
    expect(report.unanswered.map((e) => e.id)).toEqual([
      "event:housing.eviction:d",
    ]);
  });

  it("fails a lost closure path while job-loss responses remain", () => {
    const answered = new Set(
      [...all].filter((id) => !id.startsWith("event:organization.closed")),
    );
    expect(
      occurrence(KINDS, year, answered).unanswered.map((e) => e.id),
    ).toEqual(["event:organization.closed:c"]);
  });

  it("names a kind no producer emitted as not exercised", () => {
    const noEvictions = year.filter((e) => e.kind !== "housing.eviction");
    const report = occurrence(KINDS, noEvictions, all);
    expect(report.notExercised).toEqual(["housing.eviction"]);
    expect(report.unanswered).toEqual([]);
  });
});
