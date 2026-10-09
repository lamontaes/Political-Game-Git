import type { EntityId } from "../simulation";
import { createRunAFixture } from "./run-a-fixture";
import type {
  RunAFixture,
  RunBFixture,
  RunBScenePersonContext,
} from "./office-scene-context";
export type {
  RunBFixture,
  RunBSceneAnchorId,
  RunBScenePersonVariant,
  RunBScenePersonContext,
} from "./office-scene-context";
import type { ConversationRoomContext } from "./run-b-conversation";

function requirePersonId(fixture: RunAFixture, index: number): EntityId {
  const personId = fixture.world.personOrder[index];
  if (!personId || !fixture.world.people[personId]) {
    throw new Error(`Run B fixture is missing person ${index}.`);
  }
  return personId;
}

export function createRunBFixture(seedInput?: string): RunBFixture {
  const runA = createRunAFixture(seedInput);
  const npcBPersonId = requirePersonId(runA, 2);
  const npcBPerson = runA.world.people[npcBPersonId];
  const npcBName = npcBPerson!.familyName;
  const jurisdictionId = runA.world.jurisdictionOrder[0];
  if (!jurisdictionId) {
    throw new Error("Run B fixture is missing its office jurisdiction.");
  }

  const npcA: RunBScenePersonContext = {
    ...runA.scenePerson,
    anchorId: "primary-desk-chair",
    visualVariant: "primary",
  };
  const npcB: RunBScenePersonContext = {
    personId: npcBPersonId,
    title: "Neighborhood liaison",
    role: "Local case verification and district follow-up",
    qualitativeRead: "Familiar office colleague",
    inferredRead:
      "Attentive and practical. You know he follows through on specific requests, but not what conclusion he expects.",
    anchorId: "left-guest-chair",
    visualVariant: "guest",
  };
  const physicallyPresentPersonIds = [
    runA.playerPersonId,
    npcA.personId,
    npcB.personId,
  ] as const;
  const roomContext: ConversationRoomContext = {
    sceneKey: "run-b:lexington-office:occupied",
    roles: {
      "briefing-lead": runA.scenePerson.personId,
      "referral-verifier": npcBPersonId,
    },
    locationLabel: "Shared legislative office",
    jurisdictionId,
    playerPersonId: runA.playerPersonId,
    physicallyPresentPersonIds,
    activeParticipantPersonIds: physicallyPresentPersonIds,
    eligibleAddresseePersonIds: [npcA.personId, npcB.personId],
    normalHearingPersonIds: [npcA.personId, npcB.personId],
    quietAmbientHearingPersonIds: [],
    privateAvailable: false,
    privateUnavailableReason: `Private isn't possible while ${npcBName} remains within plausible earshot.`,
  };
  const privateCapableRoomContext: ConversationRoomContext = {
    sceneKey: "run-b:lexington-office:private-capable",
    roles: {
      "briefing-lead": runA.scenePerson.personId,
      "referral-verifier": npcBPersonId,
    },
    locationLabel: `Shared legislative office after ${npcBName} stepped out`,
    jurisdictionId,
    playerPersonId: runA.playerPersonId,
    physicallyPresentPersonIds: [runA.playerPersonId, npcA.personId],
    activeParticipantPersonIds: [runA.playerPersonId, npcA.personId],
    eligibleAddresseePersonIds: [npcA.personId],
    normalHearingPersonIds: [npcA.personId],
    quietAmbientHearingPersonIds: [],
    privateAvailable: true,
    privateUnavailableReason: null,
  };

  return {
    ...runA,
    scenePeople: [npcA, npcB],
    roomContext,
    privateCapableRoomContext,
  };
}
