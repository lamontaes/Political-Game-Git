import { useCallback, useEffect, useRef, useState } from "react";
import type { World } from "../simulation";
import {
  crisisStopAfter,
  crisisStopBaseline,
  crisisStopStillOpen,
  type CrisisStop,
} from "../presentation/crisis-shell";

/**
 * A protected CRISIS decision raised while time was passing.
 *
 * Call `watch` on the World a time control is about to submit from; when the
 * World that comes back carries a decision only the played character can
 * make, `stop` says so and names where the decision lives. It clears itself
 * once none of the decisions it named is still open. This reads the record
 * after the command; it is not a clock and it cannot itself halt one.
 */
export function useCrisisStop(world: World): {
  readonly stop: CrisisStop | null;
  readonly watch: () => void;
  readonly clear: () => void;
} {
  const [stop, setStop] = useState<CrisisStop | null>(null);
  const baseline = useRef<number | null>(null);
  const latest = useRef(world);
  useEffect(() => {
    latest.current = world;
  });
  useEffect(() => {
    const since = baseline.current;
    baseline.current = null;
    const raised = since === null ? null : crisisStopAfter(world, since);
    // A stop outlives the week that raised it only while its decision is
    // still open: once made, or once its window closes, it goes away.
    setStop(
      (current) =>
        raised ??
        (current && crisisStopStillOpen(world, current) ? current : null),
    );
  }, [world]);
  const watch = useCallback(() => {
    baseline.current = crisisStopBaseline(latest.current);
  }, []);
  const clear = useCallback(() => setStop(null), []);
  return { stop, watch, clear };
}
