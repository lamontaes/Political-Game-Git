import { useEffect, useRef, useState } from "react";

import type { BrowserWorldSummary } from "../presentation/browser-world-repository";

interface PauseMenuProps {
  readonly saveState: "saved" | "saving" | "error";
  readonly onResume: () => void;
  readonly onSave: () => void;
  readonly onLoad: () => void;
  readonly onSettings: () => void;
  readonly onTitle: () => void;
}

export function PauseMenu({
  saveState,
  onResume,
  onSave,
  onLoad,
  onSettings,
  onTitle,
}: PauseMenuProps) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => resumeRef.current?.focus(), []);
  return (
    <div
      className="life-overlay"
      data-testid="pause-menu"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <section className="life-dialog life-dialog--pause">
        <p className="life-kicker">Paused</p>
        <h2 id="pause-title">Your life is waiting</h2>
        <div className="life-dialog__actions">
          <button
            ref={resumeRef}
            type="button"
            className="life-button life-button--primary"
            onClick={onResume}
          >
            Resume
          </button>
          <button
            type="button"
            className="life-button life-button--secondary"
            onClick={onSave}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? "Saving…" : "Save Game"}
          </button>
          <button
            type="button"
            className="life-button life-button--secondary"
            onClick={onLoad}
          >
            Load Game
          </button>
          <button
            type="button"
            className="life-button life-button--secondary"
            onClick={onSettings}
          >
            Settings
          </button>
          <button
            type="button"
            className="life-button life-button--quiet"
            onClick={onTitle}
          >
            Return to Title
          </button>
        </div>
        <p className="life-dialog__hint">Press Escape to resume.</p>
      </section>
    </div>
  );
}

interface LoadGameScreenProps {
  readonly saves: readonly BrowserWorldSummary[];
  readonly title: string;
  readonly error: string | null;
  readonly onLoad: (saveId: string) => void;
  readonly onDelete: (saveId: string) => void;
  readonly onBack: () => void;
}

export function LoadGameScreen({
  saves,
  title,
  error,
  onLoad,
  onDelete,
  onBack,
}: LoadGameScreenProps) {
  const [pendingDelete, setPendingDelete] =
    useState<BrowserWorldSummary | null>(null);
  return (
    <main className="life-library" data-testid="load-game-screen">
      <header>
        <button type="button" className="life-text-button" onClick={onBack}>
          Back
        </button>
        <div>
          <p className="life-kicker">Saved lives</p>
          <h1>{title}</h1>
        </div>
      </header>
      {error ? (
        <p className="life-message life-message--error" role="alert">
          {error}
        </p>
      ) : null}
      {saves.length === 0 ? (
        <section className="life-library__empty">
          <h2>No saved lives yet</h2>
          <p>Start a new game and your life will appear here.</p>
        </section>
      ) : (
        <div className="life-save-list">
          {saves.map((save) => (
            <article className="life-save-card" key={save.saveId}>
              <button
                type="button"
                className="life-save-card__load"
                onClick={() => onLoad(save.saveId)}
              >
                <span>
                  <strong>{save.playerName}</strong>
                  <small>
                    Age {save.playerAge}
                    {save.residence ? ` · ${save.residence.name}` : ""}
                  </small>
                </span>
                <span>
                  <small>Last played</small>
                  <time>
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(save.lastPlayedAt))}
                  </time>
                </span>
              </button>
              <button
                type="button"
                className="life-text-button life-save-card__delete"
                aria-label={`Delete save for ${save.playerName}`}
                onClick={() => setPendingDelete(save)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
      {pendingDelete ? (
        <div
          className="life-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-save-title"
          data-testid="delete-save-confirmation"
        >
          <section className="life-dialog">
            <p className="life-kicker">Delete saved life</p>
            <h2 id="delete-save-title">Delete {pendingDelete.playerName}?</h2>
            <p>This saved life will be removed from this device.</p>
            <div className="life-dialog__actions">
              <button
                type="button"
                className="life-button life-button--secondary"
                onClick={() => setPendingDelete(null)}
              >
                Keep Save
              </button>
              <button
                type="button"
                className="life-button life-button--primary"
                onClick={() => {
                  onDelete(pendingDelete.saveId);
                  setPendingDelete(null);
                }}
              >
                Delete Save
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export interface LifeSettings {
  readonly textSize: "standard" | "large";
  readonly reduceMotion: boolean;
}

interface SettingsScreenProps {
  readonly settings: LifeSettings;
  readonly onChange: (settings: LifeSettings) => void;
  readonly onBack: () => void;
  readonly overlay?: boolean;
}

export function SettingsScreen({
  settings,
  onChange,
  onBack,
  overlay = false,
}: SettingsScreenProps) {
  const content = (
    <section
      className="life-dialog life-dialog--settings"
      data-testid="settings-screen"
    >
      <p className="life-kicker">Settings</p>
      <h2>Make the game comfortable</h2>
      <fieldset className="life-settings-group">
        <legend>Text size</legend>
        <label>
          <input
            type="radio"
            name="text-size"
            checked={settings.textSize === "standard"}
            onChange={() => onChange({ ...settings, textSize: "standard" })}
          />{" "}
          Standard
        </label>
        <label>
          <input
            type="radio"
            name="text-size"
            checked={settings.textSize === "large"}
            onChange={() => onChange({ ...settings, textSize: "large" })}
          />{" "}
          Large
        </label>
      </fieldset>
      <label className="life-settings-check">
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(event) =>
            onChange({ ...settings, reduceMotion: event.target.checked })
          }
        />
        <span>
          <strong>Reduce motion</strong>
          <small>Keep transitions quiet and immediate.</small>
        </span>
      </label>
      <button
        type="button"
        className="life-button life-button--primary"
        onClick={onBack}
      >
        Done
      </button>
    </section>
  );
  return overlay ? (
    <div
      className="life-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      {content}
    </div>
  ) : (
    <main className="life-settings-page">
      <button type="button" className="life-text-button" onClick={onBack}>
        Back
      </button>
      {content}
    </main>
  );
}
