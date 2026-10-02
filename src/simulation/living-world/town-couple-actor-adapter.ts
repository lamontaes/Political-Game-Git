import { romanticConsiderations } from "../couples";
import {
  coupleStageConsent,
  coupleStageOptions,
} from "../couple-stage-contract";
import type { CoupleStage } from "../couple-stage-data";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { recordsByKey } from "../history-index";
import type { DecisionEvaluation, EntityId, IsoDate, World } from "../types";

/** One actor evaluator, with the same saved romantic evidence for each actor.
 * Additional stage circumstances must enter as actual source-backed evidence;
 * missing housing, value, child or duration evidence is not a preference. */
export function evaluateTownCoupleActors(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personIds: readonly [EntityId, EntityId];
    readonly stage: CoupleStage;
    readonly startedAt: IsoDate | null;
    readonly retention?: "ephemeral" | "durable";
  },
) {
  const options = coupleStageOptions(
    input.stage,
    input.startedAt,
    world.currentDate,
  );
  const ending = input.stage === "dating" ? "break-up" : "separate";
  let next = world;
  const evaluate = (
    actorPersonId: EntityId,
    otherPersonId: EntityId,
  ): DecisionEvaluation => {
    const stableKey = `${input.stableKey}:${actorPersonId}`;
    if (input.retention === "durable") {
      const previous = recordsByKey(
        next.history.decisionTraces,
        "town-couple-stage:actor-stable-key",
        (row) => [row.context.stableKey],
        stableKey,
      ).find(
        (row) =>
          row.context.actorPersonId === actorPersonId &&
          row.recordedAt <= next.currentDate,
      );
      if (previous)
        return {
          decisionId: previous.decisionId,
          context: previous.context,
          optionEvaluations: previous.optionEvaluations,
          outcomeKind: previous.outcomeKind,
          selectedOptionKey: previous.selectedOptionKey,
          sourceSnapshots: previous.sourceSnapshots,
          rngVersion: previous.rngVersion,
        };
    }
    const result = evaluateDecision(next, {
      stableKey,
      decisionType: "people.couple-stage",
      actorPersonId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: { kind: "context:life", key: "couple-stage", entityId: null },
      options,
      constraints: [],
      considerations: romanticConsiderations(
        next,
        input.stableKey,
        actorPersonId,
        otherPersonId,
      ).map((consideration) => ({
        ...consideration,
        optionKey: consideration.optionKey === "accept" ? "stay" : ending,
      })),
      perceptionIds: [],
      randomness: "none",
      retention: input.retention ?? "ephemeral",
    });
    if (input.retention === "durable")
      next = recordDurableDecisionTrace(next, result);
    return result;
  };
  const first = evaluate(input.personIds[0], input.personIds[1]);
  const second = evaluate(input.personIds[1], input.personIds[0]);
  return {
    world: next,
    first,
    second,
    admittedOptions: options.filter((option) =>
      coupleStageConsent({
        stage: input.stage,
        startedAt: input.startedAt,
        asOfDate: world.currentDate,
        optionKey: option.key,
        first,
        second,
      }),
    ),
  };
}

/** Candidates are supplied from the review's eligibility guards; acquaintance
 * and desire must still have saved support. The shared evaluator owns ranking
 * and ties, including the disclosed A124 regression. */
export function evaluateTownDateProposal(
  world: World,
  stableKey: string,
  askerId: EntityId,
  candidates: readonly EntityId[],
): EntityId | null {
  const known = new Set(
    world.history.relationshipInteractions
      .filter(
        (row) =>
          row.occurredAt <= world.currentDate &&
          row.personIds.includes(askerId),
      )
      .flatMap((row) => row.personIds),
  );
  const eligible = candidates.filter(
    (id) => id !== askerId && known.has(id) && world.people[id],
  );
  const evidence = eligible.map((id) => ({
    id,
    considerations: romanticConsiderations(
      world,
      `${stableKey}:${id}`,
      askerId,
      id,
    ),
  }));
  const supported = evidence.filter((row) =>
    row.considerations.some(
      (c) =>
        c.optionKey === "accept" &&
        c.direction === "supports" &&
        c.sourceRefs.length > 0,
    ),
  );
  if (supported.length === 0) return null;
  const evaluation = evaluateDecision(world, {
    stableKey: `${stableKey}:ask`,
    decisionType: "people.date-proposal",
    actorPersonId: askerId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "date-proposal", entityId: null },
    options: [
      {
        key: "stay-single",
        label: "Do not ask",
        description: "Make no proposal.",
      },
      ...supported.map((row) => ({
        key: `date:${row.id}`,
        label: "Ask this person out",
        description: "Propose a first date to this recorded acquaintance.",
      })),
    ],
    constraints: [],
    considerations: supported.flatMap((row) =>
      row.considerations.map((c) => ({
        ...c,
        optionKey: `date:${row.id}`,
        direction:
          c.optionKey === "accept"
            ? c.direction
            : c.direction === "supports"
              ? ("opposes" as const)
              : ("supports" as const),
      })),
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  if (!isSelectedDecision(evaluation)) return null;
  const recipient = supported.find(
    (row) => `date:${row.id}` === evaluation.selectedOptionKey,
  )?.id;
  if (!recipient) return null;
  const considerations = romanticConsiderations(
    world,
    `${stableKey}:answer`,
    recipient,
    askerId,
  );
  if (considerations.length === 0) return null;
  const answer = evaluateDecision(world, {
    stableKey: `${stableKey}:answer`,
    decisionType: "people.date-answer",
    actorPersonId: recipient,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "date-proposal", entityId: null },
    options: [
      { key: "accept", label: "Accept the date", description: "Go on a date." },
      {
        key: "decline",
        label: "Decline the date",
        description: "Do not go on a date.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return isSelectedDecision(answer) && answer.selectedOptionKey === "accept"
    ? recipient
    : null;
}
