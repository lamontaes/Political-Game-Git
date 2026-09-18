import type { EntityId, World } from "../../simulation";
import { previewTimeCommand } from "../../presentation/time-command";
import {
  PROTECTED_STOP_NOTE,
  skipToLabel,
} from "../../presentation/time-target-label";
import {
  describeTimeCommandReport,
  useSharedTimeCommand,
} from "../time-command-runner";

/**
 * A day inside a feature panel, on the one clock.
 *
 * Three panels used to move the clock themselves — `advanceWorldMinutes` with
 * 1440 minutes, straight from an onClick. Each one therefore disclosed no
 * destination, painted no pending state, let a second press commit a second
 * day, and could apply a day on top of a World that had already moved. This
 * control is the shared repair: it submits the same `{ kind: "days" }` command
 * the Calendar home submits, through the shell's runner, so the runner's
 * pending flag, its single-flight guard and its stale-World refusal cover
 * every one of them.
 *
 * It is a caller, not a clock. Where no runner is mounted above it there is no
 * shared clock to submit to, so it renders its stated reason rather than
 * opening a second runner of its own.
 */
export function InlineDayControl({
  world,
  personId,
  days = 1,
  label,
  testid,
  onOutcome,
  unavailableNote,
}: {
  readonly world: World;
  readonly personId: EntityId;
  /** Mornings ahead. One unless a panel's own affordance means more. */
  readonly days?: number;
  readonly label: string;
  readonly testid: string;
  /** Where the panel already shows what happened. */
  readonly onOutcome: (outcome: string) => void;
  /** What a player reads where the shell's clock is not mounted. */
  readonly unavailableNote: string;
}) {
  const runner = useSharedTimeCommand();
  if (!runner)
    return <p data-testid={`${testid}-unavailable`}>{unavailableNote}</p>;
  const preview = previewTimeCommand(world, personId, { kind: "days", days });
  const targetId = `${testid}-target`;
  return (
    <>
      <button
        type="button"
        data-testid={testid}
        aria-disabled={runner.pending || undefined}
        aria-busy={runner.pending}
        aria-describedby={targetId}
        onClick={() =>
          runner.submit({ kind: "days", days }, (report) =>
            onOutcome(describeTimeCommandReport(report)),
          )
        }
      >
        {label}
      </button>
      <p id={targetId}>
        {runner.pending
          ? "Time is passing…"
          : `${preview ? `${skipToLabel(preview.target)}. ` : ""}${PROTECTED_STOP_NOTE}`}
      </p>
    </>
  );
}
