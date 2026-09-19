/**
 * Where campaign planning sits, and which control is the primary one.
 *
 * CRUNCH47 EXPERIENCE decision: the campaign's own weekly plan is the primary
 * planning surface. The per-action plan editor and the single "do it now" row
 * are not a second way in — they live inside the same planning region, after
 * the week, as its detailed editing and its explicit immediate action.
 *
 * Before this the week was a collapsed block beneath a per-action editor, so
 * the surface the campaign actually plans with was the one a player had to go
 * looking for. Nothing here knows about React; it only decides order and which
 * single slot carries primary weight, so "exactly one primary route" is a
 * property a test can hold the UI to rather than a claim in a comment.
 */

/** The three things a campaign planning region can hold, in reading order. */
export type CampaignPlanningSlot = "week" | "detail" | "immediate";

export interface CampaignPlanningInput {
  /** The campaign lane's weekly plan panel has something to draw. */
  readonly weekPlanAvailable: boolean;
  /** The per-action plan editor (geography, advertising ceiling) has choices. */
  readonly detailedEditingAvailable: boolean;
  /** There is at least one piece of work that can be done right now. */
  readonly immediateActionsAvailable: boolean;
}

export interface CampaignPlanningLayout {
  /** Every slot that has something to show, in the order it is drawn. */
  readonly slots: readonly CampaignPlanningSlot[];
  /** The one slot carrying primary weight, or null when the region is empty. */
  readonly primary: CampaignPlanningSlot | null;
}

/**
 * Reading order is fixed: the week, then how the work is carried out, then
 * doing a piece of it. Primacy follows availability — the week when there is
 * one, otherwise the immediate action, otherwise the editor. Never two.
 */
export function campaignPlanningLayout(
  input: CampaignPlanningInput,
): CampaignPlanningLayout {
  const slots: CampaignPlanningSlot[] = [];
  if (input.weekPlanAvailable) slots.push("week");
  if (input.detailedEditingAvailable) slots.push("detail");
  if (input.immediateActionsAvailable) slots.push("immediate");

  const primary: CampaignPlanningSlot | null = input.weekPlanAvailable
    ? "week"
    : input.immediateActionsAvailable
      ? "immediate"
      : input.detailedEditingAvailable
        ? "detail"
        : null;

  return { slots, primary };
}

/** True for the single slot the region gives primary weight to. */
export function isPrimaryCampaignPlanningSlot(
  layout: CampaignPlanningLayout,
  slot: CampaignPlanningSlot,
): boolean {
  return layout.primary === slot;
}
