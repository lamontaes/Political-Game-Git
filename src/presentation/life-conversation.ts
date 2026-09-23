import {
  activeOrdinaryGoal,
  completeOrdinaryGoal,
} from "../simulation/life-personality";
import { lifeActivityHandlers } from "./life-time-handlers";
import {
  currentTalkProposal,
  talkProposalTag,
  PROPOSAL_LINK,
  type TalkProposalTerms,
} from "./life-talk-proposals";
import { currentLifeTalkScene } from "./life-talk-presence";
import {
  TELL_PREFIX,
  findTellTopic,
  tellAnswer,
  tellableTopics,
  toldSummary,
} from "./life-talk-topics";
import { currentKnownMatter, matterAwareness } from "./current-matters";
import {
  ageOnDate,
  describePersonContext,
  personName,
  recordEventKnowledge,
  recordRelationshipInteraction,
  recordWorldEvent,
  advanceWorldMinutes,
  kinshipRelationshipsAt,
  simulationMinutesBetween,
  controlledCommitmentsBlockingMinuteAdvance,
  addSimulationMinutes,
  compareSimulationMoments,
} from "../simulation";
import { LIFE_MIND_IDS } from "../simulation/life-mind-content";
import {
  familyPlanAvailability,
  proposeFamilyPlan,
} from "../simulation/people-family-plan";
import {
  latestPersonalValue,
  latestPersonalityTendency,
} from "../simulation/queries";
import type {
  EntityId,
  IsoDate,
  RelationshipSignificance,
  RelationshipInteractionKind,
  World,
  FutureTransitionHandlerRegistry,
} from "../simulation";

/** Ordinary spoken exchanges use the global event/knowledge history. */
export const LIFE_TALK_INTENTS = {
  greet: "Say hello",
  scene: "Talk about what is happening here",
  activity: "Ask what they would like to do",
  explain: "Ask why",
  suggestGame: "Suggest playing a game together",
  suggestQuiet: "Suggest sitting and talking together",
  share: "Ask if you can tell them something",
  matter: "Mention something in the news",
  remember: "Talk about an earlier conversation",
  acknowledge: "Let them know you heard",
  leave: "Say goodbye",
  date: "Ask if they would like this to be a date",
  spendTime: "Spend half an hour together",
  acceptProposal: "Agree to their suggestion",
  declineProposal: "Decline their suggestion",
  cancelProposal: "Cancel your plans together",
  nothing: "Say it can wait",
  familyChild: "Talk about having a child together",
  familyAdopt: "Talk about adopting a child together",
} as const;
/**
 * A fixed intent, or telling them one particular thing from the player's own
 * life (`tell:<topic>`); see `life-talk-topics.ts`.
 */
export type LifeTalkIntent =
  keyof typeof LIFE_TALK_INTENTS | `${typeof TELL_PREFIX}${string}`;

function isTellIntent(
  intent: LifeTalkIntent,
): intent is `${typeof TELL_PREFIX}${string}` {
  return intent.startsWith(TELL_PREFIX);
}

/** The words for an intent, whether fixed or a particular thing to tell. */
export function lifeTalkIntentLabel(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: LifeTalkIntent,
): string {
  if (!isTellIntent(intent)) return LIFE_TALK_INTENTS[intent];
  return (
    findTellTopic(world, playerPersonId, personId, intent)?.label ??
    "Tell them something"
  );
}
/**
 * How a raised matter is labeled, and how a later "remember" finds its
 * headline again. Distinct from the scene conversation's "Bring up:" topic
 * switcher, which changes the subject rather than raising a news item.
 */
export const MATTER_CHOICE_PREFIX = "Mention the news: ";

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
  const scene = currentLifeTalkScene(world, playerPersonId);
  if (
    !scene ||
    personId === playerPersonId ||
    !scene.presentPersonIds.includes(personId)
  )
    return null;
  const event = world.history.events.find(
    (entry) => entry.id === scene.eventId,
  );
  return {
    playerPersonId,
    personId,
    setting: scene.definition.setting,
    placeLabel: event?.context.location?.label ?? "Home",
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
  const intents: LifeTalkIntent[] = ["greet", "scene", "activity", "share"];
  // A current public or known matter the player could actually raise; the
  // counterpart's answer depends on what their own records say they know.
  const matter = currentKnownMatter(world, playerPersonId);
  if (matter) intents.push("matter");
  // Having asked to tell them something and been told to go ahead, the
  // player can tell them something real from their own life, or say it can
  // wait. Nothing is offered that the world does not hold.
  const invited =
    previousIntent === "share" &&
    !previous?.tags.includes("life.answer:private");
  const topics = invited ? tellableTopics(world, playerPersonId, personId) : [];
  if (invited)
    intents.push(
      ...topics.map((topic) => topic.key as LifeTalkIntent),
      "nothing",
    );
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
  const currentSceneId = currentLifeTalkScene(world, playerPersonId)!.eventId;
  const proposal = currentTalkProposal(
    world,
    playerPersonId,
    personId,
    currentSceneId,
  );
  if (proposal?.status === "proposed")
    intents.push("acceptProposal", "declineProposal");
  if (proposal?.status === "accepted") intents.push("cancelProposal");
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
    !history.some(
      (event) =>
        event.tags.includes(`scene:${currentSceneId}`) &&
        event.tags.includes("life.talk:spendTime"),
    ) &&
    (proposal?.status === "accepted" ||
      (!proposal &&
        latestProposal &&
        ((adults &&
          !kin &&
          !care &&
          latestProposal.tags.includes("life.answer:date-accepted")) ||
          latestProposal.tags.includes("life.answer:company-accepted"))))
  )
    intents.push("spendTime");
  // Two people who share a home and are together can raise a family. Nothing
  // is decided here: the other person answers in a day or two, from their own
  // temperament, through the family plan's own writer.
  const family = familyPlanAvailability(world, playerPersonId);
  if (family.available && family.partnerPersonId === personId)
    intents.push("familyChild", "familyAdopt");
  intents.push("leave");
  return {
    context,
    person: describePersonContext(world, playerPersonId, personId)!,
    revision: world.history.nextSequence,
    proposal,
    matter,
    intents: intents.map((key) => ({
      key,
      label:
        matter && key === "matter"
          ? `${MATTER_CHOICE_PREFIX}${matter.headline}`
          : proposal && key === "acceptProposal"
            ? `Agree to ${proposal.label}`
            : proposal && key === "declineProposal"
              ? `Decline to ${proposal.label}`
              : proposal && key === "spendTime"
                ? `Spend 30 minutes: ${proposal.label}`
                : isTellIntent(key)
                  ? (topics.find((topic) => topic.key === key)?.label ??
                    "Tell them something")
                  : LIFE_TALK_INTENTS[key],
    })),
    transcript: history.map((event) => ({
      eventId: event.id,
      date: event.occurredAt,
      action: event.context.choice!,
      reply: event.context.immediateReaction!,
    })),
  };
}

function parentOfYoungPlayer(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): boolean {
  const relation = describePersonContext(
    world,
    playerPersonId,
    personId,
  )?.relationship;
  return (
    ["your mom", "your dad", "your parent", "your guardian"].includes(
      relation ?? "",
    ) &&
    ageOnDate(world.people[playerPersonId]!.birthDate, world.currentDate) < 13
  );
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
    ageOnDate(world.people[personId]!.birthDate, world.currentDate) < 13;
  const youngPlayer =
    ageOnDate(world.people[playerPersonId]!.birthDate, world.currentDate) < 13;
  const relation = describePersonContext(
    world,
    playerPersonId,
    personId,
  )?.relationship;
  const parent = [
    "your mom",
    "your dad",
    "your parent",
    "your guardian",
  ].includes(relation ?? "");
  const approach = latestPersonalityTendency(
    world,
    personId,
    LIFE_MIND_IDS.conversation,
  )?.expressionKey;
  const leisure = activityPreference(world, personId);
  const proposal = currentTalkProposal(
    world,
    playerPersonId,
    personId,
    currentLifeTalkScene(world, playerPersonId)!.eventId,
  );
  const matchesProposal =
    proposal?.status === "proposed" &&
    (intent === "acceptProposal" ||
      (intent === "suggestGame" && proposal.terms.activity !== "quiet") ||
      (intent === "suggestQuiet" && proposal.terms.activity === "quiet"));
  if (matchesProposal)
    return activeOrdinaryGoal(world, personId, "privacy")
      ? "I need some time alone now. Let’s leave it for another time."
      : `Yes, let's ${proposal.label.replace("you both", "we both")}.`;
  const privatePerson =
    latestPersonalValue(world, personId, LIFE_MIND_IDS.privacy)?.orientation ===
    "embraces";
  if (isTellIntent(intent)) {
    const topic = findTellTopic(world, playerPersonId, personId, intent);
    return topic
      ? tellAnswer(world, playerPersonId, personId, topic, {
          parentOfYoungPlayer: parent && youngPlayer,
        }).reply
      : "What were you going to say?";
  }
  switch (intent) {
    case "scene": {
      const scene = currentLifeTalkScene(world, playerPersonId)!;
      if (scene.definition.key === "early.home.broken-mug")
        return parent
          ? "Tell me what happened. Leave the pieces alone; I will help with those."
          : "We should ask for help with the broken pieces.";
      if (scene.definition.key === "early.home.bedtime-delay")
        return parent
          ? "It is bedtime. Put the toy away, please."
          : "It is time to put the toy away.";
      if (scene.definition.key === "early.home.food-refusal")
        return parent
          ? "Would you try one bite? You can tell me if you do not like it."
          : "You do not have to pretend you like it.";
      if (scene.definition.key === "young.home.ask-about-childhood")
        return "What would you like to know about school?";
      if (scene.definition.key === "early.community.curious-neighbor")
        return "Do you like your teacher?";
      const sceneQuestion: Readonly<Record<string, string>> = {
        "early.school.lunchbox-swap": "Do you want to keep your snack?",
        "early.peer.sidewalk-game": "Shall we try one round with that rule?",
        "early.peer.secret-whisper": "Do you want to talk about the story?",
        "early.peer.dropped-treat": "Can you stay with me for a minute?",
        "early.peer.roughhouse-line": "Do you want to stop playing tag?",
        "early.community.library-quiet":
          "Should we move farther apart so we can listen?",
        "early.school.crayon-sharing": "Can I use the crayon when you finish?",
        "early.school.playground-turn": "Do you want a turn on the swing?",
        "early.school.spilled-paint": "Can you help blot the paper?",
        "early.peer.toy-damage-accidental": "Can you show me the wheel?",
        "adult.home.shared-time": "Would you like to talk about your day?",
        "early.community.lost-pet-flyer":
          "Shall we look at the flyer together?",
        "early.community.sidewalk-curb": "Will you wait here with me?",
        "early.family.packing-boxes": "Is there a toy you want to keep?",
        "adult.trans.college-vs-work":
          "What would you like to know before deciding?",
        "adult.trans.drop-class-keep-job":
          "Do you want to ask about another shift first?",
      };
      if (sceneQuestion[scene.definition.key])
        return sceneQuestion[scene.definition.key]!;
      // The only established topic is the scene's saved premise, not a new
      // worry or a fabricated past exchange attributed to this person.
      return "What would you like to do?";
    }
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
      return proposal
        ? `I'm glad we took time to ${proposal.label.replace("you both", "we both")}.`
        : "I'm glad we took some time together.";
    case "acceptProposal":
      return "That invitation is no longer open.";
    case "declineProposal":
      return "All right. Maybe another time.";
    case "cancelProposal":
      return "All right. Let’s leave it.";
    case "greet":
      if (parent && youngPlayer)
        return history.length
          ? "Hi, sweetheart. What is it?"
          : "Hi, sweetheart.";
      return history.length
        ? "Hi again."
        : `Hi, ${world.people[playerPersonId]!.givenName}.`;
    case "activity":
      if (activeOrdinaryGoal(world, personId, "privacy"))
        return "I need some privacy right now. Let's leave activities for another time.";
      if (parent && youngPlayer)
        return leisure === "explore"
          ? "We could try a new game. Would you like that?"
          : leisure === "company"
            ? "We could play together. You can choose the game."
            : "How about a game we both know?";
      if (leisure === "explore")
        return child
          ? "Can we try a new game?"
          : "We could try a new game. Would you like that?";
      if (leisure === "company")
        return child
          ? "Let's play a game together."
          : "I'd like some company. We could sit and talk together.";
      return child
        ? "Can we play a game we both know?"
        : "How about a game we both know?";
    case "share":
      if (parent && youngPlayer)
        return "Of course. What do you want to tell me?";
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
    case "matter": {
      const matter = currentKnownMatter(world, playerPersonId);
      if (!matter) return "What did you want to talk about?";
      const awareness = matterAwareness(world, personId, matter.eventId);
      if (awareness === "uninformed") return "I hadn't heard about that.";
      if (activeOrdinaryGoal(world, personId, "privacy"))
        return "I'd rather not get into that right now.";
      return awareness === "involved"
        ? "I was involved in that."
        : "I heard about that.";
    }
    case "remember": {
      // A matter the two of you discussed is more memorable than small talk.
      const matterTurn = [...history]
        .reverse()
        .find((event) =>
          event.tags.some((tag) => tag.startsWith("life.matter:")),
        );
      if (matterTurn?.context.choice?.startsWith(MATTER_CHOICE_PREFIX))
        return `I remember you bringing up “${matterTurn.context.choice.slice(MATTER_CHOICE_PREFIX.length)}”`;
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
    case "familyChild":
    case "familyAdopt":
      return "That's a big thing. Give me a couple of days to think about it, and I'll tell you.";
    case "acknowledge":
      return "Thanks for hearing me out.";
    case "leave":
      return "See you.";
    case "nothing":
      return parent && youngPlayer
        ? "All right. You can tell me whenever you like."
        : "All right. Another time, then.";
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
  const minutes = input.intent === "spendTime" ? 30 : 0;
  const handlers = minutes
    ? lifeActivityHandlers(input.transitionHandlers)
    : undefined;
  if (minutes) {
    const end = addSimulationMinutes(world.currentMoment, minutes);
    if (
      controlledCommitmentsBlockingMinuteAdvance(world, minutes).length ||
      handlers?.routine
        ?.projectWindows(world, end)
        .some(
          (slot) =>
            slot.kind === "work" &&
            compareSimulationMoments(slot.start, end) < 0 &&
            compareSimulationMoments(world.currentMoment, slot.end) < 0,
        )
    )
      throw new Error(
        "The half hour overlaps your scheduled activity or work. No time has passed; the agreed activity is still pending.",
      );
  }
  const advanced = minutes
    ? advanceWorldMinutes(world, minutes, handlers)
    : world;
  if (
    minutes &&
    simulationMinutesBetween(world.currentMoment, advanced.currentMoment) !==
      minutes
  )
    return advanced;
  const reply = replyFor(world, view.context, input.intent);
  const tellTopic = isTellIntent(input.intent)
    ? findTellTopic(world, input.playerPersonId, input.personId, input.intent)
    : null;
  const told = tellTopic
    ? tellAnswer(world, input.playerPersonId, input.personId, tellTopic, {
        parentOfYoungPlayer: parentOfYoungPlayer(
          world,
          input.playerPersonId,
          input.personId,
        ),
      })
    : null;
  const proposal = view.proposal;
  const matchingOffer =
    proposal?.status === "proposed" &&
    (input.intent === "acceptProposal" ||
      (input.intent === "suggestGame" && proposal.terms.activity !== "quiet") ||
      (input.intent === "suggestQuiet" && proposal.terms.activity === "quiet"));
  const accepted = matchingOffer
    ? !activeOrdinaryGoal(world, input.personId, "privacy")
    : (input.intent === "suggestGame" || input.intent === "suggestQuiet") &&
      acceptsActivity(world, input.personId, input.intent);
  const responseStatus = matchingOffer
    ? accepted
      ? "accepted"
      : "declined"
    : proposal && input.intent === "declineProposal"
      ? "declined"
      : proposal && ["cancelProposal", "leave"].includes(input.intent)
        ? "cancelled"
        : proposal && input.intent === "spendTime"
          ? "performed"
          : null;
  const newOffer =
    (input.intent === "activity" &&
      !activeOrdinaryGoal(world, input.personId, "privacy")) ||
    (!matchingOffer && accepted);
  const leisure = activityPreference(world, input.personId);
  const terms: TalkProposalTerms | null = newOffer
    ? {
        actorPersonId: input.personId,
        activity:
          input.intent === "suggestGame"
            ? "game"
            : input.intent === "suggestQuiet"
              ? "quiet"
              : leisure === "explore"
                ? "new-game"
                : leisure === "company"
                  ? ageOnDate(
                      world.people[input.playerPersonId]!.birthDate,
                      world.currentDate,
                    ) < 13 ||
                    ageOnDate(
                      world.people[input.personId]!.birthDate,
                      world.currentDate,
                    ) < 13
                    ? "game"
                    : "quiet"
                  : "familiar-game",
        minutes: 30,
        condition: null,
      }
    : null;
  const answer =
    input.intent === "suggestGame" ||
    input.intent === "suggestQuiet" ||
    input.intent === "acceptProposal"
      ? accepted
        ? "company-accepted"
        : "company-declined"
      : input.intent === "date"
        ? willingToDate(world, input.personId)
          ? "date-accepted"
          : "date-declined"
        : input.intent === "activity"
          ? leisure
          : input.intent === "matter" && view.matter
            ? `matter-${matterAwareness(world, input.personId, view.matter.eventId)}`
            : told
              ? told.heard
                ? "told"
                : "not-now"
              : latestPersonalValue(
                    world,
                    input.personId,
                    LIFE_MIND_IDS.privacy,
                  )?.orientation === "embraces"
                ? "private"
                : "open";
  const stableKey = `opening-life:talk:${input.playerPersonId}:${input.personId}:${input.revision}`;
  const intentLabel = lifeTalkIntentLabel(
    world,
    input.playerPersonId,
    input.personId,
    input.intent,
  );
  let next = recordWorldEvent(advanced, {
    stableKey,
    type: "life.conversation",
    occurredAt: advanced.currentDate,
    recordedAt: advanced.currentDate,
    jurisdictionId: world.people[input.playerPersonId]!.homeJurisdictionId,
    involvedEntityIds: currentLifeTalkScene(world, input.playerPersonId)!
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
      ...currentLifeTalkScene(world, input.playerPersonId)!
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
      `scene:${currentLifeTalkScene(world, input.playerPersonId)!.eventId}`,
      `moment:${JSON.stringify(advanced.currentMoment)}`,
      `life.answer:${answer}`,
      ...(input.intent === "matter" && view.matter
        ? [`life.matter:${view.matter.eventId}`]
        : []),
      ...(terms
        ? [
            talkProposalTag(terms),
            ...(!matchingOffer && accepted ? ["life.proposal.accepted"] : []),
          ]
        : []),
      ...(proposal && responseStatus
        ? [
            `${PROPOSAL_LINK}${proposal.request.id}`,
            `life.proposal.${responseStatus}`,
          ]
        : []),
    ],
    summary: `${personName(world.people[input.playerPersonId]!)}: ${intentLabel}. ${personName(world.people[input.personId]!)}: ${reply}`,
    context: {
      location: {
        jurisdictionId: world.people[input.playerPersonId]!.homeJurisdictionId,
        label: view.context.placeLabel,
        setting: view.context.setting,
      },
      socialContext: "A direct ordinary conversation",
      pressure: null,
      choice: view.intents.find((option) => option.key === input.intent)!.label,
      motivation: null,
      immediateReaction: reply,
    },
  });
  const event = next.history.events.at(-1)!;
  for (const personId of currentLifeTalkScene(world, input.playerPersonId)!
    .presentPersonIds)
    next = recordEventKnowledge(next, {
      stableKey: `${stableKey}:heard:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: advanced.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  // Told and taken in: the listener now knows it, from the player, as far as
  // they rely on the player's word.
  if (tellTopic?.kind === "experience" && told?.heard)
    next = recordEventKnowledge(next, {
      stableKey: `${stableKey}:told:${input.personId}`,
      personId: input.personId,
      eventId: tellTopic.eventId,
      learnedAt: advanced.currentDate,
      believedSummary: toldSummary(world, input.playerPersonId, tellTopic),
      accuracy: "accurate",
      confidence: told.confidence,
      source: {
        kind: "told-by",
        sourcePersonId: input.playerPersonId,
        claimId: null,
      },
    });
  next = recordConversationContact(next, {
    playerPersonId: input.playerPersonId,
    personId: input.personId,
    eventId: event.id,
    occurredAt: advanced.currentDate,
    // Agreeing to a game is a plan; the half hour is the time together.
    timeTogether: input.intent === "spendTime",
    date: input.intent === "date" && answer === "date-accepted",
  });
  if (input.intent === "familyChild" || input.intent === "familyAdopt")
    next = proposeFamilyPlan(next, {
      personId: input.playerPersonId,
      kind: input.intent === "familyChild" ? "birth" : "adoption",
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

/**
 * Put a conversation on the two people's shared record.
 *
 * Before this, talking to somebody wrote an event and what each person heard,
 * and nothing between the two of them: after an afternoon of talk and a game,
 * the person card still said they last spoke months ago, and time apart could
 * not be measured because time together was never recorded.
 *
 * One day's talk is one episode, whatever the number of turns, so the record
 * says the two of them spoke that day and not that they spoke eleven times, as
 * the conduct rubric for `what-moves-a-relationship` asks. All of it is contact
 * that keeps the two of them in touch and moves none of the five lines on its
 * own: a chat is slight, half an hour together or an agreed date is more, and
 * none of it is affection earned by repetition. What either of them does with
 * that time is its own conduct. A refusal writes no extra record: it is the
 * other person's answer, not a mark against anyone.
 */
function recordConversationContact(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
    readonly personId: EntityId;
    readonly eventId: EntityId;
    readonly occurredAt: IsoDate;
    readonly timeTogether: boolean;
    readonly date: boolean;
  },
): World {
  const base = `life-talk:${input.occurredAt}:${input.playerPersonId}:${input.personId}`;
  const episodes: {
    key: string;
    kind: RelationshipInteractionKind;
    significance: RelationshipSignificance;
    summary: string;
  }[] = [
    {
      key: `${base}:spoke`,
      kind: "contact:conversation",
      significance: "minor",
      summary: "Spoke together.",
    },
  ];
  if (input.timeTogether) {
    episodes.push({
      key: `${base}:time-together`,
      kind: "contact:time-together",
      significance: "meaningful",
      summary: "Spent time together.",
    });
  }
  if (input.date) {
    episodes.push({
      key: `${base}:date`,
      kind: "contact:date",
      significance: "meaningful",
      summary: "Agreed this was a date.",
    });
  }
  let next = world;
  for (const episode of episodes) {
    if (
      next.history.relationshipInteractions.some(
        (interaction) => interaction.stableKey === episode.key,
      )
    ) {
      continue;
    }
    next = recordRelationshipInteraction(next, {
      stableKey: episode.key,
      personIds: [input.playerPersonId, input.personId],
      eventId: input.eventId,
      occurredAt: input.occurredAt,
      kind: episode.kind,
      change: "maintained",
      significance: episode.significance,
      summary: episode.summary,
      tags: ["life.conversation"],
    });
  }
  return next;
}
