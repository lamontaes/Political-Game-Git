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
import { daysBetween } from "./dates";
import { recordWorldEvent } from "./world";
import type { EntityId, IsoDate, World } from "./types";

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
 * Separate experiences accumulate instead of being independent coin flips, and
 * the game keeps being able to say that something kept happening to somebody
 * and they did not budge.
 *
 * Separate is doing the work in that sentence. The same argument repeated is
 * one argument however many times it is made; what accumulates is different
 * things, from different corners of a life, over months and years. See
 * `traitChangePressure`.
 */

const UNMOVED_EVENT = "people-mind-v1.trait-unmoved";
const UNMOVED_TAG = "trait-change.unmoved";
const CONTEXT_TAG_PREFIX = "trait-change.context:";

function directionTag(from: TraitValue, to: TraitValue): string {
  return `trait-change.direction:${to > from ? "up" : "down"}`;
}

function traitTag(trait: PeopleTrait): string {
  return `trait-change.trait:${PEOPLE_MIND_VERSION}:${trait}`;
}

function contextTag(context: string): string {
  return `${CONTEXT_TAG_PREFIX}${context}`;
}

function contextOf(tags: readonly string[]): string | null {
  const tag = tags.find((value) => value.startsWith(CONTEXT_TAG_PREFIX));
  return tag ? tag.slice(CONTEXT_TAG_PREFIX.length) : null;
}

/**
 * How much independent experience has already argued this way and failed,
 * since the value it is trying to move was written.
 *
 * Counted from the events themselves, so it survives a save and cannot drift
 * from what the world actually holds. The cutoff is the sequence of the
 * current record rather than its date: a move and a failed attempt can land on
 * the same day, and the pressure that a move released must not be counted
 * again against the value it produced.
 *
 * **What it is not is a count of attempts.** Counting attempts made the same
 * thing said ten times in an afternoon worth ten times as much as saying it
 * once, so persistence alone moved anybody given enough repetitions — a click
 * counter wearing the clothes of a life. Two requirements are read instead,
 * and the pressure is the smaller of them, so each further unit needs both at
 * once:
 *
 * - **A separate experience.** An attempt in a context that already argued
 *   this way fewer than `experienceSpacingDays` ago is the same experience
 *   continuing, and adds nothing. What counts as a context is the producer's
 *   to name — for a rebuffed ask it is who did the rebuffing — and it is
 *   written on the event, so the reason is readable afterwards and so the same
 *   season can hold one experience of each of several people rather than one
 *   experience in total.
 * - **Time.** Spacing periods between the first counted experience and the
 *   last, so a bad afternoon cannot stand in for a bad decade. This is the one
 *   that cannot be hurried, and the one that makes the whole thing a life: a
 *   person becomes somebody who reaches out less over years of it, not over a
 *   fortnight of it.
 *
 * Variety is deliberately not a gate of its own, only a way of reaching the
 * count sooner. A requirement that several different corners of a life argue
 * before any of it counts would read well and would leave the only producer
 * the running game has — being turned down by the person you keep asking —
 * unable to move anybody at all, which is not a stricter rule but a dead one.
 *
 * The pack then caps the whole. A trait whose settled resistance is above the
 * strongest single force plus that cap cannot be worn down at all, only
 * argued out of.
 */
export function traitChangePressure(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
  toward: TraitValue,
): number {
  const registered = loadedTraitRegistry().traits.get(
    `${PEOPLE_MIND_VERSION}:${trait}`,
  );
  if (!registered) return 0;
  const { experienceSpacingDays, pressureCap } = registered.movability;

  const current = personTrait(world, personId, trait);
  const record = latestPersonalityTendency(
    world,
    personId,
    peopleTraitId(trait),
  );
  const since = record?.sequence ?? -1;
  const wanted = directionTag(current.value, toward);
  const arguing = world.history.events
    .filter(
      (event) =>
        event.type === UNMOVED_EVENT &&
        event.sequence > since &&
        event.involvedEntityIds.includes(personId) &&
        event.tags.includes(traitTag(trait)) &&
        event.tags.includes(wanted),
    )
    .slice()
    .sort((left, right) => left.sequence - right.sequence);

  const lastCountedIn = new Map<string, IsoDate>();
  let counted = 0;
  let first: IsoDate | null = null;
  let last: IsoDate | null = null;
  for (const event of arguing) {
    // An event whose producer named no context is its own context, so an old
    // record from before contexts were written still counts once rather than
    // silently merging with everything else.
    const context = contextOf(event.tags) ?? `event:${event.id}`;
    const previous = lastCountedIn.get(context);
    if (
      previous !== undefined &&
      daysBetween(previous, event.occurredAt) < experienceSpacingDays
    ) {
      continue;
    }
    lastCountedIn.set(context, event.occurredAt);
    counted += 1;
    first ??= event.occurredAt;
    last = event.occurredAt;
  }
  if (counted === 0) return 0;

  const spanDays =
    first !== null && last !== null ? daysBetween(first, last) : 0;
  const overTime = 1 + Math.floor(spanDays / experienceSpacingDays);
  // Minus one, because the first experience is the thing that happened rather
  // than pressure behind the thing that happened. One corner of a life arguing
  // once is a force meeting a resistance and nothing more; pressure is what a
  // person carries into the next one.
  const reach = Math.min(counted, overTime) - 1;
  return Math.max(0, Math.min(pressureCap, reach));
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
  /**
   * Which corner of this person's life this came from, as a stable label the
   * producer chooses — who rebuffed them, which room, which body. Required,
   * because it is what tells the same thing happening again apart from a
   * second, separate thing happening, and a producer that did not have to name
   * one would quietly turn repetition back into evidence.
   */
  readonly context: string;
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
  if (!input.context.trim()) {
    throw new Error(
      "A trait change needs a context, so repetition can be told from experience.",
    );
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
      contextTag(input.context.trim()),
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
