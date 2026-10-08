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
import {
  materializeSettledTownHousehold,
  playerTown,
  townResidentId,
  townRoster,
} from "./living-world/town-residents";
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

/** The household a written-out member of roster household `index` lives in. */
function rosterHouseholdId(
  world: World,
  town: EntityId,
  index: number,
): EntityId | null {
  const personId = townResidentId(world, town, index, 0);
  if (!world.people[personId]) return null;
  return householdMembershipsAt(world, personId)[0]?.household.id ?? null;
}

/**
 * The next doors of the candidate's neighborhood, writing out each roster
 * household as its door is reached, the way a town government or an election
 * writes out a resident it draws. A candidate whose home is not a town walks
 * the households already recorded there, in their recorded order.
 */
function nextDoors(
  world: World,
  candidateId: EntityId,
  knocked: ReadonlySet<EntityId>,
  doors: number,
): { readonly world: World; readonly householdIds: readonly EntityId[] } {
  const own = new Set(
    householdMembershipsAt(world, candidateId).map((row) => row.household.id),
  );
  const fresh = (householdId: EntityId | null): householdId is EntityId =>
    householdId !== null && !own.has(householdId) && !knocked.has(householdId);
  const town = playerTown(world, candidateId);
  if (town) {
    let next = world;
    const householdIds: EntityId[] = [];
    const { households } = townRoster(town);
    for (
      let index = 0;
      index < households && householdIds.length < doors;
      index += 1
    ) {
      // A household already knocked on is passed without writing anything.
      const written = rosterHouseholdId(next, town, index);
      if (written !== null && !fresh(written)) continue;
      next = materializeSettledTownHousehold(next, town, index);
      const householdId = rosterHouseholdId(next, town, index);
      if (fresh(householdId)) householdIds.push(householdId);
    }
    return { world: next, householdIds };
  }
  const home = world.people[candidateId]!.homeJurisdictionId;
  const householdIds = [...world.history.households]
    .filter((household) =>
      peopleInHouseholdAt(world, household.id).some(
        (personId) => world.people[personId]?.homeJurisdictionId === home,
      ),
    )
    .sort((a, b) => (a.stableKey < b.stableKey ? -1 : 1))
    .map((household) => household.id)
    .filter(fresh)
    .slice(0, doors);
  return { world, householdIds };
}

/**
 * Walk a completed outreach session door to door. How many doors the session
 * reaches comes from its minutes, its workers and the sourced pace; who
 * answers is whoever the world has at home at the minute of the knock (not at
 * work, not at another recorded activity, not away), so nobody is met by
 * chance and a door with nobody home meets nobody. Returns the world with any
 * household reached for the first time written out.
 */
export function walkCampaignCanvass(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
): { readonly world: World; readonly doors: readonly CampaignCanvassDoor[] } {
  if (action.kind !== "outreach") return { world, doors: [] };
  const timing = scheduledActivityState(world, action.scheduledActivityId);
  const minutes = simulationMinutesBetween(timing.start, timing.end);
  const activity = world.history.scheduledActivities.find(
    (row) => row.id === action.scheduledActivityId,
  );
  const workers = Math.max(1, activity?.participantPersonIds.length ?? 1);
  const doors = Math.floor((minutes * workers * CANVASS_DOORS_PER_HOUR) / 60);
  if (doors <= 0) return { world, doors: [] };
  const route = nextDoors(
    world,
    campaign.candidatePersonId,
    householdsKnocked(world, campaign),
    doors,
  );
  const next = route.world;
  const cutoff = currentLifeCutoff(next);
  return {
    world: next,
    doors: route.householdIds.map((householdId, index) => {
      // The session's doors are spread evenly over its minutes.
      const knockedAt = addSimulationMinutes(
        timing.start,
        Math.floor((index * minutes) / doors),
      );
      const metPersonIds = peopleInHouseholdAt(next, householdId).filter(
        (personId) =>
          personId !== campaign.candidatePersonId &&
          ageOnDate(next.people[personId]!.birthDate, knockedAt.date) >=
            CANVASS_MINIMUM_AGE &&
          isPersonAliveAt(next, personId, {
            ...cutoff,
            asOfDate: knockedAt.date,
          }) &&
          whereaboutsAt(next, personId, knockedAt).kind === "home",
      );
      return { householdId, knockedAt, metPersonIds };
    }),
  };
}
