import opening from "./data/history/opening.json" with { type: "json" };
import { makeIsoDate } from "../simulation/dates";
import { coreAPI } from "./state";
import { P } from "./parameters";
import {
  historyIntervals,
  orderedHistoryModules,
  PRE_START_VERSION,
  type HistoryModule,
} from "./history-contract";
import type { CoreState } from "./types";

export interface HistoryReceipt {
  readonly version: string;
  readonly fromInclusive: string;
  readonly throughExclusive: string;
  readonly status: "completed";
  readonly passes: readonly {
    moduleId: string;
    phase: string;
    tier: string;
    steps: number;
  }[];
}

// Opening-only lifecycle guard, not another clock or module registry.
const lifecycle = new WeakMap<CoreState, "running" | "completed" | "failed">();

/** Complete each economy pass, then people, then governments; never run a day. */
export function runPreStartHistory(
  core: CoreState,
  options: { fromInclusive?: string } = {},
): HistoryReceipt {
  if (lifecycle.has(core))
    throw new Error(
      "Pre-start history already attempted; create a fresh world.",
    );
  if (core.date !== core.startedAt || core.actCounters.size !== P.zero)
    throw new Error("Pre-start history requires an unplayed opening.");
  const startDate = makeIsoDate(core.startedAt);
  const fromInclusive = makeIsoDate(
    options.fromInclusive ?? opening.fromInclusive,
  );
  if (fromInclusive > startDate)
    throw new Error("History begins after the opening.");
  // Validate every contract and dependency before any producer writes.
  const modules = orderedHistoryModules([
    ...core.modules.values(),
  ] as HistoryModule[]);
  const api = coreAPI(core);
  const passes: {
    moduleId: string;
    phase: string;
    tier: string;
    steps: number;
  }[] = [];
  lifecycle.set(core, "running");
  try {
    for (const module of modules) {
      const pass = module.preStart!;
      const intervals = historyIntervals(fromInclusive, startDate, pass.tier);
      for (const interval of intervals) {
        const result: unknown = pass.step(
          api,
          Object.freeze({
            ...interval,
            startDate,
            version: PRE_START_VERSION,
            phase: pass.phase,
            tier: pass.tier,
          }),
        );
        if (result && typeof (result as { then?: unknown }).then === "function")
          throw new Error("Pre-start passes must be synchronous.");
        if (core.date !== startDate || core.actCounters.size !== P.zero)
          throw new Error("A pre-start pass advanced the live world.");
      }
      passes.push(
        Object.freeze({
          moduleId: module.id,
          phase: pass.phase,
          tier: pass.tier,
          steps: intervals.length,
        }),
      );
    }
    lifecycle.set(core, "completed");
    return Object.freeze({
      version: PRE_START_VERSION,
      fromInclusive,
      throughExclusive: startDate,
      status: "completed",
      passes: Object.freeze(passes),
    });
  } catch (error) {
    lifecycle.set(core, "failed");
    throw error;
  }
}
