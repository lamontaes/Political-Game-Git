import { favorStandingBetween } from "../favors";
import { evaluateDecision } from "../decisions";
import { currentHistoricalCutoff } from "../queries";
import { ensurePeopleTraits, traitConsiderations } from "../people-traits";
import { eventById } from "../event-index";
import type { DecisionEvaluation, EntityId, World } from "../types";

export type MisconductKnowerOccasion =
  | "record-reviewed"
  | "fired"
  | "cut-out"
  | "wronged"
  | "charged"
  | "questioned";

export interface MisconductKnowerDecisionInput {
  readonly stableKey: string;
  readonly knowerPersonId: EntityId;
  readonly actorPersonId: EntityId;
  readonly occurrenceId: EntityId;
  readonly occurrenceEventId: EntityId;
  readonly occasion: MisconductKnowerOccasion;
  readonly occasionEventId: EntityId;
}

/** The knower's own reasons, saved by the caller before any disclosure route. */
export function evaluateMisconductKnowerDecision(
  world: World,
  input: MisconductKnowerDecisionInput,
): { readonly world: World; readonly evaluation: DecisionEvaluation } {
  const occasionEvent = eventById(world, input.occasionEventId);
  if (!occasionEvent)
    throw new Error("A knower decision needs its cause event.");
  if (
    !occasionEvent.participants.some(
      (participant) => participant.personId === input.knowerPersonId,
    )
  ) {
    throw new Error("The knower decision cause must involve the knower.");
  }
  const occurrenceEvent = eventById(world, input.occurrenceEventId);
  if (!occurrenceEvent)
    throw new Error("A knower decision needs the act event.");
  if (
    !world.people[input.knowerPersonId] ||
    !world.people[input.actorPersonId]
  ) {
    throw new Error("A knower decision names a missing person.");
  }
  const prepared = ensurePeopleTraits(world, [input.knowerPersonId]);
  const relationshipToActor = favorStandingBetween(
    prepared,
    input.knowerPersonId,
    input.actorPersonId,
  );
  const relationshipFromActor = favorStandingBetween(
    prepared,
    input.actorPersonId,
    input.knowerPersonId,
  );
  const grievance = input.occasion !== "record-reviewed";
  const considerations = [
    ...(grievance
      ? [
          {
            stableKey: `${input.stableKey}:grievance`,
            optionKey: "talk",
            sourceType: "context:grievance" as const,
            direction: "supports" as const,
            importance: "decisive" as const,
            confidence: "high" as const,
            explanation:
              "They were directly wronged in a way that bears on this act.",
            sourceRefs: [
              {
                kind: "historical-event" as const,
                eventId: input.occasionEventId,
              },
            ],
          },
        ]
      : []),
    ...(relationshipToActor.receiverDebt === "none"
      ? []
      : [
          {
            stableKey: `${input.stableKey}:owes-actor`,
            optionKey: "stay-quiet",
            sourceType: "context:relationship" as const,
            direction: "supports" as const,
            importance: "slight" as const,
            confidence: "medium" as const,
            explanation: "They have a personal obligation to the official.",
            sourceRefs: [],
          },
        ]),
    ...(relationshipFromActor.receiverDebt === "none"
      ? []
      : [
          {
            stableKey: `${input.stableKey}:actor-owes-knower`,
            optionKey: "talk",
            sourceType: "context:relationship" as const,
            direction: "supports" as const,
            importance: "slight" as const,
            confidence: "medium" as const,
            explanation: "The official has an outstanding obligation to them.",
            sourceRefs: [],
          },
        ]),
    ...traitConsiderations(prepared, input.knowerPersonId, input.stableKey, [
      {
        trait: "conflict",
        pole: "high",
        optionKey: "talk",
        explanation: "They press a dispute instead of smoothing it over.",
      },
      {
        trait: "conflict",
        pole: "low",
        optionKey: "stay-quiet",
        explanation: "They avoid pressing a dispute.",
      },
      {
        trait: "sociability",
        pole: "high",
        optionKey: "talk",
        explanation: "They are willing to bring the matter to other people.",
      },
      {
        trait: "risk",
        pole: "high",
        optionKey: "talk",
        explanation: "They are willing to risk becoming involved.",
      },
      {
        trait: "risk",
        pole: "low",
        optionKey: "stay-quiet",
        explanation: "They avoid the risk of becoming involved.",
      },
    ]),
    ...(occurrenceEvent.participants.some(
      (participant) => participant.personId === input.knowerPersonId,
    )
      ? [
          {
            stableKey: `${input.stableKey}:own-exposure`,
            optionKey: "stay-quiet",
            sourceType: "context:own-exposure" as const,
            direction: "supports" as const,
            importance: "moderate" as const,
            confidence: "high" as const,
            explanation: "Speaking would expose their own part in the act.",
            sourceRefs: [
              {
                kind: "historical-event" as const,
                eventId: input.occurrenceEventId,
              },
            ],
          },
        ]
      : []),
  ];
  const evaluation = evaluateDecision(prepared, {
    stableKey: `${input.stableKey}:decision`,
    decisionType: "press.misconduct-knower-disclosure",
    actorPersonId: input.knowerPersonId,
    cutoff: currentHistoricalCutoff(prepared),
    subject: {
      kind: "context:financial-occurrence",
      key: input.occurrenceId,
      entityId: input.occasionEventId,
    },
    options: [
      {
        key: "talk",
        label: "Tell someone what happened",
        description: "Share what they know about the recorded act.",
      },
      {
        key: "stay-quiet",
        label: "Keep it to themselves",
        description: "Say nothing about the recorded act.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  return { world: prepared, evaluation };
}
