import type { World } from "../simulation";
import { isObserving } from "../presentation/life-continuation-shell";

/** The inspector receives only the actual paused snapshot of this Observer world. */
export function observerInspectorCheckpoint(
  current: World,
  paused: World,
): World | null {
  return isObserving(current) && isObserving(paused) && current.id === paused.id
    ? paused
    : null;
}
