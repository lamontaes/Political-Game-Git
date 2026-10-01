import { ageOnDate, makeIsoDate } from "./dates";
import { eventById } from "./event-index";
import { appendedList, recordsByStringField } from "./history-index";
import { createStableId } from "./ids";
import type { ChildhoodRecordEntry, EntityId, World } from "./types";

/**
 * A person's childhood record (Fable Part 5 Social, gap 5).
 *
 * One record per person, made of dated entries the World appends while the
 * person is under 18. Each entry is written by the producer that already owns
 * the matching fact, inside that producer, and cites the record it came from:
 *
 * - `birth`: the family writer's birth (`people-family.ts`), with the place
 *   and the date;
 * - `school-year-move`: the migration move (`migration/relocate.ts`) when it
 *   lands while school is in session on the shared calendar
 *   (`school-stages.ts`), with the grade.
 *
 * Nothing here draws or estimates. A measure the World does not record yet
 * (years in poverty, school funding per pupil, preschool years, particulates
 * at birth) has no entry kind until its producer exists; a missing entry is
 * not a zero. Years eligible for public health coverage are read from the
 * coverage records themselves (`childhood-record-queries.ts`), not copied.
 */

export const CHILDHOOD_RECORD_VERSION = "childhood-record/v1" as const;

const EMPTY: readonly ChildhoodRecordEntry[] = [];

export function childhoodRecordEntries(
  world: World,
): readonly ChildhoodRecordEntry[] {
  return world.history.childhoodRecords ?? EMPTY;
}

/**
 * The moves that took `personId` out of school in the middle of a school
 * year, oldest first: the one reader of that entry, for the school they
 * leave and for the view their parents form of who answers for it.
 */
export function schoolYearMovesOf(
  world: World,
  personId: EntityId,
  through = world.currentDate,
): readonly Extract<ChildhoodRecordEntry, { kind: "school-year-move" }>[] {
  return recordsByStringField(
    childhoodRecordEntries(world),
    "personId",
    personId,
  ).flatMap((entry) =>
    entry.kind === "school-year-move" && entry.effectiveAt <= through
      ? [entry]
      : [],
  );
}

type EntryInput =
  | Omit<
      Extract<ChildhoodRecordEntry, { kind: "birth" }>,
      "id" | "sequence" | "recordedAt"
    >
  | Omit<
      Extract<ChildhoodRecordEntry, { kind: "school-year-move" }>,
      "id" | "sequence" | "recordedAt"
    >;

/**
 * Appends one entry at the next history sequence. The caller's writer checks
 * the whole World afterwards, as every other append does.
 */
export function appendChildhoodEntry(world: World, input: EntryInput): World {
  const person = world.people[input.personId];
  if (!person) throw new Error("A childhood entry needs a person.");
  const effectiveAt = makeIsoDate(input.effectiveAt);
  if (ageOnDate(person.birthDate, effectiveAt) >= 18)
    throw new Error("A childhood entry is written before the person is 18.");
  if (effectiveAt > world.currentDate)
    throw new Error("A childhood entry cannot take effect in the future.");
  if (!eventById(world, input.sourceRecordId))
    throw new Error("A childhood entry cites a record the World holds.");
  const id = createStableId(
    "childhood-entry",
    `${world.id}:${input.stableKey}`,
  );
  if (childhoodRecordEntries(world).some((entry) => entry.id === id))
    throw new Error(`Duplicate childhood entry: ${input.stableKey}`);
  const entry = {
    ...input,
    id,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    effectiveAt,
  } as ChildhoodRecordEntry;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      childhoodRecords: appendedList(childhoodRecordEntries(world), [entry]),
    },
  };
}

/** World integrity: entries are whole, under 18 and cite an earlier record. */
export function assertChildhoodRecordIntegrity(world: World): void {
  const keys = new Set<string>();
  for (const entry of childhoodRecordEntries(world)) {
    const person = world.people[entry.personId];
    const source = eventById(world, entry.sourceRecordId);
    if (
      keys.has(entry.stableKey) ||
      !person ||
      ageOnDate(person.birthDate, entry.effectiveAt) >= 18 ||
      entry.effectiveAt < person.birthDate ||
      entry.effectiveAt > entry.recordedAt ||
      entry.recordedAt > world.currentDate ||
      !source ||
      source.sequence >= entry.sequence ||
      !source.involvedEntityIds.includes(entry.personId) ||
      (entry.kind === "birth" && entry.birthDate !== person.birthDate) ||
      (entry.kind === "school-year-move" &&
        (!Number.isInteger(entry.grade) || entry.grade < 0 || entry.grade > 12))
    )
      throw new Error(`Invalid childhood entry: ${entry.stableKey}`);
    keys.add(entry.stableKey);
  }
}
