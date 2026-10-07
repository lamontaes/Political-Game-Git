import matrix from "../../data/research/money/local-tax-authority-matrix.json" with { type: "json" };
import type { TaxPowerEvidence } from "./tax-types";
import { makeIsoDate } from "./dates";
import { governmentUnit } from "./government-units";
import { municipalGovernmentByKey } from "./municipal-government";

/**
 * What a state lets its counties and municipalities do about four taxes.
 *
 * One lookup for every place. It reads the 92N matrix per state (a secondary
 * research input, so every answer is marked estimated and cites its matrix
 * cell) and lets the first-party production corpus override the matrix where
 * it has a record. A place the matrix has no row for (D.C., the territories)
 * takes the most common value across the states it covers, marked as such.
 * Nothing here names a state; the data does.
 */

/** The opening every new game shares; local authority is read as of then. */
const LOCAL_TAX_BASELINE_AS_OF = makeIsoDate("2026-01-01");

export type LocalTaxInstrument =
  "property" | "sales" | "payroll" | "corporate-income";
export type LocalTaxLevel = "COUNTY" | "MUNICIPALITY";
export type LocalTaxAuthorityStatus =
  "allowed" | "piggyback" | "specific" | "prohibited" | "unknown-estimated";

export interface LocalTaxAuthority {
  readonly stateUsps: string;
  readonly level: LocalTaxLevel;
  readonly instrument: LocalTaxInstrument;
  /** `unknown-estimated` only when the matrix has no row for this place. */
  readonly status: LocalTaxAuthorityStatus;
  /** Whether a local law on this tax can take effect: the status, or the
   * national most-common value where the status is unknown-estimated. */
  readonly permits: boolean;
  readonly estimated: boolean;
  readonly basis: "production-record" | "matrix-cell" | "national-most-common";
  /** The matrix path or production record this answer rests on. */
  readonly cell: string;
  /** The state's general rule for local taxing power, always carried. */
  readonly generalRule: {
    readonly dillonsRule: string;
    readonly fiscalHomeRuleScope: string;
  };
  readonly taxType: string | null;
}

type MatrixState = (typeof matrix.states)[keyof typeof matrix.states];
const STATES = matrix.states as Readonly<Record<string, MatrixState>>;

const PERMITTING: ReadonlySet<string> = new Set([
  "allowed",
  "piggyback",
  "specific",
]);

/** The instrument each tax-terms question family turns. */
export const LOCAL_TAX_INSTRUMENT_BY_FAMILY: Readonly<
  Record<string, LocalTaxInstrument>
> = {
  property: "property",
  sales: "sales",
  payroll: "payroll",
  corporate: "corporate-income",
};

export function localTaxAuthority(input: {
  readonly stateUsps: string;
  readonly level: LocalTaxLevel;
  readonly instrument: LocalTaxInstrument;
}): LocalTaxAuthority {
  const { stateUsps, level, instrument } = input;
  const row = STATES[stateUsps];
  const generalRule = row
    ? {
        dillonsRule: row.generalRule.dillonsRule,
        fiscalHomeRuleScope: row.generalRule.fiscalHomeRuleScope,
      }
    : { ...matrix.national.generalRule };
  const production = matrix.production.find(
    (record) =>
      record.stateUsps === stateUsps &&
      record.level === level &&
      record.instrument === instrument,
  );
  if (production)
    return {
      stateUsps,
      level,
      instrument,
      status: production.status as LocalTaxAuthorityStatus,
      permits: PERMITTING.has(production.status),
      estimated: false,
      basis: "production-record",
      cell: production.recordId,
      generalRule,
      taxType: null,
    };
  if (!row) {
    const status =
      instrument === "property"
        ? matrix.national.property
        : instrument === "sales"
          ? matrix.national.sales
          : matrix.national.incomePayroll;
    return {
      stateUsps,
      level,
      instrument,
      status: "unknown-estimated",
      permits: PERMITTING.has(status),
      estimated: true,
      basis: "national-most-common",
      cell: `92N matrix: no row for ${stateUsps}; ${matrix.national.basis}`,
      generalRule,
      taxType: null,
    };
  }
  const cellFor =
    instrument === "property"
      ? row.property
      : instrument === "sales"
        ? row.sales
        : row.incomePayroll;
  return {
    stateUsps,
    level,
    instrument,
    status: cellFor.status as LocalTaxAuthorityStatus,
    permits: PERMITTING.has(cellFor.status),
    estimated: true,
    basis: "matrix-cell",
    cell: cellFor.cell,
    generalRule,
    taxType:
      instrument === "payroll" || instrument === "corporate-income"
        ? row.incomePayroll.taxType
        : null,
  };
}

/** The legal-power evidence a local tax proposal carries: secondary and
 * estimated unless a production record backs it. Same input, same bytes. */
export function localTaxPowerEvidenceFor(input: {
  readonly stateUsps: string;
  readonly level: LocalTaxLevel;
  readonly governmentKey: string;
  readonly instrument: LocalTaxInstrument;
}): TaxPowerEvidence {
  const authority = localTaxAuthority(input);
  return {
    key: `local-tax-authority:${input.stateUsps}:${input.level}:${input.instrument}`,
    jurisdictionKey: `US-${input.stateUsps}`,
    level: input.level,
    governmentKey: input.governmentKey,
    instrument: input.instrument,
    // The rule was researched on the matrix date and is carried back as the
    // baseline every game opens with (a 2026 opening), like the other acquired
    // baselines; the research date stays in the citations.
    asOf: LOCAL_TAX_BASELINE_AS_OF,
    sourceArtifactId: authority.cell,
    sourceSha256: "",
    sourceUrl: matrix.matrix.path,
    citations: [
      authority.cell,
      `researched ${matrix.matrix.asOf}, carried back to the game's opening baseline`,
      `status ${authority.status}${authority.estimated ? " (estimated from the 92N matrix)" : ""}`,
      `state general rule: ${authority.generalRule.dillonsRule}, ${authority.generalRule.fiscalHomeRuleScope}`,
    ],
    constraints: [
      authority.permits
        ? "The state lets this level of local government levy this tax; the matrix does not give the exact rate caps or voter steps."
        : "The state does not let this level of local government levy this tax.",
    ],
    authorityStatus: authority.status,
    estimated: authority.estimated,
  };
}

/** The state and level of one compiled local government, or null when the
 * key names no county, municipality or township. */
export function localTaxGovernment(
  governmentKey: string,
): { readonly stateUsps: string; readonly level: LocalTaxLevel } | null {
  const unit = governmentUnit(governmentKey);
  if (unit) {
    if (unit.unitType === "county")
      return { stateUsps: unit.stateUsps, level: "COUNTY" };
    if (unit.unitType === "municipality" || unit.unitType === "township")
      return { stateUsps: unit.stateUsps, level: "MUNICIPALITY" };
    return null;
  }
  const municipal = municipalGovernmentByKey(governmentKey);
  return municipal
    ? {
        stateUsps: municipal.state.replace(/^US-/, ""),
        level: "MUNICIPALITY",
      }
    : null;
}

/** The tax-terms question a local law on this instrument answers. */
export function localTaxTermsQuestionKey(
  level: LocalTaxLevel,
  instrument: LocalTaxInstrument,
): string {
  const family = Object.entries(LOCAL_TAX_INSTRUMENT_BY_FAMILY).find(
    ([, value]) => value === instrument,
  )![0];
  return `us-tax-terms:${level === "COUNTY" ? "county" : "city"}.${family}-tax-terms`;
}
