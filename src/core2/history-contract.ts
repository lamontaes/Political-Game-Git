import opening from "./data/history/opening.json" with { type: "json" };
import parameters from "./data/history/parameters.json" with { type: "json" };
import { makeIsoDate } from "../simulation/dates";
import { P, parameter, type Parameter } from "./parameters";
import type { CoreAPI, CoreModule } from "./types";

export const PRE_START_VERSION = opening.version;
export type HistoryPhase = "economy" | "people" | "governments";
export type HistoryTier = "monthly" | "quarterly";

/** Half-open civil-date interval. The live clock remains on startDate. */
export interface HistoryStep {
  readonly version: typeof PRE_START_VERSION;
  readonly fromInclusive: string;
  readonly throughExclusive: string;
  readonly startDate: string;
  readonly phase: HistoryPhase;
  readonly tier: HistoryTier;
}

export interface HistoryPass {
  readonly version: typeof PRE_START_VERSION;
  readonly phase: HistoryPhase;
  readonly tier: HistoryTier;
  /** Within a phase, named producers must precede this module. */
  readonly after?: readonly string[];
  readonly step: (api: CoreAPI, interval: Readonly<HistoryStep>) => void;
}

/** Passes belong to ordinary registerModule entries and use their owned tables. */
export interface HistoryModule extends CoreModule {
  preStart?: HistoryPass;
}

export function historyIntervals(
  fromInclusive: string,
  throughExclusive: string,
  tier: HistoryTier,
): readonly Readonly<
  Pick<HistoryStep, "fromInclusive" | "throughExclusive">
>[] {
  let cursor = makeIsoDate(fromInclusive);
  const end = makeIsoDate(throughExclusive);
  if (cursor > end) throw new Error("History window is reversed.");
  if (tier !== "monthly" && tier !== "quarterly")
    throw new Error("History requires a monthly or quarterly tier.");
  const intervals: Pick<HistoryStep, "fromInclusive" | "throughExclusive">[] =
    [];
  const months =
    tier === "monthly"
      ? P.one
      : parameter(
          "monthsPerQuarter",
          parameters as Readonly<Record<string, Parameter>>,
        );
  while (cursor < end) {
    const date = new Date(`${cursor}T00:00:00Z`);
    const month = date.getUTCMonth();
    const next = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        tier === "monthly"
          ? month + months
          : Math.floor(month / months) * months + months,
        P.one,
      ),
    )
      .toISOString()
      .slice(P.zero, "YYYY-MM-DD".length);
    const through = next < end ? next : end;
    intervals.push(
      Object.freeze({ fromInclusive: cursor, throughExclusive: through }),
    );
    cursor = makeIsoDate(through);
  }
  return Object.freeze(intervals);
}

export function orderedHistoryModules(
  modules: readonly HistoryModule[],
): readonly HistoryModule[] {
  const byId = new Map<string, HistoryModule>();
  for (const module of modules) {
    if (byId.has(module.id))
      throw new Error(`Duplicate history module: ${module.id}`);
    byId.set(module.id, module);
    const pass = module.preStart;
    if (
      pass &&
      (pass.version !== PRE_START_VERSION ||
        !opening.phases.includes(pass.phase) ||
        !["monthly", "quarterly"].includes(pass.tier) ||
        typeof pass.step !== "function")
    )
      throw new Error(`Invalid pre-start contract: ${module.id}`);
  }
  const passes = modules.filter((module) => module.preStart);
  for (const module of passes) {
    for (const id of module.preStart!.after ?? []) {
      const dependency = byId.get(id);
      if (
        !dependency?.preStart ||
        id === module.id ||
        opening.phases.indexOf(dependency.preStart.phase) >
          opening.phases.indexOf(module.preStart!.phase)
      )
        throw new Error(`Invalid history dependency: ${module.id} after ${id}`);
    }
  }
  const ordered: HistoryModule[] = [];
  const completed = new Set<string>();
  for (const phase of opening.phases) {
    const pending = passes.filter((module) => module.preStart!.phase === phase);
    while (pending.length) {
      const index = pending.findIndex((module) =>
        (module.preStart!.after ?? []).every((id) => completed.has(id)),
      );
      if (index < P.zero) throw new Error("Cyclic history dependencies.");
      const [module] = pending.splice(index, P.one);
      ordered.push(module!);
      completed.add(module!.id);
    }
  }
  return Object.freeze(ordered);
}
