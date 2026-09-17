import { ageOnDate, personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  availableLifeSituations,
  formativeIntervalAt,
} from "../simulation/character-history";
import { evaluateDecision } from "../simulation/decisions";
import { activeChildAuthoritiesAt } from "../simulation/life-queries";
import {
  ensurePeopleTraits,
  traitConsiderations,
} from "../simulation/people-traits";
import type { DecisionConsideration } from "../simulation/types";
import { chooseFormativeOption, projectFormativeYears } from "./formative-play";
import type { FormativeScene, FormativeYears } from "./formative-play";

/**
 * Being a child, and slowly being allowed to decide things (CRUNCH47 B1, P14).
 *
 * The formative bank already knows that the early years are caregiver-led, the
 * middle years shared and adolescence substantially the young person's own.
 * Until now every band was played the same way, with the player picking for a
 * five-year-old as freely as for a seventeen-year-old. This layer makes the
 * difference real:
 *
 * - Early childhood happens to the child. The adult responsible decides, from
 *   their own temperament and what the situation is, and the child is left with
 *   the memory of it. The player watches and reads.
 * - The middle years are shared. The player chooses, and what the adult would
 *   have said is shown alongside, because a child that age is being steered.
 * - Adolescence is theirs. The player chooses, with nobody's thumb on it.
 *
 * Nothing is skipped and nothing is invented: the same authored situations,
 * the same resolution, the same memories. What changes is who the choice
 * belongs to.
 */

export type ChildhoodAgency =
  "caregiver-led" | "shared" | "substantially-player-directed";

export interface ChildhoodMoment {
  readonly personName: string;
  readonly age: number;
  readonly agency: ChildhoodAgency;
  /** Who decides, when it is not the child. */
  readonly caregiverPersonId: EntityId | null;
  readonly caregiverName: string | null;
  readonly scene: FormativeScene | null;
  /** What the player is invited to do with this moment. */
  readonly action: "watch" | "choose";
  readonly actionLabel: string;
  /** Said plainly, so nobody wonders why there are no choices. */
  readonly note: string | null;
  readonly years: FormativeYears;
}

/** The adult with recorded authority for this child, if there is one. */
export function caregiverFor(
  world: World,
  personId: EntityId,
): EntityId | null {
  for (const authority of activeChildAuthoritiesAt(world, personId)) {
    const holder = authority.authority.holder;
    if (holder.kind !== "person" || holder.personId === personId) continue;
    const person = world.people[holder.personId];
    if (!person) continue;
    if (ageOnDate(person.birthDate, world.currentDate) < 18) continue;
    return holder.personId;
  }
  return null;
}

export function projectChildhoodMoment(
  world: World,
  personId: EntityId,
): ChildhoodMoment | null {
  const interval = formativeIntervalAt(world, personId);
  if (!interval) return null;
  const years = projectFormativeYears(world, personId);
  const caregiverId = caregiverFor(world, personId);
  const caregiver = caregiverId ? world.people[caregiverId] : undefined;
  const caregiverName = caregiver ? personName(caregiver) : null;
  // Without a recorded adult there is nobody to decide for them, so the years
  // are their own by default rather than frozen.
  const agency: ChildhoodAgency =
    interval.agency === "caregiver-led" && !caregiverId
      ? "shared"
      : interval.agency;
  const watching = agency === "caregiver-led";
  return {
    personName: years.personName,
    age: years.age,
    agency,
    caregiverPersonId: caregiverId,
    caregiverName,
    scene: years.scene,
    action: watching ? "watch" : "choose",
    actionLabel: watching ? "See what happened" : "Choose",
    note: watching
      ? `${years.personName} is ${years.age}. ${caregiverName ?? "The adult at home"} decides these things; what stays is what ${years.personName} remembers of them.`
      : agency === "shared"
        ? `${years.personName} is ${years.age}, old enough to be asked and young enough to be steered.`
        : null,
    years,
  };
}

/**
 * Plays the moment the way this age is played: the caregiver's decision for a
 * small child, the young person's own for anybody older.
 */
export function playChildhoodMoment(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly optionKey?: string;
  },
): World {
  const moment = projectChildhoodMoment(world, input.personId);
  if (!moment?.scene) {
    throw new Error("There is nothing to play in these years right now.");
  }
  const scene = moment.scene;
  if (moment.action === "choose") {
    if (!input.optionKey) {
      throw new Error("This age chooses for themselves; name the choice.");
    }
    return chooseFormativeOption(world, {
      personId: input.personId,
      situationKey: scene.situationKey,
      optionKey: input.optionKey,
      withPersonId: scene.withPersonId,
    });
  }
  if (input.optionKey) {
    throw new Error(
      "At this age the adult responsible decides; the player watches.",
    );
  }
  const chosen = caregiverChoice(world, input.personId, moment, scene);
  return chooseFormativeOption(world, {
    personId: input.personId,
    situationKey: scene.situationKey,
    optionKey: chosen,
    withPersonId: scene.withPersonId,
  });
}

/**
 * What the adult responsible decides, from who they are.
 *
 * The same decision machinery every other NPC uses. A caregiver who avoids a
 * scene and one who meets it head-on do not make the same call, and the child
 * grows up with the memory of whichever it was.
 */
export function caregiverChoice(
  world: World,
  personId: EntityId,
  moment: ChildhoodMoment,
  scene: FormativeScene,
): string {
  const caregiverId = moment.caregiverPersonId;
  const options = scene.options.map((option) => ({
    key: option.key,
    label: option.label,
    description: option.description,
  }));
  if (options.length === 0) throw new Error("That situation offers nothing.");
  if (!caregiverId || options.length === 1) return options[0]!.key;
  const withTraits = ensurePeopleTraits(world, [caregiverId]);
  const considerations: readonly DecisionConsideration[] = traitConsiderations(
    withTraits,
    caregiverId,
    `childhood:${personId}:${scene.situationKey}`,
    [
      {
        optionKey: options[0]!.key,
        trait: "conflict",
        pole: "high",
        explanation: "They would rather deal with it directly.",
      },
      {
        optionKey: options.at(-1)!.key,
        trait: "conflict",
        pole: "low",
        explanation: "They would rather let it settle by itself.",
      },
      {
        optionKey: options[0]!.key,
        trait: "reliability",
        pole: "high",
        explanation: "They see things through.",
      },
      {
        optionKey: options.at(-1)!.key,
        trait: "risk",
        pole: "high",
        explanation: "They are willing to let it ride.",
      },
    ],
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `childhood:${personId}:${scene.situationKey}:${withTraits.currentDate}`,
    decisionType: "people.caregiver-choice",
    actorPersonId: caregiverId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: scene.situationKey,
      entityId: null,
    },
    options,
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return evaluation.selectedOptionKey ?? options[0]!.key;
}

/** Whether this person is young enough that the years are still forming. */
export function inChildhood(world: World, personId: EntityId): boolean {
  return formativeIntervalAt(world, personId) !== null;
}

/** Situations this child could be offered at all, for a developer surface. */
export function childhoodSituationKeys(
  world: World,
  personId: EntityId,
): readonly string[] {
  return availableLifeSituations(world, {
    personId,
    asOfDate: world.currentDate,
    otherPersonId: personId,
  }).map((situation) => situation.key);
}
