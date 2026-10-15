import { stateKeyForJurisdiction } from "../life-places";
import type { EntityId, World } from "../types";
import { stateOfJurisdiction } from "./outlets";

/**
 * One calendar and one penalty for every state body that oversees campaign
 * money, until each state's own rule is read. Its name is researched (below).
 *
 * Every state has somebody who reviews candidates' campaign-finance reports
 * and hears complaints about them, but the game has read only legislative
 * ethics bodies (`state-ethics-bodies.ts`), and those do not hear a governor's
 * or a mayor's campaign money. How long each state's steps take and what it
 * fines are not researched. Until they are, every state follows the federal
 * rule, the one real rule the game has read: no state is drawn a calendar of
 * its own, and no place is a special case. Filed with the research queue as
 * `state-campaign-finance-regulators`; a researched state's own rule replaces
 * this one for that state, never the other way round.
 *
 * Each value says where it comes from:
 * - intake, 5 days: RULE, 52 U.S.C. 30109(a)(1): "Within 5 days after
 *   receipt of a complaint, the Commission shall notify" the respondent.
 * - notice, 15 days: RULE, the same subsection: the respondent may answer
 *   "within 15 days after notification".
 * - answer, 60 days, and inquiry, 90 days: HAND-SET, the same authored
 *   intervals the game's own federal procedure uses (`procedures.ts`), so a
 *   state matter and a federal one move at the same pace. MEASURED for
 *   comparison: the FEC closed 154 enforcement cases in fiscal 2025 in an
 *   average of 502 days, 61 percent within 15 months (FEC, FY 2027
 *   Congressional Budget Justification, p. 36). Both calendars are faster
 *   than that.
 * - reportReviewDays, 30 days: ESTIMATED FROM AVERAGE. The FEC's standard is
 *   to process a filed report within 30 days of receipt, and it met it for
 *   88 percent of reports in fiscal 2025 (same source); its review of a
 *   report can then flag a payment without a complaint.
 * - civil penalty per payment: ESTIMATED FROM AVERAGE, the FEC's negotiated
 *   civil penalties in fiscal 2025 ($1,045,500) over the cases it closed
 *   (154), about $6,789. That average counts dismissed cases, which lowers
 *   it, and a case often covers several payments, which raises it. The legal
 *   limit is higher: "the greater of $24,885 or an amount equal to any
 *   contribution or expenditure involved" (11 CFR 111.24(a)(1), as adjusted
 *   January 3, 2025).
 */
export const STATE_OVERSIGHT_RULE = {
  version: "state-oversight-federal-rule-v1",
  provenance: "federal-rule-for-every-state",
  /**
   * The name used only where a state's regulator is not recorded (the
   * territories other than Puerto Rico). HAND-SET: one form for every such
   * place; Guam's real body carries this name.
   */
  nameForm: "Election Commission",
  /** Days for each step of a complaint. */
  intervalDays: {
    intake: 5,
    notice: 15,
    answer: 60,
    inquiry: 90,
  },
  /**
   * Days after a payment reaches a public filing before the body's own review
   * of filed reports can flag it without anybody complaining.
   */
  reportReviewDays: 30,
  /** Civil penalty per payment found to be personal use, in cents. */
  civilPenaltyPerPaymentMinorUnits: Math.round((1_045_500 * 100) / 154),
} as const;

/**
 * The real body that hears campaign-finance complaints in each jurisdiction,
 * by name only (ChatGPT research, 2026-09-22,
 * `docs/research/chatgpt-answers/2026-09-22-campaign-finance-regulators`).
 * Where a jurisdiction splits filing from enforcement, this is the body that
 * investigates or decides. Its calendar and penalties are the one rule above:
 * the research marks each state's own unknown, so none is taken from it.
 */
export const STATE_CAMPAIGN_FINANCE_REGULATOR_NAMES: Readonly<
  Record<string, string>
> = {
  "US-AL": "Alabama State Ethics Commission",
  "US-AK": "Alaska Public Offices Commission",
  "US-AZ": "Arizona Secretary of State",
  "US-AR": "Arkansas Ethics Commission",
  "US-CA": "California Fair Political Practices Commission",
  "US-CO": "Colorado Secretary of State",
  "US-CT": "Connecticut State Elections Enforcement Commission",
  "US-DE": "Delaware State Election Commissioner",
  "US-FL": "Florida Elections Commission",
  "US-GA": "Georgia State Ethics Commission",
  "US-HI": "Hawaii Campaign Spending Commission",
  "US-ID": "Idaho Secretary of State",
  "US-IL": "Illinois State Board of Elections",
  "US-IN": "Indiana Election Commission",
  "US-IA": "Iowa Ethics and Campaign Disclosure Board",
  "US-KS": "Kansas Governmental Ethics Commission",
  "US-KY": "Kentucky Registry of Election Finance",
  "US-LA": "Louisiana Board of Ethics",
  "US-ME": "Maine Commission on Governmental Ethics and Election Practices",
  "US-MD": "Maryland State Board of Elections",
  "US-MA": "Massachusetts Office of Campaign and Political Finance",
  "US-MI": "Michigan Bureau of Elections",
  "US-MN": "Minnesota Campaign Finance and Public Disclosure Board",
  "US-MS": "Mississippi Secretary of State",
  "US-MO": "Missouri Ethics Commission",
  "US-MT": "Montana Commissioner of Political Practices",
  "US-NE": "Nebraska Accountability and Disclosure Commission",
  "US-NV": "Nevada Secretary of State",
  "US-NH": "New Hampshire Secretary of State",
  "US-NJ": "New Jersey Election Law Enforcement Commission",
  "US-NM": "New Mexico State Ethics Commission",
  "US-NY": "New York State Board of Elections",
  "US-NC": "North Carolina State Board of Elections",
  "US-ND": "North Dakota Secretary of State",
  "US-OH": "Ohio Elections Commission",
  "US-OK": "Oklahoma Ethics Commission",
  "US-OR": "Oregon Secretary of State",
  "US-PA": "Pennsylvania Department of State",
  "US-RI": "Rhode Island Board of Elections",
  "US-SC": "South Carolina State Ethics Commission",
  "US-SD": "South Dakota Secretary of State",
  "US-TN": "Tennessee Registry of Election Finance",
  "US-TX": "Texas Ethics Commission",
  "US-UT": "Utah Lieutenant Governor's Office",
  "US-VT": "Vermont Attorney General",
  "US-VA": "Virginia Department of Elections",
  "US-WA": "Washington State Public Disclosure Commission",
  "US-WV": "West Virginia Secretary of State",
  "US-WI": "Wisconsin Ethics Commission",
  "US-WY": "Wyoming Secretary of State",
  "US-DC": "District of Columbia Office of Campaign Finance",
  "US-PR": "Puerto Rico Office of the Electoral Comptroller",
};

export interface GeneratedStateOversightBody {
  readonly stateJurisdictionId: EntityId;
  readonly name: string;
  readonly intervalDays: {
    readonly intake: number;
    readonly notice: number;
    readonly answer: number;
    readonly inquiry: number;
  };
  readonly reportReviewDays: number;
  readonly civilPenaltyPerPaymentMinorUnits: number;
}

/**
 * The oversight body for the state `jurisdictionId` belongs to, or null where
 * the World records no state for it. Read-only and draws nothing: every state
 * has the same calendar and penalty, and only the name is the state's own.
 */
export function generatedStateOversightBody(
  world: World,
  jurisdictionId: EntityId | null,
): GeneratedStateOversightBody | null {
  const stateId = stateOfJurisdiction(world, jurisdictionId);
  const state = stateId ? world.jurisdictions[stateId] : undefined;
  if (!stateId || !state) return null;
  const rule = STATE_OVERSIGHT_RULE;
  const stateKey = stateKeyForJurisdiction(state);
  return {
    stateJurisdictionId: stateId,
    name:
      (stateKey ? STATE_CAMPAIGN_FINANCE_REGULATOR_NAMES[stateKey] : null) ??
      `${state.name} ${rule.nameForm}`,
    intervalDays: { ...rule.intervalDays },
    reportReviewDays: rule.reportReviewDays,
    civilPenaltyPerPaymentMinorUnits: rule.civilPenaltyPerPaymentMinorUnits,
  };
}
