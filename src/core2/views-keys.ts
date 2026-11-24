/**
 * The survey keys the views engine opens people's views from (CES 2024): the
 * nation's, each state's and each county's cells. They live in a file that
 * imports no engine, so a module that reads them while it loads (the
 * electorate's national engagement) never meets the views engine half loaded.
 */
import keysJson from "./data/views/ces-2024-views.json" with { type: "json" };

export interface CellKey {
  n: number;
  mean: number;
  sd: number;
  engagement?: number;
  shares?: Readonly<Record<string, number>>;
}
export interface StateKey extends CellKey {
  byAge: Readonly<Record<string, CellKey>>;
  educationShares: Readonly<
    Record<string, Readonly<Record<string, number>> | null>
  >;
  faithShares: Readonly<
    Record<string, Readonly<Record<string, number>> | null>
  >;
}
export const VIEWS_KEYS = keysJson as unknown as {
  version: string;
  source: { citation: string };
  ageBands: readonly string[];
  national: CellKey;
  states: Readonly<Record<string, StateKey>>;
  counties: Readonly<Record<string, CellKey>>;
  nationalEducationShares: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  nationalFaithShares: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  profileShift: Readonly<
    Record<
      string,
      Readonly<
        Record<string, Readonly<Record<string, { n: number; shift: number }>>>
      >
    >
  >;
};
