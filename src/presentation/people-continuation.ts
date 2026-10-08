import {
  createCampaignElectionTransitionRegistry,
  personName,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  CHARACTER_RETIRED_EVENT,
  PLAYABLE_AGE,
  continueAsRelative,
  controlHandoffs,
  controlledLineage,
  currentGeneration,
  keepObserving,
  lifeEnd,
  retireControlledCharacter,
  successorCandidates,
  waitThenContinue,
  type SuccessorRelation,
} from "../simulation/people-continuation";
import { deathSentence } from "../simulation/crisis/death-causes";
import { officesHeldOverLife } from "../simulation/crisis/offices";
import { ageOnDate } from "../simulation/dates";
import { describePersonContext } from "../simulation/person-context";
import { ownElectionResultsDecided } from "./own-election";
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

/**
 * What the successor was to the life that ended, from that life's side, when
 * the shared relationship reader has no more specific word. Said the way the
 * People screen and the room say it ("your roommate"), because the player
 * choosing is the person whose life this was.
 */
const RELATION_LABEL: Readonly<Record<SuccessorRelation, string | null>> = {
  child: "your child",
  grandchild: "your grandchild",
  sibling: "your sibling",
  partner: "your partner",
  parent: "your parent",
  household: "your roommate",
  protege: "someone you taught",
  mentor: "your former teacher",
  "close-associate": "someone you kept up with",
  other: null,
};

export interface ContinuationChoice {
  readonly kind: "continue-as";
  readonly personId: EntityId;
  readonly name: string;
  /**
   * Who they were to the character whose life ended, from that life's side:
   * "your father", "your roommate". Null for somebody with no tie on record.
   */
  readonly relation: string | null;
  /**
   * True for the people this life was actually bound to. The rest are offered
   * below them, as what they are: other lives, going on anyway.
   */
  readonly prominent: boolean;
  /** What the record says passed between them, when it says anything. */
  readonly connection: string | null;
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
  /** Saved history of the ended life, bounded by its recorded end date. */
  readonly lookBack: LifeLookBack;
}

export interface LifeLookBackMemory {
  readonly memoryId: EntityId;
  readonly at: IsoDate;
  readonly age: number;
  readonly sentence: string;
  readonly strength: "strong" | "defining";
}

export interface LifeLookBack {
  readonly through: IsoDate;
  readonly causeKey: string | null;
  /** The existing saved recollections, in age order; no summary is authored. */
  readonly memories: readonly LifeLookBackMemory[];
  readonly memoryGroups: readonly {
    readonly age: number;
    readonly memories: readonly LifeLookBackMemory[];
  }[];
  /** Offices and decided races read from their canonical history records. */
  readonly offices: ReturnType<typeof officesHeldOverLife>;
  readonly races: ReturnType<typeof ownElectionResultsDecided>;
  /** Measures this person sponsored that were enacted by the end date. */
  readonly enactedMeasures: readonly {
    readonly measureId: EntityId;
    readonly designation: string;
    readonly title: string;
    readonly resolvedAt: IsoDate;
  }[];
  /** Family identities from saved kinship records, never generated here. */
  readonly familyPersonIds: readonly EntityId[];
}

export function projectLifeLookBack(
  world: World,
  personId: EntityId,
  through: IsoDate,
): LifeLookBack {
  const person = world.people[personId];
  if (!person)
    return {
      through,
      causeKey: null,
      memories: [],
      memoryGroups: [],
      offices: [],
      races: [],
      enactedMeasures: [],
      familyPersonIds: [],
    };

  const memories = world.history.memories
    .filter(
      (memory) =>
        memory.personId === personId &&
        memory.formedAt >= person.birthDate &&
        memory.formedAt <= through &&
        (memory.strength === "strong" || memory.strength === "defining"),
    )
    .sort(
      (left, right) =>
        left.formedAt.localeCompare(right.formedAt) ||
        left.sequence - right.sequence,
    )
    .map((memory) => ({
      memoryId: memory.id,
      at: memory.formedAt,
      age: ageOnDate(person.birthDate, memory.formedAt),
      sentence: memory.rememberedSummary,
      strength: memory.strength as "strong" | "defining",
    }));
  const enactments = new Map(
    (world.history.legislativeEnactments ?? [])
      .filter(
        (entry) => entry.outcome === "enacted" && entry.resolvedAt <= through,
      )
      .map((entry) => [entry.measureId, entry]),
  );
  const enactedMeasures = (world.history.legislativeMeasures ?? [])
    .filter(
      (measure) =>
        measure.sponsorPersonId === personId &&
        (enactments.get(measure.id)?.resolvedAt ?? "9999-12-31") <= through,
    )
    .flatMap((measure) => {
      const enactment = enactments.get(measure.id);
      return enactment
        ? [
            {
              measureId: measure.id,
              designation: measure.designation,
              title: measure.shortTitle,
              resolvedAt: enactment.resolvedAt,
            },
          ]
        : [];
    })
    .sort((left, right) => left.resolvedAt.localeCompare(right.resolvedAt));

  const offices = officesHeldOverLife(world, personId).filter((office) => {
    if (!office.termEvidenceId) return false;
    const relationship = world.history.workRelationships.find(
      (entry) => entry.id === office.termEvidenceId,
    );
    if (relationship) return relationship.startedAt <= through;
    const event = world.history.events.find(
      (entry) => entry.id === office.termEvidenceId,
    );
    return Boolean(event && event.occurredAt <= through);
  });
  const memoryGroups = [
    ...memories.reduce((groups, memory) => {
      const entries = groups.get(memory.age) ?? [];
      entries.push(memory);
      groups.set(memory.age, entries);
      return groups;
    }, new Map<number, LifeLookBackMemory[]>()),
  ].map(([age, entries]) => ({ age, memories: entries }));

  return {
    through,
    causeKey:
      world.history.personDeaths.find(
        (entry) => entry.personId === personId && entry.diedAt <= through,
      )?.causeKey ?? null,
    memories,
    memoryGroups,
    offices,
    races: ownElectionResultsDecided(world, personId, null, through),
    enactedMeasures,
    familyPersonIds: [
      ...new Set(
        [
          ...world.history.kinshipRelationships
            .filter(
              (relationship) =>
                relationship.establishedAt <= through &&
                relationship.personIds.includes(personId),
            )
            .flatMap((relationship) => relationship.personIds),
          ...world.history.partnerships
            .filter(
              (partnership) =>
                partnership.startedAt <= through &&
                partnership.personIds.includes(personId),
            )
            .flatMap((partnership) => partnership.personIds),
        ].filter((candidate) => candidate !== personId),
      ),
    ],
  };
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
        relation:
          describePersonContext(world, playedPersonId, candidate.personId)
            ?.relationship ?? RELATION_LABEL[candidate.relation],
        prominent: candidate.prominent,
        connection: candidate.connection,
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
        ? deathSentence(
            name,
            world.history.personDeaths.find(
              (death) => death.personId === playedPersonId,
            )?.causeKey ?? null,
            proseDate(ended.on),
          )
        : `You stopped playing ${name} on ${proseDate(ended.on)}. ${person.givenName} goes on living.`,
    choices,
    noSuccessorReason:
      choices.filter((choice) => choice.prominent).length === 0 &&
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
    lookBack: projectLifeLookBack(world, playedPersonId, ended.on),
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

/**
 * The marker A's command runner compares against (CRUNCH47 B1).
 *
 * A command queued by one character must not apply after play has moved on.
 * This returns the last change of hands as a monotonic marker: capture it when
 * a command is queued, compare before applying, and refuse a result whose
 * marker has moved. `null` means play has never changed hands, which is itself
 * a stable answer.
 *
 * It says only that the hands changed and when. It does not know what the
 * command was, and it is never a permission check.
 */
export interface ControlMarker {
  /** The recorded sequence of the handoff event. Only ever increases. */
  readonly sequence: number;
  readonly occurredOn: IsoDate;
  readonly predecessorPersonId: EntityId;
  readonly successorPersonId: EntityId | null;
  readonly kind: "continued" | "retired" | "observing";
}

export function pendingCommandsInvalidatedBy(
  world: World,
): ControlMarker | null {
  const handoff = controlHandoffs(world).at(-1);
  const retirement = world.history.events
    .filter((event) => event.type === CHARACTER_RETIRED_EVENT)
    .at(-1);
  const handoffEvent = handoff
    ? world.history.events.find((event) => event.id === handoff.eventId)
    : undefined;
  const latest =
    handoffEvent && retirement
      ? handoffEvent.sequence >= retirement.sequence
        ? handoffEvent
        : retirement
      : (handoffEvent ?? retirement);
  if (!latest) return null;
  if (latest === retirement) {
    const personId = retirement.participants.find(
      (entry) => entry.role === "other:retired-from-play",
    )?.personId;
    if (!personId) return null;
    return {
      sequence: retirement.sequence,
      occurredOn: retirement.occurredAt,
      predecessorPersonId: personId,
      successorPersonId: null,
      kind: "retired",
    };
  }
  return {
    sequence: latest.sequence,
    occurredOn: latest.occurredAt,
    predecessorPersonId: handoff!.fromPersonId,
    successorPersonId: handoff!.toPersonId,
    kind: handoff!.kind === "continued" ? "continued" : "observing",
  };
}
