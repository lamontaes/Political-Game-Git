import { useMemo, useState } from "react";

import {
  createLegislativeScenario,
  legislativeScenarioKeys,
  type LegislativeScenario,
} from "../simulation/legislation-scenarios";
import { projectMeasureBriefing } from "../presentation/legislation-projection";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { World } from "../simulation/types";

/**
 * The player's view of a bill.
 *
 * It answers, in order: where is my bill, what just happened, who decides next,
 * and what can I do about it. The full vote record sits at the bottom for
 * anyone who wants it, rather than greeting the player as a spreadsheet.
 */

const STORAGE_PREFIX = "political-game:legislation:";

function scenarioFromUrl(): string {
  const value = new URLSearchParams(window.location.search).get("place");
  return legislativeScenarioKeys().includes(value ?? "")
    ? (value as string)
    : "kentucky";
}

export interface LegislationWorkspaceProps {
  /**
   * Which legislature to open. The game passes the one the loaded world's
   * character actually works for; opened on its own, it falls back to the
   * address bar so the workspace stays reachable for development.
   */
  readonly placeKey?: string;
}

interface SessionState {
  readonly scenario: LegislativeScenario;
  readonly world: World;
  readonly source: "fresh" | "restored";
}

function startSession(scenarioKey: string): SessionState {
  const scenario = createLegislativeScenario(scenarioKey);
  const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${scenarioKey}`);
  if (saved) {
    try {
      return { scenario, world: deserializeWorld(saved), source: "restored" };
    } catch {
      // A save that no longer loads is simply ignored.
    }
  }
  return { scenario, world: scenario.world, source: "fresh" };
}

export function LegislationWorkspace({
  placeKey,
}: LegislationWorkspaceProps = {}) {
  const opening = placeKey ?? scenarioFromUrl();
  const [scenarioKey, setScenarioKey] = useState(opening);
  const [session, setSession] = useState<SessionState>(() =>
    startSession(opening),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRecord, setShowRecord] = useState(false);

  const briefing = useMemo(
    () => projectMeasureBriefing(session.world, session.scenario.measureId),
    [session],
  );
  // Things you do, and things you can only wait on, are shown apart. A
  // governor's decision is never offered as a choice you make.
  const playerOptions = briefing.options.filter(
    (option) => option.playerMayAct,
  );
  const waitingOptions = briefing.options.filter(
    (option) => !option.playerMayAct,
  );

  function takeStep(stepKey: Parameters<typeof applyLegislativeStep>[2]) {
    try {
      const result = applyLegislativeStep(
        session.scenario,
        session.world,
        stepKey,
      );
      setSession({ ...session, world: result.world });
      setMessage(result.message);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  function switchPlace(key: string) {
    setScenarioKey(key);
    setSession(startSession(key));
    setMessage(null);
    setError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "legislation");
    url.searchParams.set("place", key);
    window.history.replaceState({}, "", url);
  }

  return (
    <main
      className="legislation"
      data-testid="legislation-workspace"
      data-place={scenarioKey}
      data-phase-note={briefing.whereItStands}
      data-finished={briefing.finished ? "true" : "false"}
      data-world-source={session.source}
    >
      <header className="legislation-header">
        <div>
          <p className="legislation-eyebrow">{briefing.legislatureName}</p>
          <h1>
            {briefing.designation} — {briefing.shortTitle}
          </h1>
          <p className="legislation-summary">{briefing.summary}</p>
          {briefing.sponsorName ? (
            <p className="legislation-sponsor">
              Your bill. Sponsored by {briefing.sponsorName}.
            </p>
          ) : null}
        </div>
        <div className="legislation-places">
          <p>Where you are serving</p>
          {legislativeScenarioKeys().map((key) => (
            <button
              key={key}
              type="button"
              className={key === scenarioKey ? "is-current" : ""}
              data-testid={`legislation-place-${key}`}
              onClick={() => switchPlace(key)}
            >
              {createLegislativeScenario(key).label}
            </button>
          ))}
        </div>
      </header>

      <section
        className="legislation-standing"
        data-testid="legislation-standing"
      >
        <h2>Where your bill stands</h2>
        <p className="legislation-where" data-testid="legislation-where">
          {briefing.whereItStands}
        </p>
        {briefing.whatJustHappened ? (
          <p className="legislation-latest" data-testid="legislation-latest">
            <strong>Just now:</strong> {briefing.whatJustHappened}
          </p>
        ) : null}
        <dl className="legislation-gate">
          <dt>Who decides next</dt>
          <dd data-testid="legislation-who">{briefing.whoDecidesNext}</dd>
          <dt>What happens next</dt>
          <dd data-testid="legislation-next">{briefing.whatHappensNext}</dd>
          {briefing.requirementNote ? (
            <>
              <dt>What it takes</dt>
              <dd data-testid="legislation-requirement">
                {briefing.requirementNote}
              </dd>
            </>
          ) : null}
        </dl>
        {briefing.outcomeNote ? (
          <p className="legislation-outcome" data-testid="legislation-outcome">
            {briefing.outcomeNote}
          </p>
        ) : null}
      </section>

      {message ? (
        <p
          className="legislation-message"
          role="status"
          data-testid="legislation-message"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="legislation-error"
          role="alert"
          data-testid="legislation-error"
        >
          {error}
        </p>
      ) : null}

      {playerOptions.length > 0 ? (
        <section className="legislation-actions">
          <h2>What you can do</h2>
          <ul data-testid="legislation-options">
            {playerOptions.map((option) => (
              <li key={option.actionKey}>
                <button
                  type="button"
                  data-testid={`legislation-step-${option.actionKey}`}
                  onClick={() => takeStep(option.actionKey)}
                >
                  {option.label}
                </button>
                <span>{option.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {waitingOptions.length > 0 ? (
        <section className="legislation-actions legislation-actions--waiting">
          <h2>Out of your hands</h2>
          <ul data-testid="legislation-waiting">
            {waitingOptions.map((option) => (
              <li key={option.actionKey}>
                <button
                  type="button"
                  data-testid={`legislation-step-${option.actionKey}`}
                  onClick={() => takeStep(option.actionKey)}
                >
                  {option.label}
                </button>
                <span>{option.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {briefing.deadlines.length > 0 || briefing.uncertainties.length > 0 ? (
        <section className="legislation-context">
          {briefing.deadlines.length > 0 ? (
            <div>
              <h2>Timing that matters</h2>
              <ul data-testid="legislation-deadlines">
                {briefing.deadlines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {briefing.uncertainties.length > 0 ? (
            <div>
              <h2>Worth knowing</h2>
              <ul data-testid="legislation-uncertainties">
                {briefing.uncertainties.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="legislation-story">
        <h2>The story so far</h2>
        <ol data-testid="legislation-history">
          {briefing.history.map((line, index) => (
            <li key={`${line.when}-${index}`}>
              <span className="legislation-when">{line.when}</span>
              <strong>{line.headline}</strong>
              <span>{line.detail}</span>
              {line.voteSummary ? (
                <em className="legislation-vote">{line.voteSummary}</em>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="legislation-saving">
        <button
          type="button"
          data-testid="legislation-save"
          onClick={() => {
            window.localStorage.setItem(
              `${STORAGE_PREFIX}${scenarioKey}`,
              serializeWorld(session.world),
            );
            setMessage("Saved. Reloading will pick the bill up where it is.");
          }}
        >
          Save
        </button>
        <button
          type="button"
          data-testid="legislation-reload"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <button
          type="button"
          data-testid="legislation-restart"
          onClick={() => {
            window.localStorage.removeItem(`${STORAGE_PREFIX}${scenarioKey}`);
            setSession(startSession(scenarioKey));
            setMessage("Started again from the day the bill was filed.");
            setError(null);
          }}
        >
          Start over
        </button>
      </section>

      {briefing.votes.length > 0 ? (
        <section className="legislation-record">
          <button
            type="button"
            data-testid="legislation-toggle-record"
            onClick={() => setShowRecord((current) => !current)}
          >
            {showRecord ? "Hide the vote record" : "Show the vote record"}
          </button>
          {showRecord ? (
            <table data-testid="legislation-votes">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Where</th>
                  <th>When</th>
                  <th>For</th>
                  <th>Against</th>
                  <th>Not voting</th>
                  <th>Needed</th>
                  <th>Rule</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {briefing.votes.map((vote, index) => (
                  <tr key={`${vote.when}-${index}`}>
                    <td>{vote.question}</td>
                    <td>{vote.where}</td>
                    <td>{vote.when}</td>
                    <td>{vote.yea}</td>
                    <td>{vote.nay}</td>
                    <td>{vote.otherwise}</td>
                    <td>
                      {vote.needed} of {vote.outOf}
                    </td>
                    <td>{vote.rule}</td>
                    <td>{vote.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
