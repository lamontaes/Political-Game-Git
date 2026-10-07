import { lifeReplyLine, type LifeReplyKey } from "./life-reply-english";
import type { ComposedPart } from "./english-composition";
import type { GroundedEnglishFact } from "./grounded-english";
import { latestGoalStatesForPerson } from "../simulation/queries";
import {
  daysBetween,
  personName,
  type EntityId,
  type World,
} from "../simulation";
import {
  activeOrdinaryGoal,
  ORDINARY_LIFE_GOALS,
} from "../simulation/life-personality";
import { relationshipHistory } from "../simulation/queries";
import { readRelationshipStanding } from "../simulation/relationship-standing";

/**
 * Things the player could actually tell somebody, drawn from their own life.
 *
 * "Ask if you can tell them something" used to end at "What do you want to
 * tell me?" with nothing to say. ChatGPT's direction (2026-09-22): a real
 * conversation is about something available in the character's life — a
 * recent experience, a plan, something they know — and the answer depends on
 * the person and their history together. More reply options are not depth.
 *
 * So every topic here is a record the world already holds: a scene the player
 * lived through with somebody in the last fortnight that this listener was not
 * at and has not heard about, or a plan the player has actually made. Nothing
 * is invented to fill the list; when there is nothing, the list is empty and
 * the conversation says so honestly.
 */
export const TELL_PREFIX = "tell:";

/*
 * PLACEHOLDER, NOT RESEARCH. What counts as news and how a listener answers are
 * filed with ChatGPT as `listener-response-to-being-told`, and the owner has
 * ruled that depth is not invented. The recency window, the count and every
 * line in `tellAnswer` stand in until that answer comes back.
 */
/** How far back a lived moment is still news worth telling. Placeholder. */
const RECENT_DAYS = 14;
/** How many recent moments are offered at once. Placeholder. */
const MOST_RECENT = 3;

const SCENE_RESOLVED = "life.scene.resolved";

export type TellTopic =
  | {
      readonly kind: "experience";
      readonly key: string;
      readonly label: string;
      readonly eventId: EntityId;
      readonly otherPersonId: EntityId;
      readonly where: string;
    }
  | {
      readonly kind: "plan";
      readonly key: string;
      readonly label: string;
      readonly goal: keyof typeof ORDINARY_LIFE_GOALS;
    };

function wherePhrase(setting: string | undefined): string {
  if (setting === "school") return "at school";
  if (setting === "neighborhood") return "in the neighborhood";
  return "at home";
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1);
}

/** Whether this listener already had the plan told to them today. */
function toldToday(
  world: World,
  playerPersonId: EntityId,
  listenerId: EntityId,
  key: string,
): boolean {
  return world.history.events.some(
    (event) =>
      event.type === "life.conversation" &&
      event.occurredAt === world.currentDate &&
      event.tags.includes(`life.talk:${key}`) &&
      event.involvedEntityIds.includes(listenerId) &&
      event.involvedEntityIds.includes(playerPersonId),
  );
}

export function tellableTopics(
  world: World,
  playerPersonId: EntityId,
  listenerId: EntityId,
): readonly TellTopic[] {
  const known = new Set(
    world.history.knowledge
      .filter((record) => record.personId === listenerId)
      .map((record) => record.eventId),
  );
  const experiences: TellTopic[] = world.history.events
    .filter(
      (event) =>
        event.type === SCENE_RESOLVED &&
        event.occurredAt <= world.currentDate &&
        daysBetween(event.occurredAt, world.currentDate) <= RECENT_DAYS &&
        event.participants.some(
          (entry) =>
            entry.personId === playerPersonId && entry.role === "focus:subject",
        ) &&
        !event.involvedEntityIds.includes(listenerId) &&
        !known.has(event.id),
    )
    .flatMap((event): TellTopic[] => {
      const other = event.participants.find(
        (entry) => entry.role === "coordination:counterpart",
      )?.personId;
      if (!other || !world.people[other]) return [];
      const where = wherePhrase(event.context.location?.setting ?? undefined);
      const when =
        event.occurredAt === world.currentDate ? " today" : " the other day";
      return [
        {
          kind: "experience",
          key: `${TELL_PREFIX}${event.id}`,
          label: `Tell them about ${personName(world.people[other]!)} ${where}${when}`,
          eventId: event.id,
          otherPersonId: other,
          where,
        },
      ];
    })
    .slice(-MOST_RECENT)
    .reverse();

  const plans: TellTopic[] = (
    Object.keys(ORDINARY_LIFE_GOALS) as (keyof typeof ORDINARY_LIFE_GOALS)[]
  )
    .filter((goal) => activeOrdinaryGoal(world, playerPersonId, goal))
    .map((goal) => ({
      kind: "plan" as const,
      key: `${TELL_PREFIX}plan:${goal}`,
      label: `Tell them you want to ${lowerFirst(ORDINARY_LIFE_GOALS[goal])}`,
      goal,
    }))
    .filter(
      (topic) => !toldToday(world, playerPersonId, listenerId, topic.key),
    );

  return [...experiences, ...plans];
}

export function findTellTopic(
  world: World,
  playerPersonId: EntityId,
  listenerId: EntityId,
  key: string,
): TellTopic | null {
  return (
    tellableTopics(world, playerPersonId, listenerId).find(
      (topic) => topic.key === key,
    ) ?? null
  );
}

/** How the listener stands with the player, as far as the answer needs. */
function listenerStance(
  world: World,
  listenerId: EntityId,
  playerPersonId: EntityId,
): "warm" | "guarded" | "plain" {
  const standing = readRelationshipStanding(world, listenerId, playerPersonId);
  const { warmth, tension } = standing.readings;
  const current = standing.absence.currency === "current";
  if (current && (tension.band === "marked" || tension.band === "strong"))
    return "guarded";
  if (
    !warmth.adverse &&
    (warmth.band === "marked" || warmth.band === "strong") &&
    standing.absence.currency !== "dormant"
  )
    return "warm";
  return "plain";
}

export interface TellAnswer {
  readonly reply: string;
  readonly parts: readonly ComposedPart[];
  /** Whether the listener took it in, which is when they come to know it. */
  readonly heard: boolean;
  /** How far the listener believes it, from how far they rely on the teller. */
  readonly confidence: "high" | "medium";
}

/**
 * The listener's answer, from who they are and what the two of them share.
 *
 * Read from records only: whether they need quiet, how they stand with the
 * player, whether they know the other person in the story, and whether they
 * have made the same plan. Nothing here is scored or remembered beyond what
 * the conversation writes.
 *
 * Words are assembled by the same English composer as other ordinary replies.
 */
export function tellAnswer(
  world: World,
  playerPersonId: EntityId,
  listenerId: EntityId,
  topic: TellTopic,
  options: { readonly parentOfYoungPlayer: boolean },
): TellAnswer {
  const standing = readRelationshipStanding(world, listenerId, playerPersonId);
  const trustMarked =
    !standing.readings.trust.adverse &&
    (standing.readings.trust.band === "marked" ||
      standing.readings.trust.band === "strong");
  const confidence = trustMarked ? "high" : "medium";
  const facts: Record<string, GroundedEnglishFact> = {};
  const answer = (key: LifeReplyKey, heard = true): TellAnswer => {
    const line = lifeReplyLine(
      world,
      listenerId,
      playerPersonId,
      [],
      key,
      facts,
    );
    return { reply: line.text, parts: line.parts, heard, confidence };
  };
  if (activeOrdinaryGoal(world, listenerId, "privacy"))
    return answer("tell-privacy", false);
  const stance = listenerStance(world, listenerId, playerPersonId);
  if (topic.kind === "plan") {
    const goal = latestGoalStatesForPerson(world, listenerId).find(
      (record) =>
        record.goalKey === `opening-life:${topic.goal}` &&
        record.status === "active",
    );
    if (goal) {
      facts.plan = {
        text: lowerFirst(goal.objective)
          .replace(/\byou know\b/g, "I know")
          .replace(/\byourself\b/g, "myself"),
        sourceRecordIds: [goal.id],
      };
      return answer("tell-shared-plan");
    }
    return answer(
      stance === "guarded"
        ? "tell-guarded"
        : options.parentOfYoungPlayer
          ? "tell-parent-plan"
          : stance === "warm"
            ? "tell-warm-plan"
            : "tell-plain-plan",
    );
  }
  const relationships = relationshipHistory(
    world,
    listenerId,
    topic.otherPersonId,
  );
  if (relationships.length > 0)
    facts["known-person"] = {
      text: world.people[topic.otherPersonId]!.givenName,
      sourceRecordIds: relationships.map((record) => record.id),
    };
  return answer(
    stance === "guarded"
      ? "tell-guarded"
      : stance === "warm"
        ? options.parentOfYoungPlayer
          ? "tell-parent-experience"
          : "tell-warm-experience"
        : "tell-plain-experience",
  );
}

/** What the listener comes away believing, in their own terms. */
export function toldSummary(
  world: World,
  playerPersonId: EntityId,
  topic: TellTopic & { readonly kind: "experience" },
): string {
  return `${personName(world.people[playerPersonId]!)} told them what happened with ${personName(world.people[topic.otherPersonId]!)} ${topic.where}.`;
}
