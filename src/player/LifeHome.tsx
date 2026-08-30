import type { EntityId, LifeActionKey, World } from "../simulation";
import { availableLifeActions, summarizeLifeWorld } from "../simulation";

interface LifeHomeProps {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly saveState: "saved" | "saving" | "error";
  readonly onAction: (actionKey: LifeActionKey) => void;
  readonly onPause: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function LifeHome({
  world,
  playerPersonId,
  saveState,
  onAction,
  onPause,
}: LifeHomeProps) {
  const summary = summarizeLifeWorld(world, playerPersonId);
  const actions = availableLifeActions(world, playerPersonId);

  return (
    <main
      className="life-home"
      data-testid="life-home"
      data-life-stage={summary.lifeStage}
    >
      <header className="life-home__masthead">
        <div>
          <p className="life-kicker">
            {summary.currentResidence} · {formatDate(summary.currentDate)}
          </p>
          <h1>{summary.name}</h1>
          <p className="life-home__age">
            Age {summary.age} · {summary.lifeStage}
          </p>
        </div>
        <div className="life-home__controls">
          <span
            className="life-save-state"
            data-state={saveState}
            aria-live="polite"
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "error"
                ? "Save needs attention"
                : "Saved"}
          </span>
          <button
            type="button"
            className="life-menu-button"
            onClick={onPause}
            aria-label="Open pause menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="life-home__layout">
        <section
          className="life-home__story"
          aria-labelledby="life-now-heading"
        >
          <p className="life-kicker">Your life now</p>
          <h2 id="life-now-heading">{openingHeading(summary.age)}</h2>
          <p className="life-home__intro">
            Nothing has put you on a required path. Choose what deserves your
            time, and your life will grow from what you actually do.
          </p>
          <div className="life-action-grid" data-testid="life-actions">
            {actions.map((action) => (
              <button
                type="button"
                className="life-action-card"
                key={action.key}
                onClick={() => onAction(action.key)}
              >
                <span className="life-action-card__category">
                  {action.category}
                </span>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
                <small>
                  {action.days === 1 ? "1 day" : `${action.days} days`}
                </small>
              </button>
            ))}
          </div>
        </section>

        <aside
          className="life-home__facts"
          aria-label="Your life circumstances"
        >
          <section className="life-fact-card">
            <p className="life-kicker">Home & Residence</p>
            <h2>{summary.householdLabel}</h2>
            <p>{summary.housingLabel}</p>
          </section>
          <section className="life-fact-card">
            <p className="life-kicker">Work & Education</p>
            <h2>{summary.workLabel ?? "Work not established"}</h2>
            <p>{summary.educationLabel ?? "Education not established"}</p>
          </section>
          <section className="life-fact-card">
            <p className="life-kicker">Resources</p>
            <h2>{summary.resourceLabel}</h2>
            <p>Exact resources appear only when they are known.</p>
          </section>
          <section className="life-fact-card life-fact-card--places">
            <p className="life-kicker">Location</p>
            <dl>
              <div>
                <dt>Birthplace</dt>
                <dd>{summary.birthplace}</dd>
              </div>
              <div>
                <dt>Hometown</dt>
                <dd>{summary.hometown}</dd>
              </div>
              <div>
                <dt>Active Residence</dt>
                <dd>{summary.currentResidence}</dd>
              </div>
            </dl>
          </section>
          <section className="life-fact-card">
            <p className="life-kicker">Politics</p>
            <h2>{summary.politicalOutlook}</h2>
            <p>
              {summary.politicalCapability === "available"
                ? "Political paths remain optional."
                : "This place is part of your life, but its specialized local political paths are not available yet."}
            </p>
          </section>
        </aside>
      </div>

      <section
        className="life-history"
        aria-labelledby="recent-history-heading"
      >
        <div>
          <p className="life-kicker">Chronicle</p>
          <h2 id="recent-history-heading">Recent events</h2>
        </div>
        {summary.recentHistory.length > 0 ? (
          <ol>
            {summary.recentHistory.map((item, index) => (
              <li key={`${index}:${item}`}>{item}</li>
            ))}
          </ol>
        ) : (
          <p>Your first chapter begins here.</p>
        )}
      </section>
    </main>
  );
}

function openingHeading(age: number): string {
  if (age < 13) return "A day that belongs to you";
  if (age < 18) return "Choose what comes next";
  return "Your next direction";
}
