import { useSyncExternalStore } from "react";
import {
  recentTimeCommandTimings,
  subscribeTimeCommandTimings,
} from "./time-command-runner";

/** Recent command costs for a developer session, never mounted in production play. */
export function TimeCommandDevOverlay() {
  const timings = useSyncExternalStore(
    subscribeTimeCommandTimings,
    recentTimeCommandTimings,
    recentTimeCommandTimings,
  );

  return (
    <aside
      className="time-command-dev-overlay"
      data-testid="time-command-dev-overlay"
      aria-label="Time command diagnostics"
    >
      <strong>Time command timing</strong>
      {timings.length === 0 ? (
        <span data-testid="time-command-no-timings">No commands recorded</span>
      ) : (
        <ol>
          {timings.slice(-5).map((timing) => (
            <li key={timing.id} data-command-kind={timing.kind}>
              <span>{timing.kind}</span>
              <span>{timing.elapsedMs.toFixed(1)} ms</span>
              <span>{timing.status}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
