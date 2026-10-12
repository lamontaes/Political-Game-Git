import type matrix from "../../../data/research/money/local-tax-authority-matrix.json";
import type incomeScope from "../../../data/research/money/local-income-tax-scope.json";
import type { IsoDate } from "../../simulation/types";
import type { TaxPowerEvidence } from "../../simulation/tax-types";
export interface LocalTaxFacts {
  readonly matrix: typeof matrix;
  readonly incomeScope: typeof incomeScope;
}
export type LocalTaxInstrument =
  "property" | "sales" | "payroll" | "corporate-income" | "wage-income";

export type LocalTaxLevel = "COUNTY" | "MUNICIPALITY";

export type LocalTaxAuthorityStatus =
  "allowed" | "piggyback" | "specific" | "prohibited" | "unknown-estimated";

export interface LocalTaxAuthority {
  readonly stateUsps: string;
  readonly level: LocalTaxLevel;
  readonly instrument: LocalTaxInstrument;
  readonly status: LocalTaxAuthorityStatus;
  readonly permits: boolean;
  readonly estimated: boolean;
  readonly basis: "production-record" | "matrix-cell" | "national-most-common";
  readonly cell: string;
  readonly generalRule: {
    readonly dillonsRule: string;
    readonly fiscalHomeRuleScope: string;
  };
  readonly taxType: string | null;
}

const PERMITTING: ReadonlySet<string> = new Set([
  "allowed",
  "piggyback",
  "specific",
]);

export const LOCAL_TAX_INSTRUMENT_BY_FAMILY: Readonly<
  Record<string, LocalTaxInstrument>
> = {
  property: "property",
  sales: "sales",
  payroll: "payroll",
  corporate: "corporate-income",
  income: "wage-income",
};

export function localTaxAuthority(
  facts: LocalTaxFacts,
  input: {
    readonly stateUsps: string;
    readonly level: LocalTaxLevel;
    readonly instrument: LocalTaxInstrument;
  },
): LocalTaxAuthority {
  const { stateUsps, level, instrument } = input;
  const row = (
    facts.matrix.states as Readonly<
      Record<
        string,
        (typeof facts.matrix.states)[keyof typeof facts.matrix.states]
      >
    >
  )[stateUsps];
  const generalRule = row
    ? {
        dillonsRule: row.generalRule.dillonsRule,
        fiscalHomeRuleScope: row.generalRule.fiscalHomeRuleScope,
      }
    : { ...facts.matrix.national.generalRule };
  const production = facts.matrix.production.find(
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
        ? facts.matrix.national.property
        : instrument === "sales"
          ? facts.matrix.national.sales
          : facts.matrix.national.incomePayroll;
    return {
      stateUsps,
      level,
      instrument,
      status: "unknown-estimated",
      permits: PERMITTING.has(status),
      estimated: true,
      basis: "national-most-common",
      cell: `92N matrix: no row for ${stateUsps}; ${facts.matrix.national.basis}`,
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
  const incomeRule = facts.incomeScope.rules.find(
    (rule) => rule.taxType === row.incomePayroll.taxType,
  );
  const permittedScope =
    instrument !== "wage-income" ||
    Boolean(incomeRule?.levels.some((allowedLevel) => allowedLevel === level));
  return {
    stateUsps,
    level,
    instrument,
    status: (permittedScope
      ? cellFor.status
      : "prohibited") as LocalTaxAuthorityStatus,
    permits: permittedScope && PERMITTING.has(cellFor.status),
    estimated: true,
    basis: "matrix-cell",
    cell: permittedScope
      ? cellFor.cell
      : `${cellFor.cell}; ${facts.incomeScope.source}; ${row.incomePayroll.taxType}`,
    generalRule,
    taxType:
      instrument === "payroll" ||
      instrument === "corporate-income" ||
      instrument === "wage-income"
        ? row.incomePayroll.taxType
        : null,
  };
}

export function localTaxPowerEvidenceFor(
  facts: LocalTaxFacts,
  input: {
    readonly asOf: IsoDate;
    readonly stateUsps: string;
    readonly level: LocalTaxLevel;
    readonly governmentKey: string;
    readonly instrument: LocalTaxInstrument;
  },
): TaxPowerEvidence {
  const authority = localTaxAuthority(facts, input);
  return {
    key: `local-tax-authority:${input.stateUsps}:${input.level}:${input.instrument}`,
    jurisdictionKey: `US-${input.stateUsps}`,
    level: input.level,
    governmentKey: input.governmentKey,
    instrument: input.instrument,
    asOf: input.asOf,
    sourceArtifactId: authority.cell,
    sourceSha256: "",
    sourceUrl: facts.matrix.matrix.path,
    citations: [
      authority.cell,
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
