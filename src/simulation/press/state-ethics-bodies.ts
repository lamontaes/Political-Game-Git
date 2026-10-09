import { researchRuleTable } from "../research-rule-tables";
import type { ProcedureKey } from "./records";

/**
 * Which body hears a legislative ethics complaint, state by state.
 *
 * Every row below was read from that state's own official sources in the
 * ethics-routing research of 2026-09-22 (`state-legislative-ethics-procedure`,
 * 24 jurisdictions). Kentucky is not here: it has a hand-written procedure in
 * `procedures.ts` whose step deadlines were read from statute and rule, which
 * is strictly more than this table can say.
 *
 * What this table establishes, and all it establishes: the name of the body a
 * complaint is filed with, what that state calls the proceeding, how the
 * chambers are arranged around it, and the instruments that say so. It does
 * **not** establish a timeline. None of these rows carries statutory answer
 * periods, inquiry deadlines or sanction powers, so the procedure built from
 * them names the real body and declares its own intervals as authored. A row
 * that claimed Kentucky's deadlines for Ohio would be a lie about the law.
 *
 * The rows are data, not logic. Adding a state is adding an entry here and its
 * key to `PROCEDURE_KEYS`; nothing in the routing compares a state by name.
 *
 * `candidacyPackPrefixes` is empty for the fifteen states that have a
 * researched ethics body but no legislative rule pack yet. Those states still
 * route correctly for a seated legislator, by the state their legislative work
 * sits in; they cannot yet route a candidate, because there is no candidacy to
 * route. That is a gap in the legislature packs, not in this table.
 */
export interface StateLegislativeEthicsBody {
  /** The state key the places corpus uses, e.g. `US-OH`. */
  readonly stateJurisdictionKey: string;
  readonly procedureKey: ProcedureKey;
  /** The body a complaint is filed with. */
  readonly intakeBody: string;
  /** Other bodies the research names in the same route. */
  readonly additionalBodies: readonly string[];
  /** What the state calls the proceeding, in its own words. */
  readonly proceedingTerm: string;
  readonly chamberArrangement: string;
  /** Constitutional, statutory or rule citations, as the research recorded them. */
  readonly authority: readonly string[];
  readonly sourceRefs: readonly string[];
  /** Candidacy packs whose contests this body has authority over. */
  readonly candidacyPackPrefixes: readonly string[];
  /** What the research explicitly declined to establish. Record-side only. */
  readonly routingLimits: readonly string[];
}

export const STATE_LEGISLATIVE_ETHICS_BODIES: readonly StateLegislativeEthicsBody[] =
  researchRuleTable(
    "legislativeEthicsBodies",
  ) as readonly StateLegislativeEthicsBody[];

/**
 * The accountability-institution key for a row, derived from its state key so
 * the two cannot drift apart. Kentucky's is spelled out in `procedures.ts`
 * because its procedure predates this table.
 */
export function ethicsInstitutionKey(
  body: StateLegislativeEthicsBody,
): `state-legislative-ethics:${string}` {
  return `state-legislative-ethics:${body.stateJurisdictionKey.slice(3).toLowerCase()}`;
}
