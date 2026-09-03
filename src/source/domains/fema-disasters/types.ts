/**
 * FEMA disaster declaration records.
 *
 * A record establishes that the President declared a disaster or emergency of a
 * stated type, on a stated date, designating a stated area, and that stated
 * assistance programs were made available there. It is an *administrative* fact
 * about a government decision.
 *
 * It is not a measurement of a hazard. Nothing here supports a recurrence
 * interval, an arrival rate, a seasonality curve, a severity score, a casualty
 * count, a damage figure or a simulation trigger, and no adapter may derive
 * one: a declaration is evidence that a government acted, and the set of
 * declarations is shaped by who asked, when, and under what programme rules, as
 * much as by the weather.
 *
 * The two axes #66 got right are kept. `incidentType` is the physical hazard the
 * agency recorded; `declarationType` is the legal instrument. Both are the
 * provider's own values, so neither is derived from the other.
 */

import type { Evidence } from "../../core/index";

/**
 * How this substrate reads the provider's `designatedArea` string.
 *
 * A derivation, and labelled one: OpenFEMA publishes no area-type field, and
 * #66 hand-injected one into what it called raw source. The rule is stated in
 * `normalize.ts` and it has to distinguish "Cherokee (County)" in North
 * Carolina from the "Eastern Band of Cherokee Indians" in the same declaration.
 */
export type DesignatedAreaType = "county-or-parish" | "statewide" | "tribal" | "other";

export interface FemaDeclarationRecord {
  readonly recordId: string;

  /** Provider-native fields, exactly as OpenFEMA published them. */
  readonly femaDeclarationString: string;
  readonly disasterNumber: number;
  readonly state: string;
  /** `DR` major disaster, `EM` emergency, `FM` fire management assistance. */
  readonly declarationType: string;
  readonly declarationTitle: string;
  readonly declarationDate: string;
  readonly fiscalYearDeclared: number | null;
  /** The physical hazard the agency recorded. Never a severity or a rate. */
  readonly incidentType: string | null;
  readonly incidentBeginDate: string | null;
  /** Null for a declaration whose incident has not been closed. Not a zero. */
  readonly incidentEndDate: string | null;
  readonly disasterCloseoutDate: string | null;
  readonly designatedArea: string;
  readonly tribalRequest: boolean | null;
  readonly fipsStateCode: string | null;
  readonly fipsCountyCode: string | null;
  readonly placeCode: string | null;
  readonly region: number | null;
  readonly declarationRequestNumber: string | null;
  readonly lastIndividualAssistanceFilingDate: string | null;
  readonly incidentId: string | null;

  /**
   * Programme flags, kept distinct.
   *
   * `ihProgramDeclared` is the modern Individuals and Households Program;
   * `iaProgramDeclared` is the legacy pre-2003 Individual Assistance Program
   * and is routinely false on modern declarations. #66 coerced the second into
   * the first on eight real records. They are different programmes and they
   * stay different fields.
   */
  readonly ihProgramDeclared: boolean | null;
  readonly iaProgramDeclared: boolean | null;
  readonly paProgramDeclared: boolean | null;
  readonly hmProgramDeclared: boolean | null;

  /** The provider's own record identity and revision markers. */
  readonly providerRecordId: string;
  readonly providerRecordHash: string | null;
  readonly providerLastRefresh: string | null;

  /** Derived by this substrate from `designatedArea` and `tribalRequest`. */
  readonly derivedDesignatedAreaType: DesignatedAreaType;

  readonly evidence: Evidence;
}
