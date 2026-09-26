import {
  advanceObservedWorld,
  advanceObservedWorldWeeks,
} from "../presentation/observer-world";
import { observerHistoryCheckpoint } from "../presentation/observer-history-checkpoint";
import { prepareWorldRecord } from "../presentation/browser-world-repository";
import type { World } from "../simulation/types";
import type {
  ObserverWorkerCommand,
  ObserverWorkerMessage,
} from "./observer-run-protocol";

// The worker owns one canonical World, advanced by the same ordinary clock as
// the visible controls. Posting a date does not copy its growing history.
const scope = self as unknown as {
  postMessage(message: ObserverWorkerMessage): void;
  onmessage: ((event: MessageEvent<ObserverWorkerCommand>) => void) | null;
};
const CHECKPOINT_WEEKS = 13;
const RUN_BATCH_WEEKS = 4;
let world: World | null = null;
let checkpointBase: World | null = null;
let wantedRun = false;
let waitingForAck = 0;
let weeksSinceCheckpoint = 0;
let nextCheckpointId = 1;
let timer: ReturnType<typeof setTimeout> | null = null;
let pendingPause: number | null = null;

function sendCheckpoint(requestId?: number): void {
  if (!world || !checkpointBase || waitingForAck) return;
  const checkpointId = nextCheckpointId++;
  waitingForAck = checkpointId;
  const unchanged = world === checkpointBase;
  scope.postMessage({
    kind: "checkpoint",
    checkpointId,
    checkpoint: unchanged
      ? null
      : observerHistoryCheckpoint(checkpointBase, world),
    ...(unchanged ? {} : { prepared: prepareWorldRecord(world) }),
    ...(requestId === undefined ? {} : { requestId }),
  });
}

function scheduleBatch(): void {
  if (!wantedRun || waitingForAck || timer !== null || !world) return;
  timer = setTimeout(() => {
    timer = null;
    if (!wantedRun || waitingForAck || !world) return;
    try {
      const weeks = Math.min(
        RUN_BATCH_WEEKS,
        CHECKPOINT_WEEKS - weeksSinceCheckpoint,
      );
      const next = advanceObservedWorldWeeks(world, weeks);
      if (next.currentDate === world.currentDate) {
        wantedRun = false;
        scope.postMessage({
          kind: "problem",
          message: "The world could not move on from here.",
        });
        return;
      }
      world = next;
      weeksSinceCheckpoint += weeks;
      scope.postMessage({ kind: "progress", date: next.currentDate });
      if (weeksSinceCheckpoint >= CHECKPOINT_WEEKS) sendCheckpoint();
      else scheduleBatch();
    } catch (error) {
      wantedRun = false;
      scope.postMessage({
        kind: "problem",
        message:
          error instanceof Error ? error.message : "Time could not pass.",
      });
    }
  }, 0);
}

scope.onmessage = (event) => {
  const command = event.data;
  if (command.kind === "init") {
    world = command.world;
    checkpointBase = command.world;
    return;
  }
  if (!world) return;
  if (command.kind === "run") {
    wantedRun = true;
    scheduleBatch();
    return;
  }
  if (command.kind === "pause") {
    wantedRun = false;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (waitingForAck) pendingPause = command.requestId;
    else sendCheckpoint(command.requestId);
    return;
  }
  if (command.kind === "ack") {
    if (waitingForAck !== command.checkpointId) return;
    waitingForAck = 0;
    checkpointBase = world;
    weeksSinceCheckpoint = 0;
    if (pendingPause !== null) {
      const requestId = pendingPause;
      pendingPause = null;
      sendCheckpoint(requestId);
    } else {
      scheduleBatch();
    }
    return;
  }
  if (command.kind === "step" && !wantedRun && !waitingForAck) {
    try {
      const next = advanceObservedWorld(world, command.days);
      if (next.currentDate === world.currentDate) {
        scope.postMessage({
          kind: "problem",
          message: "The world could not move on from here.",
        });
        return;
      }
      world = next;
      scope.postMessage({ kind: "progress", date: next.currentDate });
      sendCheckpoint(command.requestId);
    } catch (error) {
      scope.postMessage({
        kind: "problem",
        message:
          error instanceof Error ? error.message : "Time could not pass.",
      });
    }
  }
};
