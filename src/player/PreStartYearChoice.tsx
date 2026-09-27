import {
  preStartYearAvailability,
  type NewGameSetup,
} from "../presentation/new-game";

/** The optional prior-year World is chosen before the player enters play. */
export function PreStartYearChoice({
  setup,
  onToggle,
}: {
  readonly setup: NewGameSetup;
  readonly onToggle: (enabled: boolean) => void;
}) {
  const selected = setup.preStartYearVersion !== undefined;
  const availability = preStartYearAvailability(setup);
  return (
    <section data-testid="creator-prestart-year">
      <h2>Before you begin</h2>
      <div className="game-choices">
        <button
          type="button"
          data-testid="prestart-year-choice"
          className={selected ? "is-chosen" : undefined}
          aria-pressed={selected}
          disabled={!availability.available && !selected}
          onClick={() => onToggle(!selected)}
        >
          Let the world run for one year before I begin
          <small>
            {availability.available
              ? "People and public events advance through the prior year. Your character joins when you begin."
              : `${availability.reason}${selected ? " Turn this off to continue." : ""}`}
          </small>
        </button>
      </div>
    </section>
  );
}
