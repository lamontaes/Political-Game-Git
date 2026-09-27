import { createStableId } from "./ids";
import type {
  BeliefConviction,
  BeliefFormationContext,
  EntityId,
  PoliticalFlexibility,
  PrincipleRecord,
  PrincipleStance,
  World,
} from "./types";

/** Disk-only encoding for the identical generated principles drawn before play. */
export interface PackedPrinciples {
  readonly persons: readonly EntityId[];
  readonly principleIds: readonly EntityId[];
  readonly dates: readonly string[];
}

type PackedPrincipleRow = readonly [number, number, number, string, number];

const DRAW_PREFIX = "officeholder-principles/v1:";
const DRAW_NOTE = "Drawn before play; see officeholder-principles.ts.";
const STANCES: readonly PrincipleStance[] = [
  "endorses",
  "rejects",
  "conflicted",
];
const CONVICTIONS: readonly BeliefConviction[] = [
  "tentative",
  "moderate",
  "strong",
  "settled",
];
const FLEXIBILITIES: readonly PoliticalFlexibility[] = [
  "open",
  "negotiable",
  "conditional",
  "firm",
];
const RECORD_KEYS = [
  "stableKey",
  "personId",
  "principleId",
  "formedAt",
  "stance",
  "conviction",
  "flexibility",
  "qualification",
  "formation",
  "supersedesPrincipleRecordId",
  "id",
  "sequence",
];
const FORMATION_KEYS = [
  "reason",
  "relevantEventIds",
  "sourceFactIds",
  "propositionExposureIds",
  "memoryIds",
  "eventKnowledgeIds",
  "claimIds",
  "relationshipInteractionIds",
  "subjectKnowledgeIds",
  "decisionTraceIds",
  "cue",
  "evidenceReference",
  "note",
];
const EMPTY_FORMATION_FIELDS = FORMATION_KEYS.slice(1, 10);

function exactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length && actual.every((key, at) => key === keys[at])
  );
}

function drawnFormation(): BeliefFormationContext {
  return {
    reason: "other:drawn-before-play",
    relevantEventIds: [],
    sourceFactIds: [],
    propositionExposureIds: [],
    memoryIds: [],
    eventKnowledgeIds: [],
    claimIds: [],
    relationshipInteractionIds: [],
    subjectKnowledgeIds: [],
    decisionTraceIds: [],
    cue: null,
    evidenceReference: null,
    note: DRAW_NOTE,
  };
}

function codeFor(record: PrincipleRecord, world: World): string | null {
  if (!exactKeys(record, RECORD_KEYS)) return null;
  const principle = world.policyCatalog.principles[record.principleId];
  if (
    !principle ||
    record.stableKey !==
      `${DRAW_PREFIX}${record.personId}:${principle.stableKey}` ||
    record.id !==
      createStableId("principle", `${world.id}:${record.stableKey}`) ||
    record.qualification !== null ||
    record.supersedesPrincipleRecordId !== null ||
    !Number.isSafeInteger(record.sequence) ||
    !record.formation ||
    !exactKeys(record.formation, FORMATION_KEYS) ||
    record.formation.reason !== "other:drawn-before-play" ||
    record.formation.cue !== null ||
    record.formation.evidenceReference !== null ||
    record.formation.note !== DRAW_NOTE ||
    EMPTY_FORMATION_FIELDS.some(
      (field) =>
        !Array.isArray(
          record.formation[field as keyof BeliefFormationContext],
        ) ||
        (
          record.formation[
            field as keyof BeliefFormationContext
          ] as readonly unknown[]
        ).length !== 0,
    )
  )
    return null;
  const stance = STANCES.indexOf(record.stance);
  const conviction = CONVICTIONS.indexOf(record.conviction);
  const flexibility = FLEXIBILITIES.indexOf(record.flexibility);
  return stance < 0 || conviction < 0 || flexibility < 0
    ? null
    : `${stance}${conviction}${flexibility}`;
}

/** Preserve unusual or later-edited principle records verbatim on disk. */
export function packPrinciples(
  world: World,
): { readonly world: World; readonly packing: PackedPrinciples } | null {
  const persons: EntityId[] = [];
  const principleIds: EntityId[] = [];
  const dates: string[] = [];
  const personIndex = new Map<EntityId, number>();
  const principleIndex = new Map<EntityId, number>();
  const dateIndex = new Map<string, number>();
  const reference = <T extends string>(
    value: T,
    entries: T[],
    indexes: Map<T, number>,
  ): number => {
    let at = indexes.get(value);
    if (at === undefined) {
      at = entries.length;
      entries.push(value);
      indexes.set(value, at);
    }
    return at;
  };
  let packedAny = false;
  const written = world.history.principles.map((record) => {
    const code = codeFor(record, world);
    if (code === null) return record;
    packedAny = true;
    const packed: PackedPrincipleRow = [
      reference(record.personId, persons, personIndex),
      reference(record.principleId, principleIds, principleIndex),
      reference(record.formedAt, dates, dateIndex),
      code,
      record.sequence,
    ];
    return packed as unknown as PrincipleRecord;
  });
  return packedAny
    ? {
        world: {
          ...world,
          history: { ...world.history, principles: written },
        },
        packing: { persons, principleIds, dates },
      }
    : null;
}

function stringTable(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function packingFrom(value: unknown): PackedPrinciples {
  if (
    typeof value !== "object" ||
    value === null ||
    !exactKeys(value, ["persons", "principleIds", "dates"]) ||
    !stringTable((value as Partial<PackedPrinciples>).persons) ||
    !stringTable((value as Partial<PackedPrinciples>).principleIds) ||
    !stringTable((value as Partial<PackedPrinciples>).dates)
  )
    throw new Error("World snapshot's principle tables are malformed.");
  return value as PackedPrinciples;
}

function tableItem<T>(table: readonly T[], index: unknown): T {
  if (
    !Number.isSafeInteger(index) ||
    (index as number) < 0 ||
    (index as number) >= table.length
  )
    throw new Error("A packed principle references a missing table entry.");
  return table[index as number]!;
}

/** Rebuild the original records and property order before integrity checking. */
export function unpackPrinciples(world: World, packed: unknown): World {
  const packing = packingFrom(packed);
  if (!Array.isArray(world.history.principles))
    throw new Error("World snapshot packs principles it does not hold.");
  const rebuilt = world.history.principles.map((record) => {
    if (!Array.isArray(record)) return record;
    if (record.length !== 5)
      throw new Error("A packed principle row is malformed.");
    const [personRef, principleRef, dateRef, code, sequence] =
      record as unknown as PackedPrincipleRow;
    const personId = tableItem(packing.persons, personRef) as EntityId;
    const principleId = tableItem(
      packing.principleIds,
      principleRef,
    ) as EntityId;
    const formedAt = tableItem(
      packing.dates,
      dateRef,
    ) as PrincipleRecord["formedAt"];
    const principle = world.policyCatalog.principles[principleId];
    if (
      !principle ||
      typeof code !== "string" ||
      !/^[0-2][0-3][0-3]$/.test(code) ||
      !Number.isSafeInteger(sequence)
    )
      throw new Error("A packed principle row cannot be rebuilt.");
    const stableKey = `${DRAW_PREFIX}${personId}:${principle.stableKey}`;
    return {
      stableKey,
      personId,
      principleId,
      formedAt,
      stance: STANCES[Number(code[0])]!,
      conviction: CONVICTIONS[Number(code[1])]!,
      flexibility: FLEXIBILITIES[Number(code[2])]!,
      qualification: null,
      formation: drawnFormation(),
      supersedesPrincipleRecordId: null,
      id: createStableId("principle", `${world.id}:${stableKey}`),
      sequence,
    } satisfies PrincipleRecord;
  });
  return {
    ...world,
    history: { ...world.history, principles: rebuilt },
  };
}
