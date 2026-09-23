import { stableHash } from "../ids";
import { stateKeyForJurisdiction } from "../life-places";
import type { EntityId, World } from "../types";
import { stateOfJurisdiction } from "./outlets";

/**
 * UNRESEARCHED calendar and penalties for the state body that oversees
 * campaign money. Its name is researched (below); the rest is generated.
 *
 * Every state has somebody who reviews candidates' campaign-finance reports
 * and hears complaints about them, but the game has read only legislative
 * ethics bodies (`state-ethics-bodies.ts`), and those do not hear a governor's
 * or a mayor's campaign money. Each state's real regulator is now named, but
 * how long its steps take and what it fines are not researched, so those are
 * drawn once per state from this range and its own key: the same state always
 * has the same calendar in every save, and different states differ. The
 * generated name forms remain only for a state whose key is not recorded.
 *
 * None of these values is any state's law. Filed with the research queue as
 * `state-campaign-finance-regulators`; a researched row replaces the
 * generated one for its state, never the other way round.
 */
export const UNRESEARCHED_STATE_OVERSIGHT = {
  version: "generated-state-oversight-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  nameForms: [
    "Campaign Finance Board",
    "Ethics Commission",
    "Public Disclosure Commission",
    "Elections Enforcement Commission",
    "Board of Ethics and Elections",
    "Fair Political Practices Commission",
    "Public Offices Commission",
  ],
  /** Inclusive day ranges for each step of a complaint. */
  intervalDays: {
    intake: [7, 21],
    notice: [14, 30],
    answer: [21, 60],
    inquiry: [30, 120],
  },
  /**
   * Days after a payment reaches a public filing before the body's own review
   * of filed reports can flag it without anybody complaining.
   */
  reportReviewDays: [45, 120],
  /** Civil penalty per payment found to be personal use, in cents. */
  civilPenaltyPerPaymentMinorUnits: [50_000, 500_000],
} as const;

/**
 * The real body that hears campaign-finance complaints in each jurisdiction,
 * by name only (ChatGPT research, 2026-09-22,
 * `docs/research/chatgpt-answers/2026-09-22-campaign-finance-regulators`).
 * Where a jurisdiction splits filing from enforcement, this is the body that
 * investigates or decides. Its calendar and penalties are still the generated
 * profile above: the research marks them unknown, so none is taken from it.
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

function draw(
  seed: string,
  label: string,
  [low, high]: readonly [number, number],
): number {
  const unit =
    Number.parseInt(stableHash(`${seed}:${label}`).slice(0, 8), 16) /
    0x1_0000_0000;
  return low + Math.floor(unit * (high - low + 1));
}

/**
 * The generated body for the state `jurisdictionId` belongs to, or null where
 * the World records no state for it. Read-only and draws nothing from the
 * World's random stream: the body is a function of the state alone.
 */
export function generatedStateOversightBody(
  world: World,
  jurisdictionId: EntityId | null,
): GeneratedStateOversightBody | null {
  const stateId = stateOfJurisdiction(world, jurisdictionId);
  const state = stateId ? world.jurisdictions[stateId] : undefined;
  if (!stateId || !state) return null;
  const rule = UNRESEARCHED_STATE_OVERSIGHT;
  const stateKey = stateKeyForJurisdiction(state);
  const seed = `${rule.version}:${stateKey ?? state.slug}`;
  const form =
    rule.nameForms[draw(seed, "name", [0, rule.nameForms.length - 1])]!;
  return {
    stateJurisdictionId: stateId,
    name:
      (stateKey ? STATE_CAMPAIGN_FINANCE_REGULATOR_NAMES[stateKey] : null) ??
      `${state.name} ${form}`,
    intervalDays: {
      intake: draw(seed, "intake", rule.intervalDays.intake),
      notice: draw(seed, "notice", rule.intervalDays.notice),
      answer: draw(seed, "answer", rule.intervalDays.answer),
      inquiry: draw(seed, "inquiry", rule.intervalDays.inquiry),
    },
    reportReviewDays: draw(seed, "report-review", rule.reportReviewDays),
    civilPenaltyPerPaymentMinorUnits:
      Math.round(
        draw(seed, "penalty", rule.civilPenaltyPerPaymentMinorUnits) / 5_000,
      ) * 5_000,
  };
}
