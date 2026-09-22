import { personName } from "./people";
import {
  PEOPLE_MIND_VERSION,
  peopleTraitId,
  type PeopleTrait,
  type TraitValue,
} from "./people-trait-definitions";
import {
  ensurePeopleTraits,
  personTrait,
  recordTraitChange,
} from "./people-traits";
import { loadedTraitRegistry } from "./trait-registry";
import {
  describeTraitResistance,
  traitResistance,
  weighTraitChange,
  type TraitForce,
  type TraitResistance,
} from "./trait-resistance";
import { latestPersonalityTendency } from "./queries";
import { recordWorldEvent } from "./world";
import type { EntityId, World } from "./types";

/**
 * Changing somebody, against how hard they are to change.
 *
 * `recordTraitChange` is the authoring write: it applies a value because
 * something has already decided the change happened. This is the play path,
 * and it is the one anything in the running game should use. An event argues
 * for a change with a force; the person's own history says what that force has
 * to overcome; and when it does not overcome it, **the attempt is recorded
 * rather than discarded.**
 *
 * That last part is the half that makes it a life rather than a slot machine.
 * Ten arguments become accumulating pressure instead of ten independent coin
 * flips, and the game keeps being able to say that something kept happening to
 * somebody and they did not budge.
 */

const UNMOVED_EVENT = "people-mind-v1.trait-unmoved";
const UNMOVED_TAG = "trait-change.unmoved";

function directionTag(from: TraitValue, to: TraitValue): string {
  return `trait-change.direction:${to > from ? "up" : "down"}`;
}

function traitTag(trait: PeopleTrait): string {
  return `trait-change.trait:${PEOPLE_MIND_VERSION}:${trait}`;
}

/**
 * How many attempts have already failed on this trait, in this direction,
 * since the value it is trying to move was written.
 *
 * Counted from the events themselves, so it survives a save and cannot drift
 * from what the world actually holds. The cutoff is the sequence of the
 * current record rather than its date: a move and a failed attempt can land on
 * the same day, and the pressure that a move released must not be counted
 * again against the value it produced.
 */
export function traitChangePressure(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
  toward: TraitValue,
): number {
  const current = personTrait(world, personId, trait);
  const record = latestPersonalityTendency(
    world,
    personId,
    peopleTraitId(trait),
  );
  const since = record?.sequence ?? -1;
  const wanted = directionTag(current.value, toward);
  return world.history.events.filter(
    (event) =>
      event.type === UNMOVED_EVENT &&
      event.sequence > since &&
      event.involvedEntityIds.includes(personId) &&
      event.tags.includes(traitTag(trait)) &&
      event.tags.includes(wanted),
  ).length;
}

export interface AttemptTraitChangeInput {
  readonly personId: EntityId;
  readonly trait: PeopleTrait;
  readonly value: TraitValue;
  /** The event that argues for the change. Required: traits never drift. */
  readonly eventId: EntityId;
  readonly reason: string;
  /** How strongly that event argues for it. */
  readonly force: TraitForce;
  /** A stable key for the attempt, so a failure is written once. */
  readonly stableKey: string;
}

export interface TraitChangeOutcome {
  readonly world: World;
  readonly moved: boolean;
  /** What had to be overcome, and what was brought to bear. */
  readonly resistance: TraitResistance;
  readonly effectiveForce: number;
  /** The pressure already on this person before this attempt. */
  readonly pressure: number;
  /** The resistance said out loud, for a renderer that explains the outcome. */
  readonly explanation: string;
}

/**
 * Argues for a change and applies it only if the force is enough.
 *
 * An attempt that changes nothing because the person already holds the value
 * is not a failure and records nothing: there was no force meeting anything.
 */
export function attemptTraitChange(
  world: World,
  input: AttemptTraitChangeInput,
): TraitChangeOutcome {
  if (!input.reason.trim()) {
    throw new Error("A trait change needs a reason.");
  }
  const registry = loadedTraitRegistry();
  const registered = registry.traits.get(
    `${PEOPLE_MIND_VERSION}:${input.trait}`,
  );
  if (!registered) {
    throw new Error(
      `No loaded pack declares the trait "${PEOPLE_MIND_VERSION}:${input.trait}".`,
    );
  }

  // Establishing a temperament is authoring it, not changing it, so it happens
  // before anything is weighed. A person the world had never written a value
  // for reads as unestablished, and an unestablished trait does not move.
  let next = ensurePeopleTraits(world, [input.personId]);
  const current = personTrait(next, input.personId, input.trait);
  const person = next.people[input.personId];
  const name = person ? personName(person) : "They";
  const resistance = traitResistance(
    next,
    input.personId,
    registered,
    peopleTraitId(input.trait),
  );
  const explanation = describeTraitResistance(name, resistance);

  if (current.value === input.value) {
    return {
      world: next,
      moved: false,
      resistance,
      effectiveForce: 0,
      pressure: 0,
      explanation,
    };
  }

  const pressure = traitChangePressure(
    next,
    input.personId,
    input.trait,
    input.value,
  );
  const verdict = weighTraitChange(resistance, {
    force: input.force,
    pressure,
  });

  if (verdict.moves) {
    next = recordTraitChange(next, {
      personId: input.personId,
      trait: input.trait,
      value: input.value,
      eventId: input.eventId,
      reason: input.reason,
    });
    return {
      world: next,
      moved: true,
      resistance,
      effectiveForce: verdict.effectiveForce,
      pressure,
      explanation,
    };
  }

  // The failure is a fact about this life, so it is written down.
  next = recordWorldEvent(next, {
    stableKey: `${PEOPLE_MIND_VERSION}:unmoved:${input.stableKey}`,
    type: UNMOVED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: person?.homeJurisdictionId ?? null,
    involvedEntityIds: [input.personId],
    participants: [
      {
        personId: input.personId,
        role: "focus:unmoved",
        detail: "Was not changed by this",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      UNMOVED_TAG,
      traitTag(input.trait),
      directionTag(current.value, input.value),
    ],
    summary: `${input.reason} ${name} did not change.`,
    context: {
      location: null,
      socialContext: null,
      pressure: explanation,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });

  return {
    world: next,
    moved: false,
    resistance,
    effectiveForce: verdict.effectiveForce,
    pressure,
    explanation,
  };
}
