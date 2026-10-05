import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { createMindProvenance, recordGoalState } from "./mind";
import {
  CONNECTION_GOAL_KEY,
  LEARNING_GOAL_KEY,
  LIVELIHOOD_GOAL_DOMAIN,
  LIVELIHOOD_GOAL_KEY,
} from "./people-goal-pursuit-content";
import { ORDINARY_LIFE_GOAL_DOMAIN } from "./people-goal-pursuit";
import { recordWorldEvent } from "./world";
import type { EntityId, World } from "./types";

/** These choices use the existing job, contact and learning pursuit writers. */
export const CREATOR_LIFE_FORKS = [
  {
    key: "work",
    prompt: "When work opened up, what did you want?",
    goalKey: LIVELIHOOD_GOAL_KEY,
    domain: LIVELIHOOD_GOAL_DOMAIN,
    objective: "Find paid work",
    options: [
      {
        key: "pursue",
        label: "Look for a new job",
        description: "Pursue openings you qualify for.",
      },
      {
        key: "leave",
        label: "Keep the work I had",
        description: "Let changes in your circumstances lead to your next job.",
      },
    ],
  },
  {
    key: "connection",
    prompt: "How did you keep up with people?",
    goalKey: CONNECTION_GOAL_KEY,
    domain: ORDINARY_LIFE_GOAL_DOMAIN,
    objective: "Keep in touch with people",
    options: [
      {
        key: "pursue",
        label: "Make time to reach out",
        description: "Call people you know when you have time.",
      },
      {
        key: "leave",
        label: "Let people come to me",
        description: "Leave room for people to reach out to you.",
      },
    ],
  },
  {
    key: "learning",
    prompt: "What did you do when you wanted to learn something?",
    goalKey: LEARNING_GOAL_KEY,
    domain: ORDINARY_LIFE_GOAL_DOMAIN,
    objective: "Learn from people you know",
    options: [
      {
        key: "pursue",
        label: "Ask someone who knew",
        description: "Seek out people who can teach you.",
      },
      {
        key: "leave",
        label: "Learn as life came along",
        description: "Let your work and everyday life bring the lessons.",
      },
    ],
  },
] as const;

export interface CreatorLifeForkChoice {
  readonly forkKey: (typeof CREATOR_LIFE_FORKS)[number]["key"];
  readonly optionKey: "pursue" | "leave";
}

export function creatorLifeForkChoicesValid(
  input: unknown,
): input is readonly CreatorLifeForkChoice[] {
  if (!Array.isArray(input)) return false;
  const seen = new Set<string>();
  return input.every((choice) => {
    if (!choice || typeof choice !== "object" || seen.has(choice.forkKey))
      return false;
    seen.add(choice.forkKey);
    return CREATOR_LIFE_FORKS.some(
      (fork) =>
        fork.key === choice.forkKey &&
        fork.options.some((option) => option.key === choice.optionKey),
    );
  });
}

/** Write the player's choices once, then let ordinary resident decisions honor them. */
export function recordCreatorLifeForks(
  world: World,
  personId: EntityId,
  choices: readonly CreatorLifeForkChoice[],
): World {
  if (!creatorLifeForkChoicesValid(choices))
    throw new Error("Invalid life choices.");
  if (
    world.preStartLife?.personId !== personId &&
    !(world.control.kind === "person" && world.control.personId === personId)
  )
    throw new Error("Life choices belong to the character being created.");
  let next = world;
  for (const fork of CREATOR_LIFE_FORKS) {
    const choice = choices.find((entry) => entry.forkKey === fork.key);
    if (!choice) continue;
    const selected = fork.options.find(
      (option) => option.key === choice.optionKey,
    )!;
    const key = `creator-life:${personId}:${fork.key}`;
    if (next.history.events.some((event) => event.stableKey === key)) continue;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: "life.creator-choice",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId],
      participants: [
        { personId, role: "agency:actor", detail: selected.label },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["life.creator-choice", fork.key],
      summary: selected.label,
      context: {
        location: null,
        socialContext: null,
        pressure: fork.prompt,
        choice: selected.label,
        motivation: selected.description,
        immediateReaction: null,
      },
    });
    const sourceRefs = [
      {
        kind: "historical-event" as const,
        eventId: next.history.events.at(-1)!.id,
      },
    ];
    const evaluation = evaluateDecision(next, {
      stableKey: key,
      decisionType: "people.creator-life-fork",
      actorPersonId: personId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: { kind: "context:life", key: fork.key, entityId: null },
      options: fork.options,
      constraints: [],
      considerations: [
        {
          stableKey: `${key}:choice`,
          optionKey: selected.key,
          sourceType: "context:creator-choice",
          direction: "supports",
          importance: "decisive",
          confidence: "high",
          explanation: selected.description,
          sourceRefs,
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    if (!isSelectedDecision(evaluation))
      throw new Error("The life choice did not resolve.");
    next = recordDurableDecisionTrace(next, evaluation);
    const prior = next.history.goalStates
      .filter(
        (goal) => goal.personId === personId && goal.goalKey === fork.goalKey,
      )
      .at(-1);
    next = recordGoalState(next, {
      stableKey: `${key}:goal`,
      personId,
      goalKey: fork.goalKey,
      recordedAt: next.currentDate,
      objective: fork.objective,
      domain: fork.domain,
      scope: "personal",
      priority: "high",
      status: evaluation.selectedOptionKey === "pursue" ? "active" : "proposed",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      replacesGoalId: null,
      supersedesGoalStateId: prior?.id ?? null,
      provenance: createMindProvenance("player-choice", {
        note: selected.label,
        sourceRefs,
      }),
    });
  }
  return next;
}
