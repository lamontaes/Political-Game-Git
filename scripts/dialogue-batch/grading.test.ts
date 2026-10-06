import { describe, expect, it } from "vitest";

import {
  addToLedger,
  binRule,
  gradingBatchId,
  toGradingBatch,
} from "./grading";
import type { BatchLine, BatchResult } from "./run";

function line(overrides: Partial<BatchLine>): BatchLine {
  return {
    id: "told-plan-first-listener",
    axis: "relationship",
    composer: "tellAnswer in life-talk-topics.ts",
    situation: "harness text",
    speaker: {
      name: "Julia Baker",
      age: 45,
      relation: "your mom",
      isPlayer: false,
      traits: { "expression:ask": "subtle" },
      observed: [],
    },
    line: "Yeah? Learn what?",
    parts: ["life-reply.tell-plain-plan:core:core"],
    world: {
      place: "Hammond, Wisconsin",
      player: "Piper Baker",
      playerAge: 17,
      date: "2026-01-05",
    },
    harness: [],
    prior: "Tell them you want to make time to learn something",
    ...overrides,
  };
}

describe("the grading page's batch file", () => {
  it("writes the binding shape and bins developer words", () => {
    const result = {
      seed: "s",
      worlds: [{ index: 0, place: "Hammond, Wisconsin" }],
      lines: [
        line({}),
        line({
          id: "press-reporter-question",
          line: "Jefferson County is governed by County board, under a disclosed fictional game profile.",
          speaker: { ...line({}).speaker, relation: null },
        }),
      ],
      skipped: [],
      stats: [],
    } as unknown as BatchResult;
    const at = new Date("2026-10-06T22:00:00Z");
    const { batch, bin } = toGradingBatch(result, {
      id: gradingBatchId(at),
      head: "abc",
      at,
    });
    expect(batch.id).toMatch(/^[A-Za-z0-9-]+$/);
    expect(batch).toMatchObject({ status: "open", head: "abc" });
    expect(batch.items).toHaveLength(1);
    expect(batch.items[0]).toMatchObject({
      i: 0,
      prior: "You: Tell them you want to make time to learn something",
      reply: "Your mom: Yeah? Learn what?",
      kind: "conversation",
      cell: { register: "family", kind: "tell-plan", relationship: "family" },
    });
    expect(batch.items[0]!.situation).not.toMatch(/record|harness|authored/);
    expect(bin).toHaveLength(1);
    expect(bin[0]!.rule).toContain("developer words");
    expect(addToLedger({ byKind: {}, cells: {} }, batch).byKind).toEqual({
      conversation: 1,
    });
    expect(binRule("Okay. What game?")).toBeNull();
    expect(binRule("It was press.answer-unknown again.")).toBe("program key");
    expect(binRule("My mother-in-law says hi.")).toBeNull();
    expect(binRule("We talked school_raise.")).toBe("program key");
    expect(batch.items[0]!.situation).toContain("January 5, 2026");
    expect(
      binRule(
        "$750,000 may be committed for crisis-response:us-ak from 2025-07-01.",
      ),
    ).toBe("raw record key");
  });
});
