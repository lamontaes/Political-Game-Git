import type { IsoDate, World } from "../simulation/types";
import { applyObserverHistoryCheckpoint } from "../presentation/observer-history-checkpoint";
import type { PreparedRecord } from "../presentation/browser-world-repository";
import type {
  ObserverWorkerCommand,
  ObserverWorkerMessage,
} from "./observer-run-protocol";

export interface ObserverRunView {
  readonly date: IsoDate;
  readonly running: boolean;
  readonly busy: boolean;
  readonly problem: string | null;
}

type PendingRequest = {
  readonly resolve: (world: World) => void;
  readonly reject: (error: Error) => void;
};

/**
 * One worker for one watched World. The worker owns time between checkpoints;
 * React and the existing save store receive only validated, ordered Worlds.
 * The controller lives at PlayingScreen scope, so opening another surface does
 * not unmount the runner or silently discard weeks.
 */
export class ObserverRunController {
  readonly #listeners = new Set<() => void>();
  #view: ObserverRunView;
  #worker: Worker | null = null;
  #world: World;
  #commit: (next: World, base: World, prepared: PreparedRecord) => void =
    () => {};
  #pendingCheckpoint: {
    readonly checkpointId: number;
    readonly world: World;
    readonly requestId?: number;
  } | null = null;
  #requests = new Map<number, PendingRequest>();
  #nextRequestId = 1;
  #pausePromise: Promise<World> | null = null;
  readonly #beforeUnload = (event: BeforeUnloadEvent): void => {
    // A running worker may hold weeks that have not reached React or storage.
    // The ordinary unsaved-work guard cannot see those weeks yet.
    if (
      !this.#worker ||
      (!this.#view.running &&
        !this.#view.busy &&
        this.#view.date === this.#world.currentDate)
    )
      return;
    event.preventDefault();
    event.returnValue = "";
  };

  constructor(world: World) {
    this.#world = world;
    this.#view = {
      date: world.currentDate,
      running: false,
      busy: false,
      problem: null,
    };
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.#beforeUnload);
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  readonly getSnapshot = (): ObserverRunView => this.#view;

  setCommit(
    commit: (next: World, base: World, prepared: PreparedRecord) => void,
  ): void {
    this.#commit = commit;
  }

  /** Called when the parent has actually rendered a checkpoint. */
  syncWorld(world: World): void {
    const pending = this.#pendingCheckpoint;
    if (pending && pending.world === world) {
      this.#world = world;
      this.#pendingCheckpoint = null;
      this.#post({ kind: "ack", checkpointId: pending.checkpointId });
      if (pending.requestId !== undefined) {
        this.#requests.get(pending.requestId)?.resolve(world);
        this.#requests.delete(pending.requestId);
        this.#update({ busy: false });
      }
      this.#update({ date: world.currentDate });
      return;
    }
    if (world !== this.#world && !pending) {
      // A continuation or another control changed the World. A worker based
      // on the old one must never write over it later.
      this.#stopWorker("The watched world changed while the clock was moving.");
      this.#world = world;
      this.#update({ date: world.currentDate, running: false, busy: false });
    }
  }

  start(): void {
    if (this.#view.running || this.#view.busy || this.#pendingCheckpoint)
      return;
    if (!this.#ensureWorker()) return;
    this.#update({ running: true, problem: null });
    this.#post({ kind: "run" });
  }

  pause(): Promise<World> {
    if (this.#pausePromise) return this.#pausePromise;
    if (!this.#worker && !this.#pendingCheckpoint)
      return Promise.resolve(this.#world);
    const requestId = this.#nextRequestId++;
    this.#update({ running: false, busy: true });
    const requested = new Promise<World>((resolve, reject) => {
      this.#requests.set(requestId, { resolve, reject });
      this.#post({ kind: "pause", requestId });
    });
    this.#pausePromise = requested.finally(() => {
      this.#pausePromise = null;
    });
    return this.#pausePromise;
  }

  step(days: number): Promise<World> {
    if (this.#view.running || this.#view.busy || this.#pendingCheckpoint) {
      return Promise.reject(new Error("The observer clock is already moving."));
    }
    if (!this.#ensureWorker()) {
      return Promise.reject(
        new Error(this.#view.problem ?? "The clock is unavailable."),
      );
    }
    const requestId = this.#nextRequestId++;
    this.#update({ busy: true, problem: null });
    return new Promise<World>((resolve, reject) => {
      this.#requests.set(requestId, { resolve, reject });
      this.#post({ kind: "step", days, requestId });
    });
  }

  dispose(): void {
    this.#stopWorker("The watched world was closed.");
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.#beforeUnload);
    }
    this.#listeners.clear();
  }

  #ensureWorker(): boolean {
    if (this.#worker) return true;
    if (typeof Worker === "undefined") {
      this.#update({
        problem: "This browser cannot run the world in the background.",
      });
      return false;
    }
    try {
      const worker = new Worker(
        new URL("./observer-run.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );
      worker.onmessage = (event: MessageEvent<ObserverWorkerMessage>) =>
        this.#receive(event.data);
      worker.onerror = () =>
        this.#fail("The background world stopped unexpectedly.");
      this.#worker = worker;
      this.#post({ kind: "init", world: this.#world });
      return true;
    } catch {
      this.#update({
        problem: "This browser could not start the background world.",
      });
      return false;
    }
  }

  #post(command: ObserverWorkerCommand): void {
    this.#worker?.postMessage(command);
  }

  #receive(message: ObserverWorkerMessage): void {
    if (message.kind === "progress") {
      this.#update({ date: message.date });
      return;
    }
    if (message.kind === "problem") {
      this.#fail(message.message);
      return;
    }
    if (this.#pendingCheckpoint) {
      this.#fail("The background world sent overlapping checkpoints.");
      return;
    }
    if (message.checkpoint === null) {
      this.#post({ kind: "ack", checkpointId: message.checkpointId });
      if (message.requestId !== undefined) {
        this.#requests.get(message.requestId)?.resolve(this.#world);
        this.#requests.delete(message.requestId);
        this.#update({ busy: false, date: this.#world.currentDate });
      }
      return;
    }
    try {
      const next = applyObserverHistoryCheckpoint(
        this.#world,
        message.checkpoint,
      );
      if (
        next.currentDate === this.#world.currentDate &&
        next.actionSequence === this.#world.actionSequence &&
        next.history.nextSequence === this.#world.history.nextSequence
      ) {
        this.#post({ kind: "ack", checkpointId: message.checkpointId });
        if (message.requestId !== undefined) {
          this.#requests.get(message.requestId)?.resolve(this.#world);
          this.#requests.delete(message.requestId);
          this.#update({ busy: false });
        }
        return;
      }
      this.#pendingCheckpoint = {
        checkpointId: message.checkpointId,
        world: next,
        ...(message.requestId === undefined
          ? {}
          : { requestId: message.requestId }),
      };
      if (!message.prepared) {
        throw new Error("The background checkpoint has no saved snapshot.");
      }
      this.#commit(next, this.#world, message.prepared);
    } catch (error) {
      this.#fail(
        error instanceof Error
          ? error.message
          : "The checkpoint could not be read.",
      );
    }
  }

  #fail(message: string): void {
    const error = new Error(message);
    for (const request of this.#requests.values()) request.reject(error);
    this.#requests.clear();
    this.#pendingCheckpoint = null;
    this.#stopWorker();
    this.#update({
      date: this.#world.currentDate,
      running: false,
      busy: false,
      problem: message,
    });
  }

  #stopWorker(reason?: string): void {
    this.#worker?.terminate();
    this.#worker = null;
    this.#pendingCheckpoint = null;
    if (reason) {
      const error = new Error(reason);
      for (const request of this.#requests.values()) request.reject(error);
      this.#requests.clear();
    }
  }

  #update(change: Partial<ObserverRunView>): void {
    this.#view = { ...this.#view, ...change };
    for (const listener of this.#listeners) listener();
  }
}
