import {
  activeCampaignForCandidate,
  campaignRoutineRecords,
} from "./campaign-queries";
import type {
  CampaignRoutineBlock,
  CampaignRoutineRecord,
  CampaignRoutineWork,
} from "./campaign-life-types";
import {
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
} from "./dates";
import { requireElectionContest } from "./election-contests";
import { createStableId } from "./ids";
import type {
  CampaignRecord,
  EntityId,
  IsoDate,
  SimulationMoment,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

export type {
  CampaignRoutineBlock,
  CampaignRoutineRecord,
  CampaignRoutineWork,
} from "./campaign-life-types";

/**
 * D-11: a campaign's hours are a standing routine.
 *
 * The candidate says which days and hours go to the doors and which to the
 * phones. From then on the ordinary clock books and does each session as time
 * reaches it, the same way it runs a job's hours, until the candidate changes
 * the routine. Nothing is planned a week at a time and nothing is banked: a
 * session that a scene, an appointment or the day job takes is simply lost.
 *
 * This module holds the record, the writer that sets it and the reading of
 * which sessions it asks for. The clock hook that books and does them lives
 * with the campaign actions in `campaigns.ts`.
 */

export const CAMPAIGN_ROUTINE_EVENT = "campaign.routine-set";

export const CAMPAIGN_ROUTINE_WORK: Readonly<
  Record<
    CampaignRoutineWork,
    {
      readonly label: string;
      readonly locationKey: string;
      readonly locationLabel: string;
      readonly title: string;
      readonly summary: string;
    }
  >
> = {
  outreach: {
    label: "Knocking on doors",
    locationKey: "campaign-doors",
    locationLabel: "Somebody's street",
    title: "A field shift",
    summary:
      "The standing shift on the doors, talking to whoever answers. One way to learn what people are hearing.",
  },
  fundraising: {
    label: "Fundraising calls",
    locationKey: "campaign-call-desk",
    locationLabel: "The campaign's call desk",
    title: "A fundraising call session",
    summary:
      "The standing session on the phones, asking people who might give for something the campaign cannot do without.",
  },
  petition: {
    label: "Gathering petition signatures",
    locationKey: "campaign-petition-route",
    locationLabel: "The campaign's petition route",
    title: "A petition-circulation shift",
    summary:
      "The standing shift meeting district residents and asking each person whether they will sign the candidate's petition.",
  },
};

/** The routine in force for a campaign, or null when none was ever set. */
export function currentCampaignRoutine(
  world: World,
  campaignId: EntityId,
): CampaignRoutineRecord | null {
  let latest: CampaignRoutineRecord | null = null;
  for (const record of campaignRoutineRecords(world))
    if (
      record.campaignId === campaignId &&
      (!latest || record.sequence > latest.sequence)
    )
      latest = record;
  return latest;
}

/** Whether an activity was booked by any campaign routine. */
export function routineIdOfActivity(
  world: World,
  sourceEntityIds: readonly EntityId[],
): EntityId | null {
  const routines = campaignRoutineRecords(world);
  if (routines.length === 0) return null;
  const byEvent = new Map(routines.map((record) => [record.eventId, record]));
  for (const id of sourceEntityIds) {
    const routine = byEvent.get(id);
    if (routine) return routine.id;
  }
  return null;
}

function sameBlocks(
  left: readonly CampaignRoutineBlock[],
  right: readonly CampaignRoutineBlock[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalBlocks(
  blocks: readonly CampaignRoutineBlock[],
): CampaignRoutineBlock[] {
  return blocks
    .map((block) => ({
      work: block.work,
      weekdays: [...new Set(block.weekdays)].sort((a, b) => a - b),
      startMinute: block.startMinute,
      minutes: block.minutes,
    }))
    .sort(
      (a, b) =>
        a.startMinute - b.startMinute ||
        a.work.localeCompare(b.work) ||
        (a.weekdays[0] ?? 0) - (b.weekdays[0] ?? 0),
    );
}

function validateBlocks(blocks: readonly CampaignRoutineBlock[]): void {
  for (const block of blocks) {
    if (!(block.work in CAMPAIGN_ROUTINE_WORK))
      throw new Error(
        "A routine session must be doors, phones, or petition circulation.",
      );
    if (
      block.weekdays.length === 0 ||
      block.weekdays.some(
        (day) => !Number.isSafeInteger(day) || day < 0 || day > 6,
      )
    )
      throw new Error("Pick at least one day of the week for each session.");
    if (
      !Number.isSafeInteger(block.startMinute) ||
      !Number.isSafeInteger(block.minutes) ||
      block.startMinute < 0 ||
      block.minutes <= 0 ||
      block.startMinute + block.minutes > 24 * 60
    )
      throw new Error(
        "A routine session has to start and end on the same day.",
      );
  }
  // Two sessions on the same day may not overlap: the hours are the
  // candidate's, and they cannot be in two places.
  for (let day = 0; day <= 6; day += 1) {
    const onDay = blocks
      .filter((block) => block.weekdays.includes(day))
      .sort((a, b) => a.startMinute - b.startMinute);
    for (let index = 1; index < onDay.length; index += 1) {
      const before = onDay[index - 1]!;
      if (before.startMinute + before.minutes > onDay[index]!.startMinute)
        throw new Error("Two routine sessions overlap on the same day.");
    }
  }
}

function weekdayOf(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function describeCampaignRoutine(
  blocks: readonly CampaignRoutineBlock[],
): string {
  if (blocks.length === 0) return "No standing campaign hours.";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return blocks
    .map((block) => {
      const hour = (minute: number) => {
        const h = Math.floor(minute / 60);
        const m = minute % 60;
        const twelve = h % 12 === 0 ? 12 : h % 12;
        return `${twelve}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "a.m." : "p.m."}`;
      };
      return `${CAMPAIGN_ROUTINE_WORK[block.work].label}, ${block.weekdays
        .map((day) => names[day])
        .join(
          ", ",
        )}, ${hour(block.startMinute)} to ${hour(block.startMinute + block.minutes)}`;
    })
    .join("; ");
}

/**
 * Sets the candidate's standing campaign hours from today on. An empty list
 * stops the routine. Setting the same routine again writes nothing.
 */
export function setCampaignRoutine(
  world: World,
  personId: EntityId,
  blocks: readonly CampaignRoutineBlock[],
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("Only the person you are playing can set their hours.");
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign)
    throw new Error("There is no active campaign to set hours for.");
  validateBlocks(blocks);
  const canonical = canonicalBlocks(blocks);
  const previous = currentCampaignRoutine(world, campaign.id);
  if (
    previous ? sameBlocks(previous.blocks, canonical) : canonical.length === 0
  )
    return world;
  const stableKey = `${campaign.stableKey}:routine:${world.history.nextSequence}`;
  const summary =
    canonical.length === 0
      ? "Stopped keeping standing campaign hours."
      : `Set standing campaign hours: ${describeCampaignRoutine(canonical)}.`;
  // The choice is an event first; the sessions it books cite that event.
  const decided = recordWorldEvent(world, {
    stableKey: `${stableKey}:event`,
    type: CAMPAIGN_ROUTINE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [campaign.organizationId, personId],
    participants: [
      {
        personId,
        role: "agency:candidate",
        detail: "Set their campaign hours",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["campaign.routine"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: "There are only so many hours before the election.",
      choice: summary,
      motivation: "Be in a position to win on the day.",
      immediateReaction: null,
    },
  });
  const record: CampaignRoutineRecord = {
    id: createStableId("campaign-routine", `${world.id}:${stableKey}`),
    stableKey,
    sequence: decided.history.nextSequence,
    campaignId: campaign.id,
    eventId: decided.history.events.at(-1)!.id,
    blocks: canonical,
    createdAt: world.currentDate,
    supersedesRoutineId: previous?.id ?? null,
  };
  return {
    ...decided,
    history: {
      ...decided.history,
      nextSequence: decided.history.nextSequence + 1,
      campaignRoutines: [...campaignRoutineRecords(decided), record],
    },
  };
}

export interface CampaignRoutineSlot {
  readonly routineId: EntityId;
  /** The routine's own event, which the sessions it books cite. */
  readonly eventId: EntityId;
  readonly block: CampaignRoutineBlock;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
}

/**
 * The sessions the routine asks for that start at or after `from` and before
 * `until`, in time order. Nothing is asked for on or after election day. A
 * session whose start has gone by is not offered again: its time is lost.
 */
export function campaignRoutineSlots(
  world: World,
  campaign: CampaignRecord,
  from: SimulationMoment,
  until: SimulationMoment,
): CampaignRoutineSlot[] {
  const routine = currentCampaignRoutine(world, campaign.id);
  if (!routine || routine.blocks.length === 0) return [];
  const electionDay = requireElectionContest(
    world,
    campaign.contestId,
  ).electionDate;
  const slots: CampaignRoutineSlot[] = [];
  for (
    let date = from.date;
    date <= until.date && date < electionDay;
    date = addDays(date, 1)
  ) {
    const weekday = weekdayOf(date);
    for (const block of routine.blocks) {
      if (!block.weekdays.includes(weekday)) continue;
      const start = simulationMomentAtLocalTime({
        date,
        minuteOfDay: block.startMinute,
        timeZone: from.timeZone,
      });
      if (compareSimulationMoments(start, from) < 0) continue;
      if (compareSimulationMoments(start, until) >= 0) continue;
      slots.push({
        routineId: routine.id,
        eventId: routine.eventId,
        block,
        start,
        end: addSimulationMinutes(start, block.minutes),
      });
    }
  }
  return slots.sort((a, b) => compareSimulationMoments(a.start, b.start));
}

/** The block a booked session came from, read back from its start. */
export function campaignRoutineBlockAt(
  world: World,
  routineEventId: EntityId,
  start: SimulationMoment,
): CampaignRoutineBlock | null {
  const routine = campaignRoutineRecords(world).find(
    (record) => record.eventId === routineEventId,
  );
  if (!routine) return null;
  const weekday = weekdayOf(start.date);
  return (
    routine.blocks.find(
      (block) =>
        block.weekdays.includes(weekday) &&
        block.startMinute === start.minuteOfDay,
    ) ?? null
  );
}
