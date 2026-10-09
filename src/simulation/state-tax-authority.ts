import powers from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import type { IsoDate } from "./types";
import type { TaxPowerEvidence } from "./tax-types";
import { STATES } from "./state-reference";

/**
 * What a state may do about its own sales, property and payroll taxes, read
 * from the powers catalog's state-level row. One lookup for every state, the
 * District of Columbia and the territories: nothing here names a place, and a
 * place the catalog does not bar may legislate. The catalog says what the state
 * constitution and federal preemption leave open; it carries no rate caps, so
 * the evidence says that plainly.
 */

export type StateTaxInstrument =
  "sales" | "property" | "payroll" | "corporate-income";

/** The catalog dial each state tax-terms question family turns on. */
export const STATE_TAX_DIAL_BY_INSTRUMENT: Readonly<
  Record<StateTaxInstrument, string>
> = {
  sales: "sales-tax",
  property: "property-tax",
  payroll: "payroll-tax",
  "corporate-income": "income-tax",
};

export const STATE_TAX_INSTRUMENT_BY_FAMILY: Readonly<
  Record<string, StateTaxInstrument>
> = {
  sales: "sales",
  property: "property",
  payroll: "payroll",
  corporate: "corporate-income",
};

export function isStateTaxInstrument(
  value: string | undefined,
): value is StateTaxInstrument {
  return Object.values(STATE_TAX_INSTRUMENT_BY_FAMILY).some(
    (instrument) => instrument === value,
  );
}

/** The evidence a state tax proposal rests on, or null where the catalog says
 * a state may not levy this tax. */
export function stateTaxPowerEvidenceFor(
  jurisdictionKey: string,
  instrument: StateTaxInstrument,
  asOf: IsoDate,
): TaxPowerEvidence | null {
  if (
    !/^US-[A-Z]{2}$/.test(jurisdictionKey) ||
    !Object.hasOwn(STATES, jurisdictionKey.slice(3))
  )
    return null;
  const dial = powers.dials.find(
    (row) => row.id === STATE_TAX_DIAL_BY_INSTRUMENT[instrument],
  );
  const level = dial?.levels.state;
  if (!dial || !level || level.may === "no") return null;
  const estimated = level.status !== "sourced";
  return {
    key: `state-tax-authority:${jurisdictionKey.slice(3)}:${instrument}`,
    jurisdictionKey,
    level: "STATE",
    instrument,
    asOf,
    sourceArtifactId: `powers-catalog:${dial.id}.state`,
    sourceSha256: "",
    sourceUrl: level.source ?? dial.id,
    citations: [
      `powers catalog ${dial.id} (state): ${level.may}`,
      `status ${level.status}${estimated ? " (estimated)" : ""}`,
      level.limits ?? "no limits recorded",
    ],
    constraints: [
      `${level.limits ?? "No limits recorded"}. The catalog does not give this state's rate caps or voter steps.`,
    ],
    authorityStatus: level.may,
    estimated,
  };
}
