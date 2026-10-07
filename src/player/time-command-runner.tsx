import {
  createContext,
  startTransition,
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
  type FutureTransitionHandlerRegistry,
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
import { stoppedEarlyLabel } from "../presentation/time-target-label";
import { interruptionHandlers } from "../presentation/interruption-policy";
import { applyWorldDelta, type WorldDelta } from "./time-command-delta";

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
  /** The actual date reached, which can be earlier than the disclosed target. */
  readonly reached?: SimulationMoment;
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
    /*
     * The runner supplies the handler registry built from the player's own
     * interruption preferences. A caller that composes its own cannot see
     * them, which is how the press desk's quarter hour ran through a work
     * shift the player had asked to be stopped for while the Calendar's day
     * stopped for it — one clock, two answers, a level below the submission.
     */
    run: (
      world: World,
      handlers: FutureTransitionHandlerRegistry,
    ) => TimeActionResult,
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
  readonly executeTimeCommand?: (
    world: World,
    request: Parameters<typeof submitTimeCommand>[1],
  ) => Promise<ReturnType<typeof submitTimeCommand>>;
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
      if (options.executeTimeCommand) {
        if (busy) return;
        busy = true;
        options.setPending(true);
        const source = options.latest().world.currentMoment;
        options.defer(() => {
          const target = options.latest();
          let committedWorld: World | null = null;
          void options.executeTimeCommand!(target.world, {
            requestId: nextTimeRequestId(),
            personId: target.personId,
            sourceMoment: source,
            command,
            interruptions: target.interruptions,
          })
            .then(({ world, receipt }) => {
              const latest = options.latest();
              if (
                latest.world !== target.world ||
                compareSimulationMoments(latest.world.currentMoment, source) !==
                  0
              ) {
                onReport?.({
                  status: "stale",
                  outcome: STALE_OUTCOME,
                  target: null,
                  stoppedEarly: false,
                });
                return;
              }
              if (world !== target.world) {
                committedWorld = world;
                startTransition(() => target.onWorldChange(world));
              }
              onReport?.({
                status: receipt.status,
                outcome: receipt.outcome,
                target: receipt.requestedTarget,
                reached: receipt.reached,
                stoppedEarly: receipt.stoppedEarly,
              });
            })
            .catch((error: unknown) => {
              onReport?.({
                status: "failed",
                outcome:
                  error instanceof Error
                    ? error.message
                    : "Time could not advance.",
                target: null,
                stoppedEarly: false,
              });
            })
            .finally(() => {
              const releaseWhenCommitted = () => {
                if (
                  committedWorld !== null &&
                  options.latest().world !== committedWorld
                ) {
                  if (typeof globalThis.requestAnimationFrame === "function")
                    globalThis.requestAnimationFrame(releaseWhenCommitted);
                  else globalThis.setTimeout(releaseWhenCommitted, 0);
                  return;
                }
                busy = false;
                options.setPending(false);
              };
              releaseWhenCommitted();
            });
        });
        return;
      }
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
          reached: result.receipt.reached,
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
        const result = run(target.world, interruptionHandlers());
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
  const workerRef = useRef<Worker | null>(null);
  const workerWorldRef = useRef<World | null>(null);
  const workerJobs = useRef(
    new Map<
      string,
      {
        readonly baseWorld: World;
        resolve: (result: ReturnType<typeof submitTimeCommand>) => void;
        reject: (error: Error) => void;
      }
    >(),
  );
  const nextWorkerJob = useRef(0);
  useEffect(() => {
    latest.current = target;
    const worker = workerRef.current;
    if (worker && workerWorldRef.current !== target.world) {
      // Clone the large checkpoint after the World commits, before a player
      // can press Day. The click message then carries only its small command.
      workerWorldRef.current = target.world;
      worker.postMessage({ type: "sync", world: target.world });
    }
  }, [target]);
  useEffect(() => {
    const worker = new Worker(
      new URL("./time-command-worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent) => {
      const job = workerJobs.current.get(event.data?.jobId);
      if (!job) return;
      workerJobs.current.delete(event.data.jobId);
      if (event.data.error) job.reject(new Error(event.data.error));
      else {
        const result = event.data.result as {
          readonly delta: WorldDelta;
          readonly receipt: ReturnType<typeof submitTimeCommand>["receipt"];
        };
        const nextWorld = applyWorldDelta(job.baseWorld, result.delta);
        // The worker already owns this exact checkpoint. Mark it before React
        // commits so the effect does not postMessage the whole World back.
        workerWorldRef.current = nextWorld;
        job.resolve({
          world: nextWorld,
          receipt: result.receipt,
        });
      }
    };
    worker.onerror = (event) => {
      for (const job of workerJobs.current.values())
        job.reject(new Error(event.message || "Time could not advance."));
      workerJobs.current.clear();
    };
    workerWorldRef.current = latest.current.world;
    worker.postMessage({ type: "sync", world: latest.current.world });
    return () => {
      worker.terminate();
      workerRef.current = null;
      workerWorldRef.current = null;
      for (const job of workerJobs.current.values())
        job.reject(new Error("Time could not advance."));
      workerJobs.current.clear();
    };
  }, []);
  const [pending, setPending] = useState(false);
  const core = useMemo(
    () =>
      createTimeCommandCore({
        latest: () => latest.current,
        setPending,
        executeTimeCommand: (world, request) =>
          new Promise((resolve, reject) => {
            const worker = workerRef.current;
            if (!worker) {
              reject(new Error("Time is still preparing."));
              return;
            }
            // Normally the effect above has already synced this exact World.
            // Preserve correctness if a click races its first mount.
            if (workerWorldRef.current !== world) {
              workerWorldRef.current = world;
              worker.postMessage({ type: "sync", world });
            }
            const jobId = `time-${++nextWorkerJob.current}`;
            workerJobs.current.set(jobId, {
              baseWorld: world,
              resolve,
              reject,
            });
            worker.postMessage({ type: "advance", jobId, request });
          }),
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
 * The shell's runner, or null when this surface is mounted outside the
 * provider.
 *
 * A day control inside a feature panel reads this rather than
 * `useTimeCommand`: if there is no shared runner there is no one clock to
 * submit to, and the honest answer is to hide the control and say why instead
 * of opening a runner of its own on a developer proof page.
 */
export function useSharedTimeCommand(): TimeCommandRunner | null {
  return useContext(TimeCommandContext);
}

/**
 * The wording a control shows after the clock answers.
 *
 * Panels used to compare two Worlds themselves and print "A calendar
 * commitment must be resolved first." The runner reports the real reason, and
 * it names the commitment, so that is what a player reads; the older sentence
 * stays as the fallback for a report that carries no detail of its own, so the
 * meaning never goes missing.
 */
export const CALENDAR_COMMITMENT_NOTE =
  "A calendar commitment must be resolved first.";

export function describeTimeCommandReport(report: TimeCommandReport): string {
  const said = report.outcome.trim();
  const detail =
    said === "" || said === "No time passed."
      ? `${said ? `${said}\n` : ""}${CALENDAR_COMMITMENT_NOTE}`
      : report.outcome;
  return report.stoppedEarly && report.target
    ? `${stoppedEarlyLabel(report.target)}\n${detail}`
    : detail;
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
