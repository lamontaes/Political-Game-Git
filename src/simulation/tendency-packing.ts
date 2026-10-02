import { createStableId } from "./ids";
import type { EntityId, PersonalityTendencyRecord, World } from "./types";

/**
 * Disk-only encoding for the personality tendencies a life works out from a
 * person's upbringing the first time a decision needs them.
 *
 * Those records are most of a played save: a far-away incumbent deciding
 * whether to run again writes one for every trait first, and a season of
 * legislative races writes them for thousands of people the player never
 * meets. Everything in such a record except its value follows from the
 * person, the trait and the day it was written. The save keeps only those
 * numbers, and reading the save rebuilds the identical record, so the World a
 * save opens is the World that was saved.
 *
 * Only an unchanged first value is packed: a tendency a life moved, or any
 * record whose rebuilt text would differ by a byte, is written verbatim.
 */
export interface PackedTendencies {
  readonly strings: readonly string[];
}

type PackedTendencyRow = readonly [
  person: number,
  stem: number,
  tendency: number,
  date: number,
  expression: number,
  strength: number,
  confidence: number,
  tags: number,
  provenance: number,
  sequence: number,
];

const ROW_LENGTH = 10;
/** Stands for the person's id inside a stored stable-key stem. */
const PERSON = "{person}";
/** The scope tags of a first value worked out from the upbringing. */
const DERIVED_TAGS = new Set([
  "people-mind-v1.seed",
  "personality-v1.upbringing",
]);
const RECORD_KEYS = [
  "stableKey",
  "personId",
  "tendencyId",
  "recordedAt",
  "expressionKey",
  "strength",
  "confidence",
  "scopeTags",
  "provenance",
  "supersedesTendencyId",
  "id",
  "sequence",
];
const PROVENANCE_KEYS = ["kind", "sourceRefs", "note"];

function exactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length && actual.every((key, at) => key === keys[at])
  );
}

function recordId(worldId: EntityId, stableKey: string): EntityId {
  return createStableId("personality-tendency", `${worldId}:${stableKey}`);
}

/** Whether a record is an unchanged first value worked out from upbringing. */
function derivedFirstValue(record: PersonalityTendencyRecord): boolean {
  const provenance = record.provenance as unknown as Record<string, unknown>;
  return (
    exactKeys(record, RECORD_KEYS) &&
    record.supersedesTendencyId === null &&
    record.scopeTags.some((tag) => DERIVED_TAGS.has(tag)) &&
    typeof provenance === "object" &&
    provenance !== null &&
    exactKeys(provenance, PROVENANCE_KEYS) &&
    provenance.kind === "authored" &&
    Array.isArray(provenance.sourceRefs) &&
    provenance.sourceRefs.length === 0 &&
    Number.isSafeInteger(record.sequence) &&
    record.stableKey.includes(record.personId) &&
    !record.stableKey.includes(PERSON)
  );
}

function rebuild(
  worldId: EntityId,
  strings: readonly string[],
  row: PackedTendencyRow,
): PersonalityTendencyRecord {
  const text = (index: number): string => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= strings.length)
      throw new Error("A packed tendency references a missing table entry.");
    return strings[index]!;
  };
  const [
    person,
    stem,
    tendency,
    date,
    expression,
    strength,
    confidence,
    tags,
    provenance,
    sequence,
  ] = row;
  if (!Number.isSafeInteger(sequence))
    throw new Error("A packed tendency row cannot be rebuilt.");
  const personId = text(person) as EntityId;
  const stableKey = text(stem).split(PERSON).join(personId);
  const scopeTags = JSON.parse(text(tags)) as unknown;
  const provenanceValue = JSON.parse(text(provenance)) as unknown;
  if (
    !Array.isArray(scopeTags) ||
    !scopeTags.every((tag) => typeof tag === "string") ||
    typeof provenanceValue !== "object" ||
    provenanceValue === null
  )
    throw new Error("A packed tendency row cannot be rebuilt.");
  return {
    stableKey,
    personId,
    tendencyId: text(tendency) as EntityId,
    recordedAt: text(date),
    expressionKey: text(expression),
    strength: text(strength),
    confidence: text(confidence),
    scopeTags,
    provenance: provenanceValue,
    supersedesTendencyId: null,
    id: recordId(worldId, stableKey),
    sequence,
  } as unknown as PersonalityTendencyRecord;
}

/**
 * The world with its first-value tendencies written as rows, or null when
 * there is none to pack (the save is then written exactly as before).
 */
export function packTendencies(
  world: World,
): { readonly world: World; readonly packing: PackedTendencies } | null {
  const strings: string[] = [];
  const indexes = new Map<string, number>();
  const ref = (value: string): number => {
    let at = indexes.get(value);
    if (at === undefined) {
      at = strings.length;
      strings.push(value);
      indexes.set(value, at);
    }
    return at;
  };
  let packedAny = false;
  const written = world.history.personalityTendencies.map((record) => {
    if (!derivedFirstValue(record)) return record;
    if (record.id !== recordId(world.id, record.stableKey)) return record;
    const mark = strings.length;
    const row: PackedTendencyRow = [
      ref(record.personId),
      ref(record.stableKey.split(record.personId).join(PERSON)),
      ref(record.tendencyId),
      ref(record.recordedAt),
      ref(record.expressionKey),
      ref(record.strength),
      ref(record.confidence),
      ref(JSON.stringify(record.scopeTags)),
      ref(JSON.stringify(record.provenance)),
      record.sequence,
    ];
    // Packed only when the row rebuilds the record byte for byte.
    if (
      JSON.stringify(rebuild(world.id, strings, row)) !== JSON.stringify(record)
    ) {
      for (const value of strings.splice(mark)) indexes.delete(value);
      return record;
    }
    packedAny = true;
    return row as unknown as PersonalityTendencyRecord;
  });
  return packedAny
    ? {
        world: {
          ...world,
          history: { ...world.history, personalityTendencies: written },
        },
        packing: { strings },
      }
    : null;
}

function packingFrom(value: unknown): PackedTendencies {
  if (
    typeof value !== "object" ||
    value === null ||
    !exactKeys(value, ["strings"]) ||
    !Array.isArray((value as { strings?: unknown }).strings) ||
    !(value as { strings: unknown[] }).strings.every(
      (entry) => typeof entry === "string",
    )
  )
    throw new Error("World snapshot's tendency table is malformed.");
  return value as PackedTendencies;
}

/** Rebuild the original records, in their order, before integrity checking. */
export function unpackTendencies(world: World, packed: unknown): World {
  const packing = packingFrom(packed);
  if (!Array.isArray(world.history.personalityTendencies))
    throw new Error("World snapshot packs tendencies it does not hold.");
  const rebuilt = world.history.personalityTendencies.map((record) => {
    if (!Array.isArray(record)) return record;
    if (record.length !== ROW_LENGTH)
      throw new Error("A packed tendency row is malformed.");
    return rebuild(
      world.id,
      packing.strings,
      record as unknown as PackedTendencyRow,
    );
  });
  return {
    ...world,
    history: { ...world.history, personalityTendencies: rebuilt },
  };
}
