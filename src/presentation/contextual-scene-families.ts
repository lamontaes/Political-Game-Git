import type { EntityId, IsoDate, LifeSituationKey, World } from "../simulation";
import { addDays } from "../simulation";
import {
  acceptChapterInvitation,
  canJoinPartyChapter,
  joinPartyChapter,
  projectPartyEncounters,
} from "../simulation/living-world/party-chapters";
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
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
    binding.variant === "claim-came-back"
      ? "What you said about that evening"
      : binding.variant === "promised-evening"
        ? "Tonight"
        : `Your ${binding.date ? "evening" : "plans"}`,
  briefing(context) {
    const { binding } = context;
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
    };
    return fill(lines[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) =>
    bound.binding.variant === "claim-came-back" ||
    scheduledActivityState(world, bound.binding.sourceEntityIds[0]!).status ===
      "scheduled",
  room: homeRoom,
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

const favor: SceneFamilyDefinition = {
  family: "favor",
  eventType: "conversation.favor-turn",
  setting: "Answering a request for help",
  socialContext: "A person the player knows asked for a specific favor.",
  motivation: "Answer a specific request.",
  interactionTags: ["conversation.request"],
  topic: (binding) =>
    binding.variant === "extra-hours-request"
      ? "Extra hours at work"
      : binding.variant === "household-evening"
        ? "An evening at home"
        : binding.facts.speakerGiven
          ? `A favor for ${binding.facts.speakerGiven}`
          : "A favor",
  briefing(context) {
    const who = context.relationship
      ? `${context.fullName}, ${context.relationship},`
      : context.fullName;
    if (context.binding.variant === "extra-hours-request") {
      return `${who} is asking whether you can ${context.fact("task")}. Pay and the date are not settled.`;
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
    const opening = context.fact("opening");
    const verb = opening.trim().endsWith("?") ? "asks" : "says";
    return says(context, [
      `“${opening}” {name} ${verb}.`,
      `“Do you have a minute? ${opening}” {name} ${verb}.`,
    ]);
  },
  answers(context) {
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
    };
    return fill(done[answer ?? ""] ?? "“Okay,” {name} says.", {
      name: context.name,
    });
  },
  relevant: (world, bound) =>
    lifeOpportunitiesFor(world, bound.binding.playerPersonId).some(
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

export const SCENE_FAMILY_DEFINITIONS: Readonly<
  Record<SceneFamily, SceneFamilyDefinition>
> = {
  "home-evening": homeEvening,
  favor,
  "party-invite": partyInvite,
  "campaign-reaction": campaignReaction,
  "staff-followup": staffFollowup,
  "reporter-question": reporterQuestion,
};

/** When a situation stops being offered, counted from a date. */
export function sceneExpiry(date: IsoDate, days: number): IsoDate {
  return addDays(date, days);
}
