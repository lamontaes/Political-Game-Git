import {
  CHIEF_EXECUTIVE_BASELINE_META,
  CHIEF_EXECUTIVE_BASELINE_ROWS,
} from "./chief-executive-baseline.generated";
import type { IsoDate } from "../types";

/**
 * Which office is each jurisdiction's chief executive, and how long its
 * ordinary full term runs — for all fifty states and, separately, for the
 * District of Columbia.
 *
 * This is the NATIONWIDE1 research baseline, and it is evidence, not law. The
 * distinction is the whole point of this file:
 *
 * - Nothing here is admitted through the rules-capability port. A value RULES
 *   admits for a state always wins over it.
 * - It is not a `verified` term rule either. A verified rule in
 *   `state-executive-term-rules.ts` carries the instrument's own words, read
 *   and hash-locked. These rows carry a citation and a locator, and for the
 *   governors an institutional summary rather than fifty constitutions; no
 *   excerpt was retrieved for any of them here.
 * - What it does is calibrate the game's own disclosed profile, so New
 *   Hampshire and Vermont run two-year terms rather than inheriting a
 *   four-year default nobody read. The rule the game applies stays a
 *   game profile, labelled as one, and carries this row as its calibration.
 *
 * `officeKind` keeps the District of Columbia from being a fifty-first
 * governor: its chief executive is a mayor, under its own Code.
 */

export type ChiefExecutiveOfficeKind = "state-governor" | "district-mayor";

export type ChiefExecutiveJurisdictionKind = "state" | "federal-district";

/**
 * How the value was come by. `institutional-overview` is a summary published
 * by an institution; `official-code-text` is the official code section itself,
 * cited but — in this repository — not retrieved word for word.
 */
export type ChiefExecutiveEvidenceClass =
  "institutional-overview" | "official-code-text";

export interface ChiefExecutiveBaselineRow {
  /** USPS-style key. `DC` is here, and is not a state. */
  readonly key: string;
  readonly name: string;
  readonly kind: ChiefExecutiveJurisdictionKind;
  readonly officeKind: ChiefExecutiveOfficeKind;
  readonly ordinaryTermYears: number;
  readonly source: string;
  readonly sourceLocator: string;
  readonly evidenceClass: ChiefExecutiveEvidenceClass;
  readonly checkedOn: IsoDate;
  readonly limits: string;
}

export { CHIEF_EXECUTIVE_BASELINE_META };

let rows: readonly ChiefExecutiveBaselineRow[] | null = null;

export function chiefExecutiveBaselineRows(): readonly ChiefExecutiveBaselineRow[] {
  rows ??= JSON.parse(
    CHIEF_EXECUTIVE_BASELINE_ROWS,
  ) as readonly ChiefExecutiveBaselineRow[];
  return rows;
}

let index: ReadonlyMap<string, ChiefExecutiveBaselineRow> | null = null;

/** The research row for a jurisdiction key, or null where there is none. */
export function chiefExecutiveBaseline(
  jurisdictionKey: string,
): ChiefExecutiveBaselineRow | null {
  index ??= new Map(chiefExecutiveBaselineRows().map((row) => [row.key, row]));
  return index.get(jurisdictionKey) ?? null;
}

/**
 * The sentence a player reads where this row calibrated something. It says
 * what was read and what was not, and never that the game applied the law.
 */
export function chiefExecutiveBaselineDisclosure(
  row: ChiefExecutiveBaselineRow,
): string {
  const evidence =
    row.evidenceClass === "official-code-text"
      ? `${row.source} ${row.sourceLocator}, cited but not quoted here`
      : `an institutional summary (${row.source}, ${row.sourceLocator}), not this jurisdiction's own instrument`;
  return `The ordinary ${row.ordinaryTermYears}-year term comes from research checked on ${row.checkedOn}: ${evidence}. It sets the length the game's disclosed rule uses; it is not this jurisdiction's law as the game has read it.`;
}
