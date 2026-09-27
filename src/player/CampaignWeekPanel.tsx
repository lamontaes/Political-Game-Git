import { useMemo, useState } from "react";
import "./campaign-workspace.css";
import {
  doWeekSession,
  letWeekSessionGo,
  runWeekCondensed,
} from "../presentation/campaign-life-actions";
import { projectCampaignWeekPanel } from "../presentation/campaign-life-surface";
import type { EntityId, World } from "../simulation";

/** Finish a committed week kept in an older save without offering its old count editor. */
export function CampaignWeekPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const view = useMemo(
    () => projectCampaignWeekPanel(world, personId),
    [world, personId],
  );
  const [message, setMessage] = useState<string | null>(null);
  const committed = view?.committed;
  if (!committed) return null;

  function run(work: () => World) {
    try {
      const next = work();
      if (next === world) {
        setMessage("Something already on the calendar has to happen first.");
        return;
      }
      setMessage(null);
      onWorldChange(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section
      className="game-campaign-strategy game-campaign-week"
      data-testid="campaign-week-committed"
      aria-labelledby="campaign-week-committed-title"
    >
      <h3 id="campaign-week-committed-title">Earlier committed week</h3>
      <p>{committed.summary}</p>
      <ul className="game-campaign-week-sessions">
        {committed.sessions.map((session) => (
          <li
            key={session.actionId}
            data-testid={`campaign-week-session-${session.actionId}`}
            data-holding={session.holding ? "true" : "false"}
          >
            <strong>{session.label}</strong>
            <span>
              {session.when}
              {session.spendLabel ? ` · ${session.spendLabel}` : ""}
            </span>
            <span>{session.statusLabel}</span>
            {session.canDo || session.canLetGo ? (
              <span className="game-campaign-life-actions">
                {session.canDo ? (
                  <button
                    type="button"
                    className="ui-action ui-action--primary"
                    data-testid={`campaign-week-do-${session.actionId}`}
                    onClick={() =>
                      run(() =>
                        doWeekSession(world, personId, session.actionId),
                      )
                    }
                  >
                    Do it now
                  </button>
                ) : null}
                {session.canLetGo ? (
                  <button
                    type="button"
                    className="ui-action"
                    data-testid={`campaign-week-let-go-${session.actionId}`}
                    onClick={() =>
                      run(() =>
                        letWeekSessionGo(world, personId, session.actionId),
                      )
                    }
                  >
                    Let it go
                  </button>
                ) : null}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {committed.anyLeft ? (
        <button
          type="button"
          className="ui-action"
          data-testid="campaign-week-run-rest"
          onClick={() =>
            run(() => runWeekCondensed(world, personId, committed.planId))
          }
        >
          Run the rest of this week
        </button>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
