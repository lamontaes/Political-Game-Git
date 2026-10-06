import type { EntityId, World } from "../simulation/types";
import type { RecordedVoterCountInput } from "../simulation/election-contests";
import { isEligibleVoterIn } from "../simulation/issue-record";
import { personName } from "../simulation/people";
import { recordWorldEvent } from "../simulation/world";

export interface PlayerBallotScene {
  readonly personId: EntityId;
  readonly ballot: RecordedVoterCountInput;
  readonly choices: readonly { readonly key: string; readonly words: string }[];
}

/** The same ballot descriptor used by the recorded-voter count supplies the choices. */
export function playerBallotScene(
  world: World,
  ballot: RecordedVoterCountInput,
): PlayerBallotScene | null {
  if (
    world.control.kind !== "person" ||
    world.currentDate !== ballot.electionDate
  )
    return null;
  const personId = world.control.personId;
  if (
    !isEligibleVoterIn(
      world,
      personId,
      ballot.jurisdictionId,
      ballot.electionDate,
    ) ||
    (ballot.admitVoter && ballot.admitVoter(personId) !== true) ||
    !ballot.stableKey.trim() ||
    !ballot.candidatePersonIds.length ||
    new Set(ballot.candidatePersonIds).size !==
      ballot.candidatePersonIds.length ||
    ballot.candidatePersonIds.some((id) => !world.people[id])
  )
    return null;
  return {
    personId,
    ballot,
    choices: [
      ...ballot.candidatePersonIds.map((id) => ({
        key: id,
        words: `Vote for ${personName(world.people[id]!)}`,
      })),
      { key: "abstain", words: "Abstain from this contest" },
    ],
  };
}

/** Save a player's explicit answer; evaluation and tallying remain in the one count loop. */
export function savePlayerBallotChoice(
  world: World,
  ballot: RecordedVoterCountInput,
  optionKey: string,
): World {
  const scene = playerBallotScene(world, ballot);
  const choice = scene?.choices.find((row) => row.key === optionKey);
  if (!scene || !choice) throw new Error("This ballot choice is unavailable.");
  return recordWorldEvent(world, {
    stableKey: `player-ballot:${ballot.stableKey}:${scene.personId}:${world.history.nextSequence}`,
    type: "election.player-ballot",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: ballot.jurisdictionId,
    involvedEntityIds: [scene.personId, ...ballot.candidatePersonIds],
    participants: [
      {
        personId: scene.personId,
        role: "focus:voter",
        detail: "Recorded their own ballot choice",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `ballot:${ballot.stableKey}`,
      `election-date:${ballot.electionDate}`,
    ],
    summary: `${personName(world.people[scene.personId]!)} recorded a ballot choice.`,
    context: {
      location: null,
      socialContext: "The player's ballot scene",
      pressure: null,
      choice: optionKey,
      motivation: "The player chose this ballot option.",
      immediateReaction: null,
    },
  });
}
