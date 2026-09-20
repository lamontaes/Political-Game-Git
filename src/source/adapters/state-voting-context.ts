/** Historical survey context, never simulated voter attributes or legal eligibility. */
import { US_STATE_NAMES } from "../../simulation/nationwide-world/state-executive-candidacy-packs";
import { makeIsoDate } from "../../simulation/dates";
import type { CpsVotingRecord } from "../domains/census-voting-registration/types";
export type {
  CpsVotingRecord,
  CpsVotingCell,
  CpsMetricKey,
} from "../domains/census-voting-registration/types";

export const CPS_STATE_NAMES: Readonly<Record<string, string>> = {
  ...US_STATE_NAMES,
  DC: "District of Columbia",
};
export interface StateVotingSource {
  readonly artifactId: string;
  readonly sha256: string;
  readonly url: string;
  readonly retrievedAt: string;
  readonly releaseDate: string | null;
}
export interface StateVotingShard {
  readonly schemaVersion: "1";
  readonly stateUsps: string;
  readonly stateName: string;
  readonly records: readonly CpsVotingRecord[];
}
export interface StateVotingManifest {
  readonly schemaVersion: "1";
  readonly inputClass: "production";
  readonly corpusSha256: string;
  readonly releaseDate: "2025-04-30";
  readonly sources: readonly StateVotingSource[];
  readonly states: Readonly<Record<string, string>>;
}
export interface StateVotingContext {
  readonly referenceKind: "dated-real-world-survey";
  readonly stateUsps: string;
  readonly asOf: string;
  readonly period: "2024-11";
  readonly totals: CpsVotingRecord | null;
  readonly breakdowns: {
    readonly sex: readonly CpsVotingRecord[];
    readonly raceAndHispanicOrigin: readonly CpsVotingRecord[];
    readonly age: readonly CpsVotingRecord[];
  };
  readonly sources: readonly StateVotingSource[];
  readonly unavailableReason: string | null;
  readonly omissions: readonly string[];
}

/** Exact state identity and release cutoff; no fallback to national or neighboring rows. */
export function projectStateVotingContext(
  stateUsps: string,
  asOf: string,
  records: readonly CpsVotingRecord[],
  sources: readonly StateVotingSource[] = [],
): StateVotingContext {
  const empty = (reason: string): StateVotingContext => ({
    referenceKind: "dated-real-world-survey",
    stateUsps,
    asOf,
    period: "2024-11",
    totals: null,
    breakdowns: { sex: [], raceAndHispanicOrigin: [], age: [] },
    sources: [],
    unavailableReason: reason,
    omissions: [
      "Administrative voter registration",
      "Legal voting eligibility",
      "Party registration",
    ],
  });
  const name = CPS_STATE_NAMES[stateUsps];
  if (!name) return empty("No reviewed state identity matches this selection.");
  try {
    makeIsoDate(asOf);
  } catch {
    return empty("The selected reference date is invalid.");
  }
  if (asOf < "2025-04-30")
    return empty(
      "These November 2024 survey tables had not been released by this date.",
    );
  const rows = records.filter(
    (row) =>
      row.geographyName === name.toUpperCase() &&
      row.geographyLevel === "state-or-district" &&
      row.releaseDate <= asOf &&
      row.period === "2024-11" &&
      row.universe === "civilian-noninstitutionalized-age-18-and-over",
  );
  const total = rows.filter((r) => r.table === "4a" && r.dimension === "total");
  if (total.length !== 1)
    return empty("No unique compatible state survey total is available.");
  return {
    ...empty(""),
    totals: total[0]!,
    breakdowns: {
      sex: rows.filter((r) => r.table === "4b" && r.dimension === "sex"),
      raceAndHispanicOrigin: rows.filter(
        (r) => r.table === "4b" && r.dimension === "race-and-hispanic-origin",
      ),
      age: rows.filter((r) => r.table === "4c" && r.dimension === "age"),
    },
    sources,
    unavailableReason: null,
  };
}
