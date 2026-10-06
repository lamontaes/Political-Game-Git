import { electionContestStatus } from "../simulation/election-contests";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation/types";

export interface ElectionChoiceSceneRow {
  readonly kind: "election-choice";
  readonly stableKey: string;
  readonly contestId: EntityId;
  readonly actorPersonId: EntityId;
  readonly prompt: string;
  readonly options: readonly {
    readonly optionKey: EntityId | "abstain";
    readonly label: string;
  }[];
  readonly selectedOptionKey: EntityId | "abstain" | null;
}

/**
 * Scene-row seam for Session 4. Its scene writer presents these options and
 * calls recordPlayerElectionChoice for the selected key.
 */
export function playerElectionChoiceSceneRow(
  world: World,
): ElectionChoiceSceneRow | null {
  if (world.control.kind !== "person") return null;
  const actorPersonId = world.control.personId;
  const contest = [...(world.history.electionContests ?? [])]
    .filter(
      (row) =>
        row.electionDate > world.currentDate &&
        electionContestStatus(world, row.id) === "pending",
    )
    .sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) || a.sequence - b.sequence,
    )[0];
  if (!contest) return null;
  const selectedOptionKey = (world.history.playerElectionChoices ?? [])
    .filter(
      (choice) =>
        choice.contestId === contest.id &&
        choice.voterPersonId === actorPersonId,
    )
    .sort((a, b) => b.sequence - a.sequence)[0]?.selectedOptionKey;
  return {
    kind: "election-choice",
    stableKey: `${contest.stableKey}:player-choice-scene:${actorPersonId}`,
    contestId: contest.id,
    actorPersonId,
    prompt: `Who do you want to vote for as ${contest.office.title}?`,
    options: [
      ...contest.candidatePersonIds.map((personId) => ({
        optionKey: personId,
        label: personName(world.people[personId]!),
      })),
      { optionKey: "abstain", label: "Abstain" },
    ],
    selectedOptionKey: selectedOptionKey ?? null,
  };
}
