import { latestPersonalityTendency } from "./queries";
import {
  isOneSided,
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
  if (
    magnitude === null ||
    pole === null ||
    (pole === trait.poles.low && isOneSided(trait))
  ) {
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
 * The most recent dealings between two people, as something the first of them
 * can cite. Null when they have no recorded history together.
 */
function dealingsBetween(
  world: World,
  observerPersonId: EntityId,
  subjectPersonId: EntityId,
): MindSourceReference | null {
  const interaction = [...world.history.relationshipInteractions]
    .reverse()
    .find(
      (record) =>
        record.personIds.includes(observerPersonId) &&
        record.personIds.includes(subjectPersonId),
    );
  return interaction
    ? { kind: "relationship-interaction", interactionId: interaction.id }
    : null;
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
  /**
   * The person being decided about, when there is one. Rows declared `about:
   * "subject"` read this person's traits instead of the actor's, which is how
   * somebody's temperament reaches the people who deal with them. Null means
   * this decision has no subject, and those rows are dropped rather than
   * quietly falling back to the actor.
   */
  subjectPersonId: EntityId | null = null,
): readonly DecisionConsideration[] {
  return leansForDecision(registry, decisionId).flatMap((lean, index) => {
    const trait = registry.traits.get(lean.trait);
    if (!trait) return [];
    const aboutSubject = lean.about === "subject";
    const personId = aboutSubject ? subjectPersonId : actorPersonId;
    if (personId === null) return [];
    const reading = readTrait(world, personId, trait);
    if (reading.state === "unrecorded" || reading.value === 0) return [];
    const onPole =
      (lean.pole === "low" && reading.value < 0) ||
      (lean.pole === "high" && reading.value > 0);
    if (!onPole) return [];
    // What a consideration rests on has to be something the person deciding
    // actually holds. The mind store enforces it — a record cited as a source
    // must belong to the person whose decision it is — and the rule is right:
    // somebody's reasoning cites their own mind, not a private note about
    // another person that they could not possibly have read.
    //
    // So a row about the subject cites the dealings the two have had, which is
    // how one person comes to have an impression of another. Somebody with no
    // history with this person has no grounds, and the row contributes
    // nothing rather than borrowing a reason it cannot support. That gate is
    // the feature: being read by people who know you is not the same as being
    // read by strangers.
    const ref = aboutSubject
      ? dealingsBetween(world, actorPersonId, personId)
      : ({
          kind: "personality-tendency",
          tendencyRecordId: reading.recordId,
        } satisfies MindSourceReference);
    if (ref === null) return [];
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
