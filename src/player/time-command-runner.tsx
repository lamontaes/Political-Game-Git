import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  compareSimulationMoments,
  type EntityId,
  type SimulationMoment,
  type World,
} from "../simulation";
import {
  submitTimeCommand,
  type TimeCommand,
  type TimeCommandStatus,
} from "../presentation/time-command";
import { nextTimeRequestId } from "../presentation/world-change-guard";
import {
  DEFAULT_INTERRUPTIONS,
  type InterruptionPreferences,
} from "../presentation/shell-navigation";

/**
 * Every time control on the player shell submits through here.
 *
 * It is a caller of GOVERNING's `submitTimeCommand`, not a clock: it takes the
 * moment the control was drawn from, lets the pending state paint, then hands
 * the latest World to the command so the command's own stale check decides.
 * While one request runs, every control reading this runner is marked busy and
 * further clicks are ignored, so one click moves the clock once.
 */

export interface TimeCommandReport {
  readonly status: TimeCommandStatus | "failed";
  readonly outcome: string;
  /** The disclosed target, when the command could plan one. */
  readonly target: SimulationMoment | null;
  readonly stoppedEarly: boolean;
}

export interface TimeActionResult {
  readonly world: World;
  readonly outcome: string;
}

export interface TimeCommandRunner {
  readonly pending: boolean;
  readonly submit: (
    command: TimeCommand,
    onReport?: (report: TimeCommandReport) => void,
  ) => void;
  /**
   * A time-spending player action that is not a plain skip (attending an
   * event runs its journey and the event itself). It shares the pending state
   * and is refused when the World moved since the control was shown.
   */
  readonly perform: (
    run: (world: World) => TimeActionResult,
    onReport?: (report: TimeCommandReport) => void,
  ) => void;
}

export interface TimeCommandTarget {
  readonly world: World;
  readonly personId: EntityId;
  readonly interruptions: InterruptionPreferences;
  readonly onWorldChange: (world: World) => void;
}

const STALE_OUTCOME =
  "Time had already moved since this was shown, so the request was not applied again.";

/** The runner without React, so its ordering can be tested directly. */
export function createTimeCommandCore(options: {
  readonly latest: () => TimeCommandTarget;
  readonly setPending: (pending: boolean) => void;
  readonly defer: (work: () => void) => void;
}): Omit<TimeCommandRunner, "pending"> {
  let busy = false;
  const schedule = (
    work: (source: SimulationMoment) => TimeCommandReport,
    onReport?: (report: TimeCommandReport) => void,
  ) => {
    if (busy) return;
    busy = true;
    options.setPending(true);
    const source = options.latest().world.currentMoment;
    options.defer(() => {
      let report: TimeCommandReport;
      try {
        report = work(source);
      } catch (error) {
        report = {
          status: "failed",
          outcome:
            error instanceof Error ? error.message : "Time could not advance.",
          target: null,
          stoppedEarly: false,
        };
      } finally {
        busy = false;
        options.setPending(false);
      }
      onReport?.(report);
    });
  };
  return {
    submit(command, onReport) {
      schedule((source) => {
        const target = options.latest();
        const result = submitTimeCommand(target.world, {
          requestId: nextTimeRequestId(),
          personId: target.personId,
          sourceMoment: source,
          command,
          interruptions: target.interruptions,
        });
        if (result.world !== target.world) target.onWorldChange(result.world);
        return {
          status: result.receipt.status,
          outcome: result.receipt.outcome,
          target: result.receipt.requestedTarget,
          stoppedEarly: result.receipt.stoppedEarly,
        };
      }, onReport);
    },
    perform(run, onReport) {
      schedule((source) => {
        const target = options.latest();
        if (compareSimulationMoments(target.world.currentMoment, source) !== 0)
          return {
            status: "stale",
            outcome: STALE_OUTCOME,
            target: null,
            stoppedEarly: false,
          };
        const result = run(target.world);
        if (result.world !== target.world) target.onWorldChange(result.world);
        return {
          status: "accepted",
          outcome: result.outcome,
          target: null,
          stoppedEarly: false,
        };
      }, onReport);
    },
  };
}

export function useTimeCommandRunner(
  target: TimeCommandTarget,
): TimeCommandRunner {
  const latest = useRef(target);
  useEffect(() => {
    latest.current = target;
  });
  const [pending, setPending] = useState(false);
  const core = useMemo(
    () =>
      createTimeCommandCore({
        latest: () => latest.current,
        setPending,
        // One task later, so the busy state is on screen before a long
        // advance holds the main thread.
        defer: (work) => {
          setTimeout(work, 0);
        },
      }),
    [],
  );
  return useMemo(() => ({ ...core, pending }), [core, pending]);
}

const TimeCommandContext = createContext<TimeCommandRunner | null>(null);

export function TimeCommandProvider({
  runner,
  children,
}: {
  readonly runner: TimeCommandRunner;
  readonly children: ReactNode;
}) {
  return (
    <TimeCommandContext.Provider value={runner}>
      {children}
    </TimeCommandContext.Provider>
  );
}

/**
 * The shell's runner when one is mounted; otherwise a runner of this
 * control's own, over the same command, for surfaces rendered on their own.
 */
export function useTimeCommand(fallback: {
  readonly world: World;
  readonly personId: EntityId;
  readonly interruptions?: InterruptionPreferences;
  readonly onWorldChange: (world: World) => void;
}): TimeCommandRunner {
  const shared = useContext(TimeCommandContext);
  const local = useTimeCommandRunner({
    ...fallback,
    interruptions: fallback.interruptions ?? DEFAULT_INTERRUPTIONS,
  });
  return shared ?? local;
}
