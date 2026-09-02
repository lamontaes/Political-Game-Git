import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  isHouseholdObligationConversationProgress,
  isRunBReferralConversationProgress,
  isRunCLegislativeConversationProgress,
} from "./run-b-conversation-progress";
import type {
  ConversationProgress,
  ConversationSubjectKey,
  HouseholdObligationConversationProgress,
  RunBConversationProgress,
  RunCLegislativeConversationProgress,
} from "./run-b-conversation-progress";
import type {
  ConversationAddressee,
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
   * what is being discussed.
   */
  availableIntents(
    world: World,
    room: ConversationRoomContext,
    addressee: ConversationAddressee,
    progress: P,
    silenceIsUseful: boolean,
  ): readonly ConversationIntentOption[];
  /** The line that greets the player when the exchange is opened. */
  openingBeat(
    world: World,
    room: ConversationRoomContext,
    addressee: ConversationAddressee,
    progress: P,
  ): ConversationDialogueBeat;
}

export function shortPersonName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person) throw new Error("This person is not in the conversation.");
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
      return `Three Lexington tenants asked this office for emergency-rent help. The county could not process two referrals because each lacked a required ${facts.requiredDocument}. ${shortPersonName(world, room.referralVerifierPersonId)} is checking the third. Decide whether ${shortPersonName(world, room.briefingLeadPersonId)} should back a document checklist before future referrals.`;
    },
    availableIntents(world, room, addressee, progress, silenceIsUseful) {
      const commitmentLabel =
        addressee === "everyone"
          ? `Ask ${shortPersonName(world, room.referralVerifierPersonId)} to check and ${shortPersonName(world, room.briefingLeadPersonId)} to decide`
          : addressee === room.eligibleAddresseePersonIds[0]
            ? `Ask ${shortPersonName(world, room.briefingLeadPersonId)} to back the referral checklist`
            : `Ask ${shortPersonName(world, room.referralVerifierPersonId)} to check the third referral`;
      const options: ConversationIntentOption[] = [
        {
          key: "request-commitment",
          label: commitmentLabel,
          description:
            addressee === room.eligibleAddresseePersonIds[0]
              ? `Ask ${shortPersonName(world, room.briefingLeadPersonId)} to back a document checklist before staff make future county referrals.`
              : addressee === room.eligibleAddresseePersonIds[1]
                ? `Ask ${shortPersonName(world, room.referralVerifierPersonId)} whether the third referral also lacked the required proof-of-income form.`
                : `Ask ${shortPersonName(world, room.referralVerifierPersonId)} to check the third referral and ${shortPersonName(world, room.briefingLeadPersonId)} to decide on the staff checklist.`,
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
              ? `Press ${shortPersonName(world, room.briefingLeadPersonId)} to back the checklist`
              : `Press ${shortPersonName(world, room.referralVerifierPersonId)} to check the third referral now`,
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
          dialogue: `“If ${shortPersonName(world, room.referralVerifierPersonId)} finds the third county referral also lacked the proof-of-income form, I’ll decide whether to back one document checklist for staff to use before future referrals,” ${shortPersonName(world, room.briefingLeadPersonId)} says.`,
        };
      }
      return {
        speakerPersonId: speaker.personId,
        speakerName: speaker.name,
        dialogue: `“The county could not process our first two referrals because the proof-of-income form was missing,” ${shortPersonName(world, room.referralVerifierPersonId)} says. “I can check whether the third referral arrived without that form too.”`,
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
              label: `Ask ${shortPersonName(world, room.briefingLeadPersonId)} about the ${progress.subjectFacts.currentAmount} provision`,
              description: `Ask for ${shortPersonName(world, room.briefingLeadPersonId)}'s known staff interpretation of the selected working-draft provision and prepared narrower version.`,
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
            ? `“The prepared ${progress.subjectFacts.preparedAmount} language is still on the page for comparison,” ${shortPersonName(world, room.briefingLeadPersonId)} says. “Neither version is enacted or implemented.”`
            : `“I have Section 3 open,” ${shortPersonName(world, room.briefingLeadPersonId)} says. “You’re looking at the ${progress.subjectFacts.currentAmount} ceiling and the prepared ${progress.subjectFacts.preparedAmount} version for the same pilot scope.”`,
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

const SUBJECTS = {
  "shared-intake-checklist": referralSubject,
  "transit-access-pilot-provision": legislativeDraftSubject,
  "household-obligation": householdObligationSubject,
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
