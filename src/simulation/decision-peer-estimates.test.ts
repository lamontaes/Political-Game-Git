import { describe, expect, it } from "vitest";
import {
  currentGameDecisionPeerEstimates,
  validateDecisionPeerEstimates,
} from "./decision-peer-estimates";
import { compareDecisionOptionScores } from "./decision-scores";
import type {
  DecisionConsideration,
  DecisionContext,
  DecisionTraceRecord,
  EntityId,
  IsoDate,
  World,
} from "./types";

const actor = "fixture:actor" as EntityId;
const first = "fixture:first" as EntityId;
const second = "fixture:second" as EntityId;
const date = "2026-10-02" as IsoDate;
function context(personId: EntityId = actor): DecisionContext {
  return {
    stableKey: `fixture:decision:${personId}`,
    decisionType: "fixture:choice",
    actorPersonId: personId,
    cutoff: { asOfDate: date, historySequenceExclusive: 20 },
    subject: { kind: "context:life", key: "fixture:purpose", entityId: null },
    options: [
      {
        key: "act",
        label: "Act",
        description: "Carry out the recorded purpose.",
      },
      { key: "wait", label: "Wait", description: "Leave the purpose pending." },
    ],
    constraints: [],
    considerations: [],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  };
}
function reason(
  optionKey: string,
  importance: DecisionConsideration["importance"] = "slight",
  direction: DecisionConsideration["direction"] = "supports",
): DecisionConsideration {
  return {
    stableKey: `fixture:reason:${optionKey}`,
    optionKey,
    sourceType: "context:purpose",
    importance,
    direction,
    confidence: "low",
    explanation: "Authored saved-query sample; not a gameplay writer proof.",
    sourceRefs: [],
  };
}
function trace(
  personId: EntityId,
  sequence: number,
  considerations = [reason("act")],
): DecisionTraceRecord {
  return {
    id: `fixture:trace:${personId}:${sequence}` as EntityId,
    stableKey: `fixture:trace:${personId}:${sequence}`,
    sequence,
    recordedAt: date,
    decisionId: `fixture:decision:${personId}:${sequence}` as EntityId,
    context: { ...context(personId), considerations },
    optionEvaluations: [],
    outcomeKind: "selected",
    selectedOptionKey: "act",
    sourceSnapshots: [],
    rngVersion: "decision-rng-v1",
  };
}
function saved(
  traces: readonly DecisionTraceRecord[],
  people = [actor, first, second],
): Pick<World, "people" | "history"> {
  // The pure query reads only person existence and decisionTraces. This deliberately
  // does not claim these narrow authored records passed full World integrity.
  return {
    people: Object.fromEntries(people.map((id) => [id, {}])),
    history: { decisionTraces: traces },
  } as unknown as Pick<World, "people" | "history">;
}
describe("saved current-game peer estimate query", () => {
  it("admits exact fractional numeric metadata without rounding a weight", () => {
    const world = saved([
      trace(first, 1, [reason("act", "slight")]),
      trace(second, 2, [reason("act", "moderate")]),
    ]);
    const input = context();
    const withPeers = {
      ...input,
      peerEstimates: currentGameDecisionPeerEstimates(world, input),
    };
    expect(withPeers.peerEstimates[0]).toMatchObject({
      mean: 1.5,
      standardDeviation: 0.5,
      count: 2,
    });
    expect(() => validateDecisionPeerEstimates(world, withPeers)).not.toThrow();
    expect(compareDecisionOptionScores(withPeers, "act", "wait")).toBe(1.5);
  });
  it("compares equal means as an exact tie without a key preference", () => {
    const world = saved([
      trace(first, 1, [reason("act")]),
      trace(second, 2, [reason("wait")]),
    ]);
    const input = context();
    const withPeers = {
      ...input,
      peerEstimates: currentGameDecisionPeerEstimates(world, input),
    };
    expect(compareDecisionOptionScores(withPeers, "act", "wait")).toBe(0);
    expect(compareDecisionOptionScores(withPeers, "wait", "act")).toBe(0);
  });
  it("rejects fabricated numeric or omitted-donor metadata", () => {
    const world = saved([trace(first, 1), trace(second, 2)]);
    const input = context();
    const expected = currentGameDecisionPeerEstimates(world, input);
    for (const changed of [
      expected.map((row) => ({ ...row, mean: row.mean + 0.25 })),
      expected.map((row) => ({ ...row, count: row.count + 1 })),
      expected.map((row) => ({ ...row, samples: row.samples.slice(1) })),
    ])
      expect(() =>
        validateDecisionPeerEstimates(world, {
          ...input,
          peerEstimates: changed,
        }),
      ).toThrow("saved game cohort");
  });
  it("rejects peer replacement of a separated actor reason or sole available option", () => {
    const world = saved([trace(first, 1)]);
    const input = context();
    const estimates = currentGameDecisionPeerEstimates(world, input);
    expect(() =>
      validateDecisionPeerEstimates(world, {
        ...input,
        peerEstimates: estimates,
        considerations: [reason("wait")],
      }),
    ).toThrow("recorded actor preference");
    expect(() =>
      validateDecisionPeerEstimates(world, {
        ...input,
        peerEstimates: estimates,
        constraints: [
          {
            stableKey: "fixture:blocked",
            optionKey: "wait",
            kind: "context:unavailable",
            explanation: "Saved unavailability",
            sourceRefs: [],
          },
        ],
      }),
    ).toThrow("recorded actor preference");
  });
  it("rejects peer replacement of equal recorded actor reasons", () => {
    const world = saved([trace(first, 1)]);
    const input = context();
    expect(() =>
      validateDecisionPeerEstimates(world, {
        ...input,
        peerEstimates: currentGameDecisionPeerEstimates(world, input),
        considerations: [reason("act"), reason("wait")],
      }),
    ).toThrow("recorded actor preference");
  });
  it("rejects peer replacement of the actor's latest eligible saved choice", () => {
    const world = saved([trace(first, 1), trace(actor, 2)]);
    const input = context();
    expect(() =>
      validateDecisionPeerEstimates(world, {
        ...input,
        peerEstimates: currentGameDecisionPeerEstimates(world, input),
      }),
    ).toThrow("recorded actor preference");
  });
  it("computes mean and population spread from signed consideration scores", () => {
    const world = saved([
      trace(first, 1, [reason("act", "slight")]),
      trace(second, 2, [reason("act", "strong")]),
    ]);
    const before = JSON.stringify(world);
    const estimates = currentGameDecisionPeerEstimates(world, context());
    expect(estimates[0]).toMatchObject({
      optionKey: "act",
      mean: 2.5,
      standardDeviation: 1.5,
      count: 2,
    });
    expect(estimates[0]!.samples.map((sample) => sample.value)).toEqual([1, 4]);
    expect(estimates[1]).toMatchObject({
      optionKey: "wait",
      mean: 0,
      count: 2,
    });
    expect(JSON.stringify(world)).toBe(before);
    const opposed = currentGameDecisionPeerEstimates(
      saved([trace(first, 1, [reason("act", "moderate", "opposes")])]),
      context(),
    );
    expect(opposed[0]!.mean).toBe(-2);
  });
  it("samples only the latest visible trace once per peer", () => {
    const latest = trace(first, 5, [reason("act", "strong")]);
    const estimates = currentGameDecisionPeerEstimates(
      saved([latest, trace(first, 1), latest]),
      context(),
    );
    expect(estimates[0]).toMatchObject({ mean: 4, count: 1 });
    expect(estimates[0]!.samples[0]!.decisionTraceId).toBe(latest.id);
  });
  it("honors both date and exclusive sequence cutoffs", () => {
    const future = { ...trace(first, 9), recordedAt: "2026-10-03" as IsoDate };
    const estimates = currentGameDecisionPeerEstimates(
      saved([trace(first, 1), future, trace(second, 20)]),
      context(),
    );
    expect(estimates[0]!.samples.map((sample) => sample.sequence)).toEqual([1]);
  });
  it("excludes the actor, missing people and forced traces", () => {
    const peer = trace(second, 2);
    const forced = {
      ...peer,
      context: {
        ...peer.context,
        constraints: [
          {
            stableKey: "fixture:block",
            optionKey: "wait",
            kind: "fixture:availability",
            explanation: "Forced sample is excluded.",
            sourceRefs: [],
          },
        ],
      },
    };
    const missing = trace("fixture:missing" as EntityId, 3);
    expect(
      currentGameDecisionPeerEstimates(
        saved([trace(actor, 1), missing, forced]),
        context(),
      ),
    ).toEqual([]);
  });
  it("does not fall back to an older sample after the latest trace is forced", () => {
    const forced = trace(first, 2);
    const updated = {
      ...forced,
      context: {
        ...forced.context,
        constraints: [
          {
            stableKey: "fixture:block",
            optionKey: "wait",
            kind: "fixture:availability",
            explanation: "Latest record is forced.",
            sourceRefs: [],
          },
        ],
      },
    };
    expect(
      currentGameDecisionPeerEstimates(
        saved([trace(first, 1), updated]),
        context(),
      ),
    ).toEqual([]);
  });
  it("matches option meanings independently of their order", () => {
    const peer = trace(first, 1);
    const reversed = {
      ...peer,
      context: {
        ...peer.context,
        options: [...peer.context.options].reverse(),
      },
    };
    const estimates = currentGameDecisionPeerEstimates(
      saved([reversed]),
      context(),
    );
    expect(
      estimates.map((estimate) => [estimate.optionKey, estimate.mean]),
    ).toEqual([
      ["act", 1],
      ["wait", 0],
    ]);
  });
  it("excludes changed labels, descriptions, decision types and subject kinds", () => {
    for (const change of [
      {
        options: context().options.map((option) => ({
          ...option,
          label: `${option.label} changed`,
        })),
      },
      {
        options: context().options.map((option) => ({
          ...option,
          description: `${option.description} changed`,
        })),
      },
      { decisionType: "fixture:other" },
      {
        subject: {
          kind: "entity:event" as const,
          key: "fixture:event",
          entityId: null,
        },
      },
    ]) {
      const peer = trace(first, 1);
      expect(
        currentGameDecisionPeerEstimates(
          saved([{ ...peer, context: { ...peer.context, ...change } }]),
          context(),
        ),
      ).toEqual([]);
    }
  });
  it("returns a missing pool rather than fabricated zero estimates", () => {
    expect(currentGameDecisionPeerEstimates(saved([]), context())).toEqual([]);
    expect(
      currentGameDecisionPeerEstimates(saved([trace(first, 1, [])]), context()),
    ).toEqual([]);
  });
  it("keeps equal sampled preferences tied without selecting an option", () => {
    const estimates = currentGameDecisionPeerEstimates(
      saved([
        trace(first, 1, [reason("act"), reason("wait")]),
        trace(second, 2, [reason("act"), reason("wait")]),
      ]),
      context(),
    );
    expect(
      estimates.map((estimate) => [
        estimate.mean,
        estimate.standardDeviation,
        estimate.count,
      ]),
    ).toEqual([
      [1, 0, 2],
      [1, 0, 2],
    ]);
    expect(
      estimates.every((estimate) => !("selectedOptionKey" in estimate)),
    ).toBe(true);
  });
});
