import {
  compareDecisionOptionScores,
  decisionConsiderationScore,
} from "./decision-scores";
import { recordsByKey } from "./history-index";
import { spreadOf } from "./sample-spread";
import type {
  DecisionContext,
  DecisionPeerEstimate,
  DecisionPeerSample,
  DecisionTraceRecord,
  EntityId,
  World,
} from "./types";

export type { DecisionPeerEstimate, DecisionPeerSample } from "./types";

const peerGroupKey = (context: DecisionContext): string =>
  JSON.stringify([context.decisionType, context.subject.kind]);
const peerGroupKeys = (trace: DecisionTraceRecord): readonly string[] => [
  peerGroupKey(trace.context),
];

/** Read-only estimator input, never an actor-owned mind source or a selector.
 * Comparable peers last considered the same decision type, subject kind and
 * exact option meanings. Each person contributes one visible, unforced trace.
 * An empty query is a missing donor pool, not an observed zero preference. */
export function currentGameDecisionPeerEstimates(
  world: Pick<World, "people" | "history">,
  context: DecisionContext,
): readonly DecisionPeerEstimate[] {
  const latest = new Map<EntityId, DecisionTraceRecord>();
  const comparableTraces = recordsByKey(
    world.history.decisionTraces,
    "decision-peer-estimates:type-and-subject",
    peerGroupKeys,
    peerGroupKey(context),
  );
  for (const trace of comparableTraces) {
    if (
      trace.context.actorPersonId === context.actorPersonId ||
      !world.people[trace.context.actorPersonId] ||
      trace.context.decisionType !== context.decisionType ||
      trace.context.subject.kind !== context.subject.kind ||
      trace.recordedAt > context.cutoff.asOfDate ||
      trace.sequence >= context.cutoff.historySequenceExclusive
    ) {
      continue;
    }
    const previous = latest.get(trace.context.actorPersonId);
    if (!previous || trace.sequence > previous.sequence) {
      latest.set(trace.context.actorPersonId, trace);
    }
  }

  const peers = [...latest.values()].filter(
    (trace) =>
      trace.context.constraints.length === 0 &&
      trace.context.considerations.length > 0 &&
      sameOptionMeanings(context, trace.context),
  );
  if (peers.length === 0) return [];

  return context.options.map((option) => {
    const samples = peers.map((trace): DecisionPeerSample => ({
      personId: trace.context.actorPersonId,
      decisionTraceId: trace.id,
      sequence: trace.sequence,
      recordedAt: trace.recordedAt,
      value: trace.context.considerations
        .filter((consideration) => consideration.optionKey === option.key)
        .reduce(
          (total, consideration) =>
            total + decisionConsiderationScore(consideration),
          0,
        ),
    }));
    if (samples.some((sample) => !Number.isFinite(sample.value))) {
      throw new Error(
        "A saved decision peer has an invalid consideration score.",
      );
    }
    return {
      ...spreadOf(samples.map((sample) => sample.value)),
      label: "ESTIMATED: averaged from this game's similar decision makers",
      decisionType: context.decisionType,
      subjectKind: context.subject.kind,
      optionKey: option.key,
      cutoff: { ...context.cutoff },
      samples,
    };
  });
}

function sameOptionMeanings(
  left: DecisionContext,
  right: DecisionContext,
): boolean {
  return (
    left.options.length === right.options.length &&
    left.options.every((option) =>
      right.options.some(
        (peerOption) =>
          peerOption.key === option.key &&
          peerOption.label === option.label &&
          peerOption.description === option.description,
      ),
    )
  );
}

/** Saved estimates must reproduce their complete dated donor cohort exactly. */
export function validateDecisionPeerEstimates(
  world: Pick<World, "people" | "history">,
  context: DecisionContext,
): void {
  if (context.peerEstimates === undefined) return;
  const ownContext = { ...context, peerEstimates: undefined };
  const available = context.options.filter(
    (option) =>
      !context.constraints.some(
        (constraint) => constraint.optionKey === option.key,
      ),
  );
  const leaders = available.filter(
    (option) =>
      !available.some(
        (other) =>
          compareDecisionOptionScores(ownContext, other.key, option.key) > 0,
      ),
  );
  const lastOwnTrace = [...world.history.decisionTraces]
    .reverse()
    .find(
      (trace) =>
        trace.context.actorPersonId === context.actorPersonId &&
        trace.context.decisionType === context.decisionType &&
        trace.recordedAt <= context.cutoff.asOfDate &&
        trace.sequence < context.cutoff.historySequenceExclusive,
    );
  if (
    leaders.length < 2 ||
    (lastOwnTrace?.outcomeKind === "selected" &&
      leaders.some((option) => option.key === lastOwnTrace.selectedOptionKey))
  ) {
    throw new Error(
      "Decision peer estimates cannot replace a recorded actor preference.",
    );
  }
  const expected = currentGameDecisionPeerEstimates(world, context);
  if (
    expected.length === 0 ||
    JSON.stringify(context.peerEstimates) !== JSON.stringify(expected)
  ) {
    throw new Error(
      "Decision peer estimates do not match the saved game cohort.",
    );
  }
}
