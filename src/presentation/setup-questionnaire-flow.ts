import {
  nextQuestionnaireStep,
  questionnaireLength,
  setupContentShortfall,
  stableHash,
} from "../simulation";
import type {
  QuestionnairePhase,
  SetupAnswerRecord,
  SetupQuestionnairePath,
} from "../simulation";
import { canonicalSetupEncoding, worldSeedFor } from "./new-game-identity";
import type { NewGameSetup } from "./new-game";

/**
 * The calibration, as a screen.
 *
 * Thin on purpose. Which question comes next is decided by the engine from the
 * answers so far; this adds the shape a player interacts with and the two
 * identifiers the deterministic tie-break needs before a world exists.
 *
 * Those identifiers are worth explaining, because "before a world exists" is
 * the awkward part. The tie-break is specified over the world seed and the
 * person, and the questionnaire runs at setup, when neither has been built. The
 * seed is not a problem: `worldSeedFor` is a pure function of the setup's world
 * half, so it is already known and — crucially — is the same seed whatever the
 * player answers. The person is: their id is derived inside the world builder.
 * So the person's *setup identity* is used instead, a digest of the same
 * encoding that will produce them. Same inputs, same character, same digest, on
 * every replay.
 */

export interface QuestionnaireScreenOption {
  readonly key: string;
  readonly text: string;
}

export interface QuestionnaireScreen {
  readonly ordinal: number;
  /**
   * How far through the opening this is, coarsely.
   *
   * There is deliberately no denominator. "12 of 26" promised a length the
   * deep path does not have — it stops when it stops learning, so two runs are
   * different lengths — and a visible fraction turns a set of situations into
   * a form to complete. A phase says that this ends without saying when.
   */
  readonly phase: QuestionnairePhase;
  readonly questionKey: string;
  readonly prompt: string;
  readonly options: readonly QuestionnaireScreenOption[];
}

/**
 * The most a path can ask, for the setup screen's description of it.
 *
 * A ceiling. The short path always reaches it; the deep path usually stops
 * well short, and the copy that uses this must say "up to" rather than a count.
 */
export function questionnairePathCeiling(path: SetupQuestionnairePath): number {
  return questionnaireLength(path);
}

/** How a path should be described before a player picks it. */
export function questionnairePathNote(path: SetupQuestionnairePath): string {
  switch (path) {
    case "short":
      return `${questionnaireLength("short")} situations, and then straight in.`;
    case "deep":
      return "As many as it takes. It stops on its own when it has enough, and you can start the life at any point.";
    case "skipped":
      return "Skip these and let the game learn from what you do.";
  }
}

/** What the bank is currently short of, for anyone who asks. */
export function questionnaireContentNote(): string {
  const shortfall = setupContentShortfall();
  if (shortfall.shortOfMinimumBy === 0) return "";
  return `The longer calibration currently has ${shortfall.authoredItems} authored questions against a design target of ${shortfall.deepTargetMinimum} to ${shortfall.deepTargetMaximum}.`;
}

function personKeyFor(setup: NewGameSetup): string {
  return stableHash(canonicalSetupEncoding(setup));
}

/** The question this setup is up to, or null when the path is finished. */
export function questionnaireScreenFor(
  setup: NewGameSetup,
): QuestionnaireScreen | null {
  const path = setup.questionnaire ?? "skipped";
  if (path === "skipped") return null;
  const step = nextQuestionnaireStep({
    worldSeed: worldSeedFor(setup),
    personKey: personKeyFor(setup),
    depth: path,
    answers: setup.priors ?? [],
  });
  if (!step) return null;
  return {
    ordinal: step.ordinal,
    phase: step.phase,
    questionKey: step.item.key,
    prompt: step.item.prompt,
    options: step.item.options.map((option) => ({
      key: option.key,
      text: option.text,
    })),
  };
}

/**
 * Records an answer, or a skip.
 *
 * A skip is `null` and is written down. It advances the ordinal, does not ask
 * the item again, and contributes nothing to any dimension — "they declined"
 * and "they were never asked" are different facts about a calibration, and both
 * are kept.
 *
 * No player-facing control produces one any more. The authority removed the
 * "I would rather not say" option from the opening: a player who does not want
 * to answer leaves through the control that starts the life, which is a
 * different and more honest act than declining twenty times in a row. The null
 * path stays because saves recorded before that change still contain skips,
 * and a replay of one of those must reproduce the sequence it produced then.
 */
export function answerQuestionnaire(
  setup: NewGameSetup,
  choiceId: string | null,
): NewGameSetup {
  const screen = questionnaireScreenFor(setup);
  if (!screen) return setup;
  const answer: SetupAnswerRecord = {
    ordinal: screen.ordinal,
    questionKey: screen.questionKey,
    choiceId,
  };
  return { ...setup, priors: [...(setup.priors ?? []), answer] };
}

/** Stops the calibration where it stands, keeping whatever was answered. */
export function endQuestionnaireEarly(setup: NewGameSetup): NewGameSetup {
  const answers = setup.priors ?? [];
  // The path becomes what it turned out to be. A player who answered two of
  // five did not take the short path; they took a shorter one, and the record
  // should not claim otherwise.
  return answers.length === 0
    ? { ...setup, questionnaire: "skipped", priors: [] }
    : setup;
}
