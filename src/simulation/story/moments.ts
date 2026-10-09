import kindsData from "../../../data/content/story-moment-kinds.json" with { type: "json" };
import { addDays, ageOnDate } from "../dates";
import {
  appendedList,
  recordById,
  recordsByStringField,
} from "../history-index";
import {
  annualizedRecordedPayMinor,
  recordedMonthlyPayByPerson,
} from "../household-pay";
import { createStableId } from "../ids";
import {
  activePartnershipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import {
  latestPersonalityTendenciesForPerson,
  relationshipHistory,
} from "../queries";
import { readRelationshipStanding } from "../relationship-standing";
import { loadedTraitRegistry } from "../trait-registry";
import { traitDefinitionFromPack, type RegisteredTrait } from "../trait-packs";
import { traitReadingOfRecord } from "../trait-readings";
import { traitActTables } from "../traits/act-pulls";
import {
  latestThreadState,
  recordStoryThreads,
  storyThreadStatesTo,
} from "./threads";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  RelationshipInteraction,
  ResourceFlowTermsRecord,
  StoryIntakeMark,
  StoryMomentRecord,
  StoryThreadStateRecord,
  World,
} from "../types";

/**
 * Moments: which records changed something in a person's life, and how much
 * (story director, part 1 of docs/design/story-director.md).
 *
 * A record scores for each person it names, and reaches a named person's
 * relatives only through a row that names that relation. Most records score
 * zero and write nothing. A moment is scored once, when the intake first reads
 * its record, and never again.
 *
 * Salience is the product of five sliding factors, capped at 1: the kind's
 * weight from a published life-change scale, closeness, first of its kind,
 * the person's recorded traits and what is at stake. Nothing here decides what
 * anybody does; it only says which moments a life's story is made of.
 *
 * The intake reads only the records written since its last reading position,
 * found by binary search on each append-only store, so its cost follows what
 * was written, never the size of the World.
 */

/* -------------------------------------------------------------------------- */
/* The table                                                                   */
/* -------------------------------------------------------------------------- */

interface WeightRow {
  readonly source: string;
  readonly row: string;
  readonly value: number;
}

interface RelationRow {
  readonly relation: "parent" | "child" | "sibling";
  readonly adult?: WeightRow;
  readonly youth?: WeightRow;
  readonly youthLong?: WeightRow;
}

interface MomentKind {
  readonly key: string;
  readonly match: {
    readonly store: string;
    readonly types?: readonly string[];
    readonly tags?: readonly string[];
    readonly roles?: readonly string[];
    readonly statuses?: readonly string[];
    readonly reasons?: readonly string[];
    readonly sameAs?: string;
  };
  readonly scores?: "told";
  readonly acts: readonly string[];
  /** What the record puts at stake: a jail term's freedom, or a lost job's pay. */
  readonly stakes?: "freedom" | "money";
  readonly adult?: WeightRow;
  readonly youth?: WeightRow;
  readonly kin?: WeightRow;
  readonly closeness?: "standing";
  readonly relations?: readonly RelationRow[];
  readonly subjectRelations?: readonly RelationRow[];
  readonly byRelation?: Readonly<
    Record<string, { readonly adult?: WeightRow; readonly youth?: WeightRow }>
  >;
}

interface Calibration {
  readonly firstOfKind: number;
  readonly traitTiltAtFullStrength: number;
  readonly closenessRange: readonly [number, number];
  readonly relationshipCap: number;
  /** What a full year of freedom, or a full year's household income, adds to stakes. */
  readonly stakesAtFullYear: number;
  readonly relationshipSignificance: Readonly<Record<string, number>>;
  readonly relationshipChange: Readonly<Record<string, number>>;
}

const TABLE = kindsData as unknown as {
  readonly version: number;
  readonly sources: Readonly<Record<string, { readonly citation: string }>>;
  readonly calibration: Calibration;
  readonly threadRoleChanges: {
    readonly kinds: readonly string[];
    readonly death: WeightRow;
  };
  readonly kinds: readonly MomentKind[];
};

/** The prefix of a moment for someone whose thread's other end changed (part 5, rule 2). */
export const THREAD_MOMENT_PREFIX = "thread";
/** The kinds whose subject's change reaches everyone with a thread to them. */
const THREAD_ROLE_KINDS: ReadonlySet<string> = new Set(
  TABLE.threadRoleChanges.kinds,
);

const CALIBRATION = TABLE.calibration;

export const STORY_MOMENT_KINDS: readonly MomentKind[] = TABLE.kinds;

/** Kinds by the store they read, then by event type where they name one. */
const KINDS_BY_STORE = new Map<string, MomentKind[]>();
const EVENT_KINDS_BY_TYPE = new Map<string, MomentKind[]>();
for (const kind of STORY_MOMENT_KINDS) {
  const list = KINDS_BY_STORE.get(kind.match.store) ?? [];
  list.push(kind);
  KINDS_BY_STORE.set(kind.match.store, list);
  if (kind.match.store === "events")
    for (const type of kind.match.types ?? []) {
      const byType = EVENT_KINDS_BY_TYPE.get(type) ?? [];
      byType.push(kind);
      EVENT_KINDS_BY_TYPE.set(type, byType);
    }
}

/** The relationship log's own kind, scored by its weights rather than a row. */
export const RELATIONSHIP_MOMENT_KIND = "relationship";

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

const NO_MOMENTS: readonly StoryMomentRecord[] = [];
const NO_MARKS: readonly StoryIntakeMark[] = [];

export function storyMoments(world: World): readonly StoryMomentRecord[] {
  return world.history.storyMoments ?? NO_MOMENTS;
}

function storyIntakeMarks(world: World): readonly StoryIntakeMark[] {
  return world.history.storyIntakeMarks ?? NO_MARKS;
}

/** One person's moments, oldest written first. */
export function storyMomentsOf(
  world: World,
  personId: EntityId,
): readonly StoryMomentRecord[] {
  return recordsByStringField(storyMoments(world), "personId", personId);
}

/** The sequence the next intake starts reading from. */
export function storyIntakeCursor(world: World): number {
  return storyIntakeMarks(world).at(-1)?.throughSequence ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Candidates                                                                  */
/* -------------------------------------------------------------------------- */

interface Candidate {
  readonly personId: EntityId;
  readonly occurredAt: IsoDate;
  readonly kindKey: string;
  readonly firstKey: string;
  readonly counterpartPersonIds: readonly EntityId[];
  readonly sourceStore: string;
  readonly sourceRecordId: EntityId;
  readonly sourceSequence: number;
  readonly base: number;
  readonly weight: WeightRow;
  readonly acts: readonly string[];
  /** Whose standing slides closeness, when the row does not carry it. */
  readonly closenessToward: EntityId | null;
  readonly stakes: number;
  /** The event a relationship record belongs to, for one change, one moment. */
  readonly eventId: EntityId | null;
  readonly sameAs: string | null;
}

interface SequencedRecord {
  readonly id: EntityId;
  readonly sequence: number;
}

function weightOf(row: WeightRow): number {
  return row.value / 100;
}

function isPerson(
  world: World,
  id: EntityId | null | undefined,
): id is EntityId {
  return typeof id === "string" && world.people[id] !== undefined;
}

function ageAt(world: World, personId: EntityId, date: IsoDate): number | null {
  const person = world.people[personId];
  if (!person || person.birthDate > date) return null;
  return ageOnDate(person.birthDate, date);
}

/** The row for this person's age: the non-adult row under 18, else the adult row. */
function rowForAge(
  age: number,
  rows: { readonly adult?: WeightRow; readonly youth?: WeightRow },
): WeightRow | null {
  if (age < 18) return rows.youth ?? rows.adult ?? null;
  return rows.adult ?? null;
}

type Relation = "parent" | "child" | "sibling" | "partner" | "kin" | "other";

/** What `otherId` is to `personId`, read from kinship and partnership records. */
function relationOf(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): Relation {
  const kin = safeKinship(world, personId).find((record) =>
    record.personIds.includes(otherId),
  );
  if (kin) {
    if (kin.kind.includes("parent-child")) {
      const self = world.people[personId]!;
      const other = world.people[otherId];
      return other && other.birthDate < self.birthDate ? "parent" : "child";
    }
    if (kin.kind.includes("sibling")) return "sibling";
    return "kin";
  }
  const partnered = safePartnerships(world, personId).some((record) =>
    record.personIds.includes(otherId),
  );
  return partnered ? "partner" : "other";
}

function safeKinship(world: World, personId: EntityId) {
  try {
    return kinshipRelationshipsAt(world, personId);
  } catch {
    return [];
  }
}

function safeMemberships(world: World, personId: EntityId) {
  try {
    return householdMembershipsAt(world, personId);
  } catch {
    return [];
  }
}

function safeHousehold(world: World, householdId: EntityId) {
  try {
    return peopleInHouseholdAt(world, householdId);
  } catch {
    return [];
  }
}

function safePartnerships(world: World, personId: EntityId) {
  try {
    return activePartnershipsAt(world, personId);
  } catch {
    return [];
  }
}

/** The living relatives of `personId` that stand in `relation` to them. */
function relativesOf(
  world: World,
  personId: EntityId,
  relation: RelationRow["relation"],
): readonly EntityId[] {
  const self = world.people[personId];
  if (!self) return [];
  const found: EntityId[] = [];
  for (const record of safeKinship(world, personId)) {
    const otherId = record.personIds.find((id) => id !== personId);
    const other = otherId ? world.people[otherId] : undefined;
    if (!otherId || !other) continue;
    if (relation === "sibling" && record.kind.includes("sibling"))
      found.push(otherId);
    if (record.kind.includes("parent-child")) {
      const otherIsParent = other.birthDate < self.birthDate;
      if (relation === "parent" && otherIsParent) found.push(otherId);
      if (relation === "child" && !otherIsParent) found.push(otherId);
    }
  }
  return [...new Set(found)].sort();
}

function sentenceMonths(event: HistoricalEvent): number | null {
  const tag = event.tags.find((entry) =>
    entry.startsWith("justice.sentence-months:"),
  );
  if (!tag) return event.tags.includes("justice.sentence-life") ? 1200 : null;
  const months = Number(tag.slice("justice.sentence-months:".length));
  return Number.isFinite(months) ? months : null;
}

/** Freedom lost raises stakes by its share of a year, up to a full year. */
function freedomStakes(months: number | null): number {
  if (months === null || months <= 0) return 1;
  return 1 + CALIBRATION.stakesAtFullYear * Math.min(1, months / 12);
}

/**
 * A lost job raises stakes by its yearly pay as a share of the household's
 * recorded yearly income the day before, up to the whole of it. A job or a
 * household with no pay on record puts nothing measurable at stake.
 */
function moneyStakes(
  world: World,
  personId: EntityId,
  record: StateRecord,
  date: IsoDate,
): number {
  if (!record.workRelationshipId) return 1;
  const dayBefore = addDays(date, -1);
  const flows = new Set<EntityId>();
  for (const flow of world.history.resourceFlows)
    if (
      flow.basisReference.kind === "work" &&
      flow.basisReference.workRelationshipId === record.workRelationshipId
    )
      flows.add(flow.id);
  if (flows.size === 0) return 1;
  const latest = new Map<EntityId, ResourceFlowTermsRecord>();
  for (const terms of world.history.resourceFlowTerms)
    if (flows.has(terms.resourceFlowId) && terms.effectiveAt <= dayBefore)
      latest.set(terms.resourceFlowId, terms);
  let lostYearly = 0;
  for (const terms of latest.values())
    if (terms.status === "active")
      lostYearly +=
        annualizedRecordedPayMinor(
          terms.amount.minorUnits,
          terms.cadenceKind,
        ) ?? 0;
  if (!(lostYearly > 0)) return 1;
  const pay = recordedMonthlyPayByPerson(world, dayBefore);
  const members = new Set<EntityId>([personId]);
  for (const membership of safeMemberships(world, personId))
    for (const id of safeHousehold(world, membership.membership.householdId))
      members.add(id);
  let householdYearly = 0;
  for (const id of members) householdYearly += (pay.get(id) ?? 0) * 12;
  if (!(householdYearly > 0)) return 1;
  return (
    1 + CALIBRATION.stakesAtFullYear * Math.min(1, lostYearly / householdYearly)
  );
}

function eventPeople(
  world: World,
  event: HistoricalEvent,
  roles: readonly string[] | undefined,
): readonly EntityId[] {
  const named = event.participants
    .filter((participant) =>
      roles
        ? roles.includes(participant.role)
        : !participant.role.startsWith("other:"),
    )
    .map((participant) => participant.personId)
    .filter((id): id is EntityId => isPerson(world, id));
  return [...new Set(named)].sort();
}

function relationCandidates(
  world: World,
  base: Omit<
    Candidate,
    "personId" | "base" | "weight" | "counterpartPersonIds" | "acts"
  >,
  aboutPersonId: EntityId,
  rows: readonly RelationRow[] | undefined,
  longStay: boolean,
): Candidate[] {
  const out: Candidate[] = [];
  for (const row of rows ?? []) {
    for (const relativeId of relativesOf(world, aboutPersonId, row.relation)) {
      const age = ageAt(world, relativeId, base.occurredAt);
      if (age === null) continue;
      const youthRow = longStay && row.youthLong ? row.youthLong : row.youth;
      const weight = rowForAge(age, { adult: row.adult, youth: youthRow });
      if (!weight) continue;
      out.push({
        ...base,
        personId: relativeId,
        counterpartPersonIds: [aboutPersonId],
        base: weightOf(weight),
        weight,
        acts: [],
      });
    }
  }
  return out;
}

/**
 * A role change reaches everyone with a thread to the person it happened to:
 * each gets a moment scored by how much the thread mattered to them, times
 * the weight of what happened (part 5, rule 2). The thread index is keyed by
 * the other person, so this reads only that person's threads. People the
 * record already reaches, and the person themself, are left out.
 */
function threadRoleCandidates(
  world: World,
  subjectId: EntityId,
  kindKey: string,
  weight: WeightRow,
  source: {
    readonly occurredAt: IsoDate;
    readonly sourceStore: string;
    readonly sourceRecordId: EntityId;
    readonly sourceSequence: number;
    readonly eventId: EntityId | null;
  },
  reached: (personId: EntityId) => boolean,
): Candidate[] {
  const latest = new Map<EntityId, StoryThreadStateRecord>();
  for (const state of storyThreadStatesTo(world, subjectId))
    latest.set(state.personId, state);
  const key = `${THREAD_MOMENT_PREFIX}:${kindKey}`;
  const out: Candidate[] = [];
  for (const [personId, state] of latest) {
    if (
      personId === subjectId ||
      state.turn === "closed" ||
      reached(personId) ||
      !isPerson(world, personId) ||
      ageAt(world, personId, source.occurredAt) === null
    )
      continue;
    const base = state.importance * weightOf(weight);
    if (!(base > 0)) continue;
    out.push({
      ...source,
      personId,
      kindKey: key,
      firstKey: key,
      counterpartPersonIds: [subjectId],
      base,
      weight,
      acts: [],
      closenessToward: null,
      stakes: 1,
      sameAs: null,
    });
  }
  return out;
}

function eventCandidates(world: World, event: HistoricalEvent): Candidate[] {
  const kinds = EVENT_KINDS_BY_TYPE.get(event.type);
  if (!kinds) return [];
  const out: Candidate[] = [];
  for (const kind of kinds) {
    if (
      kind.match.tags &&
      !kind.match.tags.every((tag) => event.tags.includes(tag))
    )
      continue;
    const shared = {
      occurredAt: event.occurredAt,
      kindKey: kind.key,
      firstKey: kind.key,
      sourceStore: "events",
      sourceRecordId: event.id,
      sourceSequence: event.sequence,
      closenessToward: null,
      stakes: 1,
      eventId: event.id,
      sameAs: null,
    } as const;
    if (kind.scores === "told") {
      const deceased = event.participants.find(
        (participant) => participant.role === "focus:subject",
      )?.personId;
      const told = event.participants
        .filter((participant) => participant.role === "focus:told")
        .map((participant) => participant.personId);
      for (const toldId of told) {
        if (!isPerson(world, toldId) || toldId === deceased || !deceased)
          continue;
        const age = ageAt(world, toldId, event.occurredAt);
        if (age === null) continue;
        const relation = relationOf(world, toldId, deceased);
        const rows = kind.byRelation?.[relation] ?? kind.byRelation?.other;
        const weight = rows ? rowForAge(age, rows) : null;
        if (!weight) continue;
        out.push({
          ...shared,
          personId: toldId,
          counterpartPersonIds: [deceased],
          base: weightOf(weight),
          weight,
          acts: kind.acts,
        });
      }
      continue;
    }
    const people = eventPeople(world, event, kind.match.roles);
    const others = (id: EntityId) =>
      event.participants
        .map((participant) => participant.personId)
        .filter(
          (other): other is EntityId => isPerson(world, other) && other !== id,
        );
    const stakes =
      kind.stakes === "freedom" ? freedomStakes(sentenceMonths(event)) : 1;
    for (const personId of people) {
      const age = ageAt(world, personId, event.occurredAt);
      if (age === null) continue;
      const counterparts = [...new Set(others(personId))].sort();
      let weight: WeightRow | null;
      let closenessToward: EntityId | null = null;
      if (kind.kin) {
        const asker = counterparts[0] ?? null;
        const family =
          asker !== null && relationOf(world, personId, asker) !== "other";
        weight = family ? kind.kin : rowForAge(age, kind);
        if (!family && kind.closeness === "standing") closenessToward = asker;
      } else weight = rowForAge(age, kind);
      if (weight)
        out.push({
          ...shared,
          personId,
          counterpartPersonIds: counterparts,
          base: weightOf(weight),
          weight,
          acts: kind.acts,
          closenessToward,
          stakes,
        });
      out.push(
        ...relationCandidates(
          world,
          shared,
          personId,
          kind.relations,
          (sentenceMonths(event) ?? 0) >= 12,
        ),
      );
    }
    if (THREAD_ROLE_KINDS.has(kind.key)) {
      const reached = new Set(out.map((candidate) => candidate.personId));
      const weight = kind.adult ?? kind.youth;
      for (const personId of weight ? people : [])
        out.push(
          ...threadRoleCandidates(
            world,
            personId,
            kind.key,
            weight!,
            {
              occurredAt: event.occurredAt,
              sourceStore: "events",
              sourceRecordId: event.id,
              sourceSequence: event.sequence,
              eventId: event.id,
            },
            (id) => reached.has(id),
          ),
        );
    }
    if (kind.subjectRelations) {
      const subject = event.participants.find(
        (participant) => participant.role === "focus:subject",
      )?.personId;
      if (isPerson(world, subject))
        out.push(
          ...relationCandidates(
            world,
            shared,
            subject,
            kind.subjectRelations,
            false,
          ).map((candidate) => ({ ...candidate, acts: kind.acts })),
        );
    }
  }
  return out;
}

function relationshipCandidates(
  world: World,
  interaction: RelationshipInteraction,
): Candidate[] {
  const significance =
    CALIBRATION.relationshipSignificance[interaction.significance] ?? 0;
  const change = CALIBRATION.relationshipChange[interaction.change] ?? 0;
  const base = ((significance * change) / 9) * CALIBRATION.relationshipCap;
  // A contact that scores nothing still matters to someone it puts back in
  // touch after years apart: their moment carries the thread's weight from
  // before it faded (part 5, rule 1), and nothing for anyone else.
  if (
    base <= 0 &&
    interaction.personIds.every(
      (id) => !resurfacing(world, id, interaction.personIds),
    )
  )
    return [];
  const negative =
    interaction.change === "strained" || interaction.change === "ended";
  const kindKey = `${RELATIONSHIP_MOMENT_KIND}:${interaction.kind}:${interaction.change}`;
  const firstKey = `${RELATIONSHIP_MOMENT_KIND}:${interaction.kind}`;
  const weight: WeightRow = {
    source: "relationship-standing",
    row: `${interaction.significance} ${interaction.change}`,
    value: Math.round(base * 1000) / 10,
  };
  return interaction.personIds.flatMap((personId) => {
    if (!isPerson(world, personId)) return [];
    if (ageAt(world, personId, interaction.occurredAt) === null) return [];
    if (base <= 0 && !resurfacing(world, personId, interaction.personIds))
      return [];
    const other = interaction.personIds.find((id) => id !== personId);
    return [
      {
        personId,
        occurredAt: interaction.occurredAt,
        kindKey,
        firstKey: negative ? `${firstKey}:strained` : firstKey,
        counterpartPersonIds: other ? [other] : [],
        sourceStore: "relationshipInteractions",
        sourceRecordId: interaction.id,
        sourceSequence: interaction.sequence,
        base,
        weight,
        acts: negative ? ["confront"] : ["engage", "cooperate"],
        closenessToward: null,
        stakes: 1,
        eventId: interaction.eventId,
        sameAs: null,
      },
    ];
  });
}

/**
 * How much a thread that has gone quiet weighed before it faded: its tie and
 * every moment it holds, undiscounted. Zero for a thread still in touch, a
 * closed one, or none (part 5, rule 1: contact after dormancy).
 */
function preFadeImportance(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): number {
  const previous = latestThreadState(world, personId, otherId);
  if (
    !previous ||
    previous.turn === "closed" ||
    (previous.currency !== "dormant" && previous.turn !== "faded")
  )
    return 0;
  return previous.tie + previous.momentSum;
}

/** Whether a record puts this person back in touch with someone after years apart. */
function resurfacing(
  world: World,
  personId: EntityId,
  personIds: readonly EntityId[],
): boolean {
  return personIds.some(
    (otherId) =>
      otherId !== personId && preFadeImportance(world, personId, otherId) > 0,
  );
}

interface StateRecord extends SequencedRecord {
  readonly personId?: EntityId;
  readonly startedAt?: IsoDate;
  readonly effectiveAt?: IsoDate;
  readonly status?: string;
  readonly reason?: string | null;
  readonly enrollmentId?: EntityId;
  readonly workRelationshipId?: EntityId;
  readonly provenance?: { readonly kind: string };
}

/** The person a state record is about, following its parent record where it has one. */
function statePerson(
  world: World,
  store: string,
  record: StateRecord,
): EntityId | null {
  if (record.personId) return record.personId;
  if (store === "educationEnrollmentStates" && record.enrollmentId)
    return (
      recordById(world.history.educationEnrollments, record.enrollmentId)
        ?.personId ?? null
    );
  if (store === "workStatuses" && record.workRelationshipId)
    return (
      recordById(world.history.workRelationships, record.workRelationshipId)
        ?.personId ?? null
    );
  return null;
}

function stateCandidates(
  world: World,
  store: string,
  record: StateRecord,
): Candidate[] {
  const kinds = KINDS_BY_STORE.get(store);
  if (!kinds) return [];
  const date = record.startedAt ?? record.effectiveAt;
  if (!date) return [];
  // The world's start date is the cutoff: a state that begins on it, built
  // with the world, is the life as play finds it rather than a change.
  if (date === world.startedAt && record.provenance?.kind !== "simulated-event")
    return [];
  const personId = statePerson(world, store, record);
  if (!isPerson(world, personId)) return [];
  const age = ageAt(world, personId, date);
  if (age === null) return [];
  const out: Candidate[] = [];
  for (const kind of kinds) {
    if (
      kind.match.statuses &&
      !kind.match.statuses.includes(record.status ?? "")
    )
      continue;
    if (kind.match.reasons && !kind.match.reasons.includes(record.reason ?? ""))
      continue;
    const weight = rowForAge(age, kind);
    const shared = {
      occurredAt: date,
      kindKey: kind.key,
      firstKey: kind.key,
      sourceStore: store,
      sourceRecordId: record.id,
      sourceSequence: record.sequence,
      closenessToward: null,
      stakes:
        kind.stakes === "money"
          ? moneyStakes(world, personId, record, date)
          : 1,
      eventId: null,
      sameAs: kind.match.sameAs ?? null,
    } as const;
    if (weight)
      out.push({
        ...shared,
        personId,
        counterpartPersonIds: [],
        base: weightOf(weight),
        weight,
        acts: kind.acts,
      });
    out.push(
      ...relationCandidates(world, shared, personId, kind.relations, false),
    );
  }
  return out;
}

const STATE_STORES = [
  "educationEnrollments",
  "educationEnrollmentStates",
  "workRelationships",
  "workStatuses",
  "organizationParticipations",
] as const;

/** The first index whose record's sequence is at least `from`. Stores are in sequence order. */
function firstAtOrAfter(
  records: readonly SequencedRecord[],
  from: number,
): number {
  let low = 0;
  let high = records.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (records[middle]!.sequence < from) low = middle + 1;
    else high = middle;
  }
  return low;
}

function newRecords<T extends SequencedRecord>(
  records: readonly T[] | undefined,
  from: number,
): readonly T[] {
  if (!records || records.length === 0) return [];
  return records.slice(firstAtOrAfter(records, from));
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                     */
/* -------------------------------------------------------------------------- */

function closenessFactor(
  world: World,
  personId: EntityId,
  otherId: EntityId | null,
): number {
  if (otherId === null || !isPerson(world, otherId)) return 1;
  const [low, high] = CALIBRATION.closenessRange;
  const standing = readRelationshipStanding(world, personId, otherId);
  const bandValue = { none: 0, slight: 1, marked: 2, strong: 3 } as const;
  const strongest = Math.max(
    bandValue[standing.readings.warmth.band],
    bandValue[standing.readings.commitment.band],
  );
  return low + ((high - low) * strongest) / 3;
}

interface TraitPull {
  readonly trait: RegisteredTrait;
  readonly top: number;
  readonly poles: ReturnType<
    typeof traitActTables
  >["pulls"] extends ReadonlyMap<string, infer Poles>
    ? Poles
    : never;
}

let pullsByTendency: ReadonlyMap<string, TraitPull> | null = null;

/** The trait act table keyed by the tendency each trait is recorded as, built once. */
function traitPullsByTendency(): ReadonlyMap<string, TraitPull> {
  if (pullsByTendency) return pullsByTendency;
  const registry = loadedTraitRegistry();
  const map = new Map<string, TraitPull>();
  for (const [traitId, poles] of traitActTables().pulls) {
    const trait = registry.traits.get(traitId);
    if (!trait) continue;
    const top = Math.max(...trait.scale.steps.map((step) => step.magnitude));
    map.set(traitDefinitionFromPack(trait).id, { trait, top, poles });
  }
  return (pullsByTendency = map);
}

function traitFactor(
  world: World,
  personId: EntityId,
  acts: readonly string[],
): number {
  if (acts.length === 0) return 1;
  const records = latestPersonalityTendenciesForPerson(world, personId);
  if (records.length === 0) return 1;
  const pulls = traitPullsByTendency();
  let factor = 1;
  // Only the traits this person has on record can tilt a moment.
  for (const record of records) {
    const pull = pulls.get(record.tendencyId);
    if (!pull || !world.mindCatalog.tendencies[record.tendencyId]) continue;
    const reading = traitReadingOfRecord(pull.trait, record);
    if (reading.state === "unrecorded" || reading.value === 0) continue;
    const pole = pull.poles[reading.value > 0 ? "high" : "low"];
    if (!pole) continue;
    const share =
      pull.top > 0 ? Math.min(1, Math.abs(reading.value) / pull.top) : 0;
    const tilt = CALIBRATION.traitTiltAtFullStrength * share;
    if (acts.some((act) => pole.toward.has(act))) factor *= 1 + tilt;
    if (acts.some((act) => pole.away.has(act))) factor *= 1 - tilt;
  }
  return factor;
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Whose moments are scored (owner's speed ruling, October 8, 2026): full
 * detail in the focus circle of the person being played, coarser everywhere
 * else. The circle is the player, their relatives and household, everyone
 * they have recorded contact with, and the people of their home town. A
 * watched world, with nobody being played, scores everyone.
 */
export function storyFocus(world: World): (personId: EntityId) => boolean {
  if (world.control.kind !== "person") return () => true;
  const playerId = world.control.personId;
  const player = world.people[playerId];
  if (!player) return () => true;
  const circle = new Set<EntityId>([playerId]);
  for (const record of safeKinship(world, playerId))
    for (const id of record.personIds) circle.add(id);
  try {
    for (const membership of householdMembershipsAt(world, playerId))
      for (const id of peopleInHouseholdAt(
        world,
        membership.membership.householdId,
      ))
        circle.add(id);
  } catch {
    // No household on record: the circle is the rest of it.
  }
  for (const interaction of relationshipHistory(world, playerId))
    for (const id of interaction.personIds) circle.add(id);
  const home = player.homeJurisdictionId;
  return (personId) =>
    circle.has(personId) || world.people[personId]?.homeJurisdictionId === home;
}

/* -------------------------------------------------------------------------- */
/* The intake                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Reads every record written since the last reading position, writes the
 * moments that score above zero, and moves the reading position past them.
 * Returns the World unchanged when nothing new was written.
 */
export function recordStoryMoments(world: World): World {
  const from = storyIntakeCursor(world);
  if (world.history.nextSequence <= from) return world;

  const candidates: Candidate[] = [];
  for (const event of newRecords(world.history.events, from))
    candidates.push(...eventCandidates(world, event));
  const contacts = newRecords(world.history.relationshipInteractions, from);
  for (const interaction of contacts)
    candidates.push(...relationshipCandidates(world, interaction));
  const history = world.history as unknown as Record<
    string,
    readonly StateRecord[] | undefined
  >;
  for (const store of STATE_STORES)
    for (const record of newRecords(history[store], from))
      candidates.push(...stateCandidates(world, store, record));
  // A death reaches everyone with a thread to the one who died; relatives
  // hear it through the death notice, which scores for them already.
  for (const death of newRecords(world.history.personDeaths, from))
    candidates.push(
      ...threadRoleCandidates(
        world,
        death.personId,
        "died",
        TABLE.threadRoleChanges.death,
        {
          occurredAt: death.diedAt,
          sourceStore: "personDeaths",
          sourceRecordId: death.id,
          sourceSequence: death.sequence,
          eventId: death.eventId,
        },
        (id) => relationOf(world, id, death.personId) !== "other",
      ),
    );

  const inFocus = storyFocus(world);
  // One change, one moment: an event that scored for a person carries the
  // change, so its relationship record and a same-year state record of the
  // same kind do not score it again.
  const existing = new Map<EntityId, StoryMomentRecord[]>();
  const momentsFor = (personId: EntityId) => {
    let list = existing.get(personId);
    if (!list)
      existing.set(personId, (list = [...storyMomentsOf(world, personId)]));
    return list;
  };
  const scoredEvents = new Set<string>();
  for (const candidate of candidates)
    if (candidate.sourceStore === "events")
      scoredEvents.add(`${candidate.personId}|${candidate.sourceRecordId}`);

  const ordered = [...candidates].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.sourceSequence - right.sourceSequence ||
      left.personId.localeCompare(right.personId) ||
      left.kindKey.localeCompare(right.kindKey),
  );

  let sequence = world.history.nextSequence;
  const written: StoryMomentRecord[] = [];
  const writtenKeys = new Set<string>();
  const resurfacedPairs = new Set<string>();
  for (const candidate of ordered) {
    let resurfacedPair: string | null = null;
    if (!inFocus(candidate.personId)) continue;
    const prior = momentsFor(candidate.personId);
    if (
      candidate.sourceStore === "relationshipInteractions" &&
      candidate.eventId !== null &&
      (scoredEvents.has(`${candidate.personId}|${candidate.eventId}`) ||
        prior.some((moment) => moment.sourceRecordId === candidate.eventId))
    )
      continue;
    if (
      candidate.sameAs !== null &&
      prior.some(
        (moment) =>
          moment.kindKey === candidate.sameAs &&
          moment.occurredAt.slice(0, 4) === candidate.occurredAt.slice(0, 4),
      )
    )
      continue;
    const stableKey = `${candidate.kindKey}:${candidate.personId}:${candidate.sourceRecordId}`;
    if (writtenKeys.has(stableKey)) continue;
    const first = prior.some(
      (moment) =>
        momentFirstKey(moment) === candidate.firstKey &&
        moment.occurredAt <= candidate.occurredAt,
    )
      ? 1
      : CALIBRATION.firstOfKind;
    const closeness = closenessFactor(
      world,
      candidate.personId,
      candidate.closenessToward,
    );
    const traits = traitFactor(world, candidate.personId, candidate.acts);
    // Contact after dormancy: a moment that puts the person back in touch
    // with someone adds the thread's weight from before it faded, once per
    // pair in a reading (part 5, rule 1).
    let resurfaced = 0;
    for (const otherId of candidate.counterpartPersonIds) {
      const pairKey = `${candidate.personId}|${otherId}`;
      if (resurfacedPairs.has(pairKey)) continue;
      const weight = preFadeImportance(world, candidate.personId, otherId);
      if (weight <= resurfaced) continue;
      resurfaced = weight;
      resurfacedPair = pairKey;
    }
    const salience = Math.min(
      1,
      candidate.base * closeness * first * traits * candidate.stakes +
        resurfaced,
    );
    if (!(salience > 0)) continue;
    if (resurfacedPair) resurfacedPairs.add(resurfacedPair);
    const moment: StoryMomentRecord = {
      id: createStableId("story-moment", `${world.id}:${stableKey}`),
      stableKey,
      sequence,
      personId: candidate.personId,
      occurredAt: candidate.occurredAt,
      kindKey: candidate.kindKey,
      counterpartPersonIds: candidate.counterpartPersonIds,
      sourceStore: candidate.sourceStore,
      sourceRecordId: candidate.sourceRecordId,
      salience: round(salience),
      factors: {
        kind: round(candidate.base),
        closeness: round(closeness),
        first,
        traits: round(traits),
        stakes: round(candidate.stakes),
        ...(resurfaced > 0 ? { resurfaced: round(resurfaced) } : {}),
      },
      weight: candidate.weight,
    };
    sequence += 1;
    written.push(moment);
    writtenKeys.add(stableKey);
    prior.push(moment);
  }

  // The pairs these moments touch: one thread change each (threads.ts).
  const scored = recordStoryThreads(
    written.length
      ? {
          ...world,
          history: {
            ...world.history,
            nextSequence: sequence,
            storyMoments: appendedList(storyMoments(world), written),
          },
        }
      : world,
    written,
    contacts,
  );
  const markSequence = scored.history.nextSequence;
  const mark: StoryIntakeMark = {
    id: createStableId("story-intake", `${world.id}:intake:${markSequence}`),
    stableKey: `story-intake:${markSequence}`,
    sequence: markSequence,
    recordedAt: world.currentDate,
    fromSequence: from,
    throughSequence: markSequence + 1,
  };
  return {
    ...scored,
    history: {
      ...scored.history,
      nextSequence: markSequence + 1,
      storyIntakeMarks: appendedList(storyIntakeMarks(scored), [mark]),
    },
  };
}

/** The first-of-kind key a written moment counted against. */
function momentFirstKey(moment: StoryMomentRecord): string {
  if (!moment.kindKey.startsWith(`${RELATIONSHIP_MOMENT_KIND}:`))
    return moment.kindKey;
  const parts = moment.kindKey.split(":");
  const change = parts.at(-1);
  const kind = parts.slice(1, -1).join(":");
  const base = `${RELATIONSHIP_MOMENT_KIND}:${kind}`;
  return change === "strained" || change === "ended"
    ? `${base}:strained`
    : base;
}

/* -------------------------------------------------------------------------- */
/* Integrity                                                                   */
/* -------------------------------------------------------------------------- */

/** World integrity: whole moments, scored within range, citing earlier records. */
export function assertStoryMomentIntegrity(world: World): void {
  const keys = new Set<string>();
  let lastSequence = -1;
  for (const moment of storyMoments(world)) {
    if (
      keys.has(moment.stableKey) ||
      moment.sequence <= lastSequence ||
      !world.people[moment.personId] ||
      !(moment.salience > 0 && moment.salience <= 1) ||
      moment.id !==
        createStableId("story-moment", `${world.id}:${moment.stableKey}`)
    )
      throw new Error(`Invalid story moment: ${moment.stableKey}`);
    keys.add(moment.stableKey);
    lastSequence = moment.sequence;
  }
  let through = 0;
  for (const mark of storyIntakeMarks(world)) {
    if (
      mark.fromSequence !== through ||
      mark.throughSequence !== mark.sequence + 1 ||
      mark.throughSequence > world.history.nextSequence
    )
      throw new Error(`Invalid story intake mark: ${mark.stableKey}`);
    through = mark.throughSequence;
  }
}
