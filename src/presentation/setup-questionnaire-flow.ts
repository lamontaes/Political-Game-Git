import {
  nextQuestionnaireStep,
  questionnaireLength,
  setupContentShortfall,
  stableHash,
} from "../simulation";
import type { SetupAnswerRecord, SetupQuestionnairePath } from "../simulation";
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
  readonly total: number;
  readonly questionKey: string;
  readonly prompt: string;
  readonly options: readonly QuestionnaireScreenOption[];
}

/** How many the player is in for, said before they start. */
export function questionnairePathLength(path: SetupQuestionnairePath): number {
  return questionnaireLength(path);
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
    total: step.totalPlanned,
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
