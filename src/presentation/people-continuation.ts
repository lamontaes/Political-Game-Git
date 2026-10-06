import {
  activePartnershipsAt,
  createCampaignElectionTransitionRegistry,
  kinshipRelationshipsAt,
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
import { describePersonContext } from "../simulation/person-context";
import { ownElectionResultsDecided } from "./own-election";
import { projectLifeRecord, type LifeRecordChapter } from "./life-record";
import { composeChapters } from "./journal-chapters";
import { entrySignificance } from "./journal-significance";
import { journalInFirstPerson } from "./journal-first-person";
import { addDays } from "../simulation/dates";
import { proseDate } from "./prose-dates";

export interface LookBackChapter {
  readonly key: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export interface LookBackRecord {
  readonly offices: readonly string[];
  readonly races: readonly string[];
  readonly laws: readonly string[];
  readonly family: readonly string[];
  readonly causeOfDeath: string | null;
}

export interface LookBackMemory {
  readonly key: string;
  readonly text: string;
  readonly at: IsoDate;
  readonly sourceRecordIds: readonly EntityId[];
  readonly significance: number;
}

export interface LifeLookBack {
  readonly through: IsoDate;
  readonly chapters: readonly LookBackChapter[];
  readonly remembered: readonly LookBackMemory[];
  readonly record: LookBackRecord;
}

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
  readonly lookBack: LifeLookBack;
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
  const lookBack = projectLookBack(world, playedPersonId, ended.on);
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
    lookBack,
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
  };
}

/**
 * Read a life back from the canonical records at a cutoff. Until Q3 part 3's
 * shared chapter composer lands, chapter boundaries reuse projectLifeRecord;
 * this adapter applies the journal voice and the life-end cutoff without
 * creating or saving a second biography.
 */
export function projectLookBack(
  world: World,
  personId: EntityId,
  through: IsoDate = world.currentDate,
): LifeLookBack {
  const person = world.people[personId];
  const cutoff = through > world.currentDate ? world.currentDate : through;
  const clipped: World = { ...world, currentDate: cutoff };
  const source = projectLifeRecord(clipped, personId);
  const sourceChapters = composeChapters(clipped, personId, cutoff);
  const kin = new Map<
    EntityId,
    {
      readonly name: string;
      readonly relationship: string;
      readonly establishedAt: IsoDate;
    }
  >();
  if (person) {
    for (const relationship of kinshipRelationshipsAt(clipped, personId)) {
      const otherId = relationship.personIds.find((id) => id !== personId);
      if (!otherId || kin.has(otherId)) continue;
      const context = describePersonContext(clipped, personId, otherId);
      if (context?.relationship)
        kin.set(otherId, {
          name: context.name,
          relationship: context.relationship.replace(/^your\s+/i, "my "),
          establishedAt: relationship.establishedAt,
        });
    }
  }
  const introduced = new Set<EntityId>();
  const namedInFirstPerson = (raw: string, at: IsoDate): string => {
    let text = journalInFirstPerson(raw);
    const ordered = [...kin.entries()].sort(
      (a, b) => b[1].name.length - a[1].name.length,
    );
    for (const [relativeId, entry] of ordered) {
      if (at < entry.establishedAt) continue;
      const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exactName = `(?<![\\w-])${escaped}(?![\\w-])`;
      const pattern = new RegExp(exactName, "g");
      const relative = world.people[relativeId];
      const firstName = relative?.givenName ?? entry.name.split(/\s+/)[0]!;
      let firstMention = !introduced.has(relativeId);
      text = text.replace(pattern, (match) => {
        if (firstMention) {
          firstMention = false;
          introduced.add(relativeId);
          return `${entry.relationship}, ${match}`;
        }
        return firstName;
      });
    }
    return yearOnlyDates(text);
  };

  const chapters: LookBackChapter[] = sourceChapters.flatMap((chapter) => {
    const entries = chapter.entries.filter((entry) => entry.at <= cutoff);
    if (entries.length === 0) return [];
    const firstYear = entries[0]!.at.slice(0, 4);
    const lastYear = entries.at(-1)!.at.slice(0, 4);
    const title =
      firstYear === lastYear
        ? `In ${firstYear}`
        : `${firstYear} to ${lastYear}`;
    return [
      {
        key: chapter.key,
        title,
        paragraphs: entries.map((entry) =>
          namedInFirstPerson(entry.sentence, entry.at),
        ),
      },
    ];
  });

  const memories = source.chapters
    .flatMap((chapter) => chapter.entries)
    .filter((entry) => entry.at <= cutoff)
    .flatMap((entry) => {
      const eventIds = new Set<EntityId>();
      const sourceRecordIds = new Set<EntityId>();
      for (const anchor of entry.anchors) {
        sourceRecordIds.add(anchor.recordId);
        if (anchor.store === "events") eventIds.add(anchor.recordId);
        if (anchor.store === "memories") {
          const memory = world.history.memories.find(
            (row) => row.id === anchor.recordId && row.personId === personId,
          );
          if (memory) eventIds.add(memory.eventId);
        }
      }
      const signal = entrySignificance(
        clipped,
        personId,
        [...eventIds],
        entry.at,
        cutoff,
      );
      // The threshold is evidence-based: more reach, surviving memories,
      // closed threads, or time elapsed can qualify a line; no fixed count.
      if (signal.score < 3) return [];
      const ids = [...sourceRecordIds];
      return [
        {
          key: entry.key,
          text: namedInFirstPerson(entry.sentence, entry.at),
          at: entry.at,
          sourceRecordIds: ids,
          significance: signal.score,
        },
      ];
    })
    .sort(
      (a, b) => b.significance - a.significance || a.at.localeCompare(b.at),
    );

  const offices = officesHeldOverLife(world, personId, cutoff).map((office) => {
    const start = office.startsAt.slice(0, 4);
    const end = office.endsAt ? addDays(office.endsAt, -1).slice(0, 4) : null;
    return end && end >= start
      ? `${office.title}, ${start}–${end}`
      : `${office.title}, ${start}`;
  });
  const races = ownElectionResultsDecided(world, personId, null, cutoff).map(
    (result) =>
      `${yearOnlyDates(
        journalInFirstPerson(
          result.sentence.replace(/,\s*\d+(?:\.\d+)?% to \d+(?:\.\d+)?%/, ""),
        ),
      )} (${result.resolvedAt.slice(0, 4)})`,
  );
  // A signature belongs to the signer only when its canonical disposition's
  // event names them as the actor. A title or office held at the time alone
  // is not enough to claim that the person signed a particular law.
  const signedMeasureIds = new Set(
    (world.history.executiveDispositions ?? [])
      .filter(
        (disposition) =>
          disposition.action === "signed" && disposition.actedAt <= cutoff,
      )
      .filter((disposition) =>
        world.history.events.some(
          (event) =>
            event.occurredAt === disposition.actedAt &&
            event.involvedEntityIds.includes(disposition.id) &&
            event.participants.some(
              (participant) =>
                participant.personId === personId &&
                participant.role === "focus:subject",
            ),
        ),
      )
      .map((disposition) => disposition.measureId),
  );
  const measures = new Map(
    (world.history.legislativeMeasures ?? [])
      .filter(
        (measure) =>
          measure.sponsorPersonId === personId ||
          signedMeasureIds.has(measure.id),
      )
      .map((measure) => [measure.id, measure] as const),
  );
  const laws = (world.history.legislativeEnactments ?? [])
    .filter((enactment) => {
      const measure = measures.get(enactment.measureId);
      return (
        enactment.outcome === "enacted" &&
        enactment.resolvedAt <= cutoff &&
        measure !== undefined &&
        measure.introducedAt <= cutoff
      );
    })
    .sort((a, b) => a.resolvedAt.localeCompare(b.resolvedAt))
    .map((enactment) => {
      const measure = measures.get(enactment.measureId)!;
      const title = measure.shortTitle.trim();
      const plainTitle =
        /^(?:H\.?B\.?|S\.?B\.?|H\.?J\.?R\.?|S\.?J\.?R\.?)\s*\d+[A-Z-]*$/i.test(
          title,
        )
          ? measure.summary.trim()
          : title;
      return `${plainTitle} (${enactment.resolvedAt.slice(0, 4)})`;
    });

  const family = new Map<EntityId, string>();
  for (const relationship of kinshipRelationshipsAt(clipped, personId)) {
    const otherId = relationship.personIds.find((id) => id !== personId);
    if (!otherId || family.has(otherId)) continue;
    const context = describePersonContext(clipped, personId, otherId);
    if (!context) continue;
    const role = context.relationship?.replace(/^your\s+/i, "") ?? "family";
    const dead = world.history.personDeaths.some(
      (death) => death.personId === otherId && death.diedAt <= through,
    );
    family.set(otherId, `${role}: ${context.name}${dead ? " (died)" : ""}`);
  }
  for (const partnership of clipped.history.partnerships) {
    if (!partnership.personIds.includes(personId)) continue;
    const otherId = partnership.personIds.find((id) => id !== personId);
    if (!otherId || family.has(otherId)) continue;
    const context = describePersonContext(clipped, personId, otherId);
    if (context)
      family.set(
        otherId,
        `partner: ${context.name}${world.history.personDeaths.some((death) => death.personId === otherId && death.diedAt <= through) ? " (died)" : ""}`,
      );
  }
  // Read active partnerships as well as ended ones, since older saves may not
  // retain every partnership state transition.
  for (const partnership of activePartnershipsAt(clipped, personId)) {
    const otherId = partnership.personIds.find((id) => id !== personId);
    if (!otherId || family.has(otherId)) continue;
    const context = describePersonContext(clipped, personId, otherId);
    if (context) family.set(otherId, `partner: ${context.name}`);
  }
  const death = world.history.personDeaths.find(
    (record) => record.personId === personId && record.diedAt <= cutoff,
  );
  const causeOfDeath = death
    ? yearOnlyDates(
        deathSentence(
          personName(person!),
          death.causeKey,
          proseDate(death.diedAt),
        ),
      )
    : null;
  return {
    through: cutoff,
    chapters,
    remembered: memories.map((entry) => ({ ...entry, text: entry.text })),
    record: {
      offices: [...new Set(offices)],
      races,
      laws,
      family: [...family.values()],
      causeOfDeath,
    },
  };
}

function yearOnlyDates(text: string): string {
  return text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, (date) => date.slice(0, 4))
    .replace(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+(\d{4})\b/g,
      "$1",
    );
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
