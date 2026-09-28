import { evaluateDecision } from "../simulation/decisions";
import { playerTemperament } from "../simulation/people-player-traits";
import type { PeopleTrait } from "../simulation/people-trait-definitions";
import {
  ensurePeopleTraits,
  traitConsiderations,
  type TraitLean,
} from "../simulation/people-traits";
import {
  readRelationshipStanding,
  type DimensionReading,
  type RelationshipDimension,
} from "../simulation/relationship-standing";
import { currentHistoricalCutoff } from "../simulation";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  DecisionImportance,
  EntityId,
  MindSourceReference,
  World,
} from "../simulation";
import type { ConversationStanding } from "./conversation-consequences";

/**
 * What somebody means by their answer, chosen before how they say it.
 *
 * A reply used to be one of two rows — yes or no — picked from a count of how
 * many recorded exchanges between the two of them went well against how many
 * went badly, with the speaker's temperament never consulted. That count is
 * the single hidden score the relationship research asked to retire: it lets a
 * pleasant afternoon cancel an unsettled quarrel, and it cannot tell trust from
 * liking.
 *
 * Here the speaker decides through the ordinary decision machinery which
 * MEANING to give — agree, offer a different arrangement, decline, or not
 * decide yet — from:
 *
 * - how they stand with the player, read from their own side along the five
 *   lines in `relationship-standing.ts` (warmth, trust, respect, commitment,
 *   unsettled tension), each citing the interactions it was read from;
 * - their own appraisals of what has happened between them, which are theirs
 *   and may differ from the player's;
 * - their recorded temperament, matched to a meaning by what it means, never
 *   by where an option sits in a list;
 * - what the player's own chosen temperament shows them, where the player has
 *   said something about who they are.
 *
 * Only after the meaning is chosen is a wording variant drawn, in the tone the
 * same standing gives. Wording never changes meaning.
 */

export type ReplyTone = "warm" | "even" | "worn";

const BAND_IMPORTANCE: Readonly<Record<string, DecisionImportance>> = {
  slight: "slight",
  marked: "moderate",
  strong: "strong",
};

function citeInteractions(
  reading: DimensionReading,
): readonly MindSourceReference[] {
  return reading.basis.slice(-2).map((interactionId) => ({
    kind: "relationship-interaction" as const,
    interactionId,
  }));
}

/**
 * The tone somebody answers in, from their own side of the relationship.
 *
 * Unsettled friction or a cooled warmth makes it worn; warmth with nothing
 * unsettled makes it warm; anything else, including knowing nothing, is even.
 */
export function standingTone(
  world: World,
  speakerPersonId: EntityId,
  listenerPersonId: EntityId,
): ReplyTone {
  const { readings } = readRelationshipStanding(
    world,
    speakerPersonId,
    listenerPersonId,
  );
  if (readings.tension.band !== "none" || readings.warmth.adverse) {
    return "worn";
  }
  if (readings.warmth.band !== "none") return "warm";
  return "even";
}

/** One meaning a reply can carry, with the option key the record will cite. */
export interface ReplyMeaningOption {
  readonly key: string;
  readonly description: string;
}

export interface ReplyMeanings {
  readonly agree: ReplyMeaningOption;
  readonly decline: ReplyMeaningOption;
  /** Only where a real alternative the player can take up exists. */
  readonly counter?: ReplyMeaningOption;
  readonly undecided: ReplyMeaningOption;
}

export type ReplyMeaning = keyof ReplyMeanings;

/** A temperament lean for this subject, named by meaning. */
export interface ReplyTraitLean {
  readonly meaning: ReplyMeaning;
  readonly trait: PeopleTrait;
  readonly pole: "low" | "high";
  readonly explanation: string;
}

/**
 * How the player comes across to the speaker, from the temperament the player
 * has chosen for themselves. A trait the player never chose says nothing.
 */
export interface ReplyPlayerLean {
  readonly meaning: ReplyMeaning;
  readonly trait: PeopleTrait;
  readonly pole: "low" | "high";
  readonly explanation: string;
}

/** What each line of the standing argues for, in this subject's meanings. */
const LINE_MEANINGS: Readonly<
  Record<
    RelationshipDimension,
    {
      readonly positive: ReplyMeaning | null;
      readonly adverse: ReplyMeaning | null;
      readonly positiveWhy: string;
      readonly adverseWhy: string;
    }
  >
> = {
  warmth: {
    positive: "agree",
    adverse: "decline",
    positiveWhy: "They are fond of the person asking.",
    adverseWhy: "They have cooled toward the person asking.",
  },
  trust: {
    positive: "agree",
    adverse: "undecided",
    positiveWhy: "They expect the person asking to hold up their end.",
    adverseWhy: "They are not sure the person asking will hold up their end.",
  },
  respect: {
    positive: "agree",
    adverse: null,
    positiveWhy: "They think well of how the person asking goes about things.",
    adverseWhy: "",
  },
  commitment: {
    positive: "agree",
    adverse: null,
    positiveWhy: "They feel bound to the person asking.",
    adverseWhy: "",
  },
  tension: {
    positive: "decline",
    adverse: null,
    positiveWhy: "Something between them has not been settled.",
    adverseWhy: "",
  },
};

export function evaluateReplyMeaning(
  world: World,
  input: {
    readonly turnKey: string;
    readonly actorPersonId: EntityId;
    readonly playerPersonId: EntityId;
    readonly decisionType: string;
    readonly subjectKind: string;
    readonly subjectKey: string;
    readonly standing: ConversationStanding;
    readonly meanings: ReplyMeanings;
    readonly traitLeans: readonly ReplyTraitLean[];
    readonly playerLeans: readonly ReplyPlayerLean[];
  },
): {
  readonly world: World;
  readonly evaluation: DecisionEvaluation;
  readonly meaning: ReplyMeaning;
} {
  const withTraits = ensurePeopleTraits(world, [input.actorPersonId]);
  const keyOf = (meaning: ReplyMeaning) => input.meanings[meaning]?.key;
  const considerations: DecisionConsideration[] = [];
  const push = (
    meaning: ReplyMeaning | null,
    consideration: Omit<DecisionConsideration, "optionKey">,
  ) => {
    const optionKey = meaning ? keyOf(meaning) : undefined;
    if (optionKey) considerations.push({ ...consideration, optionKey });
  };

  // Something always weighs, so an answer is never a coin landing on its edge.
  push("agree", {
    stableKey: "reply:asked-directly",
    sourceType: "context:asked-directly",
    direction: "supports",
    importance: "slight",
    confidence: "medium",
    explanation: "They were asked plainly, to their face.",
    sourceRefs: [],
  });

  // Their side of the relationship, line by line.
  const standing = readRelationshipStanding(
    withTraits,
    input.actorPersonId,
    input.playerPersonId,
  );
  for (const [dimension, meaning] of Object.entries(LINE_MEANINGS) as [
    RelationshipDimension,
    (typeof LINE_MEANINGS)[RelationshipDimension],
  ][]) {
    const reading = standing.readings[dimension];
    if (reading.band === "none") continue;
    push(reading.adverse ? meaning.adverse : meaning.positive, {
      stableKey: `reply:standing:${dimension}`,
      sourceType: `social:${dimension}`,
      direction: "supports",
      importance: BAND_IMPORTANCE[reading.band] ?? "slight",
      confidence: "high",
      explanation: reading.adverse ? meaning.adverseWhy : meaning.positiveWhy,
      sourceRefs: citeInteractions(reading),
    });
  }

  // Their own reading of what has happened between them.
  const theirAppraisals = withTraits.history.appraisals
    .filter(
      (appraisal) =>
        appraisal.personId === input.actorPersonId &&
        appraisal.involvedPersonIds.includes(input.playerPersonId),
    )
    .slice(-3);
  for (const appraisal of theirAppraisals) {
    const valences = appraisal.meanings.map((entry) => entry.valence);
    const negative = valences.includes("negative");
    const positive = valences.includes("positive");
    if (negative === positive) continue;
    push(negative ? "decline" : "agree", {
      stableKey: `reply:appraisal:${appraisal.id}`,
      sourceType: "mind:appraisal",
      direction: "supports",
      importance: "slight",
      confidence: appraisal.confidence,
      explanation: negative
        ? "They remember something between them going badly for them."
        : "They remember something between them going well.",
      sourceRefs: [{ kind: "appraisal", appraisalId: appraisal.id }],
    });
  }

  // What they are already carrying, and how often this has come up.
  if (input.standing.counterpartCommitmentId !== null) {
    push("decline", {
      stableKey: "reply:already-carrying",
      sourceType: "social:existing-commitments",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation:
        "They are already recorded as carrying something with hours attached.",
      sourceRefs: [
        {
          kind: "life-history",
          reference: {
            family: "life-commitment",
            recordId: input.standing.counterpartCommitmentId,
          },
        },
      ],
    });
  }
  if (input.standing.priorTurnsOnSubject > 2) {
    push("decline", {
      stableKey: "reply:raised-before",
      sourceType: "context:raised-before",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation: "This has been raised between them more than once already.",
      sourceRefs: [],
    });
  }

  // Who they are, matched by meaning.
  considerations.push(
    ...traitConsiderations(
      withTraits,
      input.actorPersonId,
      `${input.turnKey}:reply`,
      input.traitLeans.flatMap((lean): TraitLean[] => {
        const optionKey = keyOf(lean.meaning);
        return optionKey
          ? [
              {
                optionKey,
                trait: lean.trait,
                pole: lean.pole,
                explanation: lean.explanation,
              },
            ]
          : [];
      }),
    ),
  );

  // How the player comes across, from what the player chose to be.
  const said = playerTemperament(withTraits, input.playerPersonId).said;
  for (const lean of input.playerLeans) {
    const trait = said.find((entry) => entry.trait === lean.trait);
    if (!trait || trait.value === 0) continue;
    const onPole = lean.pole === "high" ? trait.value > 0 : trait.value < 0;
    if (!onPole) continue;
    push(lean.meaning, {
      stableKey: `reply:sized-up:${lean.trait}:${lean.meaning}`,
      sourceType: "mind:player-temperament",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: lean.explanation,
      sourceRefs: [],
    });
  }

  const meanings = (Object.keys(input.meanings) as ReplyMeaning[]).filter(
    (meaning) => input.meanings[meaning],
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `${input.turnKey}:npc-decision`,
    decisionType: input.decisionType,
    actorPersonId: input.actorPersonId,
    cutoff: currentHistoricalCutoff(withTraits),
    subject: {
      kind: input.subjectKind as never,
      key: input.subjectKey,
      entityId: input.playerPersonId,
    },
    options: meanings.map((meaning) => ({
      key: input.meanings[meaning]!.key,
      label: MEANING_LABEL[meaning],
      description: input.meanings[meaning]!.description,
    })),
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const meaning =
    meanings.find(
      (candidate) =>
        input.meanings[candidate]!.key === evaluation.selectedOptionKey,
    ) ?? "undecided";
  return { world: withTraits, evaluation, meaning };
}

const MEANING_LABEL: Readonly<Record<ReplyMeaning, string>> = {
  agree: "Agree",
  decline: "Say no",
  counter: "Offer another way",
  undecided: "Not decide yet",
};
