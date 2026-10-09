import calibration from "../../data/research/campaign-reality/campaign-calibration.json" with { type: "json" };
import {
  addSimulationMinutes,
  ageOnDate,
  simulationMinutesBetween,
} from "./dates";
import { evaluateDecision, isSelectedDecision } from "./decisions";
import { feltDebtConsiderations } from "./favors";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import {
  materializeSettledTownHousehold,
  playerTown,
  townHouseholdSkeleton,
  townResidentId,
  townRoster,
} from "./living-world/town-residents";
import {
  doorResponse,
  doorSubject,
  placeConditions,
  type DoorResponse,
  type DoorSubject,
} from "./door-conversations";
import { contestIncumbentPersonId } from "./election-contests";
import { majorPartyOf } from "./statewide-electorate";
import { outcomeRecipientsAt } from "./outcome-web/person-outcome-landings";
import { whereaboutsAt } from "./living-world/work-schedules";
import { scheduledActivityState } from "./time-work";
import { traitRegistryFor } from "./trait-registry";
import { registeredTraitConsiderations } from "./trait-readings";
import type {
  CampaignActionRecord,
  CampaignRecord,
  EntityId,
  SimulationMoment,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";
import { withWorldIntegrityDeferred } from "./world";

/** The decision a resident at home makes when the candidate knocks. */
export const DOOR_ANSWER_DECISION_ID = "campaign.door-answer";

/**
 * Whether a resident at home comes to the door and talks. A knock at home is
 * answered unless the resident decides not to: the decision is theirs,
 * weighed from their recorded traits and what they feel they owe the
 * candidate, and only a decision to decline keeps them inside. Nothing is
 * rolled, and only the result is kept.
 */
export function residentComesToTheDoor(
  world: World,
  residentId: EntityId,
  candidateId: EntityId,
  key: string,
): boolean {
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: DOOR_ANSWER_DECISION_ID,
    actorPersonId: residentId,
    cutoff: currentLifeCutoff(world),
    subject: { kind: "context:life", key: "campaign-door", entityId: null },
    options: [
      { key: "talk", label: "talk", description: "talk" },
      { key: "decline", label: "decline", description: "decline" },
    ],
    constraints: [],
    considerations: [
      ...registeredTraitConsiderations(
        world,
        traitRegistryFor(world),
        residentId,
        key,
        DOOR_ANSWER_DECISION_ID,
        candidateId,
      ),
      ...feltDebtConsiderations(world, residentId, candidateId, key, "talk"),
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return !(
    isSelectedDecision(evaluation) && evaluation.selectedOptionKey === "decline"
  );
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

/**
 * The lengths a candidate can give an afternoon on the doors, in minutes:
 * every whole hour from the shortest volunteer canvass shift in the
 * calibration packet to the longest whole hour within the longest (two-hour
 * shifts at an ACLU of Oklahoma canvass in 2018, four- to four-and-a-half-hour
 * shifts at a 9to5 Georgia canvass in 2014).
 */
export const CANVASS_SESSION_MINUTES: readonly number[] = (() => {
  const shifts = calibration.observations.filter(
    (row) => row.metric === "canvass-shift-hours",
  );
  if (shifts.length === 0)
    throw new Error("The calibration packet has no canvass shift length.");
  const shortest = Math.ceil(Math.min(...shifts.map((row) => row.range.min)));
  const longest = Math.floor(Math.max(...shifts.map((row) => row.range.max)));
  const lengths: number[] = [];
  for (let hours = shortest; hours <= longest; hours += 1)
    lengths.push(hours * 60);
  return lengths;
})();

/**
 * How much a candidate's own visit moves a canvassed voter toward them, as a
 * share of a vote: about 20 percentage points across all canvassed voters,
 * and a statistically insignificant 9 among partisans (Barton, Castillo and
 * Petrie, the calibration packet's `candidate-canvass-support-*` rows). A
 * resident with no party on record takes the pooled figure: the game does
 * not know them to be unaffiliated.
 *
 * Every visit keeps that base; what was said moves it a little either way
 * (CTO on #3903, October 8, 2026). How far is the range the same experiment's
 * canvass effect took across its two message arms, 0.176 and 0.246 against
 * the pooled 0.207: a resident who took to the candidate takes the higher
 * share of the base, one who took against them the lower. The resident's
 * response is their own decision (`door-conversations.ts`); this sizes it.
 */
export const CANVASS_SUPPORT_EFFECT: {
  readonly pooled: number;
  readonly partisan: number;
  /** The share of the base a warm conversation carries. */
  readonly warm: number;
  /** The share of the base a cool conversation carries. */
  readonly cool: number;
} = (() => {
  const effect = (id: string) => {
    const row = calibration.observations.find((entry) => entry.id === id);
    if (!row) throw new Error(`The calibration packet has no ${id} row.`);
    return row.range.min;
  };
  const pooledAtt = effect("candidate-canvass-support-pooled-att");
  return {
    pooled: effect("candidate-canvass-support-pooled"),
    partisan: effect("candidate-canvass-support-partisan"),
    warm: effect("candidate-canvass-support-vote-info-arm") / pooledAtt,
    cool: effect("candidate-canvass-support-political-arm") / pooledAtt,
  };
})();

/** A resident who came to the door, what they raised, and how they took it. */
export interface CanvassMeeting {
  /** A written-out person, or the id a story-only resident keeps. */
  readonly personId: EntityId;
  /** False for a story-only resident: met at the door, not written out. */
  readonly written: boolean;
  /** The roster place of a story-only resident, null for a written one. */
  readonly roster: {
    readonly town: EntityId;
    readonly household: number;
    readonly member: number;
  } | null;
  readonly subject: DoorSubject | null;
  readonly response: DoorResponse;
  /** Whether a major party is on record for them. */
  readonly partisan: boolean;
}

/** A door the campaign knocked on, and who came to it. */
export interface CampaignCanvassDoor {
  /** `town:<id>:<household>` for a roster door, `household:<id>` otherwise. */
  readonly doorKey: string;
  /** The household when it is written out, or null. */
  readonly householdId: EntityId | null;
  readonly knockedAt: SimulationMoment;
  readonly met: readonly CanvassMeeting[];
}

function rosterDoorKey(town: EntityId, index: number): string {
  return `town:${town}:${index}`;
}

/**
 * Every door the campaign has knocked on, from its results, and the story
 * people it has met. A result written before doors had keys names its
 * written households instead.
 */
export function campaignCanvassSoFar(
  world: World,
  campaign: CampaignRecord,
): {
  readonly doorKeys: ReadonlySet<string>;
  readonly householdIds: ReadonlySet<EntityId>;
  readonly storyPersonIds: ReadonlySet<EntityId>;
} {
  const actions = new Set(
    (world.history.campaignActions ?? [])
      .filter((action) => action.campaignId === campaign.id)
      .map((action) => action.id),
  );
  const doorKeys = new Set<string>();
  const householdIds = new Set<EntityId>();
  const storyPersonIds = new Set<EntityId>();
  for (const result of world.history.campaignActionResults ?? []) {
    if (!actions.has(result.campaignActionId) || !result.canvass) continue;
    for (const key of result.canvass.doorKeys ?? []) doorKeys.add(key);
    for (const id of result.canvass.householdIds) householdIds.add(id);
    for (const id of result.canvass.storyPersonIds ?? [])
      storyPersonIds.add(id);
  }
  return { doorKeys, householdIds, storyPersonIds };
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

interface PlannedDoor {
  readonly doorKey: string;
  readonly roster: { readonly town: EntityId; readonly index: number } | null;
  readonly householdId: EntityId | null;
}

/**
 * The next doors of the candidate's neighborhood, in the town roster's order.
 * Doors not yet knocked on come first; once every door has been knocked on,
 * the walk goes round again from the start, so a second session in the same
 * street meets the same people again. A candidate whose home is not a town
 * walks the households already recorded there, in their recorded order.
 */
function nextDoors(
  world: World,
  candidateId: EntityId,
  doors: number,
  sofar: ReturnType<typeof campaignCanvassSoFar>,
): readonly PlannedDoor[] {
  const own = new Set(
    householdMembershipsAt(world, candidateId).map((row) => row.household.id),
  );
  const town = playerTown(world, candidateId);
  if (town) {
    const { households } = townRoster(town);
    const fresh: PlannedDoor[] = [];
    const again: PlannedDoor[] = [];
    for (
      let index = 0;
      index < households && fresh.length < doors;
      index += 1
    ) {
      const householdId = rosterHouseholdId(world, town, index);
      if (householdId !== null && own.has(householdId)) continue;
      const doorKey = rosterDoorKey(town, index);
      const knocked =
        sofar.doorKeys.has(doorKey) ||
        (householdId !== null && sofar.householdIds.has(householdId));
      const door = { doorKey, roster: { town, index }, householdId };
      if (!knocked) fresh.push(door);
      else if (again.length < doors) again.push(door);
    }
    return [...fresh, ...again].slice(0, doors);
  }
  const home = world.people[candidateId]!.homeJurisdictionId;
  return [...world.history.households]
    .filter((household) =>
      peopleInHouseholdAt(world, household.id).some(
        (personId) => world.people[personId]?.homeJurisdictionId === home,
      ),
    )
    .sort((a, b) => (a.stableKey < b.stableKey ? -1 : 1))
    .filter(
      (household) =>
        !own.has(household.id) && !sofar.householdIds.has(household.id),
    )
    .slice(0, doors)
    .map((household) => ({
      doorKey: `household:${household.id}`,
      roster: null,
      householdId: household.id,
    }));
}

/**
 * Walk a completed outreach session door to door. How many doors the session
 * reaches comes from its minutes, its workers and the sourced pace. Who comes
 * to a door is whoever the world has at home at the minute of the knock and
 * decides to come; what they raise and how they take the candidate are read
 * from the place's conditions and decided by them (`door-conversations.ts`).
 *
 * A household the world has not written out is read on a scratch copy of the
 * world, written there the way a town writes out anyone it draws, so its
 * people's jobs and hours are the world's own. The copy is discarded: the
 * people met are returned as story-only residents, and nobody is written out
 * by a session on the doors (owner direction, October 8, 2026).
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
  const sofar = campaignCanvassSoFar(world, campaign);
  const planned = nextDoors(world, campaign.candidatePersonId, doors, sofar);
  if (planned.length === 0) return [];
  // Write the unwritten households out on a scratch copy only.
  const scratch = withWorldIntegrityDeferred(() => {
    let next = world;
    for (const door of planned)
      if (door.roster && door.householdId === null)
        next = materializeSettledTownHousehold(
          next,
          door.roster.town,
          door.roster.index,
        );
    return next;
  });
  const cutoff = currentLifeCutoff(scratch);
  const date = timing.start.date;
  const recipients = outcomeRecipientsAt(scratch, date);
  const home = scratch.people[campaign.candidatePersonId]!.homeJurisdictionId;
  const conditions = placeConditions(scratch, home, date);
  const holdsSeat =
    contestIncumbentPersonId(world, campaign.contestId) ===
    campaign.candidatePersonId;
  return planned.map((door, index) => {
    // The session's doors are spread evenly over its minutes.
    const knockedAt = addSimulationMinutes(
      timing.start,
      Math.floor((index * minutes) / planned.length),
    );
    const householdId =
      door.householdId ??
      (door.roster
        ? rosterHouseholdId(scratch, door.roster.town, door.roster.index)
        : null);
    const members = householdId
      ? peopleInHouseholdAt(scratch, householdId)
      : [];
    const met: CanvassMeeting[] = [];
    for (const personId of members) {
      if (
        personId === campaign.candidatePersonId ||
        ageOnDate(scratch.people[personId]!.birthDate, knockedAt.date) <
          CANVASS_MINIMUM_AGE ||
        !isPersonAliveAt(scratch, personId, {
          ...cutoff,
          asOfDate: knockedAt.date,
        }) ||
        whereaboutsAt(scratch, personId, knockedAt).kind !== "home"
      )
        continue;
      const key = `${action.stableKey}:door:${door.doorKey}:${personId}`;
      if (
        !residentComesToTheDoor(
          scratch,
          personId,
          campaign.candidatePersonId,
          key,
        )
      )
        continue;
      const subject = doorSubject(conditions, recipients(personId));
      const written = Boolean(world.people[personId]);
      met.push({
        personId,
        written,
        roster:
          !written && door.roster
            ? {
                town: door.roster.town,
                household: door.roster.index,
                member: rosterMemberOf(scratch, door.roster, personId),
              }
            : null,
        subject,
        partisan: majorPartyOf(scratch, personId, knockedAt.date) !== null,
        response: doorResponse(scratch, {
          residentId: personId,
          candidateId: campaign.candidatePersonId,
          subject,
          holdsSeat,
          key: `${key}:conversation`,
        }),
      });
    }
    return {
      doorKey: door.doorKey,
      householdId: door.householdId,
      knockedAt,
      met,
    };
  });
}

/** Which member of its roster household a written-out resident is. */
function rosterMemberOf(
  world: World,
  roster: { readonly town: EntityId; readonly index: number },
  personId: EntityId,
): number {
  const members = townHouseholdSkeleton(world, roster.town, roster.index)
    .members.length;
  for (let member = 0; member < members; member += 1)
    if (townResidentId(world, roster.town, roster.index, member) === personId)
      return member;
  throw new Error(`${personId} is not in roster household ${roster.index}.`);
}
