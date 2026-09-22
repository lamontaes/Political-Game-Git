import { stableHash } from "../ids";
import { stateKeyForJurisdiction } from "../life-places";
import type { EntityId, World } from "../types";
import { stateOfJurisdiction } from "./outlets";

/**
 * UNRESEARCHED. A generated state oversight body for campaign money and for
 * legislators in states whose own body has not been read.
 *
 * Every state has somebody who reviews candidates' campaign-finance reports
 * and hears complaints about them, but the game has read only legislative
 * ethics bodies (`state-ethics-bodies.ts`), and those do not hear a governor's
 * or a mayor's campaign money. Until a state's real regulator is researched,
 * it gets a body generated from this range: a realistic name, a calendar and
 * a civil-penalty scale drawn once per state from its own key, so the same
 * state always has the same body in every save and different states differ.
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
  const seed = `${rule.version}:${stateKeyForJurisdiction(state) ?? state.slug}`;
  const form =
    rule.nameForms[draw(seed, "name", [0, rule.nameForms.length - 1])]!;
  return {
    stateJurisdictionId: stateId,
    name: `${state.name} ${form}`,
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
