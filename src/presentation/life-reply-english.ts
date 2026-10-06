import { readRelationshipStanding } from "../simulation/relationship-standing";
import type { EntityId, HistoricalEvent, World } from "../simulation/types";
import {
  composeGroundedLine,
  linePartsOf,
  type ComposedLineBank,
} from "./english-composition";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "./grounded-english";
import { speakerTraits } from "./speaker-traits";
import type { SmallTalkLine } from "./small-talk-english";

/** The caller decides the speech act from records; the existing composer words it. */
const CORES = {
  "running-open-agree-warm": "You should. I think you would be good at it.",
  "running-open-agree-even": "If you want to, go ahead.",
  "running-open-agree-worn": "Well, if it is what you want.",
  "running-open-decline-warm":
    "I'm not sure that is a good idea. It could take a lot out of you.",
  "running-open-decline-even": "I'm not sure that is a good idea.",
  "running-open-decline-worn": "I don't think you should.",
  "running-open-undecided-warm":
    "Running for office? Tell me more before I say anything.",
  "running-open-undecided-even": "Tell me more before I say anything.",
  "running-open-undecided-worn": "I would want to hear a lot more first.",
  "running-help-agree": "Yes. Tell me what you need.",
  "running-help-decline": "I'll cheer you on, but I can't do the campaigning.",
  "running-help-undecided": "Let me think about it.",
  "running-worry-risk":
    "The money. A campaign costs a lot, and you could lose.",
  "running-worry-conflict": "The arguing. People get nasty in an election.",
  "running-worry-sociability": "Being in front of people all the time.",
  "running-worry-none": "Nothing yet. Just go in with your eyes open.",
  "running-election-soon": "That is not far off.",
  "running-election-later": "That gives you some time.",
  "running-election-unknown": "When is it, again?",
  "running-news-involved": "I was part of that, you know.",
  "running-news-informed": "I heard about that.",
  "running-news-uninformed":
    "I hadn't heard about that. Tell me what happened.",
  "running-remember": "I remember that.",
  "running-no-memory": "What do you mean?",
  "tell-privacy": "Can it wait? I need a little quiet right now.",
  "tell-shared-plan": "Me too. I've been meaning to {{plan}}.",
  "tell-guarded": "All right.",
  "tell-parent-plan": "That sounds like a good idea.",
  "tell-warm-plan": "That sounds good. I hope you find the time.",
  "tell-plain-plan": "Good luck with it.",
  "tell-parent-experience": "Thank you for telling me. How did that feel?",
  "tell-warm-experience": "I'm glad you told me. How did it go?",
  "tell-plain-experience": "Thanks for telling me.",
  "i-need-some-time-alone-now-lets":
    "I need some time alone now. Let’s leave it for another time.",
  "what-were-you-going-to-say": "What were you going to say?",
  "tell-me-what-happened-leave-the-pieces":
    "Tell me what happened. Leave the pieces alone; I will help with those.",
  "we-should-ask-for-help-with-the":
    "We should ask for help with the broken pieces.",
  "it-is-bedtime-put-the-toy-away": "It is bedtime. Put the toy away, please.",
  "it-is-time-to-put-the-toy": "It is time to put the toy away.",
  "would-you-try-one-bite-you-can":
    "Would you try one bite? You can tell me if you do not like it.",
  "you-do-not-have-to-pretend-you": "You do not have to pretend you like it.",
  "what-would-you-like-to-know-about":
    "What would you like to know about school?",
  "do-you-like-your-teacher": "Do you like your teacher?",
  "do-you-want-to-keep-your-snack": "Do you want to keep your snack?",
  "shall-we-try-one-round-with-that": "Shall we try one round with that rule?",
  "do-you-want-to-talk-about-the": "Do you want to talk about the story?",
  "can-you-stay-with-me-for-a": "Can you stay with me for a minute?",
  "do-you-want-to-stop-playing-tag": "Do you want to stop playing tag?",
  "should-we-move-farther-apart-so-we":
    "Should we move farther apart so we can listen?",
  "can-i-use-the-crayon-when-you": "Can I use the crayon when you finish?",
  "do-you-want-a-turn-on-the": "Do you want a turn on the swing?",
  "can-you-help-blot-the-paper": "Can you help blot the paper?",
  "can-you-show-me-the-wheel": "Can you show me the wheel?",
  "would-you-like-to-talk-about-your": "Would you like to talk about your day?",
  "shall-we-look-at-the-flyer-together": "Shall we look at the flyer together?",
  "will-you-wait-here-with-me": "Will you wait here with me?",
  "is-there-a-toy-you-want-to": "Is there a toy you want to keep?",
  "what-would-you-like-to-know-before":
    "What would you like to know before deciding?",
  "do-you-want-to-ask-about-another":
    "Do you want to ask about another shift first?",
  "what-would-you-like-to-do": "What would you like to do?",
  "yes-id-like-that-we-could-sit":
    "Yes. I'd like that. We could sit and talk for a while.",
  "no-thank-you-id-like-to-keep":
    "No, thank you. I'd like to keep this as it is.",
  "yes-id-like-to-play-a-game": "Yes, I'd like to play a game together.",
  "not-a-game-right-now-thanks-id":
    "Not a game right now, thanks. I'd rather leave it for another time.",
  "yes-lets-sit-and-talk-for-a": "Yes. Let's sit and talk for a while.",
  "id-rather-not-sit-and-talk-right":
    "I'd rather not sit and talk right now. Thanks for asking.",
  "im-glad-we-took-some-time-together": "I'm glad we took some time together.",
  "that-invitation-is-no-longer-open": "That invitation is no longer open.",
  "all-right-maybe-another-time": "All right. Maybe another time.",
  "all-right-lets-leave-it": "All right. Let’s leave it.",
  "hi-sweetheart-what-is-it": "Hi, sweetheart. What is it?",
  "hi-sweetheart": "Hi, sweetheart.",
  "hi-again": "Hi again.",
  "i-need-some-privacy-right-now-lets":
    "I need some privacy right now. Let's leave activities for another time.",
  "we-could-try-a-new-game-would":
    "We could try a new game. Would you like that?",
  "we-could-play-together-you-can-choose":
    "We could play together. You can choose the game.",
  "how-about-a-game-we-both-know": "How about a game we both know?",
  "can-we-try-a-new-game": "Can we try a new game?",
  "lets-play-a-game-together": "Let's play a game together.",
  "id-like-some-company-we-could-sit":
    "I'd like some company. We could sit and talk together.",
  "can-we-play-a-game-we-both": "Can we play a game we both know?",
  "of-course-what-do-you-want-to": "Of course. What do you want to tell me?",
  "not-right-now-can-we-talk-about":
    "Not right now. Can we talk about something else?",
  "id-rather-keep-that-to-myself-for":
    "I'd rather keep that to myself for now.",
  "sure-what-did-you-want-to-talk": "Sure. What did you want to talk about?",
  "im-listening-go-ahead": "I'm listening. Go ahead.",
  "yes-tell-me-whats-on-your-mind": "Yes. Tell me what's on your mind.",
  "that-sounds-like-a-way-id-enjoy":
    "That sounds like a way I'd enjoy spending time together.",
  "it-isnt-what-i-feel-like-doing":
    "It isn't what I feel like doing right now. We can leave it there.",
  "im-not-ready-to-talk-about-it":
    "I'm not ready to talk about it. Please leave it there.",
  "i-said-yes-because-i-want-to":
    "I said yes because I want to hear what you have to say.",
  "i-want-to-try-something-i-havent":
    "I want to try something I haven't done before.",
  "i-want-to-spend-time-with-you": "I want to spend time with you.",
  "id-like-to-do-something-i-already":
    "I'd like to do something I already enjoy.",
  "what-did-you-want-to-talk-about": "What did you want to talk about?",
  "i-hadnt-heard-about-that": "I hadn't heard about that.",
  "i-was-involved-in-that": "I was involved in that.",
  "i-heard-about-that": "I heard about that.",
  "i-dont-have-much-to-say-about":
    "I don't have much to say about the people in office right now.",
  "id-rather-not-get-into-that-right":
    "I'd rather not get into that right now.",
  "we-havent-talked-about-that": "We haven't talked about that.",
  "thanks-for-hearing-me-out": "Thanks for hearing me out.",
  "see-you": "See you.",
  "all-right-you-can-tell-me-whenever":
    "All right. You can tell me whenever you like.",
  "all-right-another-time-then": "All right. Another time, then.",
  "proposal-accepted": "Yes, let's {{activity}}.",
  "time-spent-on-proposal": "I'm glad we took time to {{activity}}.",
  "first-greeting": "Hi, {{listener}}.",
  "remembered-topic": "I remember you bringing up “{{topic}}”",
  "remembered-words": "I remember saying, “{{quote}}”",
} as const;
export type LifeReplyKey = keyof typeof CORES;

/** Follow-up questions change the subject within the actual saved situation. */
const FOLLOWUPS: Partial<Record<LifeReplyKey, string>> = {
  "first-greeting": "How are you?",
  "tell-me-what-happened-leave-the-pieces": "Did anyone get hurt?",
  "it-is-bedtime-put-the-toy-away": "Do you need help putting it away?",
  "would-you-try-one-bite-you-can": "What do you think of it?",
  "do-you-like-your-teacher": "What do you like doing at school?",
  "do-you-want-to-keep-your-snack": "Would you rather trade?",
  "shall-we-try-one-round-with-that": "Do you want to go first?",
  "can-i-use-the-crayon-when-you": "What are you drawing?",
  "do-you-want-a-turn-on-the": "Do you want me to wait?",
  "can-you-show-me-the-wheel": "What happened to it?",
  "would-you-like-to-talk-about-your": "Is there anything you want to tell me?",
  "shall-we-look-at-the-flyer-together": "Where should we look first?",
  "will-you-wait-here-with-me": "Can we cross together?",
  "is-there-a-toy-you-want-to": "Which one matters most to you?",
  "what-would-you-like-to-know-before":
    "Are you leaning toward school or work?",
  "do-you-want-to-ask-about-another": "Would you rather keep the class?",
  "i-was-involved-in-that": "What have you heard about it?",
  "i-heard-about-that": "How did you hear about it?",
  "remembered-topic": "What happened after that?",
};

export const LIFE_REPLY_BANKS: Readonly<
  Record<LifeReplyKey, ComposedLineBank>
> = Object.fromEntries(
  Object.entries(CORES).map(([key, text]) => {
    const followup = FOLLOWUPS[key as LifeReplyKey];
    const boundary = text.search(/[.!?] /);
    const core = boundary < 0 ? text : text.slice(0, boundary + 1);
    const continuation = boundary < 0 ? null : text.slice(boundary + 2);
    const bank: ComposedLineBank = {
      key: `life-reply.${key}`,
      version: "1",
      surface: "dialogue",
      act: key === "first-greeting" ? "greet" : "answer",
      parts: {
        ...(key.startsWith("tell-")
          ? {
              opener: {
                variants: [
                  {
                    key: "known-person",
                    kind: "template" as const,
                    text: "{{known-person}}?",
                    requiresFacts: ["known-person"],
                  },
                ],
              },
            }
          : {}),
        core: { variants: [{ key: "core", kind: "template", text: core }] },
        ...(continuation
          ? {
              reason: {
                variants: [
                  { key: "continuation", kind: "template", text: continuation },
                ],
              },
            }
          : {}),
        ...(followup
          ? {
              closer: {
                variants: [
                  {
                    key: "ask-followup",
                    kind: "template",
                    text: followup,
                    requiresTraits: [
                      { holder: "speaker", traitKey: "expression:ask" },
                    ],
                  },
                  ...(key === "first-greeting"
                    ? [
                        {
                          key: "invite-listener",
                          kind: "template" as const,
                          text: "Go ahead. I'm listening.",
                          requiresTraits: [
                            {
                              holder: "speaker" as const,
                              traitKey: "expression:listen",
                            },
                          ],
                        },
                      ]
                    : []),
                ],
              },
            }
          : {}),
      },
    };
    return [key, bank];
  }),
) as Record<LifeReplyKey, ComposedLineBank>;

export function lifeReplyLine(
  world: World,
  speakerId: EntityId,
  playerId: EntityId,
  history: readonly HistoricalEvent[],
  key: LifeReplyKey,
  facts: Readonly<Record<string, GroundedEnglishFact>> = {},
): SmallTalkLine {
  const bank = LIFE_REPLY_BANKS[key];
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    worldSeed: world.seed,
    momentKey: `life-reply:${speakerId}:${playerId}:${world.currentDate}:${world.history.nextSequence}`,
    bankVersion: bank.version,
    stage: key,
    sourceRecordIds: [speakerId, playerId],
    facts,
    speaker: { personId: speakerId, traits: speakerTraits(world, speakerId) },
    viewer: { personId: playerId, traits: speakerTraits(world, playerId) },
    // Each passed fact is the speaker's own proposal, own words, shared turn,
    // or the listener's known name. Unknown matters are not passed here.
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: speakerId,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  };
  const line = composeGroundedLine(packet, bank, {
    relationship: readRelationshipStanding(world, speakerId, playerId),
    recentPartKeys: history.flatMap((event) => linePartsOf(event.tags) ?? []),
  });
  if (line.kind !== "rendered")
    throw new Error(
      `Cannot word life reply ${key}: ${line.reasons.join("; ")}`,
    );
  return { text: line.text, parts: line.parts };
}
