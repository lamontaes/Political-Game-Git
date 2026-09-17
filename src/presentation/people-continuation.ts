import {
  createCampaignElectionTransitionRegistry,
  personName,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  PLAYABLE_AGE,
  continueAsRelative,
  controlledLineage,
  currentGeneration,
  keepObserving,
  lifeEnd,
  retireControlledCharacter,
  successorCandidates,
  waitThenContinue,
  type SuccessorRelation,
} from "../simulation/people-continuation";
import { proseDate } from "./prose-dates";

/**
 * The typed adapter UI mounts when a played life ends (CRUNCH46 P5/P6).
 *
 * `projectLifeContinuation` is pure: it says whose life ended and how, and
 * lists what the player can do next — continue as a real family member, read
 * the finished life's record, or keep watching the world. The commands are
 * the only writers. After a continue, the shell's session person is
 * `world.control.personId`; the save is the same World.
 */

const RELATION_LABEL: Readonly<Record<SuccessorRelation, string>> = {
  child: "child",
  grandchild: "grandchild",
  sibling: "sibling",
  partner: "partner",
};

export interface ContinuationChoice {
  readonly kind: "continue-as";
  readonly personId: EntityId;
  readonly name: string;
  /** Their relation to the character whose life ended. */
  readonly relation: string;
  readonly age: number;
  readonly availableNow: boolean;
  /** The button text. */
  readonly label: string;
  /** For a younger relative: what waiting means, said plainly. */
  readonly waitDisclosure: string | null;
}

export interface LifeContinuationView {
  readonly predecessorId: EntityId;
  readonly predecessorName: string;
  readonly ended: "death" | "retirement";
  readonly heading: string;
  readonly choices: readonly ContinuationChoice[];
  /** Said when nobody in the family can be played. */
  readonly noSuccessorReason: string | null;
  /** Always available: the finished life's own journal and history. */
  readonly recordPersonId: EntityId;
  readonly canKeepObserving: boolean;
  readonly generation: number;
  /** Everyone played in this world so far, oldest first. */
  readonly lineage: readonly {
    readonly personId: EntityId;
    readonly name: string;
  }[];
}

/** Whether the played life has ended, and what can follow. Pure. */
export function projectLifeContinuation(
  world: World,
  playedPersonId: EntityId,
): LifeContinuationView | null {
  const person = world.people[playedPersonId];
  if (!person) return null;
  const ended = lifeEnd(world, playedPersonId);
  if (!ended) return null;
  const name = personName(person);
  const choices = successorCandidates(world, playedPersonId).map(
    (candidate): ContinuationChoice => {
      const successor = world.people[candidate.personId]!;
      const successorName = personName(successor);
      const waitYears = candidate.availableNow
        ? 0
        : PLAYABLE_AGE - candidate.age;
      return {
        kind: "continue-as",
        personId: candidate.personId,
        name: successorName,
        relation: RELATION_LABEL[candidate.relation],
        age: candidate.age,
        availableNow: candidate.availableNow,
        label: candidate.availableNow
          ? `Continue as ${successorName}`
          : `Continue as ${successorName} when they turn ${PLAYABLE_AGE}`,
        waitDisclosure: candidate.availableNow
          ? null
          : `${successorName} turns ${PLAYABLE_AGE} on ${proseDate(candidate.playableOn!)}. The world will run for about ${waitYears === 1 ? "a year" : `${waitYears} years`} with nobody played, and ${name} will make no decisions in that time.`,
      };
    },
  );
  return {
    predecessorId: playedPersonId,
    predecessorName: name,
    ended: ended.kind,
    heading:
      ended.kind === "death"
        ? `${name} died on ${proseDate(ended.on)}.`
        : `You stopped playing ${name} on ${proseDate(ended.on)}. ${person.givenName} goes on living.`,
    choices,
    noSuccessorReason:
      choices.length === 0
        ? `${name} has no living child, grandchild, sibling or partner on record to continue as.`
        : null,
    recordPersonId: playedPersonId,
    canKeepObserving: true,
    generation: currentGeneration(world),
    lineage: controlledLineage(world).map((personId) => ({
      personId,
      name: world.people[personId]
        ? personName(world.people[personId]!)
        : "Unknown",
    })),
  };
}

/** Retire the played character from play (they live on). */
export function retireFromPlay(world: World, personId: EntityId): World {
  return retireControlledCharacter(world, personId);
}

/**
 * Continue as the chosen relative. A younger relative is reached by the
 * disclosed wait, run through the ordinary time handlers.
 */
export function continueAs(
  world: World,
  predecessorId: EntityId,
  successorId: EntityId,
): World {
  const candidate = successorCandidates(world, predecessorId).find(
    (entry) => entry.personId === successorId,
  );
  if (candidate && !candidate.availableNow) {
    return waitThenContinue(world, {
      predecessorId,
      successorId,
      handlers: createCampaignElectionTransitionRegistry(),
    });
  }
  return continueAsRelative(world, { predecessorId, successorId });
}

/** Keep watching the world with nobody played. */
export function observeWorld(world: World, predecessorId: EntityId): World {
  return keepObserving(world, predecessorId);
}
