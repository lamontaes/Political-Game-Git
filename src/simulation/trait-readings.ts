import { latestPersonalityTendency } from "./queries";
import {
  leansForDecision,
  magnitudeForStrength,
  traitDefinitionFromPack,
  type RegisteredTrait,
  type TraitRegistry,
} from "./trait-packs";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  MindSourceReference,
  World,
} from "./types";

/**
 * Reading a trait any pack declares, and turning what packs declare into the
 * considerations a decision already understands.
 *
 * This is the other half of the seam. `trait-packs.ts` says what a trait and
 * an effect are; this says how a person's value is read back and how a
 * decision receives it. Neither side names the other: a trait declares what it
 * argues for, a decision declares what it will accept, and they meet here.
 *
 * The contract is the one `traitConsiderations` already had and it is not
 * being replaced. A consideration is additive, it cites the record it rests
 * on, it contributes nothing where no record exists, and it argues for an
 * option rather than vetoing one. Traits do not decide; they put a reason on
 * the table.
 */

/**
 * What this world knows about one person on one trait.
 *
 * Three states, never two. "No record" is not a middling reading and it is not
 * a lean: the person card used to treat the value a person is born with as a
 * fact about them, and named a temperament for people the game had decided
 * nothing about. A reader that wants a value has to say what it does when
 * there is none.
 *
 * A consumer establishes that a trait applies to somebody before reading it,
 * not after. `unrecorded` truthfully means this world has not written this,
 * which is equally true of somebody the trait never applied to — asking the
 * store "does this apply to them?" would be guessing at a fact it does not
 * hold. See `docs/systems/traits.md`.
 */
export type TraitReading =
  | { readonly state: "unrecorded" }
  | {
      readonly state: "recorded";
      /** Signed, in the magnitudes the trait's own scale declares. */
      readonly value: number;
      readonly recordId: EntityId;
      /** The pole's player-facing word, or null when there is no lean. */
      readonly label: string | null;
    };

/** One person's current reading of one registered trait. Pure. */
export function readTrait(
  world: World,
  personId: EntityId,
  trait: RegisteredTrait,
): TraitReading {
  const tendencyId = traitDefinitionFromPack(trait).id;
  const record = world.mindCatalog.tendencies[tendencyId]
    ? latestPersonalityTendency(world, personId, tendencyId)
    : undefined;
  if (!record) return { state: "unrecorded" };
  if (record.expressionKey === trait.scale.balancedKey) {
    return { state: "recorded", value: 0, recordId: record.id, label: null };
  }
  const magnitude = magnitudeForStrength(trait.scale, record.strength);
  const pole =
    record.expressionKey === trait.poles.low.key
      ? trait.poles.low
      : record.expressionKey === trait.poles.high.key
        ? trait.poles.high
        : null;
  if (magnitude === null || pole === null) {
    // A record whose expression or strength this pack no longer declares. Not
    // a value of zero and not a guess: the pack changed under a save, and a
    // reading that split the difference would be inventing one.
    return { state: "unrecorded" };
  }
  const signed = pole === trait.poles.low ? -magnitude : magnitude;
  return {
    state: "recorded",
    value: signed,
    recordId: record.id,
    label: pole.label,
  };
}

/**
 * How strongly a reading argues. The top of a trait's own scale is its
 * strongest, so a pack with three steps is not quietly rescaled to two.
 */
function importanceOf(
  trait: RegisteredTrait,
  value: number,
): DecisionImportance {
  const top = Math.max(...trait.scale.steps.map((step) => step.magnitude));
  return Math.abs(value) >= top ? "moderate" : "slight";
}

/**
 * The considerations a decision's registered effects produce for one actor.
 *
 * The decision passes its own id and nothing else about traits. Which traits
 * bear on it, and how, is whatever the loaded packs declared — so a new trait
 * with a new argument reaches this decision without this decision changing,
 * which is the whole point of the exercise.
 */
export function registeredTraitConsiderations(
  world: World,
  registry: TraitRegistry,
  actorPersonId: EntityId,
  keyPrefix: string,
  decisionId: string,
): readonly DecisionConsideration[] {
  return leansForDecision(registry, decisionId).flatMap((lean, index) => {
    const trait = registry.traits.get(lean.trait);
    if (!trait) return [];
    const reading = readTrait(world, actorPersonId, trait);
    if (reading.state === "unrecorded" || reading.value === 0) return [];
    const onPole =
      (lean.pole === "low" && reading.value < 0) ||
      (lean.pole === "high" && reading.value > 0);
    if (!onPole) return [];
    const ref: MindSourceReference = {
      kind: "personality-tendency",
      tendencyRecordId: reading.recordId,
    };
    return [
      {
        stableKey: `${keyPrefix}:trait:${lean.trait}:${lean.option}:${index}`,
        optionKey: lean.option,
        sourceType: "mind:personality",
        direction: "supports",
        importance: importanceOf(trait, reading.value),
        confidence: "medium",
        explanation: lean.explanation,
        sourceRefs: [ref],
      } satisfies DecisionConsideration,
    ];
  });
}
