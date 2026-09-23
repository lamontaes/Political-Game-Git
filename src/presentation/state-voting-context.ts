/**
 * The November 2024 voting survey, as the browser reads it.
 *
 * Historical survey context, never simulated voter attributes or legal
 * eligibility.
 *
 * ## Why the projection lives here and not in the source substrate
 *
 * It used to live in `src/source/adapters/state-voting-context.ts` and this
 * module re-exported it. `ARCHITECTURE.md` states that the source substrate
 * (`src/source`) is Node-only and excluded from the browser app, and those
 * re-exports were value imports, so a browser module held a live edge into
 * Node-only code. The `A16` invariant in `tests/source/substrate.test.ts`
 * caught it, and the right answer was to move rather than to widen the rule.
 *
 * Nothing was lost in the move: the projection needs no substrate code at
 * runtime. `US_STATE_NAMES` and `makeIsoDate` both come from `src/simulation`,
 * which the browser may import, and the rest is a filter over plain rows.
 *
 * ## Why the record types are declared here
 *
 * What the browser actually loads is the JSON that
 * `scripts/source/export-state-voting-context.ts` writes into
 * `public/data/state-voting/v1/`. So the types below describe that exported
 * shape — a reader's schema for a wire format — rather than importing the
 * substrate's own `CpsVotingRecord`, which is where the Node-only dependency
 * came from in the first place.
 *
 * The schema is deliberately narrower than the producer's. It is exact about
 * the fields this side reads and treats evidence as present-but-uninterpreted,
 * because nothing in the browser inspects a locator. The substrate's richer
 * types stay in `src/source/domains/census-voting-registration/types.ts` and
 * remain structurally assignable to these, which is what lets the export script
 * build a shard without a cast. `tests/source/state-voting-replay.test.ts`
 * replays every delivered shard against the admitted corpus, so the two cannot
 * drift apart silently.
 *
 * One property is carried over deliberately. Five of the eight source states
 * have no `value` key at all, and that absence is the design: an unknown must
 * not be readable as a zero. The union below keeps that, so `?? 0` still has
 * nothing to attach to on this side either.
 */
import { US_STATE_NAMES } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { makeIsoDate } from "../simulation/dates";

/**
 * Provenance travels with the data. This side records where a figure was read
 * without interpreting the locator, whose seven shapes are the substrate's
 * business and are not something the browser branches on.
 */
export interface ExportedEvidence {
  readonly artifactId: string;
  readonly locator: Readonly<Record<string, unknown>>;
  readonly providerNativeId?: string;
}

export type CpsVotingTable = "4a" | "4b" | "4c";
export type CpsMetricKey =
  | "adultPopulation"
  | "citizenAdultPopulation"
  | "reportedRegistered"
  | "registeredTotalPercent"
  | "registeredTotalMoe"
  | "registeredCitizenPercent"
  | "registeredCitizenMoe"
  | "reportedVoted"
  | "votedTotalPercent"
  | "votedTotalMoe"
  | "votedCitizenPercent"
  | "votedCitizenMoe";

/** The exported form of the source value algebra, at the reader's precision. */
export type CpsSourcedNumber =
  | {
      readonly state: "KNOWN";
      readonly value: number;
      readonly evidence: readonly ExportedEvidence[];
      readonly release: "FINAL" | "PRELIMINARY" | "REVISED";
      readonly asOf: string;
    }
  | {
      readonly state: "HISTORICAL";
      readonly value: number;
      readonly evidence: readonly ExportedEvidence[];
      readonly period: { readonly start: string; readonly end: string };
    }
  | {
      readonly state: "NOT_YET_OPERATIVE";
      readonly value: number | null;
      readonly evidence: readonly ExportedEvidence[];
      readonly operativeFrom: string;
    }
  | {
      readonly state:
        | "CONFLICTING"
        | "NOT_APPLICABLE"
        | "NO_REQUIREMENT_FOUND"
        | "SUPPRESSED"
        | "UNKNOWN";
    };

export interface CpsVotingCell {
  readonly literal: string;
  readonly value: CpsSourcedNumber;
  readonly unit: "people" | "percent" | "percentage-points";
  readonly denominator: "none" | "total-adults" | "citizen-adults";
  readonly confidenceLevel: 90 | null;
  /** Published count columns use whole thousands; zero may reflect rounding. */
  readonly publishedResolution: 1000 | 0.1;
  readonly evidence: ExportedEvidence;
}

export interface CpsVotingRecord {
  readonly recordId: string;
  readonly table: CpsVotingTable;
  readonly geographyName: string;
  readonly geographyLevel: "nation" | "state-or-district";
  readonly group: string;
  readonly dimension: "total" | "sex" | "race-and-hispanic-origin" | "age";
  readonly period: "2024-11";
  readonly releaseDate: "2025-04-30";
  readonly universe: "civilian-noninstitutionalized-age-18-and-over";
  readonly collection: "self-or-proxy-reported";
  readonly metrics: Readonly<Record<CpsMetricKey, CpsVotingCell>>;
}

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
  if (stateUsps === "PR")
    return empty(
      "This survey covers the fifty states and the District of Columbia. It does not report Puerto Rico.",
    );
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

/** Lazy browser loading of the exported survey delivery. */
export async function queryStateVotingContext(
  selection: { readonly stateUsps: string; readonly asOf: string },
  options: {
    readonly baseUrl?: string;
    readonly fetchJson?: (url: string) => Promise<unknown>;
  } = {},
): Promise<StateVotingContext> {
  const missing = () =>
    projectStateVotingContext(selection.stateUsps, selection.asOf, []);
  if (!CPS_STATE_NAMES[selection.stateUsps] || selection.asOf < "2025-04-30")
    return missing();
  const load =
    options.fetchJson ??
    (async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Survey lookup failed");
      return response.json() as Promise<unknown>;
    });
  const base = (options.baseUrl ?? "/data/state-voting/v1").replace(/\/$/, "");
  try {
    const manifest = (await load(
      `${base}/manifest.json`,
    )) as StateVotingManifest;
    if (
      manifest.schemaVersion !== "1" ||
      manifest.inputClass !== "production" ||
      manifest.releaseDate !== "2025-04-30" ||
      !/^[a-f0-9]{64}$/.test(manifest.corpusSha256) ||
      !Array.isArray(manifest.sources) ||
      manifest.sources.length < 5 ||
      manifest.sources.some(
        (s) => !/^[a-f0-9]{64}$/.test(s.sha256) || !/^https:\/\//.test(s.url),
      )
    )
      return missing();
    const path = manifest.states[selection.stateUsps];
    if (path !== `${selection.stateUsps}.json`) return missing();
    const shard = (await load(`${base}/${path}`)) as StateVotingShard;
    if (
      shard.schemaVersion !== "1" ||
      shard.stateUsps !== selection.stateUsps ||
      shard.stateName !== CPS_STATE_NAMES[selection.stateUsps] ||
      !Array.isArray(shard.records)
    )
      return missing();
    return projectStateVotingContext(
      selection.stateUsps,
      selection.asOf,
      shard.records,
      manifest.sources,
    );
  } catch {
    return missing();
  }
}
