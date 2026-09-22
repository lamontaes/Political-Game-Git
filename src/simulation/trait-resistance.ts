import { daysBetween } from "./dates";
import { personalityTendencyHistory } from "./queries";
import type { RegisteredTrait } from "./trait-packs";
import type {
  EntityId,
  IsoDate,
  PersonalityTendencyRecord,
  World,
} from "./types";

/**
 * How hard it is to change somebody, read from their own life.
 *
 * The owner's requirement is that every character can change, with varying
 * levels of resistance. The tempting design is a second seeded number per
 * person saying how stubborn they are; it is rejected in
 * `docs/systems/traits.md`, because it is one more fact the game would assert
 * about somebody without having observed it, and because it explains nothing
 * to a player.
 *
 * `PersonalityTendencyRecord` already carries `supersedesTendencyId` and
 * `recordedAt`, so the chain of records for one person on one trait is that
 * person's history on it. Resistance is read from that chain — how long the
 * current value has stood, how often it has already moved — together with what
 * the declaring pack says about how movable the trait is at all. Two people
 * who have lived differently therefore resist differently, from records that
 * already exist, and the reason is always sayable out loud.
 */

/** How strongly one event argues for a change. */
export type TraitForce = "passing" | "notable" | "formative";

const FORCE_WEIGHT: Readonly<Record<TraitForce, number>> = {
  passing: 1,
  notable: 2,
  formative: 3,
};

export const TRAIT_FORCES: readonly TraitForce[] = [
  "passing",
  "notable",
  "formative",
];

const DAYS_IN_YEAR = 365.2425;

function minOf(left: IsoDate, right: IsoDate | undefined): IsoDate {
  return right !== undefined && right < left ? right : left;
}

/**
 * What the chain says, in three states rather than two.
 *
 * `unestablished` is the one that matters. A person with no record on a trait
 * has not been observed to have it, so there is nothing to move and no history
 * to read a resistance from — and in particular they are not maximally
 * movable, which is the silent reading a two-state answer would give. An
 * attempt against an unestablished trait is refused rather than granted
 * cheaply; establishing somebody's temperament is authoring it, not changing
 * it, and belongs to whatever confers the trait.
 */
export type TraitResistance =
  | { readonly state: "unestablished" }
  | {
      readonly state: "established";
      /** The force that must be exceeded. */
      readonly resistance: number;
      /** Moves already made. Each one costs the next more. */
      readonly priorMoves: number;
      readonly heldForYears: number;
      /** Whether the current value has stood long enough to settle. */
      readonly settled: boolean;
    };

function chain(
  world: World,
  personId: EntityId,
  tendencyId: EntityId,
): readonly PersonalityTendencyRecord[] {
  if (!world.mindCatalog.tendencies[tendencyId]) return [];
  return personalityTendencyHistory(world, personId, tendencyId);
}

/**
 * The resistance this person's history gives this trait. Pure; reads only
 * records that exist.
 *
 * Two clocks pull opposite ways, deliberately. A value freshly written has not
 * settled, so somebody recently shaken is easier to shift again — which is
 * true to life. But every move made adds `perMove` for good, so each shift
 * leaves them harder to move than the last time they settled, which is what
 * stops a character oscillating between two poles.
 */
export function traitResistance(
  world: World,
  personId: EntityId,
  trait: RegisteredTrait,
  tendencyId: EntityId,
): TraitResistance {
  const records = chain(world, personId, tendencyId);
  const current = records.at(-1);
  if (!current) return { state: "unestablished" };

  const priorMoves = records.filter(
    (record) => record.supersedesTendencyId !== null,
  ).length;
  // A value that has never been superseded is one this person has always had,
  // so it is counted from their birth rather than from the day the game got
  // around to writing it down. The five people traits are seeded lazily — the
  // record appears the first time a decision needs it — and reading the
  // record's own date would make a forty-year-old's lifelong temperament look
  // written this morning, which is the softest possible reading of a life and
  // exactly wrong. A value that superseded another is counted from the day it
  // was written, because that is genuinely when it started.
  const heldSince =
    current.supersedesTendencyId === null
      ? minOf(current.recordedAt, world.people[personId]?.birthDate)
      : current.recordedAt;
  const heldForYears = Math.max(
    0,
    daysBetween(heldSince, world.currentDate) / DAYS_IN_YEAR,
  );
  const { settled, perMove, settlesOver } = trait.movability;
  const settledFraction = Math.min(1, heldForYears / settlesOver);
  return {
    state: "established",
    resistance: settled * settledFraction + perMove * priorMoves,
    priorMoves,
    heldForYears,
    settled: settledFraction >= 1,
  };
}

/**
 * The resistance, said out loud.
 *
 * This is the half a hidden stubbornness number could never give: an
 * explanation a player can hear, and disagree with. Every clause comes from a
 * record; nothing here is invented.
 */
export function describeTraitResistance(
  name: string,
  resistance: TraitResistance,
): string {
  if (resistance.state === "unestablished") {
    return `Nobody has seen enough of ${name} to say.`;
  }
  const years = Math.floor(resistance.heldForYears);
  const held =
    resistance.settled && years >= 1
      ? `${name} has been this way for ${years} ${years === 1 ? "year" : "years"}`
      : `${name} came to this recently enough that it has not settled`;
  const moves =
    resistance.priorMoves === 0
      ? ", and has never been otherwise."
      : `, having already changed ${resistance.priorMoves === 1 ? "once" : `${resistance.priorMoves} times`}.`;
  return `${held}${moves}`;
}

/**
 * Whether a force overcomes a resistance, once the pressure already on this
 * person is counted.
 *
 * `pressure` is how many attempts have already been made and failed since the
 * last time this trait moved. Counting them is the point rather than
 * bookkeeping: one argument does not change somebody, and the same argument
 * for the tenth time does. A system that dropped its failures would have ten
 * independent coin flips instead of a life.
 */
export interface TraitChangeAttempt {
  readonly force: TraitForce;
  readonly pressure: number;
}

export interface TraitChangeVerdict {
  readonly moves: boolean;
  readonly effectiveForce: number;
  readonly resistance: TraitResistance;
}

export function weighTraitChange(
  resistance: TraitResistance,
  attempt: TraitChangeAttempt,
): TraitChangeVerdict {
  const effectiveForce =
    FORCE_WEIGHT[attempt.force] + Math.max(0, attempt.pressure);
  return {
    // An unestablished trait never moves: there is no value to move, and
    // "nothing recorded" must not read as "nothing in the way".
    moves:
      resistance.state === "established" &&
      effectiveForce > resistance.resistance,
    effectiveForce,
    resistance,
  };
}
