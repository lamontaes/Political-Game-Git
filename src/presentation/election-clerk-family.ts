import {
  sceneBindingsFor,
  type BoundScene,
} from "../simulation/scene-bindings";
import type { World } from "../simulation/types";
import { linePartsTag } from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import { composeElectionClerkLine } from "./election-clerk-english";
import { electionClerksForPerson } from "./election-clerk";
import {
  electionClerkOffices,
  fileThroughElectionClerk,
  type ClerkOffice,
} from "./election-clerk-offices";
import { speakerTraits } from "./speaker-traits";
import { proseDate } from "./prose-dates";
import type {
  SceneContext,
  SceneFamilyDefinition,
  SceneAnswer,
} from "./contextual-scenes";
import type { ConversationRoomContext } from "./run-b-conversation";
import { recordedRoomPresence } from "./recorded-room-presence";

function offices(context: SceneContext): readonly ClerkOffice[] {
  return JSON.parse(context.fact("offices")) as readonly ClerkOffice[];
}

function packet(
  context: SceneContext,
  key: string,
  office?: ClerkOffice,
): GroundedEnglishPacket {
  const cutoff = {
    asOfDate: context.binding.date!,
    historySequenceExclusive: context.world.history.events.find(
      (event) => event.id === context.bindingEventId,
    )!.sequence,
  };
  const sourceRecordIds = [
    context.bindingEventId,
    ...context.binding.sourceEntityIds,
  ];
  const fact = (text: string) => ({ text, sourceRecordIds });
  const facts = {
    "clerk-role": fact(context.fact("clerk-role")),
    ...(office
      ? {
          "office-title": fact(office.title),
          eligibility: fact(office.eligibility),
          ...(office.filingDeadline
            ? {
                [office.filingBasis === "estimated-from-average"
                  ? "filing-deadline-estimated"
                  : "filing-deadline"]: fact(proseDate(office.filingDeadline)),
              }
            : {}),
        }
      : {}),
  };
  return {
    surface: "dialogue",
    worldSeed: context.world.seed,
    momentKey: `${context.bindingEventId}:${key}`,
    bankVersion: "1",
    stage: "adult",
    sourceRecordIds,
    facts,
    speaker: {
      personId: context.speaker.id,
      traits: speakerTraits(context.world, context.speaker.id, cutoff),
    },
    viewer: {
      personId: context.player.id,
      traits: speakerTraits(context.world, context.player.id, cutoff),
    },
    knowledge: Object.keys(facts).map((factKey) => ({
      personId: context.speaker.id,
      factKey,
      sourceRecordIds,
    })),
  };
}

function line(
  context: SceneContext,
  kind: Parameters<typeof composeElectionClerkLine>[0],
  key: string,
  office?: ClerkOffice,
) {
  const rendered = composeElectionClerkLine(kind, packet(context, key, office));
  if (rendered.kind !== "rendered")
    throw new Error("The clerk's answer lacks its recorded facts.");
  return { text: rendered.text, partsTag: linePartsTag(rendered.parts) };
}

/** The room uses current recorded encounter participants and audibility. */
function room(world: World, bound: BoundScene): ConversationRoomContext | null {
  const clerk = electionClerksForPerson(
    world,
    bound.binding.playerPersonId,
  ).find((row) => row.personId === bound.binding.speakerPersonId);
  const presence = recordedRoomPresence(world, bound.binding.playerPersonId);
  if (!clerk?.presenceEventId || !presence?.personIds.includes(clerk.personId))
    return null;
  return {
    sceneKey: `election-clerk:${bound.eventId}`,
    roles: { "the-other-person": clerk.personId },
    locationLabel: presence.location.label,
    jurisdictionId: clerk.jurisdictionId,
    playerPersonId: bound.binding.playerPersonId,
    physicallyPresentPersonIds: presence.personIds,
    activeParticipantPersonIds: [bound.binding.playerPersonId, clerk.personId],
    eligibleAddresseePersonIds: [clerk.personId],
    normalHearingPersonIds: presence.personIds,
    quietAmbientHearingPersonIds: [],
    privateAvailable: presence.personIds.length === 2,
    privateUnavailableReason:
      presence.personIds.length === 2 ? null : "Other people are here.",
  };
}

export const electionClerkFamily: SceneFamilyDefinition = {
  family: "election-clerk",
  eventType: "life.election-clerk-conversation",
  setting: "clerk's office",
  socialContext: "A filing inquiry with the recorded clerk.",
  motivation: "The player is considering running for office.",
  interactionTags: ["election", "election.filing-inquiry"],
  topic: (binding) => binding.place,
  briefing: (context) =>
    `${context.fullName} is the ${context.fact("clerk-role").toLowerCase()}.`,
  opening: (context) => [line(context, "opening", "opening").text],
  answers(context, progress) {
    const choices: SceneAnswer[] = offices(context).map((office) => {
      const response = line(
        context,
        "requirements",
        `requirements:${office.key}`,
        office,
      );
      return {
        key: `requirements:${office.key}`,
        label: `Ask about ${office.title}`,
        description: "Ask what the current requirements allow.",
        followUp: true,
        statement: `What would I need to run for ${office.title}?`,
        replies: [response.text],
        clerkLinePartsTag: response.partsTag,
        record: `The player asked ${context.fullName} about running for ${office.title}.`,
      };
    });
    const selectedKey = progress.asked.at(-1)?.replace(/^requirements:/, "");
    const selected = offices(context).find(
      (office) => office.key === selectedKey,
    );
    const current =
      selected &&
      electionClerkOffices(context.world, context.player.id).find(
        (office) => office.key === selected.key,
      );
    if (selected?.eligible && current?.eligible) {
      const response = line(
        context,
        "filingRequest",
        `file:${selected.key}`,
        selected,
      );
      choices.unshift({
        key: `file:${selected.key}`,
        label: `File for ${selected.title}`,
        description: "Ask to file for this office under its current rules.",
        statement: `I'd like to file for ${selected.title}.`,
        replies: [response.text],
        clerkLinePartsTag: response.partsTag,
        record: `The player asked to file for ${selected.title}.`,
        apply: (world) =>
          fileThroughElectionClerk(world, context.player.id, selected.key),
      });
    }
    choices.push({
      key: "leave",
      label: "Leave",
      description: "End the inquiry without filing.",
      statement: "That's all for now. Thank you.",
      replies: ["You're welcome."],
      record: "The player ended the filing inquiry.",
    });
    return choices;
  },
  settled: (_context, answer) =>
    answer?.startsWith("file:")
      ? "The filing inquiry is complete."
      : "The inquiry is over.",
  relevant: (world, bound) =>
    room(world, bound) !== null &&
    sceneBindingsFor(
      world,
      bound.binding.playerPersonId,
      "election-clerk",
    ).some((row) => row.eventId === bound.eventId),
  room,
};
