import {
  campaignActionResultRecords,
  campaignActions,
} from "./campaign-queries";
import type { CampaignRecord, EntityId, World } from "./types";

/**
 * How much an afternoon on the doors returns, by who is knocking.
 *
 * lamontae, 2026-09-22 at 8:08 p.m. ET: an unknown candidate, like Jimmy
 * Carter starting out in New Hampshire, gets very little from a door; name
 * recognition snowballs; and someone already popular, already in office, or
 * personally known gets more, and it lasts longer. Before this, every
 * candidate's afternoon was worth the same whoever they were.
 *
 * PLACEHOLDER MAGNITUDES. Every number below is a stand-in chosen to have the
 * right shape, not a measured effect. Filed with ChatGPT as
 * `campaign-effort-to-support-magnitudes` (his ruling is appended there).
 * What it applies:
 * - A candidate nobody has heard of starts at half the ordinary return.
 * - Each afternoon already spent on the doors in this campaign adds a
 *   twentieth, up to the ordinary return: the snowball.
 * - Each race the candidate has won before adds a quarter, up to half again:
 *   the already-known candidate.
 *
 * Marked as not modeled, with the blanket rule applied:
 * - How long a contact's effect lasts. Blanket rule: support moved by a door
 *   stays moved, for everyone alike.
 * - Personal acquaintance with the voter. Blanket rule: none.
 * - Popularity as opposed to recognition. Blanket rule: winning before stands
 *   for both.
 * - Being new to the state (the carpetbagger question). lamontae's own guess,
 *   2026-09-22 at 8:22 p.m. ET, is that voters mostly do not care. Blanket
 *   rule: no effect. Filed as `how-voters-see-a-newcomer-candidate`.
 */
export const CAMPAIGN_RECOGNITION_PROFILE =
  "ocd-campaign-recognition-placeholder/v1";

const UNKNOWN_RETURN_PERCENT = 50;
const PER_AFTERNOON_PERCENT = 5;
const PER_WIN_PERCENT = 25;
const MOST_FROM_WINS_PERCENT = 50;
/** The newcomer hook: 100 means no effect, which is the blanket rule above. */
const NEWCOMER_RETURN_PERCENT = 100;

export interface DoorReturn {
  /** The share of the ordinary return this candidate gets, in percent. */
  readonly percent: number;
  readonly afternoonsBefore: number;
  readonly racesWonBefore: number;
  readonly basis: typeof CAMPAIGN_RECOGNITION_PROFILE;
}

/** Races this person won that were decided before this campaign's contest. */
function racesWonBefore(world: World, campaign: CampaignRecord): number {
  const contests = world.history.electionContests ?? [];
  const own = contests.find((contest) => contest.id === campaign.contestId);
  if (!own) return 0;
  return (world.history.electionContestResults ?? []).filter(
    (result) =>
      result.winnerPersonId === campaign.candidatePersonId &&
      result.contestId !== own.id &&
      result.resolvedAt < own.electionDate,
  ).length;
}

export function doorKnockingReturn(
  world: World,
  campaign: CampaignRecord,
  excludingActionId: EntityId | null = null,
): DoorReturn {
  const finished = new Set(
    campaignActionResultRecords(world).map((result) => result.campaignActionId),
  );
  const afternoonsBefore = campaignActions(world, campaign.id).filter(
    (action) =>
      action.kind === "outreach" &&
      action.id !== excludingActionId &&
      finished.has(action.id),
  ).length;
  const won = racesWonBefore(world, campaign);
  const recognition = Math.min(
    100,
    UNKNOWN_RETURN_PERCENT + afternoonsBefore * PER_AFTERNOON_PERCENT,
  );
  const standing = Math.min(MOST_FROM_WINS_PERCENT, won * PER_WIN_PERCENT);
  return {
    percent: Math.round(
      ((recognition + standing) * NEWCOMER_RETURN_PERCENT) / 100,
    ),
    afternoonsBefore,
    racesWonBefore: won,
    basis: CAMPAIGN_RECOGNITION_PROFILE,
  };
}
