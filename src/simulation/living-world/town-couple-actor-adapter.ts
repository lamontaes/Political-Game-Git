import { romanticConsiderations } from "../couples";
import {
  coupleStageConsent,
  coupleStageOptions,
} from "../couple-stage-contract";
import type { CoupleStage } from "../couple-stage-data";
import { evaluateDecision } from "../decisions";
import type { EntityId, IsoDate, World } from "../types";

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
  },
) {
  const options = coupleStageOptions(
    input.stage,
    input.startedAt,
    world.currentDate,
  );
  const ending = input.stage === "dating" ? "break-up" : "separate";
  const evaluate = (actorPersonId: EntityId, otherPersonId: EntityId) =>
    evaluateDecision(world, {
      stableKey: `${input.stableKey}:${actorPersonId}`,
      decisionType: "people.couple-stage",
      actorPersonId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      subject: { kind: "context:life", key: "couple-stage", entityId: null },
      options,
      constraints: [],
      considerations: romanticConsiderations(
        world,
        input.stableKey,
        actorPersonId,
        otherPersonId,
      ).map((consideration) => ({
        ...consideration,
        optionKey: consideration.optionKey === "accept" ? "stay" : ending,
      })),
      perceptionIds: [],
      randomness: "none",
      retention: "ephemeral",
    });
  const first = evaluate(input.personIds[0], input.personIds[1]);
  const second = evaluate(input.personIds[1], input.personIds[0]);
  return {
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
