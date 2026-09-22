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
import { latestPersonalityTendency } from "./queries";
import { SeededRng } from "./rng";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
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
 * A person's values are drawn once from their own seeded stream, so the same
 * world always gives the same person the same temperament, and are written as
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

/** Authored first-playable spread: most people are unremarkable on a trait. */
const SEED_SPREAD: readonly TraitValue[] = [-2, -1, -1, 0, 0, 0, 0, 1, 1, 2];

/** The value this person was born with, from their own stream. Pure. */
export function seededTraitValue(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
): TraitValue {
  const rng = new SeededRng(world.seed).fork(
    `${PEOPLE_MIND_VERSION}:seed:${personId}:${trait}`,
  );
  return SEED_SPREAD[rng.integer(0, SEED_SPREAD.length)]!;
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
 */
export function observedTraitLabels(
  world: World,
  personId: EntityId,
): readonly string[] {
  return personTraits(world, personId).flatMap((trait) =>
    trait.recordId === null || trait.label === null ? [] : [trait.label],
  );
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
): World {
  let next = world;
  for (const personId of personIds) {
    if (!next.people[personId]) continue;
    if (next.control.kind === "person" && next.control.personId === personId) {
      continue;
    }
    for (const trait of PEOPLE_TRAITS) {
      if (personTrait(next, personId, trait).recordId !== null) continue;
      next = ensurePeopleTraitCatalog(next);
      const value = seededTraitValue(next, personId, trait);
      next = recordPersonalityTendency(next, {
        stableKey: `${PEOPLE_MIND_VERSION}:${personId}:${trait}:seed`,
        personId,
        tendencyId: peopleTraitId(trait),
        recordedAt: laterOf(next.people[personId]!.birthDate, next.currentDate),
        ...encode(trait, value),
        confidence: "medium",
        scopeTags: [`${PEOPLE_MIND_VERSION}.seed`],
        provenance: createMindProvenance("authored", {
          note: `Seeded once from this person's own ${PEOPLE_MIND_VERSION} stream.`,
        }),
        supersedesTendencyId: null,
      });
    }
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
