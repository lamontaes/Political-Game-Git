import table from "../../../data/research/government/county-row-offices-by-state.json" with { type: "json" };
import type { GovernmentUnitIdentity } from "../government-units";
import { countyGoverningBodyRules } from "./county-governing-body-rules";

/**
 * The county row offices (sheriff, prosecutor, clerk, treasurer, assessor,
 * coroner) a county elects, from one table of states
 * (`data/research/government/county-row-offices-by-state.json`). One reader for
 * every county: a state's row where it has one, the common pattern otherwise,
 * each answer marked read or estimated with where it came from. A Puerto Rico
 * municipio and a county the game's list holds no government for are never
 * asked. Duties are not here (CO-4); this says who may hold the office.
 */

export const COUNTY_ROW_OFFICE_KEYS = [
  "sheriff",
  "prosecutor",
  "clerk",
  "treasurer",
  "assessor",
  "coroner",
] as const;

export type CountyRowOfficeKey = (typeof COUNTY_ROW_OFFICE_KEYS)[number];

export function isCountyRowOfficeKey(key: string): key is CountyRowOfficeKey {
  return (COUNTY_ROW_OFFICE_KEYS as readonly string[]).includes(key);
}

const ROW_ROLE_PREFIX = "leader:county-row-";

/** The role a county row officer holds in the county's organization. */
export function countyRowOfficeRoleKind(
  office: CountyRowOfficeKey,
): `leader:${string}` {
  return `${ROW_ROLE_PREFIX}${office}`;
}

/** Which row office a role names, or null for any other role. */
export function countyRowOfficeFromRoleKind(
  roleKind: string | null,
): CountyRowOfficeKey | null {
  if (!roleKind?.startsWith(ROW_ROLE_PREFIX)) return null;
  const key = roleKind.slice(ROW_ROLE_PREFIX.length);
  return isCountyRowOfficeKey(key) ? key : null;
}

export interface CountyRowOfficeRule {
  readonly office: CountyRowOfficeKey;
  readonly title: string;
  readonly elected: boolean;
  readonly basis: "read" | "estimated";
  /** Where the answer was read, or what the estimate rests on. */
  readonly source: string;
  /** A prosecutor elected for a circuit or district wider than the county. */
  readonly scope: "county" | "judicial-circuit" | "judicial-district";
}

interface OfficeDefault {
  readonly title: string;
  readonly elected: boolean;
  readonly basis: string;
  readonly basisNote: string;
  readonly sourceUrl: string | null;
}

interface StateRow {
  readonly elected?: boolean;
  readonly title?: string;
  readonly basis?: string;
  readonly sourceUrl?: string | null;
  readonly note?: string;
  readonly scope?: string;
}

const DEFAULTS = table.offices as unknown as Readonly<
  Record<CountyRowOfficeKey, OfficeDefault>
>;
const STATES = table.states as unknown as Readonly<
  Record<string, Partial<Record<CountyRowOfficeKey, StateRow>>>
>;

/** One office's rule in one state, or the common pattern where none is read. */
export function countyRowOfficeRule(
  stateUsps: string,
  office: CountyRowOfficeKey,
): CountyRowOfficeRule {
  const fallback = DEFAULTS[office];
  const row = STATES[stateUsps]?.[office];
  const read = row?.basis === "read";
  const scope = row?.scope;
  return {
    office,
    title: row?.title ?? fallback.title,
    elected: row?.elected ?? fallback.elected,
    basis: read ? "read" : "estimated",
    source: row
      ? [row.note, row.sourceUrl].filter(Boolean).join(" ") ||
        fallback.basisNote
      : `${fallback.basisNote}${fallback.sourceUrl ? ` ${fallback.sourceUrl}` : ""}`,
    scope:
      scope === "judicial-circuit" || scope === "judicial-district"
        ? scope
        : "county",
  };
}

/** The row offices this county elects, in a fixed order; none outside a county government. */
export function countyElectedRowOffices(
  unit: GovernmentUnitIdentity,
): readonly CountyRowOfficeRule[] {
  if (unit.unitType !== "county" || !unit.functionalActive) return [];
  // A county-equivalent governed under a municipal code (a municipio) has none.
  if (countyGoverningBodyRules(unit)?.basis === "municipal-code") return [];
  return COUNTY_ROW_OFFICE_KEYS.map((office) =>
    countyRowOfficeRule(unit.stateUsps, office),
  ).filter((rule) => rule.elected);
}
