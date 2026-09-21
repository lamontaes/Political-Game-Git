import type { EntityId, IsoDate, LifeSituationKey, World } from "../simulation";
import { addDays } from "../simulation";
import {
  acceptChapterInvitation,
  canJoinPartyChapter,
  joinPartyChapter,
  leavePartyChapter,
  projectPartyEncounters,
} from "../simulation/living-world/party-chapters";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { favorEntries, performFavor } from "../simulation/life-favors";
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import {
  answerContact,
  counterWithNewDay,
  openProposal,
} from "../simulation/people-contact";
import { recalledRequest } from "../simulation/people-recall";
import {
  PROMISE_REVISIONS,
  decidePromiseRenegotiation,
  recordPromiseRenegotiation,
  renegotiationAsked,
} from "../simulation/people-promise";
import {
  answerCollaborationOffer,
  answerIntroductionOffer,
  answerRepairOffer,
  answerSharedWorkRequest,
  askRevisionForCompetingCommitment,
  chapterPlaceStillHeld,
  competingCommitmentCases,
  keepCollaborationSession,
  performSharedWorkRequest,
  stopCollaboration,
  withdrawSharedWorkRequest,
} from "../simulation/people-social-followthrough";
import {
  decideStudyPeerOutcome,
  recordStudyAnswer,
  studyAnswered,
  studyPeers,
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
import { requestPropositionKey } from "../simulation/people-request-route";
import type { BoundScene, SceneFamily } from "../simulation/scene-bindings";
import { scheduledActivityState } from "../simulation/time-work";
import { adultSituationOpen, chooseAdultOption } from "./adult-life";
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

/** "tonight", "tomorrow evening", "Tuesday evening", "the evening of …". */
export function spokenEvening(date: IsoDate, today: IsoDate): string {
  const day = spokenDay(date, today);
  if (day === "today") return "tonight";
  if (day.startsWith("on ")) return `the evening of ${proseDate(date)}`;
  return `${day} evening`;
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

/** "a seat in the House of Representatives", "Governor of Washington". */
function officePhrase(title: string): string {
  return /^seat in /i.test(title) ? `a ${lowerFirst(title)}` : title;
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
  const playerId = context.binding.playerPersonId;
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
  void playerId;
}

/**
 * After a death in the family (CRUNCH47 B1).
 *
 * Nothing here is required and nothing is measured. These are things one
 * person might say to another who lost the same person: remembering them,
 * offering to take something on, admitting there is nothing to say, or leaving
 * it for now. Anybody may say any of them, and the world records only that
 * they were said.
 */
function bereavedAnswers(context: SceneContext): SceneAnswer[] {
  const given = context.fact("deceasedGiven");
  return [
    {
      key: "remember-them",
      label: `Say something about ${given}`,
      description: "Remember them out loud.",
      statement: `I keep coming back to the small things about ${given}.`,
      replies: says(context, [
        "“So do I. That’s the part that gets me,” {name} says.",
        "“Tell me one. I’d like to hear it,” {name} says.",
      ]),
      record: `The player and ${context.name} remembered ${given} together.`,
      relationship: {
        kind: "support:grieved-together",
        change: "strengthened",
        significance: "meaningful",
        summary: ({ playerName, otherName }) =>
          `${playerName} and ${otherName} talked about ${given}.`,
      },
    },
    {
      key: "offer-help",
      label: "Offer to take something on",
      description: "There are arrangements, and you can carry some of them.",
      statement: "Tell me what needs doing. I can take some of it.",
      replies: says(context, [
        "“That would help. I’ll write you a list,” {name} says.",
        "“Thank you. I didn’t want to ask,” {name} says.",
      ]),
      record: `The player offered ${context.name} to take on some of the arrangements for ${given}.`,
      relationship: {
        kind: "support:offered-help",
        change: "strengthened",
        significance: "meaningful",
        summary: ({ playerName, otherName }) =>
          `${playerName} offered to carry some of what ${otherName} was left with.`,
      },
    },
    {
      key: "nothing-to-say",
      label: "Say you don’t know what to say",
      description: "Be honest about that much.",
      statement: "I don’t know what to say about it yet.",
      replies: says(context, [
        "“Nobody does. It’s all right,” {name} says.",
        "“You don’t have to,” {name} says.",
      ]),
      record: `The player told ${context.name} they had no words for it yet.`,
    },
    {
      key: "leave-it",
      label: "Leave it for now",
      description: "Not tonight.",
      statement: "Not tonight. I can’t.",
      replies: says(context, [
        "“All right. I’m here,” {name} says.",
        "“Another time,” {name} says.",
      ]),
      record: `The player left it for another time with ${context.name}.`,
    },
  ];
}

/** Why the player is going anyway, when a quiet evening was promised. */
function promisedExplain(
  context: SceneContext,
  title: string,
  attends: {
    readonly propositionKey: string;
    readonly proposition: string;
    readonly beliefEvidenceIds: readonly EntityId[];
    readonly sourceEntityIds: readonly EntityId[];
    readonly worldTruth: "unknown";
  },
): SceneAnswer {
  // "Before we made plans" is said only when the record shows the booking
  // came first.
  const first = context.has("committedFirst");
  const promisee = context.has("organizer")
    ? `I told ${context.fact("organizer")} I’d be there${first ? " before we made plans" : ""}`
    : `I said yes to the ${title}${first ? " before we made plans" : ""}`;
  return {
    key: "explain-why",
    label: "Explain why this one matters",
    description: "Say you’d already given your word.",
    truthIntent: "sincere",
    statement: `I’m sorry. ${promisee}, and I don’t want to go back on that.`,
    replies: says(context, [
      "“I understand. Just don’t make it a habit,” {name} says.",
      "“Okay. Tomorrow, then,” {name} says.",
    ]),
    record: `The player told ${context.name}, “I’m sorry. ${promisee}, and I don’t want to go back on that.”`,
    stance: {
      ...attends,
      asserted: "affirms",
      speakerBelief: "believes-true",
      intent: "truthful",
    },
    relationship: {
      kind: "conflict:broken-plan",
      change: "maintained",
      significance: "minor",
      summary: ({ playerName, otherName }) =>
        `${playerName} explained to ${otherName} why they were going out after all.`,
    },
  };
}

const homeEvening: SceneFamilyDefinition = {
  family: "home-evening",
  eventType: "conversation.home-evening-turn",
  setting: "Home",
  socialContext: "Two people who live together, talking about an evening.",
  motivation: "Know where each of them will be.",
  interactionTags: ["conversation.household", "relationship.shared-household"],
  topic: (binding) =>
    binding.variant === "bereaved"
      ? `${binding.facts.deceasedGiven ?? "Someone"}`
      : binding.variant === "claim-came-back"
        ? "What you said about that evening"
        : binding.variant === "promised-evening"
          ? "Tonight"
          : `Your ${binding.date ? "evening" : "plans"}`,
  briefing(context) {
    const { binding } = context;
    if (binding.variant === "bereaved") {
      const relation = context.has("relation")
        ? ` — their ${context.fact("relation")}`
        : "";
      return `${context.fact("deceasedName")} has died. ${context.fullName}${relation} is here, and the two of you have not spoken about it.`;
    }
    if (binding.variant === "claim-came-back") {
      return `${context.fullName} saw you leave for the ${context.fact("activityTitle")} after you said you would be home.`;
    }
    if (binding.variant === "promised-evening") {
      const title = context.fact("activityTitle");
      const times = `${context.fact("startTime")} to ${context.fact("endTime")}`;
      return context.fact("activityKind") === "confirmed"
        ? `You told ${context.fullName} you would spend this evening at home together, from ${context.fact("promisedTime")}. You also said you would go to the ${title} tonight, ${times}.`
        : `You told ${context.fullName} you would spend this evening at home together, from ${context.fact("promisedTime")}. You also have an unanswered invitation to the ${title} tonight, ${times}.`;
    }
    const when = `${proseDate(binding.date!)} at ${context.fact("startTime")}`;
    return binding.variant === "committed-evening"
      ? `${context.fullName} is asking about that evening. You said you would go to the ${context.fact("activityTitle")}, ${when}.`
      : `${context.fullName} is asking about that evening. You have an unanswered invitation to the ${context.fact("activityTitle")}, ${when}.`;
  },
  opening(context) {
    const { binding } = context;
    if (binding.variant === "bereaved") {
      const given = context.fact("deceasedGiven");
      return says(context, [
        `“I keep thinking I should call ${given},” {name} says.`,
        `“It still doesn’t seem real, about ${given},” {name} says.`,
      ]);
    }
    if (binding.variant === "claim-came-back") {
      return says(context, [
        `“You told me you’d be home that night. Then I watched you head out to the ${context.fact("activityTitle")},” {name} says.`,
        `“You said you had nothing on. I saw you leave for the ${context.fact("activityTitle")},” {name} says.`,
      ]);
    }
    if (binding.variant === "promised-evening") {
      const title = context.fact("activityTitle");
      return says(context, [
        `“You said you’d be home tonight. Are you still going to the ${title}?” {name} asks.`,
        `“I thought we were staying in tonight. Is the ${title} still on?” {name} asks.`,
      ]);
    }
    const evening = spokenEvening(binding.date!, context.world.currentDate);
    return context.isPartner
      ? says(context, [
          `“Are you around ${evening}, or do you have something on?” {name} asks.`,
          `“What does ${evening} look like for you?” {name} asks.`,
        ])
      : says(context, [
          `“Will you be in ${evening}?” {name} asks.`,
          `“Are you home ${evening}, or out?” {name} asks.`,
        ]);
  },
  answers(context) {
    const { binding } = context;
    if (binding.variant === "bereaved") return bereavedAnswers(context);
    if (binding.variant === "claim-came-back") {
      return cameBackAnswers(
        context,
        {
          statement:
            "You’re right. I knew about it when I said that. I’m sorry.",
          replies: [
            "“Thank you for saying it. Just tell me next time,” {name} says.",
            "“Okay. I’d rather hear the real plan, even if I don’t like it,” {name} says.",
          ],
        },
        {
          statement: "I never said I’d be home. You must have misheard.",
          replies: [
            "“I know what I heard,” {name} says.",
            "“Don’t do that. I heard you,” {name} says.",
          ],
        },
      );
    }
    const [activityId] = binding.sourceEntityIds;
    const title = context.fact("activityTitle");
    const start = context.fact("startTime");
    const evening = spokenEvening(binding.date!, context.world.currentDate);
    const onDate = `on ${proseDate(binding.date!)}`;
    const attends = {
      propositionKey: `attends:${activityId}`,
      proposition: `The player will go to the ${title} ${onDate}.`,
      beliefEvidenceIds: [activityId!],
      sourceEntityIds: [activityId!],
      worldTruth: "unknown" as const,
    };
    const askWhy: SceneAnswer = {
      key: "ask-why",
      label: `Ask why ${context.name} wants to know`,
      description: "Find out before you answer.",
      followUp: true,
      statement: "Why do you ask?",
      replies: says(
        context,
        context.isPartner
          ? [
              "“No reason. I just wondered if you’d be around,” {name} says.",
              "“Just checking. I like knowing when you’ll be home,” {name} says.",
            ]
          : [
              "“No reason. Just wondering whether you’ll be around,” {name} says.",
              "“Just so I know whether to expect you,” {name} says.",
            ],
      ),
      record: `The player asked ${context.name}, “Why do you ask?”`,
    };
    const inviteAlong: SceneAnswer[] = context.has("openToGuests")
      ? [
          {
            key: "invite-along",
            label: `Ask ${context.name} to come along`,
            description: `The ${title} is open to anyone.`,
            statement: "It’s open to anyone. Do you want to come with me?",
            replies: says(context, [
              "“Not this time. But thanks for asking,” {name} says.",
              "“I’ll pass. Tell me how it goes,” {name} says.",
            ]),
            record: `The player asked ${context.name} to come to the ${title}.`,
            relationship: {
              kind: "contact:invitation",
              change: "strengthened",
              significance: "minor",
              summary: ({ playerName, otherName }) =>
                `${playerName} asked ${otherName} to come along to the ${title}.`,
            },
          },
        ]
      : [];

    if (binding.variant === "promised-evening") {
      const end = context.fact("endTime");
      const promised = context.fact("promisedTime");
      const playerId = binding.playerPersonId;
      if (context.fact("activityKind") !== "confirmed") {
        return [
          {
            key: "skip-it",
            label: `Say you’ll skip the ${title}`,
            description: "Decline that invitation and keep the evening.",
            statement: "No, I’ll skip it. I said I’d be home.",
            replies: says(context, [
              `“Good. See you at ${promised},” {name} says.`,
              "“Thank you. I was hoping you’d say that,” {name} says.",
            ]),
            record: `The player told ${context.name}, “No, I’ll skip it. I said I’d be home,” and declined the ${title}.`,
            apply: (world) =>
              declineCalendarActivity(world, playerId, activityId!).world,
            relationship: {
              kind: "support:kept-plans",
              change: "strengthened",
              significance: "minor",
              summary: ({ playerName, otherName }) =>
                `${playerName} kept the evening ${otherName} had asked for.`,
            },
          },
          {
            key: "still-deciding",
            label: "Say you haven’t decided",
            description: "The invitation stays open.",
            statement: `I might still go to the ${title}. I haven’t decided.`,
            replies: says(context, [
              "“You did say you’d be home,” {name} says.",
              "“Let me know soon, then,” {name} says.",
            ]),
            record: `The player told ${context.name}, “I might still go to the ${title}. I haven’t decided.”`,
          },
          ...inviteAlong,
        ];
      }
      return [
        {
          key: "still-going",
          label: `Say you’re still going to the ${title}`,
          description: `It runs until ${end}.`,
          truthIntent: "sincere",
          statement: `I’m still going to the ${title}. It ends at ${end}.`,
          replies: says(context, [
            "“Okay. I guess we’ll talk another night,” {name} says.",
            "“You said you’d be home. But okay,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I’m still going to the ${title}. It ends at ${end}.”`,
          stance: {
            ...attends,
            asserted: "affirms",
            speakerBelief: "believes-true",
            intent: "truthful",
          },
          relationship: {
            kind: "conflict:broken-plan",
            change: "strained",
            significance: "minor",
            summary: ({ playerName, otherName }) =>
              `${playerName} went back on a quiet evening with ${otherName}.`,
          },
        },
        promisedExplain(context, title, attends),
        ...inviteAlong,
        {
          key: "say-home",
          label: "Say you’re staying in, as promised",
          description: `Leave out the ${title}.`,
          truthIntent: "deliberate-deception",
          statement: "No. I’m staying in tonight, like I said.",
          replies: says(context, [
            `“Good. See you at ${promised},” {name} says.`,
            "“Good. I was hoping so,” {name} says.",
          ]),
          perception: `${context.player.givenName} said they would be home tonight.`,
          record: `The player told ${context.name}, “No. I’m staying in tonight, like I said,” with the ${title} still on the calendar.`,
          stance: {
            ...attends,
            asserted: "denies",
            speakerBelief: "believes-true",
            intent: "deceive",
          },
        },
      ];
    }

    if (binding.variant === "open-evening") {
      return [
        {
          key: "say-maybe",
          label: `Say you might go to the ${title}`,
          description: "You haven’t answered the invitation yet.",
          statement: `I might go to the ${title}. I haven’t decided.`,
          replies: says(context, [
            "“Okay. Let me know when you do,” {name} says.",
            "“Fair enough. Tell me once you know,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I might go to the ${title}. I haven’t decided.”`,
        },
        {
          key: "plan-to-stay-in",
          label: "Say you’ll probably stay in",
          description:
            "An intention, not an answer: the invitation stays open until you decline it.",
          statement: `I’ll probably stay in ${evening}.`,
          replies: says(context, [
            "“Okay. Good to know,” {name} says.",
            "“A quiet night, then,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I’ll probably stay in ${evening}.”`,
        },
        ...inviteAlong,
        askWhy,
      ];
    }

    const explain: SceneAnswer = context.has("organizer")
      ? {
          key: "explain-why",
          label: "Explain why you’re going",
          description: `Tell ${context.name} you said yes to ${context.fact("organizer")} and want to keep your word.`,
          truthIntent: "sincere",
          statement: `I told ${context.fact("organizer")} I’d come to the ${title}. I want to keep my word.`,
          replies: says(context, [
            "“Then go. We can do something another night,” {name} says.",
            "“That’s fair. Tell me how it goes,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I told ${context.fact("organizer")} I’d come to the ${title}. I want to keep my word.”`,
          stance: {
            ...attends,
            asserted: "affirms",
            speakerBelief: "believes-true",
            intent: "truthful",
          },
          relationship: {
            kind: "contact:shared-plans",
            change: "strengthened",
            significance: "minor",
            summary: ({ playerName, otherName }) =>
              `${playerName} explained to ${otherName} why the ${title} mattered.`,
          },
        }
      : {
          key: "explain-why",
          label: "Explain why you’re going",
          description: "Say you already said yes and mean to follow through.",
          truthIntent: "sincere",
          statement: `I said I’d go to the ${title}, and I want to follow through.`,
          replies: says(context, [
            "“That’s fair. Tell me how it goes,” {name} says.",
            "“Okay. Go,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I said I’d go to the ${title}, and I want to follow through.”`,
          stance: {
            ...attends,
            asserted: "affirms",
            speakerBelief: "believes-true",
            intent: "truthful",
          },
        };

    return [
      {
        key: "tell-plans",
        label: `Tell ${context.name} about the ${title}`,
        description: `Say you’ll be there from ${start}.`,
        truthIntent: "sincere",
        statement: `I’ll be at the ${title} ${evening}. It starts at ${start}.`,
        replies: says(context, [
          "“Okay. Thanks for letting me know,” {name} says.",
          "“Got it. I’ll see you after,” {name} says.",
        ]),
        record: `The player told ${context.name} about the ${title} ${onDate}.`,
        stance: {
          ...attends,
          asserted: "affirms",
          speakerBelief: "believes-true",
          intent: "truthful",
        },
        relationship: {
          kind: "contact:shared-plans",
          change: "maintained",
          significance: "minor",
          summary: ({ playerName, otherName }) =>
            `${playerName} told ${otherName} where they would be that evening.`,
        },
      },
      explain,
      ...inviteAlong,
      {
        key: "say-home",
        label: `Say you’ll be home ${evening}`,
        description: `Leave out the ${title}.`,
        truthIntent: "deliberate-deception",
        statement: `No, nothing. I’ll be home ${evening}.`,
        replies: says(context, [
          "“Good. See you then,” {name} says.",
          "“Okay. I’ll count on it,” {name} says.",
        ]),
        perception: `${context.player.givenName} said they would be home ${onDate}.`,
        record: `The player told ${context.name}, “No, nothing. I’ll be home ${evening},” with the ${title} already on the calendar for ${proseDate(binding.date!)}.`,
        stance: {
          ...attends,
          asserted: "denies",
          speakerBelief: "believes-true",
          intent: "deceive",
        },
      },
      askWhy,
    ];
  },
  settled(context, answer) {
    const lines: Record<string, string> = {
      "tell-plans": `“Have a good time at the ${context.has("activityTitle") ? context.fact("activityTitle") : "meeting"},” {name} says.`,
      "explain-why": "“Go. I’ll see you after,” {name} says.",
      "invite-along": "“Maybe next time,” {name} says.",
      "say-home": "“See you then,” {name} says.",
      "skip-it": "“Thanks,” {name} says.",
      "still-deciding": "“Tell me when you know,” {name} says.",
      "still-going": "“Okay,” {name} says, and leaves it there.",
      "say-maybe": "“Let me know,” {name} says.",
      "plan-to-stay-in": "“Okay,” {name} says.",
      "admit-it": "“Okay,” {name} says. “Let’s leave it there.”",
      "keep-denying": "{name} doesn’t answer that.",
      "remember-them": "“I’m glad we talked about it,” {name} says.",
      "offer-help": "“I’ll let you know,” {name} says.",
      "nothing-to-say": "“That’s all right,” {name} says.",
      "leave-it": "“Goodnight,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) =>
    bound.binding.variant === "bereaved" ||
    bound.binding.variant === "claim-came-back" ||
    scheduledActivityState(world, bound.binding.sourceEntityIds[0]!).status ===
      "scheduled",
  room: (world, bound) =>
    // A death reaches people who do not live here; the room follows whoever
    // is actually being spoken to.
    bound.binding.variant === "bereaved"
      ? (homeRoom(world, bound) ?? withoutSpeakerOthers(world, bound))
      : homeRoom(world, bound),
};

/* -------------------------------------------------------------------------- */
/* 2. Favors and work asks                                                     */
/* -------------------------------------------------------------------------- */

const FAVOR_SITUATION: Readonly<Record<string, LifeSituationKey>> = {
  "favour-request": "adult.friend-favour",
  "extra-hours-request": "adult.work-extra-hours",
  "household-evening": "adult.household-quiet-evening",
};

function adultChoice(
  context: SceneContext,
  optionKey: string,
): SceneAnswer["apply"] {
  const situationKey = FAVOR_SITUATION[context.binding.variant]!;
  return (world) =>
    chooseAdultOption(world, {
      personId: context.binding.playerPersonId,
      situationKey,
      optionKey,
    });
}

/**
 * What became of a request, when the person who made it raises it again
 * (CRUNCH47 P4).
 *
 * Four different things a person can say, and the record keeps them apart:
 * the truth, a deliberate untruth, an honest guess, and a refusal to get into
 * it. Only the guess can turn out to be wrong without anybody having lied, and
 * only the untruth is marked before it is chosen.
 */
function recalledAnswers(context: SceneContext): SceneAnswer[] {
  const task = context.fact("task");
  const status = context.fact("status");
  const requestEventId = context.fact("requestEventId") as EntityId;
  const agreed = status === "agreed" || status === "performed";
  const done = status === "performed";
  const basis = {
    propositionKey: requestPropositionKey(requestEventId),
    proposition: `The player told ${context.name} they would ${lowerFirst(task)}.`,
    beliefEvidenceIds: [requestEventId],
    sourceEntityIds: [requestEventId],
    worldTruth: (agreed ? "true" : "false") as "true" | "false",
  };
  const straight: SceneAnswer = agreed
    ? {
        key: "said-yes",
        label: done ? "Say you did it" : "Say you took it on",
        description: done
          ? "It is done, and the record says so."
          : "You said you would, and you still mean to.",
        truthIntent: "sincere",
        statement: done
          ? `I did. It’s done.`
          : `I said I would, and I haven’t forgotten.`,
        replies: says(context, [
          done
            ? "“Thank you. I did wonder,” {name} says."
            : "“All right. I’ll leave it with you,” {name} says.",
          "“Good. Thanks for telling me,” {name} says.",
        ]),
        record: done
          ? `The player told ${context.name} the ${lowerFirst(task)} was done.`
          : `The player told ${context.name} they still meant to ${lowerFirst(task)}.`,
        stance: {
          ...basis,
          asserted: "affirms",
          speakerBelief: "believes-true",
          intent: "truthful",
        },
      }
    : {
        key: "said-no",
        label: "Say you turned it down",
        description: "You said no at the time, and you say so now.",
        truthIntent: "sincere",
        statement: "I told you at the time I couldn’t. That hasn’t changed.",
        replies: says(context, [
          "“You did. I thought I’d ask once more,” {name} says.",
          "“Fair enough. I remember,” {name} says.",
        ]),
        record: `The player reminded ${context.name} that they had declined.`,
        stance: {
          ...basis,
          asserted: "denies",
          speakerBelief: "believes-false",
          intent: "truthful",
        },
      };
  return [
    straight,
    {
      key: "think-so",
      label: agreed
        ? "Say you think you agreed, but you’re not certain"
        : "Say you think you agreed, though you can’t quite recall",
      description: "Answer from memory. You may be remembering it wrong.",
      truthIntent: "uncertain",
      statement: `I think I said I’d ${lowerFirst(task)}. I’d have to think back.`,
      replies: says(context, [
        "“That’s how I remember it too,” {name} says.",
        "“We can check between us,” {name} says.",
      ]),
      record: `The player told ${context.name}, from memory, that they thought they had agreed to ${lowerFirst(task)}.`,
      stance: {
        ...basis,
        asserted: "affirms",
        speakerBelief: "uncertain",
        intent: "from-memory",
      },
    },
    ...(agreed
      ? []
      : [
          {
            key: "claim-yes",
            label: "Say you agreed",
            description: "You know you declined.",
            truthIntent: "deliberate-deception" as const,
            statement: `Of course. I said I’d ${lowerFirst(task)}.`,
            replies: says(context, [
              "“Then I must have got it wrong,” {name} says.",
              "“All right. That’s not how I had it,” {name} says.",
            ]),
            perception: `${context.player.givenName} said they had agreed to ${lowerFirst(task)}.`,
            record: `The player told ${context.name} they had agreed to ${lowerFirst(task)}, having declined.`,
            stance: {
              ...basis,
              asserted: "affirms" as const,
              speakerBelief: "believes-false" as const,
              intent: "deceive" as const,
            },
          },
        ]),
    {
      key: "rather-not",
      label: "Say you’d rather not get into it",
      description: "Neither confirm nor deny.",
      statement: "I’d rather not get into it now.",
      replies: says(context, [
        "“All right. I won’t push,” {name} says.",
        "“Understood,” {name} says.",
      ]),
      record: `The player declined to say what had become of the ${lowerFirst(task)}.`,
      stance: {
        ...basis,
        asserted: "none",
        speakerBelief: "not-applicable",
        intent: "evade",
        worldTruth: "unknown",
      },
    },
    // Asking to change it is not dropping it (cargo family life-promise). The
    // obligation stays exactly where it is unless they actually agree to move
    // it, and what they mean is decided before the words are chosen.
    ...(agreed && !renegotiationAsked(context.world, requestEventId)
      ? PROMISE_REVISIONS.map((revision) => {
          const decided = decidePromiseRenegotiation(context.world, {
            personId: context.binding.playerPersonId,
            counterpartPersonId: context.binding.speakerPersonId,
            requestEventId,
            revisionId: revision.id,
          }).outcome;
          const spoken =
            decided === "accepts-change"
              ? `Let’s use ${revision.label} instead.`
              : decided === "needs-answer"
                ? `I still need an answer about ${lowerFirst(task)}.`
                : "I’m still relying on the arrangement we made.";
          return {
            key: `ask-for-${revision.id}`,
            label: `Ask for ${revision.label}`,
            description: revision.meaning,
            statement: `I need to discuss a different arrangement for ${lowerFirst(task)} — could we say ${revision.label}?`,
            replies: says(
              context,
              decided === "accepts-change"
                ? [
                    `“I can agree to ${revision.label},” {name} says.`,
                    `“Let’s use ${revision.label} instead,” {name} says.`,
                  ]
                : decided === "needs-answer"
                  ? [
                      `“I still need an answer about ${lowerFirst(task)},” {name} says.`,
                      "“Please let me know once you have checked,” {name} says.",
                    ]
                  : [
                      "“I’m still relying on the arrangement we made,” {name} says.",
                      "“I can’t take that responsibility over,” {name} says.",
                    ],
            ),
            record: `The player asked ${context.name} for ${revision.label} on the ${lowerFirst(task)}.`,
            apply: (world: World) =>
              recordPromiseRenegotiation(world, {
                personId: context.binding.playerPersonId,
                counterpartPersonId: context.binding.speakerPersonId,
                requestEventId,
                revisionId: revision.id,
                outcome: decided,
                task,
                statement: spoken,
              }).world,
          };
        })
      : []),
  ];
}

/**
 * Whether an action would really happen from this moment. Read on a copy of
 * the world the scene already holds, so projecting the answers writes nothing;
 * a refusal (blocked hours, a finished ask) simply leaves the option out.
 */
function changesWorld(world: World, act: (world: World) => World): boolean {
  try {
    return act(world) !== world;
  } catch {
    return false;
  }
}

/**
 * A peer's later request after shared work — and, later, the same ask raised
 * again when it was agreed and not done (MUSE-PEOPLE B1).
 *
 * The answers write through the follow-through module, because the bank's
 * writers name their own picnic proofreading. Asking, agreeing, declining,
 * doing and withdrawing stay five different records.
 */
function sharedWorkRequestAnswers(context: SceneContext): SceneAnswer[] {
  const task = context.fact("task");
  const status = context.fact("status");
  const requestEventId = context.fact("requestEventId") as EntityId;
  const playerId = context.binding.playerPersonId;
  if (status === "agreed") {
    const doIt: SceneAnswer = {
      key: "do-shared-work",
      label: `Do the ${lowerFirst(task)} now`,
      description: "Carry it out in its own minutes, separately.",
      statement: "I’ll do it now.",
      replies: says(context, [
        "“Thank you. I knew I could count on you,” {name} says.",
        "“Good. I’ll stop worrying about it,” {name} says.",
      ]),
      record: `The player told ${context.name} they would do the ${lowerFirst(task)} now.`,
      // The performer writes the follow-through itself when the work really
      // happens; the scene never claims it for a blocked or busy moment.
      apply: (world) =>
        performSharedWorkRequest(world, playerId, requestEventId),
    };
    const canDoNow = changesWorld(context.world, (world) =>
      performSharedWorkRequest(world, playerId, requestEventId),
    );
    return [
      ...(canDoNow ? [doIt] : []),
      {
        key: "withdraw-work",
        label: "Say you won’t do it after all",
        description: "Withdraw the commitment honestly.",
        statement: "I’m sorry — I’m not going to be able to do it.",
        replies: says(context, [
          "“I see. Thanks for telling me straight,” {name} says.",
          "“All right. I’ll manage without it,” {name} says.",
        ]),
        record: `The player told ${context.name} they would not do the ${lowerFirst(task)} after all.`,
        apply: (world) =>
          withdrawSharedWorkRequest(world, playerId, requestEventId),
      },
      {
        key: "leave-work",
        label: "Leave it for now",
        description: "Ask for a little more time; it is still owed.",
        statement: "I haven’t forgotten. Give me a little longer.",
        replies: says(context, [
          "“All right. I’ll leave it with you,” {name} says.",
        ]),
        record: `The player asked ${context.name} for longer on the ${lowerFirst(task)}.`,
      },
    ];
  }
  const minutes = context.has("minutes")
    ? ` It would take about ${context.fact("minutes")} minutes.`
    : "";
  const limited: SceneAnswer[] = context.has("condition")
    ? [
        {
          key: "agree-limit-shared-work",
          label: "Agree, with their limit",
          description: context.fact("condition"),
          statement: `I can help. ${context.fact("condition")}.`,
          replies: says(context, [
            "“That’s all I need,” {name} says.",
            "“Fair enough. I’ll handle the rest,” {name} says.",
          ]),
          record: `The player agreed to help ${context.name}, on the condition: ${lowerFirst(context.fact("condition"))}.`,
          apply: (world) =>
            answerSharedWorkRequest(world, {
              playerId,
              requestId: requestEventId,
              answer: "conditions",
              statement: `I can help. ${context.fact("condition")}.`,
            }).world,
        },
      ]
    : [];
  return [
    {
      key: "agree-shared-work",
      label: `Agree to ${task}`,
      description: `You’ll do it separately.${minutes}`,
      statement: "Sure. I’ll help with the notes.",
      replies: says(context, [
        "“Thank you. I’ll send them over,” {name} says.",
        "“You’re a lifesaver. It’s coming your way,” {name} says.",
      ]),
      record: `The player agreed to ${task} for ${context.name}.`,
      apply: (world) =>
        answerSharedWorkRequest(world, {
          playerId,
          requestId: requestEventId,
          answer: "agree",
          statement: "Sure. I’ll help with the notes.",
        }).world,
    },
    ...limited,
    {
      key: "decline-shared-work",
      label: "Say you can’t this time",
      description: "Turn down the request.",
      statement: "I’m sorry, I can’t take this on right now.",
      replies: says(context, [
        "“Okay. I’ll ask someone else,” {name} says.",
        "“No problem. I figured I’d ask,” {name} says.",
      ]),
      record: `The player turned down ${context.name}’s request to ${task}.`,
      apply: (world) =>
        answerSharedWorkRequest(world, {
          playerId,
          requestId: requestEventId,
          answer: "decline",
          statement: "I’m sorry, I can’t take this on right now.",
        }).world,
    },
  ];
}

/**
 * An agreed arrangement that collides with something else owed (MUSE-PEOPLE
 * B2). The player opens it: ask to change the arrangement, or keep carrying
 * both. Asking is not breaking — the obligation stands unless the other
 * person actually agrees to move it.
 */
function promiseRevisionAnswers(context: SceneContext): SceneAnswer[] {
  const task = context.fact("task");
  const requestEventId = context.fact("requestEventId") as EntityId;
  const playerId = context.binding.playerPersonId;
  const speakerId = context.binding.speakerPersonId;
  return [
    ...PROMISE_REVISIONS.map((revision) => {
      const decided = decidePromiseRenegotiation(context.world, {
        personId: playerId,
        counterpartPersonId: speakerId,
        requestEventId,
        revisionId: revision.id,
      }).outcome;
      const spoken =
        decided === "accepts-change"
          ? `Let’s use ${revision.label} instead.`
          : decided === "needs-answer"
            ? `I still need an answer about ${lowerFirst(task)}.`
            : "I’m still relying on the arrangement we made.";
      return {
        key: `ask-for-${revision.id}`,
        label: `Ask for ${revision.label}`,
        description: revision.meaning,
        statement: `I need to discuss a different arrangement for ${lowerFirst(task)} — could we say ${revision.label}?`,
        replies: says(
          context,
          decided === "accepts-change"
            ? [
                `“I can agree to ${revision.label},” {name} says.`,
                `“Let’s use ${revision.label} instead,” {name} says.`,
              ]
            : decided === "needs-answer"
              ? [
                  `“I still need an answer about ${lowerFirst(task)},” {name} says.`,
                  "“Please let me know once you have checked,” {name} says.",
                ]
              : [
                  "“I’m still relying on the arrangement we made,” {name} says.",
                  "“I can’t take that responsibility over,” {name} says.",
                ],
        ),
        record: `The player asked ${context.name} for ${revision.label} on the ${lowerFirst(task)}.`,
        apply: (world: World) =>
          askRevisionForCompetingCommitment(world, {
            playerId,
            counterpartId: speakerId,
            requestId: requestEventId,
            revisionId: revision.id,
            statement: spoken,
          }).world,
      };
    }),
    {
      key: "let-stand",
      label: "Keep carrying both",
      description: "Leave the arrangement exactly as agreed.",
      statement: "Never mind. I’ll manage both.",
      replies: says(context, [
        "“All right. I appreciate it,” {name} says.",
        "“Okay. Let me know if that changes,” {name} says.",
      ]),
      record: `The player decided to keep the arrangement with ${context.name} as agreed.`,
    },
  ];
}

/**
 * A revised arrangement come due (MUSE-PEOPLE B2). Doing it runs the bank's
 * own performance, because the underlying ask is the bank's; leaving it is
 * quiet, and the record keeps the difference.
 */
function promiseDueAnswers(context: SceneContext): SceneAnswer[] {
  const task = context.fact("task");
  const requestEventId = context.fact("requestEventId") as EntityId;
  const playerId = context.binding.playerPersonId;
  const registry = createCampaignElectionTransitionRegistry();
  const doIt: SceneAnswer = {
    key: "do-revised-work",
    label: `Do the ${lowerFirst(task)} now`,
    description: "Carry out the revised arrangement.",
    statement: "I’ll do it now.",
    replies: says(context, [
      "“Thank you. I’m glad we sorted it,” {name} says.",
      "“Good. That settles it,” {name} says.",
    ]),
    record: `The player told ${context.name} they would do the ${lowerFirst(task)} now.`,
    // performFavor records the follow-through when the work is really done;
    // the option is offered only when this moment has room for it.
    apply: (world) => performFavor(world, playerId, requestEventId, registry),
  };
  const canDoNow = changesWorld(context.world, (world) =>
    performFavor(world, playerId, requestEventId, registry),
  );
  return [
    ...(canDoNow ? [doIt] : []),
    {
      key: "leave-revised",
      label: "Leave it for now",
      description: "Ask for a little more time; it is still owed.",
      statement: "I haven’t forgotten. Give me a little longer.",
      replies: says(context, [
        "“All right. I’ll leave it with you,” {name} says.",
      ]),
      record: `The player asked ${context.name} for longer on the ${lowerFirst(task)}.`,
    },
  ];
}

/**
 * A repair attempt after a refusal (MUSE-PEOPLE B4). Accepting carries out
 * the concrete offer through the machinery that owns it; declining persists
 * the continued refusal, and the disagreement is not raised again.
 */
function repairAttemptAnswers(context: SceneContext): SceneAnswer[] {
  const offerId = context.fact("offerId") as EntityId;
  const playerId = context.binding.playerPersonId;
  return [
    {
      key: "accept-repair",
      label: "Accept the repair",
      description: "Take up the concrete offer.",
      statement: "All right. Let’s do that.",
      replies: says(context, [
        "“Good. I’m glad,” {name} says.",
        "“Thank you for hearing me out,” {name} says.",
      ]),
      record: `The player accepted ${context.name}’s repair attempt.`,
      apply: (world) =>
        answerRepairOffer(world, {
          playerId,
          offerId,
          answer: "accept",
          statement: "All right. Let’s do that.",
        }).world,
    },
    {
      key: "decline-repair",
      label: "Turn it down",
      description: "The refusal stands.",
      statement: "Thanks, but I’d rather leave it.",
      replies: says(context, [
        "“I understand,” {name} says.",
        "“All right. I won’t ask again,” {name} says.",
      ]),
      record: `The player turned down ${context.name}’s repair attempt; the refusal stands.`,
      apply: (world) =>
        answerRepairOffer(world, {
          playerId,
          offerId,
          answer: "decline",
          statement: "Thanks, but I’d rather leave it.",
        }).world,
    },
  ];
}

/**
 * A consented introduction to an actual person (MUSE-PEOPLE B5). Consenting
 * asks the third person, whose answer is theirs; the introduction happens
 * only if they agree. An introduction is not hiring and not authority.
 */
function introductionAnswers(context: SceneContext): SceneAnswer[] {
  const offerId = context.fact("offerId") as EntityId;
  const thirdGiven = context.fact("thirdGiven");
  const playerId = context.binding.playerPersonId;
  return [
    {
      key: "consent-introduction",
      label: `Agree to meet ${thirdGiven}`,
      description: "The third person is asked next; they may say no.",
      statement: "Yes, I’d like that. Please introduce us.",
      replies: says(context, [
        "“I’ll ask them,” {name} says.",
        "“Good. I’ll set it up,” {name} says.",
      ]),
      record: `The player consented to ${context.name}’s introduction to ${thirdGiven}.`,
      apply: (world) =>
        answerIntroductionOffer(world, {
          playerId,
          offerId,
          consent: true,
          statement: "Yes, I’d like that. Please introduce us.",
        }).world,
    },
    {
      key: "decline-introduction",
      label: "Decline the introduction",
      description: "No meeting, no follow-up.",
      statement: "Thanks, but not right now.",
      replies: says(context, [
        "“No problem. Another time, maybe,” {name} says.",
        "“Understood,” {name} says.",
      ]),
      record: `The player declined ${context.name}’s introduction to ${thirdGiven}.`,
      apply: (world) =>
        answerIntroductionOffer(world, {
          playerId,
          offerId,
          consent: false,
          statement: "Thanks, but not right now.",
        }).world,
    },
  ];
}

/**
 * A weekly rhythm proposed or running (MUSE-PEOPLE B6). Agreeing schedules
 * its sessions; each session is kept or ended on its own record, and ending
 * is neither failing nor breaking.
 */
function recurringAnswers(context: SceneContext): SceneAnswer[] {
  const playerId = context.binding.playerPersonId;
  const session = context.has("sessionNumber");
  if (!session) {
    const offerId = context.fact("offerId") as EntityId;
    return [
      {
        key: "agree-recurring",
        label: "Agree to meet every week",
        description: "The sessions schedule themselves from here.",
        statement: "Yes. Let’s meet every week.",
        replies: says(context, [
          "“Good. Same time next week, then,” {name} says.",
          "“I’m glad. See you next week,” {name} says.",
        ]),
        record: `The player agreed to meet ${context.name} every week for the coursework.`,
        apply: (world) =>
          answerCollaborationOffer(world, {
            playerId,
            offerId,
            accept: true,
            statement: "Yes. Let’s meet every week.",
          }).world,
        relationship: {
          kind: "support:agreed-rhythm",
          change: "strengthened",
          significance: "minor",
          summary: ({ playerName, otherName }) =>
            `${playerName} agreed to meet ${otherName} every week for the coursework.`,
        },
      },
      {
        key: "decline-recurring",
        label: "Decline the rhythm",
        description: "Keep the settled plan, nothing more.",
        statement: "I think what we have is enough for now.",
        replies: says(context, [
          "“Fair enough,” {name} says.",
          "“All right. The offer stands,” {name} says.",
        ]),
        record: `The player declined ${context.name}’s proposal to meet every week.`,
        apply: (world) =>
          answerCollaborationOffer(world, {
            playerId,
            offerId,
            accept: false,
            statement: "I think what we have is enough for now.",
          }).world,
      },
    ];
  }
  const agreedId = context.fact("agreedId") as EntityId;
  return [
    {
      key: "keep-session",
      label: "Keep meeting",
      description: "The rhythm continues.",
      statement: "Same time next week?",
      replies: says(context, [
        "“Same time next week,” {name} says.",
        "“See you then,” {name} says.",
      ]),
      record: `The player kept the weekly session with ${context.name}.`,
      apply: (world) => keepCollaborationSession(world, playerId, agreedId),
    },
    {
      key: "stop-session",
      label: "End the rhythm",
      description: "What was kept stays kept.",
      statement: "I think we can stop the regular sessions now.",
      replies: says(context, [
        "“All right. It was useful while it lasted,” {name} says.",
        "“Understood. Thanks for the weeks,” {name} says.",
      ]),
      record: `The player ended the weekly sessions with ${context.name}.`,
      apply: (world) =>
        stopCollaboration(
          world,
          playerId,
          agreedId,
          "I think we can stop the regular sessions now.",
        ),
    },
  ];
}

/**
 * A chapter place through the organizer, and the organizer's later check-in
 * (MUSE-PEOPLE B6). Joining runs the chapter's own route in the answers, so
 * an invitation never acts as an appointment; stepping back leaves through
 * the same route.
 */
function roleInvitationAnswers(context: SceneContext): SceneAnswer[] {
  const playerId = context.binding.playerPersonId;
  const chapter = context.fact("chapterName");
  const [, chapterId] = context.binding.sourceEntityIds;
  const question: SceneAnswer = {
    key: "what-involved",
    label: "Ask what helping involves",
    description: "Find out before you answer.",
    followUp: true,
    statement: "What would helping involve?",
    replies: says(context, [
      "“Just coming to the meetings and lending a hand where you can. You can step back whenever you like,” {name} says.",
    ]),
    record: `The player asked ${context.name} what helping at the ${chapter} would involve.`,
  };
  if (!canJoinPartyChapter(context.world, playerId, chapterId!)) {
    return [question];
  }
  const offerId = context.fact("offerId") as EntityId;
  return [
    {
      key: "join-role",
      label: `Join the ${chapter}`,
      description: "Become a volunteer member. It is not party registration.",
      statement: "Yes. I’d like to join.",
      replies: says(context, [
        "“Welcome aboard. I’ll add you to the list,” {name} says.",
        "“Glad to have you,” {name} says.",
      ]),
      record: `The player joined the ${chapter} at ${context.name}’s invitation.`,
      apply: (world) =>
        answerCollaborationOffer(world, {
          playerId,
          offerId,
          accept: true,
          statement: "Yes. I’d like to join.",
        }).world,
      relationship: {
        kind: "contact:joined-organization",
        change: "strengthened",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} joined the chapter ${otherName} organizes.`,
      },
    },
    {
      key: "not-yet-role",
      label: "Say not yet",
      description: "Leave the place open.",
      statement: "Not yet. Let me think about it.",
      replies: says(context, [
        "“Take your time,” {name} says.",
        "“The offer stands,” {name} says.",
      ]),
      record: `The player told ${context.name} they were not ready to join the ${chapter} yet.`,
    },
    question,
  ];
}

function roleCheckinAnswers(context: SceneContext): SceneAnswer[] {
  const playerId = context.binding.playerPersonId;
  const chapter = context.fact("chapterName");
  const [, chapterId] = context.binding.sourceEntityIds;
  return [
    {
      key: "keep-helping",
      label: "Say you’ll keep helping",
      description: "The membership continues.",
      statement: "It’s going well. I’ll keep coming.",
      replies: says(context, [
        "“Good to hear,” {name} says.",
        "“Glad it suits you,” {name} says.",
      ]),
      record: `The player told ${context.name} they would keep helping at the ${chapter}.`,
      relationship: {
        kind: "support:kept-helping",
        change: "maintained",
        significance: "minor",
        summary: ({ playerName, otherName }) =>
          `${playerName} kept helping at the chapter ${otherName} organizes.`,
      },
    },
    {
      key: "step-back",
      label: "Step back",
      description: "Leave through the chapter’s own route.",
      statement: "I need to step back for now.",
      replies: says(context, [
        "“Sorry to hear it. The door stays open,” {name} says.",
        "“Understood. Thanks for the help,” {name} says.",
      ]),
      record: `The player stepped back from the ${chapter}.`,
      apply: (world) =>
        leavePartyChapter(world, playerId, chapterId as EntityId),
    },
  ];
}

/**
 * Whether a follow-through scene is still answerable (MUSE-PEOPLE B).
 *
 * Every branch reads the record the scene was bound from: an answered ask, a
 * carried-out arrangement, a withdrawn proposal or a finished rhythm stops
 * the scene, and a changed world never gets the old one.
 */
function followThroughSceneRelevant(
  world: World,
  binding: BoundScene["binding"],
): boolean {
  const playerId = binding.playerPersonId;
  switch (binding.variant) {
    case "shared-work-request": {
      const requestId = binding.facts.requestEventId as EntityId;
      const entry = favorEntries(world, playerId).find(
        (candidate) => candidate.request.id === requestId,
      );
      if (!entry) return false;
      if (!entry.response) return true;
      if (entry.outcome || entry.status !== "agreed") return false;
      return world.history.events.some(
        (event) =>
          event.type === "life.followthrough-raised" &&
          event.tags.includes(`followthrough.source:${requestId}`),
      );
    }
    case "promise-revision": {
      const requestId = binding.sourceEntityIds[0];
      return competingCommitmentCases(world, playerId).some(
        (casing) => casing.requestId === requestId,
      );
    }
    case "promise-due": {
      const dueId = binding.sourceEntityIds[0];
      const due = world.history.events.find((event) => event.id === dueId);
      if (!due || due.type !== "life.promise-comes-due") return false;
      const requestId = due.tags
        .find((tag) => tag.startsWith("followthrough.source:"))
        ?.slice("followthrough.source:".length);
      const entry = favorEntries(world, playerId).find(
        (candidate) => candidate.request.id === requestId,
      );
      return !!entry && !entry.outcome && entry.status === "agreed";
    }
    case "reconnect": {
      const proposalId = binding.sourceEntityIds[0];
      const proposal = openProposal(world, playerId, binding.speakerPersonId);
      return !!proposal && proposal.eventId === proposalId;
    }
    case "repair-attempt": {
      const offerId = binding.sourceEntityIds[0];
      const offer = world.history.events.find((event) => event.id === offerId);
      if (!offer || offer.type !== "life.repair-offered") return false;
      return !world.history.events.some(
        (event) =>
          (event.type === "life.repair-accepted" ||
            event.type === "life.repair-declined") &&
          event.tags.includes(`followthrough.answer:${offerId}`),
      );
    }
    case "introduction": {
      const offerId = binding.sourceEntityIds[0];
      const offer = world.history.events.find((event) => event.id === offerId);
      if (!offer || offer.type !== "life.introduction-offered") return false;
      return !world.history.events.some(
        (event) =>
          (event.type === "life.introduction-made" ||
            event.type === "life.introduction-declined" ||
            event.type === "life.introduction-offer-declined") &&
          event.tags.includes(`followthrough.answer:${offerId}`),
      );
    }
    default:
      return false;
  }
}

const favor: SceneFamilyDefinition = {
  family: "favor",
  eventType: "conversation.favor-turn",
  setting: "Answering a request for help",
  socialContext: "A person the player knows asked for a specific favor.",
  motivation: "Answer a specific request.",
  interactionTags: ["conversation.request"],
  topic: (binding) =>
    binding.variant === "meet-up"
      ? `${binding.facts.speakerGiven ?? "Somebody"} wants to meet`
      : binding.variant === "claim-came-back" ||
          binding.variant === "memory-corrected"
        ? "What you said about it"
        : binding.variant === "recalled"
          ? `What became of ${lowerFirst(binding.facts.task ?? "the favor")}`
          : binding.variant === "extra-hours-request"
            ? "Extra hours at work"
            : binding.variant === "household-evening"
              ? "An evening at home"
              : binding.variant === "shared-work-request"
                ? binding.facts.status === "agreed"
                  ? `The shared work you said you would do`
                  : `Help with the shared work`
                : binding.variant === "promise-revision"
                  ? `Changing the arrangement with ${binding.facts.speakerGiven ?? "somebody"}`
                  : binding.variant === "promise-due"
                    ? "The revised arrangement came due"
                    : binding.variant === "reconnect"
                      ? `${binding.facts.speakerGiven ?? "Somebody"} got back in touch`
                      : binding.variant === "repair-attempt"
                        ? `${binding.facts.speakerGiven ?? "Somebody"} wants to make amends`
                        : binding.variant === "introduction"
                          ? `Meeting ${binding.facts.thirdGiven ?? "somebody new"}`
                          : binding.facts.speakerGiven
                            ? `A favor for ${binding.facts.speakerGiven}`
                            : "A favor",
  briefing(context) {
    const who = context.relationship
      ? `${context.fullName}, ${context.relationship},`
      : context.fullName;
    if (context.binding.variant === "meet-up") {
      const last = context.has("lastContactOn")
        ? ` You have not seen each other since ${proseDate(context.fact("lastContactOn") as never)}.`
        : "";
      return `${who} is asking whether you want to meet on ${proseDate(context.binding.date!)}.${last} Answering takes no time.`;
    }
    if (context.binding.variant === "claim-came-back") {
      return `${context.fullName} has gone back over ${context.fact("evidenceLabel")} and it does not match what you told them.`;
    }
    if (context.binding.variant === "memory-corrected") {
      return `${context.fullName} checked ${context.fact("evidenceLabel")}. What you told them from memory was wrong.`;
    }
    if (context.binding.variant === "recalled") {
      const asked = proseDate(context.binding.date!);
      const answer =
        context.fact("status") === "declined"
          ? "You told them you could not."
          : context.fact("status") === "performed"
            ? "You did it."
            : context.fact("status") === "agreed"
              ? "You said you would."
              : "You never gave them an answer.";
      return `${who} asked you on ${asked} to ${context.fact("task")}. ${answer}`;
    }
    if (context.binding.variant === "extra-hours-request") {
      return `${who} is asking whether you can ${context.fact("task")}. Pay and the date are not settled.`;
    }
    if (context.binding.variant === "shared-work-request") {
      return context.fact("status") === "agreed"
        ? `${who} is raising the ${context.fact("task")} you said you would do. It is not done.`
        : `${who} is asking you to ${context.fact("task")}, after the work you did together. Answering takes no time.`;
    }
    if (context.binding.variant === "promise-revision") {
      return `You owe ${who} the ${context.fact("task")}, and ${context.fact("competing")} is in the way. You can ask to change the arrangement, or keep carrying both. Asking is not breaking.`;
    }
    if (context.binding.variant === "promise-due") {
      return `The revised arrangement on the ${context.fact("task")} with ${who} has come due. It is still agreed and not done.`;
    }
    if (context.binding.variant === "reconnect") {
      return `${who} reached out about ${context.fact("memorySummary")}, and is asking whether you want to meet. Answering takes no time.`;
    }
    if (context.binding.variant === "repair-attempt") {
      return `${who} turned down ${context.fact("refusedSummary")} and now wants to ${context.fact("offerText")}.`;
    }
    if (context.binding.variant === "introduction") {
      return `${who} offered to introduce ${context.fact("thirdGiven")}, because ${context.fact("reason")}. Meeting them is a separate choice for each of you.`;
    }
    if (context.binding.variant === "household-evening") {
      return `${who} will be home this evening and is asking whether you would like to sit and talk, from ${context.fact("startTime")}. Answering takes no time; the evening itself is on your calendar.`;
    }
    const minutes = context.has("minutes")
      ? ` It would take about ${context.fact("minutes")} minutes, done separately; answering takes no time.`
      : "";
    return `${who} is asking you to ${context.fact("task")}.${minutes}`;
  },
  opening(context) {
    if (context.binding.variant === "meet-up") {
      const spoken = spokenDay(
        context.binding.date!,
        context.world.currentDate,
      );
      return says(context, [
        `“It’s been a long time. Are you free ${spoken}?” {name} asks.`,
        `“I was thinking about you. Could you do ${spoken}?” {name} asks.`,
      ]);
    }
    if (context.binding.variant === "claim-came-back") {
      return says(context, [
        "“That isn’t how I remember it, and I checked,” {name} says.",
        "“I went back over it. What you told me isn’t what happened,” {name} says.",
      ]);
    }
    if (context.binding.variant === "memory-corrected") {
      return says(context, [
        "“I think you had that the wrong way round. I checked,” {name} says.",
      ]);
    }
    if (context.binding.variant === "recalled") {
      const task = lowerFirst(context.fact("task"));
      return says(context, [
        `“I wanted to ask you about the ${task}. Where did we land on that?” {name} asks.`,
        `“It’s been a while. Did anything come of the ${task}?” {name} asks.`,
      ]);
    }
    if (context.binding.variant === "promise-revision") {
      return says(context, [
        `“About the ${lowerFirst(context.fact("task"))} — with ${context.fact("competing")} in the way, what do you want to do?” {name} asks.`,
        `“The ${lowerFirst(context.fact("task"))} still stands. Can we talk about how?” {name} asks.`,
      ]);
    }
    if (context.binding.variant === "promise-due") {
      return says(context, [
        `“The ${lowerFirst(context.fact("task"))} we changed — it’s time,” {name} says.`,
        `“I wanted to check on the ${lowerFirst(context.fact("task"))}, the way we left it,” {name} says.`,
      ]);
    }
    if (context.binding.variant === "reconnect") {
      return says(context, [
        `“I keep thinking about ${context.fact("memorySummary")}. Are you free to catch up?” {name} asks.`,
        `“It’s been since ${context.fact("memorySummary")}. Could we meet?” {name} asks.`,
      ]);
    }
    const opening = context.fact("opening");
    const verb = opening.trim().endsWith("?") ? "asks" : "says";
    return says(context, [
      `“${opening}” {name} ${verb}.`,
      `“Do you have a minute? ${opening}” {name} ${verb}.`,
    ]);
  },
  answers(context) {
    if (context.binding.variant === "meet-up") return meetUpAnswers(context);
    if (context.binding.variant === "reconnect") return meetUpAnswers(context);
    if (context.binding.variant === "shared-work-request") {
      return sharedWorkRequestAnswers(context);
    }
    if (context.binding.variant === "promise-revision") {
      return promiseRevisionAnswers(context);
    }
    if (context.binding.variant === "promise-due")
      return promiseDueAnswers(context);
    if (context.binding.variant === "repair-attempt") {
      return repairAttemptAnswers(context);
    }
    if (context.binding.variant === "introduction") {
      return introductionAnswers(context);
    }
    if (context.binding.variant === "claim-came-back") {
      return cameBackAnswers(
        context,
        {
          statement: "You’re right. I knew better when I said it.",
          replies: [
            "“Thank you for saying so,” {name} says.",
            "“That’s something, at least,” {name} says.",
          ],
        },
        {
          statement: "That is what I told you, and I stand by it.",
          replies: [
            "“Then we remember it differently,” {name} says.",
            "“All right,” {name} says, and lets it drop.",
          ],
        },
      );
    }
    if (context.binding.variant === "memory-corrected") {
      return memoryCorrectedAnswers(context);
    }
    if (context.binding.variant === "recalled") return recalledAnswers(context);
    const open = adultSituationOpen(
      context.world,
      context.binding.playerPersonId,
      FAVOR_SITUATION[context.binding.variant]!,
    );
    const followUps: SceneAnswer[] = [];
    if (context.binding.variant === "household-evening") {
      const start = context.fact("startTime");
      const whatAbout: SceneAnswer = {
        key: "ask-what-about",
        label: "Ask if something’s on their mind",
        description: "Find out before you answer.",
        followUp: true,
        statement: "Is something on your mind?",
        replies: says(context, [
          "“Nothing in particular. I just thought it would be nice to talk,” {name} says.",
        ]),
        record: `The player asked ${context.name}, “Is something on your mind?”`,
      };
      if (!open) return [whatAbout];
      return [
        {
          key: "spend-evening",
          label: "Say you’d like that",
          description: `Spend the evening together from ${start}.`,
          statement: "I’d like that.",
          replies: says(context, [
            `“Good. See you at ${start},” {name} says.`,
            "“Good. I’ll be here,” {name} says.",
          ]),
          record: `The player agreed to spend the evening at home with ${context.name}.`,
          apply: adultChoice(context, "spend-it-together"),
        },
        {
          key: "keep-evening",
          label: "Say you need the evening to yourself",
          description: "Turn down the evening, kindly.",
          statement: "I think I need the evening to myself tonight.",
          replies: says(context, [
            "“That’s fine. Another time,” {name} says.",
            "“Of course. I’ll leave you to it,” {name} says.",
          ]),
          record: `The player told ${context.name}, “I think I need the evening to myself tonight.”`,
          apply: adultChoice(context, "keep-it-yours"),
        },
        whatAbout,
      ];
    }
    if (context.binding.variant === "extra-hours-request") {
      followUps.push({
        key: "ask-pay",
        label: "Ask what it pays",
        description: "Find out before you agree.",
        followUp: true,
        statement: "What would it pay?",
        replies: says(context, [
          "“We still have to work that out, and the date too,” {name} says.",
        ]),
        record: `The player asked ${context.name} what the extra hour would pay.`,
      });
    } else if (context.has("minutes")) {
      followUps.push({
        key: "ask-how-long",
        label: "Ask how long it will take",
        description: "Find out before you agree.",
        followUp: true,
        statement: "How long do you think it’ll take?",
        replies: says(context, [
          `“About ${context.fact("minutes")} minutes, I’d guess,” {name} says.`,
        ]),
        record: `The player asked ${context.name} how long it would take.`,
      });
    }
    if (!open) return followUps;

    if (context.binding.variant === "extra-hours-request") {
      return [
        {
          key: "take-hours",
          label: "Say you’ll stay the extra hour",
          description: "The date and pay still need agreeing.",
          statement:
            "Yes, I can stay the extra hour. Let’s settle the date and pay.",
          replies: says(context, [
            "“Thanks. I’ll check the schedule and get back to you,” {name} says.",
            "“Great. We’ll sort out the details,” {name} says.",
          ]),
          record: `The player agreed to ${context.fact("task")} for ${context.name}, date and pay still to be agreed.`,
          apply: adultChoice(context, "take-them"),
        },
        {
          key: "offer-part",
          label: "Offer part of the hour",
          description: "Say you can stay, but not the whole hour.",
          statement: "I can stay a bit, but not the full hour.",
          replies: says(context, [
            "“Some is better than none. Thanks,” {name} says.",
            "“I’ll take what I can get,” {name} says.",
          ]),
          record: `The player offered ${context.name} part of the extra hour.`,
          apply: adultChoice(context, "trade"),
        },
        {
          key: "decline-hours",
          label: "Say you can’t",
          description: "Turn down the extra hour.",
          statement: "I can’t add an hour to my next shift.",
          replies: says(context, [
            "“Understood. I’ll ask around,” {name} says.",
            "“Okay. Thanks for telling me straight,” {name} says.",
          ]),
          record: `The player turned down ${context.name}’s request for an extra hour.`,
          apply: adultChoice(context, "decline"),
        },
        ...followUps,
      ];
    }

    const limited: SceneAnswer[] = context.has("condition")
      ? [
          {
            key: "agree-with-limit",
            label: "Agree, with a limit",
            description: context.fact("condition"),
            statement: `I can help. ${context.fact("condition")}.`,
            replies: says(context, [
              "“That’s all I need,” {name} says.",
              "“Fair enough. I’ll handle the rest,” {name} says.",
            ]),
            record: `The player agreed to help ${context.name}, on the condition: ${lowerFirst(context.fact("condition"))}.`,
            apply: adultChoice(context, "conditions"),
          },
        ]
      : [];
    return [
      {
        key: "agree",
        label: `Agree to ${context.fact("task")}`,
        description: "You’ll do it separately.",
        statement: "Sure. Send it over and I’ll take a look.",
        replies: says(context, [
          "“Thank you. I’ll send it over,” {name} says.",
          "“You’re a lifesaver. It’s coming your way,” {name} says.",
        ]),
        record: `The player agreed to ${context.fact("task")} for ${context.name}.`,
        apply: adultChoice(context, "do-it"),
      },
      ...limited,
      {
        key: "decline",
        label: "Say you can’t this time",
        description: "Turn down the request.",
        statement: "I’m sorry, I can’t take this on right now.",
        replies: says(context, [
          "“Okay. I’ll ask someone else,” {name} says.",
          "“No problem. I figured I’d ask,” {name} says.",
        ]),
        record: `The player turned down ${context.name}’s request to ${context.fact("task")}.`,
        apply: adultChoice(context, "decline"),
      },
      ...followUps,
    ];
  },
  settled(context, answer) {
    const done: Record<string, string> = {
      agree: "“Thanks again,” {name} says.",
      "agree-with-limit": "“Thanks. That helps,” {name} says.",
      decline: "“It’s fine, really,” {name} says.",
      "take-hours": "“I’ll let you know about the date,” {name} says.",
      "offer-part": "“Thanks for helping where you can,” {name} says.",
      "decline-hours": "“No hard feelings,” {name} says.",
      "spend-evening": "“See you tonight,” {name} says.",
      "keep-evening": "“Another time,” {name} says.",
      "said-yes": "“Thanks. That’s all I wanted to know,” {name} says.",
      "said-no": "“Understood,” {name} says.",
      "think-so": "“We’ll leave it there for now,” {name} says.",
      "admit-it": "“Okay. Thank you,” {name} says.",
      "keep-denying": "{name} lets it drop.",
      "thank-for-correction": "“No harm done,” {name} says.",
      "claim-yes": "“All right,” {name} says.",
      "rather-not": "“Another time, then,” {name} says.",
      "say-yes": "“See you then,” {name} says.",
      "offer-another-day": "“I’ll let you know,” {name} says.",
      "say-no": "“Take care,” {name} says.",
      "ask-what-for": "“Just the two of us catching up,” {name} says.",
      "agree-shared-work": "“Thanks again,” {name} says.",
      "agree-limit-shared-work": "“Thanks. That helps,” {name} says.",
      "decline-shared-work": "“It’s fine, really,” {name} says.",
      "do-shared-work": "“Thank you. That means a lot,” {name} says.",
      "withdraw-work": "“I’m sorry to hear it,” {name} says.",
      "leave-work": "“All right. I’ll leave it with you,” {name} says.",
      "ask-for-more-time": "“Let’s see how it goes,” {name} says.",
      "ask-for-smaller-part": "“Let’s see how it goes,” {name} says.",
      "let-stand": "“Thanks. I appreciate it,” {name} says.",
      "do-revised-work": "“Thank you. I’m glad we sorted it,” {name} says.",
      "leave-revised": "“All right. I’ll leave it with you,” {name} says.",
      "accept-repair": "“Good. I’m glad,” {name} says.",
      "decline-repair": "“I understand,” {name} says.",
      "consent-introduction": "“I’ll ask them,” {name} says.",
      "decline-introduction": "“No problem,” {name} says.",
    };
    return fill(done[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) =>
    // A request raised again is answerable on its own record, not on an open
    // opportunity: the opportunity it came from was answered long ago.
    bound.binding.variant === "shared-work-request" ||
    bound.binding.variant === "promise-revision" ||
    bound.binding.variant === "promise-due" ||
    bound.binding.variant === "reconnect" ||
    bound.binding.variant === "repair-attempt" ||
    bound.binding.variant === "introduction"
      ? followThroughSceneRelevant(world, bound.binding)
      : bound.binding.variant === "meet-up"
        ? !!openProposal(
            world,
            bound.binding.playerPersonId,
            bound.binding.speakerPersonId,
          )
        : bound.binding.variant === "claim-came-back" ||
            bound.binding.variant === "memory-corrected"
          ? true
          : bound.binding.variant === "recalled"
            ? !!recalledRequest(
                world,
                bound.binding.playerPersonId,
                bound.binding.facts.requestEventId as EntityId,
              )
            : lifeOpportunitiesFor(world, bound.binding.playerPersonId).some(
                (entry) => entry.eventId === bound.binding.sourceEntityIds[0],
              ),
  room: (world, bound) =>
    bound.binding.variant === "household-evening"
      ? homeRoom(world, bound)
      : withoutSpeakerOthers(world, bound),
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
        : binding.variant === "role-invitation"
          ? `Joining the ${binding.facts.chapterName}`
          : binding.variant === "role-checkin"
            ? `Settling in at the ${binding.facts.chapterName}`
            : `An invitation from the ${binding.facts.chapterName}`,
  briefing(context) {
    const chapter = context.fact("chapterName");
    if (context.binding.variant === "role-invitation") {
      return `${context.fullName}, who organizes the ${chapter}, invited you to join and help with the meetings. Joining makes you a volunteer member; it is not party registration, and the invitation is not an appointment.`;
    }
    if (context.binding.variant === "role-checkin") {
      return `${context.fullName} is checking how you are settling in at the ${chapter} since you joined.`;
    }
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
    if (context.binding.variant === "role-invitation") {
      const opening = context.fact("opening");
      if (opening.trim()) {
        const verb = opening.trim().endsWith("?") ? "asks" : "says";
        return says(context, [`“${opening}” {name} ${verb}.`]);
      }
      return says(context, [
        `“We could use one more person at the ${chapter}. Would you join us?” {name} asks.`,
      ]);
    }
    if (context.binding.variant === "role-checkin") {
      return says(context, [
        "“How are you finding the meetings?” {name} asks.",
        "“Settling in all right? I wanted to check,” {name} says.",
      ]);
    }
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
    if (context.binding.variant === "role-invitation") {
      return roleInvitationAnswers(context);
    }
    if (context.binding.variant === "role-checkin") {
      return roleCheckinAnswers(context);
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
      "join-role": "“Welcome aboard,” {name} says.",
      "not-yet-role": "“The offer stands,” {name} says.",
      "keep-helping": "“Good to hear,” {name} says.",
      "step-back": "“The door stays open,” {name} says.",
      "keep-inviting": "“Talk soon,” {name} says.",
      "not-for-me": "“Take care,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) => {
    const { binding } = bound;
    if (binding.variant === "role-invitation") {
      const offerId = binding.sourceEntityIds[0];
      const offer = world.history.events.find((event) => event.id === offerId);
      if (!offer || offer.type !== "life.collaboration-offered") return false;
      const answered = world.history.events.some(
        (event) =>
          (event.type === "life.collaboration-agreed" ||
            event.type === "life.collaboration-declined") &&
          event.tags.includes(`followthrough.answer:${offerId}`),
      );
      if (answered) return false;
      return canJoinPartyChapter(
        world,
        binding.playerPersonId,
        binding.sourceEntityIds[1]!,
      );
    }
    if (binding.variant === "role-checkin") {
      return chapterPlaceStillHeld(
        world,
        binding.playerPersonId,
        binding.sourceEntityIds[1]!,
      );
    }
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
      replies: says(context, answer(decided)),
      record: `The player asked ${context.name} about working on the coursework together.`,
      apply: settle(
        decided,
        decided === "agrees"
          ? "Yes. Let\u2019s work out who is doing what."
          : decided === "counterproposes"
            ? `We already have the main work divided up. Would you be interested in ${task}?`
            : "I\u2019ve already committed to another group.",
      ),
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

/**
 * Whether a weekly-rhythm scene is still answerable (MUSE-PEOPLE B6).
 *
 * The offer binds while neither acceptance nor refusal is on record; a
 * running rhythm binds while no ending or establishment is recorded, sessions
 * remain, and the two still share the program. A left program ends the
 * rhythm through the callback, never through a stale scene.
 */
function recurringSceneRelevant(
  world: World,
  binding: BoundScene["binding"],
): boolean {
  const playerId = binding.playerPersonId;
  const peerId = binding.speakerPersonId;
  if (binding.facts.sessionNumber) {
    const agreedId = binding.facts.agreedId as EntityId;
    const agreed = world.history.events.find((event) => event.id === agreedId);
    if (!agreed || agreed.type !== "life.collaboration-agreed") return false;
    const sourceTag = `followthrough.source:${agreedId}`;
    const finished = world.history.events.some(
      (event) =>
        (event.type === "life.collaboration-ended" ||
          event.type === "life.collaboration-established" ||
          event.type === "life.collaboration-declined") &&
        event.tags.includes(sourceTag),
    );
    if (finished) return false;
    const sessions = world.history.events.filter(
      (event) =>
        event.type === "life.collaboration-session-kept" &&
        event.tags.includes(sourceTag),
    ).length;
    if (sessions >= 3) return false;
    return studyPeers(world, playerId).some((peer) => peer.personId === peerId);
  }
  const offerId = binding.sourceEntityIds[0];
  const offer = world.history.events.find((event) => event.id === offerId);
  if (!offer || offer.type !== "life.collaboration-offered") return false;
  return !world.history.events.some(
    (event) =>
      (event.type === "life.collaboration-agreed" ||
        event.type === "life.collaboration-declined") &&
      event.tags.includes(`followthrough.answer:${offerId}`),
  );
}

const studyPlan: SceneFamilyDefinition = {
  family: "study-plan",
  eventType: "conversation.study-plan-turn",
  setting: "Before the work starts",
  socialContext: "Two people who agreed to work together, deciding how.",
  motivation: "Settle how the shared work gets done.",
  interactionTags: ["conversation.study", "relationship.shared-work"],
  topic: (binding) =>
    binding.variant === "recurring"
      ? binding.facts.sessionNumber
        ? `The weekly session with ${binding.facts.peerGiven ?? "somebody"}`
        : `Meeting every week with ${binding.facts.peerGiven ?? "somebody"}`
      : `How to do the work with ${binding.facts.peerGiven ?? "somebody"}`,
  briefing(context) {
    if (context.binding.variant === "recurring") {
      return context.has("sessionNumber")
        ? `You agreed to meet ${context.fullName} every week for the coursework. Session ${context.fact("sessionNumber")} is due; keeping it or ending it is both ordinary.`
        : `${context.fullName} proposed meeting every week to keep at the coursework, now the plan you settled on is running.`;
    }
    return context.binding.variant === "proposal"
      ? `${context.fullName} agreed to work with you. Neither of you has said how yet.`
      : `${context.fullName} wants a different approach from the one you proposed. Nothing has been settled, and neither of you has to give way.`;
  },
  opening(context) {
    if (context.binding.variant === "recurring") {
      if (context.has("sessionNumber")) {
        return says(context, [
          "“Same time this week?” {name} asks.",
          "“Are we still on for the week?” {name} asks.",
        ]);
      }
      const opening = context.fact("opening");
      if (opening.trim()) {
        const verb = opening.trim().endsWith("?") ? "asks" : "says";
        return says(context, [`“${opening}” {name} ${verb}.`]);
      }
      return says(context, [
        "“Would you meet every week to keep at it?” {name} asks.",
      ]);
    }
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
  answers(context) {
    if (context.binding.variant === "recurring") {
      return recurringAnswers(context);
    }
    return studyPlanAnswers(context);
  },
  settled(context, answer) {
    const lines: Record<string, string> = {
      compare: "“Think about it and tell me,” {name} says.",
      compromise: "“We’ll speak again,” {name} says.",
      hold: "“We’ll speak again,” {name} says.",
      "agree-recurring": "“Same time next week, then,” {name} says.",
      "decline-recurring": "“Fair enough,” {name} says.",
      "keep-session": "“See you then,” {name} says.",
      "stop-session": "“Understood,” {name} says.",
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) => {
    const player = bound.binding.playerPersonId;
    const peer = bound.binding.speakerPersonId;
    if (bound.binding.variant === "recurring") {
      return recurringSceneRelevant(world, bound.binding);
    }
    if (studyPlanSettled(world, player, peer)) return false;
    return bound.binding.variant === "proposal"
      ? !studyPlanProposals(world, player, peer)
      : !!studyPlanProposals(world, player, peer) &&
          !studyPlanResting(world, player, peer);
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
};

/** When a situation stops being offered, counted from a date. */
export function sceneExpiry(date: IsoDate, days: number): IsoDate {
  return addDays(date, days);
}
