import { eventById } from "./event-index";
import { LIFE_MIND_CONTENT_VERSION, LIFE_MIND_IDS } from "./life-mind-content";
import {
  createMindProvenance,
  recordPersonalValue,
  recordPersonalityTendency,
  recordGoalState,
  createDevelopmentProposal,
} from "./mind";
import {
  upbringingCoreValueFrom,
  upbringingFor,
  type PersonUpbringing,
} from "./people-upbringing";
import { latestPersonalityTendency } from "./queries";
import type { EntityId, World } from "./types";

type Orientation = "embraces" | "questions" | "conflicted";

/** A three-way choice read from one lean: low end, middle, high end. */
function byLean<T>(lean: number, low: T, middle: T, high: T): T {
  return lean < 0 ? low : lean > 0 ? high : middle;
}

/**
 * The ordinary-life preferences an upbringing leans toward. Pure: the same
 * upbringing gives the same preferences in every world. Where the upbringing
 * leans neither way, the preference sits at its middle.
 */
export function lifePersonalityFromUpbringing(upbringing: PersonUpbringing): {
  readonly conversation: "listen" | "ask" | "direct";
  readonly leisure: "familiar" | "company" | "explore";
  readonly privacy: Orientation;
  readonly connection: Orientation;
  readonly learning: Orientation;
  readonly goal: keyof typeof ORDINARY_LIFE_GOALS;
} {
  const sociability = upbringingCoreValueFrom(upbringing, "sociability");
  const conflict = upbringingCoreValueFrom(upbringing, "conflict");
  const risk = upbringingCoreValueFrom(upbringing, "risk");
  const schooling = upbringing.schooling;
  const learningLean =
    (schooling.some(
      (x) =>
        x === "reliable-support" ||
        x === "earned-success" ||
        x === "supported-setbacks",
    )
      ? 1
      : 0) -
    (schooling.some((x) => x === "ridicule-or-exclusion" || x === "bullying")
      ? 1
      : 0);
  return {
    // Someone who presses a disagreement says so; someone who smooths it over
    // listens first.
    conversation: byLean(conflict, "listen", "ask", "direct"),
    // A cautious upbringing keeps to the familiar; a chance-taking one explores.
    leisure: byLean(risk, "familiar", "company", "explore"),
    privacy: byLean<Orientation>(
      sociability,
      "embraces",
      "conflicted",
      "questions",
    ),
    connection: byLean<Orientation>(
      sociability,
      "questions",
      "conflicted",
      "embraces",
    ),
    learning: byLean<Orientation>(
      learningLean,
      "questions",
      "conflicted",
      "embraces",
    ),
    goal: byLean(sociability, "privacy", "learning", "connection"),
  };
}

/** Opening preferences come from the person's upbringing, never a draw or demographics. */
export function establishLifePersonality(
  world: World,
  personId: EntityId,
): World {
  if (latestPersonalityTendency(world, personId, LIFE_MIND_IDS.conversation))
    return world;
  const leans = lifePersonalityFromUpbringing(upbringingFor(world, personId));
  const provenance = createMindProvenance("authored", {
    note: `${LIFE_MIND_CONTENT_VERSION}: fictional ordinary-life preferences read from this person's upbringing; no empirical or demographic inference.`,
  });
  let next = world;
  for (const [tendencyId, expressionKey] of [
    [LIFE_MIND_IDS.conversation, leans.conversation],
    [LIFE_MIND_IDS.leisure, leans.leisure],
  ] as const) {
    next = recordPersonalityTendency(next, {
      stableKey: `${LIFE_MIND_CONTENT_VERSION}:${personId}:${tendencyId}`,
      personId,
      tendencyId,
      recordedAt: next.currentDate,
      expressionKey,
      strength: "subtle",
      confidence: "low",
      scopeTags: ["life:ordinary"],
      provenance,
      supersedesTendencyId: null,
    });
  }
  for (const [valueId, orientation] of [
    [LIFE_MIND_IDS.privacy, leans.privacy],
    [LIFE_MIND_IDS.connection, leans.connection],
    [LIFE_MIND_IDS.learning, leans.learning],
  ] as const) {
    next = recordPersonalValue(next, {
      stableKey: `${LIFE_MIND_CONTENT_VERSION}:${personId}:${valueId}`,
      personId,
      valueId,
      recordedAt: next.currentDate,
      orientation,
      strength: "subtle",
      salience: "low",
      qualification: null,
      provenance,
      supersedesValueId: null,
    });
  }
  const goal = leans.goal;
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
  const event = eventById(world, eventId);
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
