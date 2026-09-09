import {
  activeOrdinaryGoal,
  completeOrdinaryGoal,
} from "../simulation/life-personality";
import { currentOpeningLifeScene } from "./life-scene-flow";
import {
  ageOnDate,
  describePersonContext,
  personName,
  recordEventKnowledge,
  recordWorldEvent,
  advanceWorldMinutes,
  kinshipRelationshipsAt,
} from "../simulation";
import { LIFE_MIND_IDS } from "../simulation/life-mind-content";
import {
  latestPersonalValue,
  latestPersonalityTendency,
} from "../simulation/queries";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../simulation";

/** Ordinary spoken exchanges use the global event/knowledge history. */
export const LIFE_TALK_INTENTS = {
  greet: "Say hello",
  activity: "Ask what they would like to do",
  explain: "Ask why",
  suggestGame: "Suggest playing a game together",
  suggestQuiet: "Suggest sitting and talking together",
  share: "Ask if they want to talk",
  remember: "Talk about an earlier conversation",
  acknowledge: "Let them know you heard",
  leave: "Say goodbye",
  date: "Ask if they would like this to be a date",
  spendTime: "Spend half an hour together",
} as const;
export type LifeTalkIntent = keyof typeof LIFE_TALK_INTENTS;

export interface LifeTalkContext {
  readonly playerPersonId: EntityId;
  readonly personId: EntityId;
  readonly setting: "home" | "school" | "neighborhood";
  readonly placeLabel: string;
}

/** Exact relation + shared context, never the first person in a list. */
export function lifeTalkContext(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): LifeTalkContext | null {
  const scene = currentOpeningLifeScene(world, playerPersonId);
  if (
    !scene ||
    personId === playerPersonId ||
    !scene.presentPersonIds.includes(personId)
  )
    return null;
  const event = world.history.events.find(
    (entry) => entry.id === scene.eventId,
  )!;
  return {
    playerPersonId,
    personId,
    setting: scene.definition.setting,
    placeLabel: event.context.location!.label,
  };
}

function turns(world: World, playerPersonId: EntityId, personId: EntityId) {
  return world.history.events.filter(
    (event) =>
      event.type === "life.conversation" &&
      event.participants.some(
        (p) => p.personId === playerPersonId && p.role === "focus:subject",
      ) &&
      event.participants.some(
        (p) => p.personId === personId && p.role === "coordination:counterpart",
      ) &&
      event.occurredAt <= world.currentDate,
  );
}

export function projectLifeConversation(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
) {
  const context = lifeTalkContext(world, playerPersonId, personId);
  if (!context) return null;
  const history = turns(world, playerPersonId, personId);
  const previous = history.at(-1);
  const previousIntent = previous?.tags
    .find((tag) => tag.startsWith("life.talk:"))
    ?.slice(10);
  const intents: LifeTalkIntent[] = ["greet", "activity", "share"];
  if (previousIntent === "activity")
    intents.push("suggestGame", "suggestQuiet");
  if (
    ["activity", "share", "suggestGame", "suggestQuiet"].includes(
      previousIntent ?? "",
    )
  )
    intents.push("explain");
  if (history.length > 0) intents.push("remember", "acknowledge");
  const adults = [playerPersonId, personId].every(
    (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  );
  const kin = kinshipRelationshipsAt(world, playerPersonId).some((record) =>
    record.personIds.includes(personId),
  );
  const care = world.history.childAuthorities.some(
    (record) =>
      (record.childPersonId === playerPersonId &&
        record.holder.kind === "person" &&
        record.holder.personId === personId) ||
      (record.childPersonId === personId &&
        record.holder.kind === "person" &&
        record.holder.personId === playerPersonId),
  );
  if (
    adults &&
    !kin &&
    !care &&
    !history.some(
      (event) =>
        event.occurredAt === world.currentDate &&
        event.tags.includes("life.talk:date"),
    )
  )
    intents.push("date");
  const currentSceneId = currentOpeningLifeScene(
    world,
    playerPersonId,
  )!.eventId;
  const latestProposal = history
    .filter(
      (event) =>
        event.occurredAt === world.currentDate &&
        event.tags.includes(`scene:${currentSceneId}`) &&
        ["date", "suggestGame", "suggestQuiet", "spendTime", "leave"].some(
          (intent) => event.tags.includes(`life.talk:${intent}`),
        ),
    )
    .at(-1);
  if (
    latestProposal &&
    ((adults &&
      !kin &&
      !care &&
      latestProposal.tags.includes("life.answer:date-accepted")) ||
      latestProposal.tags.includes("life.answer:company-accepted"))
  )
    intents.push("spendTime");
  intents.push("leave");
  return {
    context,
    person: describePersonContext(world, playerPersonId, personId)!,
    revision: world.history.nextSequence,
    intents: intents.map((key) => ({ key, label: LIFE_TALK_INTENTS[key] })),
    transcript: history.map((event) => ({
      eventId: event.id,
      date: event.occurredAt,
      action: event.context.choice!,
      reply: event.context.immediateReaction!,
    })),
  };
}

function willingToDate(world: World, personId: EntityId): boolean {
  return (
    !activeOrdinaryGoal(world, personId, "privacy") &&
    latestPersonalValue(world, personId, LIFE_MIND_IDS.connection)
      ?.orientation === "embraces"
  );
}

function acceptsActivity(
  world: World,
  personId: EntityId,
  intent: LifeTalkIntent,
): boolean {
  if (activeOrdinaryGoal(world, personId, "privacy")) return false;
  return intent === "suggestGame"
    ? activityPreference(world, personId) !== "explore"
    : activityPreference(world, personId) !== "familiar";
}

function activityPreference(world: World, personId: EntityId): string {
  if (activeOrdinaryGoal(world, personId, "learning")) return "explore";
  if (activeOrdinaryGoal(world, personId, "connection")) return "company";
  if (
    latestPersonalValue(world, personId, LIFE_MIND_IDS.learning)
      ?.orientation === "embraces"
  )
    return "explore";
  return (
    latestPersonalityTendency(world, personId, LIFE_MIND_IDS.leisure)
      ?.expressionKey ?? "familiar"
  );
}

/** Replies follow the actual intent and this person's previous turn. No scoring. */
function replyFor(
  world: World,
  context: LifeTalkContext,
  intent: LifeTalkIntent,
): string {
  const { playerPersonId, personId } = context;
  const history = turns(world, playerPersonId, personId);
  const previous = history.at(-1);
  const child =
    ageOnDate(world.people[playerPersonId]!.birthDate, world.currentDate) < 13;
  const approach = latestPersonalityTendency(
    world,
    personId,
    LIFE_MIND_IDS.conversation,
  )?.expressionKey;
  const leisure = activityPreference(world, personId);
  const privatePerson =
    latestPersonalValue(world, personId, LIFE_MIND_IDS.privacy)?.orientation ===
    "embraces";
  switch (intent) {
    case "date":
      return willingToDate(world, personId)
        ? "Yes. I'd like that. We could sit and talk for a while."
        : "No, thank you. I'd like to keep this as it is.";
    case "suggestGame":
      return acceptsActivity(world, personId, intent)
        ? "Yes, I'd like to play a game together."
        : "Not a game right now, thanks. I'd rather leave it for another time.";
    case "suggestQuiet":
      return acceptsActivity(world, personId, intent)
        ? "Yes. Let's sit and talk for a while."
        : "I'd rather not sit and talk right now. Thanks for asking.";
    case "spendTime":
      return "I'm glad we took some time together.";
    case "greet":
      return history.length
        ? "Hi again."
        : `Hi, ${world.people[playerPersonId]!.givenName}.`;
    case "activity":
      if (leisure === "explore")
        return child
          ? "Can we try a new game?"
          : "I'd like to try something new. What did you have in mind?";
      if (leisure === "company")
        return child
          ? "Let's do something together."
          : "I'd like some company. We could spend a little time together.";
      return child
        ? "Can we play a game we both know?"
        : "I'd rather do something familiar. We don't have to make a big plan.";
    case "share":
      if (privatePerson)
        return child
          ? "Not right now. Can we talk about something else?"
          : "I'd rather keep that to myself for now.";
      if (approach === "ask") return "Sure. What did you want to talk about?";
      if (approach === "listen") return "I'm listening. Go ahead.";
      return "Yes. Tell me what's on your mind.";
    case "explain":
      if (
        previous?.tags.includes("life.talk:suggestGame") ||
        previous?.tags.includes("life.talk:suggestQuiet")
      )
        return previous.tags.includes("life.answer:company-accepted")
          ? "That sounds like a way I'd enjoy spending time together."
          : "It isn't what I feel like doing right now. We can leave it there.";
      if (previous?.tags.includes("life.talk:share"))
        return previous.tags.includes("life.answer:private")
          ? "I'm not ready to talk about it. Please leave it there."
          : "I said yes because I want to hear what you have to say.";
      return previous?.tags.includes("life.answer:explore")
        ? "I want to try something I haven't done before."
        : previous?.tags.includes("life.answer:company")
          ? "I want to spend time with you."
          : "I'd like to do something I already enjoy.";
    case "remember": {
      const remembered =
        history.find(
          (event) =>
            event.tags.includes("life.talk:activity") ||
            event.tags.includes("life.talk:share"),
        ) ?? previous;
      return remembered
        ? `I remember saying, “${remembered.context.immediateReaction}”`
        : "We haven't talked about that.";
    }
    case "acknowledge":
      return "Thanks for hearing me out.";
    case "leave":
      return "See you.";
  }
}

export function commitLifeConversation(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
    readonly personId: EntityId;
    readonly intent: LifeTalkIntent;
    readonly revision: number;
    readonly transitionHandlers?: FutureTransitionHandlerRegistry;
  },
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId
  )
    throw new Error("The speaker is not controlled by the player.");
  const view = projectLifeConversation(
    world,
    input.playerPersonId,
    input.personId,
  );
  if (
    !view ||
    view.revision !== input.revision ||
    !view.intents.some((option) => option.key === input.intent)
  )
    throw new Error("This conversation choice is no longer available.");
  const advanced = advanceWorldMinutes(
    world,
    input.intent === "spendTime" ? 30 : 2,
    input.transitionHandlers,
  );
  if (advanced === world) return world;
  if (
    advanced.history.events
      .slice(world.history.events.length)
      .some((event) => event.type !== "simulation.minutes-advanced")
  )
    return advanced;
  const reply = replyFor(world, view.context, input.intent);
  const stableKey = `opening-life:talk:${input.playerPersonId}:${input.personId}:${input.revision}`;
  let next = recordWorldEvent(advanced, {
    stableKey,
    type: "life.conversation",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[input.playerPersonId]!.homeJurisdictionId,
    involvedEntityIds: currentOpeningLifeScene(world, input.playerPersonId)!
      .presentPersonIds,
    participants: [
      {
        personId: input.playerPersonId,
        role: "focus:subject",
        detail: "Spoke directly",
      },
      {
        personId: input.personId,
        role: "coordination:counterpart",
        detail: "Replied directly",
      },
      ...currentOpeningLifeScene(world, input.playerPersonId)!
        .presentPersonIds.filter(
          (id) => id !== input.playerPersonId && id !== input.personId,
        )
        .map((id) => ({
          personId: id,
          role: "observation:witness" as const,
          detail: "Heard the conversation in the scene",
        })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "life.conversation",
      `life.talk:${input.intent}`,
      `scene:${currentOpeningLifeScene(world, input.playerPersonId)!.eventId}`,
      `moment:${JSON.stringify(advanced.currentMoment)}`,
      `life.answer:${input.intent === "suggestGame" || input.intent === "suggestQuiet" ? (acceptsActivity(world, input.personId, input.intent) ? "company-accepted" : "company-declined") : input.intent === "date" ? (willingToDate(world, input.personId) ? "date-accepted" : "date-declined") : input.intent === "activity" ? activityPreference(world, input.personId) : latestPersonalValue(world, input.personId, LIFE_MIND_IDS.privacy)?.orientation === "embraces" ? "private" : "open"}`,
    ],
    summary: `${personName(world.people[input.playerPersonId]!)}: ${LIFE_TALK_INTENTS[input.intent]}. ${personName(world.people[input.personId]!)}: ${reply}`,
    context: {
      location: {
        jurisdictionId: world.people[input.playerPersonId]!.homeJurisdictionId,
        label: view.context.placeLabel,
        setting: view.context.setting,
      },
      socialContext: "A direct ordinary conversation",
      pressure: null,
      choice: LIFE_TALK_INTENTS[input.intent],
      motivation: null,
      immediateReaction: reply,
    },
  });
  const event = next.history.events.at(-1)!;
  for (const personId of currentOpeningLifeScene(world, input.playerPersonId)!
    .presentPersonIds)
    next = recordEventKnowledge(next, {
      stableKey: `${stableKey}:heard:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  if (input.intent === "spendTime") {
    next = completeOrdinaryGoal(
      next,
      input.playerPersonId,
      "connection",
      event.id,
    );
    next = completeOrdinaryGoal(next, input.personId, "connection", event.id);
  }
  return next;
}
