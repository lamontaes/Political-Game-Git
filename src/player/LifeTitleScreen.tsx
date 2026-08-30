import type { BrowserWorldSummary } from "../presentation/browser-world-repository";

interface LifeTitleScreenProps {
  readonly saves: readonly BrowserWorldSummary[];
  readonly isLoading: boolean;
  readonly message: string | null;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onLoadGame: () => void;
  readonly onSettings: () => void;
}

export function LifeTitleScreen({
  saves,
  isLoading,
  message,
  onNewGame,
  onContinue,
  onLoadGame,
  onSettings,
}: LifeTitleScreenProps) {
  const recent = saves[0] ?? null;
  return (
    <main className="life-title" data-testid="life-title-screen">
      <div className="life-title__grain" aria-hidden="true" />
      <section className="life-title__content" aria-labelledby="game-title">
        <p className="life-title__kicker">A life shaped over time</p>
        <h1 id="game-title">Political Game</h1>
        <p className="life-title__lede">
          Begin anywhere in a life. Build relationships, make a living, and
          decide what matters to you.
        </p>

        <div className="life-title__actions" aria-label="Main menu">
          <button
            type="button"
            className="life-button life-button--primary"
            onClick={onNewGame}
          >
            New Game
          </button>
          <button
            type="button"
            className="life-button life-button--secondary"
            onClick={onContinue}
            disabled={isLoading || saves.length === 0}
          >
            Continue
          </button>
          <button
            type="button"
            className="life-button life-button--secondary"
            onClick={onLoadGame}
            disabled={isLoading}
          >
            Load Game
          </button>
          <button
            type="button"
            className="life-button life-button--quiet"
            onClick={onSettings}
          >
            Settings
          </button>
        </div>

        <div className="life-title__status" aria-live="polite">
          {isLoading ? <p>Looking for saved lives…</p> : null}
          {!isLoading && recent ? (
            <p>
              Continue as <strong>{recent.playerName}</strong>, age{" "}
              {recent.playerAge}
              {recent.residence ? ` · ${recent.residence.name}` : ""}
            </p>
          ) : null}
          {!isLoading && !recent ? <p>No saved lives yet.</p> : null}
          {message ? (
            <p className="life-message life-message--error">{message}</p>
          ) : null}
        </div>
      </section>

      <aside className="life-title__aside" aria-label="About this story">
        <span className="life-title__rule" aria-hidden="true" />
        <p>Private choices. Public consequences.</p>
        <p>There is no required path into politics.</p>
      </aside>
    </main>
  );
}
