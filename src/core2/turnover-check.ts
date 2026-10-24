/**
 * Aggregate evidence only, never imported by actor rules: how a played year's
 * hires, quits, layoffs and other separations compare with the BLS JOLTS
 * annual averages, and the CPS absence rate by industry the wider population's
 * absence will be checked against (SG-CORE-residents-cadence). Real rates
 * check a town's totals; they never decide one worker's outcome.
 */
import bands from "../../data/research/people/jolts-cps-turnover-absence-2025.json" with { type: "json" };
import { residentsRuntime } from "./modules/residents";
import { countedHeadsOf } from "./residents-economy";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

export type TurnoverKind = "hires" | "quits" | "layoffs" | "separations";

/** The JOLTS monthly rate, percent of employment, for an industry row (the total when none is named). */
export function joltsRate(
  kind: "hires" | "totalSeparations" | "quits" | "layoffsAndDischarges",
  industry = "Total",
): number | undefined {
  return (bands.jolts[kind].rates as Record<string, number>)[industry];
}

/** The CPS share of full-time wage and salary workers absent in a survey week, percent. */
export function absenceRate(industry = "Private sector"): number | undefined {
  return (bands.cpsAbsence.rates as Record<string, number>)[industry];
}

export interface TurnoverReport {
  /** People employed at the end of the year: a full person's job is one, a counted worker's is the household weight it stands for. */
  readonly employed: number;
  /** Changes in the year by kind, in people (a counted worker's change is the household weight it stands for), with the record ids of the first few. */
  readonly counts: Readonly<Record<string, number>>;
  readonly ids: Readonly<Record<string, readonly string[]>>;
  /** Monthly rates, percent of employment: what the town did and what JOLTS says. */
  readonly rates: Readonly<
    Record<TurnoverKind, { town: number; jolts: number | undefined }>
  >;
}

/** One played year of the jobs engine's changes, as monthly rates against JOLTS. */
export function turnoverReport(
  core: CoreState,
  from: string,
  to: string,
): TurnoverReport {
  const api = coreAPI(core);
  const changes = api
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .rows() as unknown as {
    id: string;
    kind: string;
    date?: string;
    jobId?: string;
    personId?: string;
  }[];
  const counts: Record<string, number> = {};
  const ids: Record<string, string[]> = {};
  for (const row of changes) {
    const date = row.date ?? row.id.split(":")[1] ?? "";
    if (date < from || date >= to) continue;
    // The jobs engine's own rule: one for a full person's job, the household
    // weight for a counted worker's, so the JOLTS denominator and the event
    // counts are in the same population units.
    const heads =
      row.jobId && !core.jobs.has(row.jobId) && row.personId
        ? countedHeadsOf(core, row.personId)
        : 1;
    counts[row.kind] = (counts[row.kind] ?? 0) + heads;
    const seen = (ids[row.kind] ??= []);
    if (seen.length < 3) seen.push(row.id);
  }
  let employed = 0;
  for (const job of core.jobs.values()) if (!job.endsAt) employed += 1;
  for (const job of residentsRuntime(core)?.jobs.values() ?? [])
    if (!job.endsAt) employed += countedHeadsOf(core, job.personId);
  const months = 12;
  const rate = (n: number) => (employed ? (100 * n) / months / employed : 0);
  const separations =
    (counts.quit ?? 0) +
    (counts.layoff ?? 0) +
    (counts.closure ?? 0) +
    (counts["left-work"] ?? 0);
  return {
    employed,
    counts,
    ids,
    rates: {
      hires: { town: rate(counts.hire ?? 0), jolts: joltsRate("hires") },
      quits: { town: rate(counts.quit ?? 0), jolts: joltsRate("quits") },
      layoffs: {
        town: rate((counts.layoff ?? 0) + (counts.closure ?? 0)),
        jolts: joltsRate("layoffsAndDischarges"),
      },
      separations: {
        town: rate(separations),
        jolts: joltsRate("totalSeparations"),
      },
    },
  };
}
