import { useCallback, useEffect, useRef, useState } from "react";
import type { World } from "../simulation";
import {
  crisisStopAfter,
  crisisStopBaseline,
  type CrisisStop,
} from "../presentation/crisis-shell";

/**
 * A protected CRISIS decision raised while time was passing.
 *
 * Call `watch` on the World a time control is about to submit from; when the
 * World that comes back carries a decision only the played character can
 * make, `stop` says so and names where the decision lives. This reads the
 * record after the command; it is not a clock and it cannot itself halt one.
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
    if (since === null) return;
    baseline.current = null;
    const raised = crisisStopAfter(world, since);
    if (raised) setStop(raised);
  }, [world]);
  const watch = useCallback(() => {
    baseline.current = crisisStopBaseline(latest.current);
  }, []);
  const clear = useCallback(() => setStop(null), []);
  return { stop, watch, clear };
}
