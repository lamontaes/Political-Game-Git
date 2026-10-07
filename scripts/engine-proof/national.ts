import { runParity, schedule, type RouteAdapter } from "./parity";
import { nationalPlacePlan } from "./places";

/** Serial, bounded-memory proof. No jurisdiction is filtered out. An exception
 * aborts with prior onRow receipts intact; incomplete coverage is never a pass. */
export async function runNationalParity(
  seed: string,
  days: number,
  baseline: RouteAdapter,
  candidate: RouteAdapter,
  onRow?: (
    completed: number,
    row: Awaited<ReturnType<typeof runParity>>["comparison"],
  ) => void,
) {
  const plan = nationalPlacePlan(seed);
  const steps = schedule("days", 1, days);
  const rows = [];
  for (const selected of plan.jurisdictions) {
    const result = await runParity(
      { seed: selected.seed, placeKey: selected.placeKey, steps },
      baseline,
      candidate,
    );
    rows.push({
      ...selected,
      comparison: result.comparison,
      baselineWatched: result.baseline.watched,
      candidateWatched: result.candidate.watched,
    });
    onRow?.(rows.length, result.comparison);
  }
  return {
    plan,
    rows,
    completed: rows.length,
    days,
    equal: rows.length === 56 && rows.every((row) => row.comparison.equal),
  };
}
