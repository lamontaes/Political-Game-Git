import {
  PLAYER_MODEL_DIMENSIONS,
  applyAllPlayerEvidence,
  createPlayerModel,
  disambiguationValue,
  dimensionWeight,
  type PlayerEvidence,
  type PlayerModel,
  type PlayerModelDimension,
} from "./player-model";
import {
  ALL_AUTHORED_SETUP_ITEMS,
  FIXED_OPENING_KEYS_BY_BAND,
  SETUP_BANK_VERSION,
  SETUP_QUESTIONNAIRE_BANK,
  type QuestionnaireItem,
  type QuestionnaireOption,
  type QuestionnaireRegister,
  type SetupAgencyKey,
} from "./setup-questionnaire-bank";
import { sha256Hex } from "./sha256";
import { lifeVoiceBandForAge, type LifeVoiceBand } from "./voice-bands";
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
 * The product target is thirty to fifty items. These are the bounds a run may
 * fall between; they are NOT its length. The deep path stops when it stops
 * learning — see `INFORMATION_GAIN_FLOOR` — so two runs of it are different
 * lengths, which is the point. `setupContentShortfall()` still reports the
 * authored supply against the target so a thin bank shows up as a content gap
 * rather than as an engine that gives up early.
 */
export const DEEP_PATH_TARGET_MINIMUM = 30;
export const DEEP_PATH_TARGET_MAXIMUM = 50;

/**
 * How little a question has to be worth before the calibration stops asking.
 *
 * The deep path used to run to a fixed count, which meant it kept asking after
 * it had stopped learning and told the player "12 of 26" while doing it. Both
 * halves of that were wrong: a fixed length is a promise the design does not
 * want to make, and a visible denominator turns an adaptive interview into a
 * form with a progress bar.
 *
 * So the run ends when the best remaining item scores below this — that is,
 * when nothing left in the bank would tell the model much it does not already
 * have. The number is a design threshold and is calibrated against the scoring
 * scale in `nextQuestionnaireStep`: coverage terms start near 1 per unobserved
 * dimension and fall as evidence arrives, so a best-remaining score under this
 * means every candidate is now mostly re-asking.
 */
export const INFORMATION_GAIN_FLOOR = 0.9;

/**
 * How much observation an axis needs before asking about it again is
 * re-asking rather than learning.
 *
 * This is what makes the gain actually diminish. The ranking's coverage term is
 * `1 / (1 + weight)`, which keeps a well-observed axis worth a third of an
 * unobserved one forever — fine for deciding which of two questions is better,
 * useless for deciding whether to ask another, because it never reaches zero.
 *
 * So the stopping rule uses a different measure of the same thing: an axis
 * contributes to it only while it is under-observed, and contributes nothing
 * once it is not. When every axis an item touches is covered, the item is worth
 * nothing to the stopping rule however much it is still worth to the ranking,
 * and the only thing that can keep a calibration going is an ambiguity the
 * answers have not resolved — which is exactly the condition the authority
 * names: coverage, uncertainty, competing hypotheses, and diminishing gain.
 *
 * The value is about four setup answers' worth of evidence on one axis, since a
 * setup observation is capped at `MAXIMUM_SETUP_OBSERVATION_WEIGHT`.
 */
export const SUFFICIENT_DIMENSION_WEIGHT = 1.2;

/**
 * How many the deep path asks before the floor is allowed to end it.
 *
 * Without a floor of its own, a decisive opening — three answers that all load
 * the same way — could satisfy the coverage terms early and end the
 * calibration in five questions, which reads as the game losing interest.
 */
export const DEEP_PATH_MINIMUM = 12;

/**
 * When the civic and policy registers open.
 *
 * The authority asks for a calibration that starts personal and relational and
 * "gradually widens into civic and policy dilemmas based partly on what the
 * adaptive system still needs to disambiguate". This is that gate: until the
 * lived registers have been asked about enough times, an item set in a council
 * chamber is held back regardless of how much coverage it would buy.
 *
 * It is a soft gate rather than a hard phase boundary. Once the threshold is
 * passed, registers stop mattering and the ordinary scoring decides; and if
 * the lived supply runs out first, the gate lifts rather than ending the run,
 * because "we have nothing left to ask you about your kitchen" is not a reason
 * to stop calibrating.
 */
export const LIVED_REGISTERS_BEFORE_WIDENING = 5;

const LIVED_REGISTERS: ReadonlySet<QuestionnaireRegister> = new Set([
  "lived-personal",
  "lived-relational",
  "lived-moral",
]);

/** How far behind an item sits while the calibration is still in its opening. */
export const REGISTER_GATE_PENALTY = 50;

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

/* -------------------------------------------------------------------------- */
/* Which items belong to which life                                            */
/* -------------------------------------------------------------------------- */

/**
 * Enough about the character to know what it is honest to ask.
 *
 * Everything here is known at the setup screen, before any world exists —
 * which is the point. The calibration used to run with no idea how old the
 * character would be, so a player who asked for a ten-year-old was asked about
 * the household bills, a colleague's misuse of a trip fund and a professional
 * reference to co-sign. None of those is a decision that character will ever
 * be handed, so answering them measured the player against a life they were
 * not about to live.
 */
export interface SetupLifeContext {
  readonly band: LifeVoiceBand;
  readonly startAge: number;
  readonly startingLife: "ordinary-life" | "legislative-office";
  readonly household: "lives-alone" | "shares-a-home";
}

export function setupLifeContext(input: {
  readonly startAge: number;
  readonly startingLife: SetupLifeContext["startingLife"];
  readonly household: SetupLifeContext["household"];
}): SetupLifeContext {
  return {
    band: lifeVoiceBandForAge(input.startAge),
    startAge: input.startAge,
    startingLife: input.startingLife,
    household: input.household,
  };
}

/**
 * What a character at this stage is in a position to do.
 *
 * The record cannot be consulted — there is no world yet — so this is derived
 * from the life stage, which is the only thing the setup actually knows. It is
 * deliberately conservative: a fifteen-year-old *can* hold a job, so the
 * adolescent band admits `paid-work`; a ten-year-old cannot, so the childhood
 * band does not, and every item that assumes one is withheld.
 */
export function setupAgency(
  context: SetupLifeContext,
): ReadonlySet<SetupAgencyKey> {
  switch (context.band) {
    case "adult":
      return new Set<SetupAgencyKey>([
        "answers-for-themselves",
        "paid-work",
        "responsible-for-somebody",
      ]);
    case "adolescence":
      return new Set<SetupAgencyKey>(["paid-work", "in-school"]);
    case "middle-childhood":
      return new Set<SetupAgencyKey>(["in-school"]);
  }
}

/**
 * True when this item can honestly be asked here.
 *
 * WHO IS BEING ASKED, AND WHY IT CHANGES THE ANSWER.
 *
 * Packet 72 gated every item on the character's life stage and standing,
 * because a player who had said "my character is ten" was being asked what to
 * do about the household bills. That was the right fix for the complaint as it
 * stood, and it is not the rule Packet 77 asked for. The second playtest was
 * explicit: the calibration may put political, civic, moral and ordinary-life
 * questions to a player whatever age their character starts at, and it does not
 * need to roleplay a ten-year-old merely because a ten-year-old is being made.
 *
 * The two are reconciled by being honest about the addressee, which the screen
 * now says in as many words: these are put to the player, not to the character.
 * So:
 *
 *   - The three fixed OPENERS stay gated. They set the register a calibration
 *     starts in, each band has its own, and opening a ten-year-old's game on a
 *     grant application is the disconnection the first playtest reported.
 *   - Everything after them is open. The respondent is a person with views,
 *     not a character with standing, and withholding a question about a
 *     colleague's expenses from them because their character is ten was
 *     measuring the wrong thing in the other direction.
 */
export function itemAdmissible(
  item: QuestionnaireItem,
  context: SetupLifeContext,
): boolean {
  if (item.fixedOrdinal === null) return true;
  if (!item.eligibility.bands.includes(context.band)) return false;
  const agency = setupAgency(context);
  return item.eligibility.agency.every((key) => agency.has(key));
}

/** Everything this character could be asked, in bank order. */
export function admissibleQuestionnaireBank(
  context: SetupLifeContext,
): readonly QuestionnaireItem[] {
  return SETUP_QUESTIONNAIRE_BANK.filter((item) =>
    itemAdmissible(item, context),
  );
}

/**
 * The default context, for callers that have not been taught about bands.
 *
 * An adult in an ordinary life sharing a home — which is what every caller
 * before Packet 72 was implicitly assuming, so this keeps them behaving
 * exactly as they did.
 */
export const DEFAULT_SETUP_LIFE_CONTEXT: SetupLifeContext = {
  band: "adult",
  startAge: 34,
  startingLife: "ordinary-life",
  household: "shares-a-home",
};

/**
 * Any authored item, whether or not a player can still be asked it.
 *
 * Lookup and selection are deliberately different sets. A life saved before an
 * item was withdrawn still carries an answer naming it, and reading that
 * answer back has to produce the same evidence it always did — otherwise
 * retiring a question would silently recalibrate every existing save. What a
 * withdrawn item cannot do is come up again, and that is decided by
 * `admissibleQuestionnaireBank`, not by this.
 */
export function questionnaireItem(key: string): QuestionnaireItem | null {
  return (
    SETUP_QUESTIONNAIRE_BANK.find((item) => item.key === key) ??
    ALL_AUTHORED_SETUP_ITEMS.find((item) => item.key === key) ??
    null
  );
}

export function questionnaireOption(
  item: QuestionnaireItem,
  choiceId: string,
): QuestionnaireOption | null {
  return item.options.find((option) => option.key === choiceId) ?? null;
}

/**
 * The most this path can ask, given the authored supply.
 *
 * A ceiling, not a length. The short path always reaches its ceiling because
 * it is short by design; the deep path stops when it stops learning and
 * usually well below this. Callers that need to validate a recorded answer
 * list use this as the upper bound, which is exactly what it is.
 */
export function questionnaireLength(
  depth: QuestionnaireDepth,
  context: SetupLifeContext = DEFAULT_SETUP_LIFE_CONTEXT,
): number {
  if (depth === "skipped") return 0;
  const supply = admissibleQuestionnaireBank(context).length;
  if (depth === "short") return Math.min(SHORT_PATH_LENGTH, supply);
  return Math.min(DEEP_PATH_TARGET_MAXIMUM, supply);
}

/**
 * How far through the opening a run is, in words a player may see.
 *
 * Deliberately coarse and deliberately not a fraction. "Question 12 of 26"
 * both promises a length the design does not have and invites a player to
 * treat the calibration as a form to complete. A phase says enough to reassure
 * somebody that this ends without telling them when.
 */
export type QuestionnairePhase = "opening" | "widening" | "closing";

export function questionnairePhase(
  depth: QuestionnaireDepth,
  answered: number,
): QuestionnairePhase {
  if (depth === "short") {
    return answered < Math.ceil(SHORT_PATH_LENGTH / 2) ? "opening" : "closing";
  }
  if (answered < LIVED_REGISTERS_BEFORE_WIDENING) return "opening";
  if (answered < DEEP_PATH_MINIMUM) return "widening";
  return "closing";
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
  /** Legible as a policy docket; ranked last. */
  readonly flaggedItems: number;
  /** Named by the human playtest as an abstraction; also ranked last. */
  readonly abstractionFlaggedItems: number;
  /** How many items are written as a lived scene rather than a policy question. */
  readonly livedRegisterItems: number;
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
  const abstractionFlaggedItems = SETUP_QUESTIONNAIRE_BANK.filter(
    (item) => item.review.verdict === "playtest-abstraction-flagged",
  ).length;
  const nonTransparentItems =
    authoredItems - flaggedItems - abstractionFlaggedItems;
  const livedRegisterItems = SETUP_QUESTIONNAIRE_BANK.filter(
    (item) => item.register !== "policy-docket",
  ).length;
  return {
    bankVersion: SETUP_BANK_VERSION,
    authoredItems,
    nonTransparentItems,
    flaggedItems,
    abstractionFlaggedItems,
    livedRegisterItems,
    deepTargetMinimum: DEEP_PATH_TARGET_MINIMUM,
    deepTargetMaximum: DEEP_PATH_TARGET_MAXIMUM,
    shortOfMinimumBy: Math.max(0, DEEP_PATH_TARGET_MINIMUM - authoredItems),
    shortOfMinimumWithoutFlaggedBy: Math.max(
      0,
      DEEP_PATH_TARGET_MINIMUM - nonTransparentItems,
    ),
    note: "The deep path is no longer bounded by authored supply: the lived opening bank closed the gap against the 30-to-50 target. What bounds a run now is how much it is still learning, so two deep runs are different lengths. The items ranked last are still ranked last, and the count of them is the remaining content debt.",
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
  /**
   * The life the calibration is opening.
   *
   * Optional so that callers written before life stages existed keep working
   * unchanged, and defaulted to an adult in an ordinary life — which is what
   * every one of them was silently assuming.
   */
  readonly life?: SetupLifeContext;
}

export interface QuestionnaireScoreComponents {
  readonly coverage: number;
  readonly overlapPenalty: number;
  readonly disambiguation: number;
  readonly transparencyPenalty: number;
  /** Held back because the calibration has not widened yet. */
  readonly registerPenalty: number;
  readonly total: number;
  /**
   * What this item is worth before any ordering penalty.
   *
   * The stopping rule reads this rather than `total`, because an item held
   * back by the register gate or the transparency ranking is still
   * informative — it is merely not next. Ending a run on a penalised total
   * would stop the calibration for a reason that has nothing to do with how
   * much it still has to learn.
   */
  readonly informationValue: number;
}

export interface QuestionnaireCandidateScore {
  readonly item: QuestionnaireItem;
  readonly components: QuestionnaireScoreComponents;
  readonly tieBreakDigest: string;
}

export interface QuestionnaireStep {
  readonly ordinal: number;
  readonly item: QuestionnaireItem;
  /**
   * The most this path could still ask. A ceiling, never a length, and never
   * shown to a player as a denominator.
   */
  readonly totalPlanned: number;
  readonly phase: QuestionnairePhase;
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
 * Why a run ended, for the development calibration report.
 *
 * Never shown to a player: "we stopped because you had stopped surprising us"
 * is a diagnostic about the model, and telling somebody it is how a
 * calibration stops being able to surprise them back.
 */
export type QuestionnaireStopReason =
  /** The short path asked what it asks. */
  | "path-complete"
  /** The bank has nothing left that has not been asked. */
  | "supply-exhausted"
  /** Nothing left would tell the model much it does not already have. */
  | "information-gain-floor"
  /** The deep path reached its ceiling. */
  | "ceiling-reached";

export interface QuestionnaireOutcome {
  readonly stopped: QuestionnaireStopReason;
  readonly asked: number;
  /** The best score still on the table when it stopped. */
  readonly bestRemainingValue: number;
  /** Dimensions still carrying no observation at all. */
  readonly uncoveredDimensions: readonly PlayerModelDimension[];
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
  const life = input.life ?? DEFAULT_SETUP_LIFE_CONTEXT;
  const totalPlanned = questionnaireLength(input.depth, life);
  const ordinal = input.answers.length + 1;
  if (ordinal > totalPlanned) return null;

  const asked = new Set(input.answers.map((answer) => answer.questionKey));
  const phase = questionnairePhase(input.depth, input.answers.length);
  const openingKeys = FIXED_OPENING_KEYS_BY_BAND[life.band];
  const fixedKey = openingKeys[ordinal - 1];
  if (ordinal <= openingKeys.length && fixedKey !== undefined) {
    const item = questionnaireItem(fixedKey);
    if (item && !asked.has(fixedKey)) {
      return {
        ordinal,
        item,
        totalPlanned,
        phase,
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

  // Whether the opening is over. Counted over the lived registers actually
  // asked rather than over the ordinal, so a run whose lived supply ran out
  // early widens rather than stalling.
  const livedAsked = input.answers.filter((answer) => {
    const item = questionnaireItem(answer.questionKey);
    return item !== null && LIVED_REGISTERS.has(item.register);
  }).length;
  const admissible = admissibleQuestionnaireBank(life);
  const livedRemaining = admissible.some(
    (item) => !asked.has(item.key) && LIVED_REGISTERS.has(item.register),
  );
  const stillOpening =
    livedAsked < LIVED_REGISTERS_BEFORE_WIDENING && livedRemaining;

  const candidates: QuestionnaireCandidateScore[] = [];
  for (const item of admissible) {
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
    const transparencyPenalty = rankedLast(item) ? FLAGGED_ITEM_PENALTY : 0;
    const registerPenalty =
      stillOpening && !LIVED_REGISTERS.has(item.register)
        ? REGISTER_GATE_PENALTY
        : 0;
    // What the item is worth to the question "is there anything left to
    // learn", before anything about where it belongs in the order. The
    // stopping rule reads this; the ranking reads `total`.
    const informationValue = marginalInformationValue(
      model,
      item,
      disambiguation,
    );
    const total =
      coverage +
      disambiguation -
      overlapPenalty -
      transparencyPenalty -
      registerPenalty;
    candidates.push({
      item,
      components: {
        coverage,
        overlapPenalty,
        disambiguation,
        transparencyPenalty,
        registerPenalty,
        total,
        informationValue,
      },
      tieBreakDigest: sha256Hex(
        questionnaireTieBreakMaterial(input, ordinal, item.key),
      ),
    });
  }
  if (candidates.length === 0) return null;

  // The stopping rule. A deep run past its floor ends when nothing left would
  // tell the model much — which is what makes two deep runs different lengths,
  // and what stops the game asking a twenty-fourth question it already knows
  // the answer to. The short path is short by contract and does not consult it.
  if (input.depth === "deep" && input.answers.length >= DEEP_PATH_MINIMUM) {
    const bestValue = candidates.reduce(
      (highest, candidate) =>
        Math.max(highest, candidate.components.informationValue),
      0,
    );
    if (bestValue < INFORMATION_GAIN_FLOOR) return null;
  }

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

  return {
    ordinal,
    item: best.item,
    totalPlanned,
    phase,
    reason,
    candidates,
  };
}

/**
 * What an item could still teach, as opposed to how good a question it is.
 *
 * An axis contributes only while it is under-observed, and its contribution
 * falls linearly to nothing at `SUFFICIENT_DIMENSION_WEIGHT`. Once every axis
 * an item touches is covered, only an unresolved ambiguity keeps it worth
 * asking — which is what makes two deep runs different lengths: a player whose
 * answers left explanations level gets asked more, and one who answered
 * consistently gets asked less, without either being told so.
 */
function marginalInformationValue(
  model: PlayerModel,
  item: QuestionnaireItem,
  disambiguation: number,
): number {
  let remaining = 0;
  for (const [dimension, magnitude] of itemDimensionLoadings(item)) {
    const weight = dimensionWeight(model, dimension);
    if (weight >= SUFFICIENT_DIMENSION_WEIGHT) continue;
    remaining += magnitude * (1 - weight / SUFFICIENT_DIMENSION_WEIGHT);
  }
  return remaining + disambiguation;
}

/**
 * Items ranked behind everything that passed review.
 *
 * Two verdicts land here for different reasons — one is legible as a policy
 * docket, the other was named by a human reviewer as an abstraction — and both
 * mean "ask this only when there is nothing better left".
 */
function rankedLast(item: QuestionnaireItem): boolean {
  return (
    item.review.verdict === "policy-docket-flagged" ||
    item.review.verdict === "playtest-abstraction-flagged"
  );
}

/**
 * Why a run of this shape ended, and what it was still uncertain about.
 *
 * Development-only. It answers the acceptance question the authority asks —
 * "what caused the adaptive questionnaire to stop, and which dimensions remain
 * uncertain" — without any of it reaching a player.
 */
export function questionnaireOutcome(
  input: QuestionnaireSelectionInput,
): QuestionnaireOutcome {
  const asked = new Set(input.answers.map((answer) => answer.questionKey));
  const model = modelFromSetupPriors({
    version: 1,
    path: input.depth,
    bankVersion: SETUP_BANK_VERSION,
    answers: input.answers,
  });
  const uncovered = PLAYER_MODEL_DIMENSIONS.filter(
    (dimension) => dimensionWeight(model, dimension) === 0,
  );
  const remaining = SETUP_QUESTIONNAIRE_BANK.filter(
    (item) => !asked.has(item.key),
  );
  const bestRemainingValue = remaining.reduce((highest, item) => {
    const disambiguation =
      DISAMBIGUATION_WEIGHT *
      disambiguationValue(
        model,
        item.options.map((option) => option.hypotheses),
      );
    return Math.max(
      highest,
      marginalInformationValue(model, item, disambiguation),
    );
  }, 0);

  const stopped: QuestionnaireStopReason =
    remaining.length === 0
      ? "supply-exhausted"
      : input.depth === "short"
        ? "path-complete"
        : input.answers.length >= questionnaireLength(input.depth)
          ? "ceiling-reached"
          : "information-gain-floor";

  return {
    stopped,
    asked: input.answers.length,
    bestRemainingValue,
    uncoveredDimensions: uncovered,
  };
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
