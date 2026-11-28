/**
 * The justice parameters and the prison-voting table: a justice parameter (marking its stopgap), and whether a place lets an incarcerated person vote. They read only their data files; src/core2/justice-law.ts re-exports them.
 */
import prisonVoting from "../../data/research/justice/prison-voting-2026.json" with { type: "json" };
import rows from "./data/justice/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import type { CoreAPI, Source } from "./types";

const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** A justice parameter, marking its stopgap when it carries one. */
export function justiceParameter(api: CoreAPI, key: string): number {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

interface PrisonVotingRow {
  readonly incarceratedMayVote: boolean;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly basis?: string;
}

const PRISON_VOTING = prisonVoting as unknown as {
  readonly source: string;
  readonly places: Readonly<Record<string, PrisonVotingRow>>;
};

/**
 * Whether a person serving a felony prison sentence in the state may vote.
 * Maine, Vermont, the District of Columbia and Puerto Rico let them; the
 * other places do not (data/research/justice/prison-voting-2026.json).
 */
export function incarceratedMayVote(
  api: CoreAPI,
  stateKey: string,
): { may: boolean; source: Source } {
  const row = PRISON_VOTING.places[stateKey];
  // A place with no row takes the rule of the 48 states that bar the vote.
  const may = row?.incarceratedMayVote ?? false;
  return {
    may,
    source: {
      tag: row?.tag ?? "ESTIMATED",
      citation: row?.basis ?? PRISON_VOTING.source,
      asOf: api.state.date,
      ...(row?.tag === "SOURCED"
        ? {}
        : { estimatedFrom: row?.basis ?? "the common rule of the states" }),
    } as Source,
  };
}
