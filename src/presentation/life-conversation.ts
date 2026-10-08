import { recordConversationContact } from "./conversation-contact";
import { lifeReplyLine, type LifeReplyKey } from "./life-reply-english";
import type { GroundedEnglishFact } from "./grounded-english";
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
  linePartsOf,
  linePartsTag,
  type ComposedPart,
} from "./english-composition";
import {
  greetAgainLine,
  matterUninformedLine,
  officialViewLine,
  strongestLivedOutcomeView,
  strongestOfficialView,
  type SmallTalkLine,
} from "./small-talk-english";
import { speechRememberedLine } from "./speech-remembered-english";
import {
  answerRunning,
  isRunningIntent,
  runningTopicLabel,
  runningTopics,
  type RunningIntent,
} from "./life-talk-running";
import {
  ageOnDate,
  describePersonContext,
  personName,
  recordEventKnowledge,
  recordWorldEvent,
  advanceWorldMinutes,
  simulationMinutesBetween,
  controlledCommitmentsBlockingMinuteAdvance,
  addSimulationMinutes,
  compareSimulationMoments,
} from "../simulation";
import { LIFE_MIND_IDS } from "../simulation/life-mind-content";
import {
  projectPlayedSceneExchange,
  playedSceneEnglishPacket,
} from "./scene-conversation";
import type { StorySceneSnapshot } from "./story-scene-resolver";
import { composePlayedSceneLine } from "./small-talk-english";
import { evaluateReplyMeaning } from "./reply-meaning";
import { conversationStanding } from "./conversation-consequences";
import { recordDurableDecisionTrace } from "../simulation/decisions";
import {
  claimStanceTag,
  recordPlayerClaim,
  type ClaimStance,
} from "../simulation/claim-stances";
import { scheduleContradictionCheck } from "../simulation/claim-contradictions";
import { speakerTraits } from "./speaker-traits";
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
  scene: "Talk about what is happening here",
  activity: "Ask what they would like to do",
  explain: "Ask why",
  share: "Ask if you can tell them something",
  matter: "Mention something in the news",
  officials: "Ask what they think of the people in office",
  remember: "Talk about an earlier conversation",
  acknowledge: "Let them know you heard",
  leave: "Say goodbye",
  spendTime: "Spend half an hour together",
  acceptProposal: "Agree to their suggestion",
  declineProposal: "Decline their suggestion",
  cancelProposal: "Cancel your plans together",
  nothing: "Say it can wait",
} as const;
/**
 * A fixed intent, or telling them one particular thing from the player's own
 * life (`tell:<topic>`); see `life-talk-topics.ts`.
 */
export type LifeTalkIntent =
  | keyof typeof LIFE_TALK_INTENTS
  | `${typeof TELL_PREFIX}${string}`
  | RunningIntent;

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
  if (isRunningIntent(intent))
    return runningTopicLabel(world, playerPersonId, personId, intent);
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
  readonly setting: "home" | "school" | "neighborhood" | "work";
  readonly placeLabel: string;
  readonly jurisdictionId: EntityId;
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
    jurisdictionId:
      event?.context.location?.jurisdictionId ??
      world.people[playerPersonId]!.homeJurisdictionId,
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
  // Telling them you are thinking of running: while that talk is under way it
  // is the whole conversation, three to eight exchanges (life-talk-running.ts).
  const running = runningTopics(world, playerPersonId, personId);
  if (running.inThread)
    return {
      context,
      person: describePersonContext(world, playerPersonId, personId)!,
      revision: world.history.nextSequence,
      proposal: null,
      matter: null,
      intents: [
        ...running.topics,
        ...(running.mayLeave
          ? [{ key: "leave" as LifeTalkIntent, label: LIFE_TALK_INTENTS.leave }]
          : []),
      ],
      transcript: history.map((event) => ({
        eventId: event.id,
        date: event.occurredAt,
        action: event.context.choice!,
        reply: event.context.immediateReaction!,
      })),
    };
  const intents: LifeTalkIntent[] = ["greet", "scene", "activity", "share"];
  intents.push(...running.topics.map((topic) => topic.key));
  // A current public or known matter the player could actually raise; the
  // counterpart's answer depends on what their own records say they know.
  const matter = currentKnownMatter(world, playerPersonId);
  if (matter) intents.push("matter");
  // Only someone who has formed a view of an official, over a law they felt
  // or something that happened to them, has one to give; a child is not asked.
  if (
    ageOnDate(world.people[personId]!.birthDate, world.currentDate) >= 18 &&
    (strongestOfficialView(world, personId) !== null ||
      strongestLivedOutcomeView(world, personId) !== null)
  )
    intents.push("officials");
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
  if (["activity", "share"].includes(previousIntent ?? ""))
    intents.push("explain");
  if (history.length > 0) intents.push("remember", "acknowledge");
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
  if (
    !history.some(
      (event) =>
        event.tags.includes(`scene:${currentSceneId}`) &&
        event.tags.includes("life.talk:spendTime"),
    ) &&
    proposal?.status === "accepted"
  )
    intents.push("spendTime");
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
                : isRunningIntent(key)
                  ? (running.topics.find((topic) => topic.key === key)?.label ??
                    LIFE_TALK_INTENTS.leave)
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
/**
 * The counterpart's reply, and the reviewed parts it was built from when the
 * English engine worded it. The parts are saved with the turn so a person
 * does not keep reaching for the same words with the player.
 */
function replyWithParts(
  world: World,
  context: LifeTalkContext,
  intent: LifeTalkIntent,
): { readonly text: string; readonly parts: readonly ComposedPart[] } {
  let parts: readonly ComposedPart[] = [];
  const text = replyFor(world, context, intent, (line) => {
    parts = line.parts;
    return line.text;
  });
  return { text, parts };
}

function replyFor(
  world: World,
  context: LifeTalkContext,
  intent: LifeTalkIntent,
  worded: (line: SmallTalkLine) => string,
): string {
  const { playerPersonId, personId } = context;
  const history = turns(world, playerPersonId, personId);
  const say = (
    key: LifeReplyKey,
    facts: Readonly<Record<string, GroundedEnglishFact>> = {},
  ) =>
    worded(lifeReplyLine(world, personId, playerPersonId, history, key, facts));
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
    proposal?.status === "proposed" && intent === "acceptProposal";
  if (matchesProposal)
    return activeOrdinaryGoal(world, personId, "privacy")
      ? say("i-need-some-time-alone-now-lets")
      : say("proposal-accepted", {
          activity: {
            text: proposal.label.replace("you both", "we both"),
            sourceRecordIds: [proposal.request.id],
          },
        });
  const privatePerson =
    latestPersonalValue(world, personId, LIFE_MIND_IDS.privacy)?.orientation ===
    "embraces";
  if (isRunningIntent(intent))
    throw new Error(
      "A step of the talk about running is answered by answerRunning.",
    );
  if (isTellIntent(intent)) {
    const topic = findTellTopic(world, playerPersonId, personId, intent);
    if (!topic) return say("what-were-you-going-to-say");
    const answer = tellAnswer(world, playerPersonId, personId, topic, {
      parentOfYoungPlayer: parent && youngPlayer,
    });
    return worded({ text: answer.reply, parts: answer.parts });
  }
  switch (intent) {
    case "scene": {
      // The only established topic is the scene's saved premise, not a new
      // worry or a fabricated past exchange attributed to this person.
      return say("what-would-you-like-to-do");
    }
    case "spendTime":
      return proposal
        ? say("time-spent-on-proposal", {
            activity: {
              text: proposal.label.replace("you both", "we both"),
              sourceRecordIds: [proposal.request.id],
            },
          })
        : say("im-glad-we-took-some-time-together");
    case "acceptProposal":
      return say("that-invitation-is-no-longer-open");
    case "declineProposal":
      return say("all-right-maybe-another-time");
    case "cancelProposal":
      return say("all-right-lets-leave-it");
    case "greet":
      if (parent && youngPlayer)
        return history.length
          ? say("hi-sweetheart-what-is-it")
          : say("hi-sweetheart");
      if (history.length) {
        const again = greetAgainLine(world, personId, playerPersonId, history);
        return again ? worded(again) : say("hi-again");
      }
      return say("first-greeting", {
        listener: {
          text: world.people[playerPersonId]!.givenName,
          sourceRecordIds: [playerPersonId],
        },
      });
    case "activity":
      if (activeOrdinaryGoal(world, personId, "privacy"))
        return say("i-need-some-privacy-right-now-lets");
      if (parent && youngPlayer)
        return leisure === "explore"
          ? say("we-could-try-a-new-game-would")
          : leisure === "company"
            ? say("we-could-play-together-you-can-choose")
            : say("how-about-a-game-we-both-know");
      if (leisure === "explore")
        return child
          ? say("can-we-try-a-new-game")
          : say("we-could-try-a-new-game-would");
      if (leisure === "company")
        return child
          ? say("lets-play-a-game-together")
          : say("id-like-some-company-we-could-sit");
      return child
        ? say("can-we-play-a-game-we-both")
        : say("how-about-a-game-we-both-know");
    case "share":
      if (parent && youngPlayer) return say("of-course-what-do-you-want-to");
      if (privatePerson)
        return child
          ? say("not-right-now-can-we-talk-about")
          : say("id-rather-keep-that-to-myself-for");
      if (approach === "ask") return say("sure-what-did-you-want-to-talk");
      if (approach === "listen") return say("im-listening-go-ahead");
      return say("yes-tell-me-whats-on-your-mind");
    case "explain":
      if (previous?.tags.includes("life.talk:share"))
        return previous.tags.includes("life.answer:private")
          ? say("im-not-ready-to-talk-about-it")
          : say("i-said-yes-because-i-want-to");
      return previous?.tags.includes("life.answer:explore")
        ? say("i-want-to-try-something-i-havent")
        : previous?.tags.includes("life.answer:company")
          ? say("i-want-to-spend-time-with-you")
          : say("id-like-to-do-something-i-already");
    case "matter":
    case "officials": {
      if (intent === "matter") {
        const matter = currentKnownMatter(world, playerPersonId);
        if (!matter) return say("what-did-you-want-to-talk-about");
        const awareness = matterAwareness(world, personId, matter.eventId);
        if (awareness === "uninformed") {
          const unheard = matterUninformedLine(
            world,
            personId,
            playerPersonId,
            history,
            matter.eventId,
          );
          return unheard ? worded(unheard) : say("i-hadnt-heard-about-that");
        }
        if (!activeOrdinaryGoal(world, personId, "privacy"))
          return awareness === "involved"
            ? say("i-was-involved-in-that")
            : say("i-heard-about-that");
      } else if (!activeOrdinaryGoal(world, personId, "privacy")) {
        const line = officialViewLine(world, personId, playerPersonId, history);
        return line ? worded(line) : say("i-dont-have-much-to-say-about");
      }
      // Someone keeping to themselves declines either question the same way.
      // The sentence is written once, so its one prose anchor stays settled.
      return say("id-rather-not-get-into-that-right");
    }
    case "remember": {
      // A matter the two of you discussed is more memorable than small talk.
      const matterTurn = [...history]
        .reverse()
        .find((event) =>
          event.tags.some((tag) => tag.startsWith("life.matter:")),
        );
      if (matterTurn?.context.choice?.startsWith(MATTER_CHOICE_PREFIX))
        return say("remembered-topic", {
          topic: {
            text: matterTurn.context.choice.slice(MATTER_CHOICE_PREFIX.length),
            sourceRecordIds: [matterTurn.id],
          },
        });
      // The player's own speech, once, if this person heard it or was told.
      const spokeOfSpeech = history.some((event) =>
        (linePartsOf(event.tags) ?? []).some((key) =>
          key.startsWith("small-talk.speech-remembered:"),
        ),
      );
      const speech = spokeOfSpeech
        ? null
        : speechRememberedLine(world, personId, playerPersonId);
      if (speech) return worded(speech);
      const remembered =
        history.find(
          (event) =>
            event.tags.includes("life.talk:activity") ||
            event.tags.includes("life.talk:share"),
        ) ?? previous;
      return remembered
        ? say("remembered-words", {
            quote: {
              text: remembered.context.immediateReaction!,
              sourceRecordIds: [remembered.id],
            },
          })
        : say("we-havent-talked-about-that");
    }
    case "acknowledge":
      return say("thanks-for-hearing-me-out");
    case "leave":
      return say("see-you");
    case "nothing":
      return parent && youngPlayer
        ? say("all-right-you-can-tell-me-whenever")
        : say("all-right-another-time-then");
  }
}

export function commitLifeConversation(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
    readonly personId: EntityId;
    readonly intent: LifeTalkIntent;
    readonly revision: number;
    /** Resolved room hearers, excluding the speaker; omitted means normal speech. */
    readonly actualListenerPersonIds?: readonly EntityId[];
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
  const presentPersonIds = currentLifeTalkScene(
    world,
    input.playerPersonId,
  )!.presentPersonIds;
  const listenerIds = new Set(
    input.actualListenerPersonIds ??
      presentPersonIds.filter((id) => id !== input.playerPersonId),
  );
  if (
    !listenerIds.has(input.personId) ||
    [...listenerIds].some(
      (id) => id === input.playerPersonId || !presentPersonIds.includes(id),
    )
  )
    throw new Error(
      "Conversation hearers must be present and include the counterpart.",
    );
  const heardPersonIds = presentPersonIds.filter(
    (id) => id === input.playerPersonId || listenerIds.has(id),
  );
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
  const stableKey = `opening-life:talk:${input.playerPersonId}:${input.personId}:${input.revision}`;
  // A step of the talk about running: the listener's answer, and for a
  // decision, the decision itself kept with its reasons before the turn.
  const running = isRunningIntent(input.intent)
    ? answerRunning(
        world,
        input.playerPersonId,
        input.personId,
        input.intent,
        stableKey,
      )
    : null;
  const advanced = running
    ? running.world
    : minutes
      ? advanceWorldMinutes(world, minutes, handlers)
      : world;
  if (
    minutes &&
    simulationMinutesBetween(world.currentMoment, advanced.currentMoment) !==
      minutes
  )
    return advanced;
  const { text: reply, parts: replyParts } = running
    ? { text: running.reply, parts: running.parts }
    : replyWithParts(world, view.context, input.intent);
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
    proposal?.status === "proposed" && input.intent === "acceptProposal";
  const accepted = matchingOffer
    ? !activeOrdinaryGoal(world, input.personId, "privacy")
    : false;
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
    input.intent === "activity" &&
    !activeOrdinaryGoal(world, input.personId, "privacy");
  const leisure = activityPreference(world, input.personId);
  const terms: TalkProposalTerms | null = newOffer
    ? {
        actorPersonId: input.personId,
        activity:
          leisure === "explore"
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
  const answer = running
    ? running.answer
    : input.intent === "acceptProposal"
      ? accepted
        ? "company-accepted"
        : "company-declined"
      : input.intent === "activity"
        ? leisure
        : input.intent === "matter" && view.matter
          ? `matter-${matterAwareness(world, input.personId, view.matter.eventId)}`
          : told
            ? told.heard
              ? "told"
              : "not-now"
            : latestPersonalValue(world, input.personId, LIFE_MIND_IDS.privacy)
                  ?.orientation === "embraces"
              ? "private"
              : "open";
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
    jurisdictionId: view.context.jurisdictionId,
    involvedEntityIds: heardPersonIds,
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
      ...heardPersonIds
        .filter((id) => id !== input.playerPersonId && id !== input.personId)
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
      ...(replyParts.length > 0 ? [linePartsTag(replyParts)] : []),
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
    // A news choice already ends with its headline's own period.
    summary: `${personName(world.people[input.playerPersonId]!)}: ${intentLabel}${/[.?!]$/.test(intentLabel) ? "" : "."} ${personName(world.people[input.personId]!)}: ${reply}`,
    context: {
      location: {
        jurisdictionId: view.context.jurisdictionId,
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
  for (const personId of heardPersonIds)
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
    timeTogether: input.intent === "spendTime",
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

/** The existing central recorder accepts only a freshly re-read scene offer.
 * Caller-supplied prose, people, evidence and effects are never admitted. */
export function commitPlayedSceneTurn(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
    readonly addresseePersonId: EntityId;
    readonly replyKey: string;
    readonly snapshot: StorySceneSnapshot;
  },
): World {
  const scene = projectPlayedSceneExchange(
    world,
    input.playerPersonId,
    input.addresseePersonId,
  );
  if (
    !scene ||
    JSON.stringify(scene.snapshot) !== JSON.stringify(input.snapshot)
  )
    throw new Error("This scene offer is no longer current.");
  const offer = scene.replies.find((reply) => reply.key === input.replyKey);
  if (!offer)
    throw new Error("This reply is unavailable in the current recorded scene.");
  const presence = world.history.events.find(
    (event) => event.id === scene.presenceEventId,
  )!;
  const key = `played-scene:${scene.presenceEventId}:${world.history.nextSequence}:${input.playerPersonId}`;
  let next = world;
  let reply = "";
  let replyParts: readonly ComposedPart[] = [];
  let reason: string | null = null;
  if (offer.primitive === "ask-record") {
    const decided = evaluateReplyMeaning(world, {
      turnKey: key,
      actorPersonId: input.addresseePersonId,
      playerPersonId: input.playerPersonId,
      decisionType: "life-talk.recorded-matter",
      subjectKind: "context:recorded-matter",
      subjectKey: `${offer.sourceEventId}:${input.playerPersonId}:${input.addresseePersonId}`,
      standing: conversationStanding(
        world,
        input.playerPersonId,
        input.addresseePersonId,
        `scene.matter:${offer.sourceEventId}:${input.playerPersonId}:${input.addresseePersonId}`,
      ),
      meanings: {
        agree: {
          key: "listen",
          description: "Hear this person's recorded matter.",
        },
        decline: {
          key: "decline",
          description: "Decline to discuss this matter.",
        },
        undecided: {
          key: "undecided",
          description: "Leave the discussion undecided.",
        },
      },
      traitLeans: [
        {
          meaning: "agree",
          trait: "sociability",
          pole: "high",
          explanation: "I prefer talking things through with people.",
        },
        {
          meaning: "decline",
          trait: "sociability",
          pole: "low",
          explanation: "I prefer to keep to myself.",
        },
        {
          meaning: "undecided",
          trait: "deliberation",
          pole: "low",
          explanation: "I'd rather think before I answer.",
        },
      ],
      playerLeans: [],
    });
    next = recordDurableDecisionTrace(decided.world, decided.evaluation);
    const trace = next.history.decisionTraces.at(-1)!;
    const supporting = decided.evaluation.context.considerations.filter(
      (row) =>
        row.optionKey === decided.evaluation.selectedOptionKey &&
        row.direction === "supports",
    );
    const wordedReasons: Record<string, string> = {
      "social:warmth": "I'm not comfortable talking with you about this.",
      "social:trust": "I'm not sure I can rely on what you tell me.",
      "social:tension": "There's still something unsettled between us.",
      "social:existing-commitments": "I already have something to attend to.",
      "mind:appraisal": "Something between us went badly before.",
      "context:raised-before": "We've already discussed this more than once.",
    };
    reason = supporting
      .map((row) => wordedReasons[row.sourceType] ?? row.explanation)
      .join(" ");
    if (decided.evaluation.outcomeKind === "undecided")
      reason = "I have not settled what to do with the reasons on either side.";
    const packet = {
      surface: "dialogue" as const,
      momentKey: key,
      worldSeed: next.seed,
      bankVersion: "1",
      stage: "current",
      sourceRecordIds: [presence.id, trace.id],
      facts: { reason: { text: reason, sourceRecordIds: [trace.id] } },
      speaker: {
        personId: input.addresseePersonId,
        traits: speakerTraits(next, input.addresseePersonId),
      },
      viewer: {
        personId: input.playerPersonId,
        traits: speakerTraits(next, input.playerPersonId),
      },
      knowledge: [
        {
          personId: input.addresseePersonId,
          factKey: "reason",
          sourceRecordIds: [trace.id],
        },
      ],
    };
    const line = composePlayedSceneLine(
      packet,
      decided.meaning === "counter" ? "undecided" : decided.meaning,
    );
    if (line.kind !== "rendered")
      throw new Error(
        "The recorded answer cannot be worded from its evidence.",
      );
    reply = line.text;
    replyParts = line.parts;
  } else if (offer.primitive !== "depart") {
    const packet = playedSceneEnglishPacket(
      next,
      input.playerPersonId,
      input.addresseePersonId,
      presence.id,
      presence.summary,
    )!;
    const line = composePlayedSceneLine(packet, "acknowledge");
    if (line.kind !== "rendered")
      throw new Error("The recorded hearing cannot be worded.");
    reply = line.text;
    replyParts = line.parts;
  }
  const listeners = scene.participantPersonIds.filter(
    (id) => id !== input.playerPersonId,
  );
  const stance: ClaimStance | null =
    offer.primitive === "tell-record" || offer.primitive === "deny-record"
      ? {
          version: 1,
          propositionKey: `recorded-event:${offer.sourceEventId}`,
          proposition: world.history.knowledge.find(
            (row) => row.id === offer.knowledgeId,
          )!.believedSummary,
          asserted: offer.primitive === "deny-record" ? "denies" : "affirms",
          speakerBelief: "believes-true",
          intent: offer.primitive === "deny-record" ? "deceive" : "truthful",
          statement: offer.line.text,
          beliefEvidenceIds: [offer.sourceEventId, offer.knowledgeId!],
          recipientPersonIds: listeners,
          audibility: "normal",
          sourceEntityIds: [offer.sourceEventId],
        }
      : null;
  next = recordWorldEvent(next, {
    stableKey: key,
    type: "life.conversation",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: presence.context.location!.jurisdictionId,
    involvedEntityIds: scene.participantPersonIds,
    participants: [
      {
        personId: input.playerPersonId,
        role: "agency:initiator",
        detail: offer.line.text,
      },
      {
        personId: input.playerPersonId,
        role: "focus:subject",
        detail: "Spoke in the recorded room",
      },
      {
        personId: input.addresseePersonId,
        role: "coordination:counterpart",
        detail: reply || "Present as the player left the exchange",
      },
      ...listeners
        .filter((id) => id !== input.addresseePersonId)
        .map((personId) => ({
          personId,
          role: "observation:witness" as const,
          detail: "Heard normal speech in the recorded room",
        })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "life.conversation",
      "scene.composed-turn",
      `scene:${presence.id}`,
      `scene.matter:${offer.sourceEventId}:${input.playerPersonId}:${input.addresseePersonId}`,
      `english.source-records.v1:${JSON.stringify([...new Set([...offer.line.sourceRecordIds, presence.id])])}`,
      linePartsTag([...offer.line.parts, ...replyParts]),
      ...(stance ? [claimStanceTag(stance)] : []),
    ],
    summary: `${personName(next.people[input.playerPersonId]!)}: ${offer.line.text}${reply ? ` ${personName(next.people[input.addresseePersonId]!)}: ${reply}` : ""}`,
    context: {
      ...presence.context,
      socialContext: "A direct exchange among recorded participants",
      pressure: null,
      choice: offer.line.text,
      motivation: reason,
      immediateReaction: reply || null,
    },
  });
  const event = next.history.events.at(-1)!;
  for (const personId of scene.participantPersonIds)
    next = recordEventKnowledge(next, {
      stableKey: `${key}:heard:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  if (stance) {
    next = recordPlayerClaim(next, {
      stableKey: key,
      eventId: event.id,
      speakerPersonId: input.playerPersonId,
      audience: listeners.length > 1 ? "limited" : "private",
      stance,
      worldTruth: "true",
    });
    next = scheduleContradictionCheck(next, {
      stanceEventId: event.id,
      speakerPersonId: input.playerPersonId,
      stance,
      jurisdictionId: presence.context.location!.jurisdictionId,
    });
  }
  return recordConversationContact(next, {
    playerPersonId: input.playerPersonId,
    personId: input.addresseePersonId,
    eventId: event.id,
    occurredAt: next.currentDate,
    timeTogether: false,
  });
}
