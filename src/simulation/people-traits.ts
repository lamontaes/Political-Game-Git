import {
  BALANCED_TRAIT,
  PEOPLE_MIND_VERSION,
  PEOPLE_TRAITS,
  TRAIT_SHAPES,
  peopleTraitDefinitions,
  peopleTraitId,
  type PeopleTrait,
  type TraitValue,
} from "./people-trait-definitions";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { ageOnDate } from "./dates";
import { PERSONALITY_PACK } from "./personality-catalogue";
import {
  upbringingCoreValue,
  upbringingFor,
  upbringingTraitTendencies,
  type PersonUpbringing,
} from "./people-upbringing";
import {
  latestPersonalityTendenciesForPerson,
  latestPersonalityTendency,
} from "./queries";
import {
  isOneSided,
  strengthForMagnitude,
  traitDefinitionFromPack,
  type RegisteredTrait,
} from "./trait-packs";
import type { TraitLifePart } from "./personality-trait-registry";
import { readTrait } from "./trait-readings";
import { traitRegistryFor } from "./trait-registry";
import { writeWithWorldIntegrityOnce } from "./world";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  IsoDate,
  MindSourceReference,
  PersonalityTendencyRecord,
  World,
} from "./types";

/**
 * Persistent personality for PEOPLE (CRUNCH46 P2).
 *
 * Five fictional behavior tendencies, each held as an internal ordinal
 * −2…+2. They are game-authored parameters for how a character tends to act —
 * not psychological measurements, not inferred from anybody's name, place or
 * demographics, and never shown to the player as numbers.
 *
 * A person's values come from their upbringing alone, the middle when it
 * leans no way, so the same upbringing always gives the same temperament,
 * and are written as
 * ordinary `PersonalityTendencyRecord`s the first time a decision needs them.
 * Writing lazily keeps existing worlds byte-identical at creation. A later
 * change is a new record that supersedes the old one and cites the event that
 * justified it.
 *
 * A trait only biases a choice among options that are already eligible. It
 * never forces consent and is never applied to what the controlled player
 * says.
 */

export {
  PEOPLE_MIND_VERSION,
  PEOPLE_TRAITS,
  peopleTraitDefinitions,
  peopleTraitId,
} from "./people-trait-definitions";
export type { PeopleTrait, TraitValue } from "./people-trait-definitions";
/**
 * Adds the trait definitions to a world that does not carry them yet. Worlds
 * made before this version gain exactly these definitions and nothing else.
 */
export function ensurePeopleTraitCatalog(world: World): World {
  const missing = peopleTraitDefinitions().filter(
    (definition) => !world.mindCatalog.tendencies[definition.id],
  );
  if (missing.length === 0) return world;
  return {
    ...world,
    mindCatalog: {
      ...world.mindCatalog,
      tendencies: {
        ...world.mindCatalog.tendencies,
        ...Object.fromEntries(missing.map((d) => [d.id, d])),
      },
      tendencyOrder: [
        ...world.mindCatalog.tendencyOrder,
        ...missing.map((d) => d.id),
      ],
    },
  };
}

/** This person's core value, from their upbringing alone. Pure. */
export function seededTraitValue(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
): TraitValue {
  return upbringingCoreValue(world, personId, trait);
}

function encode(trait: PeopleTrait, value: TraitValue) {
  const shape = TRAIT_SHAPES[trait];
  if (value === 0) {
    return { expressionKey: BALANCED_TRAIT.key, strength: "subtle" as const };
  }
  return {
    expressionKey: value < 0 ? shape.low.key : shape.high.key,
    strength:
      Math.abs(value) === 2 ? ("strong" as const) : ("moderate" as const),
  };
}

function decode(
  trait: PeopleTrait,
  record: PersonalityTendencyRecord,
): TraitValue {
  const shape = TRAIT_SHAPES[trait];
  if (record.expressionKey === BALANCED_TRAIT.key) return 0;
  const magnitude =
    record.strength === "strong" || record.strength === "defining" ? 2 : 1;
  return (
    record.expressionKey === shape.low.key ? -magnitude : magnitude
  ) as TraitValue;
}

export interface PersonTrait {
  readonly trait: PeopleTrait;
  readonly value: TraitValue;
  /** The record that holds it, or null before it was ever needed. */
  readonly recordId: EntityId | null;
  /** The pole's player-facing word, or null when balanced. */
  readonly label: string | null;
}

/** A person's current value on one trait. Pure. */
export function personTrait(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
): PersonTrait {
  const tendencyId = peopleTraitId(trait);
  const record = world.mindCatalog.tendencies[tendencyId]
    ? latestPersonalityTendency(world, personId, tendencyId)
    : undefined;
  const value = record
    ? decode(trait, record)
    : seededTraitValue(world, personId, trait);
  const shape = TRAIT_SHAPES[trait];
  return {
    trait,
    value,
    recordId: record?.id ?? null,
    label: value === 0 ? null : value < 0 ? shape.low.label : shape.high.label,
  };
}

export function personTraits(
  world: World,
  personId: EntityId,
): readonly PersonTrait[] {
  return PEOPLE_TRAITS.map((trait) => personTrait(world, personId, trait));
}

/**
 * The pole words for the traits this person has actually been observed to
 * have, for a reader that shows a temperament.
 *
 * A trait with no record has never been observed. `personTrait` still reports
 * what the seed would make it, because a writer about to establish the trait
 * needs that number — but a reader must not treat it as a fact about the
 * person, and one did: the person card rendered a word for every unbalanced
 * seed value, so a character nobody had ever decided anything with was shown
 * as "Reserved" or "Confrontational" on the strength of a number the game had
 * not written down. Absence is not a middling reading and it is not a lean.
 *
 * Every trait this life has loaded, not a fixed five: the build's own packs
 * first, in their order, then whatever the life's content packs install. A
 * mod's trait reaches the card the same way a built-in one does, by being
 * written down.
 */
export function observedTraitLabels(
  world: World,
  personId: EntityId,
): readonly string[] {
  return observedTraitReadings(world, personId).map((reading) => reading.label);
}

/**
 * The same observed traits with how strongly each was recorded, strongest
 * first; ties keep the registry's order. A card that names only a few names
 * the ones that stand out.
 */
export function strongestObservedTraitLabels(
  world: World,
  personId: EntityId,
  limit: number,
): readonly string[] {
  return observedTraitReadings(world, personId)
    .map((reading, index) => ({ ...reading, index }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.index - b.index)
    .slice(0, limit)
    .map((reading) => reading.label);
}

function observedTraitReadings(
  world: World,
  personId: EntityId,
): readonly { readonly label: string; readonly value: number }[] {
  // One pass over the person's records first: most of the catalog is
  // unrecorded for anybody, and reading each trait separately would scan the
  // whole history once per trait on every render of a card.
  const recorded = new Set(
    latestPersonalityTendenciesForPerson(world, personId).map(
      (record) => record.tendencyId,
    ),
  );
  return [...traitRegistryFor(world).traits.values()].flatMap((trait) => {
    if (!recorded.has(traitDefinitionFromPack(trait).id)) return [];
    const reading = readTrait(world, personId, trait);
    return reading.state === "recorded" && reading.label !== null
      ? [{ label: reading.label, value: reading.value }]
      : [];
  });
}

/**
 * Every seeded trait this life has loaded beyond the build's own five: the
 * build's other packs and whatever its content packs install. The five are not
 * here: they keep their own writer below, so a life is written exactly as
 * before for them. A catalog added as a pack is seeded
 * here without a line of code naming it.
 */
function registeredSeededTraits(world: World): readonly RegisteredTrait[] {
  return [...traitRegistryFor(world).traits.values()].filter(
    (trait) =>
      trait.pack !== PEOPLE_MIND_VERSION &&
      trait.conferredBy === "seeded" &&
      trait.seed !== null,
  );
}

/** Adds a registered trait's definition to a world that does not carry it. */
export function ensureTraitDefinition(
  world: World,
  trait: RegisteredTrait,
): World {
  const definition = traitDefinitionFromPack(trait);
  if (world.mindCatalog.tendencies[definition.id]) return world;
  return {
    ...world,
    mindCatalog: {
      ...world.mindCatalog,
      tendencies: {
        ...world.mindCatalog.tendencies,
        [definition.id]: definition,
      },
      tendencyOrder: [...world.mindCatalog.tendencyOrder, definition.id],
    },
  };
}

/**
 * A signed value on a registered trait's own scale, as the record stores it.
 * Refuses a magnitude the scale does not declare rather than rounding it to
 * one it does: a value nobody declared is not a value.
 */
export function encodeRegisteredTrait(trait: RegisteredTrait, value: number) {
  if (value === 0) {
    return {
      expressionKey: trait.scale.balancedKey,
      strength: "subtle" as const,
    };
  }
  if (value < 0 && isOneSided(trait)) {
    throw new Error(
      `The trait "${trait.qualifiedKey}" is one-sided and has no opposite to lean toward.`,
    );
  }
  const strength = strengthForMagnitude(trait.scale, Math.abs(value));
  if (strength === null) {
    throw new Error(
      `The trait "${trait.qualifiedKey}" declares no step of magnitude ${Math.abs(value)}.`,
    );
  }
  return {
    expressionKey: value < 0 ? trait.poles.low.key : trait.poles.high.key,
    strength,
  };
}

/**
 * A registered trait's first value, from the person's upbringing alone.
 *
 * The upbringing's net lean on this trait's qualified key, and on every
 * catalog trait its seed `follows`, sets the side, and its weight picks the largest magnitude the pack's spread declares on that
 * side without passing it (the smallest declared step when the weight is
 * below every step). No lean, a lean the spread has no step for, or a low
 * lean on a one-sided trait leaves the middle. Nothing is drawn: two worlds
 * with the same upbringing give the same value.
 */
export function registeredTraitLean(
  trait: RegisteredTrait,
  qualities: readonly UpbringingQuality[],
): { readonly value: number; readonly because: readonly string[] } {
  const middle = { value: 0, because: [] as readonly string[] };
  const keys = new Set([trait.qualifiedKey, ...(trait.seed?.follows ?? [])]);
  const named = qualities.filter((row) => keys.has(row.trait));
  const net = named.reduce((sum, row) => sum + row.value * row.weight, 0);
  if (net === 0) return middle;
  const because = [...new Set(named.flatMap((row) => row.because))];
  const quality = { value: Math.sign(net), weight: Math.abs(net) };
  if (quality.value < 0 && isOneSided(trait)) return middle;
  const steps = [
    ...new Set(
      (trait.seed?.spread ?? [])
        .filter((value) => Math.sign(value) === quality.value)
        .map((value) => Math.abs(value)),
    ),
  ]
    .filter((magnitude) => strengthForMagnitude(trait.scale, magnitude))
    .sort((a, b) => a - b);
  if (steps.length === 0) return middle;
  const magnitude =
    [...steps].reverse().find((step) => step <= quality.weight) ?? steps[0]!;
  return { value: quality.value * magnitude, because };
}

function seedRegisteredTrait(
  world: World,
  personId: EntityId,
  trait: RegisteredTrait,
  onDate: IsoDate = world.currentDate,
): World {
  const definition = traitDefinitionFromPack(trait);
  const next = ensureTraitDefinition(world, trait);
  // Anything already on record, even a record this pack's scale no longer
  // reads, is theirs: a seed written over it would claim a first value for
  // somebody who already has a history on this trait.
  if (latestPersonalityTendency(next, personId, definition.id)) return next;
  const lean = registeredTraitLean(
    trait,
    upbringingQualities(upbringingFor(next, personId)),
  );
  return recordPersonalityTendency(next, {
    stableKey: `${trait.qualifiedKey}:${personId}:seed`,
    personId,
    tendencyId: definition.id,
    recordedAt: laterOf(next.people[personId]!.birthDate, onDate),
    ...encodeRegisteredTrait(trait, lean.value),
    confidence: "medium",
    scopeTags: [`${PEOPLE_MIND_VERSION}.seed`],
    provenance: createMindProvenance("authored", {
      note:
        lean.because.length === 0
          ? `Nothing in this person's upbringing leans the pack ${trait.pack}'s trait either way, so it starts at the middle.`
          : `This person's upbringing leans the pack ${trait.pack}'s trait this way because of ${lean.because.join(" and ")}.`,
    }),
    supersedesTendencyId: null,
  });
}

/**
 * Writes the seeded traits of these people, once, so decisions can cite them.
 * People who already hold a record keep it. The controlled character is
 * skipped: their temperament never decides anything for them, and the mind
 * layer only accepts the player's own choices as a change to that person.
 */
export function ensurePeopleTraits(
  world: World,
  personIds: readonly EntityId[],
  /**
   * The day the seed is first on record, when that is before today: a
   * decision dated in the past (a field filed before the game opened) reads
   * the temperament the person already had then. Never before their birth.
   */
  onDate: IsoDate | ReadonlyMap<EntityId, IsoDate> = world.currentDate,
): World {
  // Each record's writer checks the whole World; seeding one person writes a
  // record per trait, so the batch is checked once, against its input.
  return writeWithWorldIntegrityOnce(world, () =>
    seedPeopleTraits(world, personIds, onDate),
  );
}

function seedPeopleTraits(
  world: World,
  personIds: readonly EntityId[],
  onDate: IsoDate | ReadonlyMap<EntityId, IsoDate>,
): World {
  let next = world;
  for (const personId of personIds) {
    if (!next.people[personId]) continue;
    if (next.control.kind === "person" && next.control.personId === personId) {
      continue;
    }
    const personDate =
      typeof onDate === "string" ? onDate : onDate.get(personId);
    if (personDate === undefined)
      throw new Error(`Missing trait seed date: ${personId}`);
    for (const trait of PEOPLE_TRAITS) {
      if (personTrait(next, personId, trait).recordId !== null) continue;
      next = ensurePeopleTraitCatalog(next);
      const value = seededTraitValue(next, personId, trait);
      next = recordPersonalityTendency(next, {
        stableKey: `${PEOPLE_MIND_VERSION}:${personId}:${trait}:seed`,
        personId,
        tendencyId: peopleTraitId(trait),
        recordedAt: laterOf(next.people[personId]!.birthDate, personDate),
        ...encode(trait, value),
        confidence: "medium",
        scopeTags: [`${PEOPLE_MIND_VERSION}.seed`],
        provenance: createMindProvenance("authored", {
          note: `Seeded once from this person's own ${PEOPLE_MIND_VERSION} stream.`,
        }),
        supersedesTendencyId: null,
      });
    }
    for (const trait of registeredSeededTraits(next)) {
      next = seedRegisteredTrait(next, personId, trait, personDate);
    }
    next = seedSalientQualities(next, personId, personDate);
  }
  return next;
}

/** One notable quality an upbringing leans a person toward. */
export interface UpbringingQuality {
  /** The qualified key of the personality-catalog trait. */
  readonly trait: string;
  /** Which end of the scale the upbringing leans toward. */
  readonly value: 1 | -1;
  /** How strongly, as the summed weight of every row that names it. */
  readonly weight: number;
  readonly because: readonly string[];
  readonly lifePart: TraitLifePart | null;
}

/**
 * How many notable qualities an upbringing is allowed to write: one for a
 * small child, two for an older child, three for an adult. The catalog stays
 * sparse; every other scale reads as unknown, not as "not like that".
 */
export function notableQualityRoom(age: number): number {
  return age < 6 ? 1 : age < 18 ? 2 : 3;
}

/**
 * The notable qualities an upbringing leans toward, strongest first. Pure:
 * the same upbringing gives the same list in every world. Rows that name the
 * same trait add up, and rows that pull it both ways cancel, leaving that
 * trait at the middle (unrecorded). Ties go by trait key.
 */
export function upbringingQualities(
  upbringing: PersonUpbringing,
): readonly UpbringingQuality[] {
  const byTrait = new Map<
    string,
    { net: number; because: string[]; lifePart: TraitLifePart | null }
  >();
  for (const row of upbringingTraitTendencies(upbringing)) {
    const entry = byTrait.get(row.trait) ?? {
      net: 0,
      because: [],
      lifePart: null,
    };
    entry.net += row.pole === "low" ? -row.weight : row.weight;
    if (!entry.because.includes(row.because)) entry.because.push(row.because);
    entry.lifePart ??= row.lifePart;
    byTrait.set(row.trait, entry);
  }
  return [...byTrait.entries()]
    .filter(([, entry]) => entry.net !== 0)
    .map(([trait, entry]): UpbringingQuality => ({
      trait,
      value: entry.net > 0 ? 1 : -1,
      weight: Math.abs(entry.net),
      because: entry.because,
      lifePart: entry.lifePart,
    }))
    .sort((a, b) =>
      b.weight !== a.weight ? b.weight - a.weight : a.trait < b.trait ? -1 : 1,
    );
}

/**
 * Writes age-appropriate notable qualities from the person's upbringing.
 *
 * Nothing is drawn: the upbringing's strongest leans fill the room the
 * person's age allows (see `notableQualityRoom`), and an upbringing with no
 * lean writes nothing, which leaves every scale at the middle. Nothing is
 * inferred from sex, race, location or party.
 *
 * Existing records are counted and never overwritten, so calling this again
 * writes nothing twice and never erases a quality a life has moved.
 */
function seedSalientQualities(
  world: World,
  personId: EntityId,
  onDate: IsoDate = world.currentDate,
): World {
  const person = world.people[personId]!;
  const age = ageOnDate(person.birthDate, onDate);
  const catalogue = [...traitRegistryFor(world).traits.values()].filter(
    (trait) => trait.pack === PERSONALITY_PACK,
  );
  if (catalogue.length === 0) return world;
  const byDefinitionId = new Map(
    catalogue.map((trait) => [traitDefinitionFromPack(trait).id, trait]),
  );
  const byQualifiedKey = new Map(
    catalogue.map((trait) => [trait.qualifiedKey, trait]),
  );
  const existing = latestPersonalityTendenciesForPerson(world, personId)
    .map((record) => byDefinitionId.get(record.tendencyId))
    .filter((trait): trait is RegisteredTrait => trait !== undefined);
  const selected = new Set(existing.map(({ qualifiedKey }) => qualifiedKey));
  const room = notableQualityRoom(age);
  let next = world;
  let slot = selected.size;
  for (const quality of upbringingQualities(upbringingFor(world, personId))) {
    if (selected.size >= room) break;
    const trait = byQualifiedKey.get(quality.trait);
    if (!trait || selected.has(quality.trait)) continue;
    if (quality.value < 0 && isOneSided(trait)) continue;
    selected.add(quality.trait);
    next = ensureTraitDefinition(next, trait);
    next = recordPersonalityTendency(next, {
      stableKey: `${trait.qualifiedKey}:${personId}:upbringing:${slot}`,
      personId,
      tendencyId: traitDefinitionFromPack(trait).id,
      recordedAt: laterOf(person.birthDate, onDate),
      ...encodeRegisteredTrait(trait, quality.value),
      confidence: "medium",
      scopeTags: [
        `${PERSONALITY_PACK}.upbringing`,
        ...(quality.lifePart === null ? [] : [`life-part:${quality.lifePart}`]),
      ],
      provenance: createMindProvenance("authored", {
        note: `This person's upbringing tended toward this quality because of ${quality.because.join(" and ")}.`,
      }),
      supersedesTendencyId: null,
    });
    slot += 1;
  }
  return next;
}

function laterOf<T extends string>(left: T, right: T): T {
  return left > right ? left : right;
}

export interface RecordTraitChangeInput {
  readonly personId: EntityId;
  readonly trait: PeopleTrait;
  readonly value: TraitValue;
  /** The event that justifies the change. Required: traits never drift. */
  readonly eventId: EntityId;
  readonly reason: string;
}

/** A change to someone's temperament, justified by something that happened. */
export function recordTraitChange(
  world: World,
  input: RecordTraitChangeInput,
): World {
  let next = ensurePeopleTraits(ensurePeopleTraitCatalog(world), [
    input.personId,
  ]);
  const current = personTrait(next, input.personId, input.trait);
  if (current.value === input.value) return next;
  if (!input.reason.trim()) throw new Error("A trait change needs a reason.");
  next = recordPersonalityTendency(next, {
    stableKey: `${PEOPLE_MIND_VERSION}:${input.personId}:${input.trait}:after:${input.eventId}:from:${current.recordId ?? "seed"}`,
    personId: input.personId,
    tendencyId: peopleTraitId(input.trait),
    recordedAt: next.currentDate,
    ...encode(input.trait, input.value),
    confidence: "medium",
    scopeTags: [`${PEOPLE_MIND_VERSION}.change`],
    provenance: createMindProvenance("reflection", {
      sourceRefs: [{ kind: "historical-event", eventId: input.eventId }],
      note: input.reason,
    }),
    supersedesTendencyId: current.recordId,
  });
  return next;
}

/** One way a trait bears on one option of a decision. */
export interface TraitLean {
  readonly optionKey: string;
  readonly trait: PeopleTrait;
  /** Which end of the trait argues for this option. */
  readonly pole: "low" | "high";
  readonly explanation: string;
}

/**
 * Decision considerations from the actor's recorded traits. Call
 * `ensurePeopleTraits` first; a trait without a record contributes nothing,
 * because a consideration must cite what it rests on. A balanced trait and a
 * lean toward the other pole contribute nothing either — traits argue for
 * options, they do not veto them.
 */
export function traitConsiderations(
  world: World,
  actorPersonId: EntityId,
  keyPrefix: string,
  leans: readonly TraitLean[],
): readonly DecisionConsideration[] {
  return leans.flatMap((lean, index) => {
    const current = personTrait(world, actorPersonId, lean.trait);
    if (current.recordId === null || current.value === 0) return [];
    const onPole =
      (lean.pole === "low" && current.value < 0) ||
      (lean.pole === "high" && current.value > 0);
    if (!onPole) return [];
    const importance: DecisionImportance =
      Math.abs(current.value) === 2 ? "moderate" : "slight";
    const ref: MindSourceReference = {
      kind: "personality-tendency",
      tendencyRecordId: current.recordId,
    };
    return [
      {
        stableKey: `${keyPrefix}:trait:${lean.trait}:${lean.optionKey}:${index}`,
        optionKey: lean.optionKey,
        sourceType: "mind:personality",
        direction: "supports",
        importance,
        confidence: "medium",
        explanation: lean.explanation,
        sourceRefs: [ref],
      },
    ];
  });
}
