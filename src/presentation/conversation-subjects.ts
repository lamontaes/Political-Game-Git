import { personName, SeededRng } from "../simulation";
import type {
  EntityId,
  EventType,
  RelationshipInteractionKind,
  World,
} from "../simulation";
import {
  isHouseholdObligationConversationProgress,
  isRunBReferralConversationProgress,
  isRunCLegislativeConversationProgress,
} from "./run-b-conversation-progress";
import {
  availableBargainingIntents,
  bargainingOpeningBeat,
  bargainingTopicLabel,
  describeBargainingBriefingContext,
} from "./legislative-bargaining";
import type {
  ConversationProgress,
  ConversationSubjectKey,
  HouseholdObligationConversationProgress,
  NeighborhoodMeetingConversationProgress,
  SchoolProjectConversationProgress,
  LegislativeBargainingProgress,
  RunBConversationProgress,
  RunCLegislativeConversationProgress,
} from "./run-b-conversation-progress";
import { conversationRole } from "./run-b-conversation";
import type {
  ConversationAddressee,
  ConversationAudibility,
  ConversationDialogueBeat,
  ConversationIntent,
  ConversationIntentOption,
  ConversationRoomContext,
} from "./run-b-conversation";

/**
 * What a conversation is about.
 *
 * The engine underneath — who is in the room, who can hear, what a commitment
 * means — is general. What people can say is not: it belongs to the subject in
 * front of them. Each family below owns its own topic, its own briefing, its
 * own available intents and its own dialogue, so opening a conversation in a
 * kitchen never offers a caseworker's options.
 *
 * Adding a family means adding an entry here. Nothing in this file claims the
 * list is finished.
 */

export interface ConversationSubjectPresentation<
  P extends ConversationProgress,
> {
  readonly subject: ConversationSubjectKey;
  /** The heading the player sees over the exchange. */
  topicLabel(progress: P): string;
  /** What is on the table, in one paragraph. */
  describeBriefing(
    world: World,
    room: ConversationRoomContext,
    progress: P,
  ): string;
  /**
   * What can be said right now, to this person, in this state.
   *
   * `silenceIsUseful` comes from the core, which owns the room's hearing
   * rules; the subject decides only whether staying quiet means anything for
   * what is being discussed. `audibility` is here for the same reason: how
   * quietly a thing is being said is a room fact, but whether it may be said
   * at all at that volume belongs to the subject — an offer that only exists
   * in private is the subject's rule, not the engine's.
   */
  availableIntents(
    world: World,
    room: ConversationRoomContext,
    addressee: ConversationAddressee,
    progress: P,
    silenceIsUseful: boolean,
    audibility: ConversationAudibility,
  ): readonly ConversationIntentOption[];
  /** The line that greets the player when the exchange is opened. */
  openingBeat(
    world: World,
    room: ConversationRoomContext,
    addressee: ConversationAddressee,
    progress: P,
  ): ConversationDialogueBeat;
}

/**
 * What to call somebody in the middle of a sentence.
 *
 * A surname, normally — except when it is the player's own surname too, which
 * is exactly what happens in a household, where people usually share one. A
 * forty-one-year-old was reading "Goodwin has the same week you do" about a
 * relative, in a game where the player is also called Goodwin: it reads as
 * talking to yourself. Where the surname is shared, the given name is the one
 * that actually distinguishes them.
 */
export function shortPersonName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person) throw new Error("This person is not in the conversation.");
  if (world.control.kind === "person") {
    const player = world.people[world.control.personId];
    if (
      player &&
      player.id !== person.id &&
      player.familyName === person.familyName
    ) {
      return person.givenName;
    }
  }
  return person.familyName;
}

function speakerFor(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
): { readonly personId: EntityId; readonly name: string } {
  const personId =
    addressee === "everyone" ? room.eligibleAddresseePersonIds[0]! : addressee;
  const person = world.people[personId];
  if (!person) throw new Error("The person being spoken to is not here.");
  return { personId, name: personName(person) };
}

/* -------------------------------------------------------------------------- */
/* The office referral. Kept whole, as one content family rather than as the   */
/* game's idea of what any conversation is.                                    */
/* -------------------------------------------------------------------------- */

const referralSubject: ConversationSubjectPresentation<RunBConversationProgress> =
  {
    subject: "shared-intake-checklist",
    topicLabel: () => "Constituent services",
    describeBriefing(world, room, progress) {
      const facts = progress.subjectFacts;
      return `Three Lexington tenants asked this office for emergency-rent help. The county could not process two referrals because each lacked a required ${facts.requiredDocument}. ${shortPersonName(world, conversationRole(room, "referral-verifier"))} is checking the third. Decide whether ${shortPersonName(world, conversationRole(room, "briefing-lead"))} should back a document checklist before future referrals.`;
    },
    availableIntents(world, room, addressee, progress, silenceIsUseful) {
      const commitmentLabel =
        addressee === "everyone"
          ? `Ask ${shortPersonName(world, conversationRole(room, "referral-verifier"))} to check and ${shortPersonName(world, conversationRole(room, "briefing-lead"))} to decide`
          : addressee === room.eligibleAddresseePersonIds[0]
            ? `Ask ${shortPersonName(world, conversationRole(room, "briefing-lead"))} to back the referral checklist`
            : `Ask ${shortPersonName(world, conversationRole(room, "referral-verifier"))} to check the third referral`;
      const options: ConversationIntentOption[] = [
        {
          key: "request-commitment",
          label: commitmentLabel,
          description:
            addressee === room.eligibleAddresseePersonIds[0]
              ? `Ask ${shortPersonName(world, conversationRole(room, "briefing-lead"))} to back a document checklist before staff make future county referrals.`
              : addressee === room.eligibleAddresseePersonIds[1]
                ? `Ask ${shortPersonName(world, conversationRole(room, "referral-verifier"))} whether the third referral also lacked the required proof-of-income form.`
                : `Ask ${shortPersonName(world, conversationRole(room, "referral-verifier"))} to check the third referral and ${shortPersonName(world, conversationRole(room, "briefing-lead"))} to decide on the staff checklist.`,
        },
        {
          key: "reassure",
          label: "Limit the checklist to proof-of-income forms",
          description:
            "Limit the staff checklist to the document problem these referrals establish.",
        },
      ];
      if (addressee !== "everyone") {
        options.push({
          key: "press",
          label:
            addressee === room.eligibleAddresseePersonIds[0]
              ? `Press ${shortPersonName(world, conversationRole(room, "briefing-lead"))} to back the checklist`
              : `Press ${shortPersonName(world, conversationRole(room, "referral-verifier"))} to check the third referral now`,
          description: "Ask for the concrete next step now.",
        });
      }
      if (silenceIsUseful) {
        options.push({
          key: "listen",
          label: "Listen",
          description: "Stay quiet and hear what the room does next.",
        });
      }
      return options;
    },
    openingBeat(world, room, addressee) {
      const speaker = speakerFor(world, room, addressee);
      if (
        addressee === "everyone" ||
        speaker.personId === room.eligibleAddresseePersonIds[0]
      ) {
        return {
          speakerPersonId: speaker.personId,
          speakerName: speaker.name,
          dialogue: `“If ${shortPersonName(world, conversationRole(room, "referral-verifier"))} finds the third county referral also lacked the proof-of-income form, I’ll decide whether to back one document checklist for staff to use before future referrals,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says.`,
        };
      }
      return {
        speakerPersonId: speaker.personId,
        speakerName: speaker.name,
        dialogue: `“The county could not process our first two referrals because the proof-of-income form was missing,” ${shortPersonName(world, conversationRole(room, "referral-verifier"))} says. “I can check whether the third referral arrived without that form too.”`,
      };
    },
  };

/* -------------------------------------------------------------------------- */
/* The working draft.                                                          */
/* -------------------------------------------------------------------------- */

const legislativeDraftSubject: ConversationSubjectPresentation<RunCLegislativeConversationProgress> =
  {
    subject: "transit-access-pilot-provision",
    topicLabel: () => "Legislative working draft",
    describeBriefing(_world, _room, progress) {
      return `Review Section 3 of the Transit Access Pilot office working draft. The current provision states ${progress.subjectFacts.currentAmount}; a prepared version states ${progress.subjectFacts.preparedAmount} for the same eligible-rider scope.`;
    },
    availableIntents(world, room, addressee, progress) {
      if (
        addressee !== "everyone" &&
        addressee !== room.eligibleAddresseePersonIds[0]
      ) {
        return [];
      }
      return progress.phase === "discussed"
        ? []
        : [
            {
              key: "discuss-provision",
              label: `Ask ${shortPersonName(world, conversationRole(room, "briefing-lead"))} about the ${progress.subjectFacts.currentAmount} provision`,
              description: `Ask for ${shortPersonName(world, conversationRole(room, "briefing-lead"))}'s known staff interpretation of the selected working-draft provision and prepared narrower version.`,
            },
          ];
    },
    openingBeat(world, room, addressee, progress) {
      const speaker = speakerFor(world, room, addressee);
      return {
        speakerPersonId: speaker.personId,
        speakerName: speaker.name,
        dialogue:
          progress.phase === "discussed"
            ? `“The prepared ${progress.subjectFacts.preparedAmount} language is still on the page for comparison,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says. “Neither version is enacted or implemented.”`
            : `“I have Section 3 open,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says. “You’re looking at the ${progress.subjectFacts.currentAmount} ceiling and the prepared ${progress.subjectFacts.preparedAmount} version for the same pilot scope.”`,
      };
    },
  };

/* -------------------------------------------------------------------------- */
/* The household week. No office, no casework, no bill.                        */
/* -------------------------------------------------------------------------- */

const householdObligationSubject: ConversationSubjectPresentation<HouseholdObligationConversationProgress> =
  {
    subject: "household-obligation",
    topicLabel: () => "At home",
    describeBriefing(world, room, progress) {
      const other = shortPersonName(world, room.eligibleAddresseePersonIds[0]!);
      return `${other} has the same week you do, and ${progress.subjectFacts.obligation} still have to be covered by somebody. Nobody has said out loud who.`;
    },
    availableIntents(_world, room, addressee, progress) {
      if (
        addressee !== "everyone" &&
        addressee !== room.eligibleAddresseePersonIds[0]
      ) {
        return [];
      }
      if (progress.phase === "settled") return [];
      if (progress.phase === "opening") {
        return [
          {
            key: "raise-obligation",
            label: "Bring up the week",
            description: `Say out loud that ${progress.subjectFacts.shortObligation} have not been sorted.`,
          },
          {
            key: "listen",
            label: "Wait and see if they raise it",
            description: "Let the other person go first.",
          },
        ];
      }
      return [
        {
          key: "offer-to-cover",
          label: "Say you will take it",
          description: `Cover ${progress.subjectFacts.shortObligation} yourself this week.`,
        },
        {
          key: "ask-to-share",
          label: "Suggest splitting it",
          description: "Divide the week rather than hand it to one person.",
        },
        {
          key: "ask-for-time",
          label: "Ask them to take it",
          description: "Say your week will not stretch to it.",
        },
      ];
    },
    openingBeat(world, room, addressee, progress) {
      const speaker = speakerFor(world, room, addressee);
      const dialogue =
        progress.phase === "settled"
          ? settledHouseholdLine(progress, speaker.name)
          : progress.phase === "raised"
            ? `“So it is on both of us,” ${shortPersonName(world, speaker.personId)} says. “Say what you can actually do.”`
            : `${shortPersonName(world, speaker.personId)} is looking at the same week you are, and has not said anything about it yet.`;
      return {
        speakerPersonId: speaker.personId,
        speakerName: speaker.name,
        dialogue,
      };
    },
  };

function settledHouseholdLine(
  progress: HouseholdObligationConversationProgress,
  speakerName: string,
): string {
  switch (progress.cover) {
    case "shared":
      return `“Half each, then,” ${speakerName} says. “That I can do.”`;
    case "taken-by-player":
      return `“All right. It is yours this week,” ${speakerName} says.`;
    case "taken-by-other":
      return `“I will get it,” ${speakerName} says. “Not every week, though.”`;
    default:
      return `“We left it where it was,” ${speakerName} says.`;
  }
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Two students and one piece of unstarted work.                               */
/* -------------------------------------------------------------------------- */

const schoolProjectSubject: ConversationSubjectPresentation<SchoolProjectConversationProgress> =
  {
    subject: "school-project-share",
    topicLabel: () => "A shared project",
    describeBriefing(world, room, progress) {
      const other = shortPersonName(
        world,
        conversationRole(room, "the-other-person"),
      );
      return progress.phase === "settled"
        ? `You and ${other} have sorted out ${progress.subjectFacts.work}.`
        : `${progress.subjectFacts.work} is still not started, and it is due ${progress.subjectFacts.deadline}. ${other} has not mentioned it either.`;
    },
    availableIntents(world, room, addressee, progress, silenceIsUseful) {
      if (progress.phase === "settled") return [];
      const other = shortPersonName(
        world,
        conversationRole(room, "the-other-person"),
      );
      const options: ConversationIntentOption[] =
        progress.phase === "opening"
          ? [
              {
                key: "raise-share",
                label: "Say nobody has started it",
                description: `Put the unstarted part in front of ${other} rather than working around it.`,
              },
            ]
          : [
              {
                key: "ask-to-split",
                label: "Ask to split it",
                description: "Take half each and say which half now.",
              },
              {
                key: "offer-to-do-more",
                label: "Offer to take it on",
                description: "Say you will do the part nobody started.",
              },
            ];
      if (silenceIsUseful) {
        options.push({
          key: "listen",
          label: "Say nothing about it",
          description: "Let it stay unmentioned for now.",
        });
      }
      return options;
    },
    openingBeat(world, room, addressee, progress) {
      const speaker = speakerFor(world, room, addressee);
      return {
        speakerPersonId: speaker.personId,
        speakerName: speaker.name,
        dialogue:
          progress.phase === "settled"
            ? `“We are fine now,” ${shortPersonName(world, speaker.personId)} says, and means it.`
            : selectAuthoredVariant(
                world,
                `school-project:${speaker.personId}`,
                [
                  `${shortPersonName(world, speaker.personId)} is packing up, and has not mentioned the project either.`,
                  `${shortPersonName(world, speaker.personId)} is already at the door, and the project has not come up.`,
                  `${shortPersonName(world, speaker.personId)} zips the bag shut without either of you saying anything about it.`,
                ],
              ),
      };
    },
  };

/**
 * Moves the school subject along. Bounded like the rest: it records who took
 * which part of the work, and stops.
 */
export function advanceSchoolProject(
  progress: SchoolProjectConversationProgress,
  intent: ConversationIntent,
): SchoolProjectConversationProgress {
  switch (intent) {
    case "raise-share":
      return { ...progress, phase: "raised", latestProposition: null };
    case "ask-to-split":
      return {
        ...progress,
        phase: "settled",
        share: "split",
        latestProposition: "split-the-work",
      };
    case "offer-to-do-more":
      return {
        ...progress,
        phase: "settled",
        share: "taken-by-player",
        latestProposition: "take-it-yourself",
      };
    case "listen":
      return { ...progress, silenceSettled: true };
    default:
      throw new Error("That is not something to say about the project.");
  }
}

/* -------------------------------------------------------------------------- */
/* A notice on a board, and a neighbour on a doorstep.                         */
/* -------------------------------------------------------------------------- */

const neighborhoodMeetingSubject: ConversationSubjectPresentation<NeighborhoodMeetingConversationProgress> =
  {
    subject: "neighborhood-meeting-notice",
    topicLabel: () => "A meeting that has been posted",
    describeBriefing(world, room, progress) {
      const other = shortPersonName(
        world,
        conversationRole(room, "the-other-person"),
      );
      return progress.phase === "settled"
        ? `You and ${other} have said what you are each doing about the meeting.`
        : `There is a meeting about ${progress.subjectFacts.subject}, ${progress.subjectFacts.notice}. Nobody has to go, and nobody has said whether they will.`;
    },
    availableIntents(world, room, addressee, progress, silenceIsUseful) {
      if (progress.phase === "settled") return [];
      const options: ConversationIntentOption[] =
        progress.phase === "opening"
          ? [
              {
                key: "mention-meeting",
                label: "Mention the notice",
                description: "Bring it up rather than walking past it.",
              },
            ]
          : [
              {
                key: "say-you-will-go",
                label: "Say you will go",
                description: "Commit your own evening to it, and say so.",
              },
              {
                key: "ask-them-to-go",
                label: "Ask whether they will go",
                description: "Put the question back rather than answering it.",
              },
            ];
      if (silenceIsUseful) {
        options.push({
          key: "listen",
          label: "Leave it there",
          description: "Say nothing more about the meeting.",
        });
      }
      return options;
    },
    openingBeat(world, room, addressee, progress) {
      const speaker = speakerFor(world, room, addressee);
      return {
        speakerPersonId: speaker.personId,
        speakerName: speaker.name,
        dialogue:
          progress.phase === "settled"
            ? `“Right,” ${shortPersonName(world, speaker.personId)} says. “That is settled, then.”`
            : selectAuthoredVariant(world, `neighborhood:${speaker.personId}`, [
                `${shortPersonName(world, speaker.personId)} is at the door with the post, and the notice is still on the board behind them.`,
                `${shortPersonName(world, speaker.personId)} is bringing the bins back in, and glances at the board on the way past.`,
                `${shortPersonName(world, speaker.personId)} is on the step with a bag of shopping, and the notice is right there beside them.`,
              ]),
      };
    },
  };

/** Moves the neighbourhood subject along. Nobody here has authority over anybody. */
export function advanceNeighborhoodMeeting(
  progress: NeighborhoodMeetingConversationProgress,
  intent: ConversationIntent,
): NeighborhoodMeetingConversationProgress {
  switch (intent) {
    case "mention-meeting":
      return { ...progress, phase: "raised", latestProposition: null };
    case "say-you-will-go":
      return {
        ...progress,
        phase: "settled",
        stance: "going",
        latestProposition: "say-you-will-go",
      };
    case "ask-them-to-go":
      return {
        ...progress,
        phase: "settled",
        stance: "asked-them-to-go",
        latestProposition: "ask-them-to-go",
      };
    case "listen":
      return { ...progress, silenceSettled: true };
    default:
      throw new Error("That is not something to say about the meeting.");
  }
}

/* -------------------------------------------------------------------------- */
/* The bill on the floor.                                                      */
/*                                                                             */
/* The content itself lives in ./legislative-bargaining, which is where the     */
/* motif layer and the canonical consequences of a bargaining turn are. This    */
/* entry is the registration, so the engine reaches it the same way it reaches  */
/* every other subject rather than by asking what kind of conversation this is. */
/* -------------------------------------------------------------------------- */

const measureBargainingSubject: ConversationSubjectPresentation<LegislativeBargainingProgress> =
  {
    subject: "measure-bargaining",
    topicLabel: () => bargainingTopicLabel(),
    describeBriefing: (_world, _room, progress) =>
      describeBargainingBriefingContext(progress),
    availableIntents: (
      world,
      room,
      addressee,
      progress,
      _silence,
      audibility,
    ) =>
      availableBargainingIntents(world, room, addressee, progress, audibility),
    openingBeat(world, room, addressee, progress) {
      const speaker = speakerFor(world, room, addressee);
      return {
        speakerPersonId: speaker.personId,
        speakerName: speaker.name,
        dialogue: bargainingOpeningBeat(world, progress, speaker.personId),
      };
    },
  };

const SUBJECTS = {
  "shared-intake-checklist": referralSubject,
  "transit-access-pilot-provision": legislativeDraftSubject,
  "measure-bargaining": measureBargainingSubject,
  "household-obligation": householdObligationSubject,
  "school-project-share": schoolProjectSubject,
  "neighborhood-meeting-notice": neighborhoodMeetingSubject,
} as const;

/** The presentation for whatever is currently being discussed. */
export function conversationSubjectPresentation(
  progress: ConversationProgress,
): ConversationSubjectPresentation<ConversationProgress> {
  return SUBJECTS[
    progress.subject
  ] as unknown as ConversationSubjectPresentation<ConversationProgress>;
}

export function conversationSubjectKeys(): readonly ConversationSubjectKey[] {
  return Object.keys(SUBJECTS) as readonly ConversationSubjectKey[];
}

/**
 * Moves the household subject along. Bounded, like the other families: it
 * records who said they would carry the week, and stops.
 */
export function advanceHouseholdObligation(
  progress: HouseholdObligationConversationProgress,
  intent: ConversationIntent,
): HouseholdObligationConversationProgress {
  switch (intent) {
    case "raise-obligation":
      return { ...progress, phase: "raised", latestProposition: null };
    case "offer-to-cover":
      return {
        ...progress,
        phase: "settled",
        cover: "taken-by-player",
        latestProposition: "take-it-yourself",
        silenceSettled: true,
      };
    case "ask-to-share":
      return {
        ...progress,
        phase: "settled",
        cover: "shared",
        latestProposition: "share-the-week",
        silenceSettled: true,
      };
    case "ask-for-time":
      return {
        ...progress,
        phase: "settled",
        cover: "taken-by-other",
        latestProposition: "ask-them-to-take-it",
        silenceSettled: true,
      };
    case "listen":
      return { ...progress, phase: "raised", silenceSettled: false };
    default:
      throw new Error(
        "That is not something this conversation is about right now.",
      );
  }
}

export {
  isHouseholdObligationConversationProgress,
  isRunBReferralConversationProgress,
  isRunCLegislativeConversationProgress,
};

/* -------------------------------------------------------------------------- */
/* Saying the same thing more than one way.                                    */
/* -------------------------------------------------------------------------- */

/**
 * Picks one of several authored ways to say the same thing.
 *
 * Variation is presentation only. Every line in a bank has to mean the same
 * thing, because the canonical record is written from the subject's own commit
 * contract and not from whichever sentence came out — a bank whose entries
 * differ in substance would make the record depend on a dice roll.
 *
 * The choice is drawn from the world's seed and the context handed in, so one
 * world always tells its story the same way, and two people in two households
 * do not open with the identical sentence on the same day.
 */
export function selectAuthoredVariant<T>(
  world: World,
  context: string,
  variants: readonly T[],
): T {
  if (variants.length === 0) {
    throw new Error("An authored variation bank cannot be empty.");
  }
  const rng = new SeededRng(world.seed).fork(
    `conversation-variation-v1:${context}`,
  );
  return variants[rng.integer(0, variants.length)] as T;
}

/* -------------------------------------------------------------------------- */
/* What a turn writes into the record.                                         */
/* -------------------------------------------------------------------------- */

/**
 * The canonical vocabulary a subject commits in.
 *
 * The engine used to write `conversation.office-turn`, tag every exchange
 * `conversation.office`, file it under constituent services and set the scene
 * as a "Synthetic Stage 6.5 office conversation fixture" — whatever the
 * conversation had actually been about. A household deciding who does the
 * shopping therefore left casework history behind, which is not a wording
 * problem: it is the record saying something that did not happen.
 *
 * The room rules, the hearing rules and the commitment semantics stay general.
 * Only this is per subject, and every subject has to say what it writes.
 */
export interface ConversationCommitContract {
  readonly subject: ConversationSubjectKey;
  /** The canonical event type a turn records. */
  readonly eventType: EventType;
  /** What kind of exchange this is, tagged on every turn. */
  readonly contextTag: string;
  /** What it was about. */
  readonly subjectTag: string;
  /** The scene, said the way the record should say it. */
  readonly setting: string;
  readonly socialContext: string;
  readonly interactionTags: readonly string[];
  /** How a relationship record describes a turn that went well, or badly. */
  interactionKind(
    consequence: "strengthened" | "strained",
  ): RelationshipInteractionKind;
  /**
   * What the record says the player did.
   *
   * This is the last thing a turn wrote that the subject did not own. The
   * writer knew three office intents and answered everything else with "The
   * player listened for the next relevant contribution" — so a household turn
   * that brought up the week was filed, correctly typed and correctly tagged,
   * as the player having listened. A canonical record of an action nobody took
   * is worse than no record, and a subject is the only thing that knows what
   * its own intents mean.
   */
  choice(
    intent: ConversationIntent,
    context: ConversationChoiceContext,
  ): string;
  /**
   * Why this exchange is happening at all, and what if anything is pressing on
   * it — the other two sentences a turn writes into canonical context. They
   * were written by the same two-branch engine writer as the choice was, so a
   * kitchen conversation about the shopping recorded its motivation as
   * "Clarify the next step without turning the exchange into a score check"
   * and a household disagreement recorded no pressure it could name. Both
   * belong to the subject for the same reason the choice does.
   */
  readonly motivation: string;
  /**
   * What is pressing on the exchange, if anything. The progress is here
   * because pressure is often a fact about the thing being discussed rather
   * than about the move being made: a bill that can still be amended today
   * and cannot be tomorrow is pressure no intent can express.
   */
  pressure(
    intent: ConversationIntent,
    progress: ConversationProgress,
  ): string | null;
}

/** What a choice sentence may name, without reaching for the room itself. */
export interface ConversationChoiceContext {
  /** The short name of the person being spoken to. */
  readonly addresseeName: string;
  /** The short name of whoever holds a named part in this room. */
  named(role: string): string;
}

/**
 * Builds a subject's choice writer from its own intents, and refuses one it
 * does not offer rather than describing it wrongly.
 */
function choiceWriter(
  subject: string,
  sentences: Readonly<
    Record<string, (context: ConversationChoiceContext) => string>
  >,
): ConversationCommitContract["choice"] {
  return (intent, context) => {
    const write = sentences[intent];
    if (!write) {
      throw new Error(
        `The ${subject} conversation has no record of what "${intent}" does.`,
      );
    }
    return write(context);
  };
}

const OFFICE_INTERACTION = (
  consequence: "strengthened" | "strained",
): RelationshipInteractionKind =>
  consequence === "strengthened"
    ? "work:reassurance"
    : "conflict:pressed-for-answer";

const COMMIT_CONTRACTS: Readonly<
  Record<ConversationSubjectKey, ConversationCommitContract>
> = {
  "shared-intake-checklist": {
    subject: "shared-intake-checklist",
    eventType: "conversation.office-turn",
    contextTag: "conversation.office",
    subjectTag: "conversation.subject.constituent-services",
    setting: "A legislative office, during briefing work",
    socialContext: "A bounded in-room conversation during briefing work.",
    interactionTags: ["conversation.office", "relationship.shared-work"],
    interactionKind: OFFICE_INTERACTION,
    motivation:
      "Clarify the next step on the casework without turning the exchange into a score check.",
    pressure: (intent) =>
      intent === "press"
        ? "The player asked for an immediate answer."
        : intent === "request-commitment"
          ? "The afternoon briefing creates pressure for a clear next step."
          : null,
    choice: choiceWriter("shared intake checklist", {
      "request-commitment": () =>
        "The player asked for a concrete checklist or verification commitment.",
      reassure: () =>
        "The player kept the checklist recommendation narrow and evidence-led.",
      press: () =>
        "The player pressed for an answer on the checklist or last case.",
      listen: () => "The player listened for the next relevant contribution.",
    }),
  },
  "transit-access-pilot-provision": {
    subject: "transit-access-pilot-provision",
    eventType: "conversation.office-turn",
    contextTag: "conversation.office",
    subjectTag: "conversation.subject.legislative-provision",
    setting: "A legislative office, over a working draft",
    socialContext: "A conversation over the wording of a legislative draft.",
    interactionTags: ["conversation.office", "relationship.shared-work"],
    interactionKind: OFFICE_INTERACTION,
    motivation:
      "Clarify legal working language and staff projection without treating either as enacted policy.",
    pressure: () =>
      "The office needs a clear working version while legal text and projected consequences remain distinct.",
    choice: choiceWriter("working provision", {
      "discuss-provision": ({ named }) =>
        `The player asked ${named("briefing-lead")} to interpret the selected working provision and compare its prepared alternative.`,
      listen: () =>
        "The player listened while the provision was talked through.",
    }),
  },
  "measure-bargaining": {
    subject: "measure-bargaining",
    eventType: "conversation.office-turn",
    contextTag: "conversation.office",
    subjectTag: "conversation.subject.measure-bargaining",
    setting: "The members' room off the chamber floor",
    socialContext:
      "A conversation between members about a bill that is still open to change.",
    interactionTags: ["conversation.office", "legislation.bargaining"],
    interactionKind: (consequence) =>
      consequence === "strengthened"
        ? "exchange:legislative-bargain"
        : "conflict:over-a-bill",
    motivation:
      "Find out what the other member actually needs, without pretending anything said here is already in the bill.",
    pressure: (_intent, progress) => {
      const facts = (progress as LegislativeBargainingProgress).subjectFacts;
      return `${facts.designation} is on the ${facts.chamberName} floor and the text can still change; after ${facts.nextStepLabel} it cannot.`;
    },
    choice: choiceWriter("measure bargaining", {
      "ask-what-they-want": ({ addresseeName }) =>
        `The player asked ${addresseeName} what they actually want out of the bill.`,
      "offer-targeted-provision": ({ addresseeName }) =>
        `The player offered to carry the named section ${addresseeName} asked for.`,
      "counter-with-cap": ({ addresseeName }) =>
        `The player countered ${addresseeName} with the same section written to a ceiling.`,
      "refuse-request": ({ addresseeName }) =>
        `The player declined what ${addresseeName} asked for and heard what it cost.`,
      "request-support": ({ addresseeName }) =>
        `The player asked ${addresseeName} where they will be when the bill is called.`,
      "ask-for-analysis": () =>
        "The player asked for the fiscal note to be read before anything further was said.",
      "remind-of-commitment": ({ addresseeName }) =>
        `The player put ${addresseeName}'s own words back in front of them.`,
      "offer-private-inducement": ({ addresseeName }) =>
        `The player offered ${addresseeName} a personal benefit, and it was refused.`,
      listen: () => "The player listened for the next relevant contribution.",
    }),
  },
  "household-obligation": {
    subject: "household-obligation",
    eventType: "conversation.household-turn",
    contextTag: "conversation.household",
    subjectTag: "conversation.subject.household-obligation",
    setting: "Home",
    socialContext: "A conversation at home about who carries the week.",
    interactionTags: [
      "conversation.household",
      "relationship.shared-household",
    ],
    interactionKind: (consequence) =>
      consequence === "strengthened"
        ? "support:shared-load"
        : "conflict:household-friction",
    motivation:
      "Settle who carries the week, so it does not end up carried by whoever notices last.",
    pressure: (intent) =>
      intent === "raise-obligation"
        ? "The week starts whether or not anybody has said who is doing it."
        : null,
    choice: choiceWriter("household obligation", {
      "raise-obligation": ({ addresseeName }) =>
        `The player brought up the week's errands with ${addresseeName}.`,
      "offer-to-cover": () =>
        "The player offered to cover the week themselves.",
      "ask-to-share": ({ addresseeName }) =>
        `The player asked to split the week with ${addresseeName}.`,
      "ask-for-time": ({ addresseeName }) =>
        `The player asked ${addresseeName} to take the week this time.`,
      listen: () =>
        "The player left the question of who carries the week unanswered.",
    }),
  },
  "school-project-share": {
    subject: "school-project-share",
    eventType: "conversation.school-turn",
    contextTag: "conversation.school",
    subjectTag: "conversation.subject.school-project",
    setting: "School, between classes",
    socialContext: "A conversation about who does which part of shared work.",
    interactionTags: ["conversation.school", "relationship.shared-work"],
    interactionKind: (consequence) =>
      consequence === "strengthened"
        ? "work:reassurance"
        : "conflict:pressed-for-answer",
    motivation:
      "Agree who does which part before the work is due rather than after.",
    pressure: (intent) =>
      intent === "ask-to-split"
        ? "The split has to be agreed while there is still time to do the work."
        : null,
    choice: choiceWriter("school project share", {
      "raise-share": ({ addresseeName }) =>
        `The player raised how the project was being divided with ${addresseeName}.`,
      "offer-to-do-more": () =>
        "The player offered to take on more of the project.",
      "ask-to-split": () =>
        "The player asked for the project to be split more evenly.",
      listen: () =>
        "The player left the question of who does which part unanswered.",
    }),
  },
  "neighborhood-meeting-notice": {
    subject: "neighborhood-meeting-notice",
    eventType: "conversation.neighborhood-turn",
    contextTag: "conversation.neighborhood",
    subjectTag: "conversation.subject.neighborhood-meeting",
    setting: "A doorstep, on the way past",
    socialContext:
      "A conversation between neighbours about a meeting that has been posted.",
    interactionTags: ["conversation.neighborhood", "relationship.shared-place"],
    interactionKind: (consequence) =>
      consequence === "strengthened"
        ? "contact:neighborly"
        : "conflict:pressed-for-answer",
    motivation:
      "Work out whether either of them is going, while the meeting is still ahead of them.",
    pressure: (intent) =>
      intent === "ask-them-to-go"
        ? "The meeting happens on its posted evening whether or not anybody goes."
        : null,
    choice: choiceWriter("neighborhood meeting notice", {
      "mention-meeting": ({ addresseeName }) =>
        `The player mentioned the posted meeting to ${addresseeName}.`,
      "say-you-will-go": () => "The player said they would go to the meeting.",
      "ask-them-to-go": ({ addresseeName }) =>
        `The player asked ${addresseeName} to go to the meeting instead.`,
      listen: () => "The player said nothing about whether anybody would go.",
    }),
  },
};

export function conversationCommitContract(
  progress: ConversationProgress,
): ConversationCommitContract {
  const contract = COMMIT_CONTRACTS[progress.subject];
  if (!contract) {
    throw new Error(
      `No canonical commit contract is defined for the ${progress.subject} conversation.`,
    );
  }
  return contract;
}
