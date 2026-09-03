import {
  applyAllPlayerEvidence,
  createPlayerModel,
  disambiguationValue,
  dimensionWeight,
  type PlayerEvidence,
  type PlayerModel,
  type PlayerModelDimension,
} from "./player-model";
import {
  FIXED_OPENING_KEYS,
  SETUP_BANK_VERSION,
  SETUP_QUESTIONNAIRE_BANK,
  type QuestionnaireItem,
  type QuestionnaireOption,
} from "./setup-questionnaire-bank";
import { sha256Hex } from "./sha256";
import type { SetupAnswerRecord, SetupPriorStore } from "./types";

/**
 * Deciding what to ask next, and what an answer is worth.
 *
 * The rules here are not new. They were settled by the questionnaire semantic
 * closure and reproduced by the calibration research, and this is an
 * implementation of them rather than a redesign:
 *
 * - three fixed openers, in a fixed order, on every path;
 * - after that, the item that would tell the game the most about what it knows
 *   least, penalised for repeating the previous item's subject;
 * - ties broken by a SHA-256 over the world seed, the person, the bank, the
 *   encoding version, the ordinal and the candidate — so the same world asks
 *   the same questions in the same order, every time, on every machine;
 *   and so the questionnaire consumes no simulation randomness at all;
 * - a skip records an explicit null, contributes nothing, and still moves the
 *   ordinal on;
 * - a setup answer is weak evidence, and gameplay can outweigh it without
 *   anything being deleted.
 *
 * Two things are new, and both come from the audit that commissioned this
 * wave. The selector now also values an item for *separating two explanations
 * that are still level* rather than only for covering an unobserved axis — the
 * difference between "ask about what I know least" and "ask what would tell
 * these two apart". And the flagged items are ranked last, so a short
 * calibration never reaches them.
 */

export type QuestionnaireDepth = "skipped" | "short" | "deep";

/** The quick path. Long enough to be worth something, short enough to take. */
export const SHORT_PATH_LENGTH = 5;

/**
 * What the deep path is aiming at.
 *
 * The product target is thirty to fifty items. The authored supply is
 * twenty-six, so the deep path is currently supply-bound rather than
 * design-bound, and `setupContentShortfall()` says so in numbers instead of
 * leaving a reader to count the bank. Nothing here invents an item to close
 * the gap.
 */
export const DEEP_PATH_TARGET_MINIMUM = 30;
export const DEEP_PATH_TARGET_MAXIMUM = 50;

/** Subtracted per dimension shared with the immediately preceding item. */
export const ADJACENT_OVERLAP_PENALTY = 0.25;

/** What separating two live explanations is worth against covering an axis. */
export const DISAMBIGUATION_WEIGHT = 0.9;

/**
 * How far behind a flagged item sits.
 *
 * Large enough that every item which passed the transparency review is asked
 * first, whatever the coverage numbers say. This is a product ordering, not a
 * measurement one: an item a player can reverse-engineer measures less than
 * one they cannot, so asking it earlier would be worse on both counts.
 */
export const FLAGGED_ITEM_PENALTY = 100;

const TIE_TOLERANCE = 1e-9;

export function setupQuestionnaireBank(): readonly QuestionnaireItem[] {
  return SETUP_QUESTIONNAIRE_BANK;
}

export function questionnaireItem(key: string): QuestionnaireItem | null {
  return SETUP_QUESTIONNAIRE_BANK.find((item) => item.key === key) ?? null;
}

export function questionnaireOption(
  item: QuestionnaireItem,
  choiceId: string,
): QuestionnaireOption | null {
  return item.options.find((option) => option.key === choiceId) ?? null;
}

/** How many items this path will actually present, given the authored supply. */
export function questionnaireLength(depth: QuestionnaireDepth): number {
  if (depth === "skipped") return 0;
  if (depth === "short") return Math.min(SHORT_PATH_LENGTH, bankSize());
  return Math.min(DEEP_PATH_TARGET_MAXIMUM, bankSize());
}

function bankSize(): number {
  return SETUP_QUESTIONNAIRE_BANK.length;
}

/* -------------------------------------------------------------------------- */
/* The content shortfall, stated rather than implied                           */
/* -------------------------------------------------------------------------- */

export interface SetupContentShortfall {
  readonly bankVersion: string;
  readonly authoredItems: number;
  readonly nonTransparentItems: number;
  readonly flaggedItems: number;
  readonly deepTargetMinimum: number;
  readonly deepTargetMaximum: number;
  /** How many more items the deep path needs to reach its lower target. */
  readonly shortOfMinimumBy: number;
  /**
   * How many the deep path would be short if the flagged items were withdrawn
   * rather than merely ranked last, which is what the audit asked the research
   * lane to make possible.
   */
  readonly shortOfMinimumWithoutFlaggedBy: number;
  readonly note: string;
}

/**
 * The gap between what the deep path is designed for and what has been
 * authored for it.
 *
 * This is exported, tested and reported on purpose. The alternative to saying
 * "twenty-six against thirty" out loud is a deep path that quietly runs short
 * and looks like an engine defect.
 */
export function setupContentShortfall(): SetupContentShortfall {
  const authoredItems = bankSize();
  const flaggedItems = SETUP_QUESTIONNAIRE_BANK.filter(
    (item) => item.review.verdict === "policy-docket-flagged",
  ).length;
  const nonTransparentItems = authoredItems - flaggedItems;
  return {
    bankVersion: SETUP_BANK_VERSION,
    authoredItems,
    nonTransparentItems,
    flaggedItems,
    deepTargetMinimum: DEEP_PATH_TARGET_MINIMUM,
    deepTargetMaximum: DEEP_PATH_TARGET_MAXIMUM,
    shortOfMinimumBy: Math.max(0, DEEP_PATH_TARGET_MINIMUM - authoredItems),
    shortOfMinimumWithoutFlaggedBy: Math.max(
      0,
      DEEP_PATH_TARGET_MINIMUM - nonTransparentItems,
    ),
    note: "The deep path is bounded by authored supply, not by the engine. Closing the gap is a content job for the research lane; the implementing lane is not authorised to write questionnaire copy.",
  };
}

/* -------------------------------------------------------------------------- */
/* Evidence                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What one answer tells the model.
 *
 * A skip returns null rather than a zero-weight record, because a skip is not
 * an observation about the player at all. It is kept in the persisted answers,
 * where it belongs, so the sequence stays reproducible.
 */
export function setupAnswerEvidence(
  bankVersion: string,
  answer: SetupAnswerRecord,
): PlayerEvidence | null {
  if (answer.choiceId === null) return null;
  const item = questionnaireItem(answer.questionKey);
  if (!item) return null;
  const option = questionnaireOption(item, answer.choiceId);
  if (!option) return null;
  return {
    key: `setup:${bankVersion}:${answer.ordinal}:${item.key}:${option.key}`,
    strength: "setup",
    observationWeight: item.observationWeight,
    nudges: option.nudges,
    hypotheses: option.hypotheses,
    ambiguity: option.ambiguity,
    recordedAt: null,
    source: `Setup questionnaire, item ${answer.ordinal}: ${item.key}`,
  };
}

export function setupPriorEvidence(
  priors: SetupPriorStore,
): readonly PlayerEvidence[] {
  const evidence: PlayerEvidence[] = [];
  for (const answer of priors.answers) {
    const entry = setupAnswerEvidence(priors.bankVersion, answer);
    if (entry) evidence.push(entry);
  }
  return evidence;
}

/** The model as the questionnaire alone left it. */
export function modelFromSetupPriors(priors: SetupPriorStore): PlayerModel {
  return applyAllPlayerEvidence(
    createPlayerModel(),
    setupPriorEvidence(priors),
  );
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

/** Every dimension an item can move, with the largest magnitude it can move it. */
export function itemDimensionLoadings(
  item: QuestionnaireItem,
): ReadonlyMap<PlayerModelDimension, number> {
  const loadings = new Map<PlayerModelDimension, number>();
  for (const option of item.options) {
    for (const entry of option.nudges) {
      const magnitude = Math.abs(entry.magnitude);
      const existing = loadings.get(entry.dimension) ?? 0;
      if (magnitude > existing) loadings.set(entry.dimension, magnitude);
    }
  }
  return loadings;
}

export interface QuestionnaireSelectionInput {
  /** The world's own seed. An input to the tie-break, never an output of it. */
  readonly worldSeed: string;
  /** Stable identity for the character being calibrated. */
  readonly personKey: string;
  readonly depth: QuestionnaireDepth;
  /** Answers already given, in the order they were given. */
  readonly answers: readonly SetupAnswerRecord[];
}

export interface QuestionnaireScoreComponents {
  readonly coverage: number;
  readonly overlapPenalty: number;
  readonly disambiguation: number;
  readonly transparencyPenalty: number;
  readonly total: number;
}

export interface QuestionnaireCandidateScore {
  readonly item: QuestionnaireItem;
  readonly components: QuestionnaireScoreComponents;
  readonly tieBreakDigest: string;
}

export interface QuestionnaireStep {
  readonly ordinal: number;
  readonly item: QuestionnaireItem;
  readonly totalPlanned: number;
  /**
   * Why this one, in the selector's own terms. Never shown: telling a player
   * "asked because your economic axis is unobserved" is a diagnostic label
   * with extra steps.
   */
  readonly reason:
    "fixed-opener" | "coverage-need" | "disambiguation" | "remaining-supply";
  readonly candidates: readonly QuestionnaireCandidateScore[];
}

/**
 * The next question, or null when the path is finished.
 *
 * Pure, and deliberately so: the same inputs give the same question with no
 * reference to a clock, a random source or anything the world will not have
 * again on reload.
 */
export function nextQuestionnaireStep(
  input: QuestionnaireSelectionInput,
): QuestionnaireStep | null {
  const totalPlanned = questionnaireLength(input.depth);
  const ordinal = input.answers.length + 1;
  if (ordinal > totalPlanned) return null;

  const asked = new Set(input.answers.map((answer) => answer.questionKey));
  const fixedKey = FIXED_OPENING_KEYS[ordinal - 1];
  if (ordinal <= FIXED_OPENING_KEYS.length && fixedKey !== undefined) {
    const item = questionnaireItem(fixedKey);
    if (item && !asked.has(fixedKey)) {
      return {
        ordinal,
        item,
        totalPlanned,
        reason: "fixed-opener",
        candidates: [],
      };
    }
  }

  const model = modelFromSetupPriors({
    version: 1,
    path: input.depth,
    bankVersion: SETUP_BANK_VERSION,
    answers: input.answers,
  });
  const previousKey = input.answers.at(-1)?.questionKey ?? null;
  const previousItem = previousKey ? questionnaireItem(previousKey) : null;
  const previousDimensions = new Set<PlayerModelDimension>(
    previousItem ? itemDimensionLoadings(previousItem).keys() : [],
  );

  const candidates: QuestionnaireCandidateScore[] = [];
  for (const item of SETUP_QUESTIONNAIRE_BANK) {
    if (asked.has(item.key)) continue;
    const loadings = itemDimensionLoadings(item);
    let coverage = 0;
    let overlapPenalty = 0;
    for (const [dimension, magnitude] of loadings) {
      // Inverse accumulated observation weight: an axis nothing has touched
      // is worth the most, and the value falls away as evidence arrives.
      coverage += magnitude / (1 + dimensionWeight(model, dimension));
      if (previousDimensions.has(dimension)) {
        overlapPenalty += ADJACENT_OVERLAP_PENALTY;
      }
    }
    const disambiguation =
      DISAMBIGUATION_WEIGHT *
      disambiguationValue(
        model,
        item.options.map((option) => option.hypotheses),
      );
    const transparencyPenalty =
      item.review.verdict === "policy-docket-flagged"
        ? FLAGGED_ITEM_PENALTY
        : 0;
    const total =
      coverage + disambiguation - overlapPenalty - transparencyPenalty;
    candidates.push({
      item,
      components: {
        coverage,
        overlapPenalty,
        disambiguation,
        transparencyPenalty,
        total,
      },
      tieBreakDigest: sha256Hex(
        questionnaireTieBreakMaterial(input, ordinal, item.key),
      ),
    });
  }
  if (candidates.length === 0) return null;

  const best = pickBest(candidates, (candidate) => candidate.components.total);
  // Whether the disambiguation term is what decided it, asked by removing the
  // term and seeing whether the winner changes. A magnitude comparison would
  // answer a different and less useful question: coverage need is numerically
  // larger for most of a sequence, and the interesting fact is not "which term
  // is bigger" but "would this item have been chosen without it".
  const withoutDisambiguation = pickBest(
    candidates,
    (candidate) =>
      candidate.components.total - candidate.components.disambiguation,
  );
  const reason: QuestionnaireStep["reason"] =
    withoutDisambiguation.item.key !== best.item.key
      ? "disambiguation"
      : best.components.coverage > 0
        ? "coverage-need"
        : "remaining-supply";

  return { ordinal, item: best.item, totalPlanned, reason, candidates };
}

/**
 * Highest score wins; level scores are decided by the digest, lowest first, so
 * the sequence is reproducible without being predictable from the content.
 */
function pickBest(
  candidates: readonly QuestionnaireCandidateScore[],
  score: (candidate: QuestionnaireCandidateScore) => number,
): QuestionnaireCandidateScore {
  return candidates.reduce((leader, candidate) => {
    const difference = score(candidate) - score(leader);
    if (difference > TIE_TOLERANCE) return candidate;
    if (difference < -TIE_TOLERANCE) return leader;
    return candidate.tieBreakDigest < leader.tieBreakDigest
      ? candidate
      : leader;
  });
}

/**
 * The exact material the tie-break hashes.
 *
 * Written out as one function because it is a contract: the world seed, the
 * person, the bank, the encoding version, the ordinal and the candidate, in
 * that order and no other. A change here changes every world's question order,
 * which is why it is a single named thing rather than an inline template.
 */
export function questionnaireTieBreakMaterial(
  input: Pick<QuestionnaireSelectionInput, "worldSeed" | "personKey">,
  ordinal: number,
  questionKey: string,
): string {
  return [
    "questionnaire-tie-break",
    input.worldSeed,
    input.personKey,
    SETUP_BANK_VERSION,
    String(SETUP_ENCODING_TIE_BREAK_VERSION),
    String(ordinal),
    questionKey,
  ].join(" ");
}

/**
 * Version of the tie-break material, moved only when the material changes.
 * Kept separate from the setup encoding version so that adding a field to a
 * replay descriptor does not silently reshuffle everybody's questions.
 */
export const SETUP_ENCODING_TIE_BREAK_VERSION = 3;

/**
 * The whole sequence a set of answers implies, for tests and for replay
 * checking. Answers are consumed in order; when they run out, the remaining
 * planned items are projected by treating each as skipped, which is the only
 * assumption that does not put words in the player's mouth.
 */
export function projectQuestionnaireSequence(
  input: QuestionnaireSelectionInput,
): readonly string[] {
  const sequence: string[] = [];
  const answers: SetupAnswerRecord[] = [];
  const total = questionnaireLength(input.depth);
  for (let ordinal = 1; ordinal <= total; ordinal += 1) {
    const step = nextQuestionnaireStep({ ...input, answers });
    if (!step) break;
    sequence.push(step.item.key);
    const given = input.answers[ordinal - 1];
    answers.push(
      given && given.questionKey === step.item.key
        ? given
        : { ordinal, questionKey: step.item.key, choiceId: null },
    );
  }
  return sequence;
}
