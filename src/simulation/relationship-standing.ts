import { relationshipHistory } from "./queries";
import type {
  EntityId,
  RelationshipInteraction,
  RelationshipInteractionNamespace,
  IsoDate,
  World,
} from "./types";

/**
 * What stands between two people, read out of what actually happened.
 *
 * The world already logs every interaction with a namespace, a direction and a
 * significance. Until now the only reading of that log collapsed it into one
 * hidden sum and four buckets, so a person could not be trusted at work and
 * disliked at home, and a quarrel that was never repaired was cancelled out by
 * the next pleasant afternoon. This reads the same log along five separate
 * lines instead, each of which a player can see in behaviour.
 *
 * Like `relationship-leverage.ts`, nothing here is stored. There is no meter,
 * nothing accumulates on a person, and a save carries interactions rather than
 * standings. Deleting this file would remove a reading, not a system, and any
 * save written before it existed reads correctly through it.
 *
 * NOTHING HERE FADES WITH TIME YET, AND THAT IS A GAP RATHER THAN THE RULE.
 *
 * The research return of 2026-09-22 section 11 ruled passive decay out — "No
 * passive relationship decay is introduced. Actual repeated choices can matter;
 * the absence of a required screen visit is not one of those choices" — and
 * `people-contact.ts` was written on that. lamontae reversed it the same day:
 * he does want relationships to fade with absence, and it must not read as a
 * number. The shape is with ChatGPT as `relationship-fading-with-absence`.
 *
 * So this file applies no fading because the pace has not been answered, not
 * because fading is wrong. Do not invent one here. When the answer lands it
 * lands as a rule per line — it is entirely plausible that warmth fades, that
 * what is owed does not, and that an unsettled quarrel does neither — and the
 * one thing worth carrying over from the old rule is its reasoning: a player
 * not opening a screen is not a choice their character made.
 *
 * Relationships are already neither automatic nor permanent, because every line
 * below moves on recorded conduct in both directions.
 */

/** The five lines a relationship is read along. */
export type RelationshipDimension =
  "warmth" | "trust" | "respect" | "commitment" | "tension";

export const RELATIONSHIP_DIMENSIONS: readonly RelationshipDimension[] = [
  /** How much of the other person's company this one wants. */
  "warmth",
  /** Whether what they say they will do is expected to happen. */
  "trust",
  /** Regard for how the other person does their work and judges a question. */
  "respect",
  /** A standing sense of being bound to them, whatever else is true. */
  "commitment",
  /** Friction raised and not yet settled. */
  "tension",
];

/**
 * How far along a line a relationship stands.
 *
 * Bands rather than a number, because the number would be a claim the world
 * cannot support and a player cannot see. Nothing renders these words directly;
 * `describeRelationshipStanding` turns a whole standing into a sentence.
 */
export type StandingBand = "none" | "slight" | "marked" | "strong";

export interface DimensionReading {
  readonly dimension: RelationshipDimension;
  readonly band: StandingBand;
  /**
   * Whether the band is on the wrong side of nothing.
   *
   * A band reads magnitude, because "strongly distrusted" and "strongly
   * trusted" are both strong readings and both matter. This carries the sign.
   * Tension and commitment are never adverse: tension is friction, which has
   * only one direction, and commitment floors at nothing.
   */
  readonly adverse: boolean;
  /**
   * The interactions this band was read from, most recent last.
   *
   * Carried so a caller can say why rather than assert. An empty list and a
   * band of "none" mean the log holds nothing that bears on this line, which is
   * not the same as a relationship that has gone flat.
   */
  readonly basis: readonly EntityId[];
}

export interface RelationshipStanding {
  /** Whose reading this is. Two people may read the same history differently. */
  readonly viewerId: EntityId;
  readonly subjectId: EntityId;
  readonly readings: Readonly<Record<RelationshipDimension, DimensionReading>>;
  readonly interactionCount: number;
  readonly lastInteractionAt: IsoDate | null;
}

/**
 * Which lines each kind of interaction bears on.
 *
 * A namespace that is not listed bears on nothing. "other" is deliberately
 * absent: an interaction nobody classified is not evidence of warmth, and an
 * unknown fact is not a small positive one.
 */
const DIMENSIONS_BY_NAMESPACE: Partial<
  Record<RelationshipInteractionNamespace, readonly RelationshipDimension[]>
> = {
  contact: ["warmth"],
  experience: ["warmth"],
  care: ["warmth", "commitment"],
  support: ["warmth", "trust"],
  mentorship: ["respect", "commitment"],
  work: ["respect", "trust"],
  exchange: ["trust"],
  commitment: ["trust", "commitment"],
  conflict: ["tension"],
};

/** How much one interaction counts for, before its direction is applied. */
const SIGNIFICANCE_WEIGHT = { minor: 1, meaningful: 2, major: 3 } as const;

/**
 * Which way an interaction moves a line it bears on.
 *
 * "maintained" is positive but small on purpose: keeping something up is worth
 * less than building it and far less than breaking it, which is why a single
 * betrayal outweighs a season of pleasantries.
 */
const CHANGE_FACTOR = {
  formed: 2,
  strengthened: 2,
  maintained: 1,
  strained: -2,
  ended: -3,
} as const;

/** Where a run of interactions stops being slight, and then marked. */
const MARKED_AT = 4;
const STRONG_AT = 9;

/**
 * Lines that a strained or ended interaction cannot pull below nothing.
 *
 * Commitment is not the opposite of warmth. Someone can be owed a great deal by
 * a person they have fallen out with, and the falling out does not cancel the
 * debt; only an interaction recorded as `ended` releases it. Tension is read
 * from its own sign and never goes negative either.
 */
const FLOOR_AT_ZERO: readonly RelationshipDimension[] = [
  "commitment",
  "tension",
];

/** The namespaces where the giver and the receiver are not in the same place. */
const ASYMMETRIC_NAMESPACES: readonly RelationshipInteractionNamespace[] = [
  "support",
  "care",
  "mentorship",
];

/**
 * A tag naming who acted, when an interaction had an actor and a recipient.
 *
 * Written as `relationship.actor:<personId>`. The shared log records a pair and
 * not a direction, so an interaction without this tag is read the same way by
 * both people — which is the honest reading of a record that never said who
 * gave. Where a writer does say, help given and help taken land differently:
 * the person who received it holds the warmth, trust or respect, and the person
 * who gave it holds the commitment.
 */
const ACTOR_TAG_PREFIX = "relationship.actor:";

/** Whether this interaction records that this person was the one who acted. */
function actorIs(
  interaction: RelationshipInteraction,
  personId: EntityId,
): boolean {
  return interaction.tags.includes(`${ACTOR_TAG_PREFIX}${String(personId)}`);
}

function namespaceOf(
  interaction: RelationshipInteraction,
): RelationshipInteractionNamespace {
  const [namespace] = interaction.kind.split(":", 1);
  return (namespace ?? "other") as RelationshipInteractionNamespace;
}

/**
 * Whether a later interaction settles friction the pair carried before it.
 *
 * Tension is the one line that does not come down on its own. A quarrel stays
 * live until the two of them do something about it, and only these kinds count
 * as doing something: showing up, helping, caring, or making and keeping an
 * undertaking. Time is not on the list.
 */
function settlesTension(interaction: RelationshipInteraction): boolean {
  const namespace = namespaceOf(interaction);
  if (namespace === "conflict") return false;
  if (
    interaction.change !== "formed" &&
    interaction.change !== "strengthened"
  ) {
    return false;
  }
  return (
    namespace === "contact" ||
    namespace === "support" ||
    namespace === "care" ||
    namespace === "commitment"
  );
}

/**
 * Whether an interaction moves where the two stand at all, rather than only
 * being on the record.
 *
 * Two kinds stay on the record and move nothing, after ChatGPT's conduct
 * rubric for `what-moves-a-relationship` (DEPTH1, 2026-09-22):
 *
 * - Routine contact that only kept things as they were. A greeting repeated a
 *   hundred times is a hundred greetings, not a friendship; contact counts
 *   when it formed or strengthened something.
 * - A conflict that was not recorded as straining or ending anything. The
 *   namespace alone does not decide direction: an honest disagreement is
 *   logged as conflict and is not a quarrel.
 */
function bearsOnStanding(
  interaction: RelationshipInteraction,
  namespace: RelationshipInteractionNamespace,
): boolean {
  if (namespace === "contact") return interaction.change !== "maintained";
  if (namespace === "conflict") {
    return interaction.change === "strained" || interaction.change === "ended";
  }
  return true;
}

interface Accumulator {
  weight: number;
  readonly basis: EntityId[];
}

function emptyAccumulators(): Record<RelationshipDimension, Accumulator> {
  return {
    warmth: { weight: 0, basis: [] },
    trust: { weight: 0, basis: [] },
    respect: { weight: 0, basis: [] },
    commitment: { weight: 0, basis: [] },
    tension: { weight: 0, basis: [] },
  };
}

function bandFor(weight: number): StandingBand {
  const magnitude = Math.abs(weight);
  if (magnitude === 0) return "none";
  if (magnitude >= STRONG_AT) return "strong";
  if (magnitude >= MARKED_AT) return "marked";
  return "slight";
}

/**
 * How these two stand, from one of their sides.
 *
 * Derived on the spot from `world.history.relationshipInteractions` and nothing
 * else. The reading is directional by signature even where the log is silent
 * about direction, so a writer that starts recording who acted changes the
 * answer without changing any caller.
 */
/** One pass over the pair's log. The only place the rules are applied. */
function accumulate(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): {
  readonly accumulators: Record<RelationshipDimension, Accumulator>;
  readonly history: readonly RelationshipInteraction[];
} {
  const history =
    viewerId === subjectId
      ? []
      : relationshipHistory(world, viewerId, subjectId);
  const accumulators = emptyAccumulators();

  for (const interaction of history) {
    if (settlesTension(interaction) && accumulators.tension.weight > 0) {
      accumulators.tension.weight = Math.max(
        0,
        accumulators.tension.weight -
          SIGNIFICANCE_WEIGHT[interaction.significance],
      );
      accumulators.tension.basis.push(interaction.id);
    }

    const namespace = namespaceOf(interaction);
    const dimensions = DIMENSIONS_BY_NAMESPACE[namespace];
    if (!dimensions) continue;
    if (!bearsOnStanding(interaction, namespace)) continue;

    const magnitude =
      SIGNIFICANCE_WEIGHT[interaction.significance] *
      CHANGE_FACTOR[interaction.change];
    const viewerGave =
      actorIs(interaction, viewerId) &&
      ASYMMETRIC_NAMESPACES.includes(namespace);

    // The person who gave the help does not thereby trust or respect the person
    // who needed it. What they hold is what they have taken on, so the whole
    // weight of the moment lands on their commitment and nowhere else.
    const lines = viewerGave ? (["commitment"] as const) : dimensions;

    for (const dimension of lines) {
      // A conflict raises tension by its own weight, whichever direction the
      // interaction was recorded in.
      const contribution =
        namespace === "conflict" && dimension === "tension"
          ? Math.abs(magnitude)
          : magnitude;
      const accumulator = accumulators[dimension];
      accumulator.weight += contribution;
      if (FLOOR_AT_ZERO.includes(dimension)) {
        accumulator.weight = Math.max(0, accumulator.weight);
      }
      accumulator.basis.push(interaction.id);
    }

    // A quarrel is not only friction: it cools what warmth and trust the two of
    // them had, which is why conflict writes outside its own namespace list.
    if (namespace === "conflict") {
      const cooling = -Math.abs(magnitude);
      accumulators.warmth.weight += cooling;
      accumulators.warmth.basis.push(interaction.id);
      accumulators.trust.weight += cooling;
      accumulators.trust.basis.push(interaction.id);
    }
  }

  return { accumulators, history };
}

/**
 * How these two stand, from one of their sides.
 *
 * Derived on the spot from `world.history.relationshipInteractions` and nothing
 * else. The reading is directional by signature even where the log is silent
 * about direction, so a writer that starts recording who acted changes the
 * answer without changing any caller.
 */
export function readRelationshipStanding(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): RelationshipStanding {
  const { accumulators, history } = accumulate(world, viewerId, subjectId);
  const readings = {} as Record<RelationshipDimension, DimensionReading>;
  for (const dimension of RELATIONSHIP_DIMENSIONS) {
    const accumulator = accumulators[dimension];
    readings[dimension] = {
      dimension,
      band: bandFor(accumulator.weight),
      adverse: accumulator.weight < 0,
      basis: [...new Set(accumulator.basis)],
    };
  }
  return {
    viewerId,
    subjectId,
    readings,
    interactionCount: history.length,
    lastInteractionAt: history.at(-1)?.occurredAt ?? null,
  };
}

/**
 * The internal weight behind a band.
 *
 * Exported for tests and for `deriveRelationshipSummary`, which has to keep
 * answering the question it always answered. No player-facing surface may use
 * it: the number is a reading of a log, not a quantity the world holds, and
 * showing it would turn an inference into a claim.
 */
export function rawWeight(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
  dimension: RelationshipDimension,
): number {
  return accumulate(world, viewerId, subjectId).accumulators[dimension].weight;
}

/**
 * What a player is told about where they stand with somebody.
 *
 * Plain words and no numbers. A band is an inference this file drew from a log;
 * printing it, or the weight behind it, would offer the player a measurement
 * the world never made. The sentence names at most two lines, because a person
 * describing a friend does not read out five.
 *
 * Returns null when the log holds nothing that bears on any line — which is not
 * "you are strangers", only that there is nothing here to say.
 */
export function describeRelationshipStanding(
  standing: RelationshipStanding,
  subjectName: string,
): string | null {
  const { readings } = standing;
  const clauses: string[] = [];

  const warmthAdverse = readings.warmth.adverse;
  if (readings.warmth.band === "strong" && !warmthAdverse) {
    clauses.push(`you are glad of ${subjectName}'s company`);
  } else if (readings.warmth.band === "marked" && !warmthAdverse) {
    clauses.push(`you get on`);
  } else if (warmthAdverse && readings.warmth.band !== "slight") {
    clauses.push(`you would not seek ${subjectName} out`);
  }

  const trustAdverse = readings.trust.adverse;
  if (readings.trust.band !== "none" && readings.trust.band !== "slight") {
    clauses.push(
      trustAdverse
        ? `you would not rely on what ${subjectName} says they will do`
        : `you would take ${subjectName} at their word`,
    );
  }

  if (
    clauses.length < 2 &&
    readings.respect.band !== "none" &&
    readings.respect.band !== "slight"
  ) {
    clauses.push(
      readings.respect.adverse
        ? `you think little of how ${subjectName} goes about things`
        : `you rate how ${subjectName} goes about things`,
    );
  }

  if (
    clauses.length < 2 &&
    readings.commitment.band !== "none" &&
    readings.commitment.band !== "slight"
  ) {
    clauses.push(`there is something owed between you`);
  }

  const sentences: string[] = [];
  if (clauses.length > 0) {
    sentences.push(`${capitalize(clauses.slice(0, 2).join(", and "))}.`);
  }

  // Tension is said last and on its own, because an unsettled quarrel is not a
  // qualifier on a friendship. It is the thing the player needs to know.
  if (readings.tension.band === "strong") {
    sentences.push(`Something serious between you has never been settled.`);
  } else if (readings.tension.band === "marked") {
    sentences.push(`There is something between you that was never settled.`);
  }

  return sentences.length === 0 ? null : sentences.join(" ");
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}
