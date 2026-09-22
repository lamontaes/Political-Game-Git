import { daysBetween } from "./dates";
import { personalityTendencyHistory } from "./queries";
import type { RegisteredTrait } from "./trait-packs";
import type {
  EntityId,
  IsoDate,
  MindStrength,
  PersonalityTendencyRecord,
  World,
} from "./types";

/**
 * How hard it is to change somebody, read from their own life.
 *
 * The owner's requirement is that every character can change, with varying
 * levels of resistance, and his answer to what the variation should depend on
 * is: how strongly the trait is theirs. The tempting design is a second seeded
 * number per person saying how stubborn they are; it is rejected in
 * `docs/systems/traits.md`, because it is one more fact the game would assert
 * about somebody without having observed it, and because it explains nothing
 * to a player.
 *
 * Nothing new had to be stored to do it his way. `PersonalityTendencyRecord`
 * already carries a `strength` — it is what the store writes to say whether a
 * lean is subtle or defining — along with `supersedesTendencyId` and
 * `recordedAt`, so the chain of records for one person on one trait is that
 * person's history on it. Resistance is read from that chain: how strongly the
 * current value is held, and how long it has stood, against what the declaring
 * pack says about how movable the trait is at all. Two people who have lived
 * differently therefore resist differently, from records that already exist,
 * and the reason is always sayable out loud.
 *
 * What was removed, and why. An earlier shape added a permanent cost for every
 * move a person had ever made. It was there to stop oscillation, and it did,
 * but it also meant somebody who had already been through things became
 * progressively unreachable — a life made of events ended in a character no
 * event could touch, which is the opposite of the requirement. Oscillation is
 * now held off by the settling clock alone: a value carries most of its
 * resistance the day it is written, so there is no week-after swing back, and
 * prior moves are still counted and still said out loud because they are true
 * about the person. They just no longer harden them.
 */

/** How strongly one event argues for a change. */
export type TraitForce = "passing" | "notable" | "formative";

/**
 * What each force is worth. These stay in code, unlike every number in
 * `TraitMovability`, because they are the meaning of the vocabulary rather
 * than a judgment about a particular trait: "formative" has to mean the same
 * thing to every pack or the word is worth nothing.
 */
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

/** The strongest a single event can ever argue. */
export const STRONGEST_FORCE = FORCE_WEIGHT.formative;

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
      /** How strongly this person holds the value, from the record itself. */
      readonly heldAs: MindStrength;
      /** What a value held this strongly resists once it has settled. */
      readonly settledResistance: number;
      /** Moves already made. Reported and said out loud; costs nothing. */
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
 * Two readings combine. How strongly the value is held is the pack's declared
 * resistance for the strength on the record, and it is the part the owner
 * asked for: a faint lean and a defining one are not equally hard to shift.
 * How long it has stood scales that between the pack's unsettled floor and the
 * whole of it, so a value written last month is genuinely easier than the same
 * value held for twenty years — without ever being free, which is what keeps a
 * character from swinging back and forth.
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
  const { settledByStrength, settlesOver, unsettledFloor } = trait.movability;
  const settledResistance = settledByStrength[current.strength];
  const settledFraction = Math.min(1, heldForYears / settlesOver);
  return {
    state: "established",
    resistance:
      settledResistance *
      (unsettledFloor + (1 - unsettledFloor) * settledFraction),
    heldAs: current.strength,
    settledResistance,
    priorMoves,
    heldForYears,
    settled: settledFraction >= 1,
  };
}

/** How strongly a value is held, in a word a player would use. */
const HELD_AS_WORD: Readonly<Record<MindStrength, string>> = {
  subtle: "barely",
  moderate: "somewhat",
  strong: "strongly",
  defining: "as much as anything about them",
};

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
  const strength = `, and holds it ${HELD_AS_WORD[resistance.heldAs]}`;
  const moves =
    resistance.priorMoves === 0
      ? ", having never been otherwise."
      : `, having already changed ${resistance.priorMoves === 1 ? "once" : `${resistance.priorMoves} times`}.`;
  return `${held}${strength}${moves}`;
}

/**
 * Whether a force overcomes a resistance, once the experience already behind
 * this person is counted.
 *
 * `pressure` is how much independent experience has already argued this way
 * and failed since the last time this trait moved. Counting it is the point
 * rather than bookkeeping: one argument does not change somebody, and a year
 * of the same thing happening in different corners of a life does. What it is
 * emphatically not is a click counter — the producer decides what counts as a
 * separate experience, and the pack caps how much it can ever add, so somebody
 * repeating themselves gets nowhere no matter how long they keep at it.
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
