import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { DecisionEvaluation, HistoricalEvent } from "../types";
import { courtSituationFor } from "./court-situations";

const event = (overrides: Partial<HistoricalEvent> = {}): HistoricalEvent =>
  ({
    id: "event-case" as HistoricalEvent["id"],
    stableKey: "case:123",
    sequence: 1,
    type: "court.test-case",
    occurredAt: makeIsoDate("2026-01-01"),
    recordedAt: makeIsoDate("2026-01-01"),
    jurisdictionId: null,
    involvedEntityIds: [],
    participants: [
      {
        personId:
          "person-defendant" as HistoricalEvent["involvedEntityIds"][number],
        role: "focus:defendant",
        detail: "named in the charge",
      },
      {
        personId:
          "person-counsel" as HistoricalEvent["involvedEntityIds"][number],
        role: "defense:counsel",
        detail: "recorded appearance",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "The saved charge names a defendant.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    ...overrides,
  }) as HistoricalEvent;

const decision = (): DecisionEvaluation =>
  ({
    decisionId: "decision-1",
    context: {
      options: [
        {
          key: "release",
          label: "Release",
          description: "Release before trial.",
        },
        { key: "hold", label: "Hold", description: "Hold before trial." },
      ],
      considerations: [
        {
          stableKey: "release:law",
          optionKey: "release",
          direction: "supports",
          explanation: "The law presumes release.",
        },
      ],
    },
    optionEvaluations: [
      { optionKey: "release", available: true },
      { optionKey: "hold", available: false },
    ],
  }) as unknown as DecisionEvaluation;

describe("courtroom situation adapter", () => {
  it("carries recorded parties, actual counsel, pending matters, legal bounds, and existing choices", () => {
    const record = event();
    const result = courtSituationFor({
      caseRecord: record,
      lawBound: "The law requires at least 24 months in custody.",
      pendingMatters: ["Sentence remains pending."],
      decisions: [decision()],
    });

    expect(result.caseRecord).toBe(record);
    expect(
      result.parties.map(({ personId, role }) => ({ personId, role })),
    ).toEqual([
      { personId: "person-defendant", role: "focus:defendant" },
      { personId: "person-counsel", role: "defense:counsel" },
    ]);
    expect(result.counsel).toHaveLength(1);
    expect(result.lawBound).toBe(
      "The law requires at least 24 months in custody.",
    );
    expect(result.pendingMatters).toEqual(["Sentence remains pending."]);
    expect(result.choices).toEqual([
      {
        decisionId: "decision-1",
        key: "release",
        label: "Release",
        description: "Release before trial.",
        available: true,
        reasons: ["The law presumes release."],
      },
      {
        decisionId: "decision-1",
        key: "hold",
        label: "Hold",
        description: "Hold before trial.",
        available: false,
        reasons: [],
      },
    ]);
  });

  it("does not infer counsel from law or an empty record", () => {
    const result = courtSituationFor({
      caseRecord: event({ participants: [] }),
    });
    expect(result.parties).toEqual([]);
    expect(result.counsel).toEqual([]);
    expect(result.lawBound).toBeNull();
    expect(result.pendingMatters).toEqual([]);
    expect(result.choices).toEqual([]);
  });
});
