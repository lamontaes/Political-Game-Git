import { useMemo, useState } from "react";

import {
  createLegislativeScenario,
  legislativeScenarioKeys,
  type LegislativeScenario,
} from "../simulation/legislation-scenarios";
import { projectMeasureBriefing } from "../presentation/legislation-projection";
import type { MeasureBriefing } from "../presentation/legislation-projection";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { applyLegislativeCommand } from "../presentation/legislation-world";
import type { LegislativeAssignment } from "../presentation/legislation-world";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { MeasureStepKey } from "../simulation/legislation";
import type { World } from "../simulation/types";

/**
 * The player's view of a bill.
 *
 * It answers, in order: where is my bill, what just happened, who decides next,
 * and what can I do about it. The full vote record sits at the bottom for
 * anyone who wants it, rather than greeting the player as a spreadsheet.
 *
 * There are two ways in. Normal play passes the world the player is living in
 * and gets it back changed; the bill is part of their save like everything
 * else. The development route below keeps a world of its own so the procedure
 * can be exercised without starting a life first. Only the second one can
 * switch legislatures — in a game, which chamber your bills go to is a fact
 * about your job, not a control on a screen.
 */

export interface LegislationWorkspaceProps {
  /** The world the player is living in. The only one this surface changes. */
  readonly world: World;
  readonly assignment: LegislativeAssignment;
  readonly onWorldChange: (world: World) => void;
}

export function LegislationWorkspace({
  world,
  assignment,
  onWorldChange,
}: LegislationWorkspaceProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const briefing = useMemo(
    () => projectMeasureBriefing(world, assignment.measureId),
    [world, assignment.measureId],
  );

  function takeStep(step: MeasureStepKey) {
    try {
      const result = applyLegislativeCommand(world, assignment, {
        kind: "take-step",
        step,
      });
      setMessage(result.message);
      setError(null);
      onWorldChange(result.world);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <MeasureView
      briefing={briefing}
      notice={assignment.measureNotice}
      placeKey={assignment.scenarioKey}
      worldSource="save"
      message={message}
      error={error}
      onStep={takeStep}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* The development route. Its own world, its own storage, its own switching.   */
/* None of it is reachable from normal play.                                   */
/* -------------------------------------------------------------------------- */

const STORAGE_PREFIX = "political-game:legislation:";

function scenarioFromUrl(): string {
  const value = new URLSearchParams(window.location.search).get("place");
  return legislativeScenarioKeys().includes(value ?? "")
    ? (value as string)
    : "kentucky";
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

export function LegislationDevRoute() {
  const [scenarioKey, setScenarioKey] = useState(scenarioFromUrl);
  const [session, setSession] = useState<SessionState>(() =>
    startSession(scenarioFromUrl()),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const briefing = useMemo(
    () => projectMeasureBriefing(session.world, session.scenario.measureId),
    [session],
  );

  function takeStep(step: MeasureStepKey) {
    try {
      const result = applyLegislativeStep(
        session.scenario,
        session.world,
        step,
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
    <MeasureView
      briefing={briefing}
      notice={session.scenario.measureNotice}
      placeKey={scenarioKey}
      worldSource={session.source}
      message={message}
      error={error}
      onStep={takeStep}
      developer={{
        scenarioKey,
        onSwitchPlace: switchPlace,
        onSave: () => {
          window.localStorage.setItem(
            `${STORAGE_PREFIX}${scenarioKey}`,
            serializeWorld(session.world),
          );
          setMessage("Saved. Reloading will pick the bill up where it is.");
        },
        onRestart: () => {
          window.localStorage.removeItem(`${STORAGE_PREFIX}${scenarioKey}`);
          setSession(startSession(scenarioKey));
          setMessage("Started again from the day the bill was filed.");
          setError(null);
        },
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */

interface DeveloperControls {
  readonly scenarioKey: string;
  readonly onSwitchPlace: (key: string) => void;
  readonly onSave: () => void;
  readonly onRestart: () => void;
}

interface MeasureViewProps {
  readonly briefing: MeasureBriefing;
  readonly notice: string;
  readonly placeKey: string;
  readonly worldSource: string;
  readonly message: string | null;
  readonly error: string | null;
  readonly onStep: (step: MeasureStepKey) => void;
  readonly developer?: DeveloperControls;
}

function MeasureView({
  briefing,
  notice,
  placeKey,
  worldSource,
  message,
  error,
  onStep,
  developer,
}: MeasureViewProps) {
  const [showRecord, setShowRecord] = useState(false);

  // Things you do, and things you can only wait on, are shown apart. A
  // governor's decision is never offered as a choice you make.
  const playerOptions = briefing.options.filter(
    (option) => option.playerMayAct,
  );
  const waitingOptions = briefing.options.filter(
    (option) => !option.playerMayAct,
  );

  return (
    <main
      className="legislation"
      data-testid="legislation-workspace"
      data-place={placeKey}
      data-phase-note={briefing.whereItStands}
      data-finished={briefing.finished ? "true" : "false"}
      data-world-source={worldSource}
    >
      <header className="legislation-header">
        <div>
          <p className="legislation-eyebrow">{briefing.legislatureName}</p>
          <h1>
            {briefing.designation} — {briefing.shortTitle}
          </h1>
          <p className="legislation-summary">{briefing.summary}</p>
          <p
            className="legislation-authored"
            data-testid="legislation-authored"
          >
            {notice}
          </p>
          {briefing.sponsorName ? (
            <p className="legislation-sponsor">
              Your office's bill. Sponsored by {briefing.sponsorName}.
            </p>
          ) : null}
        </div>
        {developer ? (
          <div className="legislation-places">
            <p>Development route — pick a legislature</p>
            {legislativeScenarioKeys().map((key) => (
              <button
                key={key}
                type="button"
                className={key === developer.scenarioKey ? "is-current" : ""}
                data-testid={`legislation-place-${key}`}
                onClick={() => developer.onSwitchPlace(key)}
              >
                {createLegislativeScenario(key).label}
              </button>
            ))}
          </div>
        ) : null}
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
                  onClick={() => onStep(option.actionKey)}
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
                  onClick={() => onStep(option.actionKey)}
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

      {developer ? (
        <section className="legislation-saving">
          <button
            type="button"
            data-testid="legislation-save"
            onClick={developer.onSave}
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
            onClick={developer.onRestart}
          >
            Start over
          </button>
        </section>
      ) : null}

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
