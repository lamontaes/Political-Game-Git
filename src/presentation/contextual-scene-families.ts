import type { EntityId, IsoDate, World } from "../simulation";
import { officePhrase } from "./english-grammar";
import { addDays } from "../simulation";
import {
  acceptChapterInvitation,
  canJoinPartyChapter,
  joinPartyChapter,
  projectPartyEncounters,
} from "../simulation/living-world/party-chapters";
import { personTrait } from "../simulation/people-traits";
import { deriveRelationshipSummary } from "../simulation/queries";
import {
  answerContact,
  counterWithNewDay,
  openProposal,
} from "../simulation/people-contact";
import {
  stateCampaignStand,
  type LiveQuestion,
} from "../simulation/campaign-stands";
import {
  answerFavorAsk,
  openFavorAsk,
  type FavorAskAnswer,
} from "../simulation/favor-collection";
import {
  decideStudyPeerOutcome,
  recordStudyAnswer,
  studyAnswered,
} from "../simulation/people-study";
import {
  PROPOSABLE_APPROACHES,
  decideStudyPlanOutcome,
  peerStudyApproach,
  recordStudyPlanAnswer,
  recordStudyProposals,
  studyApproach,
  studyPlanProposals,
  studyPlanResting,
  studyPlanSettled,
} from "../simulation/people-study-plan";
import type {
  StudyApproach,
  StudyPlanOutcome,
} from "../simulation/people-study-plan";
import type { StudyPeerOutcome } from "../simulation/people-study";
import type { BoundScene, SceneFamily } from "../simulation/scene-bindings";
import { declineCalendarActivity } from "./calendar-time-control";
import type {
  SceneAnswer,
  SceneContext,
  SceneFamilyDefinition,
} from "./contextual-scenes";
import { householdConversationRoom } from "./ordinary-life";
import { proseDate } from "./prose-dates";
import type { ConversationRoomContext } from "./run-b-conversation";

/**
 * The authored content of the six contextual families (PROSE B).
 *
 * Every sentence here reads a bound fact or says nothing about it. Lines
 * within one bank mean the same thing; banks differ between situations. The
 * player's own words are written out in `statement`, because those are the
 * words a listener heard and a later contradiction quotes. Record sentences
 * quote those words rather than paraphrase them with a pronoun, so the journal
 * reads correctly when it turns "The player" into "You".
 */

/* -------------------------------------------------------------------------- */
/* Shared wording helpers                                                      */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function daysApart(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/** "tomorrow", "Tuesday", "on October 6, 2026", said from today. */
export function spokenDay(date: IsoDate, today: IsoDate): string {
  const gap = daysApart(today, date);
  if (gap === 0) return "today";
  if (gap === 1) return "tomorrow";
  if (gap > 1 && gap < 7) {
    return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
  }
  return `on ${proseDate(date)}`;
}

function fill(line: string, values: Readonly<Record<string, string>>): string {
  return line.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) {
      throw new Error(`A scene line needs a value for {${key}}.`);
    }
    return value;
  });
}

function says(context: SceneContext, lines: readonly string[]): string[] {
  return lines.map((line) => fill(line, { name: context.name }));
}

/** "See you Tuesday"; a date weeks away is just "See you then". */
function seeYou(day: string): string {
  return day.startsWith("on ") ? "See you then" : `See you ${day}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** A kitchen with the speaker in it, and whoever else lives there. */
function homeRoom(
  world: World,
  bound: BoundScene,
): ConversationRoomContext | null {
  const home = householdConversationRoom(world, bound.binding.playerPersonId);
  if (!home) return null;
  const speakerId = bound.binding.speakerPersonId;
  if (!home.eligibleAddresseePersonIds.includes(speakerId)) return null;
  const others = home.eligibleAddresseePersonIds.filter(
    (id) => id !== speakerId,
  );
  return {
    ...home,
    sceneKey: `contextual:${bound.binding.family}:${bound.eventId}`,
    roles: { "the-other-person": speakerId },
    eligibleAddresseePersonIds: [speakerId],
    privateAvailable: others.length === 0,
    privateUnavailableReason:
      others.length === 0
        ? null
        : "Another housemate is home, and the rooms here do not really close.",
  };
}

function withoutSpeakerOthers(
  world: World,
  bound: BoundScene,
): ConversationRoomContext | null {
  const { binding } = bound;
  if (!world.people[binding.speakerPersonId]) return null;
  if (!world.jurisdictions[binding.jurisdictionId]) return null;
  const present = [binding.playerPersonId, binding.speakerPersonId];
  return {
    sceneKey: `contextual:${binding.family}:${bound.eventId}`,
    roles: { "the-other-person": binding.speakerPersonId },
    locationLabel: binding.place,
    jurisdictionId: binding.jurisdictionId,
    playerPersonId: binding.playerPersonId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: [binding.speakerPersonId],
    normalHearingPersonIds: present,
    quietAmbientHearingPersonIds: [],
    privateAvailable: true,
    privateUnavailableReason: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Claims that came back — shared by every family that can hold a stance       */
/* -------------------------------------------------------------------------- */

function cameBackAnswers(
  context: SceneContext,
  admit: { readonly statement: string; readonly replies: readonly string[] },
  deny: { readonly statement: string; readonly replies: readonly string[] },
): SceneAnswer[] {
  const [foundId, stanceEventId] = context.binding.sourceEntityIds;
  const said = context.fact("statement");
  return [
    {
      key: "admit-it",
      label: "Admit it",
      description: "Say you knew otherwise when you said it.",
      truthIntent: "sincere",
      statement: admit.statement,
      replies: says(context, admit.replies),
      record: `The player admitted to ${context.name} that the earlier answer was not true.`,
      stance: {
        propositionKey: `knew:${stanceEventId}`,
        proposition: `The player knew “${said}” was untrue when they said it.`,
        asserted: "affirms",
        speakerBelief: "believes-true",
        intent: "truthful",
        beliefEvidenceIds: [stanceEventId!],
        sourceEntityIds: [foundId!, stanceEventId!],
        worldTruth: "true",
      },
      relationship: {
        kind: "support:owned-a-mistake",
        change: "maintained",
        significance: "meaningful",
        summary: ({ playerName, otherName }) =>
          `${playerName} admitted to ${otherName} that they had not told the truth.`,
      },
    },
    {
      key: "keep-denying",
      label: "Deny it",
      description: "Stand by what you said.",
      truthIntent: "deliberate-deception",
      lieVariantOf: "admit-it",
      statement: deny.statement,
      replies: says(context, deny.replies),
      record: `The player stood by the earlier answer to ${context.name}, knowing it was not true.`,
      perception: `${context.player.givenName} stood by an answer that ${context.name} knows was not true.`,
      // What is denied now is the earlier answer itself, which the listener
      // already knows; nothing further is scheduled for it.
      stance: {
        propositionKey: `said:${stanceEventId}`,
        proposition: `The player told ${context.name}: “${said}”`,
        asserted: "denies",
        speakerBelief: "believes-true",
        intent: "deceive",
        beliefEvidenceIds: [stanceEventId!],
        sourceEntityIds: [foundId!, stanceEventId!],
        worldTruth: "true",
      },
      relationship: {
        kind: "conflict:misled",
        change: "strained",
        significance: "meaningful",
        summary: ({ playerName, otherName }) =>
          `${playerName} repeated a denial ${otherName} knew was false.`,
      },
    },
  ];
}

function memoryCorrectedAnswers(context: SceneContext): SceneAnswer[] {
  return [
    {
      key: "thank-for-correction",
      label: "Thank them for the correction",
      description: "You answered from memory and got it wrong.",
      statement: "I had that wrong. Thanks for checking.",
      replies: says(context, [
        "“It happens. I just wanted it right,” {name} says.",
        "“No harm done,” {name} says.",
      ]),
      record: `The player thanked ${context.name} for correcting an answer given from memory.`,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* 1. Home and time: an evening that is already spoken for                     */
/* -------------------------------------------------------------------------- */

/**
 * Somebody asks to meet (CRUNCH47 B1, P3).
 *
 * Yes, no, or a different day: three real answers, and the counter-offer is a
 * request of its own, so the person who asked first still gets to say no to it.
 * Agreeing puts the evening on both calendars and nothing more; the meeting
 * itself happens in its own hour.
 */
function meetUpAnswers(context: SceneContext): SceneAnswer[] {
  const proposalEventId = context.binding.sourceEntityIds[0]!;
  const on = context.binding.date!;
  const spoken = spokenDay(on, context.world.currentDate);
  const later = addDays(on, 7);
  return [
    {
      key: "say-yes",
      label: `Say ${spoken} works`,
      description: "Put it on the calendar.",
      statement: `${spoken.charAt(0).toUpperCase()}${spoken.slice(1)} works. I\u2019ll be there.`,
      replies: says(context, [
        "\u201cGood. It\u2019s been too long,\u201d {name} says.",
        "\u201cThat\u2019s settled, then,\u201d {name} says.",
      ]),
      record: `The player agreed to meet ${context.name} ${spoken}.`,
      apply: (world) =>
        answerContact(world, {
          proposalEventId,
          answer: "accept",
          note: `Agreed to meet ${spoken}.`,
        }).world,
      relationship: {
        kind: "contact:arranged-to-meet",
        change: "strengthened",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} and ${otherName} arranged to meet.`,
      },
    },
    {
      key: "offer-another-day",
      label: "Offer a different day",
      description: `Say you could do ${proseDate(later)} instead.`,
      statement: `I can\u2019t do ${spoken}. Could you do ${proseDate(later)}?`,
      replies: says(context, [
        "\u201cLet me look at that and come back to you,\u201d {name} says.",
        "\u201cMaybe. I\u2019ll check,\u201d {name} says.",
      ]),
      record: `The player offered ${context.name} ${proseDate(later)} instead.`,
      apply: (world) =>
        counterWithNewDay(world, {
          proposalEventId,
          on: later,
          note: `Offered ${later} instead.`,
        }),
    },
    {
      key: "say-no",
      label: "Say you can\u2019t",
      description: "Turn it down for now.",
      statement: "I can\u2019t at the moment. I\u2019m sorry.",
      replies: says(context, [
        "\u201cAnother time, then,\u201d {name} says.",
        "\u201cUnderstood. Take care of yourself,\u201d {name} says.",
      ]),
      record: `The player turned down meeting ${context.name}.`,
      apply: (world) =>
        answerContact(world, {
          proposalEventId,
          answer: "decline",
          note: "Could not make it.",
        }).world,
    },
    {
      key: "ask-what-for",
      label: "Ask what it\u2019s about",
      description: "Find out before you answer.",
      followUp: true,
      statement: "What\u2019s it about?",
      replies: says(context, [
        "\u201cNothing in particular. I just thought of you,\u201d {name} says.",
      ]),
      record: `The player asked ${context.name} what the meeting was about.`,
    },
  ];
}

/**
 * After a death in the family (CRUNCH47 B1).
 *
 * The death notice establishes grief, not a shared memory or an arrangement
 * needing help. Those answers require their own recorded facts and are withheld
 * until a producer can bind them. The speaker's response to an honest answer
 * depends on how this pair has actually related and the speaker's recorded
 * sociability; a death alone cannot improve their relationship.
 */
function bereavedAnswers(context: SceneContext): SceneAnswer[] {
  const sociability = personTrait(
    context.world,
    context.speaker.id,
    "sociability",
  );
  const close =
    deriveRelationshipSummary(
      context.world,
      context.speaker.id,
      context.player.id,
    ).closeness === "close";
  const warmlyReceptive =
    sociability.recordId !== null && sociability.value > 0 && close;
  return [
    {
      key: "nothing-to-say",
      label: "Say you don’t know what to say",
      description: "Be honest about that much.",
      statement: "I don’t know what to say about it yet.",
      replies: says(context, [
        warmlyReceptive
          ? "“Nobody does. It’s all right,” {name} says."
          : "“You don’t have to,” {name} says.",
      ]),
      record: `The player told ${context.name} they had no words for it yet.`,
      ...(warmlyReceptive
        ? {
            relationship: {
              kind: "support:honest-about-grief",
              change: "strengthened",
              significance: "minor",
              summary: ({ playerName, otherName }) =>
                `${playerName} and ${otherName} talked about ${context.fact("deceasedGiven")}.`,
            } satisfies NonNullable<SceneAnswer["relationship"]>,
          }
        : {}),
    },
    {
      key: "leave-it",
      label: "Leave it for now",
      description: "Not tonight.",
      statement: "Not tonight. I can’t.",
      replies: says(context, [
        warmlyReceptive
          ? "“All right. I’m here,” {name} says."
          : "“Another time,” {name} says.",
      ]),
      record: `The player left it for another time with ${context.name}.`,
    },
  ];
}

const homeEvening: SceneFamilyDefinition = {
  family: "home-evening",
  eventType: "conversation.home-evening-turn",
  setting: "Home",
  socialContext: "Two people connected to someone who died.",
  motivation: "Talk about a death in the family.",
  interactionTags: ["conversation.bereavement"],
  topic: (binding) => `Remembering ${binding.facts.deceasedGiven ?? "someone"}`,
  briefing(context) {
    // The saved relation names what the deceased was to the player. It does
    // not establish what the speaker was to the deceased.
    return `${context.fact("deceasedName")} has died. ${context.fullName} is here, and the two of you have not spoken about it.`;
  },
  opening(context) {
    const given = context.fact("deceasedGiven");
    return says(context, [
      `“I keep thinking I should call ${given},” {name} says.`,
    ]);
  },
  answers: bereavedAnswers,
  settled(context, answer) {
    const lines: Record<string, string> = {
      "nothing-to-say": "“That’s all right,” {name} says.",
      "leave-it": "“Goodnight,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (_world, bound) => bound.binding.variant === "bereaved",
  room: (world, bound) =>
    // A death reaches people who do not live here; the room follows whoever
    // is actually being spoken to.
    homeRoom(world, bound) ?? withoutSpeakerOthers(world, bound),
};

/**
 * Somebody who once helped asks for help back (Build 22, step 5).
 *
 * Four real answers: help, something smaller, not now, or no. Each is written
 * through the ask's own answer, so a yes is a promise the player can later be
 * held to, and a no costs what it costs between them.
 */
function spokenNeed(context: SceneContext): string {
  return context.fact("need") === "campaign"
    ? "my campaign"
    : context.fact("needWords");
}

function collectAnswers(context: SceneContext): SceneAnswer[] {
  const askEventId = context.binding.sourceEntityIds[0]!;
  const need = context.fact("needWords");
  const answer = (choice: FavorAskAnswer) => (world: World) =>
    answerFavorAsk(world, askEventId, choice);
  return [
    {
      key: "say-yes",
      label: "Say you’ll help",
      description: `Promise to help with ${need}.`,
      statement: "Of course. Tell me what you need.",
      replies: says(context, [
        "“I knew I could count on you,” {name} says.",
        "“Thank you. I mean it,” {name} says.",
      ]),
      record: `The player told ${context.name} “Of course. Tell me what you need.”`,
      apply: answer("help"),
      relationship: {
        kind: "commitment:agreed-to-help-back",
        change: "strengthened",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} said they would help ${otherName}.`,
      },
    },
    {
      key: "offer-less",
      label: "Offer something smaller",
      description: "Say you can’t do all of it, but can help a little.",
      statement: "I can’t take all of that on, but I can help a little.",
      replies: says(context, [
        "“I suppose that’s something,” {name} says.",
        "“All right. Whatever you can do,” {name} says.",
      ]),
      record: `The player offered ${context.name} a little help.`,
      apply: answer("offer-less"),
    },
    {
      key: "not-now",
      label: "Say not right now",
      description: "Put it off without saying yes or no.",
      statement: "Not right now. Can I get back to you?",
      replies: says(context, [
        "“Sure,” {name} says, and leaves it there.",
        "“Okay. When you can,” {name} says.",
      ]),
      record: `The player asked ${context.name} to wait for an answer.`,
      apply: answer("not-now"),
    },
    {
      key: "say-no",
      label: "Say no",
      description: "Tell them you won’t help.",
      statement: "I’m sorry. I can’t help with that.",
      replies: says(context, [
        "“Right. I see,” {name} says.",
        "“I thought you might,” {name} says, and goes quiet.",
      ]),
      record: `The player told ${context.name} they could not help.`,
      apply: answer("refuse"),
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* 2. A contact asks to meet, or asks for help back                            */
/* -------------------------------------------------------------------------- */

const collecting = (binding: { readonly variant: string }) =>
  binding.variant === "collect";

const favor: SceneFamilyDefinition = {
  family: "favor",
  eventType: "conversation.favor-turn",
  setting: "Catching up",
  socialContext: "A person the player knows asked to meet.",
  motivation: "Answer an invitation to meet.",
  interactionTags: ["conversation.contact"],
  topic: (binding) =>
    collecting(binding)
      ? `${binding.facts.speakerGiven ?? "Somebody"} asks for help`
      : `${binding.facts.speakerGiven ?? "Somebody"} wants to meet`,
  briefing(context) {
    if (collecting(context.binding)) {
      return `${context.fullName} ${context.fact("helped")} on ${proseDate(context.fact("helpedOn") as never)}, and is asking for help with ${context.fact("needWords")}.`;
    }
    const who = context.relationship
      ? `${context.fullName}, ${context.relationship},`
      : context.fullName;
    const last = context.has("lastContactOn")
      ? ` You have not seen each other since ${proseDate(context.fact("lastContactOn") as never)}.`
      : "";
    return `${who} is asking whether you want to meet on ${proseDate(context.binding.date!)}.${last}`;
  },
  opening(context) {
    if (collecting(context.binding)) {
      const need = spokenNeed(context);
      return says(context, [
        `“I hate to ask, but I could use some help with ${need},” {name} says.`,
        `“You know I don’t ask much. Could you help me with ${need}?” {name} asks.`,
      ]);
    }
    const spoken = spokenDay(context.binding.date!, context.world.currentDate);
    return says(context, [
      `“It’s been a long time. Are you free ${spoken}?” {name} asks.`,
      `“I was thinking about you. Could you do ${spoken}?” {name} asks.`,
    ]);
  },
  answers: (context) =>
    collecting(context.binding)
      ? collectAnswers(context)
      : meetUpAnswers(context),
  settled(context, answer) {
    if (collecting(context.binding)) {
      const collected: Record<string, string> = {
        "say-yes": "“I’ll be in touch,” {name} says.",
        "offer-less": "“I’ll take it,” {name} says.",
        "not-now": "“Let me know,” {name} says.",
        "say-no": "“Well. Take care,” {name} says.",
      };
      return fill(collected[answer ?? ""] ?? "“Okay,” {name} says.", {
        name: context.name,
      });
    }
    const done: Record<string, string> = {
      "say-yes": "“See you then,” {name} says.",
      "offer-another-day": "“I’ll let you know,” {name} says.",
      "say-no": "“Take care,” {name} says.",
      "ask-what-for": "“Just the two of us catching up,” {name} says.",
    };
    return fill(done[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) =>
    collecting(bound.binding)
      ? openFavorAsk(world, bound.binding.playerPersonId)?.eventId ===
        bound.binding.sourceEntityIds[0]
      : bound.binding.variant === "meet-up" &&
        !!openProposal(
          world,
          bound.binding.playerPersonId,
          bound.binding.speakerPersonId,
        ),
  room: withoutSpeakerOthers,
};

/* -------------------------------------------------------------------------- */
/* 3. A party organizer's introduction and invitation                          */
/* -------------------------------------------------------------------------- */

function invitationOffered(
  world: World,
  playerId: EntityId,
  invitationId: EntityId | undefined,
): boolean {
  return projectPartyEncounters(world, playerId).some((chapter) =>
    chapter.activities.some(
      (entry) =>
        entry.invitationEventId === invitationId && entry.state === "offered",
    ),
  );
}

function partyInvitationAnswers(context: SceneContext): SceneAnswer[] {
  const [invitationId, activityId] = context.binding.sourceEntityIds;
  const day = spokenDay(context.binding.date!, context.world.currentDate);
  const playerId = context.binding.playerPersonId;
  const question: SceneAnswer = {
    key: "ask-what-happens",
    label: "Ask what the meeting is like",
    description: "Find out before you answer.",
    followUp: true,
    statement: "What happens at one of these?",
    replies: says(context, [
      `“It’s an open meeting. Anyone can come, and coming doesn’t sign you up for anything. It runs ${context.fact("startTime")} to ${context.fact("endTime")},” {name} says.`,
    ]),
    record: `The player asked ${context.name} what the meeting would be like.`,
  };
  if (!invitationOffered(context.world, playerId, invitationId)) {
    return [question];
  }
  return [
    {
      key: "say-yes",
      label: `Tell ${context.name} you’ll come`,
      description: "This puts the meeting on your calendar as a commitment.",
      statement: "Yes, I’ll be there.",
      replies: says(context, [
        "“Great. I’ll look for you,” {name} says.",
        `“Good. ${seeYou(day)},” {name} says.`,
      ]),
      record: `The player accepted ${context.name}’s invitation to the ${context.fact("chapterName")} meeting.`,
      apply: (world) => acceptChapterInvitation(world, playerId, activityId!),
      relationship: {
        kind: "contact:invitation-accepted",
        change: "strengthened",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} accepted ${otherName}’s invitation to the open meeting.`,
      },
    },
    {
      key: "not-sure",
      label: "Say you’re not sure yet",
      description: "The invitation stays open; nothing is decided.",
      statement: "I’m not sure yet. Can I let you know?",
      replies: says(context, [
        "“Of course. The invitation stands,” {name} says.",
        "“Sure. No pressure,” {name} says.",
      ]),
      record: `The player left ${context.name}’s invitation open.`,
    },
    {
      key: "no-thanks",
      label: "Say no thanks",
      description: "Turn down this meeting.",
      statement: "Thanks, but I’ll pass on this one.",
      replies: says(context, [
        "“No problem. Maybe another time,” {name} says.",
        "“That’s fine. Thanks for picking up,” {name} says.",
      ]),
      record: `The player turned down ${context.name}’s invitation to the meeting.`,
      apply: (world) =>
        declineCalendarActivity(world, playerId, activityId!).world,
    },
    question,
  ];
}

function partyJoinAnswers(context: SceneContext): SceneAnswer[] {
  const [, chapterId] = context.binding.sourceEntityIds;
  const playerId = context.binding.playerPersonId;
  const chapter = context.fact("chapterName");
  const question: SceneAnswer = {
    key: "what-joining-means",
    label: "Ask what joining involves",
    description: "Find out before you answer.",
    followUp: true,
    statement: "What does joining involve?",
    replies: says(context, [
      "“You’d be a volunteer member of the chapter. It doesn’t register you with the party or put you on any ballot, and you can leave whenever you like,” {name} says.",
    ]),
    record: `The player asked ${context.name} what joining the ${chapter} would involve.`,
  };
  if (!canJoinPartyChapter(context.world, playerId, chapterId!)) {
    return [question];
  }
  return [
    {
      key: "join",
      label: `Join the ${chapter}`,
      description: "Become a volunteer member. It is not party registration.",
      statement: "Yes. Sign me up.",
      replies: says(context, [
        "“Welcome aboard. I’ll add you to the list,” {name} says.",
        "“Glad to have you,” {name} says.",
      ]),
      record: `The player joined the ${chapter} at ${context.name}’s invitation.`,
      apply: (world) => joinPartyChapter(world, playerId, chapterId!),
      relationship: {
        kind: "contact:joined-organization",
        change: "strengthened",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} joined the chapter ${otherName} organizes.`,
      },
    },
    {
      key: "not-yet",
      label: "Say not yet",
      description: "Keep coming without joining.",
      statement: "Not yet. I’d like to come to a few more meetings first.",
      replies: says(context, [
        "“That’s fine. You’re welcome either way,” {name} says.",
        "“Take your time,” {name} says.",
      ]),
      record: `The player told ${context.name}, “Not yet. I’d like to come to a few more meetings first.”`,
    },
    question,
  ];
}

function partyAfterDeclineAnswers(context: SceneContext): SceneAnswer[] {
  const weekday = context.fact("weekday");
  return [
    {
      key: "keep-inviting",
      label: "Ask them to keep inviting you",
      description: "That night just didn’t work.",
      statement: "Please keep inviting me. That night just didn’t work.",
      replies: says(context, [
        "“Will do,” {name} says.",
        "“Of course,” {name} says.",
      ]),
      record: `The player told ${context.name}, “Please keep inviting me. That night just didn’t work.”`,
      relationship: {
        kind: "contact:kept-in-touch",
        change: "maintained",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} asked ${otherName} to keep them in mind for meetings.`,
      },
    },
    {
      key: "not-for-me",
      label: "Say party meetings aren’t for you right now",
      description: "Be straight about it.",
      statement: "To be honest, party meetings aren’t for me right now.",
      replies: says(context, [
        "“I appreciate you telling me,” {name} says.",
        "“Fair enough. Thanks for being straight with me,” {name} says.",
      ]),
      record: `The player told ${context.name}, “To be honest, party meetings aren’t for me right now.”`,
      relationship: {
        kind: "contact:declined-involvement",
        change: "maintained",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} told ${otherName} party meetings weren’t for them right now.`,
      },
    },
    {
      key: "ask-when",
      label: "Ask when they meet",
      description: "Find out for another time.",
      followUp: true,
      statement: "When do you usually meet?",
      replies: says(context, [
        `“We meet on ${weekday}s at ${context.fact("startTime")},” {name} says.`,
      ]),
      record: `The player asked ${context.name} when the chapter meets.`,
    },
  ];
}

const partyInvite: SceneFamilyDefinition = {
  family: "party-invite",
  eventType: "conversation.party-invite-turn",
  setting: "A call from a local party organizer",
  socialContext: "A local party organizer talking with the player.",
  motivation: "Decide how involved to be with a local party chapter.",
  interactionTags: ["conversation.party", "relationship.civic"],
  topic: (binding) =>
    binding.variant === "join-ask"
      ? `Joining the ${binding.facts.chapterName}`
      : binding.variant === "after-decline"
        ? `After the ${binding.facts.chapterName} meeting`
        : `An invitation from the ${binding.facts.chapterName}`,
  briefing(context) {
    const chapter = context.fact("chapterName");
    if (context.binding.variant === "join-ask") {
      return `You went to the ${chapter} open meeting, and ${context.fullName}, who organizes it, is asking whether you would like to join. Joining makes you a volunteer member; it is not party registration.`;
    }
    if (context.binding.variant === "after-decline") {
      return `You did not go to the last ${chapter} open meeting. ${context.fullName}, who organizes it, is following up.`;
    }
    return `${context.fullName} organizes the ${chapter}. The open meeting is on ${proseDate(context.binding.date!)}, ${context.fact("startTime")} to ${context.fact("endTime")}, in the community room. Coming is optional, and it doesn’t make you a member.`;
  },
  opening(context) {
    const chapter = context.fact("chapterName");
    if (context.binding.variant === "join-ask") {
      return says(context, [
        `“Thanks for coming to the meeting. Would you like to join the ${chapter}?” {name} asks.`,
        "“Good to see you there. Any interest in becoming a member?” {name} asks.",
      ]);
    }
    if (context.binding.variant === "after-decline") {
      return says(context, [
        "“No problem about the meeting. I just wanted to check in,” {name} says.",
        "“Sorry we missed you at the meeting. Everything all right?” {name} asks.",
      ]);
    }
    const day = spokenDay(context.binding.date!, context.world.currentDate);
    const start = context.fact("startTime");
    return [
      `“Hi, this is ${context.fullName}. I organize the ${chapter}. We have an open meeting ${day} at ${start} in the community room, and anyone can come. Would you like to?”`,
      `“Hello, ${context.fullName} with the ${chapter}. We’re meeting ${day} at ${start} at the community room. It’s open to everyone. Any interest?”`,
    ];
  },
  answers(context) {
    if (context.binding.variant === "join-ask")
      return partyJoinAnswers(context);
    if (context.binding.variant === "after-decline") {
      return partyAfterDeclineAnswers(context);
    }
    return partyInvitationAnswers(context);
  },
  settled(context, answer) {
    const day = context.binding.date
      ? spokenDay(context.binding.date, context.world.currentDate)
      : "on ";
    const lines: Record<string, string> = {
      "say-yes": `“${seeYou(day)},” {name} says.`,
      "not-sure": "“Call me if you decide,” {name} says.",
      "no-thanks": "“Take care,” {name} says.",
      join: "“Welcome aboard,” {name} says.",
      "not-yet": "“See you at the next one, I hope,” {name} says.",
      "keep-inviting": "“Talk soon,” {name} says.",
      "not-for-me": "“Take care,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) => {
    const { binding } = bound;
    if (binding.variant === "join-ask") {
      return canJoinPartyChapter(
        world,
        binding.playerPersonId,
        binding.sourceEntityIds[1]!,
      );
    }
    if (binding.variant === "after-decline") return true;
    return invitationOffered(
      world,
      binding.playerPersonId,
      binding.sourceEntityIds[0],
    );
  },
  room: withoutSpeakerOthers,
};

/* -------------------------------------------------------------------------- */
/* 4. After an election                                                        */
/* -------------------------------------------------------------------------- */

const campaignReaction: SceneFamilyDefinition = {
  family: "campaign-reaction",
  eventType: "conversation.campaign-reaction-turn",
  setting: "Home, after the result",
  socialContext: "A housemate reacting to the player’s election result.",
  motivation: "Talk about how the election went.",
  interactionTags: ["conversation.household", "relationship.shared-household"],
  topic: (binding) =>
    binding.variant === "filed"
      ? "Your campaign"
      : binding.variant === "took-office"
        ? "Your first day"
        : "After the election",
  briefing(context) {
    const office = officePhrase(context.fact("officeTitle"));
    if (context.binding.variant === "filed") {
      return `You filed on ${proseDate(context.fact("filedAt"))} to run for ${office}. The election is on ${proseDate(context.fact("electionDate"))}.`;
    }
    if (context.binding.variant === "took-office") {
      return `Your term for ${office} began on ${proseDate(context.fact("termStart"))}.`;
    }
    if (context.binding.variant === "lost") {
      return `You lost the election for ${office}.`;
    }
    return context.has("termStart")
      ? `You won the election for ${office}. The term begins on ${proseDate(context.fact("termStart"))}.`
      : `You won the election for ${office}. The record does not yet give a start date for the term.`;
  },
  opening(context) {
    if (context.binding.variant === "filed") {
      const office = officePhrase(context.fact("officeTitle"));
      return says(context, [
        `“So you’re really running for ${office}?” {name} asks.`,
        "“You actually filed. What made you decide?” {name} asks.",
      ]);
    }
    if (context.binding.variant === "took-office") {
      return says(context, [
        "“Big day. How does it feel?” {name} asks.",
        "“First day in office. Are you ready?” {name} asks.",
      ]);
    }
    if (context.binding.variant === "lost") {
      return says(context, [
        "“I’m sorry about the result. How are you doing?” {name} asks.",
        "“I saw the result. Are you okay?” {name} asks.",
      ]);
    }
    return says(context, [
      "“Congratulations. When do you take office?” {name} asks.",
      "“You actually won. When does it start?” {name} asks.",
    ]);
  },
  answers(context) {
    if (context.binding.variant === "filed") {
      const election = proseDate(context.fact("electionDate"));
      return [
        {
          key: "say-why",
          label: "Say yes, and when the election is",
          description: `The election is on ${election}.`,
          truthIntent: "sincere",
          statement: `Yes. I filed, and the election is on ${election}. I want to try.`,
          replies: says(context, [
            "“Then I hope it goes well,” {name} says.",
            "“That’s soon. Okay,” {name} says.",
          ]),
          record: `The player told ${context.name}, “Yes. I filed, and the election is on ${election}. I want to try.”`,
        },
        {
          key: "ask-for-help",
          label: `Ask ${context.name} for help`,
          description: "Ask; don’t assume.",
          statement: "I could use your help.",
          replies: says(context, [
            "“Tell me what that would mean, and I’ll think about it,” {name} says.",
            "“I’ll see what I can do. No promises yet,” {name} says.",
          ]),
          record: `The player asked ${context.name} for help with the campaign.`,
          relationship: {
            kind: "support:asked-for-help",
            change: "maintained",
            significance: "minor",
            summary: ({ playerName, otherName }) =>
              `${playerName} asked ${otherName} for help with the campaign.`,
          },
        },
        {
          key: "admit-doubt",
          label: "Admit you’re not sure you can win",
          description: "Be honest about the odds as you see them.",
          statement: "I don’t know if I can win. I want to try anyway.",
          replies: says(context, [
            "“That’s reason enough,” {name} says.",
            "“Then try. We’ll see what happens,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I don’t know if I can win. I want to try anyway.”`,
        },
      ];
    }
    if (context.binding.variant === "took-office") {
      return [
        {
          key: "ready",
          label: "Say you think you’re ready",
          description: "Sound sure.",
          statement: "I think so. Ask me again tonight.",
          replies: says(context, [
            "“I will,” {name} says.",
            "“Deal,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I think so. Ask me again tonight.”`,
        },
        {
          key: "nervous",
          label: "Admit you’re nervous",
          description: "Say how it really feels.",
          statement: "Honestly, I’m nervous.",
          replies: says(context, [
            "“You’d be strange if you weren’t,” {name} says.",
            "“Good. It means you care about getting it right,” {name} says.",
          ]),
          record: `The player told ${context.name}, “Honestly, I’m nervous.”`,
          relationship: {
            kind: "support:comfort",
            change: "strengthened",
            significance: "minor",
            summary: ({ playerName, otherName }) =>
              `${otherName} steadied ${playerName} on the first day in office.`,
          },
        },
        {
          key: "thank-for-campaign",
          label: `Thank ${context.name} for putting up with the campaign`,
          description: "It was a long stretch at home.",
          statement: "Thanks for putting up with the campaign.",
          replies: says(context, [
            "“It was worth it,” {name} says.",
            "“You can make it up to me,” {name} says.",
          ]),
          record: `The player thanked ${context.name} for putting up with the campaign.`,
        },
      ];
    }
    if (context.binding.variant === "lost") {
      return [
        {
          key: "it-stings",
          label: "Say it hurts",
          description: "Be honest about how it feels.",
          statement: "Honestly? It stings.",
          replies: says(context, [
            "“It would sting anyone. I’m glad you ran,” {name} says.",
            "“Of course it does. You put a lot into it,” {name} says.",
          ]),
          record: `The player told ${context.name}, “Honestly? It stings.”`,
          relationship: {
            kind: "support:comfort",
            change: "strengthened",
            significance: "minor",
            summary: ({ playerName, otherName }) =>
              `${otherName} comforted ${playerName} after the election.`,
          },
        },
        {
          key: "whats-next",
          label: "Say you’re thinking about what’s next",
          description: "Look ahead rather than back.",
          statement: "I’ll be okay. I want to figure out what comes next.",
          replies: says(context, [
            "“Take a few days before you decide anything,” {name} says.",
            "“There’s time. You don’t have to know tonight,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I want to figure out what comes next.”`,
        },
        {
          key: "talk-later",
          label: "Ask to talk about it later",
          description: "Not now.",
          statement: "Can we talk about it later?",
          replies: says(context, [
            "“Of course,” {name} says.",
            "“Whenever you’re ready,” {name} says.",
          ]),
          record: `The player asked ${context.name} to talk about the election later.`,
        },
      ];
    }
    const [, relationshipId] = context.binding.sourceEntityIds;
    const date: SceneAnswer = context.has("termStart")
      ? {
          key: "give-date",
          label: `Say the term starts ${proseDate(context.fact("termStart"))}`,
          description: "The date on record for the new term.",
          truthIntent: "sincere",
          statement: `The term starts ${proseDate(context.fact("termStart"))}.`,
          replies: says(context, [
            "“I’ll put it on the calendar,” {name} says.",
            `“${proseDate(context.fact("termStart"))}. Okay. Congratulations again,” {name} says.`,
          ]),
          record: `The player told ${context.name} the term starts on ${proseDate(context.fact("termStart"))}.`,
          stance: {
            propositionKey: `term-start:${relationshipId}`,
            proposition: `The term starts on ${proseDate(context.fact("termStart"))}.`,
            asserted: "affirms",
            speakerBelief: "believes-true",
            intent: "truthful",
            beliefEvidenceIds: [relationshipId!],
            sourceEntityIds: [relationshipId!],
            worldTruth: "true",
          },
        }
      : {
          key: "no-date-yet",
          label: "Say you don’t know the date yet",
          description: "The record does not give one.",
          statement: "I don’t know yet. I need to find out.",
          replies: says(context, [
            "“Find out soon. I want to be there,” {name} says.",
            "“Well, let me know when you do,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I don’t know yet. I need to find out.”`,
        };
    return [
      date,
      {
        key: "thank-them",
        label: `Thank ${context.name}`,
        description: "Take the congratulations.",
        statement: "Thank you. It hasn’t sunk in yet.",
        replies: says(context, [
          "“It will,” {name} says.",
          "“Give it a day,” {name} says.",
        ]),
        record: `The player thanked ${context.name} for the congratulations.`,
        relationship: {
          kind: "support:celebration",
          change: "strengthened",
          significance: "minor",
          summary: ({ playerName, otherName }) =>
            `${otherName} congratulated ${playerName} on the election.`,
        },
      },
    ];
  },
  settled(context, answer) {
    const lines: Record<string, string> = {
      "give-date": "“I’m proud of you,” {name} says.",
      "no-date-yet": "“Either way, congratulations,” {name} says.",
      "thank-them": "“Enjoy it,” {name} says.",
      "it-stings": "“Come here,” {name} says.",
      "whats-next": "“One step at a time,” {name} says.",
      "talk-later": "“I’m here when you want to,” {name} says.",
      "say-why": "“Good luck,” {name} says.",
      "ask-for-help": "“Let me think about it,” {name} says.",
      "admit-doubt": "“Go try,” {name} says.",
      ready: "“Go get them,” {name} says.",
      nervous: "“You’ll be fine,” {name} says.",
      "thank-for-campaign": "“Go on, then,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  room: homeRoom,
};

/* -------------------------------------------------------------------------- */
/* 5. Staff follow-up on a pending measure                                     */
/* -------------------------------------------------------------------------- */

const staffFollowup: SceneFamilyDefinition = {
  family: "staff-followup",
  eventType: "conversation.staff-followup-turn",
  setting: "Your office",
  socialContext: "A staff member asking how to handle a pending bill.",
  motivation: "Decide who follows a pending measure.",
  interactionTags: ["conversation.office", "relationship.shared-work"],
  topic: (binding) => `Follow-up on ${binding.facts.designation}`,
  briefing(context) {
    return `${context.fullName}, your ${lowerFirst(context.fact("staffTitle"))}, is asking what you want done about ${context.fact("designation")}, ${context.fact("shortTitle")}. It is still pending.`;
  },
  opening(context) {
    const bill = context.fact("designation");
    return says(context, [
      `“${bill} is still pending. Do you want the short summary, or should I keep tracking it for you?” {name} asks.`,
      `“Quick question on ${bill}. Do you want to go through it yourself, or should I watch it and tell you when it moves?” {name} asks.`,
    ]);
  },
  answers(context) {
    const bill = context.fact("designation");
    return [
      {
        key: "ask-summary",
        label: "Ask for the short version",
        description: `What ${bill} does, in a sentence.`,
        followUp: true,
        statement: "Give me the short version.",
        replies: [`“${context.fact("summary")}” ${context.name} says.`],
        record: `The player asked ${context.name} for a summary of ${bill}.`,
      },
      {
        key: "staff-tracks",
        label: `Ask ${context.name} to keep tracking it`,
        description: `${context.name} follows it and tells you when it moves.`,
        statement: "Keep an eye on it and tell me when it moves.",
        replies: says(context, [
          "“Will do,” {name} says.",
          "“I’ll let you know as soon as it does,” {name} says.",
        ]),
        record: `The player asked ${context.name} to track ${bill}.`,
        commitment: {
          holder: "counterpart",
          kind: "civic:track-measure",
          label: `tracking ${bill}`,
          weeklyHours: [1, 2],
        },
      },
      {
        key: "read-it-yourself",
        label: "Say you’ll read it yourself",
        description: "You take on the reading this week.",
        statement: "I’ll read the full text myself this week.",
        replies: says(context, [
          "“Okay. Tell me if you want notes,” {name} says.",
          "“Sounds good. I’m around if you have questions,” {name} says.",
        ]),
        record: `The player told ${context.name}, “I’ll read the full text myself this week.”`,
        commitment: {
          holder: "player",
          kind: "civic:read-measure",
          label: `reading ${bill}`,
          weeklyHours: [1, 2],
        },
      },
      {
        key: "leave-it",
        label: "Leave it for now",
        description: "Nobody takes it on yet.",
        statement: "Let’s leave it for now.",
        replies: says(context, ["“Understood,” {name} says."]),
        record: `The player left ${bill} alone for now.`,
      },
    ];
  },
  settled(context, answer) {
    const lines: Record<string, string> = {
      "staff-tracks": "“I’m on it,” {name} says.",
      "read-it-yourself": "“It’s all yours,” {name} says.",
      "leave-it": "“I’ll hold off,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  room: withoutSpeakerOthers,
};

/* -------------------------------------------------------------------------- */
/* 6. A reporter's question about an actual promise                            */
/* -------------------------------------------------------------------------- */

/** What the reporter is asking about, per situation. */
interface ReporterQuestion {
  readonly propositionKey: string;
  readonly proposition: string;
  readonly evidenceId: EntityId;
  readonly briefing: string;
  readonly openings: readonly string[];
  readonly confirmLabel: string;
  readonly confirm: string;
  readonly noComment: string;
  readonly deny: string;
  readonly denyRecord: string;
}

function reporterQuestionFor(context: SceneContext): ReporterQuestion {
  const { binding } = context;
  const outlet = context.has("outlet") ? ` with ${context.fact("outlet")}` : "";
  const of = context.has("outlet") ? ` of ${context.fact("outlet")}` : "";
  const [sourceId] = binding.sourceEntityIds;
  if (binding.variant === "meeting-question") {
    const organizer = context.fact("organizer");
    const meeting = context.fact("meetingTitle");
    const day = spokenDay(binding.date!, context.world.currentDate);
    return {
      propositionKey: `accepted:${sourceId}`,
      proposition: `The player told ${organizer} they would come to the ${meeting} on ${proseDate(binding.date!)}.`,
      evidenceId: sourceId!,
      briefing: `${context.fullName}${of} is asking whether you told ${organizer} you would come to the ${meeting} on ${proseDate(binding.date!)}. You did.`,
      openings: [
        `“This is ${context.fullName}${outlet}. I understand you told ${organizer} you’d come to the ${meeting} ${day}. Is that right?”`,
        `“${context.fullName} here${outlet}. Quick question: are you going to the ${meeting} ${day}? I heard you told ${organizer} yes.”`,
      ],
      confirmLabel: `Say you told ${organizer} yes`,
      confirm: `Yes. I told ${organizer} I’d be there.`,
      noComment: "I’m not going to talk about my evening plans.",
      deny: "No. I haven’t agreed to anything like that.",
      denyRecord: `The player denied to ${context.name} agreeing to go to the ${meeting}, though the player had said yes to ${organizer}.`,
    };
  }
  const promisee = context.fact("promisee");
  const stance = context.fact("stancePhrase");
  const question = context.fact("questionLabel");
  return {
    propositionKey: `promised:${sourceId}`,
    proposition: `The player promised ${promisee} to ${stance} ${question}.`,
    evidenceId: sourceId!,
    briefing: `${context.fullName}${of} is asking whether you promised ${promisee} you would ${stance} ${question}. You did, on ${proseDate(context.fact("statedAt"))}: “${context.fact("commitmentStatement")}”`,
    openings: [
      `“This is ${context.fullName}${outlet}. Did you promise ${promisee} you would ${stance} ${question}?”`,
      `“${context.fullName} here${outlet}. I’m trying to confirm something: did you tell ${promisee} you’d ${stance} ${question}?”`,
    ],
    confirmLabel: "Confirm it",
    confirm: `Yes. I told ${promisee} I would ${stance} ${question}.`,
    noComment: "I don’t discuss private conversations.",
    deny: "No. I never made that promise.",
    denyRecord: `The player denied to ${context.name} making any promise to ${promisee}, though the promise had been made.`,
  };
}

const reporterQuestion: SceneFamilyDefinition = {
  family: "reporter-question",
  eventType: "conversation.reporter-turn",
  setting: "A call from a reporter",
  socialContext: "A reporter asking about a promise the player made.",
  motivation: "Answer, or decline to answer, a reporter's question.",
  interactionTags: ["conversation.press"],
  topic: (binding) =>
    binding.variant === "claim-came-back" ||
    binding.variant === "memory-corrected"
      ? "The reporter calls back"
      : binding.variant === "filing-question"
        ? "A reporter asks about your campaign"
        : "A reporter’s question",
  briefing(context) {
    if (context.binding.variant === "filing-question") {
      const of = context.has("outlet") ? ` of ${context.fact("outlet")}` : "";
      return `${context.fullName}${of} is asking why you are running for ${officePhrase(context.fact("officeTitle"))}. Your filing is public.`;
    }
    if (context.binding.variant === "claim-came-back") {
      return `${context.fullName} has ${context.fact("sourceName")}’s account, which contradicts what you told them.`;
    }
    if (context.binding.variant === "memory-corrected") {
      return `${context.fullName} found that an answer you gave from memory was wrong.`;
    }
    return reporterQuestionFor(context).briefing;
  },
  opening(context) {
    if (context.binding.variant === "claim-came-back") {
      const source = context.fact("sourceName");
      return says(context, [
        `“You told me that wasn’t so. ${source} says it was. Do you want to respond?” {name} asks.`,
        `“I checked with ${source}, and it isn’t what you told me. Anything to add?” {name} asks.`,
      ]);
    }
    if (context.binding.variant === "memory-corrected") {
      return says(context, [
        "“I checked what you told me, and it doesn’t match the record,” {name} says.",
      ]);
    }
    if (context.binding.variant === "filing-question") {
      const outlet = context.has("outlet")
        ? ` with ${context.fact("outlet")}`
        : "";
      const office = officePhrase(context.fact("officeTitle"));
      return [
        `“This is ${context.fullName}${outlet}. You’ve filed to run for ${office}. Why are you running?”`,
        `“${context.fullName}${outlet} here. I have a question about your campaign for ${office}: what made you decide to run?”`,
      ];
    }
    return reporterQuestionFor(context).openings;
  },
  answers(context) {
    const { binding } = context;
    if (binding.variant === "claim-came-back") {
      return [
        ...cameBackAnswers(
          context,
          {
            statement: "You’re right. I shouldn’t have told you otherwise.",
            replies: [
              "“Thanks for setting it straight,” {name} says.",
              "“I appreciate the correction,” {name} says.",
            ],
          },
          {
            statement: "I stand by what I told you.",
            replies: [
              "“Noted,” {name} says.",
              "“Then we disagree about what happened,” {name} says.",
            ],
          },
        ),
        {
          key: "no-comment-again",
          label: "Decline to comment",
          description: "Say nothing more about it.",
          statement: "I have nothing more to say about that.",
          replies: says(context, [
            "“Then I’ll note that you declined to comment,” {name} says.",
          ]),
          record: `The player declined to comment further to ${context.name}.`,
        },
      ];
    }
    if (binding.variant === "memory-corrected") {
      return memoryCorrectedAnswers(context);
    }
    if (binding.variant === "filing-question") {
      return [
        {
          key: "about-community",
          label: "Talk about the people you want to serve",
          description: "Give a plain reason.",
          statement: "I want to be useful to the people who live here.",
          replies: says(context, [
            "“Thank you. That’s helpful,” {name} says.",
            "“Got it. I may follow up as the race goes on,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I want to be useful to the people who live here.”`,
        },
        {
          key: "too-early",
          label: "Say it’s early",
          description: "Promise more later, without saying what.",
          statement: "It’s early. I’ll have more to say soon.",
          replies: says(context, [
            "“I’ll hold you to that,” {name} says.",
            "“Understood. I’ll check back,” {name} says.",
          ]),
          record: `The player told ${context.name}, “It’s early. I’ll have more to say soon.”`,
        },
        {
          key: "save-for-interview",
          label: "Save it for a proper interview",
          description: "Don’t answer on a quick call.",
          statement: "I’d rather save that for a proper interview.",
          replies: says(context, [
            "“Fair enough. Let me know when you have time,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I’d rather save that for a proper interview.”`,
        },
      ];
    }
    const question = reporterQuestionFor(context);
    const basis = {
      propositionKey: question.propositionKey,
      proposition: question.proposition,
      beliefEvidenceIds: [question.evidenceId],
      sourceEntityIds: [question.evidenceId],
      worldTruth: "true" as const,
      speakerBelief: "believes-true" as const,
    };
    return [
      {
        key: "confirm",
        label: question.confirmLabel,
        description: "Answer the question truthfully.",
        truthIntent: "sincere",
        statement: question.confirm,
        replies: says(context, [
          "“Thank you. That’s what I needed,” {name} says.",
          "“I appreciate the straight answer,” {name} says.",
        ]),
        record: `The player told ${context.name}, “${question.confirm}”`,
        stance: { ...basis, asserted: "affirms", intent: "truthful" },
      },
      {
        key: "no-comment",
        label: "Decline to comment",
        description: "Neither confirm nor deny.",
        statement: question.noComment,
        replies: says(context, [
          "“Understood. I’ll say you declined to comment,” {name} says.",
          "“All right. I’ll note that you wouldn’t say,” {name} says.",
        ]),
        record: `The player declined to answer ${context.name}’s question.`,
        stance: { ...basis, asserted: "none", intent: "evade" },
      },
      {
        key: "deny",
        label: "Deny it",
        description: "Say it isn’t so.",
        truthIntent: "deliberate-deception",
        lieVariantOf: "confirm",
        statement: question.deny,
        replies: says(context, [
          "“Okay. I’ll note that you deny it,” {name} says.",
          "“That’s not what I heard, but I’ll note your answer,” {name} says.",
        ]),
        perception: `${context.player.givenName} denied it.`,
        record: question.denyRecord,
        stance: { ...basis, asserted: "denies", intent: "deceive" },
      },
    ];
  },
  settled(context, answer) {
    const lines: Record<string, string> = {
      confirm: "“Thanks for your time,” {name} says.",
      "no-comment": "“If you change your mind, call me,” {name} says.",
      deny: "“Thanks for your time,” {name} says.",
      "admit-it": "“Thanks for being straight with me now,” {name} says.",
      "keep-denying": "“We’ll see,” {name} says.",
      "no-comment-again": "“Understood,” {name} says.",
      "thank-for-correction": "“No problem,” {name} says.",
      "about-community": "“Thanks for your time,” {name} says.",
      "too-early": "“Talk soon,” {name} says.",
      "save-for-interview": "“I’ll be in touch,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  room: withoutSpeakerOthers,
};

/* -------------------------------------------------------------------------- */
/* 7. Somebody in your class                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The education scene from the F47.1 authoring cargo, adapted to the engine's
 * own contracts.
 *
 * The cargo's rule is followed exactly here: the other person decides what
 * they mean before a line is chosen, and the lines for one meaning are
 * alternatives for that meaning only. Agreeing, offering a narrower part and
 * turning it down never share a reply list, so the array can never read a
 * refusal out as though it were a yes.
 *
 * Sharing a class is not a friendship, and being turned down costs nothing
 * academically. Both are negative controls the cargo names, and both are held
 * by the records rather than by the wording.
 */
function studyPeerAnswers(context: SceneContext): SceneAnswer[] {
  const playerId = context.binding.playerPersonId;
  const peerId = context.binding.speakerPersonId;
  const task = context.has("availableTask")
    ? context.fact("availableTask")
    : "the part that is still open";
  const answer = (outcome: StudyPeerOutcome): readonly string[] => {
    switch (outcome) {
      case "agrees":
        return [
          "\u201cYes. Let\u2019s work out who is doing what,\u201d {name} says.",
          "\u201cI\u2019d like that. We should agree on the work before we start,\u201d {name} says.",
        ];
      case "counterproposes":
        return [
          `\u201cWe already have the main work divided up. Would you be interested in ${task}?\u201d {name} asks.`,
        ];
      case "declines":
        return [
          "\u201cI\u2019ve already committed to another group,\u201d {name} says.",
          "\u201cI don\u2019t think we\u2019re looking for the same kind of project,\u201d {name} says.",
        ];
    }
  };
  // Decided here, once, before any wording is picked.
  const decided = decideStudyPeerOutcome(context.world, {
    personId: playerId,
    peerPersonId: peerId,
  }).outcome;
  const settle =
    (outcome: StudyPeerOutcome, statement: string) => (world: World) =>
      recordStudyAnswer(world, {
        personId: playerId,
        peerPersonId: peerId,
        outcome,
        statement,
      }).world;
  return [
    {
      key: "offer",
      label: "Suggest working together",
      description: "Propose it. They may say no.",
      statement: "Would you like to work on it together?",
      replies:
        decided === null
          ? ["You have not had an answer."]
          : says(context, answer(decided)),
      record: `The player asked ${context.name} about working on the coursework together.`,
      ...(decided === null
        ? { followUp: true }
        : {
            apply: settle(
              decided,
              decided === "agrees"
                ? "Yes. Let\u2019s work out who is doing what."
                : decided === "counterproposes"
                  ? `We already have the main work divided up. Would you be interested in ${task}?`
                  : "I\u2019ve already committed to another group.",
            ),
          }),
      ...(decided === "agrees"
        ? {
            relationship: {
              kind: "work:shared-coursework" as const,
              change: "formed" as const,
              significance: "minor" as const,
              summary: ({
                playerName,
                otherName,
              }: {
                playerName: string;
                otherName: string;
              }) => `${playerName} and ${otherName} agreed to work together.`,
            },
          }
        : {}),
    },
    {
      key: "ask",
      label: "Ask what they want to do",
      description: "Find out before committing to anything.",
      followUp: true,
      statement: "What part are you interested in?",
      replies: says(context, [
        `\u201cI was going to start with ${task}, if nobody else has,\u201d {name} says.`,
      ]),
      record: `The player asked ${context.name} which part of the work interested them.`,
    },
    {
      key: "keep-looking",
      label: "Keep looking",
      description: "Turn this one down. The class is unaffected.",
      statement: "I think I\u2019m going to look for a different group.",
      replies: says(context, [
        "\u201cThat\u2019s fair. Good luck with it,\u201d {name} says.",
        "\u201cUnderstood. See you in class,\u201d {name} says.",
      ]),
      record: `The player told ${context.name} they would look for a different group.`,
      apply: settle(
        "declines",
        "I think I\u2019m going to look for a different group.",
      ),
    },
  ];
}

const studyPeer: SceneFamilyDefinition = {
  family: "study-peer",
  eventType: "conversation.study-turn",
  setting: "After a class",
  socialContext: "Two people on the same program, talking about the work.",
  motivation: "Decide whether to work on the coursework together.",
  interactionTags: ["conversation.study", "relationship.shared-work"],
  topic: (binding) => `Working with ${binding.facts.peerGiven ?? "somebody"}`,
  briefing(context) {
    const program = context.has("programName")
      ? ` on ${context.fact("programName")}`
      : "";
    return `${context.fullName} is on the same program${program}. Nothing has been agreed; answering takes no time, and the work itself would have its own hours.`;
  },
  opening(context) {
    const program = context.has("programName")
      ? context.fact("programName")
      : "the program";
    return says(context, [
      `You recognize {name} from ${program}. They ask whether you have chosen a project group.`,
      `{name} catches you after ${program}. \u201cHave you found anyone to work with yet?\u201d`,
    ]);
  },
  answers: studyPeerAnswers,
  settled(context, answer) {
    const lines: Record<string, string> = {
      offer: "\u201cWe\u2019ll speak about it,\u201d {name} says.",
      "keep-looking": "\u201cSee you in class,\u201d {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "\u201cOkay,\u201d {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) =>
    !studyAnswered(
      world,
      bound.binding.playerPersonId,
      bound.binding.speakerPersonId,
    ),
  room: withoutSpeakerOthers,
};

/* -------------------------------------------------------------------------- */
/* Deciding how to do the work (F47.1, edu-disagreement)                       */
/* -------------------------------------------------------------------------- */

/**
 * Having agreed to work together, they still have to agree how.
 *
 * Two variants, in the order they happen. In `proposal` each of them says what
 * they would do; the other person's answer was decided from their own
 * temperament and is not a reaction to the player's. In `disagreement` they
 * want different things, and the question is whether either of them moves.
 *
 * Every approach is an id in the authored registry, and the revision a player
 * can offer is one that was written in advance and shown to them in the choice
 * itself. Nothing here builds a plan out of sentences.
 */
function studyPlanAnswers(context: SceneContext): readonly SceneAnswer[] {
  const playerId = context.binding.playerPersonId;
  const peerId = context.binding.speakerPersonId;
  if (context.binding.variant === "proposal") {
    // Theirs is settled before the player picks anything; the same approach
    // comes back whichever choice is taken.
    const theirs = studyApproach(
      peerStudyApproach(context.world, {
        personId: playerId,
        peerPersonId: peerId,
      }).approachId,
    )!;
    return PROPOSABLE_APPROACHES.map((id) => {
      const mine = studyApproach(id)!;
      const same = mine.id === theirs.id;
      return {
        key: id,
        label: `Say you would ${mine.label}`,
        description: mine.requires,
        statement: `I think we should ${mine.label}.`,
        replies: says(
          context,
          same
            ? [`“That’s what I was going to say,” {name} says. “Good.”`]
            : [`“I’d rather we ${theirs.label},” {name} says.`],
        ),
        record: `The player said they would ${mine.label}.`,
        apply: (world: World) =>
          recordStudyProposals(world, {
            personId: playerId,
            peerPersonId: peerId,
            approachId: id,
          }).world,
      };
    });
  }
  const proposals = studyPlanProposals(context.world, playerId, peerId)!;
  const mine = studyApproach(proposals.mine)!;
  const theirs = studyApproach(proposals.theirs)!;
  const revision = proposals.revision;
  // Coming round to a revision and coming round to the player's own proposal
  // are different things, and are never said in the same words.
  const lines = (
    outcome: StudyPlanOutcome,
    part: StudyApproach | undefined,
    answer: "compromise" | "hold",
  ): readonly string[] => {
    switch (outcome) {
      case "agrees":
        return answer === "compromise"
          ? [
              "“That addresses my concern. I’m comfortable with that,” {name} says.",
              "“Yes. That gives us a way to proceed,” {name} says.",
            ]
          : [
              "“All right. We’ll do it your way,” {name} says.",
              "“Fair enough. Your way, then,” {name} says.",
            ];
      case "counterproposes":
        return [
          `“I can agree to ${part?.agreedPart ?? "part of it"}, but I still want to change ${part?.disputedPart ?? "the rest"},” {name} says.`,
        ];
      case "unresolved":
        return [
          "“We may need to leave this open until we have more information,” {name} says.",
          "“I understand your reasoning. I’m not persuaded yet,” {name} says.",
        ];
    }
  };
  const spoken = (
    outcome: StudyPlanOutcome,
    part: StudyApproach | undefined,
    answer: "compromise" | "hold",
  ): string =>
    outcome === "agrees"
      ? answer === "compromise"
        ? "That addresses my concern. I’m comfortable with that."
        : "All right. We’ll do it your way."
      : outcome === "counterproposes"
        ? `I can agree to ${part?.agreedPart ?? "part of it"}, but I still want to change ${part?.disputedPart ?? "the rest"}.`
        : "I understand your reasoning. I’m not persuaded yet.";
  const settle =
    (answer: "compromise" | "hold", outcome: StudyPlanOutcome) =>
    (world: World) =>
      recordStudyPlanAnswer(world, {
        personId: playerId,
        peerPersonId: peerId,
        answer,
        outcome,
        statement: spoken(outcome, revision, answer),
      }).world;
  // Decided here, once each, before any wording is chosen.
  const onCompromise = revision
    ? decideStudyPlanOutcome(context.world, {
        personId: playerId,
        peerPersonId: peerId,
        answer: "compromise",
      }).outcome
    : null;
  const onHold = decideStudyPlanOutcome(context.world, {
    personId: playerId,
    peerPersonId: peerId,
    answer: "hold",
  }).outcome;
  return [
    {
      key: "compare",
      label: "Compare the two approaches",
      description: "Find out what each would actually require.",
      followUp: true,
      statement: "Can we walk through what each approach would require?",
      replies: says(context, [
        `“If we ${mine.label}: ${mine.requires} If we ${theirs.label}: ${theirs.requires}”`,
      ]),
      record: `The player asked ${context.name} to compare the two approaches.`,
    },
    ...(revision && onCompromise
      ? [
          {
            key: "compromise",
            label: `Suggest you ${revision.label}`,
            description: revision.requires,
            statement: `What about this — we ${revision.label}?`,
            replies: says(context, lines(onCompromise, revision, "compromise")),
            record: `The player suggested they ${revision.label}.`,
            apply: settle("compromise", onCompromise),
          },
        ]
      : []),
    {
      key: "hold",
      label: "Keep your proposal",
      description:
        "Say what worries you about theirs. Nothing is settled by saying it.",
      statement: theirs.concern
        ? `I still think we should ${mine.label}. What worries me about the other way is that ${theirs.concern}.`
        : `I still think we should ${mine.label}.`,
      replies: says(context, lines(onHold, revision, "hold")),
      record: `The player kept their own proposal.`,
      apply: settle("hold", onHold),
    },
  ];
}

const studyPlan: SceneFamilyDefinition = {
  family: "study-plan",
  eventType: "conversation.study-plan-turn",
  setting: "Before the work starts",
  socialContext: "Two people who agreed to work together, deciding how.",
  motivation: "Settle how the shared work gets done.",
  interactionTags: ["conversation.study", "relationship.shared-work"],
  topic: (binding) =>
    `How to do the work with ${binding.facts.peerGiven ?? "somebody"}`,
  briefing(context) {
    return context.binding.variant === "proposal"
      ? `${context.fullName} agreed to work with you. Neither of you has said how yet.`
      : `${context.fullName} wants a different approach from the one you proposed. Nothing has been settled, and neither of you has to give way.`;
  },
  opening(context) {
    if (context.binding.variant === "proposal") {
      return says(context, [
        "“So how do you want to go about it?” {name} asks.",
        "“Before we start — how do you want to do this?” {name} says.",
      ]);
    }
    const theirs = context.has("theirApproach")
      ? context.fact("theirApproach")
      : "their own approach";
    const ours = context.has("myApproach")
      ? context.fact("myApproach")
      : "yours";
    return says(context, [
      `{name} wants to ${theirs}. You had said you would ${ours}. Neither of you has moved.`,
      `“I understand what you’re suggesting,” {name} says. “I still think we should ${theirs}.”`,
    ]);
  },
  answers: studyPlanAnswers,
  settled(context, answer) {
    const lines: Record<string, string> = {
      compare: "“Think about it and tell me,” {name} says.",
      compromise: "“We’ll speak again,” {name} says.",
      hold: "“We’ll speak again,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) => {
    const player = bound.binding.playerPersonId;
    const peer = bound.binding.speakerPersonId;
    if (studyPlanSettled(world, player, peer)) return false;
    return bound.binding.variant === "proposal"
      ? !studyPlanProposals(world, player, peer)
      : !!studyPlanProposals(world, player, peer) &&
          !studyPlanResting(world, player, peer);
  },
  room: withoutSpeakerOthers,
};

/* -------------------------------------------------------------------------- */
/* A question at a campaign town hall (Build 22, step 3)                       */
/* -------------------------------------------------------------------------- */

/**
 * The question as the town hall heard it, rebuilt from the binding's facts so
 * the answer pledges on exactly what was asked, even if the bill has moved on.
 */
function askedQuestion(context: SceneContext): LiveQuestion {
  return {
    measureId: context.fact("measureId") as EntityId,
    designation: context.fact("designation"),
    shortTitle: context.fact("shortTitle"),
    propositionId: context.fact("propositionId") as EntityId,
    question: context.fact("question"),
    answer: context.fact("answer") as LiveQuestion["answer"],
  };
}

function townHallAnswers(context: SceneContext): SceneAnswer[] {
  const bill = context.fact("designation");
  const stand =
    (backsTheBill: boolean, statement: string) =>
    (world: World, turn: { readonly eventId: EntityId }) =>
      stateCampaignStand(world, {
        stableKey: `town-hall-stand:${context.bindingEventId}`,
        personId: context.player.id,
        question: askedQuestion(context),
        backsTheBill,
        statement,
        sourceEventId: turn.eventId,
      });
  const forIt = `I’d vote for ${bill}.`;
  const againstIt = `I’d vote against ${bill}.`;
  return [
    {
      key: "vote-for",
      label: `Say you’d vote for ${bill}`,
      description: "Make it a public pledge.",
      statement: forIt,
      replies: says(context, [
        "“Good. People here will remember that,” {name} says.",
        "“All right. I’ll hold you to it,” {name} says.",
      ]),
      record: `The player told the town hall, “${forIt}”`,
      apply: stand(true, forIt),
    },
    {
      key: "vote-against",
      label: `Say you’d vote against ${bill}`,
      description: "Make it a public pledge.",
      statement: againstIt,
      replies: says(context, [
        "“Fair enough. At least you said it,” {name} says.",
        "“I’ll hold you to that,” {name} says.",
      ]),
      record: `The player told the town hall, “${againstIt}”`,
      apply: stand(false, againstIt),
    },
    {
      key: "not-decided",
      label: "Say you haven’t decided",
      description: "Promise nothing either way.",
      statement: "I haven’t made up my mind on it yet.",
      replies: says(context, [
        "“That’s not much of an answer,” {name} says.",
        "“Let us know when you do,” {name} says.",
      ]),
      record: `The player told the town hall they had not decided on ${bill}.`,
    },
    {
      key: "ask-what-it-does",
      label: "Ask what it does",
      description: "Hear the question before you answer.",
      followUp: true,
      statement: `What does ${bill} do?`,
      replies: says(context, [
        `“It’s ${context.fact("shortTitle")}. It comes down to this: ${context.fact("question")}” {name} says.`,
      ]),
      record: `The player asked ${context.name} what ${bill} does.`,
    },
  ];
}

const townHall: SceneFamilyDefinition = {
  family: "town-hall",
  eventType: "conversation.town-hall-turn",
  setting: "A campaign town hall",
  socialContext: "A voter asks a candidate where they stand, in public.",
  motivation: "Answer a voter’s question about a bill.",
  interactionTags: ["conversation.campaign"],
  topic: (binding) =>
    `A question about ${binding.facts.designation ?? "a bill"}`,
  briefing(context) {
    return `At the town hall on ${proseDate(context.fact("heldOn") as never)}, ${context.fullName} asked where you stand on ${context.fact("designation")}, ${context.fact("shortTitle")}. It has not been decided yet, and whatever you say here is said in public.`;
  },
  opening(context) {
    const bill = context.fact("designation");
    return says(context, [
      `“Where do you stand on ${bill}? Would you vote for it?” {name} asks.`,
      `“Before I decide on you: ${bill}. Yes or no?” {name} asks.`,
    ]);
  },
  answers: townHallAnswers,
  settled(context, answer) {
    const lines: Record<string, string> = {
      "vote-for": "“Thanks for a straight answer,” {name} says.",
      "vote-against": "“Thanks for a straight answer,” {name} says.",
      "not-decided": "“We’ll see, then,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  room: withoutSpeakerOthers,
};

export const SCENE_FAMILY_DEFINITIONS: Readonly<
  Record<SceneFamily, SceneFamilyDefinition>
> = {
  "home-evening": homeEvening,
  favor,
  "party-invite": partyInvite,
  "campaign-reaction": campaignReaction,
  "staff-followup": staffFollowup,
  "reporter-question": reporterQuestion,
  "study-peer": studyPeer,
  "study-plan": studyPlan,
  "town-hall": townHall,
};

/** When a situation stops being offered, counted from a date. */
export function sceneExpiry(date: IsoDate, days: number): IsoDate {
  return addDays(date, days);
}
