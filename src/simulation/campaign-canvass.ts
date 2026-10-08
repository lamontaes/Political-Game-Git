import calibration from "../../data/research/campaign-reality/campaign-calibration.json" with { type: "json" };
import {
  addSimulationMinutes,
  ageOnDate,
  simulationMinutesBetween,
} from "./dates";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { whereaboutsAt } from "./living-world/work-schedules";
import { scheduledActivityState } from "./time-work";
import type {
  CampaignActionRecord,
  CampaignRecord,
  EntityId,
  SimulationMoment,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";

/** A door the campaign knocked on, and who was home to answer it. */
export interface CampaignCanvassDoor {
  readonly householdId: EntityId;
  readonly knockedAt: SimulationMoment;
  readonly metPersonIds: readonly EntityId[];
}

/** The adults a candidate meets at the door are those who vote there. */
const CANVASS_MINIMUM_AGE = 18;

/**
 * Doors a canvasser reaches in an hour: the median of the low ends of the
 * doors-per-volunteer-hour observations in the campaign calibration packet,
 * so a first-time canvasser walking alone is not credited with a seasoned
 * crew's pace.
 */
export const CANVASS_DOORS_PER_HOUR: number = (() => {
  const lows = calibration.observations
    .filter((row) => row.metric === "doors-per-volunteer-hour")
    .map((row) => row.range.min)
    .sort((a, b) => a - b);
  if (lows.length === 0)
    throw new Error("The calibration packet has no door-knocking pace.");
  const middle = Math.floor(lows.length / 2);
  return lows.length % 2 === 1
    ? lows[middle]!
    : (lows[middle - 1]! + lows[middle]!) / 2;
})();

/** Every household the campaign has already knocked on, from its results. */
function householdsKnocked(
  world: World,
  campaign: CampaignRecord,
): ReadonlySet<EntityId> {
  const actions = new Set(
    (world.history.campaignActions ?? [])
      .filter((action) => action.campaignId === campaign.id)
      .map((action) => action.id),
  );
  return new Set(
    (world.history.campaignActionResults ?? []).flatMap((result) =>
      actions.has(result.campaignActionId)
        ? (result.canvass?.householdIds ?? [])
        : [],
    ),
  );
}

/**
 * The households of the candidate's own neighborhood, in their recorded
 * order, starting from the door after the candidate's own and wrapping round.
 */
function walkList(world: World, candidateId: EntityId): readonly EntityId[] {
  const candidate = world.people[candidateId]!;
  const own = new Set(
    householdMembershipsAt(world, candidateId).map((row) => row.household.id),
  );
  const neighborhood = [...world.history.households]
    .filter((household) =>
      peopleInHouseholdAt(world, household.id).some(
        (personId) =>
          world.people[personId]?.homeJurisdictionId ===
          candidate.homeJurisdictionId,
      ),
    )
    .sort((a, b) => (a.stableKey < b.stableKey ? -1 : 1));
  const start = neighborhood.findIndex((household) => own.has(household.id));
  return [
    ...neighborhood.slice(start + 1),
    ...neighborhood.slice(0, Math.max(0, start)),
  ]
    .filter((household) => !own.has(household.id))
    .map((household) => household.id);
}

/**
 * Walk a completed outreach session door to door. How many doors the session
 * reaches comes from its minutes, its workers and the sourced pace; who
 * answers is whoever the world has at home at the minute of the knock (not at
 * work, not at another recorded activity, not away), so nobody is met by
 * chance and a door with nobody home meets nobody.
 */
export function walkCampaignCanvass(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
): readonly CampaignCanvassDoor[] {
  if (action.kind !== "outreach") return [];
  const timing = scheduledActivityState(world, action.scheduledActivityId);
  const minutes = simulationMinutesBetween(timing.start, timing.end);
  const activity = world.history.scheduledActivities.find(
    (row) => row.id === action.scheduledActivityId,
  );
  const workers = Math.max(1, activity?.participantPersonIds.length ?? 1);
  const doors = Math.floor((minutes * workers * CANVASS_DOORS_PER_HOUR) / 60);
  if (doors <= 0) return [];
  const knocked = householdsKnocked(world, campaign);
  const route = walkList(world, campaign.candidatePersonId)
    .filter((householdId) => !knocked.has(householdId))
    .slice(0, doors);
  const cutoff = currentLifeCutoff(world);
  return route.map((householdId, index) => {
    // The session's doors are spread evenly over its minutes.
    const knockedAt = addSimulationMinutes(
      timing.start,
      Math.floor((index * minutes) / doors),
    );
    const metPersonIds = peopleInHouseholdAt(world, householdId).filter(
      (personId) =>
        personId !== campaign.candidatePersonId &&
        ageOnDate(world.people[personId]!.birthDate, knockedAt.date) >=
          CANVASS_MINIMUM_AGE &&
        isPersonAliveAt(world, personId, {
          ...cutoff,
          asOfDate: knockedAt.date,
        }) &&
        whereaboutsAt(world, personId, knockedAt).kind === "home",
    );
    return { householdId, knockedAt, metPersonIds };
  });
}
