/**
 * A property-tax growth cap in force limits how far a home's assessment may
 * rise in a year; the property tax bills (housing-property-tax.ts) read it
 * through the budgets module's terms.
 */
import type { CoreAPI } from "../types";
import { lawInForce } from "../modules/laws";
import { reachParameter } from "./group-b-people";

export const PROPERTY_TAX_CAP_KEY =
  "us-policy-positions:fiscal.cap-property-tax-growth";

/** The yearly assessment growth cap in force for the town, as a share; none when uncapped. */
export function propertyTaxCapShare(api: CoreAPI): number | undefined {
  // A cap at any level binds the assessments every level levies on.
  const capped = lawInForce(api, PROPERTY_TAX_CAP_KEY).levels.some(
    (level) => !level.setAside && level.row?.value === 1,
  );
  return capped ? reachParameter("propertyTaxGrowthCapShare") : undefined;
}
