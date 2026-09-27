import { type NewGameSetup } from "../presentation/new-game";
import {
  questionnaireContentNote,
  questionnaireScreenFor,
} from "../presentation/setup-questionnaire-flow";
import type { QuestionnairePhase } from "../simulation";

/**
 * The calibration.
 *
 * A situation and some ways of handling it. What is deliberately absent is
 * everything a quiz would have: no score, no summary at the end, and above all
 * no label. The game never tells a player what it has concluded about them,
 * because a game that does has stopped being able to be surprised by them.
 *
 * Two things left with this wave. The "1 of 26" progress line is gone, because
 * the deep path has no fixed length any more — it stops when it stops learning
 * — and a denominator promised one. What remains is a phase, which says that
 * this ends without saying when.
 *
 * And so has "I would rather not say". Declining twenty times in a row is a
 * worse experience than leaving, and the authority replaced it with the one
 * control that was always the honest exit: start the life now, keeping
 * whatever has been answered so far.
 */
const PHASE_LINE: Readonly<Record<QuestionnairePhase, string>> = {
  opening: "Somewhere to start",
  widening: "A little wider",
  closing: "Nearly there",
};

export function QuestionnaireScreenView({
  setup,
  onAnswer,
  onFinishEarly,
  onBack,
}: {
  readonly setup: NewGameSetup;
  readonly onAnswer: (choiceId: string | null) => void;
  readonly onFinishEarly: () => void;
  readonly onBack: () => void;
}) {
  const screen = questionnaireScreenFor(setup);
  if (!screen) return null;
  const note = questionnaireContentNote();
  return (
    <main
      className="game-title game-setup game-creator"
      data-testid="questionnaire-screen"
    >
      <h2>Who are you?</h2>
      {/*
            What these questions actually are, said once and plainly: they are
            about the player, they orient what the game offers, and they decide
            nothing about who the character becomes.
          */}
      <p className="game-note" data-testid="questionnaire-framing">
        These are imagined situations. Choose what you would do, or skip. These
        answers do not write your character’s biography.
      </p>
      <p className="game-band" data-testid="questionnaire-progress">
        {PHASE_LINE[screen.phase]}
      </p>
      <p className="game-scene" data-testid="questionnaire-prompt">
        {screen.prompt}
      </p>
      <div className="game-choices" data-testid="questionnaire-options">
        {screen.options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onAnswer(option.key)}
          >
            {option.text}
          </button>
        ))}
      </div>
      <div className="game-setup-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          data-testid="questionnaire-finish"
          onClick={onFinishEarly}
        >
          Review appearance
        </button>
      </div>
      {note ? <p className="game-note">{note}</p> : null}
    </main>
  );
}
