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
 * fields, as indexes into one shared table, and reading the save rebuilds the
 * identical record, so the World a save opens is the World that was saved.
 *
 * Only an unchanged first value is packed: a tendency a life moved, or any
 * record a row would not rebuild exactly, is written verbatim.
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
  note: number,
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

function stemOf(record: PersonalityTendencyRecord): string {
  return record.stableKey.split(record.personId).join(PERSON);
}

/**
 * Whether a row rebuilds this record exactly: an unchanged first value worked
 * out from upbringing, with every field the shape `rebuild` writes.
 */
function packable(
  worldId: EntityId,
  record: PersonalityTendencyRecord,
): boolean {
  const provenance = record.provenance as unknown as Record<string, unknown>;
  return (
    exactKeys(record, RECORD_KEYS) &&
    record.supersedesTendencyId === null &&
    typeof record.personId === "string" &&
    record.personId.length > 0 &&
    typeof record.stableKey === "string" &&
    typeof record.tendencyId === "string" &&
    typeof record.recordedAt === "string" &&
    typeof record.expressionKey === "string" &&
    typeof record.strength === "string" &&
    typeof record.confidence === "string" &&
    Number.isSafeInteger(record.sequence) &&
    Array.isArray(record.scopeTags) &&
    record.scopeTags.every((tag) => typeof tag === "string") &&
    record.scopeTags.some((tag) => DERIVED_TAGS.has(tag)) &&
    typeof provenance === "object" &&
    provenance !== null &&
    exactKeys(provenance, PROVENANCE_KEYS) &&
    provenance.kind === "authored" &&
    Array.isArray(provenance.sourceRefs) &&
    provenance.sourceRefs.length === 0 &&
    typeof provenance.note === "string" &&
    record.stableKey.includes(record.personId) &&
    !record.stableKey.includes(PERSON) &&
    stemOf(record).split(PERSON).join(record.personId) === record.stableKey &&
    record.id === recordId(worldId, record.stableKey)
  );
}

/** Whether this world has a tendency its save writes as a row. */
export function hasPackableTendency(world: World): boolean {
  return world.history.personalityTendencies.some((record) =>
    packable(world.id, record),
  );
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
  // Tags are stored as their JSON text; equal lists share one entry.
  const tagText = new Map<string, string>();
  let packedAny = false;
  const written = world.history.personalityTendencies.map((record) => {
    if (!packable(world.id, record)) return record;
    const tagKey = record.scopeTags.join("\u0000");
    let tags = tagText.get(tagKey);
    if (tags === undefined) {
      tags = JSON.stringify(record.scopeTags);
      tagText.set(tagKey, tags);
    }
    packedAny = true;
    const row: PackedTendencyRow = [
      ref(record.personId),
      ref(stemOf(record)),
      ref(record.tendencyId),
      ref(record.recordedAt),
      ref(record.expressionKey),
      ref(record.strength),
      ref(record.confidence),
      ref(tags),
      ref((record.provenance as { readonly note: string }).note),
      record.sequence,
    ];
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
  const { strings } = packingFrom(packed);
  if (!Array.isArray(world.history.personalityTendencies))
    throw new Error("World snapshot packs tendencies it does not hold.");
  const text = (index: unknown): string => {
    if (
      typeof index !== "number" ||
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= strings.length
    )
      throw new Error("A packed tendency references a missing table entry.");
    return strings[index]!;
  };
  // Each table entry of tags is parsed and checked once; every record gets
  // its own list. A row stands only for a first value worked out from the
  // upbringing, as the writer would have packed it.
  const parsedTags = new Map<number, readonly string[]>();
  const tagsAt = (index: number): string[] => {
    let tags = parsedTags.get(index);
    if (tags === undefined) {
      const value = JSON.parse(text(index)) as unknown;
      if (
        !Array.isArray(value) ||
        !value.every((tag) => typeof tag === "string") ||
        !value.some((tag) => DERIVED_TAGS.has(tag)) ||
        JSON.stringify(value) !== text(index)
      )
        throw new Error("A packed tendency row cannot be rebuilt.");
      tags = value as string[];
      parsedTags.set(index, tags);
    }
    return [...tags];
  };
  let unpackedAny = false;
  const rebuilt = world.history.personalityTendencies.map((record) => {
    if (!Array.isArray(record)) return record;
    if (record.length !== ROW_LENGTH)
      throw new Error("A packed tendency row is malformed.");
    const [
      person,
      stem,
      tendency,
      date,
      expression,
      strength,
      confidence,
      tags,
      note,
      sequence,
    ] = record as unknown as PackedTendencyRow;
    if (!Number.isSafeInteger(sequence))
      throw new Error("A packed tendency row cannot be rebuilt.");
    const personId = text(person) as EntityId;
    const storedStem = text(stem);
    const stableKey = storedStem.split(PERSON).join(personId);
    // The writer's own stem for this key, so the row is the one it wrote.
    if (
      personId.length === 0 ||
      !storedStem.includes(PERSON) ||
      stableKey.includes(PERSON) ||
      stableKey.split(personId).join(PERSON) !== storedStem
    )
      throw new Error("A packed tendency row cannot be rebuilt.");
    const rebuiltRecord = {
      stableKey,
      personId,
      tendencyId: text(tendency) as EntityId,
      recordedAt: text(date),
      expressionKey: text(expression),
      strength: text(strength),
      confidence: text(confidence),
      scopeTags: tagsAt(tags),
      provenance: { kind: "authored", sourceRefs: [], note: text(note) },
      supersedesTendencyId: null,
      id: recordId(world.id, stableKey),
      sequence,
    } as unknown as PersonalityTendencyRecord;
    unpackedAny = true;
    return rebuiltRecord;
  });
  if (!unpackedAny)
    throw new Error("World snapshot packs tendencies it does not hold.");
  return {
    ...world,
    history: { ...world.history, personalityTendencies: rebuilt },
  };
}
