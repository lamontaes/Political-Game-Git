import { LIFE_MIND_CONTENT_VERSION, LIFE_MIND_IDS } from "./life-mind-content";
import {
  createMindProvenance,
  recordPersonalValue,
  recordPersonalityTendency,
  recordGoalState,
  createDevelopmentProposal,
} from "./mind";
import { latestPersonalityTendency } from "./queries";
import { SeededRng } from "./rng";
import type { EntityId, World } from "./types";

/** Generation-time preferences use an independent stream, never demographic inputs. */
export function establishLifePersonality(
  world: World,
  personId: EntityId,
  generation: { readonly seed: string; readonly key: string } = {
    seed: world.seed,
    key: personId,
  },
): World {
  if (latestPersonalityTendency(world, personId, LIFE_MIND_IDS.conversation))
    return world;
  const rng = new SeededRng(generation.seed).fork(
    `${LIFE_MIND_CONTENT_VERSION}:${generation.key}`,
  );
  const provenance = createMindProvenance("authored", {
    note: `${LIFE_MIND_CONTENT_VERSION}: fictional ordinary-life preferences; no empirical or demographic inference.`,
  });
  let next = world;
  for (const [tendencyId, expressions] of [
    [LIFE_MIND_IDS.conversation, ["ask", "listen", "direct"]],
    [LIFE_MIND_IDS.leisure, ["familiar", "explore", "company"]],
  ] as const) {
    next = recordPersonalityTendency(next, {
      stableKey: `${LIFE_MIND_CONTENT_VERSION}:${personId}:${tendencyId}`,
      personId,
      tendencyId,
      recordedAt: next.currentDate,
      expressionKey: rng.pick([...expressions]),
      strength: "subtle",
      confidence: "low",
      scopeTags: ["life:ordinary"],
      provenance,
      supersedesTendencyId: null,
    });
  }
  for (const valueId of [
    LIFE_MIND_IDS.privacy,
    LIFE_MIND_IDS.connection,
    LIFE_MIND_IDS.learning,
  ]) {
    next = recordPersonalValue(next, {
      stableKey: `${LIFE_MIND_CONTENT_VERSION}:${personId}:${valueId}`,
      personId,
      valueId,
      recordedAt: next.currentDate,
      orientation: rng.pick(["embraces", "questions", "conflicted"] as const),
      strength: "subtle",
      salience: "low",
      qualification: null,
      provenance,
      supersedesValueId: null,
    });
  }
  const goal = rng.pick(["learning", "connection", "privacy"] as const);
  return recordGoalState(next, {
    stableKey: `${LIFE_MIND_CONTENT_VERSION}:${personId}:ordinary-goal`,
    personId,
    goalKey: `opening-life:${goal}`,
    recordedAt: next.currentDate,
    objective: ORDINARY_LIFE_GOALS[goal],
    domain: "life:ordinary",
    scope: "personal",
    priority: "moderate",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance,
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

/** Explicit reflection changes the controlled character; reads never develop them. */
export function chooseConversationApproach(
  world: World,
  personId: EntityId,
  expressionKey: "ask" | "listen" | "direct",
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    throw new Error("Only the controlled character can make this reflection.");
  }
  const previous = latestPersonalityTendency(
    world,
    personId,
    LIFE_MIND_IDS.conversation,
  );
  if (
    previous?.expressionKey === expressionKey &&
    previous.confidence === "high"
  )
    return world;
  return recordPersonalityTendency(world, {
    stableKey: `${LIFE_MIND_CONTENT_VERSION}:reflection:${personId}:${world.history.nextSequence}`,
    personId,
    tendencyId: LIFE_MIND_IDS.conversation,
    recordedAt: world.currentDate,
    expressionKey,
    strength: "moderate",
    confidence: "high",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("player-choice", {
      note: "The player explicitly chose how to approach ordinary conversations.",
    }),
    supersedesTendencyId: previous?.id ?? null,
  });
}

/** Repeated played choices justify an offer, never an automatic personality rewrite. */
export function lifeReflectionOffer(world: World, personId: EntityId) {
  if (!world.mindCatalog.tendencies[LIFE_MIND_IDS.conversation]) return null;
  const recent = world.history.events
    .filter(
      (event) =>
        event.type === "life.scene.resolved" &&
        event.participants.some(
          (p) => p.personId === personId && p.role === "focus:subject",
        ),
    )
    .slice(-6);
  for (const expressionKey of ["ask", "listen", "direct"] as const) {
    const evidence = recent.filter((event) =>
      event.tags.includes(`approach:${expressionKey}`),
    );
    if (evidence.length < 2) continue;
    const current = latestPersonalityTendency(
      world,
      personId,
      LIFE_MIND_IDS.conversation,
    );
    if (
      current?.expressionKey === expressionKey &&
      current.confidence === "high"
    )
      continue;
    return createDevelopmentProposal(world, {
      stableKey: `opening-life:reflection:${evidence.at(-1)!.id}`,
      personId,
      proposedAt: world.currentDate,
      target: {
        kind: "personality",
        tendencyId: LIFE_MIND_IDS.conversation,
        expressionKey,
      },
      direction: "reconsider",
      sourceRefs: evidence.map((event) => ({
        kind: "historical-event" as const,
        eventId: event.id,
      })),
      repetitionKey: `opening-life:${expressionKey}`,
      rationale:
        "You chose this conversational approach in more than one ordinary situation.",
    });
  }
  return null;
}

export const ORDINARY_LIFE_GOALS = {
  learning: "Make time to learn something",
  connection: "Make time for people you know",
  privacy: "Make some time for yourself",
} as const;

export function chooseOrdinaryLifeGoal(
  world: World,
  personId: EntityId,
  goal: keyof typeof ORDINARY_LIFE_GOALS,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("Only the player can choose this goal.");
  const goalKey = `opening-life:${goal}`;
  const previous = world.history.goalStates
    .filter(
      (record) => record.personId === personId && record.goalKey === goalKey,
    )
    .at(-1);
  if (previous?.status === "active") return world;
  return recordGoalState(world, {
    stableKey: `${goalKey}:${world.history.nextSequence}`,
    personId,
    goalKey,
    recordedAt: world.currentDate,
    objective: ORDINARY_LIFE_GOALS[goal],
    domain: "life:ordinary",
    scope: "personal",
    priority: "moderate",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("player-choice", {
      note: "The player chose an ordinary personal goal.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: previous?.id ?? null,
  });
}

/** Latest append-only state, including completion/withdrawal, controls applicability. */
export function activeOrdinaryGoal(
  world: World,
  personId: EntityId,
  goal: keyof typeof ORDINARY_LIFE_GOALS,
): boolean {
  return (
    world.history.goalStates
      .filter(
        (record) =>
          record.personId === personId &&
          record.goalKey === `opening-life:${goal}`,
      )
      .at(-1)?.status === "active"
  );
}

/** Completion follows a concrete performed action, never a read or a stated intention. */
export function completeOrdinaryGoal(
  world: World,
  personId: EntityId,
  goal: keyof typeof ORDINARY_LIFE_GOALS,
  eventId: EntityId,
): World {
  const previous = world.history.goalStates
    .filter(
      (record) =>
        record.personId === personId &&
        record.goalKey === `opening-life:${goal}`,
    )
    .at(-1);
  if (previous?.status !== "active") return world;
  const event = world.history.events.find((entry) => entry.id === eventId);
  if (
    !event ||
    !(
      (event.type === "life.scene.resolved" &&
        ((goal === "learning" && event.tags.includes("choice:read")) ||
          (goal === "privacy" && event.tags.includes("choice:rest")))) ||
      (goal === "connection" &&
        event.type === "life.conversation" &&
        event.tags.includes("life.talk:spendTime"))
    ) ||
    !event.participants.some((participant) => participant.personId === personId)
  )
    throw new Error("A performed personal action is required.");
  return recordGoalState(world, {
    stableKey: `opening-life:goal-completed:${previous.id}:${eventId}`,
    personId,
    goalKey: previous.goalKey,
    recordedAt: world.currentDate,
    objective: previous.objective,
    domain: previous.domain,
    scope: previous.scope,
    priority: previous.priority,
    status: "completed",
    targetEntityId: previous.targetEntityId,
    deadline: previous.deadline,
    outcome: event.summary,
    provenance: createMindProvenance(
      world.control.kind === "person" && world.control.personId === personId
        ? "player-choice"
        : "reflection",
      {
        note: "Completed through the recorded ordinary-life action.",
        sourceRefs: [{ kind: "historical-event", eventId }],
      },
    ),
    replacesGoalId: null,
    supersedesGoalStateId: previous.id,
  });
}
