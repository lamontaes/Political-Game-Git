/**
 * Engines that act on the day a stance moves (interest-group membership
 * follows the view) register here; the views engine calls each one after the
 * move is stored: a heard case (a stance row), or a change in the person's
 * own life that their view reads (no stance row; `tellLifeChange`). The list lives in a file that imports no engine, so an
 * engine that registers while it loads never meets the views engine half
 * loaded (the campaign engine and the views engine import each other).
 */
import type { CoreAPI, PersonId } from "./types";

export type StanceListener = (
  api: CoreAPI,
  personId: PersonId,
  topic: string,
) => void;

const stanceListeners: StanceListener[] = [];

export function registerStanceListener(listener: StanceListener): void {
  if (!stanceListeners.includes(listener)) stanceListeners.push(listener);
}

/** Tell every registered engine that a person's stance on a topic moved. */
export function stanceMoved(
  api: CoreAPI,
  personId: PersonId,
  topic: string,
): void {
  for (const listener of stanceListeners) listener(api, personId, topic);
}
