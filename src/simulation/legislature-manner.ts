import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { latestPersonalityTendency } from "./queries";
import { LEGISLATURE_PACK } from "./legislature-trait-pack";
import { loadedTraitRegistry } from "./trait-registry";
import { traitDefinitionFromPack } from "./trait-packs";
import type { EntityId, MindSourceReference, World } from "./types";

/**
 * Conferring a member's bargaining manner from their own record.
 *
 * The trait `legislature-v1:showing-their-hand` is `conferred-only`, and this
 * is what confers it. The rule the owner approved for trait change elsewhere
 * applies here to conferral: the game does not assert something about a person
 * it never observed, and a derived value can explain itself out loud. So a
 * member's manner is read off the commitments they have actually made, and the
 * record it writes cites the events those commitments happened at.
 *
 * Eligibility is a fact about the world, which a pack cannot see, so the
 * conferral path is code in the system that owns the role. That system is this
 * one.
 *
 * **Unknown is not neutral.** A member who has never stated a commitment has
 * no manner, and this writes nothing for them. That is the whole reason
 * conferring from the record is safe to turn on in a live save: an existing
 * game does not shift, because a sitting whose members have no commitments
 * behaves exactly as it did before this existed. Nothing is backfilled.
 */

export const SHOWING_THEIR_HAND = `${LEGISLATURE_PACK}:showing-their-hand`;

/**
 * One answer is not a manner.
 *
 * Below this, a member has answered rather than shown a pattern, and the
 * honest reading is still that this world does not know how they bargain.
 */
const ENOUGH_TO_READ = 3;

/** A clear majority one way, rather than a slight edge, reads as strong. */
const CLEAR_MAJORITY = 0.75;

export type BargainingMannerReading =
  | { readonly state: "unknown" }
  | {
      readonly state: "observed";
      /** Negative keeps it open, positive says where they stand. */
      readonly value: -2 | -1 | 0 | 1 | 2;
      readonly plain: number;
      readonly guarded: number;
      /** The events the commitments behind this reading happened at. */
      readonly eventIds: readonly EntityId[];
    };

/**
 * What this member's own commitments say about how they answer. Pure.
 *
 * `firmness` is already the axis: a member who says "explicit" is showing
 * their hand and one who says "noncommittal" or "provisional" is keeping it
 * open. Nothing is inferred beyond counting what they actually said, which is
 * why the reading can be stated to a player in their own record's terms.
 * `qualified` is neither — an answer with a condition attached is still an
 * answer, and still a hedge — so it is counted in the total and on neither
 * side.
 */
export function bargainingMannerFromRecord(
  world: World,
  personId: EntityId,
): BargainingMannerReading {
  const mine = (world.history.legislativeCommitments ?? []).filter(
    (record) => record.holderPersonId === personId,
  );
  if (mine.length < ENOUGH_TO_READ) return { state: "unknown" };
  const plain = mine.filter((record) => record.firmness === "explicit");
  const guarded = mine.filter(
    (record) =>
      record.firmness === "noncommittal" || record.firmness === "provisional",
  );
  const leaning = plain.length - guarded.length;
  if (leaning === 0) {
    return {
      state: "observed",
      value: 0,
      plain: plain.length,
      guarded: guarded.length,
      eventIds: [...new Set(mine.map((record) => record.eventId))],
    };
  }
  const share = Math.max(plain.length, guarded.length) / mine.length;
  const magnitude = share >= CLEAR_MAJORITY ? 2 : 1;
  return {
    state: "observed",
    value: (leaning > 0 ? magnitude : -magnitude) as -2 | -1 | 1 | 2,
    plain: plain.length,
    guarded: guarded.length,
    // Distinct, because several commitments can be stated at one sitting and
    // the mind layer rejects a provenance that cites the same source twice.
    eventIds: [...new Set(mine.map((record) => record.eventId))],
  };
}

/** The words a reading would be explained with, in the record's own terms. */
export function describeBargainingManner(
  reading: BargainingMannerReading,
): string {
  if (reading.state === "unknown") {
    return "This world has not seen them answer often enough to say how they bargain.";
  }
  if (reading.value === 0) {
    return `Of the commitments they have stated, ${reading.plain} were plain and ${reading.guarded} were guarded, which settles nothing either way.`;
  }
  return reading.value > 0
    ? `They have stated ${reading.plain} plain commitments against ${reading.guarded} guarded ones.`
    : `They have stated ${reading.guarded} guarded commitments against ${reading.plain} plain ones.`;
}

/**
 * Writes the member's manner where their own record has established one.
 *
 * Returns the world unchanged when the record says nothing yet, when the
 * reading has not moved, and for the controlled character — the mind layer
 * only accepts the player's own choices as a change to that person, and the
 * player settles how they bargain by bargaining rather than by being told.
 * Their manner still reaches other people: the sitting reads the player as the
 * subject, and what it finds there is whatever the player's own play recorded.
 */
export function conferBargainingManner(
  world: World,
  personId: EntityId,
): World {
  if (world.control.kind === "person" && world.control.personId === personId) {
    return world;
  }
  const reading = bargainingMannerFromRecord(world, personId);
  if (reading.state === "unknown") return world;

  const trait = loadedTraitRegistry().traits.get(SHOWING_THEIR_HAND);
  if (!trait) return world;
  const definition = traitDefinitionFromPack(trait);

  const expressionKey =
    reading.value === 0
      ? trait.scale.balancedKey
      : reading.value > 0
        ? trait.poles.high.key
        : trait.poles.low.key;
  const strength =
    reading.value === 0
      ? ("subtle" as const)
      : Math.abs(reading.value) === 2
        ? ("strong" as const)
        : ("moderate" as const);

  const existing = world.mindCatalog.tendencies[definition.id]
    ? latestPersonalityTendency(world, personId, definition.id)
    : undefined;
  if (
    existing &&
    existing.expressionKey === expressionKey &&
    existing.strength === strength
  ) {
    // The record already says this. Writing it again would put a second
    // observation in the history that observed nothing new.
    return world;
  }

  const withCatalog: World = world.mindCatalog.tendencies[definition.id]
    ? world
    : {
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

  const sourceRefs: readonly MindSourceReference[] = reading.eventIds.map(
    (eventId) => ({ kind: "historical-event", eventId }),
  );

  return recordPersonalityTendency(withCatalog, {
    stableKey: `${SHOWING_THEIR_HAND}:${personId}:${withCatalog.history.legislativeCommitments?.length ?? 0}`,
    personId,
    tendencyId: definition.id,
    recordedAt: withCatalog.currentDate,
    expressionKey,
    strength,
    confidence: "medium",
    scopeTags: ["government:bargaining"],
    provenance: createMindProvenance("reflection", {
      sourceRefs,
      note: describeBargainingManner(reading),
    }),
    supersedesTendencyId: existing?.id ?? null,
  });
}
