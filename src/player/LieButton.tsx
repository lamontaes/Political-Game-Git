import "./lie-button.css";

/**
 * The Lie button, beside the replies in every dialogue box (owner design
 * record, October 8, 2026: "Lie as a button beside replies").
 *
 * Pressed, it shows the knowingly false replies the conversation's producer
 * recorded in place of the ones they replace (`repliesForLieMode`); it changes
 * which replies are offered, never a turn and never what a listener knows.
 * Where the producer offers no lie, the button stays in its place, disabled.
 */
export function LieButton({
  available,
  active,
  onToggle,
}: {
  /** Whether the producer offers a lie among these replies. */
  readonly available: boolean;
  readonly active: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="ui-action pg-lie-button"
      data-testid="talk-lie-toggle"
      aria-pressed={available && active}
      disabled={!available}
      data-problem={available ? undefined : "no-lie-on-offer"}
      onClick={onToggle}
    >
      Lie
    </button>
  );
}
