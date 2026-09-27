import type { World } from "../simulation/types";

/**
 * The worker keeps the complete canonical World. Between checkpoints the
 * observer UI only needs a date; at a checkpoint it receives the current
 * non-history state and the records appended since the last checkpoint.
 * This avoids cloning decades of old history across the worker boundary each
 * quarter. The ordinary World and snapshot format remain unchanged.
 */
export type ObserverHistoryCheckpoint =
  | { readonly kind: "full"; readonly world: World }
  | {
      readonly kind: "append";
      readonly worldId: World["id"];
      readonly previousDate: World["currentDate"];
      readonly previousSequence: number;
      readonly head: Omit<World, "history">;
      readonly nextSequence: number;
      readonly appended: Readonly<Record<string, readonly unknown[]>>;
    };

export function observerHistoryCheckpoint(
  previous: World,
  next: World,
): ObserverHistoryCheckpoint {
  if (
    previous.id !== next.id ||
    previous.currentDate > next.currentDate ||
    previous.history.nextSequence > next.history.nextSequence
  ) {
    return { kind: "full", world: next };
  }
  const before = previous.history as unknown as Record<string, unknown>;
  const after = next.history as unknown as Record<string, unknown>;
  const appended: Record<string, readonly unknown[]> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === "nextSequence") continue;
    const oldValue = before[key];
    const newValue = after[key];
    if (
      (oldValue !== undefined && !Array.isArray(oldValue)) ||
      !Array.isArray(newValue) ||
      (oldValue !== undefined && newValue.length < oldValue.length)
    ) {
      return { kind: "full", world: next };
    }
    const oldRecords = (oldValue ?? []) as readonly unknown[];
    // Writers may replace an array, but they may not rewrite a prior record.
    // If a non-append change occurs, carry the full World rather than lose it.
    if (oldRecords !== newValue) {
      for (let index = 0; index < oldRecords.length; index += 1) {
        if (oldRecords[index] !== newValue[index]) {
          return { kind: "full", world: next };
        }
      }
    }
    appended[key] = newValue.slice(oldRecords.length);
  }
  const { history: _history, ...head } = next;
  void _history;
  return {
    kind: "append",
    worldId: next.id,
    previousDate: previous.currentDate,
    previousSequence: previous.history.nextSequence,
    head,
    nextSequence: next.history.nextSequence,
    appended,
  };
}

export function applyObserverHistoryCheckpoint(
  previous: World,
  checkpoint: ObserverHistoryCheckpoint,
): World {
  if (checkpoint.kind === "full") return checkpoint.world;
  if (
    previous.id !== checkpoint.worldId ||
    previous.currentDate !== checkpoint.previousDate ||
    previous.history.nextSequence !== checkpoint.previousSequence
  ) {
    throw new Error("The observer checkpoint does not follow this world.");
  }
  const history: Record<string, unknown> = { ...previous.history };
  for (const [key, records] of Object.entries(checkpoint.appended)) {
    const oldRecords = history[key];
    if (oldRecords !== undefined && !Array.isArray(oldRecords)) {
      throw new Error("An observer checkpoint changed a history field.");
    }
    history[key] = [...((oldRecords ?? []) as readonly unknown[]), ...records];
  }
  history.nextSequence = checkpoint.nextSequence;
  return {
    ...checkpoint.head,
    history: history as unknown as World["history"],
  };
}
